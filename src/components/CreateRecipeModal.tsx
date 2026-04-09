import React, { useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { calculateRecipeTotalCost } from '../utils/calculations';
import { RecipeIngredient } from '../types';
import CreateIngredientModal from './CreateIngredientModal';

interface CreateRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newRecipeId: string) => void;
}

export default function CreateRecipeModal({ isOpen, onClose, onSuccess }: CreateRecipeModalProps) {
  const { appUser } = useAuth();
  const { showToast } = useToast();
  const { ingredients, recipes } = useData();
  
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nameES: '',
    portions: null as number | null,
    steps: [] as string[],
    equipment: [] as string[],
    sustainabilityTips: [] as string[],
    ingredients: [] as RecipeIngredient[],
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    const id = doc(collection(db, 'recipes')).id;
    const totalCost = calculateRecipeTotalCost(formData.ingredients, ingredients, recipes);

    const recipeData = {
      ...formData,
      portions: formData.portions || null,
      ingredients: formData.ingredients.map(ri => ({ ...ri, quantity: Number(ri.quantity) || 0 })),
      nameEN: '',
      descriptionES: '',
      descriptionEN: '',
      stepsEN: [],
      totalCost,
      createdBy: appUser.group || appUser.name,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'recipes', id), recipeData);
      showToast('Receta creada correctamente', 'success');
      if (onSuccess) onSuccess(id);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `recipes/${id}`);
    }
  };

  const addIngredientToRecipe = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { ingredientId: '', quantity: 0 }]
    });
  };

  const updateRecipeIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const removeRecipeIngredient = (index: number) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredients: newIngredients });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-stone-900">Nueva Receta</h2>
          <div className="text-lg font-bold text-teal-700">
            Total: {calculateRecipeTotalCost(formData.ingredients, ingredients, recipes).toFixed(2)} €
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <form id="create-recipe-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nombre *</label>
                <input
                  type="text" required
                  value={formData.nameES}
                  onChange={e => setFormData({...formData, nameES: e.target.value})}
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Raciones</label>
                <input
                  type="number" min="1" step="1"
                  value={formData.portions || ''}
                  onChange={e => setFormData({...formData, portions: parseInt(e.target.value) || null})}
                  onFocus={e => e.target.select()}
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Elaboración (Pasos)</label>
                <textarea
                  value={formData.steps.join('\n')}
                  onChange={e => setFormData({...formData, steps: e.target.value.split('\n').filter(s => s.trim())})}
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[100px]"
                  placeholder="Un paso por línea..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Material / Equipamiento</label>
                <textarea
                  value={formData.equipment.join('\n')}
                  onChange={e => setFormData({...formData, equipment: e.target.value.split('\n').filter(s => s.trim())})}
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[100px]"
                  placeholder="Un material por línea..."
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-stone-900">Ingredientes</label>
                <button
                  type="button"
                  onClick={() => setIsIngredientModalOpen(true)}
                  className="text-sm text-stone-500 hover:text-teal-600 font-medium flex items-center gap-1 mr-4"
                >
                  <Plus size={16} /> Crear ingrediente
                </button>
                <button
                  type="button"
                  onClick={addIngredientToRecipe}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                >
                  <Plus size={16} /> Añadir a receta
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.ingredients.map((ri, index) => {
                  const selectedIng = ingredients.find(i => i.id === ri.ingredientId);
                  
                  return (
                    <div key={index} className="flex gap-3 items-center bg-stone-50 p-3 rounded-xl border border-stone-200">
                      <div className="flex-1 flex gap-2">
                        <select
                          required
                          value={ri.ingredientId}
                          onChange={e => updateRecipeIngredient(index, 'ingredientId', e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="">Selecciona un ingrediente o receta...</option>
                          <optgroup label="Ingredientes">
                            {ingredients.map(ing => (
                              <option key={ing.id} value={ing.id}>
                                {ing.nameES} ({ing.costPerUnit.toFixed(2)}€/{ing.unit})
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Escandallos / Recetas">
                            {recipes.map(r => (
                              <option key={r.id} value={r.id}>
                                {r.nameES} ({r.totalCost.toFixed(2)}€/ud)
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        {selectedIng && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIngredientId(selectedIng.id);
                              setIsIngredientModalOpen(true);
                            }}
                            className="p-2 text-stone-500 hover:text-teal-600 bg-white border border-stone-200 rounded-lg"
                            title="Editar ingrediente"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                      </div>
                      <div className="w-32">
                        <div className="relative">
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            required
                            value={ri.quantity}
                            onChange={e => updateRecipeIngredient(index, 'quantity', e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="Cant."
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">
                            {selectedIng?.unit || (recipes.find(r => r.id === ri.ingredientId) ? 'ud' : '')}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRecipeIngredient(index)}
                        className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })}
                {formData.ingredients.length === 0 && (
                  <p className="text-sm text-stone-500 italic text-center py-4">
                    No hay ingredientes añadidos.
                  </p>
                )}
              </div>
            </div>
          </form>
        </div>
        <div className="p-6 border-t border-stone-100 flex gap-3 justify-end bg-stone-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-stone-600 hover:bg-stone-200 rounded-xl font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="create-recipe-form"
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors"
          >
            Guardar Receta
          </button>
        </div>
      </div>

      <CreateIngredientModal
        isOpen={isIngredientModalOpen}
        onClose={() => {
          setIsIngredientModalOpen(false);
          setEditingIngredientId(null);
        }}
        editingId={editingIngredientId}
        initialData={editingIngredientId ? ingredients.find(i => i.id === editingIngredientId) : undefined}
        onSuccess={(newId) => {
          if (!editingIngredientId) {
            setFormData(prev => ({
              ...prev,
              ingredients: [...prev.ingredients, { ingredientId: newId, quantity: 0 }]
            }));
          }
        }}
      />
    </div>
  );
}
