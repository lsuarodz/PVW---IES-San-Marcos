import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Recipe } from './Recipes';
import { Ingredient } from './Ingredients';
import { Search, ShoppingCart, Plus, Trash2, Calculator } from 'lucide-react';

interface OrderItem {
  recipeId: string;
  quantity: number;
}

interface AggregatedIngredient {
  ingredientId: string;
  name: string;
  totalQuantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

export default function Orders() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState('');
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

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

    return () => {
      unsubRecipes();
      unsubIngredients();
    };
  }, []);

  const addOrderItem = (recipeId: string) => {
    if (!orderItems.find(item => item.recipeId === recipeId)) {
      setOrderItems([...orderItems, { recipeId, quantity: 1 }]);
    }
  };

  const updateOrderItemQuantity = (recipeId: string, quantity: number) => {
    setOrderItems(orderItems.map(item => 
      item.recipeId === recipeId ? { ...item, quantity: Math.max(0, quantity) } : item
    ));
  };

  const removeOrderItem = (recipeId: string) => {
    setOrderItems(orderItems.filter(item => item.recipeId !== recipeId));
  };

  const getAggregatedIngredients = (): AggregatedIngredient[] => {
    const aggregation: Record<string, AggregatedIngredient> = {};

    const processRecipe = (recipeId: string, multiplier: number) => {
      const recipe = recipes.find(r => r.id === recipeId);
      if (recipe) {
        recipe.ingredients.forEach(ri => {
          const ing = ingredients.find(i => i.id === ri.ingredientId);
          if (ing) {
            const requiredQty = ri.quantity * multiplier;
            if (aggregation[ing.id]) {
              aggregation[ing.id].totalQuantity += requiredQty;
              aggregation[ing.id].totalCost += requiredQty * ing.costPerUnit;
            } else {
              aggregation[ing.id] = {
                ingredientId: ing.id,
                name: ing.nameES,
                totalQuantity: requiredQty,
                unit: ing.unit,
                costPerUnit: ing.costPerUnit,
                totalCost: requiredQty * ing.costPerUnit
              };
            }
          } else {
            const subRecipe = recipes.find(r => r.id === ri.ingredientId);
            if (subRecipe) {
              processRecipe(subRecipe.id, ri.quantity * multiplier);
            }
          }
        });
      }
    };

    orderItems.forEach(item => {
      if (item.quantity > 0) {
        processRecipe(item.recipeId, item.quantity);
      }
    });

    return Object.values(aggregation).sort((a, b) => a.name.localeCompare(b.name));
  };

  const filteredRecipes = recipes.filter(r => 
    r.nameES.toLowerCase().includes(search.toLowerCase()) &&
    !orderItems.find(item => item.recipeId === r.id)
  );

  const aggregatedList = getAggregatedIngredients();
  const totalOrderCost = aggregatedList.reduce((sum, item) => sum + item.totalCost, 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Pedidos</h1>
          <p className="text-stone-500 mt-2">Calcula los ingredientes necesarios según las recetas a producir.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Recipe Selection & Quantities */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
              <ShoppingCart size={20} className="text-emerald-600" />
              Recetas a Producir
            </h2>
            
            <div className="space-y-3 mb-6">
              {orderItems.map(item => {
                const recipe = recipes.find(r => r.id === item.recipeId);
                if (!recipe) return null;
                return (
                  <div key={item.recipeId} className="flex items-center gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <div className="flex-1 font-medium text-stone-900">{recipe.nameES}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-stone-500">Cant:</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity || ''}
                        onChange={(e) => updateOrderItemQuantity(item.recipeId, parseInt(e.target.value) || 0)}
                        className="w-20 px-3 py-1.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                      />
                    </div>
                    <button
                      onClick={() => removeOrderItem(item.recipeId)}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
              {orderItems.length === 0 && (
                <div className="text-center py-8 text-stone-500 text-sm border-2 border-dashed border-stone-200 rounded-xl">
                  No has añadido ninguna receta a producir.
                </div>
              )}
            </div>

            <div className="border-t border-stone-100 pt-6">
              <h3 className="text-sm font-bold text-stone-900 mb-3">Añadir Receta</h3>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar receta..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {filteredRecipes.map(recipe => (
                  <div key={recipe.id} className="flex justify-between items-center p-2 hover:bg-stone-50 rounded-lg transition-colors border border-transparent hover:border-stone-100">
                    <span className="text-sm font-medium text-stone-700">{recipe.nameES}</span>
                    <button
                      onClick={() => addOrderItem(recipe.id)}
                      className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-md transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                ))}
                {filteredRecipes.length === 0 && search && (
                  <div className="text-center py-4 text-stone-500 text-sm">
                    No se encontraron recetas.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Aggregated Ingredients */}
        <div>
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden sticky top-8">
            <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Calculator size={20} className="text-blue-600" />
                Lista de la Compra
              </h2>
              <div className="text-right">
                <div className="text-xs text-stone-500 uppercase font-bold tracking-wider">Coste Total Estimado</div>
                <div className="text-xl font-bold text-emerald-700">{totalOrderCost.toFixed(2)} €</div>
              </div>
            </div>
            
            <div className="p-0">
              {aggregatedList.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Ingrediente</th>
                      <th className="px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Cantidad Total</th>
                      <th className="px-6 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Coste</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {aggregatedList.map((item) => (
                      <tr key={item.ingredientId} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="text-sm font-medium text-stone-900">{item.name}</div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="text-sm font-bold text-stone-900">
                            {item.totalQuantity.toFixed(3)} <span className="text-stone-500 font-normal">{item.unit}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="text-sm text-stone-600">
                            {item.totalCost.toFixed(2)} €
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-stone-500">
                  <Calculator size={48} className="mx-auto text-stone-300 mb-4" />
                  <p>Añade recetas y cantidades para calcular los ingredientes necesarios.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
