import React, { useState, useRef } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  ChefHat, 
  Plus, 
  Scale, 
  UtensilsCrossed, 
  Layers,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Recipe, RecipeIngredient, Ingredient } from '../types';

export interface ParsedRecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  grossQuantity?: number;
  wastePercentage?: number;
  notes?: string;
  // Matching fields:
  matchedId?: string;
  matchedType?: 'ingredient' | 'elaborado';
  matchedName?: string;
  convertedQuantity?: number;
  convertedUnit?: string;
  willCreate?: boolean;
}

export interface ParsedRecipeData {
  nameES: string;
  nameEN?: string;
  type: 'plato' | 'elaborado' | 'bebida';
  descriptionES?: string;
  portions?: number | null;
  yieldQuantity?: number | null;
  yieldUnit?: 'kg' | 'L' | 'ud';
  unitWeight?: number | null;
  unitWeightUnit?: 'g' | 'kg';
  ingredients: ParsedRecipeIngredient[];
  steps: string[];
  equipment?: string[];
  miseEnPlace?: string;
  sustainabilityTips?: string[];
  allergens?: string[];
}

interface ImportRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyRecipe: (recipeData: {
    nameES: string;
    nameEN?: string;
    type: 'plato' | 'elaborado' | 'bebida';
    descriptionES: string;
    portions: number | null;
    yieldQuantity: number | null;
    yieldUnit: 'kg' | 'L' | 'ud';
    unitWeight: string | number | null;
    unitWeightUnit: 'g' | 'kg';
    steps: string[];
    equipment: string[];
    miseEnPlace?: string;
    sustainabilityTips: string[];
    ingredients: RecipeIngredient[];
  }) => void;
  targetType?: 'plato' | 'elaborado' | 'bebida';
}

// Función auxiliar para normalizar cadenas para búsquedas culinarias flexibles
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, '')
    .trim();
}

// Convertir unidades culinarias al sistema de catálogo (kg, L, ud)
function convertQuantityAndUnit(
  qty: number,
  fromUnit: string,
  targetUnit: string
): { quantity: number; unit: string } {
  const normFrom = fromUnit.toLowerCase().trim();
  const normTarget = targetUnit.toLowerCase().trim();

  if (normFrom === normTarget) {
    return { quantity: qty, unit: targetUnit };
  }

  // Gramos a kilogramos
  if (normFrom === 'g' || normFrom === 'gr' || normFrom === 'gramos') {
    if (normTarget === 'kg') {
      return { quantity: Number((qty / 1000).toFixed(4)), unit: 'kg' };
    }
  }

  // Kilogramos a gramos
  if (normFrom === 'kg' || normFrom === 'kilos') {
    if (normTarget === 'g') {
      return { quantity: qty * 1000, unit: 'g' };
    }
  }

  // Mililitros a Litros
  if (normFrom === 'ml' || normFrom === 'cc') {
    if (normTarget === 'l' || normTarget === 'litro' || normTarget === 'litros') {
      return { quantity: Number((qty / 1000).toFixed(4)), unit: 'L' };
    }
  }

  // Centilitros a Litros
  if (normFrom === 'cl') {
    if (normTarget === 'l' || normTarget === 'litro' || normTarget === 'litros') {
      return { quantity: Number((qty / 100).toFixed(4)), unit: 'L' };
    }
  }

  // Cucharada sopera (~15ml o ~15g)
  if (normFrom === 'c/s' || normFrom === 'cucharada' || normFrom === 'cucharadas') {
    if (normTarget === 'kg' || normTarget === 'l') {
      return { quantity: Number(((qty * 15) / 1000).toFixed(4)), unit: targetUnit };
    }
  }

  // Cucharadita café (~5ml o ~5g)
  if (normFrom === 'c/c' || normFrom === 'cucharadita' || normFrom === 'cucharaditas') {
    if (normTarget === 'kg' || normTarget === 'l') {
      return { quantity: Number(((qty * 5) / 1000).toFixed(4)), unit: targetUnit };
    }
  }

  return { quantity: qty, unit: fromUnit };
}

export default function ImportRecipeModal({
  isOpen,
  onClose,
  onApplyRecipe,
  targetType
}: ImportRecipeModalProps) {
  const { ingredients, recipes } = useData();
  const { showToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stepMessage, setStepMessage] = useState('');
  const [parsedData, setParsedData] = useState<ParsedRecipeData | null>(null);
  const [autoCreateMissing, setAutoCreateMissing] = useState(true);
  const [isSavingIngredients, setIsSavingIngredients] = useState(false);

  if (!isOpen) return null;

  // Analizar archivo PDF
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Por favor selecciona un archivo PDF válido.', 'error');
        return;
      }
      setSelectedFile(file);
      setParsedData(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Por favor sube un archivo PDF de receta.', 'error');
        return;
      }
      setSelectedFile(file);
      setParsedData(null);
    }
  };

  // Emparejar ingredientes extraídos con el catálogo existente en el obrador
  const matchIngredients = (rawIngredients: any[]): ParsedRecipeIngredient[] => {
    const elaborados = recipes.filter(r => r.type === 'elaborado');

    return rawIngredients.map(item => {
      const normName = normalizeString(item.name || '');
      const rawQty = Number(item.quantity) || 0;
      const rawUnit = item.unit || 'kg';

      // 1. Buscar coincidencia exacta o fuerte en ingredientes de catálogo
      let matchedIng: Ingredient | undefined = ingredients.find(ing => {
        const normCat = normalizeString(ing.nameES);
        return normCat === normName;
      });

      // Si no hay exacta, buscar contención
      if (!matchedIng) {
        matchedIng = ingredients.find(ing => {
          const normCat = normalizeString(ing.nameES);
          return normName.includes(normCat) || normCat.includes(normName);
        });
      }

      if (matchedIng) {
        const converted = convertQuantityAndUnit(rawQty, rawUnit, matchedIng.unit || 'kg');
        return {
          ...item,
          quantity: rawQty,
          unit: rawUnit,
          matchedId: matchedIng.id,
          matchedType: 'ingredient',
          matchedName: matchedIng.nameES,
          convertedQuantity: converted.quantity,
          convertedUnit: converted.unit,
          willCreate: false
        };
      }

      // 2. Buscar si coincide con un elaborado existente
      let matchedElab = elaborados.find(el => {
        const normEl = normalizeString(el.nameES);
        return normEl === normName || normName.includes(normEl) || normEl.includes(normName);
      });

      if (matchedElab) {
        const targetUnit = matchedElab.yieldUnit || 'kg';
        const converted = convertQuantityAndUnit(rawQty, rawUnit, targetUnit);
        return {
          ...item,
          quantity: rawQty,
          unit: rawUnit,
          matchedId: matchedElab.id,
          matchedType: 'elaborado',
          matchedName: matchedElab.nameES,
          convertedQuantity: converted.quantity,
          convertedUnit: converted.unit,
          willCreate: false
        };
      }

      // 3. No encontrado en catálogo
      return {
        ...item,
        quantity: rawQty,
        unit: rawUnit,
        willCreate: true
      };
    });
  };

  // Enviar PDF al backend para procesamiento con Gemini
  const handleProcessPDF = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setStepMessage('Leyendo y digitalizando documento PDF...');

    try {
      // 1. Convertir archivo a base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const pdfBase64 = await base64Promise;

      setStepMessage('Extrayendo técnicas culinarias, ingredientes y mermas con IA...');

      // 2. Llamada a la API backend
      const response = await fetch('/api/parse-recipe-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          filename: selectedFile.name
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: Error al procesar el PDF.`);
      }

      const data = await response.json();
      if (!data.success || !data.recipe) {
        throw new Error('No se pudo extraer la receta del documento proporcionado.');
      }

      const recipe: ParsedRecipeData = data.recipe;

      setStepMessage('Emparejando ingredientes con el catálogo del obrador...');

      // Si el modal se abrió desde un tipo específico (ej. Elaborado), respetarlo si es compatible
      if (targetType) {
        recipe.type = targetType;
      }

      // Emparejar ingredientes con el catálogo
      const matchedIngs = matchIngredients(recipe.ingredients || []);
      recipe.ingredients = matchedIngs;

      setParsedData(recipe);
      showToast('¡Receta extraída correctamente! Revisa los datos antes de aplicar.', 'success');
    } catch (err: any) {
      console.error('Error procesando receta PDF:', err);
      showToast(err.message || 'Error al procesar el archivo PDF.', 'error');
    } finally {
      setIsProcessing(false);
      setStepMessage('');
    }
  };

  // Cambiar emparejamiento manual de un ingrediente
  const handleUpdateItemMatch = (index: number, newId: string) => {
    if (!parsedData) return;
    const updated = [...parsedData.ingredients];
    const current = updated[index];

    if (!newId) {
      current.matchedId = undefined;
      current.matchedType = undefined;
      current.matchedName = undefined;
      current.convertedQuantity = undefined;
      current.convertedUnit = undefined;
      current.willCreate = true;
    } else {
      const ing = ingredients.find(i => i.id === newId);
      const elab = recipes.find(r => r.id === newId && r.type === 'elaborado');

      if (ing) {
        const converted = convertQuantityAndUnit(current.quantity, current.unit, ing.unit || 'kg');
        current.matchedId = ing.id;
        current.matchedType = 'ingredient';
        current.matchedName = ing.nameES;
        current.convertedQuantity = converted.quantity;
        current.convertedUnit = converted.unit;
        current.willCreate = false;
      } else if (elab) {
        const converted = convertQuantityAndUnit(current.quantity, current.unit, elab.yieldUnit || 'kg');
        current.matchedId = elab.id;
        current.matchedType = 'elaborado';
        current.matchedName = elab.nameES;
        current.convertedQuantity = converted.quantity;
        current.convertedUnit = converted.unit;
        current.willCreate = false;
      }
    }

    setParsedData({ ...parsedData, ingredients: updated });
  };

  // Aplicar datos al formulario de la aplicación
  const handleApplyToForm = async () => {
    if (!parsedData) return;

    setIsSavingIngredients(true);
    try {
      const finalIngredients: RecipeIngredient[] = [];

      for (const item of parsedData.ingredients) {
        let finalId = item.matchedId;
        const finalType = item.matchedType || 'ingredient';
        const finalQty = item.convertedQuantity !== undefined ? item.convertedQuantity : item.quantity;

        // Si no está emparejado y se eligió crear automáticamente los ingredientes faltantes
        if (!finalId && autoCreateMissing) {
          try {
            const newId = doc(collection(db, 'ingredients')).id;
            const validUnit = ['kg', 'L', 'ud'].includes(item.unit) ? (item.unit as 'kg' | 'L' | 'ud') : 'kg';
            
            await setDoc(doc(db, 'ingredients', newId), {
              nameES: item.name.trim(),
              provider: 'Varios / Por Clasificar',
              allergens: [],
              unit: validUnit,
              purchasePrice: 0,
              wastePercentage: item.wastePercentage || 0,
              costPerUnit: 0,
              createdAt: new Date().toISOString()
            });

            finalId = newId;
          } catch (createErr) {
            console.warn(`No se pudo auto-crear el ingrediente ${item.name}:`, createErr);
          }
        }

        if (finalId) {
          finalIngredients.push({
            ingredientId: finalId,
            quantity: finalQty,
            itemType: finalType,
            usePortions: false,
            preparation: item.notes || ''
          });
        }
      }

      // Estructurar los datos para el formulario de recetas
      onApplyRecipe({
        nameES: parsedData.nameES || '',
        nameEN: parsedData.nameEN || '',
        type: parsedData.type || (targetType || 'plato'),
        descriptionES: parsedData.descriptionES || '',
        portions: parsedData.type === 'elaborado' ? null : (parsedData.portions || 1),
        yieldQuantity: parsedData.type === 'elaborado' ? (parsedData.yieldQuantity || 1) : null,
        yieldUnit: parsedData.yieldUnit || 'kg',
        unitWeight: parsedData.unitWeight ? String(parsedData.unitWeight) : '',
        unitWeightUnit: parsedData.unitWeightUnit || 'g',
        steps: parsedData.steps || [],
        equipment: parsedData.equipment || [],
        miseEnPlace: parsedData.miseEnPlace || '',
        sustainabilityTips: parsedData.sustainabilityTips || [],
        ingredients: finalIngredients
      });

      showToast('¡Datos de la receta cargados en el formulario!', 'success');
      handleClose();
    } catch (err: any) {
      console.error('Error aplicando receta:', err);
      showToast('Error al traspasar la receta al formulario.', 'error');
    } finally {
      setIsSavingIngredients(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setParsedData(null);
    setIsProcessing(false);
    onClose();
  };

  const matchedCount = parsedData?.ingredients.filter(i => !!i.matchedId).length || 0;
  const missingCount = (parsedData?.ingredients.length || 0) - matchedCount;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-[70]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-orange-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 border-b border-orange-100 bg-gradient-to-r from-orange-50 via-amber-50 to-teal-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                Importar Receta desde PDF
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                  IA de Obrador
                </span>
              </h2>
              <p className="text-xs text-stone-500">
                Sube tu receta en PDF y la inteligencia artificial rellenará automáticamente todos los campos del escandallo.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {!parsedData ? (
            /* PASO 1: Subida del Archivo PDF */
            <div className="space-y-5">
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-teal-500 bg-teal-50/60 ring-4 ring-teal-100'
                    : 'border-orange-200 hover:border-teal-400 hover:bg-orange-50/40 bg-stone-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  {selectedFile ? <FileText size={28} /> : <Upload size={28} />}
                </div>

                {selectedFile ? (
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-900 mb-2">
                      <CheckCircle2 size={14} className="text-teal-600" /> Archivo PDF seleccionado
                    </span>
                    <p className="text-sm font-bold text-stone-800 truncate max-w-md mx-auto">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Haz clic para cambiarlo
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-stone-800 mb-1">
                      Haz clic para elegir un archivo o arrástralo aquí
                    </p>
                    <p className="text-xs text-stone-500">
                      Admite documentos PDF con escandallos, recetas de repostería, platos o fichas técnicas de cocina.
                    </p>
                  </div>
                )}
              </div>

              {/* Botón de Iniciar Análisis */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleProcessPDF}
                  disabled={!selectedFile || isProcessing}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Analizando PDF con IA...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Analizar e Importar Receta
                    </>
                  )}
                </button>
              </div>

              {/* Barra de progreso de lectura */}
              {isProcessing && (
                <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-center animate-pulse">
                  <p className="text-xs font-semibold">{stepMessage || 'Procesando documento...'}</p>
                  <p className="text-[11px] text-teal-700 mt-1">Esto puede tardar entre 4 y 10 segundos según el contenido del PDF.</p>
                </div>
              )}
            </div>
          ) : (
            /* PASO 2: Vista Previa y Emparejamiento de Ingredientes */
            <div className="space-y-6">
              
              {/* Tarjeta Resumen de la Receta Detectada */}
              <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-xl">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-[200px]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800">
                      Receta Identificada
                    </span>
                    <h3 className="text-lg font-bold text-stone-900">{parsedData.nameES}</h3>
                    {parsedData.descriptionES && (
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                        {parsedData.descriptionES}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${
                      parsedData.type === 'elaborado'
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : parsedData.type === 'bebida'
                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    }`}>
                      {parsedData.type === 'elaborado' ? 'Elaborado' : parsedData.type === 'bebida' ? 'Bebida' : 'Plato'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                      {parsedData.type === 'elaborado'
                        ? `Rendimiento: ${parsedData.yieldQuantity || 1} ${parsedData.yieldUnit || 'kg'}`
                        : `${parsedData.portions || 1} Raciones`}
                    </span>
                  </div>
                </div>

                {/* Badges de pasos y utensilios */}
                <div className="flex flex-wrap gap-2 text-[11px] text-stone-600 pt-2 border-t border-orange-100 mt-3">
                  <span className="flex items-center gap-1 font-medium">
                    <Layers size={14} className="text-teal-600" /> {parsedData.steps.length} pasos de elaboración
                  </span>
                  <span className="text-stone-300">·</span>
                  <span className="flex items-center gap-1 font-medium">
                    <UtensilsCrossed size={14} className="text-orange-600" /> {parsedData.ingredients.length} ingredientes detectados
                  </span>
                  {parsedData.equipment && parsedData.equipment.length > 0 && (
                    <>
                      <span className="text-stone-300">·</span>
                      <span className="truncate max-w-xs text-stone-500 font-medium">
                        Utensilios: {parsedData.equipment.slice(0, 3).join(', ')}{parsedData.equipment.length > 3 ? '...' : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Panel de Emparejamiento de Ingredientes */}
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <Scale size={16} className="text-teal-600" />
                      Emparejamiento de Ingredientes con el Obrador
                    </h4>
                    <p className="text-xs text-stone-500">
                      Comprueba cómo se asociarán los ingredientes del PDF a los productos de tu catálogo.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      {matchedCount} enlazados
                    </span>
                    {missingCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                        {missingCount} nuevos
                      </span>
                    )}
                  </div>
                </div>

                {/* Opción de Auto-creación de nuevos ingredientes */}
                {missingCount > 0 && (
                  <div className="mb-3 p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="text-xs text-amber-900">
                      <span className="font-bold">Hay {missingCount} ingredientes que no están en el catálogo.</span>
                      <p className="text-amber-700 text-[11px] mt-0.5">
                        Se registrarán automáticamente en el catálogo para que el escandallo quede 100% vinculado.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-amber-950 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={autoCreateMissing}
                        onChange={e => setAutoCreateMissing(e.target.checked)}
                        className="rounded border-amber-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                      />
                      Auto-crear
                    </label>
                  </div>
                )}

                {/* Tabla de Ingredientes detectados y su correspondencia */}
                <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-stone-100 text-stone-700 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Ingrediente en PDF</th>
                        <th className="py-2.5 px-3 text-right">Cantidad PDF</th>
                        <th className="py-2.5 px-3">Vinculación en Catálogo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white">
                      {parsedData.ingredients.map((item, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-stone-900">
                            <div>{item.name}</div>
                            {item.notes && (
                              <div className="text-[10px] text-stone-500 italic mt-0.5">
                                {item.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-800 whitespace-nowrap">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2.5 px-3">
                            {item.matchedId ? (
                              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                                <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                                <span className="truncate max-w-[200px]" title={item.matchedName}>
                                  {item.matchedName}
                                </span>
                                {item.convertedQuantity !== undefined && (
                                  <span className="text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-800 border border-emerald-200 shrink-0 font-mono">
                                    → {item.convertedQuantity} {item.convertedUnit}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-amber-700">
                                <AlertCircle size={14} className="shrink-0 text-amber-600" />
                                <span className="text-xs">
                                  {autoCreateMissing ? 'Se creará en catálogo' : 'Sin vincular'}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botón para volver a seleccionar otro PDF */}
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => setParsedData(null)}
                  className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RefreshCw size={13} /> Seleccionar otro archivo PDF
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Pie del Modal con Acciones */}
        <div className="px-6 py-4 border-t border-orange-100 bg-stone-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-stone-600 hover:bg-stone-200 rounded-xl font-medium text-xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          {parsedData && (
            <button
              type="button"
              onClick={handleApplyToForm}
              disabled={isSavingIngredients}
              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSavingIngredients ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Cargando en formulario...
                </>
              ) : (
                <>
                  <span>Rellenar Formulario de Receta</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
