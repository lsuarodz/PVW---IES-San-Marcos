import React, { useState, useMemo } from 'react';
import { db } from '../firebase';
import { collection, doc, writeBatch, setDoc } from 'firebase/firestore';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckSquare, 
  Square, 
  Search, 
  X, 
  Check, 
  AlertCircle, 
  Sparkles,
  Database,
  Filter,
  ArrowRight
} from 'lucide-react';
import { CATALOG_INGREDIENTS, CatalogItem } from '../data/catalogIngredients';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

interface ImportCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportCatalogModal({ isOpen, onClose }: ImportCatalogModalProps) {
  const { showToast } = useToast();
  const { appUser } = useAuth();
  const { ingredients: existingIngredients, providers } = useData();

  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

  // Set de IDs o nombres seleccionados del catálogo precargado
  const [selectedNames, setSelectedNames] = useState<Set<string>>(() => {
    return new Set(CATALOG_INGREDIENTS.map(i => i.nameES));
  });

  // Estado para la pestaña personalizada (pegar Excel / CSV)
  const [customText, setCustomText] = useState('');
  const [customParsedItems, setCustomParsedItems] = useState<CatalogItem[]>([]);
  const [customSelectedNames, setCustomSelectedNames] = useState<Set<string>>(new Set());

  // Mapeo rápido de nombres existentes en la base de datos para detectar duplicados
  const existingNamesMap = useMemo(() => {
    const map = new Map<string, string>();
    existingIngredients.forEach(ing => {
      map.set(ing.nameES.toLowerCase().trim(), ing.id);
    });
    return map;
  }, [existingIngredients]);

  // Categorías disponibles en el catálogo precargado
  const categories = useMemo(() => {
    const set = new Set<string>();
    CATALOG_INGREDIENTS.forEach(i => set.add(i.category));
    return Array.from(set);
  }, []);

  // Filtrado de elementos del catálogo
  const filteredCatalog = useMemo(() => {
    return CATALOG_INGREDIENTS.filter(item => {
      const matchesSearch = item.nameES.toLowerCase().includes(search.toLowerCase()) ||
        (item.purchaseFormat && item.purchaseFormat.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  if (!isOpen) return null;

  // Marcar / desmarcar todos los visibles en el catálogo
  const toggleSelectVisible = () => {
    const allVisibleSelected = filteredCatalog.every(item => selectedNames.has(item.nameES));
    const next = new Set(selectedNames);
    if (allVisibleSelected) {
      filteredCatalog.forEach(item => next.delete(item.nameES));
    } else {
      filteredCatalog.forEach(item => next.add(item.nameES));
    }
    setSelectedNames(next);
  };

  const selectAll = () => {
    setSelectedNames(new Set(CATALOG_INGREDIENTS.map(i => i.nameES)));
  };

  const unselectAll = () => {
    setSelectedNames(new Set());
  };

  // Función para parsear texto pegado de Excel o CSV
  const handleParseCustomText = (text: string) => {
    setCustomText(text);
    if (!text.trim()) {
      setCustomParsedItems([]);
      setCustomSelectedNames(new Set());
      return;
    }

    const lines = text.split(/\r?\n/);
    const parsed: CatalogItem[] = [];
    let currentCategory = 'Economato';

    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Separador por tabulador (copiado directo de Excel) o por coma
      const isTab = line.includes('\t');
      let tokens: string[] = [];

      if (isTab) {
        tokens = line.split('\t').map(t => t.trim());
      } else {
        let inQuote = false;
        let token = '';
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"') {
            if (inQuote && line[i+1] === '"') {
              token += '"';
              i++;
            } else {
              inQuote = !inQuote;
            }
          } else if (c === ',' && !inQuote) {
            tokens.push(token.trim());
            token = '';
          } else {
            token += c;
          }
        }
        tokens.push(token.trim());
      }

      const col0 = (tokens[0] || '').replace(/^"|"$/g, '').trim();
      const col1 = (tokens[1] || '').replace(/^"|"$/g, '').trim();
      const col2 = (tokens[2] || '').replace(/^"|"$/g, '').trim();

      // Ignorar fila de encabezado
      if (col0.toLowerCase().includes('ingrediente') || col1.toLowerCase().includes('precio') || col0.toLowerCase().includes('unidades')) {
        continue;
      }

      const catKeywords = ['VERDURAS', 'CARNES', 'PESCADOS', 'ECONOMATO', 'PASTELERÍA', 'PASTELERIA', 'FRUTAS', 'VARIOS'];
      if (catKeywords.includes(col0.toUpperCase()) && (!col1 || col1 === '')) {
        currentCategory = col0.charAt(0) + col0.slice(1).toLowerCase();
        continue;
      }

      if (!col0) continue;

      const rawPrice = col1.replace(',', '.');
      const price = parseFloat(rawPrice);
      const rawUnit = col2.toLowerCase();

      let unit: 'kg' | 'L' | 'g' | 'ud' = 'kg';
      let purchaseFormat = col2 || undefined;

      if (rawUnit === 'kg') {
        unit = 'kg';
      } else if (['litros', 'litro', 'l'].includes(rawUnit)) {
        unit = 'L';
      } else if (['gr', 'g'].includes(rawUnit)) {
        unit = 'g';
      } else if (['unid', 'und', 'unidades', 'unidad', 'ud.', 'ud'].includes(rawUnit)) {
        unit = 'ud';
        purchaseFormat = undefined;
      } else if (col2) {
        unit = 'ud';
        purchaseFormat = col2;
      }

      parsed.push({
        nameES: col0,
        purchasePrice: isNaN(price) ? 0 : price,
        costPerUnit: isNaN(price) ? 0 : price,
        wastePercentage: 0,
        unit,
        purchaseFormat,
        provider: currentCategory,
        category: currentCategory,
        allergens: []
      });
    }

    setCustomParsedItems(parsed);
    setCustomSelectedNames(new Set(parsed.map(p => p.nameES)));
  };

  // Función para ejecutar la importación en lotes a Firestore
  const executeImport = async (itemsToImport: CatalogItem[]) => {
    if (!appUser) {
      showToast('Debes iniciar sesión para realizar esta acción.', 'error');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: itemsToImport.length });

    try {
      // 1. Asegurar proveedores en la colección 'providers'
      const neededProviders = Array.from(new Set(itemsToImport.map(i => i.provider || i.category).filter(Boolean)));
      for (const provName of neededProviders) {
        const exists = providers.some(p => p.name.toLowerCase() === provName.toLowerCase());
        if (!exists) {
          const newProvId = doc(collection(db, 'providers')).id;
          await setDoc(doc(db, 'providers', newProvId), {
            id: newProvId,
            name: provName,
            createdBy: appUser.name || 'Admin',
            createdAt: new Date().toISOString()
          });
        }
      }

      // 2. Importar ingredientes en batches de 400
      const total = itemsToImport.length;
      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      const batchSize = 400;
      for (let i = 0; i < total; i += batchSize) {
        const chunk = itemsToImport.slice(i, i + batchSize);
        const batch = writeBatch(db);

        for (const item of chunk) {
          const lowerName = item.nameES.toLowerCase().trim();
          const existingId = existingNamesMap.get(lowerName);

          if (existingId && !overwriteExisting) {
            skipped++;
            continue;
          }

          const targetId = existingId || doc(collection(db, 'ingredients')).id;
          const ingredientDocRef = doc(db, 'ingredients', targetId);

          const docData: Record<string, any> = {
            nameES: item.nameES,
            nameEN: '',
            unit: item.unit,
            costPerUnit: item.costPerUnit,
            purchasePrice: item.purchasePrice,
            wastePercentage: item.wastePercentage || 0,
            provider: item.provider || item.category || '',
            allergens: item.allergens || [],
            createdBy: appUser.group || appUser.name || 'Admin',
            createdAt: new Date().toISOString()
          };

          if (item.purchaseFormat) {
            docData.purchaseFormat = item.purchaseFormat;
          }

          batch.set(ingredientDocRef, docData, { merge: true });

          if (existingId) {
            updated++;
          } else {
            inserted++;
          }
        }

        await batch.commit();
        setImportProgress({ current: Math.min(i + batchSize, total), total });
      }

      showToast(`¡Importación completada! ${inserted} nuevos, ${updated} actualizados${skipped > 0 ? `, ${skipped} omitidos por ya existir` : ''}.`, 'success');
      onClose();
    } catch (error) {
      console.error('Error al importar ingredientes:', error);
      showToast('Ocurrió un error al importar los ingredientes a la base de datos.', 'error');
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const handleImportPreloaded = () => {
    const items = CATALOG_INGREDIENTS.filter(item => selectedNames.has(item.nameES));
    if (items.length === 0) {
      showToast('Selecciona al menos un ingrediente para importar.', 'info');
      return;
    }
    executeImport(items);
  };

  const handleImportCustom = () => {
    const items = customParsedItems.filter(item => customSelectedNames.has(item.nameES));
    if (items.length === 0) {
      showToast('Selecciona al menos un ingrediente de la tabla pegada.', 'info');
      return;
    }
    executeImport(items);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-stone-200 my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera del Modal */}
        <div className="p-5 sm:p-6 border-b border-stone-200 bg-gradient-to-r from-teal-700 to-emerald-700 text-white flex justify-between items-start">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
              <FileSpreadsheet size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Importar Ingredientes al Economato
                <span className="text-xs bg-emerald-400 text-emerald-950 font-bold px-2.5 py-0.5 rounded-full">
                  Excel / Catálogo
                </span>
              </h2>
              <p className="text-teal-100 text-sm mt-0.5">
                Carga masiva directa de productos con sus precios y formatos en la base de datos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="text-teal-200 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Pestañas de navegación */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-6 pt-3 gap-3">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${
              activeTab === 'catalog'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sparkles size={16} />
            Catálogo Procesado ({CATALOG_INGREDIENTS.length} Ingredientes)
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${
              activeTab === 'custom'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Upload size={16} />
            Pegar otra tabla Excel / CSV
          </button>
        </div>

        {/* Contenido según pestaña */}
        {activeTab === 'catalog' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Barra de Filtros y Búsqueda */}
            <div className="p-4 bg-white border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar en el catálogo..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-stone-100 p-1 rounded-xl">
                  <Filter size={14} className="text-stone-400 ml-1.5" />
                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="bg-transparent border-none text-xs font-semibold focus:outline-none pr-2 cursor-pointer"
                  >
                    <option value="all">Todas las categorías ({CATALOG_INGREDIENTS.length})</option>
                    {categories.map(cat => {
                      const count = CATALOG_INGREDIENTS.filter(i => i.category === cat).length;
                      return (
                        <option key={cat} value={cat}>
                          {cat} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Botones de Selección Rápida */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSelectVisible}
                  className="text-xs px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-lg transition-colors"
                >
                  Marcar/desmarcar visibles
                </button>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-lg transition-colors"
                >
                  Marcar todos ({CATALOG_INGREDIENTS.length})
                </button>
                <button
                  type="button"
                  onClick={unselectAll}
                  className="text-xs px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-lg transition-colors"
                >
                  Desmarcar todo
                </button>
              </div>
            </div>

            {/* Estadísticas de la selección */}
            <div className="px-5 py-2.5 bg-stone-50 border-b border-stone-200 text-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-stone-600">
                <span>
                  Seleccionados: <strong className="text-stone-900 font-bold">{selectedNames.size}</strong> de {CATALOG_INGREDIENTS.length}
                </span>
                <span>
                  Mostrando: <strong className="text-stone-900 font-bold">{filteredCatalog.length}</strong>
                </span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none text-stone-700 font-medium">
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={e => setOverwriteExisting(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-stone-300 focus:ring-teal-500"
                />
                <span>Actualizar precios si el ingrediente ya existe en el programa</span>
              </label>
            </div>

            {/* Listado de ingredientes en tabla */}
            <div className="flex-1 overflow-y-auto p-4 max-h-[50vh]">
              <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-stone-100 border-b border-stone-200 text-stone-700 font-semibold">
                      <th className="p-3 w-10 text-center">
                        <button onClick={toggleSelectVisible} className="hover:text-teal-600">
                          <CheckSquare size={18} />
                        </button>
                      </th>
                      <th className="p-3">Ingrediente</th>
                      <th className="p-3">Categoría / Proveedor</th>
                      <th className="p-3">Precio Compra</th>
                      <th className="p-3">Unidad Base</th>
                      <th className="p-3">Formato de Compra</th>
                      <th className="p-3">Estado en el Sistema</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredCatalog.map((item, idx) => {
                      const isSelected = selectedNames.has(item.nameES);
                      const exists = existingNamesMap.has(item.nameES.toLowerCase().trim());

                      return (
                        <tr
                          key={`${item.nameES}-${item.category}-${idx}`}
                          onClick={() => {
                            const next = new Set(selectedNames);
                            if (isSelected) next.delete(item.nameES);
                            else next.add(item.nameES);
                            setSelectedNames(next);
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-teal-50/50 hover:bg-teal-50'
                              : 'hover:bg-stone-50'
                          }`}
                        >
                          <td className="p-3 text-center">
                            <div className={isSelected ? 'text-teal-600' : 'text-stone-300'}>
                              {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                            </div>
                          </td>
                          <td className="p-3 font-semibold text-stone-900">
                            {item.nameES}
                          </td>
                          <td className="p-3 text-stone-600">
                            <span className="px-2 py-0.5 rounded-md bg-stone-100 font-medium text-xs">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-stone-900">
                            {item.purchasePrice > 0 ? `${item.purchasePrice.toFixed(2)} €` : <span className="text-stone-400 font-normal">Sin precio</span>}
                          </td>
                          <td className="p-3 text-stone-600">
                            <span className="font-mono bg-stone-100 px-1.5 py-0.5 rounded text-xs font-bold text-teal-800">
                              {item.unit}
                            </span>
                          </td>
                          <td className="p-3 text-stone-500 text-xs">
                            {item.purchaseFormat || '-'}
                          </td>
                          <td className="p-3">
                            {exists ? (
                              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                Ya registrado
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                Nuevo
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Pestaña para pegar Excel o CSV */
          <div className="p-6 flex-1 flex flex-col overflow-y-auto space-y-4">
            <div>
              <label className="block text-sm font-bold text-stone-800 mb-1.5">
                Copia las columnas de tu Excel y pégalas aquí:
              </label>
              <p className="text-xs text-stone-500 mb-2">
                Acepta columnas de <strong>Nombre, Precio y Unidad/Formato</strong> separadas por tabuladores o comas.
              </p>
              <textarea
                value={customText}
                onChange={e => handleParseCustomText(e.target.value)}
                placeholder={"Ejemplo de pegado directo desde Excel:\nTomate salsa\t1,3\tkg\nLentejas\t0,8\tkg\nNata para cocinar\t1,4\tlitros"}
                className="w-full h-36 p-3 text-xs font-mono border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none bg-stone-50"
              />
            </div>

            {customParsedItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                    <Check size={16} className="text-emerald-600" />
                    Se han detectado {customParsedItems.length} ingredientes listos para importar:
                  </h4>
                  <span className="text-xs text-stone-500">
                    {customSelectedNames.size} seleccionados
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-stone-100 font-semibold text-stone-700">
                      <tr>
                        <th className="p-2 w-8">#</th>
                        <th className="p-2">Ingrediente</th>
                        <th className="p-2">Precio</th>
                        <th className="p-2">Unidad</th>
                        <th className="p-2">Formato</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {customParsedItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="p-2 text-stone-400">{idx + 1}</td>
                          <td className="p-2 font-medium text-stone-900">{item.nameES}</td>
                          <td className="p-2 font-mono font-semibold">{item.purchasePrice} €</td>
                          <td className="p-2 font-mono">{item.unit}</td>
                          <td className="p-2 text-stone-500">{item.purchaseFormat || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Barra de progreso si está importando */}
        {isImporting && importProgress && (
          <div className="p-4 bg-teal-50 border-t border-teal-200">
            <div className="flex justify-between text-xs font-semibold text-teal-900 mb-1.5">
              <span>Guardando en la base de datos...</span>
              <span>
                {importProgress.current} / {importProgress.total} (
                {Math.round((importProgress.current / importProgress.total) * 100)}%)
              </span>
            </div>
            <div className="w-full h-2 bg-teal-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-600 transition-all duration-300"
                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Pie del Modal con Botones */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-stone-500 flex items-center gap-1.5">
            <Database size={15} className="text-teal-600" />
            <span>Los ingredientes se guardarán de forma permanente en Firebase Firestore.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-200 bg-stone-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            {activeTab === 'catalog' ? (
              <button
                type="button"
                onClick={handleImportPreloaded}
                disabled={isImporting || selectedNames.size === 0}
                className="px-6 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                {isImporting
                  ? 'Importando...'
                  : `Añadir a la Base de Datos (${selectedNames.size} Ingredientes)`}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleImportCustom}
                disabled={isImporting || customSelectedNames.size === 0}
                className="px-6 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Upload size={16} />
                {isImporting
                  ? 'Importando...'
                  : `Importar Tabla Pegada (${customSelectedNames.size})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
