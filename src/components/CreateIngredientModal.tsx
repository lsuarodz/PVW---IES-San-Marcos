import React, { useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';
import { ALLERGENS } from '../constants/allergens';

interface CreateIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newIngredientId: string) => void;
}

export default function CreateIngredientModal({ isOpen, onClose, onSuccess }: CreateIngredientModalProps) {
  const { appUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nameES: '',
    provider: '',
    allergens: [] as string[],
    unit: 'kg' as 'kg' | 'L' | 'ud',
    purchasePrice: '' as string | number,
    wastePercentage: '' as string | number,
  });

  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        nameES: '',
        provider: '',
        allergens: [],
        unit: 'kg',
        purchasePrice: '',
        wastePercentage: '',
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;
    setLoading(true);

    const waste = Number(formData.wastePercentage) || 0;
    const safeWaste = Math.min(Math.max(waste, 0), 99);
    const purchasePrice = Number(formData.purchasePrice) || 0;
    const costPerUnit = purchasePrice / (1 - (safeWaste / 100));

    const newDocRef = doc(collection(db, 'ingredients'));
    const ingredientData = {
      ...formData,
      purchasePrice,
      nameEN: '',
      wastePercentage: safeWaste,
      costPerUnit,
      createdBy: appUser.group || appUser.name,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(newDocRef, ingredientData);
      if (onSuccess) onSuccess(newDocRef.id);
      onClose();
    } catch (error) {
      console.error('Error saving ingredient:', error);
      alert('Error al guardar el ingrediente');
    } finally {
      setLoading(false);
    }
  };

  const toggleAllergen = (id: string) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.includes(id)
        ? prev.allergens.filter(a => a !== id)
        : [...prev.allergens, id]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-stone-100">
          <h2 className="text-xl font-bold text-stone-900">Nuevo Ingrediente</h2>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <form id="create-ingredient-form" onSubmit={handleSubmit} className="space-y-6">
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
        <div className="p-6 border-t border-stone-100 flex justify-end gap-3 bg-stone-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-stone-600 hover:bg-stone-200 rounded-xl font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="create-ingredient-form"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            {loading ? 'Guardando...' : 'Guardar Ingrediente'}
          </button>
        </div>
      </div>
    </div>
  );
}
