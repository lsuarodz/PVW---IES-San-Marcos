import React, { useState } from 'react';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, Edit2, FileText, Printer, PlusCircle, MinusCircle, Check, Star, Sparkles, Layers, Info, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { Quote, QuoteItem, Menu } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import { ALLERGENS } from '../constants/allergens';
import { getMenuAllergens } from '../utils/calculations';

export default function Quotes() {
  const { appUser } = useAuth();
  const { quotes, clients, menus, recipes, ingredients, settings } = useData();
  const { showToast } = useToast();
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'docente';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Quote>>({
    items: [],
    tax: 7,
    status: 'draft',
    date: new Date().toISOString().split('T')[0]
  });

  const [addOptionModal, setAddOptionModal] = useState<{
    isOpen: boolean;
    selectedMenuIds: string[];
    optionGroup: string;
  }>({
    isOpen: false,
    selectedMenuIds: [],
    optionGroup: 'Cóctel de almuerzo'
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState<number | null>(null);

  const isItemCountedInTotal = (item: QuoteItem): boolean => {
    if (!item.isOption) return true;
    return Boolean(item.isIncludedInTotal);
  };

  const calculateTotals = (items: QuoteItem[], taxRate: number) => {
    const subtotal = items.reduce((sum, item) => {
      if (isItemCountedInTotal(item)) {
        return sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0));
      }
      return sum;
    }, 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...(formData.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate item total
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = Number(newItems[index].quantity || 0) * Number(newItems[index].unitPrice || 0);
    }

    const totals = calculateTotals(newItems, formData.tax ?? 7);
    
    setFormData({
      ...formData,
      items: newItems,
      subtotal: totals.subtotal,
      total: totals.total
    });
  };

  const addItem = (asOption = false, optionGroup = 'Opciones') => {
    const defaultQty = formData.guests || 1;
    const cleanGroup = optionGroup.trim() || 'Opciones';
    const existingGroupItems = (formData.items || []).filter(
      i => i.isOption && ((i.optionGroup || 'Opciones').trim().toLowerCase() === cleanGroup.toLowerCase())
    );
    const hasBase = existingGroupItems.some(i => i.isIncludedInTotal);

    const newItem: QuoteItem = {
      description: '',
      quantity: defaultQty,
      unitPrice: 0,
      total: 0,
      isOption: asOption,
      optionGroup: asOption ? cleanGroup : undefined,
      isIncludedInTotal: asOption ? !hasBase : true
    };
    const newItems = [...(formData.items || []), newItem];
    const totals = calculateTotals(newItems, formData.tax ?? 7);
    setFormData({
      ...formData,
      items: newItems,
      subtotal: totals.subtotal,
      total: totals.total
    });
  };

  const addMenuToQuote = (menuId: string, asOption = false, optionGroup = 'Almuerzo Cóctel') => {
    const menu = menus.find(m => m.id === menuId);
    if (!menu) return;

    const quantity = formData.guests || 1;
    const cleanGroup = optionGroup.trim() || 'Opciones';
    
    const existingGroupItems = (formData.items || []).filter(
      item => item.isOption && ((item.optionGroup || 'Opciones').trim().toLowerCase() === cleanGroup.toLowerCase())
    );
    const hasBaseInGroup = existingGroupItems.some(item => item.isIncludedInTotal);

    const newItem: QuoteItem = {
      description: `Menú: ${menu.nameES}`,
      quantity: quantity,
      unitPrice: menu.price,
      total: quantity * menu.price,
      menuId: menu.id,
      isOption: asOption,
      optionGroup: asOption ? cleanGroup : undefined,
      isIncludedInTotal: asOption ? !hasBaseInGroup : true
    };

    const newItems = [...(formData.items || []), newItem];
    const totals = calculateTotals(newItems, formData.tax ?? 7);

    setFormData({
      ...formData,
      items: newItems,
      subtotal: totals.subtotal,
      total: totals.total
    });

    if (asOption) {
      showToast(
        newItem.isIncludedInTotal 
          ? `Menú añadido como Opción Base computada (${cleanGroup})`
          : `Menú añadido como Opción Alternativa (${cleanGroup})`, 
        'success'
      );
    } else {
      showToast('Menú añadido como concepto fijo', 'success');
    }
  };

  const toggleItemOption = (index: number) => {
    const newItems = [...(formData.items || [])];
    const current = newItems[index];
    const willBeOption = !current.isOption;

    if (willBeOption) {
      // Find existing groups or default to 'Almuerzo'
      const existingGroups = Array.from(new Set(newItems.filter(i => i.isOption && i.optionGroup).map(i => i.optionGroup!)));
      const groupName = existingGroups[0] || 'Almuerzo Cóctel';
      const sameGroup = newItems.filter(i => i.isOption && (i.optionGroup || '').trim().toLowerCase() === groupName.toLowerCase());
      const hasBase = sameGroup.some(i => i.isIncludedInTotal);

      newItems[index] = {
        ...current,
        isOption: true,
        optionGroup: groupName,
        isIncludedInTotal: !hasBase
      };
    } else {
      newItems[index] = {
        ...current,
        isOption: false,
        optionGroup: undefined,
        isIncludedInTotal: true
      };
    }

    const totals = calculateTotals(newItems, formData.tax ?? 7);
    setFormData({
      ...formData,
      items: newItems,
      subtotal: totals.subtotal,
      total: totals.total
    });
  };

  const setOptionAsBase = (index: number) => {
    const newItems = [...(formData.items || [])];
    const target = newItems[index];
    if (!target.isOption) return;

    const group = (target.optionGroup || 'Opciones').trim().toLowerCase();
    newItems.forEach((item, idx) => {
      if (item.isOption && (item.optionGroup || 'Opciones').trim().toLowerCase() === group) {
        newItems[idx] = {
          ...item,
          isIncludedInTotal: idx === index
        };
      }
    });

    const totals = calculateTotals(newItems, formData.tax ?? 7);
    setFormData({
      ...formData,
      items: newItems,
      subtotal: totals.subtotal,
      total: totals.total
    });
    showToast(`"${target.description}" establecida como opción base computada en el total`, 'info');
  };

  const handleItemOptionGroupChange = (index: number, newGroup: string) => {
    const newItems = [...(formData.items || [])];
    const target = newItems[index];
    const cleanGroup = newGroup.trim().toLowerCase();

    // Check if new group has an existing base option
    const sameGroup = newItems.filter(
      (it, idx) => idx !== index && it.isOption && (it.optionGroup || 'Opciones').trim().toLowerCase() === cleanGroup
    );
    const hasBase = sameGroup.some(it => it.isIncludedInTotal);

    newItems[index] = {
      ...target,
      optionGroup: newGroup,
      isIncludedInTotal: !hasBase
    };

    const totals = calculateTotals(newItems, formData.tax ?? 7);
    setFormData({
      ...formData,
      items: newItems,
      subtotal: totals.subtotal,
      total: totals.total
    });
  };

  const handleGroupRename = (oldGroupName: string, newGroupName: string) => {
    const cleanOld = oldGroupName.trim().toLowerCase();
    const cleanNew = newGroupName.trim() || 'Opciones';
    const newItems = (formData.items || []).map(item => {
      if (item.isOption && (item.optionGroup || 'Opciones').trim().toLowerCase() === cleanOld) {
        return { ...item, optionGroup: cleanNew };
      }
      return item;
    });
    setFormData({ ...formData, items: newItems });
  };

  const addOptionGroupWithMenus = (groupName: string, menuIds: string[]) => {
    if (menuIds.length === 0) return;
    const cleanGroup = groupName.trim() || 'Opciones';
    const quantity = formData.guests || 1;

    const existingGroupItems = (formData.items || []).filter(
      item => item.isOption && ((item.optionGroup || 'Opciones').trim().toLowerCase() === cleanGroup.toLowerCase())
    );
    let hasBaseInGroup = existingGroupItems.some(i => i.isIncludedInTotal);

    const newItemsToAdd: QuoteItem[] = menuIds.map((menuId) => {
      const menu = menus.find(m => m.id === menuId);
      const desc = menu ? `Menú: ${menu.nameES}` : 'Opción';
      const price = menu ? menu.price : 0;
      const isBase = !hasBaseInGroup;
      if (isBase) {
        hasBaseInGroup = true;
      }
      return {
        description: desc,
        quantity,
        unitPrice: price,
        total: quantity * price,
        menuId,
        isOption: true,
        optionGroup: cleanGroup,
        isIncludedInTotal: isBase
      };
    });

    const updatedItems = [...(formData.items || []), ...newItemsToAdd];
    const totals = calculateTotals(updatedItems, formData.tax ?? 7);

    setFormData({
      ...formData,
      items: updatedItems,
      subtotal: totals.subtotal,
      total: totals.total
    });

    showToast(`${newItemsToAdd.length} opciones añadidas al grupo "${cleanGroup}"`, 'success');
  };

  const addCustomOptionToGroup = (groupName: string) => {
    const quantity = formData.guests || 1;
    const cleanGroup = groupName.trim() || 'Opciones';
    const existingGroupItems = (formData.items || []).filter(
      item => item.isOption && ((item.optionGroup || 'Opciones').trim().toLowerCase() === cleanGroup.toLowerCase())
    );
    const hasBase = existingGroupItems.some(i => i.isIncludedInTotal);

    const newItem: QuoteItem = {
      description: '',
      quantity,
      unitPrice: 0,
      total: 0,
      isOption: true,
      optionGroup: cleanGroup,
      isIncludedInTotal: !hasBase
    };

    const newItems = [...(formData.items || []), newItem];
    const totals = calculateTotals(newItems, formData.tax ?? 7);

    setFormData({
      ...formData,
      items: newItems,
      subtotal: totals.subtotal,
      total: totals.total
    });
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (!formData.items) return;
    if (toIndex < 0 || toIndex >= formData.items.length) return;
    const newItems = [...formData.items];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  const removeItem = (index: number) => {
    const newItems = [...(formData.items || [])];
    const removed = newItems[index];
    newItems.splice(index, 1);

    // If removed was base option, promote next option in the same group
    if (removed.isOption && removed.isIncludedInTotal) {
      const removedGroup = (removed.optionGroup || 'Opciones').trim().toLowerCase();
      const firstSiblingIndex = newItems.findIndex(
        i => i.isOption && (i.optionGroup || 'Opciones').trim().toLowerCase() === removedGroup
      );
      if (firstSiblingIndex !== -1) {
        newItems[firstSiblingIndex] = { ...newItems[firstSiblingIndex], isIncludedInTotal: true };
      }
    }

    const totals = calculateTotals(newItems, formData.tax ?? 7);
    setFormData({
      ...formData,
      items: newItems,
      subtotal: totals.subtotal,
      total: totals.total
    });
  };

  const handleGuestsChange = (guests: number) => {
    const updatedItems = (formData.items || []).map(item => {
      // If it's a menu item, synchronize quantity with guests
      if (item.menuId && guests > 0) {
        return {
          ...item,
          quantity: guests,
          total: guests * item.unitPrice
        };
      }
      return item;
    });

    const totals = calculateTotals(updatedItems, formData.tax ?? 7);
    setFormData({
      ...formData,
      guests,
      items: updatedItems,
      subtotal: totals.subtotal,
      total: totals.total
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    if (!formData.clientId) {
      showToast('Debes seleccionar un cliente', 'error');
      return;
    }

    const id = editingId || doc(collection(db, 'quotes')).id;
    
    let reference = formData.reference;
    if (!reference) {
      reference = quotes.find(q => q.id === editingId)?.reference;
    }
    if (!reference) {
      const client = clients.find(c => c.id === formData.clientId);
      const clientPrefix = client ? client.name.substring(0, 3).toUpperCase() : 'CLI';
      const currentYear = new Date().getFullYear();
      const quotesThisYear = quotes.filter(q => new Date(q.createdAt).getFullYear() === currentYear);
      const nextNumber = String(quotesThisYear.length + 1).padStart(3, '0');
      reference = `${clientPrefix}${currentYear}/${nextNumber}`;
    }

    const quoteData: Quote = {
      id,
      reference,
      clientId: formData.clientId,
      date: formData.date || new Date().toISOString().split('T')[0],
      eventDate: formData.eventDate || '',
      eventType: formData.eventType || '',
      guests: Number(formData.guests) || 0,
      items: (formData.items || []).map(item => ({
        description: item.description.trim() || 'Concepto',
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        total: Number(item.total) || 0,
        ...(item.menuId ? { menuId: item.menuId } : {}),
        isOption: Boolean(item.isOption),
        ...(item.optionGroup ? { optionGroup: item.optionGroup.trim() } : {}),
        isIncludedInTotal: Boolean(isItemCountedInTotal(item))
      })),
      subtotal: formData.subtotal || 0,
      tax: formData.tax ?? 7,
      total: formData.total || 0,
      notes: formData.notes || '',
      status: formData.status as any || 'draft',
      createdBy: editingId ? (quotes.find(q => q.id === editingId)?.createdBy || appUser.name) : appUser.name,
      createdAt: editingId ? (quotes.find(q => q.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'quotes', id), quoteData);
      setIsModalOpen(false);
      setFormData({ items: [], tax: 7, status: 'draft', date: new Date().toISOString().split('T')[0] });
      setEditingId(null);
      showToast(editingId ? 'Presupuesto actualizado' : 'Presupuesto guardado', 'success');
    } catch (error) {
      console.error('Error saving quote:', error);
      showToast('Error al guardar el presupuesto', 'error');
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Presupuesto',
      message: '¿Estás seguro de eliminar este presupuesto? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'quotes', id));
          showToast('Presupuesto eliminado', 'success');
        } catch (error) {
          console.error('Error deleting quote:', error);
          showToast('Error al eliminar', 'error');
        }
      }
    });
  };

  const openEdit = (quote: Quote) => {
    setFormData(quote);
    setEditingId(quote.id);
    setIsModalOpen(true);
  };

  const handleDuplicate = (quote: Quote) => {
    const { id, reference, createdAt, createdBy, ...rest } = quote;
    setFormData({
      ...rest,
      date: new Date().toISOString().split('T')[0],
      status: 'draft'
    });
    setEditingId(null);
    setIsModalOpen(true);
    showToast('Presupuesto duplicado. Revisa y guarda los cambios.', 'success');
  };

  const handlePrint = (quote: Quote) => {
    const client = clients.find(c => c.id === quote.clientId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Collect all menus referenced by items in quote
    const quoteMenus = quote.items
      .map(item => {
        let menu: Menu | undefined;
        if (item.menuId) menu = menus.find(m => m.id === item.menuId);
        if (!menu && item.description.startsWith('Menú: ')) {
          const menuName = item.description.replace('Menú: ', '').trim();
          menu = menus.find(m => m.nameES === menuName);
        }
        return menu ? { menu, item } : null;
      })
      .filter((entry): entry is { menu: Menu; item: QuoteItem } => Boolean(entry));

    const menusHtml = quoteMenus.map(({ menu, item }) => {
      const recipesHtml = menu.recipes.map((recipeId, index) => {
        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe) return '';
        const recipeAllergens = getMenuAllergens([recipe.id], ingredients, recipes);
        const allergensHtml = recipeAllergens.length > 0 ? `
          <div class="flex justify-center gap-1.5 mt-1 opacity-70">
            ${recipeAllergens.map(a => {
              const allergen = ALLERGENS.find(al => al.id === a);
              return allergen ? `<span title="${allergen.name}" class="text-[10px]">${allergen.icon}</span>` : '';
            }).join('')}
          </div>
        ` : '';

        const separatorHtml = index < menu.recipes.length - 1 ? `
          <div class="mt-1 flex justify-center">
            <div class="w-6 h-px bg-stone-300"></div>
          </div>
        ` : '';

        return `
          <div class="text-center w-full">
            <h3 class="text-[11px] font-serif font-bold mb-0.5 text-stone-900 tracking-wide uppercase">${recipe.nameES}</h3>
            ${recipe.descriptionES ? `<p class="text-stone-600 text-[8px] italic mb-0.5 leading-tight px-10 max-w-sm mx-auto">${recipe.descriptionES}</p>` : ''}
            ${allergensHtml}
            ${separatorHtml}
          </div>
        `;
      }).join('');

      const menuTypeStr = menu.type === 'brunch' ? 'Menú Brunch' : 
                     menu.type === 'cocktail' ? 'Menú Cóctel' :
                     menu.type === 'navidad' ? 'Menú Navidad Solidario' :
                     menu.type === 'coffee' ? 'Coffee Break' :
                     menu.type === 'cafeteria' ? 'Cafetería' :
                     'Menú Pedagógico';

      const roleBadge = !item.isOption 
        ? `<div class="mb-1.5"><span class="px-2.5 py-0.5 bg-stone-100 text-stone-800 text-[9px] tracking-[0.2em] uppercase font-sans font-semibold rounded border border-stone-300">Menú Incluido</span></div>`
        : item.isIncludedInTotal
          ? `<div class="mb-1.5"><span class="px-2.5 py-0.5 bg-teal-50 text-teal-800 text-[9px] tracking-[0.2em] uppercase font-sans font-semibold rounded border border-teal-200">★ Opción Base (${item.optionGroup || 'Opciones'})</span></div>`
          : `<div class="mb-1.5"><span class="px-2.5 py-0.5 bg-amber-50 text-amber-800 text-[9px] tracking-[0.2em] uppercase font-sans font-semibold rounded border border-amber-200">Propuesta Alternativa (${item.optionGroup || 'Opciones'})</span></div>`;

      const baseOption = item.isOption 
        ? quote.items.find(i => i.isOption && i.optionGroup === item.optionGroup && i.isIncludedInTotal)
        : null;
      const diff = (item.isOption && baseOption && !item.isIncludedInTotal)
        ? (item.unitPrice - baseOption.unitPrice)
        : 0;
      const diffHtml = (item.isOption && !item.isIncludedInTotal)
        ? `<div class="text-[10px] text-amber-800 font-semibold mb-0.5 font-sans">
             ${diff > 0 ? `+${diff.toFixed(2)} € / comensal respecto a opción base` : diff < 0 ? `-${Math.abs(diff).toFixed(2)} € / comensal respecto a opción base` : `Mismo precio que opción base`}
           </div>`
        : item.isOption && item.isIncludedInTotal
          ? `<div class="text-[9.5px] text-teal-700 font-semibold mb-0.5 font-sans">★ Opción base computada en el presupuesto</div>`
          : '';

      return `
        <div class="menu-page bg-white text-stone-900 font-serif mx-auto flex flex-col items-center justify-between relative overflow-hidden" style="box-sizing: border-box; height: 297mm; max-height: 297mm;">
          <div class="absolute inset-3 border-2 border-stone-800 pointer-events-none"></div>
          <div class="absolute inset-5 border border-stone-300 pointer-events-none"></div>
          
          <div class="z-10 w-full flex flex-col items-center justify-between h-full py-4 px-6">
            <div class="text-center w-full">
              <div class="flex justify-center mb-1.5">
                ${settings?.logoUrl ? `<img src="${settings.logoUrl}" alt="Logo" class="h-9 object-contain" crossorigin="anonymous" />` : `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-stone-800"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`}
              </div>
              <div class="text-stone-500 text-[8.5px] tracking-[0.35em] uppercase mb-1 font-sans font-medium">Propuesta Gastronómica</div>
              ${roleBadge}
              <h1 class="text-2xl font-serif font-bold mb-1 text-stone-900 tracking-tight leading-tight px-6 uppercase">${menu.nameES}</h1>
              ${menu.eventDate ? `<h2 class="text-xs text-stone-600 font-serif mb-0.5">${menu.eventDate}${menu.eventTime ? ` a las ${menu.eventTime}` : ''}</h2>` : ''}
              ${menu.eventPlace ? `<h2 class="text-xs text-stone-600 font-serif mb-1">${menu.eventPlace}</h2>` : ''}
              
              <div class="flex items-center justify-center gap-4 mt-1.5 mb-1.5">
                <div class="h-px w-10 bg-stone-300"></div>
                <div class="text-[9px] tracking-[0.25em] uppercase text-stone-800 font-sans font-semibold">
                  ${menuTypeStr}
                </div>
                <div class="h-px w-10 bg-stone-300"></div>
              </div>
            </div>

            <div class="space-y-2 w-full flex flex-col items-center max-w-xl my-auto py-1">
              ${recipesHtml}
            </div>

            <div class="w-full flex flex-col items-center pt-2">
              <div class="text-center mb-1.5">
                <div class="text-2xl font-serif font-bold text-stone-900 mb-0.5">${menu.price.toFixed(2)} €</div>
                ${diffHtml}
                <div class="text-[8.5px] text-stone-500 uppercase tracking-[0.25em] font-sans font-medium">Precio por persona · IGIC incluido</div>
              </div>

              <div class="pt-1.5 border-t border-stone-300 w-full max-w-sm text-center">
                <p class="text-[7.5px] text-stone-500 uppercase tracking-[0.2em] font-sans leading-relaxed px-2">
                  Todos nuestros productos son elaborados en una cocina compartida donde se manipulan alérgenos, por lo que pueden contener trazas.
                </p>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Fixed items
    const fixedItems = quote.items.filter(i => !i.isOption);

    // Option groups map
    const optionGroupsMap = new Map<string, QuoteItem[]>();
    quote.items.forEach(item => {
      if (item.isOption) {
        const groupName = (item.optionGroup || 'Opciones').trim();
        if (!optionGroupsMap.has(groupName)) {
          optionGroupsMap.set(groupName, []);
        }
        optionGroupsMap.get(groupName)!.push(item);
      }
    });

    const hasOptionGroups = optionGroupsMap.size > 0;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Presupuesto - ${client?.name || 'Cliente'}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                fontFamily: {
                  serif: ['"Cormorant Garamond"', 'serif'],
                  sans: ['system-ui', '-apple-system', 'sans-serif'],
                }
              }
            }
          }
        </script>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, sans-serif; color: #1c1917; line-height: 1.4; margin: 0; padding: 0; background: #f5f5f4; }
          .quote-page {
            width: 210mm;
            height: 297mm;
            max-height: 297mm;
            box-sizing: border-box;
            padding: 13mm 15mm;
            margin: 0 auto;
            background: white;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .menu-page {
            width: 210mm;
            height: 297mm;
            max-height: 297mm;
            box-sizing: border-box;
            padding: 10mm 14mm;
            margin: 0 auto;
            page-break-before: always;
            break-before: page;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
          }
          @media print {
            body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            button { display: none !important; }
            .quote-page {
              width: 210mm;
              height: 297mm;
              max-height: 297mm;
              padding: 13mm 15mm;
              margin: 0;
              page-break-after: always;
              break-after: page;
              page-break-inside: avoid;
              break-inside: avoid;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .menu-page {
              width: 210mm;
              height: 297mm;
              max-height: 297mm;
              padding: 10mm 14mm;
              margin: 0;
              page-break-before: always;
              break-before: page;
              page-break-after: always;
              break-after: page;
              page-break-inside: avoid;
              break-inside: avoid;
              overflow: hidden;
            }
            @page { margin: 0; size: A4 portrait; }
          }
        </style>
      </head>
      <body>
        <div class="quote-page">
          <!-- 1. Encabezado Superior y Datos del Cliente -->
          <div style="flex-shrink: 0;">
            <!-- Encabezado Principal -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #e7e5e4; padding-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                ${settings?.logoUrl ? `<img src="${settings.logoUrl}" alt="Logo" style="height: 40px; max-width: 140px; object-fit: contain;" crossorigin="anonymous" />` : ''}
                <div>
                  <h1 style="font-size: 19px; font-weight: 800; color: #0f766e; margin: 0; line-height: 1.1; letter-spacing: 0.02em;">PRESUPUESTO</h1>
                  <p style="margin: 0; font-size: 10.5px; color: #78716c; font-weight: 500;">Ref: ${quote.reference || `PR-${quote.id.slice(0, 6).toUpperCase()}`}</p>
                </div>
              </div>
              <div style="text-align: right; font-size: 11px; color: #57534e; line-height: 1.35;">
                <div><strong>Fecha:</strong> ${new Date(quote.date).toLocaleDateString('es-ES')}</div>
                <div><strong>Estado:</strong> ${quote.status === 'draft' ? 'Borrador' : quote.status === 'sent' ? 'Enviado' : quote.status === 'accepted' ? 'Aceptado' : 'Rechazado'}</div>
              </div>
            </div>

            <!-- Espacio dedicado encima de los datos del cliente (solicitado) -->
            <div style="margin-top: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 7px; padding: 7px 12px; font-size: 11px;">
                <div style="flex: 1;">
                  <span style="font-size: 9.5px; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-right: 5px;">Cliente:</span>
                  <strong style="color: #1c1917; font-size: 11.5px;">${client?.name || 'Cliente'}</strong>
                  ${client?.company ? `<span style="color: #57534e;"> (${client.company})</span>` : ''}
                  ${(client?.email || client?.phone) ? `
                    <span style="color: #78716c; margin-left: 8px; font-size: 10.5px;">· ${[client?.email, client?.phone].filter(Boolean).join(' · ')}</span>
                  ` : ''}
                </div>
                ${(quote.eventDate || quote.eventType || quote.guests) ? `
                <div style="border-left: 1.5px solid #e7e5e4; padding-left: 12px; white-space: nowrap; font-size: 11px;">
                  <span style="font-size: 9.5px; font-weight: 700; color: #0f766e; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-right: 5px;">Evento:</span>
                  ${[
                    quote.eventType ? `<strong>${quote.eventType}</strong>` : '',
                    quote.eventDate ? `${new Date(quote.eventDate).toLocaleDateString('es-ES')}` : '',
                    quote.guests ? `<strong>${quote.guests} comensales</strong>` : ''
                  ].filter(Boolean).join(' · ')}
                </div>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- 2. Zona Central: Lista de Conceptos Centrada Verticalmente en la Página -->
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; min-height: 0; padding: 18px 0;">
            <div style="width: 100%;">
              <!-- Tabla de Conceptos y Menú Base -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
                <thead>
                  <tr style="border-bottom: 2px solid #0f766e;">
                    <th style="padding: 8px 10px; text-align: left; color: #0f766e; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em;">Descripción del Concepto / Servicio</th>
                    <th style="padding: 8px 10px; text-align: right; color: #0f766e; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em;">Cant.</th>
                    <th style="padding: 8px 10px; text-align: right; color: #0f766e; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em;">Precio Ud.</th>
                    <th style="padding: 8px 10px; text-align: right; color: #0f766e; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${fixedItems.map(item => `
                    <tr style="border-bottom: 1px solid #e7e5e4;">
                      <td style="padding: 10.5px 10px; font-size: 11.5px; color: #1c1917; line-height: 1.4;">
                        <strong>${item.description}</strong>
                      </td>
                      <td style="padding: 10.5px 10px; text-align: right; font-size: 11.5px; color: #1c1917;">${item.quantity}</td>
                      <td style="padding: 10.5px 10px; text-align: right; font-size: 11.5px; color: #1c1917;">${item.unitPrice.toFixed(2)} €</td>
                      <td style="padding: 10.5px 10px; text-align: right; font-weight: 600; font-size: 11.5px; color: #1c1917;">${item.total.toFixed(2)} €</td>
                    </tr>
                  `).join('')}

                  ${Array.from(optionGroupsMap.entries()).map(([groupName, groupItems]) => {
                    const baseItem = groupItems.find(i => i.isIncludedInTotal) || groupItems[0];
                    const cleanBaseDesc = baseItem.description.startsWith('Menú: ') 
                      ? baseItem.description.replace('Menú: ', '') 
                      : baseItem.description;
                    return `
                      <tr style="border-bottom: 1px solid #e7e5e4; background: #fafaf9;">
                        <td style="padding: 10.5px 10px; font-size: 11.5px; color: #1c1917; line-height: 1.4;">
                          <strong style="color: #0f766e; text-transform: uppercase;">${groupName}</strong>
                          <div style="font-size: 10px; color: #57534e; margin-top: 3px;">
                            Propuesta base: <strong>${cleanBaseDesc}</strong> <span style="color: #78716c;">(ver ${groupItems.length} opciones abajo)</span>
                          </div>
                        </td>
                        <td style="padding: 10.5px 10px; text-align: right; font-size: 11.5px; color: #1c1917;">${baseItem.quantity}</td>
                        <td style="padding: 10.5px 10px; text-align: right; font-size: 11.5px; color: #1c1917;">${baseItem.unitPrice.toFixed(2)} €</td>
                        <td style="padding: 10.5px 10px; text-align: right; font-weight: 600; font-size: 11.5px; color: #1c1917;">${baseItem.total.toFixed(2)} €</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>

              <!-- Cuadro de Opciones Alternativas Agrupadas (si existen) -->
              ${hasOptionGroups ? `
                <div style="margin-top: 10px; padding: 8px 12px; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 6px;">
                  <div style="font-weight: 700; color: #0f766e; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px;">
                    Opciones de Menú Alternativas
                  </div>
                  ${Array.from(optionGroupsMap.entries()).map(([groupName, groupItems]) => {
                    const baseItem = groupItems.find(i => i.isIncludedInTotal) || groupItems[0];
                    return `
                      <div style="margin-bottom: 6px;">
                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 4px 9px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                          <span style="font-weight: 700; font-size: 10.5px; color: #166534; text-transform: uppercase;">
                            ${groupName}
                          </span>
                          <span style="font-size: 9.5px; font-weight: 600; color: #166534;">
                            Precio base presupuestado: ${baseItem.unitPrice.toFixed(2)} € / comensal
                          </span>
                        </div>
                        <table style="width: 100%; border-collapse: collapse; background: white; font-size: 10px;">
                          <thead>
                            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569;">
                              <th style="padding: 4px 7px; text-align: left; font-weight: 600;">Propuesta de menú</th>
                              <th style="padding: 4px 7px; text-align: right; font-weight: 600;">Precio / comensal</th>
                              <th style="padding: 4px 7px; text-align: right; font-weight: 600;">Ajuste respecto a opción base</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${groupItems.map(item => {
                              const isBase = item === baseItem || Boolean(item.isIncludedInTotal);
                              const diff = item.unitPrice - baseItem.unitPrice;
                              const diffText = isBase 
                                ? '<span style="color: #0f766e; font-weight: 600;">★ Opción base presupuestada</span>'
                                : diff > 0 
                                  ? `<span style="color: #b45309; font-weight: 600;">+${diff.toFixed(2)} € / comensal</span>`
                                  : diff < 0 
                                    ? `<span style="color: #0f766e; font-weight: 600;">-${Math.abs(diff).toFixed(2)} € / comensal</span>`
                                    : '<span style="color: #57534e;">Mismo precio que opción base</span>';

                              const cleanName = item.description.startsWith('Menú: ') 
                                ? item.description.replace('Menú: ', '') 
                                : item.description;

                              return `
                                <tr style="border-bottom: 1px solid #f1f5f9; ${isBase ? 'background: #f0fdf4/40;' : ''}">
                                  <td style="padding: 4px 7px; color: #1c1917;">
                                    <strong>${cleanName}</strong>
                                    ${isBase ? ' <span style="font-size: 8px; background: #ccfbf1; color: #0f766e; padding: 1px 4px; border-radius: 3px; font-weight: 600;">BASE</span>' : ''}
                                  </td>
                                  <td style="padding: 4px 7px; text-align: right; font-weight: 600; color: #1c1917;">
                                    ${item.unitPrice.toFixed(2)} €
                                  </td>
                                  <td style="padding: 4px 7px; text-align: right;">
                                    ${diffText}
                                  </td>
                                </tr>
                              `;
                            }).join('')}
                          </tbody>
                        </table>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : ''}

              <!-- Totales pegados directamente por debajo de la lista de conceptos -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 16px; padding-top: 12px; border-top: 2px solid #e7e5e4;">
                <div style="font-size: 9.5px; color: #78716c; max-width: 380px; line-height: 1.35;">
                  ${hasOptionGroups ? '* El importe total incluye los conceptos fijos y la opción base de cada menú. Las opciones alternativas no incrementan el presupuesto a menos que sean elegidas.' : ''}
                </div>
                <div style="width: 250px; font-size: 11px;">
                  <div style="display: flex; justify-content: space-between; padding: 2px 0; color: #57534e;">
                    <span>Subtotal:</span>
                    <span style="font-weight: 600; color: #1c1917;">${quote.subtotal.toFixed(2)} €</span>
                  </div>
                  ${quote.tax > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 2px 0; color: #57534e;">
                    <span>IGIC (${quote.tax}%):</span>
                    <span style="font-weight: 600; color: #1c1917;">${(quote.subtotal * quote.tax / 100).toFixed(2)} €</span>
                  </div>
                  ` : ''}
                  <div style="display: flex; justify-content: space-between; padding: 4px 0 2px 0; border-top: 2px solid #0f766e; margin-top: 4px; font-weight: bold; font-size: 13.5px; color: #0f766e;">
                    <span>TOTAL:</span>
                    <span>${quote.total.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. Bloque Inferior: Notas y Condiciones al Final de la Hoja, Pie de Página y Acción -->
          <div style="flex-shrink: 0; padding-top: 10px;">
            ${quote.notes ? `
            <div style="margin-bottom: 8px; padding-top: 6px; border-top: 1.5px solid #e7e5e4; color: #57534e; font-size: 9.5px; line-height: 1.4;">
              <strong style="color: #1c1917;">Notas y Condiciones:</strong> ${quote.notes.replace(/\n/g, '<br>')}
            </div>
            ` : ''}

            <div style="border-top: 1px dashed #e7e5e4; padding-top: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #a8a29e;">
              <span>Documento de presupuesto informativo · Precios sujetos a confirmación y disponibilidad</span>
              <span>Página 1</span>
            </div>

            <div style="margin-top: 10px; text-align: center;">
              <button onclick="window.print()" style="padding: 8px 20px; background: #0f766e; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13.5px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                Imprimir Presupuesto
              </button>
            </div>
          </div>
        </div>
        
        <!-- Páginas de los Menús (1 página por menú) -->
        ${menusHtml}
        
        <script>
          setTimeout(() => {
            window.print();
          }, 800);
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="min-h-full p-8 bg-stone-100">
      <div className="max-w-6xl mx-auto">
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        />

        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Presupuestos</h1>
            <p className="text-stone-500 mt-2">Gestiona los presupuestos para eventos y clientes.</p>
          </div>
          <button
            onClick={() => {
              setFormData({ items: [], tax: 7, status: 'draft', date: new Date().toISOString().split('T')[0] });
              setEditingId(null);
              setIsModalOpen(true);
            }}
            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Nuevo Presupuesto
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-6 py-4 text-sm font-semibold text-stone-900">Ref.</th>
                <th className="px-6 py-4 text-sm font-semibold text-stone-900">Fecha</th>
                <th className="px-6 py-4 text-sm font-semibold text-stone-900">Cliente</th>
                <th className="px-6 py-4 text-sm font-semibold text-stone-900">Evento</th>
                <th className="px-6 py-4 text-sm font-semibold text-stone-900">Estado</th>
                <th className="px-6 py-4 text-sm font-semibold text-stone-900 text-right">Total</th>
                <th className="px-6 py-4 text-sm font-semibold text-stone-900 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {quotes.map(quote => {
                const client = clients.find(c => c.id === quote.clientId);
                return (
                  <tr key={quote.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-stone-900">
                      {quote.reference || `PR-${quote.id.slice(0, 6).toUpperCase()}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-600">
                      {new Date(quote.date).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-stone-900">{client?.name || 'Cliente desconocido'}</div>
                      {client?.company && <div className="text-xs text-stone-500">{client.company}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-stone-900">{quote.eventType || '-'}</div>
                      {quote.eventDate && <div className="text-xs text-stone-500">{new Date(quote.eventDate).toLocaleDateString('es-ES')}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${quote.status === 'draft' ? 'bg-stone-100 text-stone-800' : 
                          quote.status === 'sent' ? 'bg-blue-100 text-blue-800' : 
                          quote.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                          'bg-red-100 text-red-800'}`}
                      >
                        {quote.status === 'draft' ? 'Borrador' : 
                         quote.status === 'sent' ? 'Enviado' : 
                         quote.status === 'accepted' ? 'Aceptado' : 'Rechazado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-stone-900">
                      <div>{quote.total.toFixed(2)} €</div>
                      {quote.items?.some(i => i.isOption) && (
                        <div className="text-[10px] text-teal-700 font-normal flex items-center justify-end gap-1">
                          <Layers size={11} />
                          {quote.items.filter(i => i.isOption).length} opciones
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleDuplicate(quote)}
                          className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Duplicar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </button>
                        <button
                          onClick={() => handlePrint(quote)}
                          className="p-2 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Imprimir"
                        >
                          <Printer size={18} />
                        </button>
                        <button
                          onClick={() => openEdit(quote)}
                          className="p-2 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        {(isAdmin || quote.createdBy === appUser?.name) && (
                          <button
                            onClick={() => handleDelete(quote.id)}
                            className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {quotes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-stone-500">
                    <FileText className="mx-auto h-12 w-12 text-stone-300 mb-4" />
                    <p>No hay presupuestos creados.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Form */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-stone-900">
                  {editingId ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
                </h2>
              </div>
              <div className="p-6 overflow-y-auto">
                <form id="quote-form" onSubmit={handleSubmit} className="space-y-8">
                  
                  {/* Datos Generales */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-stone-700 mb-1">Cliente *</label>
                      <select
                        required
                        value={formData.clientId || ''}
                        onChange={e => setFormData({...formData, clientId: e.target.value})}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Selecciona un cliente...</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Fecha Presupuesto *</label>
                      <input
                        type="date"
                        required
                        value={formData.date || ''}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    {isAdmin && (
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Referencia</label>
                        <input
                          type="text"
                          value={formData.reference || ''}
                          onChange={e => setFormData({...formData, reference: e.target.value})}
                          placeholder="Autogenerada si vacío"
                          className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Fecha del Evento</label>
                      <input
                        type="date"
                        value={formData.eventDate || ''}
                        onChange={e => setFormData({...formData, eventDate: e.target.value})}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Tipo de Evento</label>
                      <input
                        type="text"
                        value={formData.eventType || ''}
                        onChange={e => setFormData({...formData, eventType: e.target.value})}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="Ej. Boda, Coffe Break..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Comensales (pax)</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.guests || ''}
                        onChange={e => handleGuestsChange(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="Nº de comensales"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Estado</label>
                      <select
                        value={formData.status || 'draft'}
                        onChange={e => setFormData({...formData, status: e.target.value as any})}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="draft">Borrador</option>
                        <option value="sent">Enviado</option>
                        <option value="accepted">Aceptado</option>
                        <option value="rejected">Rechazado</option>
                      </select>
                    </div>
                  </div>

                  {/* Líneas del Presupuesto */}
                  <div>
                    <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
                      <div>
                        <h3 className="text-lg font-medium text-stone-900">Conceptos y Opciones</h3>
                        <p className="text-xs text-stone-500">
                          Combina conceptos fijos y opciones alternativas. Puedes reordenar los conceptos arrastrando o usando las flechas de posición.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              addMenuToQuote(e.target.value, false);
                              e.target.value = '';
                            }
                          }}
                          className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="">+ Menú fijo...</option>
                          {menus.map(menu => (
                            <option key={menu.id} value={menu.id}>{menu.nameES} ({menu.price.toFixed(2)} €)</option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            if (menus.length === 0) {
                              showToast('No hay menús registrados para añadir como opción', 'error');
                              return;
                            }
                            setAddOptionModal({
                              isOpen: true,
                              selectedMenuIds: menus[0] ? [menus[0].id] : [],
                              optionGroup: 'Almuerzo Cóctel'
                            });
                          }}
                          className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          title="Añade menús como opciones alternativas a elegir por el cliente"
                        >
                          <Sparkles size={14} />
                          + Menú como Opción...
                        </button>

                        <button
                          type="button"
                          onClick={() => addItem(false)}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <PlusCircle size={14} />
                          Línea libre
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {formData.items?.map((item, index) => {
                        const isIncluded = isItemCountedInTotal(item);
                        return (
                          <div 
                            key={index} 
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (draggedItemIndex !== null && draggedItemIndex !== index) {
                                setDragOverItemIndex(index);
                              }
                            }}
                            onDragLeave={() => {
                              if (dragOverItemIndex === index) {
                                setDragOverItemIndex(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (draggedItemIndex !== null && draggedItemIndex !== index) {
                                moveItem(draggedItemIndex, index);
                              }
                              setDraggedItemIndex(null);
                              setDragOverItemIndex(null);
                            }}
                            className={`p-3 rounded-xl border transition-all ${
                              dragOverItemIndex === index ? 'ring-2 ring-teal-500 border-teal-500 shadow-md bg-teal-50/50' : ''
                            } ${draggedItemIndex === index ? 'opacity-40 border-dashed border-stone-400' : ''} ${
                              item.isOption 
                                ? isIncluded 
                                  ? 'bg-teal-50/60 border-teal-200' 
                                  : 'bg-amber-50/40 border-amber-200'
                                : 'bg-stone-50 border-stone-200'
                            }`}
                          >
                            {/* Cabecera / Clasificación del Concepto y Reordenación */}
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-stone-200/60 text-xs">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                {/* Controles de ordenación (Grip + Posición + Subir/Bajar) */}
                                <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-lg border border-stone-200 shadow-xs">
                                  <div
                                    draggable
                                    onDragStart={(e) => {
                                      e.dataTransfer.effectAllowed = 'move';
                                      setDraggedItemIndex(index);
                                    }}
                                    onDragEnd={() => {
                                      setDraggedItemIndex(null);
                                      setDragOverItemIndex(null);
                                    }}
                                    className="cursor-grab active:cursor-grabbing p-0.5 text-stone-400 hover:text-stone-700 transition-colors"
                                    title="Arrastrar para mover de posición"
                                  >
                                    <GripVertical size={14} />
                                  </div>

                                  <span className="font-mono text-[11px] font-bold text-stone-700 min-w-[20px] text-center" title={`Concepto número ${index + 1}`}>
                                    #{index + 1}
                                  </span>

                                  <div className="flex items-center border-l border-stone-200 pl-1 ml-0.5">
                                    <button
                                      type="button"
                                      disabled={index === 0}
                                      onClick={() => moveItem(index, index - 1)}
                                      className="p-1 text-stone-500 hover:text-teal-700 hover:bg-stone-100 rounded transition-colors disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                                      title="Subir concepto"
                                      aria-label="Subir concepto"
                                    >
                                      <ArrowUp size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={index === (formData.items?.length || 0) - 1}
                                      onClick={() => moveItem(index, index + 1)}
                                      className="p-1 text-stone-500 hover:text-teal-700 hover:bg-stone-100 rounded transition-colors disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                                      title="Bajar concepto"
                                      aria-label="Bajar concepto"
                                    >
                                      <ArrowDown size={12} />
                                    </button>
                                  </div>
                                </div>

                                {item.isOption ? (
                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                      <Layers size={12} />
                                      Opción
                                    </span>
                                    <div className="flex items-center gap-1 text-stone-600">
                                      <span className="text-stone-400">Grupo:</span>
                                      <input
                                        type="text"
                                        value={item.optionGroup || 'Opciones'}
                                        onChange={e => handleItemOptionGroupChange(index, e.target.value)}
                                        className="px-2 py-0.5 bg-white border border-stone-300 rounded text-xs w-32 sm:w-36 font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                        placeholder="Nombre grupo..."
                                      />
                                    </div>
                                    {isIncluded ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 border border-teal-300">
                                        <Check size={12} />
                                        Opción Base (computa en total)
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setOptionAsBase(index)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-300 transition-colors"
                                        title="Hacer que esta sea la opción de menú calculada en el presupuesto"
                                      >
                                        <Star size={11} />
                                        Fijar como opción base
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-stone-200 text-stone-700">
                                    Concepto Fijo
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleItemOption(index)}
                                  className="text-stone-500 hover:text-teal-700 underline text-xs"
                                >
                                  {item.isOption ? 'Cambiar a fijo' : 'Convertir en opción'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="text-stone-400 hover:text-red-600 transition-colors p-1"
                                  title="Eliminar concepto"
                                >
                                  <MinusCircle size={16} />
                                </button>
                              </div>
                            </div>

                            {/* Fila de Campos de Entrada */}
                            <div className="grid grid-cols-12 gap-3 items-center">
                              <div className="col-span-12 sm:col-span-6">
                                <input
                                  type="text"
                                  required
                                  value={item.description}
                                  onChange={e => handleItemChange(index, 'description', e.target.value)}
                                  className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                  placeholder="Descripción del concepto o menú..."
                                />
                              </div>
                              <div className="col-span-4 sm:col-span-2">
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-stone-400 sm:hidden">Cantidad</span>
                                  <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={item.quantity}
                                    onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                                    className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-right text-sm"
                                    placeholder="Cant."
                                  />
                                </div>
                              </div>
                              <div className="col-span-4 sm:col-span-2">
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-stone-400 sm:hidden">Precio Ud.</span>
                                  <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={item.unitPrice}
                                    onChange={e => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                                    className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-right text-sm"
                                    placeholder="Precio €"
                                  />
                                </div>
                              </div>
                              <div className="col-span-4 sm:col-span-2 text-right">
                                {isIncluded ? (
                                  <div className="font-semibold text-stone-800 text-sm">
                                    {item.total.toFixed(2)} €
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-medium text-stone-400 line-through text-xs">
                                      {item.total.toFixed(2)} €
                                    </div>
                                    <div className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">
                                      Opción alt.
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {(!formData.items || formData.items.length === 0) && (
                        <div className="text-center py-8 text-stone-500 text-sm border border-dashed border-stone-300 rounded-xl bg-stone-50/50">
                          <p className="font-medium text-stone-700 mb-1">No hay conceptos añadidos todavía</p>
                          <p className="text-xs text-stone-400">
                            Añade un menú fijo (ej. Coffee Break) o pulsa "+ Menú como Opción" para presentar alternativas sin sumar todo.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Totales y Notas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-stone-200">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Notas y Condiciones</label>
                      <textarea
                        rows={5}
                        value={formData.notes || ''}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                        placeholder="Condiciones de pago, validez del presupuesto..."
                      />
                    </div>
                    <div className="bg-stone-50 p-6 rounded-xl border border-stone-200 space-y-3">
                      <div className="flex justify-between items-center text-stone-600">
                        <span>Subtotal</span>
                        <span>{(formData.subtotal || 0).toFixed(2)} €</span>
                      </div>
                      {formData.tax !== 0 && (
                        <div className="flex justify-between items-center text-stone-600">
                          <div className="flex items-center gap-2">
                            <span>IGIC</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={formData.tax}
                              onChange={e => {
                                const tax = Number(e.target.value);
                                const totals = calculateTotals(formData.items || [], tax);
                                setFormData({...formData, tax, subtotal: totals.subtotal, total: totals.total});
                              }}
                              disabled={appUser?.role !== 'admin'}
                              className="w-16 px-2 py-1 text-sm bg-white border border-stone-200 rounded text-right disabled:bg-stone-100 disabled:text-stone-500 disabled:cursor-not-allowed"
                            />
                            <span>%</span>
                          </div>
                          <span>{((formData.subtotal || 0) * (formData.tax || 0) / 100).toFixed(2)} €</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <input
                          type="checkbox"
                          id="include-tax"
                          checked={formData.tax !== 0}
                          onChange={(e) => {
                            const tax = e.target.checked ? 7 : 0;
                            const totals = calculateTotals(formData.items || [], tax);
                            setFormData({...formData, tax, subtotal: totals.subtotal, total: totals.total});
                          }}
                          className="rounded border-stone-300 text-teal-600 focus:ring-teal-500"
                        />
                        <label htmlFor="include-tax">Aplicar IGIC al presupuesto</label>
                      </div>
                      {formData.items?.some(i => i.isOption && !i.isIncludedInTotal) && (
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                          <Info size={16} className="mt-0.5 shrink-0 text-amber-600" />
                          <div>
                            <span className="font-semibold">Opciones alternativas excluidas del total:</span>
                            <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                              Hay {formData.items.filter(i => i.isOption && !i.isIncludedInTotal).length} concepto(s) alternativo(s) sin computar. En el documento final se presentarán como alternativas a elegir sin sumar su importe al total.
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="pt-3 border-t border-stone-200 flex justify-between items-center font-bold text-lg text-stone-900">
                        <span>Total</span>
                        <span>{(formData.total || 0).toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>

                </form>
              </div>
              <div className="p-6 border-t border-stone-100 flex justify-end gap-3 bg-stone-50 rounded-b-2xl">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-stone-600 hover:bg-stone-200 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="quote-form"
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors"
                >
                  Guardar Presupuesto
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para Añadir Menú como Opción */}
        {addOptionModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden">
              <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                    <Sparkles size={18} />
                  </div>
                  <h3 className="font-bold text-stone-900">Añadir Menú como Opción</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setAddOptionModal({ ...addOptionModal, isOpen: false })}
                  className="text-stone-400 hover:text-stone-600 p-1 rounded-lg text-lg leading-none"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Grupo de Opciones (ej. Almuerzo Cóctel)
                  </label>
                  <input
                    type="text"
                    value={addOptionModal.optionGroup}
                    onChange={e => setAddOptionModal({ ...addOptionModal, optionGroup: e.target.value })}
                    placeholder="Nombre del grupo..."
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 mb-2 font-medium"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {['Almuerzo Cóctel', 'Almuerzo Sentado', 'Cóctel Bienvenida', 'Buffet', 'Postres'].map(sugg => (
                      <button
                        key={sugg}
                        type="button"
                        onClick={() => setAddOptionModal({ ...addOptionModal, optionGroup: sugg })}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                          addOptionModal.optionGroup === sugg
                            ? 'bg-teal-100 text-teal-800 border-teal-300 font-semibold'
                            : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                        }`}
                      >
                        {sugg}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-stone-700">
                      Seleccionar Menús para este Grupo ({addOptionModal.selectedMenuIds.length} seleccionados)
                    </label>
                    {menus.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (addOptionModal.selectedMenuIds.length === menus.length) {
                            setAddOptionModal({ ...addOptionModal, selectedMenuIds: [] });
                          } else {
                            setAddOptionModal({ ...addOptionModal, selectedMenuIds: menus.map(m => m.id) });
                          }
                        }}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                      >
                        {addOptionModal.selectedMenuIds.length === menus.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mb-2">
                    Marca los menús que quieras presentar como opciones alternativas para que el cliente elija uno:
                  </p>
                  <div className="max-h-56 overflow-y-auto border border-stone-200 rounded-xl divide-y divide-stone-100 bg-stone-50">
                    {menus.map(menu => {
                      const isSelected = addOptionModal.selectedMenuIds.includes(menu.id);
                      return (
                        <label
                          key={menu.id}
                          className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                            isSelected ? 'bg-teal-50/70 hover:bg-teal-50' : 'hover:bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAddOptionModal({
                                  ...addOptionModal,
                                  selectedMenuIds: [...addOptionModal.selectedMenuIds, menu.id]
                                });
                              } else {
                                setAddOptionModal({
                                  ...addOptionModal,
                                  selectedMenuIds: addOptionModal.selectedMenuIds.filter(id => id !== menu.id)
                                });
                              }
                            }}
                            className="rounded border-stone-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-stone-800 text-sm truncate">{menu.nameES}</div>
                            <div className="text-xs text-stone-500">
                              {menu.recipes.length} platos {menu.location === 'fuera' ? '• Fuera del centro' : ''}
                            </div>
                          </div>
                          <div className="text-sm font-bold text-teal-700 whitespace-nowrap">
                            {menu.price.toFixed(2)} €
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 leading-relaxed space-y-1">
                  <p className="font-semibold text-stone-800 flex items-center gap-1">
                    <Info size={14} className="text-teal-600" />
                    ¿Cómo se calcula en el presupuesto?
                  </p>
                  <p>
                    El <strong>primer menú</strong> de este grupo figurará como la <strong>opción base</strong> y se incluirá en el total del presupuesto.
                  </p>
                  <p>
                    Los <strong>siguientes menús</strong> del mismo grupo se presentarán como <strong>opciones alternativas</strong> para que el cliente elija, <strong>sin sumar su importe adicional al total</strong>.
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddOptionModal({ ...addOptionModal, isOpen: false })}
                  className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-200 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={addOptionModal.selectedMenuIds.length === 0}
                  onClick={() => {
                    if (addOptionModal.selectedMenuIds.length === 0) return;
                    addOptionGroupWithMenus(addOptionModal.optionGroup, addOptionModal.selectedMenuIds);
                    setAddOptionModal({ ...addOptionModal, isOpen: false, selectedMenuIds: [] });
                  }}
                  className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                >
                  Añadir {addOptionModal.selectedMenuIds.length > 0 ? `(${addOptionModal.selectedMenuIds.length}) Menú(s)` : 'Opciones'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
