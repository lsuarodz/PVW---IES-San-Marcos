import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Menu } from './Menus';
import { Recipe } from './Recipes';
import { Ingredient } from './Ingredients';
import { ALLERGENS } from '../constants/allergens';
import { FileText, Download, Search } from 'lucide-react';
import html2pdf from 'html2pdf.js';

export default function Minutas() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState('');
  
  const printRef = useRef<HTMLDivElement>(null);
  const [printingMenu, setPrintingMenu] = useState<{ menu: Menu, language: 'ES' | 'EN' } | null>(null);

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

  const getRecipeAllergens = (recipeId: string) => {
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
    
    extractAllergens(recipeId);
    return Array.from(allergenSet);
  };

  const getMenuAllergens = (recipeIds: string[]) => {
    const allergenSet = new Set<string>();
    recipeIds.forEach(id => {
      const allergens = getRecipeAllergens(id);
      allergens.forEach(a => allergenSet.add(a));
    });
    return Array.from(allergenSet);
  };

  const exportPDF = (menu: Menu, language: 'ES' | 'EN' = 'ES') => {
    setPrintingMenu({ menu, language });
    setTimeout(() => {
      if (printRef.current) {
        const langSuffix = language === 'EN' ? '_EN' : '';
        const opt = {
          margin: 1,
          filename: `Minuta_${menu.nameES.replace(/\s+/g, '_')}${langSuffix}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const }
        };
        html2pdf().set(opt).from(printRef.current).save().then(() => {
          setPrintingMenu(null);
        });
      }
    }, 100);
  };

  const filteredMenus = menus.filter(m => 
    m.nameES.toLowerCase().includes(search.toLowerCase()) || 
    m.nameEN?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Minutas</h1>
          <p className="text-stone-500 mt-2">Genera minutas para clientes con información de alérgenos.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-4 mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
          <input
            type="text"
            placeholder="Buscar menús..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-stone-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-shadow"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredMenus.map((menu) => {
          const menuAllergens = getMenuAllergens(menu.recipes);
          return (
          <div key={menu.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <FileText size={24} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => exportPDF(menu, 'ES')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-stone-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Exportar Minuta PDF (Español)">
                    <Download size={16} />
                    ES
                  </button>
                  {menu.nameEN && (
                    <button onClick={() => exportPDF(menu, 'EN')} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-stone-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Exportar Minuta PDF (Inglés)">
                      <Download size={16} />
                      EN
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-xl font-bold text-stone-900">{menu.nameES}</h3>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                  menu.type === 'brunch' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {menu.type.toUpperCase()}
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
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Recetas incluidas:</span>
                  <span className="font-medium text-stone-900">{menu.recipes.length}</span>
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Hidden PDF Template for Minuta */}
      {printingMenu && (
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <div ref={printRef} className="p-10 bg-white text-stone-900 font-serif w-[800px]">
            <div className="text-center mb-12 border-b-2 border-stone-200 pb-8">
              <h1 className="text-4xl font-bold mb-2 uppercase tracking-widest">
                {printingMenu.language === 'EN' && printingMenu.menu.nameEN ? printingMenu.menu.nameEN : printingMenu.menu.nameES}
              </h1>
              {printingMenu.language === 'ES' && printingMenu.menu.nameEN && <h2 className="text-xl text-stone-500 italic">{printingMenu.menu.nameEN}</h2>}
              <div className="mt-4 text-sm tracking-widest uppercase text-stone-400">
                {printingMenu.menu.type === 'brunch' ? (printingMenu.language === 'EN' ? 'Brunch Menu' : 'Menú Brunch') : 
                 printingMenu.menu.type === 'cocktail' ? (printingMenu.language === 'EN' ? 'Cocktail Menu' : 'Menú Cóctel') :
                 printingMenu.menu.type === 'navidad' ? (printingMenu.language === 'EN' ? 'Charity Christmas Menu' : 'Menú Navidad Solidario') :
                 printingMenu.menu.type === 'coffee' ? 'Coffee Break' :
                 printingMenu.menu.type === 'cafeteria' ? (printingMenu.language === 'EN' ? 'Cafeteria' : 'Cafetería') :
                 (printingMenu.language === 'EN' ? 'Pedagogical Menu' : 'Menú Pedagógico')}
              </div>
            </div>

            <div className="space-y-8 mb-12">
              {printingMenu.menu.recipes.map(recipeId => {
                const recipe = recipes.find(r => r.id === recipeId);
                if (!recipe) return null;
                const recipeAllergens = getRecipeAllergens(recipe.id);
                
                const showEN = printingMenu.language === 'EN';
                const displayName = showEN && recipe.nameEN ? recipe.nameEN : recipe.nameES;
                const displayDesc = showEN && recipe.descriptionEN ? recipe.descriptionEN : recipe.descriptionES;
                const displaySteps = showEN && recipe.stepsEN && recipe.stepsEN.length > 0 ? recipe.stepsEN : recipe.steps;

                return (
                  <div key={recipe.id} className="text-center">
                    <h3 className="text-xl font-bold mb-1">{displayName}</h3>
                    {displaySteps && displaySteps.length > 0 ? (
                      <div className="text-sm text-stone-600 max-w-md mx-auto mb-2 text-left space-y-1">
                        {displaySteps.map((step, i) => (
                          <p key={i}><span className="font-bold mr-1">{i + 1}.</span> {step}</p>
                        ))}
                      </div>
                    ) : (
                      displayDesc && <p className="text-sm text-stone-600 max-w-md mx-auto mb-2">{displayDesc}</p>
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
            
            <div className="mt-16 pt-8 border-t border-stone-200">
              <h4 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-4 text-center">
                {printingMenu.language === 'EN' ? 'Allergens Legend' : 'Leyenda de Alérgenos'}
              </h4>
              <div className="flex flex-wrap justify-center gap-4">
                {ALLERGENS.map(allergen => (
                  <div key={allergen.id} className="flex items-center gap-2 text-xs text-stone-600">
                    <span className="text-lg">{allergen.icon}</span>
                    <span>{printingMenu.language === 'EN' && allergen.nameEN ? allergen.nameEN : allergen.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
