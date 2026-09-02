import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Search, ShoppingCart, Plus, Trash2, Calculator, Printer, User, Calendar, CheckSquare, Square, CheckCircle, ListFilter, Trash, FolderOpen } from 'lucide-react';
import { generatePDF } from '../utils/pdf';
import { canViewItem } from '../utils/visibility';
import { Recipe, Ingredient, Order, OrderItem } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, deleteDoc, updateDoc, collection } from 'firebase/firestore';

function formatTeacherName(fullName: string): string {
  if (!fullName) return '';
  if (fullName === 'Profesor' || fullName === 'Mi Pedido') return fullName;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) {
    return fullName;
  }
  return parts.slice(0, -1).join(' ');
}

interface AggregatedIngredient {
  ingredientId: string;
  name: string;
  totalQuantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  provider?: string;
  byTeacher: Record<string, number>; // maps teacherName -> quantity
}

interface TeacherIngredient {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  provider?: string;
}

export default function Orders() {
  const { appUser, commissionMode } = useAuth();
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'docente';
  const canConsolidate = appUser?.role === 'admin' || appUser?.role === 'compras';
  const { users, recipes, ingredients, menus, settings, orders } = useData();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'create' | 'consolidate'>('create');
  
  // Create Tab States
  const [search, setSearch] = useState('');
  const [orderItems, setOrderItems] = useState<(OrderItem & { inputValue?: string })[]>([]);
  const [orderTitle, setOrderTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Consolidate Tab States
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<'provider' | 'teacher'>('provider');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Print Setup
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Automatically select all pending orders when orders list loads or tab changes
  useEffect(() => {
    if (orders.length > 0 && selectedOrderIds.length === 0) {
      setSelectedOrderIds(orders.filter(o => o.status === 'pending').map(o => o.id));
    }
  }, [orders]);

  // Add item to local workspace
  const addOrderItem = (id: string, type: 'recipe' | 'menu' | 'ingredient') => {
    if (!orderItems.find(item => item.id === id && item.type === type)) {
      setOrderItems([...orderItems, { id, type, quantity: 1, justification: '' }]);
    }
  };

  // Update quantity in local workspace
  const updateOrderItemQuantity = (id: string, type: 'recipe' | 'menu' | 'ingredient', quantity: number, inputValue?: string) => {
    setOrderItems(orderItems.map(item => 
      item.id === id && item.type === type ? { ...item, quantity: Math.max(0, quantity), inputValue } : item
    ));
  };

  // Update justification in local workspace for direct ingredients
  const updateOrderItemJustification = (id: string, type: 'recipe' | 'menu' | 'ingredient', justification: string) => {
    setOrderItems(orderItems.map(item => 
      item.id === id && item.type === type ? { ...item, justification } : item
    ));
  };

  // Remove item from local workspace
  const removeOrderItem = (id: string, type: 'recipe' | 'menu' | 'ingredient') => {
    setOrderItems(orderItems.filter(item => !(item.id === id && item.type === type)));
  };

  // Save current workspace to Firestore
  const handleSaveOrder = async () => {
    if (orderItems.length === 0) {
      showToast('Añade al menos una receta, menú o ingrediente suelto a tu pedido.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const orderId = doc(collection(db, 'orders')).id;
      const titleStr = orderTitle.trim() || `Pedido de ${appUser?.name || 'Profesor'} - ${new Date().toLocaleDateString('es-ES')}`;
      const newOrder: Order = {
        id: orderId,
        title: titleStr,
        userId: appUser?.uid || '',
        userName: appUser?.name || 'Profesor',
        items: orderItems,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };
      
      await setDoc(doc(db, 'orders', orderId), newOrder);
      showToast('¡Pedido guardado y enviado correctamente!', 'success');
      setOrderItems([]);
      setOrderTitle('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'orders');
      showToast('Error al guardar el pedido.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete an individual order
  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      showToast('Pedido eliminado correctamente.', 'success');
      setSelectedOrderIds(selectedOrderIds.filter(id => id !== orderId));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
      showToast('Error al eliminar el pedido.', 'error');
    }
  };

  // Mark selected orders as completed (delivered)
  const handleMarkSelectedCompleted = async () => {
    if (selectedOrderIds.length === 0) return;
    setIsUpdatingStatus(true);
    try {
      await Promise.all(
        selectedOrderIds.map(async (id) => {
          await updateDoc(doc(db, 'orders', id), { status: 'completed' });
        })
      );
      showToast('Pedidos marcados como completados correctamente.', 'success');
      setSelectedOrderIds([]);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'orders');
      showToast('Error al actualizar los pedidos.', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Delete selected orders
  const handleDeleteSelected = async () => {
    if (selectedOrderIds.length === 0) return;
    setIsUpdatingStatus(true);
    try {
      await Promise.all(
        selectedOrderIds.map(async (id) => {
          await deleteDoc(doc(db, 'orders', id));
        })
      );
      showToast('Pedidos seleccionados eliminados.', 'success');
      setSelectedOrderIds([]);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'orders');
      showToast('Error al eliminar los pedidos.', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Toggle order selection for consolidation
  const toggleOrderSelection = (id: string) => {
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds(selectedOrderIds.filter(item => item !== id));
    } else {
      setSelectedOrderIds([...selectedOrderIds, id]);
    }
  };

  // Select all pending / completed / all orders
  const selectAllOrders = (type: 'all' | 'pending' | 'none') => {
    if (type === 'none') {
      setSelectedOrderIds([]);
    } else if (type === 'pending') {
      setSelectedOrderIds(orders.filter(o => o.status === 'pending').map(o => o.id));
    } else {
      setSelectedOrderIds(orders.map(o => o.id));
    }
  };

  // Setup inputs depending on the active tab
  const itemsToProcess = useMemo(() => {
    if (activeTab === 'create') {
      return orderItems.length > 0 ? [{ items: orderItems, userName: appUser?.name || 'Mi Pedido' }] : [];
    } else {
      return orders
        .filter(o => selectedOrderIds.includes(o.id))
        .map(o => ({ items: o.items, userName: o.userName }));
    }
  }, [activeTab, orderItems, selectedOrderIds, orders, appUser]);

  // Aggregate ingredients
  const aggregatedList = useMemo((): AggregatedIngredient[] => {
    const aggregation: Record<string, AggregatedIngredient> = {};

    const processRecipe = (recipeId: string, multiplier: number, userName: string, visited = new Set<string>()) => {
      if (visited.has(recipeId)) {
        console.warn(`Circular dependency detected for recipe: ${recipeId}`);
        return;
      }
      visited.add(recipeId);

      const recipe = recipes.find(r => r.id === recipeId);
      if (recipe) {
        recipe.ingredients.forEach(ri => {
          const ing = ingredients.find(i => i.id === ri.ingredientId);
          if (ing) {
            const requiredQty = ri.quantity * multiplier;
            if (aggregation[ing.id]) {
              aggregation[ing.id].totalQuantity += requiredQty;
              aggregation[ing.id].totalCost += requiredQty * ing.costPerUnit;
              aggregation[ing.id].byTeacher[userName] = (aggregation[ing.id].byTeacher[userName] || 0) + requiredQty;
            } else {
              aggregation[ing.id] = {
                ingredientId: ing.id,
                name: ing.nameES,
                totalQuantity: requiredQty,
                unit: ing.unit,
                costPerUnit: ing.costPerUnit,
                totalCost: requiredQty * ing.costPerUnit,
                provider: ing.provider || '',
                byTeacher: {
                  [userName]: requiredQty
                }
              };
            }
          } else {
            const subRecipe = recipes.find(r => r.id === ri.ingredientId);
            if (subRecipe) {
              processRecipe(subRecipe.id, ri.quantity * multiplier, userName, new Set(visited));
            }
          }
        });
      }
    };

    itemsToProcess.forEach(source => {
      source.items.forEach(item => {
        if (item.quantity > 0) {
          if (item.type === 'recipe') {
            processRecipe(item.id, item.quantity, source.userName);
          } else if (item.type === 'menu') {
            const menu = menus.find(m => m.id === item.id);
            if (menu) {
              menu.recipes.forEach(recipeId => {
                const recipe = recipes.find(r => r.id === recipeId);
                if (recipe) {
                  const portions = recipe.portions || 1;
                  const multiplier = item.quantity / portions;
                  processRecipe(recipeId, multiplier, source.userName);
                }
              });
            }
          } else if (item.type === 'ingredient') {
            const ing = ingredients.find(i => i.id === item.id);
            if (ing) {
              const requiredQty = item.quantity;
              const teacherLabel = item.justification 
                ? `${source.userName} (Justificación: ${item.justification})` 
                : source.userName;

              if (aggregation[ing.id]) {
                aggregation[ing.id].totalQuantity += requiredQty;
                aggregation[ing.id].totalCost += requiredQty * ing.costPerUnit;
                aggregation[ing.id].byTeacher[teacherLabel] = (aggregation[ing.id].byTeacher[teacherLabel] || 0) + requiredQty;
              } else {
                aggregation[ing.id] = {
                  ingredientId: ing.id,
                  name: ing.nameES,
                  totalQuantity: requiredQty,
                  unit: ing.unit,
                  costPerUnit: ing.costPerUnit,
                  totalCost: requiredQty * ing.costPerUnit,
                  provider: ing.provider || '',
                  byTeacher: {
                    [teacherLabel]: requiredQty
                  }
                };
              }
            }
          }
        }
      });
    });

    return Object.values(aggregation).sort((a, b) => a.name.localeCompare(b.name));
  }, [itemsToProcess, recipes, ingredients, menus]);

  const totalOrderCost = useMemo(() => {
    return aggregatedList.reduce((sum, item) => sum + item.totalCost, 0);
  }, [aggregatedList]);

  // Grouped by Provider (default printed view)
  const groupedIngredients = useMemo(() => {
    const groups = aggregatedList.reduce((acc, item) => {
      const provider = item.provider || 'Sin proveedor asignado';
      if (!acc[provider]) {
        acc[provider] = [];
      }
      acc[provider].push(item);
      return acc;
    }, {} as Record<string, AggregatedIngredient[]>);

    return groups;
  }, [aggregatedList]);

  const sortedProviders = useMemo(() => {
    return Object.keys(groupedIngredients).sort((a, b) => {
      if (a === 'Sin proveedor asignado') return 1;
      if (b === 'Sin proveedor asignado') return -1;
      return a.localeCompare(b);
    });
  }, [groupedIngredients]);

  // Grouped by Teacher (optional UI view)
  const groupedByTeacher = useMemo(() => {
    const teacherGroups: Record<string, TeacherIngredient[]> = {};
    
    aggregatedList.forEach(item => {
      Object.entries(item.byTeacher).forEach(([teacher, qty]) => {
        if (!teacherGroups[teacher]) {
          teacherGroups[teacher] = [];
        }
        teacherGroups[teacher].push({
          ingredientId: item.ingredientId,
          name: item.name,
          quantity: qty,
          unit: item.unit,
          costPerUnit: item.costPerUnit,
          totalCost: qty * item.costPerUnit,
          provider: item.provider
        });
      });
    });

    return teacherGroups;
  }, [aggregatedList]);

  const sortedTeachers = useMemo(() => {
    return Object.keys(groupedByTeacher).sort((a, b) => a.localeCompare(b));
  }, [groupedByTeacher]);

  const filteredRecipes = recipes.filter(r => {
    if (!canViewItem(r, appUser, users, { commissionMode })) return false;
    return r.nameES.toLowerCase().includes(search.toLowerCase()) &&
           !orderItems.find(item => item.id === r.id && item.type === 'recipe');
  });

  const filteredMenus = menus.filter(m => {
    if (!canViewItem(m, appUser, users, { commissionMode })) return false;
    return m.nameES.toLowerCase().includes(search.toLowerCase()) &&
           !orderItems.find(item => item.id === m.id && item.type === 'menu');
  });

  const filteredIngredients = ingredients.filter(i => {
    return i.nameES.toLowerCase().includes(search.toLowerCase()) &&
           !orderItems.find(item => item.id === i.id && item.type === 'ingredient');
  });

  // Consolidated production items list (used in summary card & print preview)
  const consolidatedProduction = useMemo(() => {
    if (activeTab === 'create') {
      return orderItems.filter(item => item.quantity > 0).map(item => {
        const isRecipe = item.type === 'recipe';
        const isMenu = item.type === 'menu';
        const data = isRecipe 
          ? recipes.find(r => r.id === item.id) 
          : isMenu 
            ? menus.find(m => m.id === item.id)
            : ingredients.find(i => i.id === item.id);
        return {
          name: data?.nameES || '',
          type: isRecipe ? 'Receta' : isMenu ? 'Menú' : 'Ingrediente Directo',
          quantity: item.quantity,
          teacherName: appUser?.name || 'Profesor',
          justification: item.type === 'ingredient' ? item.justification : undefined
        };
      });
    } else {
      const prodItems: { name: string; type: string; quantity: number; teacherName: string; justification?: string; }[] = [];
      orders.filter(o => selectedOrderIds.includes(o.id)).forEach(order => {
        order.items.forEach(item => {
          if (item.quantity > 0) {
            const isRecipe = item.type === 'recipe';
            const isMenu = item.type === 'menu';
            const data = isRecipe 
              ? recipes.find(r => r.id === item.id) 
              : isMenu 
                ? menus.find(m => m.id === item.id)
                : ingredients.find(i => i.id === item.id);
            prodItems.push({
              name: data?.nameES || '',
              type: isRecipe ? 'Receta' : isMenu ? 'Menú' : 'Ingrediente Directo',
              quantity: item.quantity,
              teacherName: order.userName,
              justification: item.type === 'ingredient' ? item.justification : undefined
            });
          }
        });
      });
      return prodItems;
    }
  }, [activeTab, orderItems, selectedOrderIds, orders, recipes, menus, ingredients, appUser]);

  const exportPDF = () => {
    if (aggregatedList.length === 0) return;
    setIsPrinting(true);
    setTimeout(() => {
      if (printRef.current) {
        const opt = {
          margin: 20,
          filename: `Pedido_Consolidado_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            scrollY: 0,
            y: 0
          },
          jsPDF: { unit: 'px', format: [794, 1122] as [number, number], orientation: 'portrait' as const },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
        
        generatePDF(printRef.current, opt)
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

  // My saved orders list (to edit or delete)
  const mySavedOrders = useMemo(() => {
    return orders.filter(o => o.userId === appUser?.uid);
  }, [orders, appUser]);

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Pedidos</h1>
          <p className="text-stone-500 mt-2">Sistema de compras integrado y consolidado por profesor y proveedor con soporte de justificaciones directas.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'create' ? 'bg-white text-teal-800 shadow-sm' : 'text-stone-600 hover:text-stone-950'}`}
          >
            <ShoppingCart size={16} />
            Crear Mi Pedido
          </button>
          {canConsolidate && (
            <button
              onClick={() => setActiveTab('consolidate')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'consolidate' ? 'bg-white text-teal-800 shadow-sm' : 'text-stone-600 hover:text-stone-950'}`}
            >
              <ListFilter size={16} />
              Consolidar Pedidos
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ==================== LEFT COLUMN ==================== */}
        <div className="lg:col-span-5 space-y-6">
          {activeTab === 'create' ? (
            /* ================= CREATE ORDER VIEW ================= */
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
                <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2 border-b border-stone-100 pb-2">
                  <ShoppingCart size={20} className="text-teal-600" />
                  Nueva Comanda de Producción
                </h2>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Título o Identificador del Pedido</label>
                  <input
                    type="text"
                    placeholder={`Ej: Repostería Jueves (${appUser?.name || 'Profesor'})`}
                    value={orderTitle}
                    onChange={(e) => setOrderTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>
                
                <div className="space-y-3 mb-6 max-h-[350px] overflow-y-auto pr-1">
                  {orderItems.map(item => {
                    const isRecipe = item.type === 'recipe';
                    const isMenu = item.type === 'menu';
                    const isIngredient = item.type === 'ingredient';
                    const data = isRecipe 
                      ? recipes.find(r => r.id === item.id) 
                      : isMenu 
                        ? menus.find(m => m.id === item.id)
                        : ingredients.find(i => i.id === item.id);
                    if (!data) return null;
                    return (
                      <div key={`${item.type}-${item.id}`} className="flex flex-col gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 font-semibold text-stone-900 text-sm">
                            {isIngredient ? (data as Ingredient).nameES : (data as Recipe).nameES}
                            <span className="ml-2 text-[10px] font-normal text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full">
                              {isRecipe ? 'Receta' : isMenu ? 'Menú' : 'Ingrediente'}
                            </span>
                            {isIngredient && (
                              <span className="ml-1 text-[10px] text-stone-400 font-mono">
                                ({ (data as Ingredient).unit })
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-stone-500">
                              {isRecipe ? 'Cant:' : isMenu ? 'Pax:' : 'Cant:'}
                            </span>
                            <input
                              type="number"
                              min="0.001"
                              step="any"
                              value={item.inputValue !== undefined ? item.inputValue : item.quantity || ''}
                              onChange={(e) => {
                                const rawValue = e.target.value;
                                const numValue = parseFloat(rawValue) || 0;
                                updateOrderItemQuantity(item.id, item.type, numValue, rawValue);
                              }}
                              onFocus={e => e.target.select()}
                              className="w-16 px-2 py-1 bg-white border border-stone-200 rounded-lg text-sm text-center font-bold focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                          <button
                            onClick={() => removeOrderItem(item.id, item.type)}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Justification for direct ingredients */}
                        {isIngredient && (
                          <div className="mt-1">
                            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                              Justificación / Notas:
                            </label>
                            <input
                              type="text"
                              placeholder="Ej: Receta de clase, repostería creativa, sustitución..."
                              value={item.justification || ''}
                              onChange={(e) => updateOrderItemJustification(item.id, item.type, e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 text-xs text-stone-700 italic"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {orderItems.length === 0 && (
                    <div className="text-center py-12 text-stone-400 text-sm border-2 border-dashed border-stone-100 rounded-xl bg-stone-50/50">
                      El pedido está vacío. Añade recetas, menús o ingredientes directos abajo.
                    </div>
                  )}
                </div>

                {orderItems.length > 0 && (
                  <button
                    onClick={handleSaveOrder}
                    disabled={isSaving}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors shadow-sm text-sm disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {isSaving ? 'Guardando...' : 'Guardar y Enviar Pedido'}
                  </button>
                )}
              </div>

              {/* SEARCH RECIPES, MENUS & DIRECT INGREDIENTS */}
              <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
                <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wider">Añadir al Pedido</h3>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar recetas, menús o ingredientes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>
                
                <div className="max-h-80 overflow-y-auto space-y-4 pr-1">
                  {filteredMenus.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 px-1">Menús</div>
                      <div className="space-y-1.5">
                        {filteredMenus.map(menu => (
                          <div key={menu.id} className="flex justify-between items-center p-2 hover:bg-stone-50 rounded-lg transition-colors border border-transparent hover:border-stone-100">
                            <span className="text-sm font-medium text-stone-700">{menu.nameES}</span>
                            <button
                              onClick={() => addOrderItem(menu.id, 'menu')}
                              className="text-teal-600 hover:bg-teal-50 p-1.5 rounded-lg transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {filteredRecipes.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 px-1">Recetas</div>
                      <div className="space-y-1.5">
                        {filteredRecipes.map(recipe => (
                          <div key={recipe.id} className="flex justify-between items-center p-2 hover:bg-stone-50 rounded-lg transition-colors border border-transparent hover:border-stone-100">
                            <span className="text-sm font-medium text-stone-700">{recipe.nameES}</span>
                            <button
                              onClick={() => addOrderItem(recipe.id, 'recipe')}
                              className="text-teal-600 hover:bg-teal-50 p-1.5 rounded-lg transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredIngredients.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 px-1">Ingredientes Directos</div>
                      <div className="space-y-1.5">
                        {filteredIngredients.slice(0, 30).map(ing => (
                          <div key={ing.id} className="flex justify-between items-center p-2 hover:bg-stone-50 rounded-lg transition-colors border border-transparent hover:border-stone-100">
                            <span className="text-sm font-medium text-stone-700">
                              {ing.nameES} <span className="text-xs text-stone-400">({ing.unit})</span>
                            </span>
                            <button
                              onClick={() => addOrderItem(ing.id, 'ingredient')}
                              className="text-teal-600 hover:bg-teal-50 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                            >
                              <Plus size={14} />
                              Añadir
                            </button>
                          </div>
                        ))}
                        {filteredIngredients.length > 30 && (
                          <div className="text-center text-[10px] text-stone-400 py-1 font-mono">
                            Escribe más para filtrar entre los {filteredIngredients.length} ingredientes restantes...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {filteredRecipes.length === 0 && filteredMenus.length === 0 && filteredIngredients.length === 0 && (
                    <div className="text-center py-4 text-stone-400 text-xs">
                      No se encontraron resultados en recetas, menús ni ingredientes.
                    </div>
                  )}
                </div>
              </div>

              {/* MY SAVED ORDERS HISTORY */}
              {mySavedOrders.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
                  <h3 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={16} className="text-teal-600" />
                    Mis Pedidos Guardados
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {mySavedOrders.map(order => (
                      <div key={order.id} className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex justify-between items-start">
                        <div className="flex-1 min-w-0 pr-2">
                          <h4 className="font-semibold text-stone-900 text-sm truncate">{order.title}</h4>
                          <p className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-1">
                            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${order.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                              {order.status === 'completed' ? 'Completado' : 'Pendiente'}
                            </span>
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setOrderItems(order.items)}
                            className="text-xs text-teal-600 hover:bg-teal-50 font-bold px-2 py-1 rounded transition-colors"
                            title="Cargar en borrador para editar"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Eliminar pedido"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ================= CONSOLIDATE VIEW ================= */
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-stone-100 pb-3">
                <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <User size={20} className="text-teal-600" />
                  Pedidos del Profesorado
                </h2>
                <div className="text-[10px] bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded-full uppercase">
                  {orders.length} guardados
                </div>
              </div>

              {/* Selection helpers */}
              <div className="flex flex-wrap gap-2 pb-1">
                <button
                  onClick={() => selectAllOrders('pending')}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-semibold text-stone-700 transition-colors"
                >
                  Seleccionar Pendientes
                </button>
                <button
                  onClick={() => selectAllOrders('all')}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-semibold text-stone-700 transition-colors"
                >
                  Seleccionar Todos
                </button>
                <button
                  onClick={() => selectAllOrders('none')}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-semibold text-stone-700 transition-colors"
                >
                  Deseleccionar
                </button>
              </div>

              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {orders.map(order => {
                  const isChecked = selectedOrderIds.includes(order.id);
                  return (
                    <div
                      key={order.id}
                      onClick={() => toggleOrderSelection(order.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${isChecked ? 'bg-teal-50/50 border-teal-300 shadow-sm' : 'bg-white border-stone-200 hover:bg-stone-50'}`}
                    >
                      <div className="mt-0.5 text-stone-400">
                        {isChecked ? (
                          <CheckSquare size={18} className="text-teal-600" />
                        ) : (
                          <Square size={18} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-bold text-stone-900 text-sm truncate">{order.title}</h4>
                          <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ${order.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                            {order.status === 'completed' ? 'Completado' : 'Pendiente'}
                          </span>
                        </div>
                        
                        <p className="text-xs text-stone-600 mt-1 flex items-center gap-1">
                          <span className="font-medium text-stone-800">{order.userName}</span>
                        </p>
                        
                        <div className="text-[10px] text-stone-500 mt-2 flex justify-between">
                          <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                          <span className="font-semibold text-stone-700">
                            {order.items.reduce((sum, i) => sum + i.quantity, 0)} items
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {orders.length === 0 && (
                  <div className="text-center py-16 text-stone-400 text-sm border-2 border-dashed border-stone-100 rounded-xl bg-stone-50/50">
                    <FolderOpen size={36} className="mx-auto text-stone-300 mb-2" />
                    No hay ningún pedido guardado en el sistema.
                  </div>
                )}
              </div>

              {/* Bulk actions */}
              {selectedOrderIds.length > 0 && (
                <div className="pt-4 border-t border-stone-100 flex gap-2">
                  <button
                    onClick={handleMarkSelectedCompleted}
                    disabled={isUpdatingStatus}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-xl transition-all text-xs flex justify-center items-center gap-1"
                  >
                    <CheckCircle size={14} />
                    Completar Seleccionados
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={isUpdatingStatus}
                    className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-xl transition-all border border-red-200"
                    title="Eliminar seleccionados"
                  >
                    <Trash size={15} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ==================== RIGHT COLUMN ==================== */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden sticky top-8">
            <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-2">
                <Calculator size={22} className="text-teal-600" />
                <div>
                  <h2 className="text-lg font-bold text-stone-900">
                    {activeTab === 'create' ? 'Mi Lista de la Compra' : 'Lista de Compra Consolidada'}
                  </h2>
                  <p className="text-xs text-stone-500">
                    {activeTab === 'create' ? 'Ingredientes para tu pedido' : `Ingredientes combinados de ${selectedOrderIds.length} pedidos`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-end">
                <button
                  onClick={exportPDF}
                  disabled={isPrinting || aggregatedList.length === 0}
                  className="p-2.5 text-stone-500 hover:text-teal-600 hover:bg-teal-50 rounded-xl border border-stone-200 transition-colors disabled:opacity-50"
                  title="Imprimir Lista PDF"
                >
                  <Printer size={20} />
                </button>
                <div className="text-right">
                  <div className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">Coste Total</div>
                  <div className="text-2xl font-black text-teal-700">{totalOrderCost.toFixed(2)} €</div>
                </div>
              </div>
            </div>

            {/* View grouping selector (Only if consolidating) */}
            {activeTab === 'consolidate' && aggregatedList.length > 0 && (
              <div className="px-6 py-3 bg-stone-50/50 border-b border-stone-100 flex justify-between items-center text-sm">
                <span className="text-stone-600 font-medium">Agrupar ingredientes por:</span>
                <div className="flex bg-stone-100 p-1 rounded-lg border border-stone-200">
                  <button
                    onClick={() => setGroupBy('provider')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${groupBy === 'provider' ? 'bg-white text-teal-800 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    Proveedor
                  </button>
                  <button
                    onClick={() => setGroupBy('teacher')}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${groupBy === 'teacher' ? 'bg-white text-teal-800 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    Profesor
                  </button>
                </div>
              </div>
            )}

            <div className="p-0 max-h-[600px] overflow-y-auto">
              {aggregatedList.length > 0 ? (
                <>
                  {groupBy === 'provider' || activeTab === 'create' ? (
                    /* ================= GROUPED BY PROVIDER VIEW ================= */
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200">
                          <th className="px-6 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wider">Ingrediente</th>
                          <th className="px-6 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Cantidad</th>
                          <th className="px-6 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Coste Est.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {sortedProviders.map(provider => (
                          <React.Fragment key={provider}>
                            <tr className="bg-stone-100/60 border-y border-stone-200/80">
                              <td colSpan={3} className="px-6 py-1.5 text-xs font-bold text-stone-700 uppercase tracking-wider">
                                {provider}
                              </td>
                            </tr>
                            {groupedIngredients[provider].map((item) => (
                              <tr key={item.ingredientId} className="hover:bg-stone-50/30 transition-colors">
                                <td className="px-6 py-3 pl-8">
                                  <div className="text-sm font-semibold text-stone-900">{item.name}</div>
                                  
                                  {/* TEACHER BREAKDOWN (Only in consolidate view) */}
                                  {activeTab === 'consolidate' && Object.keys(item.byTeacher).length > 0 && (
                                    <div className="text-[10px] text-stone-500 mt-1 pl-1 flex flex-col gap-y-0.5 border-l border-stone-200">
                                      {Object.entries(item.byTeacher).map(([teacher, qty]) => {
                                        const parts = teacher.split(' (Justificación:');
                                        const nameOnly = parts[0];
                                        const formattedName = formatTeacherName(nameOnly);
                                        const justification = parts.length > 1 ? ` (Justificación:${parts[1]}` : '';
                                        return (
                                          <span key={teacher} className="whitespace-normal">
                                            <strong className="text-stone-700 font-semibold" style={{ fontSize: '75%' }}>{formattedName}</strong>
                                            {justification && <span className="text-stone-500 italic">{justification}</span>}
                                            : {qty.toFixed(3)} {item.unit}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <div className="text-sm font-bold text-stone-900">
                                    {item.totalQuantity.toFixed(3)} <span className="text-stone-500 font-normal">{item.unit}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <div className="text-sm text-stone-600 font-medium">
                                    {item.totalCost.toFixed(2)} €
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    /* ================= GROUPED BY TEACHER VIEW ================= */
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200">
                          <th className="px-6 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wider">Ingrediente</th>
                          <th className="px-6 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Cantidad</th>
                          <th className="px-6 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Proveedor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {sortedTeachers.map(teacher => {
                          const parts = teacher.split(' (Justificación:');
                          const nameOnly = parts[0];
                          const formattedName = formatTeacherName(nameOnly);
                          const justification = parts.length > 1 ? ` (Justificación:${parts[1]}` : '';
                          return (
                            <React.Fragment key={teacher}>
                              <tr className="bg-teal-50 border-y border-teal-100">
                                <td colSpan={3} className="px-6 py-1.5 text-xs font-bold text-teal-900 uppercase tracking-wider">
                                  <span style={{ fontSize: '75%' }}>{formattedName}</span>
                                  {justification && <span className="text-stone-500 italic font-normal ml-2">{justification}</span>}
                                </td>
                              </tr>
                              {groupedByTeacher[teacher].map((item, idx) => (
                                <tr key={`${teacher}-${item.ingredientId}-${idx}`} className="hover:bg-stone-50/30 transition-colors">
                                  <td className="px-6 py-3 pl-8">
                                    <div className="text-sm font-semibold text-stone-900">{item.name}</div>
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                    <div className="text-sm font-bold text-stone-900">
                                      {item.quantity.toFixed(3)} <span className="text-stone-500 font-normal">{item.unit}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                    <div className="text-xs text-stone-500 italic">
                                      {item.provider || 'Sin proveedor'}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </>
              ) : (
                <div className="p-16 text-center text-stone-500">
                  <Calculator size={48} className="mx-auto text-stone-300 mb-4" />
                  <p className="text-sm font-medium">Añade o selecciona pedidos para ver la lista de la compra detallada.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== HIDDEN PRINT LAYOUT ==================== */}
      {isPrinting && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={printRef} className="px-12 py-16 bg-white text-stone-900 font-sans w-[794px] min-h-[1122px] mx-auto flex flex-col relative overflow-hidden">
            <div className="z-10 w-full">
              <div className="border-b border-stone-200 pb-8 mb-10 flex justify-between items-end">
                <div>
                  {settings?.logoUrl && (
                    <img src={settings.logoUrl} alt="Logo" className="h-8 object-contain mb-4" crossOrigin="anonymous" />
                  )}
                  <div className="text-stone-400 text-[10px] tracking-[0.4em] uppercase mb-4 font-sans font-medium">Listado de Pedido y Compra</div>
                  <h1 className="text-xl font-bold uppercase tracking-tight text-stone-800">
                    {activeTab === 'create' ? 'Lista de Pedido Personal' : 'Lista de Pedidos Consolidados'}
                  </h1>
                  <p className="text-stone-500 mt-1 text-xs">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-stone-400 uppercase font-bold tracking-widest mb-1">Coste Total Estimado</div>
                  <div className="text-2xl font-black text-teal-700">{totalOrderCost.toFixed(2)} €</div>
                </div>
              </div>

              {/* Included Production Breakdown */}
              {consolidatedProduction.length > 0 && (
                <div className="mb-10 text-stone-900">
                  <h3 className="text-xs font-bold mb-4 uppercase tracking-[0.2em] text-stone-800 border-b border-stone-100 pb-2">Producción e Ingredientes Directos Incluidos</h3>
                  <div className="grid grid-cols-2 gap-x-12 gap-y-3">
                    {consolidatedProduction.map((item, idx) => (
                      <div key={idx} className="flex flex-col text-[11px] border-b border-stone-50 pb-1.5">
                        <div className="flex justify-between w-full">
                          <span className="text-stone-700 font-semibold">
                            {item.name} <span className="text-[9px] text-stone-400 uppercase">({item.type})</span>
                          </span>
                          <span className="font-bold text-stone-900">x{item.quantity}</span>
                        </div>
                        <div className="flex justify-between w-full text-[9px] text-stone-500 mt-0.5">
                          <span className="italic text-teal-600 font-medium" style={{ fontSize: '75%' }}>{formatTeacherName(item.teacherName)}</span>
                          {item.justification && (
                            <span className="text-amber-800 italic">Justificación: {item.justification}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detailed Shopping list by Supplier */}
              <div>
                <h3 className="text-xs font-bold mb-4 uppercase tracking-[0.2em] text-stone-800 border-b border-stone-100 pb-2">
                  Desglose de Ingredientes por Proveedor y Profesor
                </h3>
                {sortedProviders.map((provider) => {
                  const providerItems = groupedIngredients[provider];
                  const providerTotal = providerItems.reduce((sum, item) => sum + item.totalCost, 0);

                  return (
                    <div key={provider} className="mb-6 print-avoid-break text-stone-900">
                      <h4 className="text-[11px] font-bold text-stone-900 bg-stone-50 px-2 py-1 mb-2 uppercase tracking-wider border-l-2 border-stone-400">
                        {provider}
                      </h4>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-stone-400 uppercase tracking-wider text-[9px] border-b border-stone-100">
                            <th className="py-1 font-medium">Ingrediente / Petición</th>
                            <th className="py-1 font-medium text-right">Cantidad</th>
                            <th className="py-1 font-medium text-right">Coste Est.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                          {providerItems.map((item) => (
                            <React.Fragment key={item.ingredientId}>
                              <tr>
                                <td className="py-1.5 text-[11px] font-bold text-stone-800">{item.name}</td>
                                <td className="py-1.5 text-[11px] text-right font-bold text-stone-900">{item.totalQuantity.toFixed(3)} {item.unit}</td>
                                <td className="py-1.5 text-[11px] text-right text-stone-600">{item.totalCost.toFixed(2)} €</td>
                              </tr>
                              {/* BREAKDOWN PER TEACHER WITH JUSTIFICATION */}
                              {Object.keys(item.byTeacher).length > 0 && (
                                <tr>
                                  <td colSpan={3} className="pb-2 pt-0.5 pl-4 bg-stone-50/10">
                                    <div className="text-[9px] text-stone-500 flex flex-col gap-y-0.5">
                                      {Object.entries(item.byTeacher).map(([teacher, qty]) => {
                                        const parts = teacher.split(' (Justificación:');
                                        const nameOnly = parts[0];
                                        const formattedName = formatTeacherName(nameOnly);
                                        const justification = parts.length > 1 ? ` (Justificación:${parts[1]}` : '';
                                        return (
                                          <div key={teacher} className="text-stone-600 text-[9px]">
                                            • <strong className="font-semibold text-stone-700" style={{ fontSize: '75%' }}>{formattedName}</strong>: <span className="font-medium text-stone-700">{qty.toFixed(3)} {item.unit}</span>
                                            {justification && <span className="text-stone-500 italic ml-1">{justification}</span>}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-stone-100 font-medium text-stone-700">
                            <td colSpan={2} className="py-2 text-right uppercase tracking-widest text-[9px] text-stone-400">Subtotal {provider}</td>
                            <td className="py-2 text-right text-[11px] font-bold text-stone-950">{providerTotal.toFixed(2)} €</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  );
                })}

                <div className="border-t-2 border-stone-200 mt-8 pt-4 flex justify-between items-center font-bold text-stone-900 print-avoid-break">
                  <div className="text-right uppercase tracking-widest text-[11px] text-stone-500 w-full">Total Pedido</div>
                  <div className="text-right text-teal-700 text-lg ml-8 whitespace-nowrap">{totalOrderCost.toFixed(2)} €</div>
                </div>
              </div>
              
              <div className="mt-auto pt-12 text-center">
                <p className="text-[9px] text-stone-400 uppercase tracking-[0.3em] font-sans">
                  Documento consolidado generado automáticamente · Proyecto Intermodular
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
