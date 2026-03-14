import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Edit2, Search, BookOpen, Printer } from 'lucide-react';
import { Ingredient } from './Ingredients';
import { ALLERGENS } from '../constants/allergens';
import CreateIngredientModal from '../components/CreateIngredientModal';
import html2pdf from 'html2pdf.js';
import { useRef } from 'react';

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
}

export interface Recipe {
  id: string;
  nameES: string;
  nameEN: string; // Kept for backward compatibility
  descriptionES: string; // Kept for backward compatibility
  descriptionEN: string; // Kept for backward compatibility
  steps: string[];
  stepsEN?: string[];
  equipment?: string[];
  sustainabilityTips?: string[];
  ingredients: RecipeIngredient[];
  totalCost: number;
  createdBy: string;
  createdAt: string;
}

export default function Recipes() {
  const { appUser } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [menus, setMenus] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [printingRecipe, setPrintingRecipe] = useState<Recipe | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  
  const [formData, setFormData] = useState({
    nameES: '',
    steps: [] as string[],
    equipment: [] as string[],
    sustainabilityTips: [] as string[],
    ingredients: [] as RecipeIngredient[],
  });

  useEffect(() => {
    const unsubRecipes = onSnapshot(collection(db, 'recipes'), (snapshot) => {
      const data: Recipe[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Recipe));
      setRecipes(data.sort((a, b) => a.nameES.localeCompare(b.nameES)));
    });

    const unsubIngredients = onSnapshot(collection(db, 'ingredients'), (snapshot) => {
      const data: Ingredient[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Ingredient));
      setIngredients(data);
    });

    const unsubMenus = onSnapshot(collection(db, 'menus'), (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      setMenus(data);
    });

    return () => {
      unsubRecipes();
      unsubIngredients();
      unsubMenus();
    };
  }, []);

  const calculateTotalCost = (recipeIngredients: RecipeIngredient[]) => {
    return recipeIngredients.reduce((total, ri) => {
      const ing = ingredients.find(i => i.id === ri.ingredientId);
      if (ing) {
        return total + (ing.costPerUnit * (Number(ri.quantity) || 0));
      }
      const subRecipe = recipes.find(r => r.id === ri.ingredientId);
      if (subRecipe) {
        return total + (subRecipe.totalCost * (Number(ri.quantity) || 0));
      }
      return total;
    }, 0);
  };

  const getRecipeAllergens = (recipeIngredients: RecipeIngredient[]) => {
    const allergenSet = new Set<string>();
    
    const extractAllergens = (items: RecipeIngredient[]) => {
      items.forEach(ri => {
        const ing = ingredients.find(i => i.id === ri.ingredientId);
        if (ing && ing.allergens) {
          ing.allergens.forEach(a => allergenSet.add(a));
        } else {
          const subRecipe = recipes.find(r => r.id === ri.ingredientId);
          if (subRecipe) {
            extractAllergens(subRecipe.ingredients);
          }
        }
      });
    };
    
    extractAllergens(recipeIngredients);
    return Array.from(allergenSet);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    const id = editingId || doc(collection(db, 'recipes')).id;
    const totalCost = calculateTotalCost(formData.ingredients);

    const recipeData = {
      ...formData,
      ingredients: formData.ingredients.map(ri => ({ ...ri, quantity: Number(ri.quantity) || 0 })),
      nameEN: editingId ? recipes.find(r => r.id === editingId)?.nameEN || '' : '',
      descriptionES: editingId ? recipes.find(r => r.id === editingId)?.descriptionES || '' : '',
      descriptionEN: editingId ? recipes.find(r => r.id === editingId)?.descriptionEN || '' : '',
      stepsEN: editingId ? recipes.find(r => r.id === editingId)?.stepsEN || [] : [],
      totalCost,
      createdBy: appUser.group || appUser.name,
      createdAt: editingId ? recipes.find(r => r.id === editingId)?.createdAt : new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'recipes', id), recipeData);
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert('Error al guardar la receta');
    }
  };

  const handleDelete = async (id: string) => {
    const isUsedInMenu = menus.some(menu => 
      menu.recipes?.includes(id)
    );

    if (isUsedInMenu) {
      alert('No se puede eliminar este escandallo porque se está utilizando en uno o más menús.');
      return;
    }

    if (window.confirm('¿Estás seguro de eliminar este escandallo?')) {
      try {
        await deleteDoc(doc(db, 'recipes', id));
      } catch (error) {
        console.error('Error deleting recipe:', error);
        alert('Error al eliminar. Solo el tutor puede eliminar.');
      }
    }
  };

  const openEdit = (recipe: Recipe) => {
    setFormData({
      nameES: recipe.nameES,
      steps: recipe.steps || (recipe.descriptionES ? [recipe.descriptionES] : []),
      equipment: recipe.equipment || [],
      sustainabilityTips: recipe.sustainabilityTips || [],
      ingredients: recipe.ingredients,
    });
    setEditingId(recipe.id);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ nameES: '', steps: [], equipment: [], sustainabilityTips: [], ingredients: [] });
    setEditingId(null);
  };

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, '']
    });
  };

  const updateStep = (index: number, value: string) => {
    const newSteps = [...formData.steps];
    newSteps[index] = value;
    setFormData({ ...formData, steps: newSteps });
  };

  const removeStep = (index: number) => {
    const newSteps = formData.steps.filter((_, i) => i !== index);
    setFormData({ ...formData, steps: newSteps });
  };

  const addEquipment = () => {
    setFormData({ ...formData, equipment: [...formData.equipment, ''] });
  };

  const updateEquipment = (index: number, value: string) => {
    const newEq = [...formData.equipment];
    newEq[index] = value;
    setFormData({ ...formData, equipment: newEq });
  };

  const removeEquipment = (index: number) => {
    const newEq = formData.equipment.filter((_, i) => i !== index);
    setFormData({ ...formData, equipment: newEq });
  };

  const addTip = () => {
    setFormData({ ...formData, sustainabilityTips: [...formData.sustainabilityTips, ''] });
  };

  const updateTip = (index: number, value: string) => {
    const newTips = [...formData.sustainabilityTips];
    newTips[index] = value;
    setFormData({ ...formData, sustainabilityTips: newTips });
  };

  const removeTip = (index: number) => {
    const newTips = formData.sustainabilityTips.filter((_, i) => i !== index);
    setFormData({ ...formData, sustainabilityTips: newTips });
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

  const exportPDF = (recipe: Recipe) => {
    if (isPrinting) return;
    setIsPrinting(true);
    setPrintingRecipe(recipe);
    
    setTimeout(() => {
      if (printRef.current) {
        const opt = {
          margin: 0.5,
          filename: `Receta_${recipe.nameES.replace(/\s+/g, '_')}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'in' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };
        
        html2pdf()
          .set(opt)
          .from(printRef.current)
          .save()
          .then(() => {
            setPrintingRecipe(null);
            setIsPrinting(false);
          })
          .catch((err: any) => {
            console.error('Error generating PDF:', err);
            setPrintingRecipe(null);
            setIsPrinting(false);
            alert('Error al generar el PDF. Por favor, inténtalo de nuevo.');
          });
      } else {
        setIsPrinting(false);
      }
    }, 500);
  };

  const filteredRecipes = recipes.filter(r => 
    r.nameES.toLowerCase().includes(search.toLowerCase()) || 
    r.nameEN?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Escandallos / Recetas</h1>
          <p className="text-stone-500 mt-2">Crea recetas y calcula sus costes automáticamente.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Nueva Receta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map((recipe) => {
          const recipeAllergens = getRecipeAllergens(recipe.ingredients);
          return (
          <div key={recipe.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <BookOpen size={24} />
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => exportPDF(recipe)} 
                    disabled={isPrinting}
                    className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50" 
                    title="Imprimir"
                  >
                    <Printer size={18} />
                  </button>
                  <button onClick={() => openEdit(recipe)} className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Editar">
                    <Edit2 size={18} />
                  </button>
                  {appUser?.role === 'admin' && (
                    <button onClick={() => handleDelete(recipe.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-4">{recipe.nameES}</h3>
              
              {recipeAllergens.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {recipeAllergens.map(a => {
                    const allergen = ALLERGENS.find(al => al.id === a);
                    return allergen ? (
                      <span key={a} title={allergen.name} className="text-lg">{allergen.icon}</span>
                    ) : null;
                  })}
                </div>
              )}

              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Ingredientes:</span>
                  <span className="font-medium text-stone-900">{recipe.ingredients.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Coste Total:</span>
                  <span className="font-bold text-emerald-700">{recipe.totalCost.toFixed(2)} €</span>
                </div>
              </div>
              
              <div className="text-xs text-stone-400 border-t border-stone-100 pt-4">
                Creado por {recipe.createdBy}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-stone-900">
                {editingId ? 'Editar Receta' : 'Nueva Receta'}
              </h2>
              <div className="text-lg font-bold text-emerald-700">
                Total: {calculateTotalCost(formData.ingredients).toFixed(2)} €
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="recipe-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Nombre *</label>
                    <input
                      type="text" required
                      value={formData.nameES}
                      onChange={e => setFormData({...formData, nameES: e.target.value})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-stone-900">Ingredientes (Escandallo)</label>
                    <button
                      type="button"
                      onClick={() => setIsIngredientModalOpen(true)}
                      className="text-sm text-stone-500 hover:text-emerald-600 font-medium flex items-center gap-1 mr-4"
                    >
                      <Plus size={16} /> Crear nuevo ingrediente
                    </button>
                    <button
                      type="button"
                      onClick={addIngredientToRecipe}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                    >
                      <Plus size={16} /> Añadir a la receta
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.ingredients.map((ri, index) => {
                      const selectedIng = ingredients.find(i => i.id === ri.ingredientId);
                      const cost = selectedIng ? (selectedIng.costPerUnit * (Number(ri.quantity) || 0)) : 0;
                      
                      return (
                        <div key={index} className="flex gap-3 items-center bg-stone-50 p-3 rounded-xl border border-stone-200">
                          <div className="flex-1">
                            <select
                              required
                              value={ri.ingredientId}
                              onChange={e => updateRecipeIngredient(index, 'ingredientId', e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                                {recipes.filter(r => r.id !== editingId).map(r => (
                                  <option key={r.id} value={r.id}>
                                    {r.nameES} ({r.totalCost.toFixed(2)}€/ud)
                                  </option>
                                ))}
                              </optgroup>
                            </select>
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
                                className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Cant."
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">
                                {selectedIng?.unit || (recipes.find(r => r.id === ri.ingredientId) ? 'ud' : '')}
                              </span>
                            </div>
                          </div>
                          <div className="w-24 text-right font-medium text-stone-700">
                            {cost.toFixed(2)} €
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
                      <div className="text-center py-6 text-stone-500 text-sm border-2 border-dashed border-stone-200 rounded-xl">
                        No hay ingredientes añadidos.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-stone-900">Pasos de Elaboración</label>
                    <button
                      type="button"
                      onClick={addStep}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                    >
                      <Plus size={16} /> Añadir paso
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.steps.map((step, index) => (
                      <div key={index} className="flex gap-3 items-start bg-stone-50 p-3 rounded-xl border border-stone-200">
                        <div className="pt-2 font-bold text-stone-400 w-6 text-center">{index + 1}.</div>
                        <textarea
                          required
                          rows={2}
                          value={step}
                          onChange={e => updateStep(index, e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="Describe este paso de la elaboración..."
                        />
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    {formData.steps.length === 0 && (
                      <div className="text-center py-6 text-stone-500 text-sm border-2 border-dashed border-stone-200 rounded-xl">
                        No hay pasos añadidos.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-stone-900">Material y Equipamiento</label>
                    <button
                      type="button"
                      onClick={addEquipment}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                    >
                      <Plus size={16} /> Añadir material
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.equipment.map((eq, index) => (
                      <div key={index} className="flex gap-3 items-start bg-stone-50 p-3 rounded-xl border border-stone-200">
                        <div className="pt-2 font-bold text-stone-400 w-6 text-center">•</div>
                        <input
                          type="text"
                          required
                          value={eq}
                          onChange={e => updateEquipment(index, e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="Ej: 1 sartén, 1 batidora..."
                        />
                        <button
                          type="button"
                          onClick={() => removeEquipment(index)}
                          className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    {formData.equipment.length === 0 && (
                      <div className="text-center py-6 text-stone-500 text-sm border-2 border-dashed border-stone-200 rounded-xl">
                        No hay material añadido.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-stone-900">Tips de Sostenibilidad</label>
                    <button
                      type="button"
                      onClick={addTip}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                    >
                      <Plus size={16} /> Añadir tip
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.sustainabilityTips.map((tip, index) => (
                      <div key={index} className="flex gap-3 items-start bg-stone-50 p-3 rounded-xl border border-stone-200">
                        <div className="pt-2 font-bold text-stone-400 w-6 text-center">🌱</div>
                        <textarea
                          required
                          rows={2}
                          value={tip}
                          onChange={e => updateTip(index, e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="Ej: Encender los hornos solo 5 minutos antes..."
                        />
                        <button
                          type="button"
                          onClick={() => removeTip(index)}
                          className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    {formData.sustainabilityTips.length === 0 && (
                      <div className="text-center py-6 text-stone-500 text-sm border-2 border-dashed border-stone-200 rounded-xl">
                        No hay tips de sostenibilidad añadidos.
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-stone-100 flex justify-end gap-3 bg-stone-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-stone-600 hover:bg-stone-200 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="recipe-form"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
              >
                Guardar Receta
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateIngredientModal
        isOpen={isIngredientModalOpen}
        onClose={() => setIsIngredientModalOpen(false)}
        onSuccess={(newId) => {
          setFormData(prev => ({
            ...prev,
            ingredients: [...prev.ingredients, { ingredientId: newId, quantity: 0 }]
          }));
        }}
      />

      {/* Hidden Print Layout */}
      {printingRecipe && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={printRef} className="p-10 bg-white text-stone-900 font-sans" style={{ width: '800px' }}>
            <div className="border-b-2 border-stone-900 pb-6 mb-8">
              <h1 className="text-4xl font-bold mb-2 uppercase tracking-tight">{printingRecipe.nameES}</h1>
              {printingRecipe.nameEN && <h2 className="text-2xl text-stone-500 italic mb-4">{printingRecipe.nameEN}</h2>}
              <div className="flex justify-between items-end">
                <div className="text-sm text-stone-500">
                  <strong>Coste total:</strong> {printingRecipe.totalCost.toFixed(2)} €
                </div>
                <div className="text-sm text-stone-500">
                  <strong>Creado por:</strong> {printingRecipe.createdBy}
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4 uppercase tracking-wider text-stone-800 border-b border-stone-200 pb-2">Escandallo Detallado</h3>
              <table className="w-full text-sm text-left mb-6">
                <thead className="bg-stone-50 text-stone-600 uppercase text-xs border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-2">Ingrediente</th>
                    <th className="px-4 py-2 text-right">Cantidad</th>
                    <th className="px-4 py-2 text-right">Coste Real/Ud</th>
                    <th className="px-4 py-2 text-right">Coste Total</th>
                  </tr>
                </thead>
                <tbody>
                  {printingRecipe.ingredients.map((ri, idx) => {
                    const ing = ingredients.find(i => i.id === ri.ingredientId);
                    const subRecipe = recipes.find(r => r.id === ri.ingredientId);
                    const name = ing ? ing.nameES : (subRecipe ? subRecipe.nameES : 'Desconocido');
                    const unit = ing ? ing.unit : 'ud';
                    
                    let realCostPerUnit = 0;
                    if (ing) {
                      realCostPerUnit = ing.price / (1 - (ing.wastePercentage / 100));
                    } else if (subRecipe) {
                      realCostPerUnit = subRecipe.totalCost;
                    }
                    
                    const itemTotalCost = realCostPerUnit * ri.quantity;

                    return (
                      <tr key={idx} className="border-b border-stone-100">
                        <td className="px-4 py-2 font-medium">{name}</td>
                        <td className="px-4 py-2 text-right">{ri.quantity} {unit}</td>
                        <td className="px-4 py-2 text-right">{realCostPerUnit.toFixed(2)} €</td>
                        <td className="px-4 py-2 text-right font-medium">{itemTotalCost.toFixed(2)} €</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-50 font-bold text-stone-900">
                    <td colSpan={3} className="px-4 py-3 text-right">Coste Total de la Receta:</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{printingRecipe.totalCost.toFixed(2)} €</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4 uppercase tracking-wider text-stone-800 border-b border-stone-200 pb-2">Elaboración</h3>
                {printingRecipe.steps && printingRecipe.steps.length > 0 ? (
                  <ol className="space-y-4 list-decimal pl-5 mb-8">
                    {printingRecipe.steps.map((step, idx) => (
                      <li key={idx} className="text-stone-800 leading-relaxed pl-2">{step}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-stone-500 italic mb-8">No hay pasos de elaboración definidos.</p>
                )}

                {printingRecipe.equipment && printingRecipe.equipment.length > 0 && (
                  <>
                    <h3 className="text-xl font-bold mb-4 uppercase tracking-wider text-stone-800 border-b border-stone-200 pb-2">Material y Equipamiento</h3>
                    <ul className="space-y-2 list-disc pl-5 mb-8">
                      {printingRecipe.equipment.map((eq, idx) => (
                        <li key={idx} className="text-stone-800 leading-relaxed pl-2">{eq}</li>
                      ))}
                    </ul>
                  </>
                )}

                {printingRecipe.sustainabilityTips && printingRecipe.sustainabilityTips.length > 0 && (
                  <>
                    <h3 className="text-xl font-bold mb-4 uppercase tracking-wider text-emerald-800 border-b border-emerald-200 pb-2 flex items-center gap-2">
                      <span>🌱</span> Tips de Sostenibilidad
                    </h3>
                    <ul className="space-y-2 list-none pl-1">
                      {printingRecipe.sustainabilityTips.map((tip, idx) => (
                        <li key={idx} className="text-stone-800 leading-relaxed flex gap-2">
                          <span className="text-emerald-600 font-bold">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
