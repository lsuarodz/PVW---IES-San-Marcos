import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Edit2, Search, AlertCircle, Download } from 'lucide-react';
import { MERCADONA_PRODUCTS, WASTE_TABLE } from '../utils/bulkIngredients';
import { ALLERGENS } from '../constants/allergens';

export interface Ingredient {
  id: string;
  nameES: string;
  nameEN: string; // Kept for backward compatibility, but not edited here
  provider?: string;
  format?: string;
  allergens?: string[];
  unit: 'kg' | 'L' | 'ud';
  purchasePrice?: number;
  wastePercentage?: number;
  costPerUnit: number;
  createdBy: string;
  createdAt: string;
}

export default function Ingredients() {
  const { appUser } = useAuth();
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'docente';
  const isSuperAdmin = appUser?.role === 'admin';
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleBulkImport = async () => {
    if (!appUser || !window.confirm('¿Estás seguro de que quieres importar todos los ingredientes de los documentos?')) return;
    setIsImporting(true);

    const parseUnitAndPrice = (name: string, priceStr: string, unitStr: string) => {
      const price = parseFloat(priceStr.replace(',', '.')) || 0;
      let unit: Ingredient['unit'] = 'kg';
      let purchasePrice = price;

      if (unitStr.includes('kg')) {
        const match = unitStr.match(/(\d+\.?\d*)\s*kg/);
        const qty = match ? parseFloat(match[1]) : 1;
        unit = 'kg';
        purchasePrice = price / qty;
      } else if (unitStr.includes(' g')) {
        const match = unitStr.match(/(\d+\.?\d*)\s*g/);
        const qty = match ? parseFloat(match[1]) : 1;
        unit = 'kg';
        purchasePrice = (price / qty) * 1000;
      } else if (unitStr.includes(' ml')) {
        const match = unitStr.match(/(\d+\.?\d*)\s*ml/);
        const qty = match ? parseFloat(match[1]) : 1;
        unit = 'L';
        purchasePrice = (price / qty) * 1000;
      } else if (unitStr.includes(' L')) {
        const match = unitStr.match(/(\d+\.?\d*)\s*L/);
        const qty = match ? parseFloat(match[1]) : 1;
        unit = 'L';
        purchasePrice = price / qty;
      } else if (unitStr.includes(' ud') || unitStr.includes(' pastillas') || unitStr.includes(' chicles') || unitStr.includes(' sobres') || unitStr.includes(' Bote') || unitStr.includes(' Caja') || unitStr.includes(' Paquete')) {
        const match = unitStr.match(/(\d+)\s*(ud|pastillas|chicles|sobres)/);
        const qty = match ? parseFloat(match[1]) : 1;
        unit = 'ud';
        purchasePrice = price / qty;
      }

      return { unit, purchasePrice };
    };

    try {
      // Get existing ingredients to avoid duplicates
      const existingNames = new Set(ingredients.map(i => i.nameES.toLowerCase()));

      // Import Mercadona Products
      for (const product of MERCADONA_PRODUCTS) {
        if (existingNames.has(product["Nombre del Producto"].toLowerCase())) continue;

        const { unit, purchasePrice } = parseUnitAndPrice(product["Nombre del Producto"], product["Precio (EUR)"], product["Unidad de Medida"]);
        const id = doc(collection(db, 'ingredients')).id;
        const wastePercentage = 0;
        const costPerUnit = purchasePrice / (1 - (wastePercentage / 100));

        await setDoc(doc(db, 'ingredients', id), {
          nameES: product["Nombre del Producto"],
          nameEN: '',
          provider: 'Mercadona',
          unit,
          purchasePrice,
          wastePercentage,
          costPerUnit,
          createdBy: appUser.name,
          createdAt: new Date().toISOString(),
        });
        existingNames.add(product["Nombre del Producto"].toLowerCase());
      }

      // Import Waste Table
      for (const item of WASTE_TABLE) {
        if (existingNames.has(item.name.toLowerCase())) continue;

        const id = doc(collection(db, 'ingredients')).id;
        const wastePercentage = item.waste;
        const purchasePrice = 0;
        const costPerUnit = 0;

        await setDoc(doc(db, 'ingredients', id), {
          nameES: item.name,
          nameEN: '',
          provider: 'Tabla de Mermas',
          unit: item.unit as Ingredient['unit'],
          purchasePrice,
          wastePercentage,
          costPerUnit,
          createdBy: appUser.name,
          createdAt: new Date().toISOString(),
        });
        existingNames.add(item.name.toLowerCase());
      }

      alert('Importación completada con éxito');
    } catch (error) {
      console.error('Error importing ingredients:', error);
      alert('Error durante la importación');
    } finally {
      setIsImporting(false);
    }
  };
  
  const [formData, setFormData] = useState({
    nameES: '',
    provider: '',
    allergens: [] as string[],
    unit: 'kg' as Ingredient['unit'],
    purchasePrice: '' as string | number,
    wastePercentage: '' as string | number,
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'ingredients'), (snapshot) => {
      const data: Ingredient[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Ingredient);
      });
      setIngredients(data.sort((a, b) => a.nameES.localeCompare(b.nameES)));
    });

    const unsubRecipes = onSnapshot(collection(db, 'recipes'), (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      setRecipes(data);
    });

    return () => {
      unsubscribe();
      unsubRecipes();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    // Calculate cost per unit based on purchase price and waste
    const waste = Number(formData.wastePercentage) || 0;
    const safeWaste = Math.min(Math.max(waste, 0), 99); // Prevent division by zero
    const purchasePrice = Number(formData.purchasePrice) || 0;
    const costPerUnit = purchasePrice / (1 - (safeWaste / 100));

    const id = editingId || doc(collection(db, 'ingredients')).id;
    const ingredientData = {
      ...formData,
      purchasePrice,
      nameEN: editingId ? ingredients.find(i => i.id === editingId)?.nameEN || '' : '',
      wastePercentage: safeWaste,
      costPerUnit,
      createdBy: appUser.group || appUser.name,
      createdAt: editingId ? ingredients.find(i => i.id === editingId)?.createdAt : new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'ingredients', id), ingredientData);
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving ingredient:', error);
      alert('Error al guardar el ingrediente');
    }
  };

  const handleDelete = async (id: string) => {
    const isUsedInRecipe = recipes.some(recipe => 
      recipe.ingredients?.some((ing: any) => ing.ingredientId === id)
    );

    if (isUsedInRecipe) {
      alert('No se puede eliminar este ingrediente porque se está utilizando en uno o más escandallos (recetas).');
      return;
    }

    if (window.confirm('¿Estás seguro de eliminar este ingrediente?')) {
      try {
        await deleteDoc(doc(db, 'ingredients', id));
      } catch (error) {
        console.error('Error deleting ingredient:', error);
        alert('Error al eliminar. Solo el tutor puede eliminar ingredientes.');
      }
    }
  };

  const openEdit = (ingredient: Ingredient) => {
    setFormData({
      nameES: ingredient.nameES,
      provider: ingredient.provider || '',
      allergens: ingredient.allergens || [],
      unit: (ingredient.unit as 'kg' | 'L' | 'ud') || 'kg',
      purchasePrice: ingredient.purchasePrice || ingredient.costPerUnit,
      wastePercentage: ingredient.wastePercentage || 0,
    });
    setEditingId(ingredient.id);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ 
      nameES: '', provider: '', 
      allergens: [], unit: 'kg', purchasePrice: '' as string | number, wastePercentage: '' as string | number 
    });
    setEditingId(null);
  };

  const toggleAllergen = (allergenId: string) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergenId)
        ? prev.allergens.filter(id => id !== allergenId)
        : [...prev.allergens, allergenId]
    }));
  };

  const filteredIngredients = ingredients.filter(i => 
    i.nameES.toLowerCase().includes(search.toLowerCase()) || 
    i.nameEN?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Ingredientes</h1>
          <p className="text-stone-500 mt-2">Gestiona el listado de ingredientes y sus costes.</p>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <button
              onClick={handleBulkImport}
              disabled={isImporting}
              className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={20} />
              {isImporting ? 'Importando...' : 'Importar Documentos'}
            </button>
          )}
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Nuevo Ingrediente
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="p-4 border-b border-stone-200 bg-stone-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            <input
              type="text"
              placeholder="Buscar ingredientes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="px-6 py-4 text-sm font-semibold text-stone-900">Nombre</th>
              <th className="px-6 py-4 text-sm font-semibold text-stone-900">Proveedor</th>
              <th className="px-6 py-4 text-sm font-semibold text-stone-900">Alérgenos</th>
              <th className="px-6 py-4 text-sm font-semibold text-stone-900">Coste Real / Unidad</th>
              <th className="px-6 py-4 text-sm font-semibold text-stone-900 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {filteredIngredients.map((ing) => (
              <tr key={ing.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm text-stone-900 font-medium">{ing.nameES}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-stone-900">{ing.provider || '-'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {ing.allergens && ing.allergens.length > 0 ? (
                      ing.allergens.map(a => {
                        const allergen = ALLERGENS.find(al => al.id === a);
                        return allergen ? (
                          <span key={a} title={allergen.name} className="text-lg">{allergen.icon}</span>
                        ) : null;
                      })
                    ) : (
                      <span className="text-xs text-stone-400">Ninguno</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-stone-900 font-medium">{ing.costPerUnit.toFixed(2)} € / {ing.unit}</div>
                  {(ing.wastePercentage || 0) > 0 && (
                    <div className="text-xs text-orange-600">Merma: {ing.wastePercentage}%</div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(ing)}
                      className="text-stone-400 hover:text-emerald-600 p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDelete(ing.id)}
                        className="text-stone-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredIngredients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-stone-500">
                  No se encontraron ingredientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-stone-100">
              <h2 className="text-xl font-bold text-stone-900">
                {editingId ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
              </h2>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="ingredient-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      required
                      value={formData.nameES}
                      onChange={e => setFormData({...formData, nameES: e.target.value})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Proveedor</label>
                    <input
                      type="text"
                      value={formData.provider}
                      onChange={e => setFormData({...formData, provider: e.target.value})}
                      placeholder="Ej. Makro, Mercamadrid..."
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Unidad *</label>
                    <select
                      value={formData.unit}
                      onChange={e => setFormData({...formData, unit: e.target.value as any})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="kg">Kilogramo (kg)</option>
                      <option value="L">Litro (L)</option>
                      <option value="ud">Unidad (ud)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Precio Compra (€ por {formData.unit}) *</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      required
                      value={formData.purchasePrice}
                      onChange={e => setFormData({...formData, purchasePrice: e.target.value})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">% Merma</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="99"
                      value={formData.wastePercentage}
                      onChange={e => setFormData({...formData, wastePercentage: e.target.value})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Real cost preview */}
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
                  <AlertCircle className="text-emerald-600" size={20} />
                  <div className="text-sm text-emerald-800">
                    Coste real por <strong>1 {formData.unit}</strong> (aplicando merma): 
                    <span className="font-bold ml-2 text-lg">
                      {((Number(formData.purchasePrice) || 0) / (1 - (Math.min(Math.max(Number(formData.wastePercentage) || 0, 0), 99) / 100))).toFixed(2)} €
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-900 mb-3">Alérgenos</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {ALLERGENS.map(allergen => (
                      <label key={allergen.id} className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 hover:bg-stone-50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.allergens.includes(allergen.id)}
                          onChange={() => toggleAllergen(allergen.id)}
                          className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
                        />
                        <span className="text-lg" title={allergen.name}>{allergen.icon}</span>
                        <span className="text-sm text-stone-700">{allergen.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-stone-100 flex gap-3 justify-end bg-stone-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-stone-600 hover:bg-stone-200 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="ingredient-form"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
