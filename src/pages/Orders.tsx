import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Search, ShoppingCart, Plus, Trash2, Calculator, Printer, User, Calendar, CheckSquare, Square, CheckCircle, ListFilter, Trash, FolderOpen, PlusCircle, X, ArrowLeft, AlertCircle, MessageSquare, Eye, PackagePlus, FileText } from 'lucide-react';
import MenuTile from '../components/MenuTile';
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
  isCustom?: boolean;
  byTeacher: Record<string, number>; // maps teacherName -> quantity
  teacherNotes?: Record<string, string>; // maps teacherName -> note
}

interface TeacherIngredient {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  provider?: string;
  isCustom?: boolean;
  notes?: string;
}

export default function Orders() {
  const { appUser, commissionMode } = useAuth();
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'docente';
  const canConsolidate = appUser?.role === 'admin' || appUser?.role === 'compras';
  const { users, recipes, ingredients, menus, settings, orders } = useData();
  const { showToast } = useToast();
  
  // Entry view state: null displays the initial 2-button landing choice menu
  const [entryChoice, setEntryChoice] = useState<'continue' | 'new' | 'consolidate' | null>(null);
  const [showConfirmNewModal, setShowConfirmNewModal] = useState(false);

  const [activeTab, setActiveTab] = useState<'create' | 'consolidate'>('create');
  
  // Create Tab States
  const [search, setSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const [orderItems, setOrderItems] = useState<(OrderItem & { inputValue?: string })[]>([]);
  const [orderTitle, setOrderTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // Anotaciones expandidas por item (key: `${type}-${id}`)
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  // Modal para pedir producto fuera de catálogo
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customQuantity, setCustomQuantity] = useState<number>(1);
  const [customUnit, setCustomUnit] = useState('ud');
  const [customProvider, setCustomProvider] = useState('');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [customNotes, setCustomNotes] = useState('');

  // Modal para ver detalles y anotaciones de un pedido (jefe de compras / admin)
  const [viewingOrderDetail, setViewingOrderDetail] = useState<Order | null>(null);

  // Consolidate Tab States
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<'provider' | 'teacher' | 'ingredient'>('provider');
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

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add item to local workspace and close the dropdown
  const addOrderItem = (id: string, type: 'recipe' | 'menu' | 'ingredient') => {
    if (!orderItems.find(item => item.id === id && item.type === type)) {
      setOrderItems([...orderItems, { id, type, quantity: 1 }]);
    }
    // Cierra el desplegable y reinicia la búsqueda tras añadir
    setSearch('');
    setIsSearchOpen(false);
  };

  // Open modal to order a custom product (outside of database)
  const openCustomProductModal = (prefillName: string = '') => {
    setCustomName(prefillName);
    setCustomQuantity(1);
    setCustomUnit('ud');
    setCustomProvider('');
    setCustomPrice('');
    setCustomNotes('');
    setShowCustomModal(true);
    // Cierra el desplegable de búsqueda si estaba abierto
    setIsSearchOpen(false);
  };

  // Submit custom product to local workspace only (never saved to ingredients collection)
  const handleAddCustomProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      showToast('Introduce el nombre del producto.', 'error');
      return;
    }
    const parsedPrice = parseFloat(customPrice);
    const validPrice = !isNaN(parsedPrice) && parsedPrice >= 0 ? parsedPrice : 0;
    const newItem: OrderItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'custom',
      quantity: Math.max(0.001, customQuantity || 1),
      customName: customName.trim(),
      customUnit: customUnit.trim() || 'ud',
      customProvider: customProvider.trim() || 'Fuera de catálogo / Especial',
      customEstimatedPrice: validPrice,
      notes: customNotes.trim() ? customNotes.trim() : undefined
    };

    setOrderItems([...orderItems, newItem]);
    setShowCustomModal(false);
    showToast(`"${newItem.customName}" añadido a tu pedido (fuera de catálogo)`, 'success');
  };

  // Update quantity in local workspace
  const updateOrderItemQuantity = (id: string, type: 'recipe' | 'menu' | 'ingredient' | 'custom', quantity: number, inputValue?: string) => {
    setOrderItems(orderItems.map(item => 
      item.id === id && item.type === type ? { ...item, quantity: Math.max(0, quantity), inputValue } : item
    ));
  };

  // Update notes/annotations for an item
  const updateOrderItemNotes = (id: string, type: 'recipe' | 'menu' | 'ingredient' | 'custom', notes: string) => {
    setOrderItems(orderItems.map(item => 
      item.id === id && item.type === type ? { ...item, notes: notes } : item
    ));
  };

  // Remove item from local workspace
  const removeOrderItem = (id: string, type: 'recipe' | 'menu' | 'ingredient' | 'custom') => {
    setOrderItems(orderItems.filter(item => !(item.id === id && item.type === type)));
  };

  // Save current workspace to Firestore (enforcing strictly 1 order per user)
  const handleSaveOrder = async (isDraft: boolean = true) => {
    if (orderItems.length === 0) {
      showToast('Añade al menos una receta, menú o ingrediente a tu pedido.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      // Find all existing orders of this user to enforce strictly 1 order per user
      const userOrders = orders.filter(o => o.userId === appUser?.uid || (appUser?.name && o.userName === appUser.name));
      const targetOrderId = editingOrderId || (userOrders.length > 0 ? userOrders[0].id : doc(collection(db, 'orders')).id);
      
      // Clean up any extra redundant orders if more than 1 existed
      for (const oldOrder of userOrders) {
        if (oldOrder.id !== targetOrderId) {
          try {
            await deleteDoc(doc(db, 'orders', oldOrder.id));
          } catch (e) {
            console.warn('Notice removing duplicate user order:', e);
          }
        }
      }

      const existingOrder = orders.find(o => o.id === targetOrderId);
      const titleStr = orderTitle.trim() || `Pedido de ${appUser?.name || 'Profesor'} - ${new Date().toLocaleDateString('es-ES')}`;
      
      let newStatus: 'draft' | 'pending' | 'completed' = 'draft';
      if (!isDraft) newStatus = 'pending';
      else if (existingOrder) newStatus = existingOrder.status;

      // Sanitize items: exclude frontend-only properties (inputValue) and undefined fields
      const cleanedItems: OrderItem[] = orderItems.map(item => {
        const clean: OrderItem = {
          id: item.id,
          type: item.type,
          quantity: item.quantity
        };
        if (item.justification) clean.justification = item.justification;
        if (item.notes && item.notes.trim()) clean.notes = item.notes.trim();
        if (item.customName) clean.customName = item.customName;
        if (item.customUnit) clean.customUnit = item.customUnit;
        if (item.customProvider) clean.customProvider = item.customProvider;
        if (item.customEstimatedPrice !== undefined && item.customEstimatedPrice !== null) {
          clean.customEstimatedPrice = item.customEstimatedPrice;
        }
        return clean;
      });

      const newOrder: Order = {
        id: targetOrderId,
        title: titleStr,
        userId: appUser?.uid || (existingOrder ? existingOrder.userId : ''),
        userName: appUser?.name || (existingOrder ? existingOrder.userName : 'Profesor'),
        items: cleanedItems,
        createdAt: existingOrder?.createdAt || new Date().toISOString(),
        status: newStatus
      };
      
      await setDoc(doc(db, 'orders', targetOrderId), newOrder);
      setEditingOrderId(targetOrderId);
      showToast(isDraft ? 'Pedido guardado (1 pedido activo por usuario).' : '¡Pedido enviado a consolidación!', 'success');
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
                if (item.notes) {
                  if (!aggregation[ing.id].teacherNotes) aggregation[ing.id].teacherNotes = {};
                  aggregation[ing.id].teacherNotes![source.userName] = item.notes;
                }
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
                  },
                  teacherNotes: item.notes ? { [source.userName]: item.notes } : {}
                };
              }
            }
          } else if (item.type === 'custom') {
            const requiredQty = item.quantity;
            const customId = item.id;
            const customName = item.customName || 'Producto fuera de catálogo';
            const customUnit = item.customUnit || 'ud';
            const customCost = item.customEstimatedPrice || 0;
            const customProvider = item.customProvider || 'Fuera de catálogo / Especial';
            const teacherLabel = item.justification 
              ? `${source.userName} (Justificación: ${item.justification})` 
              : source.userName;

            if (aggregation[customId]) {
              aggregation[customId].totalQuantity += requiredQty;
              aggregation[customId].totalCost += requiredQty * customCost;
              aggregation[customId].byTeacher[teacherLabel] = (aggregation[customId].byTeacher[teacherLabel] || 0) + requiredQty;
              if (item.notes) {
                if (!aggregation[customId].teacherNotes) aggregation[customId].teacherNotes = {};
                aggregation[customId].teacherNotes![source.userName] = item.notes;
              }
            } else {
              aggregation[customId] = {
                ingredientId: customId,
                name: customName,
                totalQuantity: requiredQty,
                unit: customUnit,
                costPerUnit: customCost,
                totalCost: requiredQty * customCost,
                provider: customProvider,
                isCustom: true,
                byTeacher: {
                  [teacherLabel]: requiredQty
                },
                teacherNotes: item.notes ? { [source.userName]: item.notes } : {}
              };
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
        const parts = teacher.split(' (Justificación:');
        const rawTeacherName = parts[0];
        const teacherNote = item.teacherNotes ? (item.teacherNotes[rawTeacherName] || item.teacherNotes[teacher]) : undefined;

        teacherGroups[teacher].push({
          ingredientId: item.ingredientId,
          name: item.name,
          quantity: qty,
          unit: item.unit,
          costPerUnit: item.costPerUnit,
          totalCost: qty * item.costPerUnit,
          provider: item.provider,
          isCustom: item.isCustom,
          notes: teacherNote
        });
      });
    });

    return teacherGroups;
  }, [aggregatedList]);

  const sortedTeachers = useMemo(() => {
    return Object.keys(groupedByTeacher).sort((a, b) => a.localeCompare(b));
  }, [groupedByTeacher]);

  const filteredRecipes = search.trim() === '' ? [] : recipes.filter(r => {
    if (!canViewItem(r, appUser, users, { commissionMode })) return false;
    return r.nameES.toLowerCase().includes(search.toLowerCase()) &&
           !orderItems.find(item => item.id === r.id && item.type === 'recipe');
  });

  const filteredMenus = search.trim() === '' ? [] : menus.filter(m => {
    const isOwner = m.createdBy === appUser?.name || m.createdBy === appUser?.uid || m.createdBy === appUser?.email || (appUser?.group && m.group === appUser?.group);
    if (!isOwner && !m.isPublic) return false;
    return m.nameES.toLowerCase().includes(search.toLowerCase()) &&
           !orderItems.find(item => item.id === m.id && item.type === 'menu');
  });

  const filteredIngredients = search.trim() === '' ? [] : ingredients.filter(i => {
    return i.nameES.toLowerCase().includes(search.toLowerCase()) &&
           !orderItems.find(item => item.id === i.id && item.type === 'ingredient');
  });

  // Consolidated production items list (used in summary card & print preview)
  const consolidatedProduction = useMemo(() => {
    if (activeTab === 'create') {
      return orderItems.filter(item => item.quantity > 0).map(item => {
        const isRecipe = item.type === 'recipe';
        const isMenu = item.type === 'menu';
        const isCustom = item.type === 'custom';
        let name = '';
        if (isRecipe) name = recipes.find(r => r.id === item.id)?.nameES || '';
        else if (isMenu) name = menus.find(m => m.id === item.id)?.nameES || '';
        else if (isCustom) name = item.customName || 'Producto fuera de catálogo';
        else name = ingredients.find(i => i.id === item.id)?.nameES || '';

        return {
          name,
          type: isRecipe ? 'Receta' : isMenu ? 'Menú' : isCustom ? 'Fuera de catálogo' : 'Ingrediente Directo',
          quantity: item.quantity,
          unit: isCustom ? (item.customUnit || 'ud') : undefined,
          teacherName: appUser?.name || 'Profesor',
          justification: item.type === 'ingredient' ? item.justification : undefined,
          notes: item.notes,
          isCustom
        };
      });
    } else {
      const prodItems: { name: string; type: string; quantity: number; unit?: string; teacherName: string; justification?: string; notes?: string; isCustom?: boolean; }[] = [];
      orders.filter(o => selectedOrderIds.includes(o.id)).forEach(order => {
        order.items.forEach(item => {
          if (item.quantity > 0) {
            const isRecipe = item.type === 'recipe';
            const isMenu = item.type === 'menu';
            const isCustom = item.type === 'custom';
            let name = '';
            if (isRecipe) name = recipes.find(r => r.id === item.id)?.nameES || '';
            else if (isMenu) name = menus.find(m => m.id === item.id)?.nameES || '';
            else if (isCustom) name = item.customName || 'Producto fuera de catálogo';
            else name = ingredients.find(i => i.id === item.id)?.nameES || '';

            prodItems.push({
              name,
              type: isRecipe ? 'Receta' : isMenu ? 'Menú' : isCustom ? 'Fuera de catálogo' : 'Ingrediente Directo',
              quantity: item.quantity,
              unit: isCustom ? (item.customUnit || 'ud') : undefined,
              teacherName: order.userName,
              justification: item.type === 'ingredient' ? item.justification : undefined,
              notes: item.notes,
              isCustom
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
          margin: [10, 12, 12, 12], // 10mm top, 12mm sides and bottom on every page
          filename: `Pedido_Consolidado_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            scrollX: 0, 
            scrollY: 0, 
            windowWidth: 700,
            backgroundColor: '#ffffff'
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
          pagebreak: { 
            mode: ['avoid-all', 'css', 'legacy'],
            avoid: ['tr', '.print-avoid-break', 'thead', 'tfoot', '.provider-section', '.teacher-section']
          }
        };
        
        generatePDF(printRef.current, opt)
          .then(() => {
            setIsPrinting(false);
            showToast('PDF generado correctamente', 'success');
          })
          .catch((err: any) => {
            console.error('Error generating PDF:', err);
            setIsPrinting(false);
            showToast('Error al generar el PDF. Por favor, inténtalo de nuevo.', 'error');
          });
      } else {
        setIsPrinting(false);
      }
    }, 400);
  };

  // User's saved orders (sorted newest first)
  const mySavedOrders = useMemo(() => {
    return orders
      .filter(o => o.userId === appUser?.uid || (appUser?.name && o.userName === appUser.name))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, appUser]);

  const userSavedOrder = mySavedOrders[0] || null;

  const handleContinuePrevious = () => {
    if (!userSavedOrder) {
      showToast('No tienes ningún pedido anterior guardado.', 'error');
      return;
    }
    setEditingOrderId(userSavedOrder.id);
    setOrderTitle(userSavedOrder.title);
    setOrderItems(userSavedOrder.items);
    setActiveTab('create');
    setEntryChoice('continue');
    showToast(`Pedido "${userSavedOrder.title}" cargado para editar.`, 'info');
  };

  const startFreshOrder = () => {
    setEditingOrderId(userSavedOrder ? userSavedOrder.id : null);
    setOrderItems([]);
    setOrderTitle('');
    setActiveTab('create');
    setEntryChoice('new');
    setShowConfirmNewModal(false);
  };

  const handleStartNewOrderClick = () => {
    if (userSavedOrder) {
      showToast('Ya tienes un pedido activo guardado. Cada usuario solo puede mantener un pedido.', 'info');
      return;
    }
    startFreshOrder();
  };

  // ==================== INITIAL ENTRY SELECTION MENU ====================
  if (entryChoice === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-6 sm:p-10 max-w-5xl mx-auto text-center font-sans pb-24 relative z-10">
        {/* Header */}
        <div className="mb-10 max-w-xl">
          <h1 className="text-3xl sm:text-5xl font-bold text-stone-800 mb-3 font-serif tracking-tight">
            Gestión de Pedidos
          </h1>
          <p className="text-stone-500 text-sm sm:text-base leading-relaxed">
            Selecciona la opción con la que deseas trabajar. Recuerda que cada usuario mantiene un único pedido activo.
          </p>
        </div>

        {/* Action Buttons: MenuTile style (similar to Home) */}
        <div className="flex flex-wrap items-start justify-center gap-8 sm:gap-10 md:gap-14 mb-8">
          {/* Botón 1: Continuar con el pedido anterior */}
          <button
            type="button"
            disabled={!userSavedOrder}
            onClick={() => {
              if (userSavedOrder) {
                handleContinuePrevious();
              }
            }}
            className={`group flex flex-col items-center text-center transition-all focus:outline-none ${
              userSavedOrder
                ? 'cursor-pointer hover:-translate-y-1'
                : 'opacity-40 cursor-not-allowed grayscale select-none'
            }`}
            title={userSavedOrder ? `Continuar con "${userSavedOrder.title}"` : 'No tienes ningún pedido guardado actualmente'}
          >
            <MenuTile
              label="CONTINUAR"
              icon="anterior"
              className={`w-32 h-32 md:w-36 md:h-36 transition-transform ${
                userSavedOrder ? 'group-hover:scale-105' : ''
              }`}
            />
            <span className={`font-bold text-sm sm:text-base mt-3.5 transition-colors ${
              userSavedOrder ? 'text-stone-800 group-hover:text-teal-700' : 'text-stone-400'
            }`}>
              Continuar pedido
            </span>
            <span className="text-xs text-stone-500 max-w-[150px] leading-snug mt-0.5">
              {userSavedOrder ? 'Editar pedido anterior' : 'Sin pedido guardado'}
            </span>
            {userSavedOrder ? (
              <span className="mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                1 activo
              </span>
            ) : (
              <span className="mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 text-stone-400 border border-stone-200">
                Desactivado
              </span>
            )}
          </button>

          {/* Botón 2: Iniciar nuevo pedido (DESACTIVADO si ya tiene pedido activo) */}
          <button
            type="button"
            disabled={Boolean(userSavedOrder)}
            onClick={userSavedOrder ? undefined : handleStartNewOrderClick}
            className={`group flex flex-col items-center text-center transition-all focus:outline-none ${
              userSavedOrder
                ? 'opacity-40 cursor-not-allowed grayscale select-none'
                : 'cursor-pointer hover:-translate-y-1'
            }`}
            title={
              userSavedOrder
                ? `Ya tienes un pedido activo guardado ("${userSavedOrder.title}"). Solo se permite 1 pedido por usuario. Edita el anterior o elimínalo si deseas empezar de nuevo.`
                : 'Iniciar nuevo pedido desde cero'
            }
          >
            <MenuTile
              label="NUEVO"
              icon="nuevo"
              className={`w-32 h-32 md:w-36 md:h-36 transition-transform ${
                userSavedOrder ? '' : 'group-hover:scale-105'
              }`}
            />
            <span className={`font-bold text-sm sm:text-base mt-3.5 transition-colors ${
              userSavedOrder ? 'text-stone-400' : 'text-stone-800 group-hover:text-teal-700'
            }`}>
              Nuevo pedido
            </span>
            <span className="text-xs text-stone-500 max-w-[150px] leading-snug mt-0.5">
              {userSavedOrder ? 'Ya tienes un pedido activo' : 'Iniciar desde cero'}
            </span>
            {userSavedOrder ? (
              <span className="mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-stone-200/90 text-stone-500 border border-stone-300">
                Desactivado (1 máx.)
              </span>
            ) : (
              <span className="mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                Disponible
              </span>
            )}
          </button>

          {/* Botón 3: Consolidación de pedidos (SOLO visible para Administrador y Compras) */}
          {canConsolidate && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('consolidate');
                setEntryChoice('consolidate');
              }}
              className="group flex flex-col items-center text-center transition-all focus:outline-none cursor-pointer hover:-translate-y-1"
              title="Consolidación de pedidos por proveedor o docente"
            >
              <MenuTile
                label="CONSOLIDAR"
                icon="consolidar"
                className="w-32 h-32 md:w-36 md:h-36 group-hover:scale-105 transition-transform"
              />
              <span className="font-bold text-stone-800 text-sm sm:text-base mt-3.5 group-hover:text-teal-700 transition-colors">
                Consolidación
              </span>
              <span className="text-xs text-stone-500 max-w-[150px] leading-snug mt-0.5">
                Compras y economato
              </span>
              <span className="mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
              </span>
            </button>
          )}
        </div>

        {/* Modal de confirmación si ya tiene pedido guardado al pulsar "Iniciar nuevo pedido" */}
        {showConfirmNewModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                <AlertCircle size={26} />
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">
                ¿Iniciar un nuevo pedido?
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 mb-4 leading-relaxed">
                Ya tienes un pedido guardado en el sistema: <strong className="text-stone-900">"{userSavedOrder?.title}"</strong>.
                <br /><br />
                Todos los usuarios pueden tener <strong>únicamente un pedido guardado</strong>. Si inicias un nuevo pedido y lo guardas, tu pedido anterior será reemplazado.
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmNewModal(false);
                    handleContinuePrevious();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                >
                  Continuar con el anterior
                </button>
                <button
                  type="button"
                  onClick={startFreshOrder}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors"
                >
                  Sí, iniciar nuevo pedido
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl font-sans pb-28 relative z-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEntryChoice(null)}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-950 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm"
            title="Volver al menú de pedidos"
          >
            <ArrowLeft size={16} className="text-teal-600" />
            <span className="hidden sm:inline">Menú de Pedidos</span>
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">Pedidos</h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              {activeTab === 'create' 
                ? (editingOrderId ? 'Editando tu pedido guardado' : 'Configura tu pedido semanal') 
                : 'Consolidación de pedidos para compras y economato'}
            </p>
          </div>
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

      {activeTab === 'create' ? (
        /* ================= CREATE / EDIT ORDER VIEW ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Añadir al Pedido (Buscador) */}
          <div className="lg:col-span-5 space-y-4">
            <div ref={searchBoxRef} className="bg-white rounded-xl shadow-md border-2 border-stone-200 p-3 sm:p-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0">
                  <PlusCircle size={16} className="text-teal-600" />
                  Añadir al Pedido
                </h3>
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" size={13} />
                  <input
                    type="text"
                    placeholder="buscar ingredientes, recetas..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => {
                      if (search.trim() !== '') setIsSearchOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsSearchOpen(false);
                      }
                    }}
                    className="w-full pl-8 pr-7 py-1 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs text-stone-800 placeholder:text-stone-400"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setIsSearchOpen(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 rounded-full"
                      title="Limpiar y cerrar búsqueda"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {search.trim() !== '' && isSearchOpen ? (
                <div className="mt-2 pt-2 border-t border-stone-100 max-h-[220px] overflow-y-auto space-y-2.5 pr-1">
                  {filteredMenus.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 px-1">
                        Menús ({filteredMenus.length})
                      </div>
                      <div className="space-y-1">
                        {filteredMenus.map(menu => (
                          <div key={menu.id} className="flex justify-between items-center py-1.5 px-2 hover:bg-stone-50 rounded-lg transition-colors border border-transparent hover:border-stone-100 text-xs">
                            <span className="font-semibold text-stone-800 truncate mr-2">{menu.nameES}</span>
                            <button
                              type="button"
                              onClick={() => addOrderItem(menu.id, 'menu')}
                              className="text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 font-bold text-xs shrink-0"
                              title="Añadir menú al pedido"
                            >
                              <Plus size={13} />
                              Añadir
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {filteredRecipes.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 px-1">
                        Recetas ({filteredRecipes.length})
                      </div>
                      <div className="space-y-1">
                        {filteredRecipes.map(recipe => (
                          <div key={recipe.id} className="flex justify-between items-center py-1.5 px-2 hover:bg-stone-50 rounded-lg transition-colors border border-transparent hover:border-stone-100 text-xs">
                            <span className="font-semibold text-stone-800 truncate mr-2">{recipe.nameES}</span>
                            <button
                              type="button"
                              onClick={() => addOrderItem(recipe.id, 'recipe')}
                              className="text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 font-bold text-xs shrink-0"
                              title="Añadir receta al pedido"
                            >
                              <Plus size={13} />
                              Añadir
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredIngredients.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1 px-1">
                        Ingredientes Directos ({filteredIngredients.length})
                      </div>
                      <div className="space-y-1">
                        {filteredIngredients.slice(0, 30).map(ing => (
                          <div key={ing.id} className="flex justify-between items-center py-1.5 px-2 hover:bg-stone-50 rounded-lg transition-colors border border-transparent hover:border-stone-100 text-xs">
                            <span className="font-semibold text-stone-800 truncate mr-2">
                              {ing.nameES} <span className="text-[11px] text-stone-400 font-mono">({ing.unit})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => addOrderItem(ing.id, 'ingredient')}
                              className="text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 font-bold text-xs shrink-0"
                              title="Añadir ingrediente al pedido"
                            >
                              <Plus size={13} />
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
                    <div className="text-center py-4 px-2 text-stone-400 text-xs">
                      <p>No se encontraron resultados para "{search}".</p>
                      <button
                        type="button"
                        onClick={() => openCustomProductModal(search)}
                        className="mt-2 text-xs text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Plus size={13} />
                        Pedir "{search}" fuera de catálogo
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-3.5 px-3 border border-dashed border-stone-200 rounded-lg bg-stone-50/60 flex items-center justify-center gap-2">
                  <Search size={14} className="text-stone-400 shrink-0" />
                  <p className="text-xs text-stone-500 font-medium">
                    Escribe en el buscador para añadir recetas, menús o ingredientes
                  </p>
                </div>
              )}

              {/* Botón para solicitar producto fuera de catálogo (sin añadir a BD) */}
              <div className="mt-2.5 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => openCustomProductModal()}
                  className="w-full py-1.5 px-2.5 bg-stone-50 hover:bg-teal-50/70 border border-dashed border-stone-300 hover:border-teal-400 rounded-lg text-xs text-stone-700 hover:text-teal-800 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  title="Pedir un producto especial no disponible en el catálogo"
                >
                  <PlusCircle size={14} className="text-teal-600 shrink-0" />
                  <span>¿No encuentras un producto? <strong>Pedir fuera de catálogo</strong></span>
                </button>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Formulario del Pedido */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-xl shadow-md border-2 border-stone-200 p-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={18} className="text-teal-600" />
                  <h2 className="text-base font-bold text-stone-900">
                    {editingOrderId ? 'Editando Pedido' : 'Nuevo Pedido'}
                  </h2>
                  {editingOrderId && (
                    <span className="text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Pedido Activo
                    </span>
                  )}
                </div>
                {editingOrderId && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteOrder(editingOrderId);
                      setEditingOrderId(null);
                      setOrderItems([]);
                      setOrderTitle('');
                      setEntryChoice(null);
                    }}
                    className="text-xs text-stone-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 font-medium"
                    title="Eliminar este pedido guardado"
                  >
                    <Trash2 size={13} />
                    <span>Eliminar pedido</span>
                  </button>
                )}
              </div>

              <div className="mb-3.5">
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">
                  Título o Identificador del Pedido
                </label>
                <input
                  type="text"
                  placeholder="PTU RA1..."
                  value={orderTitle}
                  onChange={(e) => setOrderTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                />
              </div>

              {orderItems.length === 0 ? (
                <div className="text-center py-12 px-4 border-2 border-dashed border-stone-200 rounded-xl bg-stone-50/60 mb-4">
                  <ShoppingCart size={32} className="mx-auto text-stone-300 mb-2" />
                  <p className="text-sm font-semibold text-stone-700">El pedido está vacío</p>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                    Busca recetas, menús o ingredientes en el panel izquierdo, o solicita un producto fuera de catálogo.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 mb-4 max-h-[460px] overflow-y-auto pr-1">
                  {orderItems.map(item => {
                    const isRecipe = item.type === 'recipe';
                    const isMenu = item.type === 'menu';
                    const isIngredient = item.type === 'ingredient';
                    const isCustom = item.type === 'custom';

                    const data = isRecipe 
                      ? recipes.find(r => r.id === item.id) 
                      : isMenu 
                        ? menus.find(m => m.id === item.id)
                        : isIngredient
                          ? ingredients.find(i => i.id === item.id)
                          : null;

                    if (!isCustom && !data) return null;

                    const itemName = isCustom
                      ? item.customName || 'Producto no catalogado'
                      : isIngredient
                        ? (data as Ingredient).nameES
                        : (data as Recipe).nameES;

                    const itemKey = `${item.type}-${item.id}`;
                    const isNoteOpen = expandedNotes[itemKey] || Boolean(item.notes && item.notes.trim() !== '');

                    return (
                      <div key={itemKey} className="bg-stone-50 rounded-lg border border-stone-200 hover:border-stone-300 transition-colors p-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0 text-sm flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-stone-900 truncate">
                              {itemName}
                            </span>
                            {isCustom ? (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1 flex-shrink-0">
                                Fuera de catálogo ({item.customUnit || 'ud'})
                              </span>
                            ) : isIngredient ? (
                              <span className="text-xs text-stone-500 font-mono flex-shrink-0">
                                ({ (data as Ingredient).unit })
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-stone-500 bg-stone-200/80 px-1.5 py-0.5 rounded flex-shrink-0">
                                {isRecipe ? 'Receta' : 'Menú'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-xs text-stone-500 font-medium">
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

                          {/* Botón para añadir/editar anotación para compras */}
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedNotes(prev => ({ ...prev, [itemKey]: !prev[itemKey] }));
                            }}
                            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 flex-shrink-0 ${
                              item.notes && item.notes.trim() !== ''
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                                : 'text-stone-400 hover:text-stone-700 hover:bg-stone-200/60'
                            }`}
                            title={item.notes ? `Nota para compras: "${item.notes}"` : 'Añadir anotación o especificación para el jefe de compras'}
                          >
                            <MessageSquare size={14} className={item.notes ? 'text-amber-700' : 'text-stone-400'} />
                            <span className="text-[10px] hidden sm:inline">
                              {item.notes ? 'Nota' : '+ Nota'}
                            </span>
                          </button>

                          <button
                            onClick={() => removeOrderItem(item.id, item.type)}
                            className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                            title="Eliminar del pedido"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Campo de anotación para el jefe de compras */}
                        {isNoteOpen && (
                          <div className="mt-2 pt-2 border-t border-stone-200/70 flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                placeholder="Anotación para compras (ej. marca, calibre, madurez, formato específico...)"
                                value={item.notes || ''}
                                onChange={(e) => updateOrderItemNotes(item.id, item.type, e.target.value)}
                                className="w-full text-xs px-2.5 py-1.5 bg-white border border-amber-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-400 rounded-md text-stone-900 placeholder:text-stone-400"
                              />
                            </div>
                            {item.notes && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateOrderItemNotes(item.id, item.type, '');
                                  setExpandedNotes(prev => ({ ...prev, [itemKey]: false }));
                                }}
                                className="text-[11px] text-stone-400 hover:text-red-600 px-1 py-1 rounded transition-colors whitespace-nowrap"
                                title="Borrar anotación"
                              >
                                Borrar nota
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-100">
                <span className="text-xs text-stone-500 font-medium">
                  {orderItems.length} {orderItems.length === 1 ? 'artículo' : 'artículos'}
                </span>
                <div className="flex items-center gap-2">
                  {editingOrderId && (
                    <button
                      onClick={() => {
                        setEditingOrderId(null);
                        setOrderItems([]);
                        setOrderTitle('');
                        setEntryChoice(null);
                      }}
                      className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium py-1.5 px-3 rounded-lg transition-colors text-xs"
                    >
                      Cerrar
                    </button>
                  )}
                  {orderItems.length > 0 && (
                    <>
                      <button
                        onClick={() => handleSaveOrder(true)}
                        disabled={isSaving}
                        className="bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold py-1.5 px-3.5 rounded-lg border border-teal-200 transition-colors text-xs disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isSaving ? '...' : (editingOrderId ? 'Guardar Cambios' : 'Guardar Borrador')}
                      </button>
                      <button
                        onClick={() => handleSaveOrder(false)}
                        disabled={isSaving}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-1.5 px-3.5 rounded-lg transition-colors shadow-sm text-xs disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isSaving ? 'Enviando...' : 'Enviar Pedido'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= CONSOLIDATE VIEW ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* ==================== LEFT COLUMN: PEDIDOS DEL PROFESORADO ==================== */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-xl shadow-md border-2 border-stone-200 p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-stone-100 pb-2">
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
                          <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ${order.status === 'completed' ? 'bg-green-100 text-green-800' : order.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-600'}`}>
                            {order.status === 'completed' ? 'Completado' : order.status === 'pending' ? 'Pendiente' : 'Borrador'}
                          </span>
                        </div>
                        
                        <p className="text-xs text-stone-600 mt-1 flex items-center gap-1">
                          <span className="font-medium text-stone-800">{order.userName}</span>
                        </p>

                        {/* Badges de notas y productos fuera de catálogo */}
                        {(() => {
                          const hasNotes = order.items.some(i => i.notes && i.notes.trim() !== '');
                          const hasCustom = order.items.some(i => i.type === 'custom');
                          if (!hasNotes && !hasCustom) return null;
                          return (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {hasNotes && (
                                <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <MessageSquare size={10} className="text-amber-700" /> Con notas
                                </span>
                              )}
                              {hasCustom && (
                                <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                                  Fuera de catálogo
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        
                        <div className="text-[10px] text-stone-500 mt-2 flex justify-between items-center">
                          <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                          <span className="font-semibold text-stone-700">
                            {order.items.reduce((sum, i) => sum + i.quantity, 0)} items
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingOrderDetail(order);
                          }}
                          className="mt-2 text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-stone-100 hover:bg-teal-50 px-2 py-1 rounded-md transition-colors flex items-center gap-1 w-fit border border-stone-200 hover:border-teal-200"
                        >
                          <Eye size={12} />
                          Ver pedido y notas
                        </button>
                      </div>
                    </div>
                  );
                })}
                {orders.length === 0 && (
                  <div className="text-center py-8 text-stone-400 text-sm border-2 border-dashed border-stone-100 rounded-lg bg-stone-50/50">
                    <FolderOpen size={24} className=" text-stone-300 mb-1" />
                    No hay ningún pedido guardado.
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
          </div>

          {/* ==================== RIGHT COLUMN: LISTA DE COMPRA CONSOLIDADA ==================== */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-xl shadow-md border-2 border-stone-200 overflow-hidden sticky top-8">
              <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calculator size={20} className="text-teal-600" />
                  <div>
                    <h2 className="text-base font-bold text-stone-900">
                      Lista de Compra Consolidada
                    </h2>
                    <p className="text-xs text-stone-500">
                      {`Ingredientes combinados de ${selectedOrderIds.length} pedidos`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end">
                  <div className="flex items-center gap-2 mr-2 border-r border-stone-200 pr-4">
                    <select
                      value={groupBy}
                      onChange={(e) => setGroupBy(e.target.value as 'provider' | 'teacher' | 'ingredient')}
                      className="text-xs border border-stone-200 rounded-lg bg-stone-50 text-stone-600 focus:ring-teal-500 py-1.5 pl-2 pr-6"
                    >
                      <option value="provider">Ordenado por Proveedor</option>
                      <option value="teacher">Ordenado por Profesor</option>
                      <option value="ingredient">Ordenado por Lista</option>
                    </select>
                  </div>
                  <button
                    onClick={exportPDF}
                    disabled={isPrinting || aggregatedList.length === 0}
                    className="px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-teal-700 bg-white hover:bg-stone-50 rounded-lg border border-stone-200 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Descargar PDF Consolidado de Compra"
                  >
                    <Printer size={16} className="text-teal-600" />
                    <span>{isPrinting ? 'Generando PDF...' : 'Imprimir / PDF'}</span>
                  </button>
                  <div className="text-right">
                    <div className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">Coste Total</div>
                    <div className="text-xl font-black text-teal-700">{totalOrderCost.toFixed(2)} €</div>
                  </div>
                </div>
              </div>

              <div className="p-0 max-h-[600px] overflow-y-auto">
                {aggregatedList.length > 0 ? (
                  <>
                    {groupBy === 'provider' ? (
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
                          {sortedProviders.map(provider => {
                            const providerItems = groupedIngredients[provider];
                            const providerTotal = providerItems.reduce((sum, item) => sum + item.totalCost, 0);

                            return (
                              <React.Fragment key={provider}>
                                <tr className="bg-stone-100/90 border-y border-stone-200">
                                  <td colSpan={2} className="px-6 py-2 text-xs font-bold text-stone-800 uppercase tracking-wider">
                                    {provider} ({providerItems.length} {providerItems.length === 1 ? 'producto' : 'productos'})
                                  </td>
                                  <td className="px-6 py-2 text-xs font-bold text-stone-900 text-right">
                                    Subtotal: {providerTotal.toFixed(2)} €
                                  </td>
                                </tr>
                                {providerItems.map((item) => {
                                  const teacherBreakdown = Object.entries(item.byTeacher || {})
                                    .map(([t, q]) => `${formatTeacherName(t)}: ${q % 1 === 0 ? q : q.toFixed(2)} ${item.unit}`)
                                    .join(' · ');

                                  return (
                                    <tr key={item.ingredientId} className="hover:bg-stone-50/50 transition-colors">
                                      <td className="px-6 py-2.5 pl-8">
                                        <div className="text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                                          <span>{item.name}</span>
                                          {item.isCustom && (
                                            <span className="text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                                              Fuera de catálogo
                                            </span>
                                          )}
                                        </div>
                                        {teacherBreakdown && (
                                          <div className="text-xs text-stone-500 mt-0.5">
                                            Solicitado por: <span className="text-stone-700">{teacherBreakdown}</span>
                                          </div>
                                        )}
                                        {item.teacherNotes && Object.keys(item.teacherNotes).length > 0 && (
                                          <div className="mt-1 space-y-1">
                                            {Object.entries(item.teacherNotes).map(([teacher, note]) => (
                                              <div key={teacher} className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 flex items-start gap-1 font-medium">
                                                <MessageSquare size={12} className="text-amber-600 shrink-0 mt-0.5" />
                                                <span><strong>{formatTeacherName(teacher)}:</strong> {note}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-6 py-2.5 text-right">
                                        <div className="text-sm font-bold text-stone-900">
                                          {item.totalQuantity.toFixed(3)} <span className="text-stone-500 font-normal">{item.unit}</span>
                                        </div>
                                        {item.costPerUnit > 0 && (
                                          <div className="text-[11px] text-stone-400">
                                            {item.costPerUnit.toFixed(2)} €/{item.unit}
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-6 py-2.5 text-right">
                                        <div className="text-sm text-stone-900 font-bold">
                                          {item.totalCost.toFixed(2)} €
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : groupBy === 'teacher' ? (
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
                                      <div className="text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                                        <span>{item.name}</span>
                                        {item.isCustom && (
                                          <span className="text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                                            Fuera de catálogo
                                          </span>
                                        )}
                                      </div>
                                      {item.notes && (
                                        <div className="mt-1 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 flex items-start gap-1 font-medium">
                                          <MessageSquare size={12} className="text-amber-600 shrink-0 mt-0.5" />
                                          <span><strong>Anotación para compras:</strong> {item.notes}</span>
                                        </div>
                                      )}
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
                    ) : (
                      /* ================= GROUPED BY INGREDIENT VIEW ================= */
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-stone-50 border-b border-stone-200">
                            <th className="px-6 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wider">Ingrediente</th>
                            <th className="px-6 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Cantidad</th>
                            <th className="px-6 py-2.5 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Coste Est.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {aggregatedList.map((item) => (
                            <tr key={item.ingredientId} className="hover:bg-stone-50/30 transition-colors bg-white">
                              <td className="px-6 py-3 pl-8">
                                <div className="text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                                  <span>{item.name}</span>
                                  {item.isCustom && (
                                    <span className="text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                                      Fuera de catálogo
                                    </span>
                                  )}
                                </div>
                                {item.teacherNotes && Object.keys(item.teacherNotes).length > 0 && (
                                  <div className="mt-1 space-y-1">
                                    {Object.entries(item.teacherNotes).map(([teacher, note]) => (
                                      <div key={teacher} className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 flex items-start gap-1 font-medium">
                                        <MessageSquare size={12} className="text-amber-600 shrink-0 mt-0.5" />
                                        <span><strong>{formatTeacherName(teacher)}:</strong> {note}</span>
                                      </div>
                                    ))}
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
                        </tbody>
                      </table>
                    )}
                  </>
                ) : (
                  <div className="p-16 text-center text-stone-500">
                    <Calculator size={48} className=" text-stone-300 mb-4" />
                    <p className="text-sm font-medium">Selecciona pedidos de la lista para ver la consolidación detallada.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PRINT LAYOUT (PDF & PRINT) ==================== */}
      {isPrinting && (
        <div style={{ position: 'fixed', left: '-9999px', top: '0px', width: '700px', zIndex: -9999, background: '#ffffff' }}>
          <div ref={printRef} className="print-orders-container bg-white text-stone-900 font-sans w-[700px] p-2 flex flex-col relative">
            <style>{`
              .print-orders-container {
                background-color: #ffffff !important;
                color: #1c1917 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                font-size: 11px !important;
                line-height: 1.4 !important;
              }
              .print-orders-container * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box !important;
              }
              .print-logo {
                max-height: 42px !important;
                max-width: 150px !important;
                height: 42px !important;
                width: auto !important;
                object-fit: contain !important;
                display: block !important;
              }
              .print-avoid-break {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              thead {
                display: table-header-group !important;
              }
              tfoot {
                display: table-footer-group !important;
              }
            `}</style>

            <div className="z-10 w-full">
              {/* Header Principal */}
              <div className="border-b-2 border-stone-800 pb-3 mb-5">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    {settings?.logoUrl ? (
                      <img
                        src={settings.logoUrl}
                        alt="Logo"
                        className="print-logo"
                        style={{
                          maxHeight: '42px',
                          maxWidth: '150px',
                          height: '42px',
                          width: 'auto',
                          objectFit: 'contain',
                          display: 'block'
                        }}
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="font-bold text-base tracking-wider uppercase text-stone-900">
                        CIFP HOSTELERÍA
                      </div>
                    )}
                    <div className="border-l border-stone-300 pl-3">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-stone-500 block">
                        Departamento de Hostelería y Cocina
                      </span>
                      <span className="text-xs font-semibold text-stone-800 block">
                        Control de Compras y Suministros
                      </span>
                    </div>
                  </div>

                  <div className="text-right bg-stone-50 border border-stone-200 px-3 py-1.5 rounded">
                    <div className="text-[9px] text-stone-500 uppercase font-bold tracking-widest">
                      Coste Total Estimado
                    </div>
                    <div className="text-xl font-bold text-stone-900">
                      {totalOrderCost.toFixed(2)} €
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-end pt-2 border-t border-stone-200 text-xs">
                  <div>
                    <h1 className="text-sm font-bold uppercase tracking-wide text-stone-900">
                      {activeTab === 'create' ? 'Lista de Pedido Personal' : 'Lista de Pedidos Consolidados'}
                    </h1>
                    <p className="text-[10px] text-stone-600 mt-0.5">
                      {activeTab === 'create'
                        ? `Solicitante: ${appUser?.name || 'Usuario'} · Grupo: ${appUser?.group || '-'} · Curso: ${appUser?.course || '-'}`
                        : `Consolidación de ${selectedOrderIds.length} ${selectedOrderIds.length === 1 ? 'pedido' : 'pedidos'} · Vista: ${
                            groupBy === 'provider' ? 'Por Proveedor' : groupBy === 'teacher' ? 'Por Profesor' : 'Listado General'
                          }`}
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-stone-600">
                    <p><span className="font-semibold text-stone-700">Fecha de emisión:</span> {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p><span className="font-semibold text-stone-700">Total referencias:</span> {aggregatedList.length} ingredientes</p>
                  </div>
                </div>
              </div>

              {/* Contenido Principal de las Listas */}
              <div>
                {groupBy === 'provider' ? (
                  <div className="border border-stone-300 rounded overflow-hidden mb-5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-800 text-white uppercase tracking-wider text-[9px]">
                          <th className="py-2 px-2 w-8 text-center border-r border-stone-700">✓</th>
                          <th className="py-2 px-2.5 font-bold w-44">Ingrediente</th>
                          <th className="py-2 px-2 font-bold text-right w-24">Cantidad Total</th>
                          <th className="py-2 px-2 font-bold text-right w-16">P. Unit.</th>
                          <th className="py-2 px-2 font-bold text-right w-20">Coste Est.</th>
                          <th className="py-2 px-2.5 font-bold">Solicitado por / Reparto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {sortedProviders.map((provider) => {
                          const providerItems = groupedIngredients[provider];
                          const providerTotal = providerItems.reduce((sum, item) => sum + item.totalCost, 0);

                          return (
                            <React.Fragment key={provider}>
                              {/* Provider Category Header Row */}
                              <tr className="bg-stone-200 text-stone-900 border-t-2 border-b border-stone-400 print-avoid-break">
                                <td colSpan={6} className="py-2 px-2.5">
                                  <div className="flex justify-between items-center text-xs font-bold">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full bg-stone-700 inline-block"></span>
                                      <span className="uppercase tracking-wider">PROVEEDOR: {provider}</span>
                                      <span className="text-[10px] text-stone-600 font-normal">
                                        ({providerItems.length} {providerItems.length === 1 ? 'producto' : 'productos'})
                                      </span>
                                    </div>
                                    <span className="text-[11px] font-bold text-stone-900 bg-white/70 px-2 py-0.5 rounded border border-stone-300">
                                      Subtotal: {providerTotal.toFixed(2)} €
                                    </span>
                                  </div>
                                </td>
                              </tr>

                              {/* Product rows for this provider */}
                              {providerItems.map((item, idx) => {
                                const teacherBreakdown = Object.entries(item.byTeacher || {})
                                  .map(([t, q]) => `${formatTeacherName(t)}: ${q % 1 === 0 ? q : q.toFixed(2)} ${item.unit}`)
                                  .join(', ');

                                return (
                                  <tr
                                    key={item.ingredientId || idx}
                                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/80'} print-avoid-break text-[10px]`}
                                  >
                                    <td className="py-1.5 px-2 text-center border-r border-stone-200 align-middle">
                                      <span className="inline-block w-3.5 h-3.5 border border-stone-400 rounded-sm"></span>
                                    </td>
                                    <td className="py-1.5 px-2.5 font-semibold text-stone-900 align-middle">
                                      <div>{item.name} {item.isCustom ? '(Fuera de catálogo)' : ''}</div>
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-bold text-stone-900 whitespace-nowrap align-middle">
                                      {item.totalQuantity.toFixed(3)} {item.unit}
                                    </td>
                                    <td className="py-1.5 px-2 text-right text-stone-600 whitespace-nowrap align-middle">
                                      {item.costPerUnit > 0 ? `${item.costPerUnit.toFixed(2)} €` : '-'}
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-bold text-stone-900 whitespace-nowrap align-middle">
                                      {item.totalCost.toFixed(2)} €
                                    </td>
                                    <td className="py-1.5 px-2.5 text-stone-600 text-[9.5px] leading-snug align-middle">
                                      <div>{teacherBreakdown || '-'}</div>
                                      {item.teacherNotes && Object.keys(item.teacherNotes).length > 0 && (
                                        <div className="text-[9px] text-amber-900 font-semibold mt-0.5">
                                          {Object.entries(item.teacherNotes).map(([t, n]) => `[Nota ${formatTeacherName(t)}: ${n}]`).join(' · ')}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-stone-100 border-t-2 border-stone-400 font-bold text-stone-900">
                          <td colSpan={4} className="py-2.5 px-2.5 text-right uppercase tracking-wider text-[10px] text-stone-700">
                            Total Estimado Proveedores:
                          </td>
                          <td className="py-2.5 px-2 text-right text-xs font-black text-stone-950 whitespace-nowrap">
                            {totalOrderCost.toFixed(2)} €
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : groupBy === 'teacher' ? (
                  <div className="border border-stone-300 rounded overflow-hidden mb-5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-800 text-white uppercase tracking-wider text-[9px]">
                          <th className="py-2 px-2 w-8 text-center border-r border-stone-700">✓</th>
                          <th className="py-2 px-2.5 font-bold w-48">Ingrediente</th>
                          <th className="py-2 px-2 font-bold text-right w-24">Cantidad</th>
                          <th className="py-2 px-2.5 font-bold w-36">Proveedor</th>
                          <th className="py-2 px-2 font-bold text-right w-20">Coste Est.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {sortedTeachers.map((teacher) => {
                          const teacherItems = groupedByTeacher[teacher];
                          const teacherTotal = teacherItems.reduce((sum, item) => sum + item.totalCost, 0);
                          const parts = teacher.split(' (Justificación:');
                          const nameOnly = parts[0];
                          const formattedName = formatTeacherName(nameOnly);
                          const justification = parts.length > 1 ? ` (Justificación:${parts[1]}` : '';

                          return (
                            <React.Fragment key={teacher}>
                              {/* Teacher Category Header Row */}
                              <tr className="bg-stone-200 text-stone-900 border-t-2 border-b border-stone-400 print-avoid-break">
                                <td colSpan={5} className="py-2 px-2.5">
                                  <div className="flex justify-between items-center text-xs font-bold">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full bg-stone-700 inline-block"></span>
                                      <span className="uppercase tracking-wider">DOCENTE: {formattedName}</span>
                                      {justification && (
                                        <span className="text-[10px] text-stone-600 font-normal italic">
                                          {justification}
                                        </span>
                                      )}
                                      <span className="text-[10px] text-stone-500 font-normal">
                                        ({teacherItems.length} {teacherItems.length === 1 ? 'producto' : 'productos'})
                                      </span>
                                    </div>
                                    <span className="text-[11px] font-bold text-stone-900 bg-white/70 px-2 py-0.5 rounded border border-stone-300">
                                      Subtotal: {teacherTotal.toFixed(2)} €
                                    </span>
                                  </div>
                                </td>
                              </tr>

                              {/* Product rows for this teacher */}
                              {teacherItems.map((item, idx) => (
                                <tr
                                  key={`${teacher}-${item.ingredientId}-${idx}`}
                                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/80'} print-avoid-break text-[10px]`}
                                >
                                  <td className="py-1.5 px-2 text-center border-r border-stone-200 align-middle">
                                    <span className="inline-block w-3.5 h-3.5 border border-stone-400 rounded-sm"></span>
                                  </td>
                                  <td className="py-1.5 px-2.5 font-semibold text-stone-900 align-middle">
                                    <div>{item.name} {item.isCustom ? '(Fuera de catálogo)' : ''}</div>
                                    {item.notes && (
                                      <div className="text-[9px] text-amber-900 font-semibold italic mt-0.5">
                                        [Nota: {item.notes}]
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-bold text-stone-900 whitespace-nowrap align-middle">
                                    {item.quantity.toFixed(3)} {item.unit}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-stone-600 text-[10px] italic align-middle">
                                    {item.provider || 'Sin proveedor'}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-bold text-stone-900 whitespace-nowrap align-middle">
                                    {item.totalCost.toFixed(2)} €
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-stone-100 border-t-2 border-stone-400 font-bold text-stone-900">
                          <td colSpan={4} className="py-2.5 px-2.5 text-right uppercase tracking-wider text-[10px] text-stone-700">
                            Total General Estimado:
                          </td>
                          <td className="py-2.5 px-2 text-right text-xs font-black text-stone-950 whitespace-nowrap">
                            {totalOrderCost.toFixed(2)} €
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="border border-stone-300 rounded overflow-hidden mb-5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-800 text-white uppercase tracking-wider text-[9px]">
                          <th className="py-2 px-2 w-8 text-center border-r border-stone-700">✓</th>
                          <th className="py-2 px-2.5 font-bold">Ingrediente</th>
                          <th className="py-2 px-2 font-bold text-right w-24">Cantidad</th>
                          <th className="py-2 px-2 font-bold text-right w-16">P. Unit.</th>
                          <th className="py-2 px-2 font-bold text-right w-20">Coste Est.</th>
                          <th className="py-2 px-2.5 font-bold w-36">Proveedor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {aggregatedList.map((item, idx) => (
                          <tr
                            key={item.ingredientId || idx}
                            className={`${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50/80'} print-avoid-break text-[10px]`}
                          >
                            <td className="py-1.5 px-2 text-center border-r border-stone-200 align-middle">
                              <span className="inline-block w-3.5 h-3.5 border border-stone-400 rounded-sm"></span>
                            </td>
                            <td className="py-1.5 px-2.5 font-semibold text-stone-900 align-middle">
                              <div>{item.name} {item.isCustom ? '(Fuera de catálogo)' : ''}</div>
                              {item.teacherNotes && Object.keys(item.teacherNotes).length > 0 && (
                                <div className="text-[9px] text-amber-900 font-semibold mt-0.5">
                                  {Object.entries(item.teacherNotes).map(([t, n]) => `[Nota ${formatTeacherName(t)}: ${n}]`).join(' · ')}
                                </div>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-right font-bold text-stone-900 whitespace-nowrap align-middle">
                              {item.totalQuantity.toFixed(3)} {item.unit}
                            </td>
                            <td className="py-1.5 px-2 text-right text-stone-600 whitespace-nowrap align-middle">
                              {item.costPerUnit > 0 ? `${item.costPerUnit.toFixed(2)} €` : '-'}
                            </td>
                            <td className="py-1.5 px-2 text-right font-bold text-stone-900 whitespace-nowrap align-middle">
                              {item.totalCost.toFixed(2)} €
                            </td>
                            <td className="py-1.5 px-2.5 text-stone-600 text-[10px] italic align-middle">
                              {item.provider || 'Sin proveedor'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-stone-100 border-t-2 border-stone-400 font-bold text-stone-900">
                          <td colSpan={4} className="py-2.5 px-2.5 text-right uppercase tracking-wider text-[10px] text-stone-700">
                            Total General Estimado:
                          </td>
                          <td className="py-2.5 px-2 text-right text-xs font-black text-stone-950 whitespace-nowrap">
                            {totalOrderCost.toFixed(2)} €
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* Resumen Total y Cuadros de Firma */}
                <div className="border-t-2 border-stone-800 mt-6 pt-4 print-avoid-break">
                  <div className="flex justify-between items-center bg-stone-100 p-2.5 rounded border border-stone-300 mb-6">
                    <span className="text-xs uppercase font-bold tracking-widest text-stone-700">
                      TOTAL GENERAL ESTIMADO DEL PEDIDO
                    </span>
                    <span className="text-lg font-black text-stone-900">
                      {totalOrderCost.toFixed(2)} €
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-8 pt-2 text-[10px] text-stone-600 mb-6">
                    <div className="border-t border-dashed border-stone-400 pt-2 text-center">
                      <p className="font-semibold text-stone-800 uppercase">Conforme Responsable de Compras / Cocina</p>
                      <p className="text-[9px] text-stone-400 mt-0.5">Firma y aprobación</p>
                    </div>
                    <div className="border-t border-dashed border-stone-400 pt-2 text-center">
                      <p className="font-semibold text-stone-800 uppercase">Recepción de Mercancías / Almacén</p>
                      <p className="text-[9px] text-stone-400 mt-0.5">Fecha y firma de recepción</p>
                    </div>
                  </div>

                  <div className="text-center pt-2 border-t border-stone-200 text-[8px] text-stone-400 uppercase tracking-widest font-sans">
                    Documento consolidado generado automáticamente · CIFP Hostelería
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: PEDIR PRODUCTO FUERA DE CATÁLOGO ==================== */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                  <PackagePlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Pedir producto fuera de catálogo</h3>
                  <p className="text-xs text-stone-500">Solo se incluirá en tu pedido, sin alterar la base de datos general</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCustomProduct} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Nombre del producto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Brotes de shiso fresco, Trufa negra de verano, Harina de algarroba..."
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium placeholder:text-stone-400"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Cantidad <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0.001"
                    step="any"
                    value={customQuantity}
                    onChange={e => setCustomQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Unidad de medida <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={customUnit}
                    onChange={e => setCustomUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  >
                    <option value="kg">kg (Kilogramos)</option>
                    <option value="g">g (Gramos)</option>
                    <option value="l">l (Litros)</option>
                    <option value="ml">ml (Mililitros)</option>
                    <option value="ud">ud (Unidades)</option>
                    <option value="manojo">manojo</option>
                    <option value="bote">bote / tarro</option>
                    <option value="lata">lata</option>
                    <option value="bandeja">bandeja</option>
                    <option value="caja">caja</option>
                    <option value="paquete">paquete</option>
                    <option value="botella">botella</option>
                    <option value="pieza">pieza</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Proveedor sugerido <span className="text-stone-400 font-normal lowercase">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Frutería El Huerto, Makro..."
                    value={customProvider}
                    onChange={e => setCustomProvider(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-stone-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Precio est. €/ud <span className="text-stone-400 font-normal lowercase">(opcional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={customPrice}
                    onChange={e => setCustomPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-stone-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Anotación para el jefe de compras <span className="text-stone-400 font-normal lowercase">(opcional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Especificaciones de compra: tamaño, maduración, marca, conservación, uso previsto..."
                  value={customNotes}
                  onChange={e => setCustomNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none placeholder:text-stone-400"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Este producto se solicitará únicamente en este pedido para el economato. <strong>No se agregará a la base de datos de ingredientes.</strong>
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  Añadir al Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: DETALLES Y ANOTACIONES DEL PEDIDO (JEFE DE COMPRAS) ==================== */}
      {viewingOrderDetail && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="flex items-start justify-between border-b border-stone-100 pb-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-stone-900">{viewingOrderDetail.title}</h3>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                    viewingOrderDetail.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : viewingOrderDetail.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-stone-200 text-stone-600'
                  }`}>
                    {viewingOrderDetail.status === 'completed' ? 'Completado' : viewingOrderDetail.status === 'pending' ? 'Pendiente' : 'Borrador'}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Docente: <strong className="text-stone-800">{viewingOrderDetail.userName}</strong> · Creado: {new Date(viewingOrderDetail.createdAt).toLocaleString('es-ES')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingOrderDetail(null)}
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Listado de artículos y notas */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-4">
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Productos solicitados ({viewingOrderDetail.items.length})
              </div>

              {viewingOrderDetail.items.map((item, idx) => {
                const isRecipe = item.type === 'recipe';
                const isMenu = item.type === 'menu';
                const isIngredient = item.type === 'ingredient';
                const isCustom = item.type === 'custom';

                const data = isRecipe 
                  ? recipes.find(r => r.id === item.id) 
                  : isMenu 
                    ? menus.find(m => m.id === item.id)
                    : isIngredient
                      ? ingredients.find(i => i.id === item.id)
                      : null;

                const name = isCustom 
                  ? item.customName || 'Producto no catalogado' 
                  : isIngredient 
                    ? (data as Ingredient)?.nameES || 'Ingrediente'
                    : isRecipe
                      ? (data as Recipe)?.nameES || 'Receta'
                      : (data as any)?.nameES || 'Menú';

                const unit = isCustom
                  ? item.customUnit || 'ud'
                  : isIngredient
                    ? (data as Ingredient)?.unit || 'ud'
                    : isRecipe
                      ? 'raciones'
                      : 'comensales';

                return (
                  <div key={idx} className="bg-stone-50 rounded-xl p-3 border border-stone-200">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-stone-900">{name}</span>
                          {isCustom ? (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">
                              Fuera de catálogo
                            </span>
                          ) : isIngredient ? (
                            <span className="text-[10px] font-medium text-stone-600 bg-stone-200/80 px-1.5 py-0.5 rounded">
                              Ingrediente directo
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                              {isRecipe ? 'Receta' : 'Menú'}
                            </span>
                          )}
                        </div>

                        {item.customProvider && (
                          <div className="text-xs text-stone-500 mt-0.5">
                            Proveedor sugerido: <span className="text-stone-700 font-medium">{item.customProvider}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-black text-stone-900">
                          {item.quantity} {unit}
                        </span>
                      </div>
                    </div>

                    {/* Anotaciones del docente para el jefe de compras */}
                    {item.notes && item.notes.trim() !== '' && (
                      <div className="mt-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-2">
                        <MessageSquare size={14} className="text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-amber-950 font-semibold mb-0.5">Anotación para compras:</strong>
                          <p className="italic text-stone-800 leading-relaxed font-sans">{item.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setViewingOrderDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
