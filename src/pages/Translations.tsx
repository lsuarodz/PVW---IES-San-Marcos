import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Languages, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Menu, Recipe } from '../types';

export default function Translations() {
  // Obtenemos menús y recetas desde el contexto global
  const { menus, recipes, loading } = useData();
  const { showToast } = useToast();
  
  // Estado para indicar qué menú se está guardando actualmente
  const [savingId, setSavingId] = useState<string | null>(null);
  
  // Estado para controlar qué menú está desplegado en la interfaz
  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);

  // Estados para mantener las ediciones de traducción antes de guardarlas en la base de datos
  // Esto evita guardar en cada pulsación de tecla
  const [menuEdits, setMenuEdits] = useState<{ [id: string]: string }>({});
  const [recipeEdits, setRecipeEdits] = useState<{ [id: string]: { nameEN: string, stepsEN: string[] } }>({});

  // Función para abrir/cerrar un menú e inicializar sus estados de edición
  const toggleMenu = (menu: Menu) => {
    // Si ya está abierto, lo cerramos
    if (expandedMenuId === menu.id) {
      setExpandedMenuId(null);
      return;
    }
    
    // Lo abrimos
    setExpandedMenuId(menu.id);
    
    // Inicializamos el estado de edición para el nombre del menú
    setMenuEdits(prev => ({
      ...prev,
      [menu.id]: prev[menu.id] !== undefined ? prev[menu.id] : (menu.nameEN || '')
    }));

    // Inicializamos los estados de edición para las recetas de este menú
    const newRecipeEdits = { ...recipeEdits };
    menu.recipes.forEach(recipeId => {
      const recipe = recipes.find(r => r.id === recipeId);
      if (recipe && !newRecipeEdits[recipe.id]) {
        newRecipeEdits[recipe.id] = {
          nameEN: recipe.nameEN || '',
          // Si no hay pasos en inglés, creamos un array vacío del mismo tamaño que los pasos en español
          stepsEN: recipe.stepsEN || Array(recipe.steps?.length || 0).fill('')
        };
      }
    });
    setRecipeEdits(newRecipeEdits);
  };

  // Manejador para cambios en el nombre del menú en inglés
  const handleMenuNameChange = (menuId: string, value: string) => {
    setMenuEdits(prev => ({ ...prev, [menuId]: value }));
  };

  // Manejador para cambios en el nombre de la receta en inglés
  const handleRecipeNameChange = (recipeId: string, value: string) => {
    setRecipeEdits(prev => ({
      ...prev,
      [recipeId]: { ...prev[recipeId], nameEN: value }
    }));
  };

  // Manejador para cambios en un paso específico de la receta en inglés
  const handleRecipeStepChange = (recipeId: string, stepIndex: number, value: string) => {
    setRecipeEdits(prev => {
      const current = prev[recipeId];
      const newSteps = [...current.stepsEN];
      newSteps[stepIndex] = value;
      return {
        ...prev,
        [recipeId]: { ...current, stepsEN: newSteps }
      };
    });
  };

  // Función para guardar las traducciones del menú y sus recetas en Firestore
  const handleSaveMenuTranslation = async (menu: Menu) => {
    setSavingId(menu.id);
    try {
      // Save Menu nameEN
      const menuNameEN = menuEdits[menu.id];
      if (menuNameEN !== undefined && menuNameEN !== menu.nameEN) {
        await updateDoc(doc(db, 'menus', menu.id), { nameEN: menuNameEN });
      }

      // Save Recipes nameEN and stepsEN
      for (const recipeId of menu.recipes) {
        const recipe = recipes.find(r => r.id === recipeId);
        const edits = recipeEdits[recipeId];
        if (recipe && edits) {
          const updates: any = {};
          if (edits.nameEN !== recipe.nameEN) updates.nameEN = edits.nameEN;
          
          // Check if steps changed
          const stepsChanged = edits.stepsEN.some((step, i) => step !== (recipe.stepsEN?.[i] || '')) || 
                               (recipe.stepsEN && edits.stepsEN.length !== recipe.stepsEN.length);
          
          if (stepsChanged) updates.stepsEN = edits.stepsEN;

          if (Object.keys(updates).length > 0) {
            await updateDoc(doc(db, 'recipes', recipeId), updates);
          }
        }
      }
      
      // Show success feedback
      setTimeout(() => setSavingId(null), 500);
      showToast('Traducciones guardadas correctamente', 'success');
    } catch (error) {
      console.error('Error saving translations:', error);
      showToast('Error al guardar las traducciones', 'error');
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
          <Languages size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Traducciones de Menús</h1>
          <p className="text-stone-500 mt-1">Traduce los menús y sus recetas para generar minutas en inglés.</p>
        </div>
      </div>

      <div className="space-y-4">
        {menus.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-500">
            No hay menús creados todavía.
          </div>
        ) : (
          menus.map(menu => {
            const isExpanded = expandedMenuId === menu.id;
            const isSaving = savingId === menu.id;
            
            // Calculate translation progress
            let totalFields = 1; // Menu name
            let translatedFields = menu.nameEN ? 1 : 0;
            
            menu.recipes.forEach(recipeId => {
              const recipe = recipes.find(r => r.id === recipeId);
              if (recipe) {
                totalFields += 1; // Recipe name
                if (recipe.nameEN) translatedFields += 1;
                
                if (recipe.steps) {
                  totalFields += recipe.steps.length;
                  translatedFields += (recipe.stepsEN?.filter(s => s.trim() !== '').length || 0);
                }
              }
            });
            
            const progress = Math.round((translatedFields / totalFields) * 100) || 0;

            return (
              <div key={menu.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden transition-all">
                <div 
                  className="p-6 flex items-center justify-between cursor-pointer hover:bg-stone-50 transition-colors"
                  onClick={() => toggleMenu(menu)}
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-stone-900">{menu.nameES}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-stone-500">{menu.recipes.length} recetas</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${progress === 100 ? 'bg-amber-500' : 'bg-blue-500'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-stone-500">{progress}% traducido</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-stone-400">
                    {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 border-t border-stone-100 bg-stone-50/50 space-y-8">
                    {/* Menu Name Translation */}
                    <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
                      <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">Nombre del Menú</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-stone-500 mb-1">Español</label>
                          <div className="p-3 bg-stone-50 rounded-lg border border-stone-100 text-stone-700 text-sm">
                            {menu.nameES}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-600 mb-1">Inglés (Traducción)</label>
                          <input
                            type="text"
                            value={menuEdits[menu.id] !== undefined ? menuEdits[menu.id] : (menu.nameEN || '')}
                            onChange={(e) => handleMenuNameChange(menu.id, e.target.value)}
                            placeholder="Translation..."
                            className="w-full p-3 bg-white rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Recipes Translation */}
                    <div className="space-y-6">
                      <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Recetas del Menú</h4>
                      
                      {menu.recipes.map(recipeId => {
                        const recipe = recipes.find(r => r.id === recipeId);
                        if (!recipe) return null;
                        
                        const rEdits = recipeEdits[recipe.id] || { nameEN: '', stepsEN: [] };

                        return (
                          <div key={recipe.id} className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm space-y-6">
                            {/* Recipe Name */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1">Receta (ES)</label>
                                <div className="p-3 bg-stone-50 rounded-lg border border-stone-100 text-stone-900 font-medium text-sm">
                                  {recipe.nameES}
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-blue-600 mb-1">Receta (EN)</label>
                                <input
                                  type="text"
                                  value={rEdits.nameEN}
                                  onChange={(e) => handleRecipeNameChange(recipe.id, e.target.value)}
                                  placeholder="Recipe name translation..."
                                  className="w-full p-3 bg-white rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm transition-all"
                                />
                              </div>
                            </div>

                            {/* Recipe Steps */}
                            {recipe.steps && recipe.steps.length > 0 && (
                              <div className="space-y-3 pt-4 border-t border-stone-100">
                                <label className="block text-xs font-medium text-stone-500">Pasos de Elaboración</label>
                                {recipe.steps.map((step, index) => (
                                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                    <div className="flex gap-3">
                                      <span className="text-xs font-bold text-stone-400 mt-2">{index + 1}.</span>
                                      <div className="flex-1 p-3 bg-stone-50 rounded-lg border border-stone-100 text-stone-700 text-sm">
                                        {step}
                                      </div>
                                    </div>
                                    <div className="flex gap-3">
                                      <span className="text-xs font-bold text-blue-300 mt-2">{index + 1}.</span>
                                      <textarea
                                        rows={2}
                                        value={rEdits.stepsEN[index] || ''}
                                        onChange={(e) => handleRecipeStepChange(recipe.id, index, e.target.value)}
                                        placeholder="Step translation..."
                                        className="flex-1 p-3 bg-white rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm transition-all resize-y"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        onClick={() => handleSaveMenuTranslation(menu)}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                      >
                        {isSaving ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Save size={20} />
                        )}
                        {isSaving ? 'Guardando...' : 'Guardar Traducciones'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
