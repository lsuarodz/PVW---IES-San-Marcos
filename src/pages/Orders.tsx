import React, { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Search, ShoppingCart, Plus, Trash2, Calculator, Printer } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { Recipe, Ingredient } from '../types';

interface OrderItem {
  type: 'recipe' | 'menu';
  id: string;
  quantity: number; // For recipe: quantity, For menu: diners
}

interface AggregatedIngredient {
  ingredientId: string;
  name: string;
  totalQuantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  provider?: string;
}

export default function Orders() {
  // Estados para almacenar recetas e ingredientes desde la base de datos
  const { recipes, ingredients } = useData();
  const { showToast } = useToast();
  
  // Estado para el buscador de recetas
  const [search, setSearch] = useState('');
  
  // Estado para almacenar los ítems del pedido (receta y cantidad)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  
  // Referencia y estado para la funcionalidad de impresión
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Función para añadir una receta o menú al pedido
  const addOrderItem = (id: string, type: 'recipe' | 'menu') => {
    // Solo la añadimos si no está ya en el pedido
    if (!orderItems.find(item => item.id === id && item.type === type)) {
      setOrderItems([...orderItems, { id, type, quantity: 1 }]);
    }
  };

  // Función para actualizar la cantidad de una receta o menú en el pedido
  const updateOrderItemQuantity = (id: string, type: 'recipe' | 'menu', quantity: number) => {
    setOrderItems(orderItems.map(item => 
      item.id === id && item.type === type ? { ...item, quantity: Math.max(0, quantity) } : item
    ));
  };

  // Función para eliminar una receta o menú del pedido
  const removeOrderItem = (id: string, type: 'recipe' | 'menu') => {
    setOrderItems(orderItems.filter(item => !(item.id === id && item.type === type)));
  };

  // Función principal que calcula la lista de la compra agregando todos los ingredientes necesarios
  const getAggregatedIngredients = (): AggregatedIngredient[] => {
    // Objeto para ir acumulando las cantidades por ID de ingrediente
    const aggregation: Record<string, AggregatedIngredient> = {};

    // Función recursiva para procesar una receta y sus posibles sub-recetas
    const processRecipe = (recipeId: string, multiplier: number, visited = new Set<string>()) => {
      if (visited.has(recipeId)) {
        console.warn(`Circular dependency detected for recipe: ${recipeId}`);
        return;
      }
      visited.add(recipeId);

      const recipe = recipes.find(r => r.id === recipeId);
      if (recipe) {
        recipe.ingredients.forEach(ri => {
          // Buscamos si es un ingrediente base
          const ing = ingredients.find(i => i.id === ri.ingredientId);
          if (ing) {
            // Calculamos la cantidad total necesaria (cantidad en receta * multiplicador del pedido)
            const requiredQty = ri.quantity * multiplier;
            if (aggregation[ing.id]) {
              // Si ya existe en la agregación, sumamos
              aggregation[ing.id].totalQuantity += requiredQty;
              aggregation[ing.id].totalCost += requiredQty * ing.costPerUnit;
            } else {
              // Si no existe, lo inicializamos
              aggregation[ing.id] = {
                ingredientId: ing.id,
                name: ing.nameES,
                totalQuantity: requiredQty,
                unit: ing.unit,
                costPerUnit: ing.costPerUnit,
                totalCost: requiredQty * ing.costPerUnit,
                provider: ing.provider
              };
            }
          } else {
            // Si no es un ingrediente base, podría ser una sub-receta
            const subRecipe = recipes.find(r => r.id === ri.ingredientId);
            if (subRecipe) {
              // Llamada recursiva multiplicando por la cantidad necesaria de la sub-receta
              processRecipe(subRecipe.id, ri.quantity * multiplier, new Set(visited));
            }
          }
        });
      }
    };

    orderItems.forEach(item => {
      if (item.quantity > 0) {
        if (item.type === 'recipe') {
          processRecipe(item.id, item.quantity);
        } else if (item.type === 'menu') {
          const menu = menus.find(m => m.id === item.id);
          if (menu) {
            menu.recipes.forEach(recipeId => {
              const recipe = recipes.find(r => r.id === recipeId);
              if (recipe) {
                const portions = recipe.portions || 1;
                const multiplier = item.quantity / portions;
                processRecipe(recipeId, multiplier);
              }
            });
          }
        }
      }
    });

    return Object.values(aggregation).sort((a, b) => a.name.localeCompare(b.name));
  };

  const { menus } = useData();

  const filteredRecipes = recipes.filter(r => 
    r.nameES.toLowerCase().includes(search.toLowerCase()) &&
    !orderItems.find(item => item.id === r.id && item.type === 'recipe')
  );

  const filteredMenus = menus.filter(m => 
    m.nameES.toLowerCase().includes(search.toLowerCase()) &&
    !orderItems.find(item => item.id === m.id && item.type === 'menu')
  );

  const aggregatedList = getAggregatedIngredients();
  const totalOrderCost = aggregatedList.reduce((sum, item) => sum + item.totalCost, 0);

  const exportPDF = () => {
    if (aggregatedList.length === 0) return;
    setIsPrinting(true);
    setTimeout(() => {
      if (printRef.current) {
        const opt = {
          margin: 0,
          filename: `Pedido_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'px', format: [794, 1122] as [number, number], orientation: 'portrait' as const }
        };
        
        html2pdf()
          .set(opt)
          .from(printRef.current)
          .save()
          .then(() => {
            setIsPrinting(false);
          })
          .catch((err: any) => {
            console.error('Error generating PDF:', err);
            setIsPrinting(false);
            showToast('Error al generar el PDF. Por favor, inténtalo de nuevo.', 'error');
          });
      } else {
        setIsPrinting(false);
      }
    }, 500);
  };

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
              <ShoppingCart size={20} className="text-teal-600" />
              Recetas y Menús a Producir
            </h2>
            
            <div className="space-y-3 mb-6">
              {orderItems.map(item => {
                const isRecipe = item.type === 'recipe';
                const data = isRecipe ? recipes.find(r => r.id === item.id) : menus.find(m => m.id === item.id);
                if (!data) return null;
                return (
                  <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <div className="flex-1 font-medium text-stone-900">
                      {data.nameES}
                      <span className="ml-2 text-xs font-normal text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full">
                        {isRecipe ? 'Receta' : 'Menú'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-stone-500">{isRecipe ? 'Cant:' : 'Comensales:'}</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity || ''}
                        onChange={(e) => updateOrderItemQuantity(item.id, item.type, parseInt(e.target.value) || 0)}
                        onFocus={e => e.target.select()}
                        className="w-20 px-3 py-1.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-center"
                      />
                    </div>
                    <button
                      onClick={() => removeOrderItem(item.id, item.type)}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
              {orderItems.length === 0 && (
                <div className="text-center py-8 text-stone-500 text-sm border-2 border-dashed border-stone-200 rounded-xl">
                  No has añadido ninguna receta o menú a producir.
                </div>
              )}
            </div>

            <div className="border-t border-stone-100 pt-6">
              <h3 className="text-sm font-bold text-stone-900 mb-3">Añadir Receta o Menú</h3>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar receta o menú..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {filteredMenus.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 px-2">Menús</div>
                    {filteredMenus.map(menu => (
                      <div key={menu.id} className="flex justify-between items-center p-2 hover:bg-stone-50 rounded-lg transition-colors border border-transparent hover:border-stone-100">
                        <span className="text-sm font-medium text-stone-700">{menu.nameES}</span>
                        <button
                          onClick={() => addOrderItem(menu.id, 'menu')}
                          className="text-teal-600 hover:bg-teal-50 p-1.5 rounded-md transition-colors"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {filteredRecipes.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 px-2 mt-4">Recetas</div>
                    {filteredRecipes.map(recipe => (
                      <div key={recipe.id} className="flex justify-between items-center p-2 hover:bg-stone-50 rounded-lg transition-colors border border-transparent hover:border-stone-100">
                        <span className="text-sm font-medium text-stone-700">{recipe.nameES}</span>
                        <button
                          onClick={() => addOrderItem(recipe.id, 'recipe')}
                          className="text-teal-600 hover:bg-teal-50 p-1.5 rounded-md transition-colors"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {filteredRecipes.length === 0 && filteredMenus.length === 0 && search && (
                  <div className="text-center py-4 text-stone-500 text-sm">
                    No se encontraron recetas ni menús.
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
              <div className="flex items-center gap-4">
                <button
                  onClick={exportPDF}
                  disabled={isPrinting || aggregatedList.length === 0}
                  className="p-2 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Imprimir Lista"
                >
                  <Printer size={20} />
                </button>
                <div className="text-right">
                  <div className="text-xs text-stone-500 uppercase font-bold tracking-wider">Coste Total Estimado</div>
                  <div className="text-xl font-bold text-teal-700">{totalOrderCost.toFixed(2)} €</div>
                </div>
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

      {/* Hidden Print Layout */}
      {isPrinting && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={printRef} className="px-12 py-16 bg-white text-stone-900 font-sans w-[794px] min-h-[1122px] mx-auto flex flex-col relative overflow-hidden">
            <div className="z-10 w-full">
              <div className="border-b border-stone-200 pb-8 mb-10 flex justify-between items-end">
                <div>
                  <div className="text-stone-400 text-[10px] tracking-[0.4em] uppercase mb-4 font-sans font-medium">Listado de Pedido y Compra</div>
                  <h1 className="text-3xl font-bold uppercase tracking-tight text-stone-800">Lista de Pedido</h1>
                  <p className="text-stone-500 mt-1 text-sm">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-stone-400 uppercase font-bold tracking-widest mb-1">Coste Total Estimado</div>
                  <div className="text-2xl font-bold text-teal-700">{totalOrderCost.toFixed(2)} €</div>
                </div>
              </div>

              <div className="mb-10">
                <h3 className="text-xs font-bold mb-4 uppercase tracking-[0.2em] text-stone-800 border-b border-stone-100 pb-2">Producción Incluida</h3>
                <div className="grid grid-cols-2 gap-x-12 gap-y-2">
                  {orderItems.filter(item => item.quantity > 0).map(item => {
                    const isRecipe = item.type === 'recipe';
                    const data = isRecipe ? recipes.find(r => r.id === item.id) : menus.find(m => m.id === item.id);
                    return (
                      <div key={`${item.type}-${item.id}`} className="flex justify-between text-[11px] border-b border-stone-50 pb-1">
                        <span className="text-stone-700">{data?.nameES} <span className="text-[9px] text-stone-400 uppercase ml-1">({isRecipe ? 'Receta' : 'Menú'})</span></span>
                        <span className="font-bold text-stone-900">x{item.quantity}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold mb-4 uppercase tracking-[0.2em] text-stone-800 border-b border-stone-100 pb-2">Desglose de Ingredientes</h3>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-stone-400 uppercase tracking-wider text-[10px] border-b border-stone-100">
                      <th className="py-2 font-medium">Ingrediente</th>
                      <th className="py-2 font-medium">Proveedor</th>
                      <th className="py-2 font-medium text-right">Cantidad</th>
                      <th className="py-2 font-medium text-right">Coste Est.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {aggregatedList.map((item) => (
                      <tr key={item.ingredientId}>
                        <td className="py-2 text-[11px] font-medium text-stone-800">{item.name}</td>
                        <td className="py-2 text-[10px] text-stone-500 italic">{item.provider || '-'}</td>
                        <td className="py-2 text-[11px] text-right font-bold text-stone-900">{item.totalQuantity.toFixed(3)} {item.unit}</td>
                        <td className="py-2 text-[11px] text-right text-stone-600">{item.totalCost.toFixed(2)} €</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-stone-100 font-bold text-stone-900">
                      <td colSpan={3} className="py-4 text-right uppercase tracking-widest text-[10px] text-stone-400">Total Pedido</td>
                      <td className="py-4 text-right text-teal-700 text-lg">{totalOrderCost.toFixed(2)} €</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div className="mt-auto pt-12 text-center">
                <p className="text-[9px] text-stone-400 uppercase tracking-[0.3em] font-sans">
                  Documento generado automáticamente · Proyecto Intermodular
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
