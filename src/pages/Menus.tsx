import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Edit2, Search, Utensils, Download } from 'lucide-react';
import { Recipe } from './Recipes';
import { Ingredient } from './Ingredients';
import { ALLERGENS } from '../constants/allergens';
import html2pdf from 'html2pdf.js';

export interface Menu {
  id: string;
  nameES: string;
  nameEN: string;
  type: 'brunch' | 'cocktail' | 'navidad' | 'coffee' | 'cafeteria' | 'pedagogico';
  recipes: string[]; // array of recipe IDs
  totalCost: number;
  price: number;
  createdBy: string;
  createdAt: string;
}

export default function Menus() {
  const { appUser } = useAuth();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nameES: '',
    type: 'brunch' as Menu['type'],
    recipes: [] as string[],
    price: 0,
  });

  const printRef = useRef<HTMLDivElement>(null);
  const [printingMenu, setPrintingMenu] = useState<Menu | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const unsubMenus = onSnapshot(collection(db, 'menus'), (snapshot) => {
      const data: Menu[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Menu));
      setMenus(data.sort((a, b) => a.nameES.localeCompare(b.nameES)));
    });

    const unsubRecipes = onSnapshot(collection(db, 'recipes'), (snapshot) => {
      const data: Recipe[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Recipe));
      setRecipes(data);
    });

    const unsubIngredients = onSnapshot(collection(db, 'ingredients'), (snapshot) => {
      const data: Ingredient[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Ingredient));
      setIngredients(data);
    });

    return () => {
      unsubMenus();
      unsubRecipes();
      unsubIngredients();
    };
  }, []);

  const calculateTotalCost = (recipeIds: string[]) => {
    return recipeIds.reduce((total, id) => {
      const recipe = recipes.find(r => r.id === id);
      return total + (recipe ? recipe.totalCost : 0);
    }, 0);
  };

  const getMenuAllergens = (recipeIds: string[]) => {
    const allergenSet = new Set<string>();
    
    const extractAllergens = (rId: string) => {
      const recipe = recipes.find(r => r.id === rId);
      if (recipe) {
        recipe.ingredients.forEach(ri => {
          const ing = ingredients.find(i => i.id === ri.ingredientId);
          if (ing && ing.allergens) {
            ing.allergens.forEach(a => allergenSet.add(a));
          } else {
            const subRecipe = recipes.find(r => r.id === ri.ingredientId);
            if (subRecipe) {
              extractAllergens(subRecipe.id);
            }
          }
        });
      }
    };

    recipeIds.forEach(id => {
      extractAllergens(id);
    });
    return Array.from(allergenSet);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    const id = editingId || doc(collection(db, 'menus')).id;
    const totalCost = calculateTotalCost(formData.recipes);

    const menuData = {
      ...formData,
      nameEN: editingId ? menus.find(m => m.id === editingId)?.nameEN || '' : '',
      totalCost,
      createdBy: appUser.group || appUser.name,
      createdAt: editingId ? menus.find(m => m.id === editingId)?.createdAt : new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'menus', id), menuData);
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving menu:', error);
      alert('Error al guardar el menú');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este menú?')) {
      try {
        await deleteDoc(doc(db, 'menus', id));
      } catch (error) {
        console.error('Error deleting menu:', error);
        alert('Error al eliminar. Solo el tutor puede eliminar.');
      }
    }
  };

  const openEdit = (menu: Menu) => {
    setFormData({
      nameES: menu.nameES,
      type: menu.type,
      recipes: menu.recipes,
      price: menu.price,
    });
    setEditingId(menu.id);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ nameES: '', type: 'brunch', recipes: [], price: 0 });
    setEditingId(null);
  };

  const toggleRecipe = (recipeId: string) => {
    setFormData(prev => ({
      ...prev,
      recipes: prev.recipes.includes(recipeId)
        ? prev.recipes.filter(id => id !== recipeId)
        : [...prev.recipes, recipeId]
    }));
  };

  const exportPDF = (menu: Menu) => {
    if (isPrinting) return;
    setIsPrinting(true);
    setPrintingMenu(menu);
    
    setTimeout(() => {
      if (printRef.current) {
        const opt = {
          margin: 1,
          filename: `Menu_${menu.nameES.replace(/\s+/g, '_')}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const }
        };
        
        html2pdf()
          .set(opt)
          .from(printRef.current)
          .save()
          .then(() => {
            setPrintingMenu(null);
            setIsPrinting(false);
          })
          .catch((err: any) => {
            console.error('Error generating PDF:', err);
            setPrintingMenu(null);
            setIsPrinting(false);
            alert('Error al generar el PDF. Por favor, inténtalo de nuevo.');
          });
      } else {
        setIsPrinting(false);
      }
    }, 500);
  };

  const filteredMenus = menus.filter(m => 
    m.nameES.toLowerCase().includes(search.toLowerCase()) || 
    m.nameEN?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Menús</h1>
          <p className="text-stone-500 mt-2">Agrupa recetas para crear ofertas estandarizadas.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Nuevo Menú
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredMenus.map((menu) => {
          const menuAllergens = getMenuAllergens(menu.recipes);
          return (
          <div key={menu.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <Utensils size={24} />
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => exportPDF(menu)} 
                    disabled={isPrinting}
                    className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50" 
                    title="Exportar PDF"
                  >
                    <Download size={18} />
                  </button>
                  <button onClick={() => openEdit(menu)} className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                    <Edit2 size={18} />
                  </button>
                  {appUser?.role === 'admin' && (
                    <button onClick={() => handleDelete(menu.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-xl font-bold text-stone-900">{menu.nameES}</h3>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                  menu.type === 'brunch' ? 'bg-orange-100 text-orange-700' : 
                  menu.type === 'cocktail' ? 'bg-indigo-100 text-indigo-700' :
                  menu.type === 'navidad' ? 'bg-red-100 text-red-700' :
                  menu.type === 'coffee' ? 'bg-amber-100 text-amber-800' :
                  menu.type === 'cafeteria' ? 'bg-blue-100 text-blue-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {menu.type === 'navidad' ? 'NAVIDAD SOLIDARIO' :
                   menu.type === 'coffee' ? 'COFFEE BREAK' :
                   menu.type === 'cafeteria' ? 'CAFETERÍA' :
                   menu.type === 'pedagogico' ? 'PEDAGÓGICO' :
                   menu.type.toUpperCase()}
                </span>
              </div>
              
              {menuAllergens.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {menuAllergens.map(a => {
                    const allergen = ALLERGENS.find(al => al.id === a);
                    return allergen ? (
                      <span key={a} title={allergen.name} className="text-lg">{allergen.icon}</span>
                    ) : null;
                  })}
                </div>
              )}

              <div className="space-y-3 mb-6">
                <div className="text-sm">
                  <span className="text-stone-500 block mb-2">Recetas incluidas:</span>
                  <ul className="list-disc pl-5 space-y-1">
                    {menu.recipes.map(recipeId => {
                      const recipe = recipes.find(r => r.id === recipeId);
                      return recipe ? (
                        <li key={recipeId} className="text-stone-900 font-medium">
                          {recipe.nameES}
                        </li>
                      ) : null;
                    })}
                    {menu.recipes.length === 0 && (
                      <li className="text-stone-400 italic list-none -ml-5">Ninguna receta incluida</li>
                    )}
                  </ul>
                </div>
                <div className="flex justify-between text-sm pt-3 border-t border-stone-100">
                  <span className="text-stone-500">Coste Total (Escandallos):</span>
                  <span className="font-medium text-stone-900">{menu.totalCost.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm pt-3 border-t border-stone-100">
                  <span className="text-stone-700 font-medium">Precio de Venta:</span>
                  <span className="font-bold text-emerald-700 text-lg">{menu.price.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Margen Bruto:</span>
                  <span className={`font-medium ${menu.price > menu.totalCost ? 'text-emerald-600' : 'text-red-500'}`}>
                    {menu.price > 0 ? (((menu.price - menu.totalCost) / menu.price) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
              
              <div className="text-xs text-stone-400 border-t border-stone-100 pt-4">
                Creado por {menu.createdBy}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Hidden PDF Template */}
      {printingMenu && (
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <div ref={printRef} className="p-10 bg-white text-stone-900 font-serif w-[800px]">
            <div className="text-center mb-12 border-b-2 border-stone-200 pb-8">
              <h1 className="text-4xl font-bold mb-2 uppercase tracking-widest">{printingMenu.nameES}</h1>
              {printingMenu.nameEN && <h2 className="text-xl text-stone-500 italic">{printingMenu.nameEN}</h2>}
              <div className="mt-4 text-sm tracking-widest uppercase text-stone-400">
                {printingMenu.type === 'brunch' ? 'Menú Brunch' : 
                 printingMenu.type === 'cocktail' ? 'Menú Cóctel' :
                 printingMenu.type === 'navidad' ? 'Menú Navidad Solidario' :
                 printingMenu.type === 'coffee' ? 'Coffee Break' :
                 printingMenu.type === 'cafeteria' ? 'Cafetería' :
                 'Menú Pedagógico'}
              </div>
            </div>

            <div className="space-y-8 mb-12">
              {printingMenu.recipes.map(recipeId => {
                const recipe = recipes.find(r => r.id === recipeId);
                if (!recipe) return null;
                const recipeAllergens = getMenuAllergens([recipe.id]);
                return (
                  <div key={recipe.id} className="text-center">
                    <h3 className="text-xl font-bold mb-1">{recipe.nameES}</h3>
                    {recipe.steps && recipe.steps.length > 0 ? (
                      <div className="text-sm text-stone-600 max-w-md mx-auto mb-2 text-left space-y-1">
                        {recipe.steps.map((step, i) => (
                          <p key={i}><span className="font-bold mr-1">{i + 1}.</span> {step}</p>
                        ))}
                      </div>
                    ) : (
                      recipe.descriptionES && <p className="text-sm text-stone-600 max-w-md mx-auto mb-2">{recipe.descriptionES}</p>
                    )}
                    {recipeAllergens.length > 0 && (
                      <div className="flex justify-center gap-1 mt-2">
                        {recipeAllergens.map(a => {
                          const allergen = ALLERGENS.find(al => al.id === a);
                          return allergen ? (
                            <span key={a} title={allergen.name} className="text-sm">{allergen.icon}</span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="text-center pt-8 border-t-2 border-stone-200">
              <div className="text-2xl font-bold">{printingMenu.price.toFixed(2)} €</div>
              <div className="text-xs text-stone-400 mt-2 uppercase tracking-widest">IVA Incluido</div>
            </div>

            <div className="mt-16 pt-8 border-t border-stone-200">
              <h4 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-4 text-center">Leyenda de Alérgenos</h4>
              <div className="flex flex-wrap justify-center gap-4">
                {ALLERGENS.map(allergen => (
                  <div key={allergen.id} className="flex items-center gap-2 text-xs text-stone-600">
                    <span className="text-lg">{allergen.icon}</span>
                    <span>{allergen.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-stone-900">
                {editingId ? 'Editar Menú' : 'Nuevo Menú'}
              </h2>
              <div className="text-lg font-bold text-emerald-700">
                Coste: {calculateTotalCost(formData.recipes).toFixed(2)} €
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="menu-form" onSubmit={handleSubmit} className="space-y-6">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Tipo de Menú *</label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value as any})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="brunch">Brunch</option>
                      <option value="cocktail">Cóctel</option>
                      <option value="navidad">Menú Navidad Solidario</option>
                      <option value="coffee">Coffee Break</option>
                      <option value="cafeteria">Cafetería</option>
                      <option value="pedagogico">Menú Pedagógico</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Precio de Venta (€) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-900 mb-3">Recetas / Elaboraciones</label>
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 max-h-64 overflow-y-auto">
                    {recipes.length === 0 ? (
                      <p className="text-sm text-stone-500 text-center py-4">No hay recetas disponibles. Crea una primero.</p>
                    ) : (
                      <div className="space-y-2">
                        {recipes.map(recipe => (
                          <label key={recipe.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.recipes.includes(recipe.id)}
                              onChange={() => toggleRecipe(recipe.id)}
                              className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-stone-900">{recipe.nameES}</div>
                              <div className="text-xs text-stone-500">{recipe.totalCost.toFixed(2)} € coste</div>
                            </div>
                          </label>
                        ))}
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
                form="menu-form"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
              >
                Guardar Menú
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
