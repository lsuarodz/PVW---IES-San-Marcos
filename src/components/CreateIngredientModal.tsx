import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AlertCircle } from 'lucide-react';
import { ALLERGENS } from '../constants/allergens';
import { useForm, Controller } from 'react-hook-form';

interface CreateIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newIngredientId: string) => void;
  editingId?: string | null;
  initialData?: any;
}

interface IngredientFormData {
  nameES: string;
  provider: string;
  allergens: string[];
  unit: 'kg' | 'L' | 'ud';
  purchasePrice: number;
  wastePercentage: number;
}

export default function CreateIngredientModal({ isOpen, onClose, onSuccess, editingId, initialData }: CreateIngredientModalProps) {
  const { appUser } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors }
  } = useForm<IngredientFormData>({
    defaultValues: {
      nameES: '',
      provider: '',
      allergens: [],
      unit: 'kg',
      purchasePrice: 0,
      wastePercentage: 0,
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (editingId && initialData) {
        reset({
          nameES: initialData.nameES || '',
          provider: initialData.provider || '',
          allergens: initialData.allergens || [],
          unit: initialData.unit || 'kg',
          purchasePrice: initialData.purchasePrice || 0,
          wastePercentage: initialData.wastePercentage || 0,
        });
      } else {
        reset({
          nameES: '',
          provider: '',
          allergens: [],
          unit: 'kg',
          purchasePrice: 0,
          wastePercentage: 0,
        });
      }
    }
  }, [isOpen, editingId, initialData, reset]);

  const purchasePrice = watch('purchasePrice');
  const wastePercentage = watch('wastePercentage');
  const unit = watch('unit');
  const allergens = watch('allergens');

  if (!isOpen) return null;

  const onSubmit = async (data: IngredientFormData) => {
    if (!appUser) return;
    setLoading(true);

    const waste = Number(data.wastePercentage) || 0;
    const safeWaste = Math.min(Math.max(waste, 0), 99);
    const price = Number(data.purchasePrice) || 0;
    const costPerUnit = price / (1 - (safeWaste / 100));

    const id = editingId || doc(collection(db, 'ingredients')).id;
    const ingredientData = {
      ...data,
      purchasePrice: price,
      nameEN: initialData?.nameEN || '',
      wastePercentage: safeWaste,
      costPerUnit,
      createdBy: initialData?.createdBy || appUser.group || appUser.name,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'ingredients', id), ingredientData);
      if (onSuccess) onSuccess(id);
      showToast(editingId ? 'Ingrediente actualizado' : 'Ingrediente guardado correctamente', 'success');
      onClose();
    } catch (error) {
      console.error('Error saving ingredient:', error);
      showToast('Error al guardar el ingrediente', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleAllergen = (id: string) => {
    const currentAllergens = allergens || [];
    const newAllergens = currentAllergens.includes(id)
      ? currentAllergens.filter(a => a !== id)
      : [...currentAllergens, id];
    setValue('allergens', newAllergens, { shouldValidate: true });
  };

  const safeWaste = Math.min(Math.max(Number(wastePercentage) || 0, 0), 99);
  const realCost = ((Number(purchasePrice) || 0) / (1 - (safeWaste / 100))).toFixed(2);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" style={{ backgroundColor: '#FAEBD7' }}>
        <div className="p-6 border-b border-stone-200/50">
          <h2 className="text-xl font-bold text-stone-900">
            {editingId ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
          </h2>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <form id="create-ingredient-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  {...register('nameES', { required: 'El nombre es obligatorio' })}
                  className={`w-full px-4 py-2 bg-stone-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.nameES ? 'border-red-500' : 'border-stone-200'}`}
                />
                {errors.nameES && <p className="text-red-500 text-xs mt-1">{errors.nameES.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Proveedor</label>
                <input
                  type="text"
                  {...register('provider')}
                  placeholder="Ej. Makro, Mercamadrid..."
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Unidad *</label>
                <select
                  {...register('unit', { required: 'Selecciona una unidad' })}
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="kg">Kilogramo (kg)</option>
                  <option value="L">Litro (L)</option>
                  <option value="ud">Unidad (ud)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Precio Compra (€ por {unit}) *</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  {...register('purchasePrice', { 
                    required: 'El precio es obligatorio',
                    min: { value: 0, message: 'El precio no puede ser negativo' },
                    valueAsNumber: true
                  })}
                  className={`w-full px-4 py-2 bg-stone-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.purchasePrice ? 'border-red-500' : 'border-stone-200'}`}
                />
                {errors.purchasePrice && <p className="text-red-500 text-xs mt-1">{errors.purchasePrice.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">% Merma</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="99"
                  {...register('wastePercentage', { 
                    min: { value: 0, message: 'Mínimo 0' },
                    max: { value: 99, message: 'Máximo 99' },
                    valueAsNumber: true
                  })}
                  className={`w-full px-4 py-2 bg-stone-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.wastePercentage ? 'border-red-500' : 'border-stone-200'}`}
                />
                {errors.wastePercentage && <p className="text-red-500 text-xs mt-1">{errors.wastePercentage.message}</p>}
              </div>
            </div>

            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
              <AlertCircle className="text-emerald-600" size={20} />
              <div className="text-sm text-emerald-800">
                Coste real por <strong>1 {unit}</strong> (aplicando merma): 
                <span className="font-bold ml-2 text-lg">
                  {realCost} €
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
                      checked={(allergens || []).includes(allergen.id)}
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
        <div className="p-6 border-t border-stone-200/50 flex justify-end gap-3 rounded-b-2xl" style={{ backgroundColor: '#FAEBD7' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-stone-600 hover:bg-stone-200/50 rounded-xl font-medium transition-colors"
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
