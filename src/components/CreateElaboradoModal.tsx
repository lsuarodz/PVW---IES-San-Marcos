import React, { useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Sparkles } from 'lucide-react';
import { Recipe } from '../types';
import ImportRecipeModal from './ImportRecipeModal';

interface CreateElaboradoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newElaboradoId: string) => void;
}

export default function CreateElaboradoModal({ isOpen, onClose, onSuccess }: CreateElaboradoModalProps) {
  const { appUser } = useAuth();
  const { recipes } = useData();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [nameES, setNameES] = useState('');
  const [yieldUnit, setYieldUnit] = useState<'kg' | 'L' | 'ud'>('kg');
  const [yieldQuantity, setYieldQuantity] = useState<number>(1);
  const [unitWeight, setUnitWeight] = useState<string>('');
  const [unitWeightUnit, setUnitWeightUnit] = useState<'g' | 'kg'>('g');
  const [importedExtras, setImportedExtras] = useState<{
    steps?: string[];
    equipment?: string[];
    miseEnPlace?: string;
    sustainabilityTips?: string[];
    ingredients?: any[];
    descriptionES?: string;
  }>({});

  if (!isOpen) return null;

  const existingElaborados = recipes.filter(r => r.type === 'elaborado');
  const exactMatchExists = existingElaborados.some(r => r.nameES.toLowerCase().trim() === nameES.toLowerCase().trim());

  const handleApplyImportedRecipe = (imported: any) => {
    if (imported.nameES) setNameES(imported.nameES);
    if (imported.yieldUnit) setYieldUnit(imported.yieldUnit);
    if (imported.yieldQuantity) setYieldQuantity(Number(imported.yieldQuantity));
    if (imported.unitWeight) setUnitWeight(String(imported.unitWeight));
    if (imported.unitWeightUnit) setUnitWeightUnit(imported.unitWeightUnit);
    setImportedExtras({
      steps: imported.steps || [],
      equipment: imported.equipment || [],
      miseEnPlace: imported.miseEnPlace || '',
      sustainabilityTips: imported.sustainabilityTips || [],
      ingredients: imported.ingredients || [],
      descriptionES: imported.descriptionES || ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser || !nameES.trim()) return;
    
    setLoading(true);
    const id = doc(collection(db, 'recipes')).id;
    
    const recipeData: Record<string, any> = {
      type: 'elaborado',
      nameES: nameES.trim(),
      nameEN: '',
      descriptionES: importedExtras.descriptionES || '',
      descriptionEN: '',
      yieldUnit,
      yieldQuantity,
      portions: null,
      unitWeight: yieldUnit === 'ud' && unitWeight ? Number(unitWeight) : null,
      unitWeightUnit: yieldUnit === 'ud' ? unitWeightUnit : null,
      steps: importedExtras.steps || [],
      stepsEN: [],
      equipment: importedExtras.equipment || [],
      miseEnPlace: importedExtras.miseEnPlace || '',
      sustainabilityTips: importedExtras.sustainabilityTips || [],
      ingredients: importedExtras.ingredients || [],
      totalCost: 0,
      createdBy: appUser.name || appUser.email || 'Usuario',
      group: appUser.group || '',
      createdAt: new Date().toISOString()
    };

    if (recipeData.unitWeight === null) delete recipeData.unitWeight;
    if (recipeData.unitWeightUnit === null) delete recipeData.unitWeightUnit;

    try {
      await setDoc(doc(db, 'recipes', id), recipeData);
      if (onSuccess) onSuccess(id);
      showToast('Elaborado creado correctamente.', 'success');
      setNameES('');
      setYieldUnit('kg');
      setYieldQuantity(1);
      setUnitWeight('');
      setUnitWeightUnit('g');
      setImportedExtras({});
      onClose();
    } catch (error) {
      console.error('Error saving elaborado:', error);
      showToast('Error al guardar el elaborado', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-orange-50 rounded-2xl shadow-2xl w-full max-w-md flex flex-col ring-1 ring-orange-200">
        <div className="p-6 border-b border-orange-200 bg-orange-100 rounded-t-2xl flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-orange-950">
              Nuevo Elaborado Rápido
            </h2>
            <p className="text-sm text-stone-500 mt-1">Crea un elaborado básico ahora para añadirlo a la receta, o impórtalo desde un PDF.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-2.5 py-1 bg-white hover:bg-orange-50 text-amber-900 border border-orange-300 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors shrink-0 cursor-pointer"
            title="Importar datos desde un archivo PDF"
          >
            <Sparkles size={14} className="text-amber-600" />
            PDF
          </button>
        </div>
        <div className="p-6">
          <form id="create-elaborado-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-orange-900 mb-1">Nombre *</label>
              <input
                type="text"
                required
                list="existing-elaborados"
                value={nameES}
                onChange={(e) => setNameES(e.target.value)}
                autoFocus
                className="w-full px-4 py-2 bg-white border border-orange-200 shadow-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Ej. Salsa Brava, Caldo de pollo..."
              />
              <datalist id="existing-elaborados">
                {existingElaborados.map(r => (
                  <option key={r.id} value={r.nameES} />
                ))}
              </datalist>
              {exactMatchExists && (
                <p className="mt-2 text-xs text-amber-600 font-medium">Cuidado: Ya existe un elaborado con este nombre. Puedes buscarlo directamente en el buscador de ingredientes de la receta.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-orange-900 mb-1">Rendimiento (Cant.)</label>
                <input
                  type="number"
                  step="0.01"
                  value={yieldQuantity}
                  onChange={(e) => setYieldQuantity(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-white border border-orange-200 shadow-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-orange-900 mb-1">Unidad</label>
                <select
                  value={yieldUnit}
                  onChange={(e) => setYieldUnit(e.target.value as 'kg' | 'L' | 'ud')}
                  className="w-full px-4 py-2 bg-white border border-orange-200 shadow-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="L">Litros (L)</option>
                  <option value="ud">Unidades (ud)</option>
                </select>
              </div>
            </div>
            {yieldUnit === 'ud' && (
              <div>
                <label className="block text-sm font-medium text-orange-900 mb-1">Peso por unidad (opcional)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={unitWeight}
                    onChange={(e) => setUnitWeight(e.target.value)}
                    className="flex-1 px-4 py-2 bg-white border border-orange-200 shadow-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    placeholder="Ej. 45"
                  />
                  <select
                    value={unitWeightUnit}
                    onChange={(e) => setUnitWeightUnit(e.target.value as 'g' | 'kg')}
                    className="w-20 px-2 py-2 bg-white border border-orange-200 shadow-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-stone-700 text-sm"
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
                <p className="text-[10px] text-stone-400 mt-1">Peso por pieza o unidad en crudo (ej: 45 g).</p>
              </div>
            )}
          </form>
        </div>
        <div className="p-6 border-t border-orange-200 flex justify-end gap-3 bg-white rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-orange-900 hover:bg-orange-100 rounded-xl font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="create-elaborado-form"
            disabled={loading || !nameES.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            {loading ? 'Guardando...' : 'Crear Elaborado'}
          </button>
        </div>
      </div>

      <ImportRecipeModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onApplyRecipe={handleApplyImportedRecipe}
        targetType="elaborado"
      />
    </div>
  );
}
