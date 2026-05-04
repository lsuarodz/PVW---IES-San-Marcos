import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { AlertCircle } from 'lucide-react';
import { ALLERGENS } from '../constants/allergens';
import { useForm, Controller } from 'react-hook-form';

// ============================================================================
// INTERFACES (Definición de Tipos y Props)
// ============================================================================
// Las "Props" son los parámetros que recibe este componente desde fuera.
// Por ejemplo, "isOpen" le dice si debe mostrarse o estar oculto.
interface CreateIngredientModalProps {
  isOpen: boolean; // ¿El modal está abierto?
  onClose: () => void; // Función para cerrar el modal
  onSuccess?: (newIngredientId: string) => void; // Función opcional que se ejecuta si todo va bien
  editingId?: string | null; // Si estamos editando, aquí viene el ID del ingrediente
  initialData?: any; // Los datos iniciales si estamos editando
}

// Esto define la forma de los datos del formulario (qué campos tiene)
interface IngredientFormData {
  nameES: string;
  provider: string;
  allergens: string[];
  unit: 'kg' | 'L' | 'ud';
  purchasePrice: number;
  wastePercentage: number;
  purchaseFormat?: string;
  formatPrice?: number;
  weightPerUnit?: number;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function CreateIngredientModal({ isOpen, onClose, onSuccess, editingId, initialData }: CreateIngredientModalProps) {
  // Traemos el usuario actual y la lista de proveedores desde los contextos globales
  const { appUser } = useAuth();
  const { providers } = useData();
  const { showToast } = useToast(); // Para mostrar mensajes emergentes
  
  // Estado para saber si estamos guardando datos (para deshabilitar el botón y mostrar "Guardando...")
  const [loading, setLoading] = useState(false);

  // ============================================================================
  // CONFIGURACIÓN DEL FORMULARIO (react-hook-form)
  // ============================================================================
  // useForm es una librería que nos facilita manejar formularios sin tener que 
  // crear un "useState" para cada campo.
  const {
    register, // Conecta un campo HTML (input) con la librería
    handleSubmit, // Función que se ejecuta al enviar el formulario
    control,
    watch, // Permite "vigilar" el valor de un campo en tiempo real
    reset, // Sirve para vaciar el formulario o llenarlo con datos iniciales
    setValue, // Permite cambiar el valor de un campo manualmente
    formState: { errors } // Aquí se guardan los errores de validación (ej. "Campo obligatorio")
  } = useForm<IngredientFormData>({
    defaultValues: {
      nameES: '',
      provider: '',
      allergens: [],
      unit: 'kg',
      purchasePrice: 0,
      wastePercentage: 0,
      purchaseFormat: '',
      formatPrice: 0,
      weightPerUnit: 0,
    }
  });

  // ============================================================================
  // EFECTO: LLENAR DATOS AL ABRIR
  // ============================================================================
  // Este useEffect se ejecuta cada vez que el modal se abre o cambia el ingrediente a editar.
  useEffect(() => {
    if (isOpen) {
      // Si tenemos un editingId, significa que vamos a EDITAR. Llenamos el formulario con sus datos.
      if (editingId && initialData) {
        reset({
          nameES: initialData.nameES || '',
          provider: initialData.provider || '',
          allergens: initialData.allergens || [],
          unit: initialData.unit || 'kg',
          purchasePrice: initialData.purchasePrice || 0,
          wastePercentage: initialData.wastePercentage || 0,
          purchaseFormat: initialData.purchaseFormat || '',
          formatPrice: initialData.formatPrice || 0,
          weightPerUnit: initialData.weightPerUnit || 0,
        });
      } else {
        // Si NO hay editingId, significa que vamos a CREAR uno nuevo. Vaciamos el formulario.
        reset({
          nameES: '',
          provider: '',
          allergens: [],
          unit: 'kg',
          purchasePrice: 0,
          wastePercentage: 0,
          purchaseFormat: '',
          formatPrice: 0,
          weightPerUnit: 0,
        });
      }
    }
  }, [isOpen, editingId, initialData, reset]);

  // "Vigilamos" estos campos para poder calcular el coste real en vivo mientras el usuario escribe
  const purchasePrice = watch('purchasePrice');
  const wastePercentage = watch('wastePercentage');
  const unit = watch('unit');
  const allergens = watch('allergens');

  // Si el modal no está abierto, no renderizamos nada (devolvemos null)
  if (!isOpen) return null;

  // ============================================================================
  // FUNCIÓN PARA GUARDAR EN FIREBASE
  // ============================================================================
  const onSubmit = async (data: IngredientFormData) => {
    if (!appUser) return;
    setLoading(true); // Activamos el estado de carga

    // 1. Cálculos de seguridad
    const waste = Number(data.wastePercentage) || 0;
    const safeWaste = Math.min(Math.max(waste, 0), 99); // Evitamos mermas mayores a 99% o menores a 0%
    
    let price = Number(data.purchasePrice) || 0;
    const formatPrice = Number(data.formatPrice) || 0;
    const weightPerUnit = Number(data.weightPerUnit) || 0;
    
    if (formatPrice > 0 && weightPerUnit > 0) {
      price = formatPrice / weightPerUnit;
    }
    
    // 2. Cálculo del coste real por unidad (Precio / (1 - Merma%))
    const costPerUnit = price / (1 - (safeWaste / 100));

    // 3. Preparamos el ID. Si estamos editando, usamos el ID existente. 
    // Si es nuevo, Firebase genera un ID automático (doc(collection(...)).id).
    const id = editingId || doc(collection(db, 'ingredients')).id;
    
    // 4. Preparamos el objeto final que se guardará en la base de datos
    const ingredientData: Record<string, any> = {
      ...data,
      purchasePrice: price,
      formatPrice: formatPrice > 0 ? formatPrice : undefined,
      weightPerUnit: weightPerUnit > 0 ? weightPerUnit : undefined,
      purchaseFormat: data.purchaseFormat || '',
      nameEN: initialData?.nameEN || '', // Mantenemos el nombre en inglés si existía
      wastePercentage: safeWaste,
      costPerUnit,
      createdBy: initialData?.createdBy || appUser.group || appUser.name,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    if (ingredientData.formatPrice === undefined) delete ingredientData.formatPrice;
    if (ingredientData.weightPerUnit === undefined) delete ingredientData.weightPerUnit;

    try {
      if (data.provider) {
        const providerName = data.provider.trim();
        const providerExists = providers.some(p => p.name.toLowerCase() === providerName.toLowerCase());
        
        if (!providerExists && providerName) {
          const newProviderId = doc(collection(db, 'providers')).id;
          await setDoc(doc(db, 'providers', newProviderId), {
            id: newProviderId,
            name: providerName,
            createdBy: appUser.name,
            createdAt: new Date().toISOString()
          });
          ingredientData.provider = providerName;
        }
      }

      // 5. Guardamos en Firebase. "setDoc" crea el documento si no existe, o lo sobrescribe si ya existe.
      await setDoc(doc(db, 'ingredients', id), ingredientData);
      
      // 6. Si todo fue bien, avisamos al componente padre (onSuccess), mostramos un mensaje y cerramos.
      if (onSuccess) onSuccess(id);
      showToast(editingId ? 'Ingrediente actualizado' : 'Ingrediente guardado correctamente', 'success');
      onClose();
    } catch (error) {
      console.error('Error saving ingredient:', error);
      showToast('Error al guardar el ingrediente', 'error');
    } finally {
      setLoading(false); // Desactivamos el estado de carga, haya ido bien o mal
    }
  };

  // Función auxiliar para marcar/desmarcar alérgenos
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
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
                  className={`w-full px-4 py-2 bg-stone-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.nameES ? 'border-red-500' : 'border-stone-200'}`}
                />
                {errors.nameES && <p className="text-red-500 text-xs mt-1">{errors.nameES.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Proveedor</label>
                <input
                  type="text"
                  list="providers-list-modal"
                  {...register('provider')}
                  placeholder="Busca o escribe un nuevo proveedor..."
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <datalist id="providers-list-modal">
                  {providers.map(p => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-bold text-stone-900 border-b border-stone-200 pb-2">Opcional: Formato de compra</h3>
              <p className="text-xs text-stone-500">Si compras por paquete/caja, introduce aquí los datos para que el sistema calcule el precio base automáticamente.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Formato</label>
                  <input
                    type="text"
                    {...register('purchaseFormat')}
                    placeholder="Ej. Paquete de cilantro"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Precio del formato (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('formatPrice', { 
                      valueAsNumber: true,
                      onChange: (e) => {
                        const newFormatPrice = Number(e.target.value) || 0;
                        // Use getValues() since watch causes problems inside callbacks if not destructured
                        // Actually we didn't extract getValues, but watch() without args might not be what we want,
                        // Wait, I can't use getValues because I didn't extract it from useForm.
                        // I already extracted watch() though, let's see. 
                        const weightPerUnitNum = Number((document.querySelector('input[name="weightPerUnit"]') as HTMLInputElement)?.value) || 0;
                        if (newFormatPrice > 0 && weightPerUnitNum > 0) {
                          setValue('purchasePrice', Number((newFormatPrice / weightPerUnitNum).toFixed(3)), { shouldValidate: true });
                        }
                      }
                    })}
                    onFocus={e => e.target.select()}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    {unit === 'ud' ? 'Unidades por formato' : `Peso del formato (${unit})`}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    {...register('weightPerUnit', { 
                      valueAsNumber: true,
                      onChange: (e) => {
                        const newWeight = Number(e.target.value) || 0;
                        const formatPriceNum = Number((document.querySelector('input[name="formatPrice"]') as HTMLInputElement)?.value) || 0;
                        if (formatPriceNum > 0 && newWeight > 0) {
                          setValue('purchasePrice', Number((formatPriceNum / newWeight).toFixed(3)), { shouldValidate: true });
                        }
                      }
                    })}
                    onFocus={e => e.target.select()}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Unidad *</label>
                <select
                  {...register('unit', { required: 'Selecciona una unidad' })}
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                  onFocus={e => e.target.select()}
                  className={`w-full px-4 py-2 bg-stone-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.purchasePrice ? 'border-red-500' : 'border-stone-200'}`}
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
                  onFocus={e => e.target.select()}
                  className={`w-full px-4 py-2 bg-stone-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.wastePercentage ? 'border-red-500' : 'border-stone-200'}`}
                />
                {errors.wastePercentage && <p className="text-red-500 text-xs mt-1">{errors.wastePercentage.message}</p>}
              </div>
            </div>

            <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 flex items-center gap-3">
              <AlertCircle className="text-teal-600" size={20} />
              <div className="text-sm text-teal-800">
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
                      className="w-4 h-4 text-teal-600 rounded border-stone-300 focus:ring-teal-500"
                    />
                    <span className="text-lg" title={allergen.name}>{allergen.icon}</span>
                    <span className="text-sm text-stone-700">{allergen.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </form>
        </div>
        <div className="p-6 border-t border-stone-200/50 flex justify-end gap-3 rounded-b-2xl bg-stone-50">
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
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            {loading ? 'Guardando...' : 'Guardar Ingrediente'}
          </button>
        </div>
      </div>
    </div>
  );
}
