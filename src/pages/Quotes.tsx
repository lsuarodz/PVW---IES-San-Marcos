import React, { useState } from 'react';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, Edit2, FileText, Printer, PlusCircle, MinusCircle, Check, Star, Sparkles, Layers, Info } from 'lucide-react';
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
    selectedMenuId: string;
    optionGroup: string;
  }>({
    isOpen: false,
    selectedMenuId: '',
    optionGroup: 'Almuerzo Cóctel'
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

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
          <div class="flex justify-center gap-2 mt-2 opacity-60">
            ${recipeAllergens.map(a => {
              const allergen = ALLERGENS.find(al => al.id === a);
              return allergen ? `<span title="${allergen.name}" class="text-xs">${allergen.icon}</span>` : '';
            }).join('')}
          </div>
        ` : '';

        const separatorHtml = index < menu.recipes.length - 1 ? `
          <div class="mt-2 flex justify-center">
            <div class="w-8 h-px bg-stone-300"></div>
          </div>
        ` : '';

        return `
          <div class="text-center w-full">
            <h3 class="text-[12px] font-serif font-bold mb-0.5 text-stone-900 tracking-wide uppercase">${recipe.nameES}</h3>
            ${recipe.descriptionES ? `<p class="text-stone-600 text-[8px] italic mb-1 leading-relaxed px-20 max-w-sm mx-auto">${recipe.descriptionES}</p>` : ''}
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
        ? `<div class="mb-3"><span class="px-3 py-1 bg-stone-100 text-stone-800 text-[10px] tracking-[0.25em] uppercase font-sans font-semibold rounded border border-stone-300">Menú Incluido en Presupuesto</span></div>`
        : item.isIncludedInTotal
          ? `<div class="mb-3"><span class="px-3 py-1 bg-teal-50 text-teal-800 text-[10px] tracking-[0.25em] uppercase font-sans font-semibold rounded border border-teal-200">★ Opción Base Presupuestada (${item.optionGroup || 'Opciones'})</span></div>`
          : `<div class="mb-3"><span class="px-3 py-1 bg-amber-50 text-amber-800 text-[10px] tracking-[0.25em] uppercase font-sans font-semibold rounded border border-amber-200">Opción Alternativa a Elegir (${item.optionGroup || 'Opciones'})</span></div>`;

      const baseOption = item.isOption 
        ? quote.items.find(i => i.isOption && i.optionGroup === item.optionGroup && i.isIncludedInTotal)
        : null;
      const diff = (item.isOption && baseOption && !item.isIncludedInTotal)
        ? (item.unitPrice - baseOption.unitPrice)
        : 0;
      const diffHtml = (item.isOption && !item.isIncludedInTotal)
        ? `<div class="text-[11px] text-amber-800 font-semibold mb-1 font-sans">
             ${diff > 0 ? `+${diff.toFixed(2)} € / comensal respecto a opción base` : diff < 0 ? `-${Math.abs(diff).toFixed(2)} € / comensal respecto a opción base` : `Mismo precio que opción base`}
           </div>
           <div class="text-[10px] text-stone-500 font-sans mb-1">
             Importe orientativo para ${item.quantity} pax: ${(item.quantity * item.unitPrice).toFixed(2)} €
           </div>`
        : item.isOption && item.isIncludedInTotal
          ? `<div class="text-[10px] text-teal-700 font-semibold mb-1 font-sans">★ Opción base incluida en el cálculo del total</div>`
          : '';

      return `
        <div class="menu-page bg-white text-stone-900 font-serif mx-auto flex flex-col items-center relative overflow-hidden" style="box-sizing: border-box;">
          <div class="absolute inset-4 border-2 border-stone-800 pointer-events-none"></div>
          <div class="absolute inset-6 border border-stone-300 pointer-events-none"></div>
          
          <div class="z-10 w-full flex flex-col items-center h-full">
            <div class="text-center mb-6 w-full pt-6">
              <div class="flex justify-center mb-4">
                ${settings?.logoUrl ? `<img src="${settings.logoUrl}" alt="Logo" class="h-16 object-contain" crossorigin="anonymous" />` : `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-stone-800"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`}
              </div>
              <div class="text-stone-500 text-[10px] tracking-[0.4em] uppercase mb-3 font-sans font-medium">Propuesta Gastronómica</div>
              ${roleBadge}
              <h1 class="text-4xl font-serif font-bold mb-3 text-stone-900 tracking-tight leading-tight px-12 uppercase">${menu.nameES}</h1>
              ${menu.eventDate ? `<h2 class="text-lg text-stone-600 font-serif mb-1">${menu.eventDate}${menu.eventTime ? ` a las ${menu.eventTime}` : ''}</h2>` : ''}
              ${menu.eventPlace ? `<h2 class="text-lg text-stone-600 font-serif mb-3">${menu.eventPlace}</h2>` : ''}
              
              <div class="flex items-center justify-center gap-6 mt-6">
                <div class="h-px w-16 bg-stone-300"></div>
                <div class="text-[11px] tracking-[0.3em] uppercase text-stone-800 font-sans font-semibold">
                  ${menuTypeStr}
                </div>
                <div class="h-px w-16 bg-stone-300"></div>
              </div>
            </div>

            <div class="space-y-6 mb-8 w-full flex flex-col items-center max-w-2xl flex-1 justify-center">
              ${recipesHtml}
            </div>

            <div class="mt-auto w-full flex flex-col items-center pb-6">
              <div class="text-center mb-6">
                <div class="text-3xl font-serif font-bold text-stone-900 mb-1">${menu.price.toFixed(2)} €</div>
                ${diffHtml}
                <div class="text-[9px] text-stone-500 uppercase tracking-[0.3em] font-sans font-medium">Precio por persona · IGIC incluido</div>
              </div>

              <div class="pt-6 border-t border-stone-300 w-full max-w-md text-center">
                <p class="text-[8px] text-stone-500 uppercase tracking-[0.25em] font-sans leading-loose px-4">
                  Todos nuestros productos son elaborados en una cocina compartida donde se manipulan alérgenos, por lo que pueden contener trazas.
                </p>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const includedItems = quote.items.filter(i => isItemCountedInTotal(i));
    const alternativeItems = quote.items.filter(i => i.isOption && !i.isIncludedInTotal);
    const hasOptions = quote.items.some(i => i.isOption);

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
          body { font-family: system-ui, -apple-system, sans-serif; color: #1c1917; line-height: 1.5; margin: 0; padding: 0; }
          .quote-page { padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #e7e5e4; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #0f766e; margin: 0; }
          .meta { text-align: right; color: #57534e; }
          .client-info { margin-bottom: 40px; background: #f5f5f4; padding: 20px; border-radius: 8px; }
          .client-info h3 { margin-top: 0; color: #0f766e; }
          .event-info { display: flex; gap: 20px; margin-bottom: 30px; }
          .event-info div { flex: 1; }
          table { border-collapse: collapse; margin-bottom: 24px; width: 100%; }
          th { text-align: left; padding: 10px 12px; border-bottom: 2px solid #e7e5e4; color: #57534e; font-weight: 600; font-size: 13px; }
          td { padding: 10px 12px; border-bottom: 1px solid #e7e5e4; }
          .text-right { text-align: right; }
          .totals { width: 320px; margin-left: auto; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .total-row.final { font-weight: bold; font-size: 1.2em; border-top: 2px solid #1c1917; margin-top: 8px; padding-top: 16px; }
          .notes { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e7e5e4; color: #57534e; font-size: 0.9em; }
          .menu-page { width: 100%; min-height: 100vh; padding: 40px; box-sizing: border-box; page-break-before: always; }
          @media print {
            body { padding: 0; background: white; }
            button { display: none; }
            .quote-page { padding: 20mm; max-width: none; min-height: 100vh; box-sizing: border-box; page-break-after: always; }
            .menu-page { padding: 12mm; width: 100%; height: 100vh; box-sizing: border-box; page-break-before: always; page-break-after: always; }
            @page { margin: 0; size: A4; }
          }
        </style>
      </head>
      <body>
        <div class="quote-page">
          <div class="header">
            <div>
              ${settings?.logoUrl ? `<img src="${settings.logoUrl}" alt="Logo" style="height: 60px; object-fit: contain; margin-bottom: 16px;" crossorigin="anonymous" />` : ''}
              <h1 class="title">PRESUPUESTO</h1>
              <p>Ref: ${quote.reference || `PR-${quote.id.slice(0, 6).toUpperCase()}`}</p>
            </div>
            <div class="meta">
              <p><strong>Fecha:</strong> ${new Date(quote.date).toLocaleDateString('es-ES')}</p>
              <p><strong>Estado:</strong> ${quote.status === 'draft' ? 'Borrador' : quote.status === 'sent' ? 'Enviado' : quote.status === 'accepted' ? 'Aceptado' : 'Rechazado'}</p>
            </div>
          </div>

          <div class="client-info">
            <h3>Datos del Cliente</h3>
            <p><strong>${client?.name || 'Cliente no encontrado'}</strong></p>
            ${client?.company ? `<p>${client.company}</p>` : ''}
            ${client?.email ? `<p>${client.email}</p>` : ''}
            ${client?.phone ? `<p>${client.phone}</p>` : ''}
          </div>

          ${(quote.eventDate || quote.eventType || quote.guests) ? `
          <div class="event-info">
            ${quote.eventDate ? `<div><strong>Fecha del Evento:</strong><br>${new Date(quote.eventDate).toLocaleDateString('es-ES')}</div>` : ''}
            ${quote.eventType ? `<div><strong>Tipo de Evento:</strong><br>${quote.eventType}</div>` : ''}
            ${quote.guests ? `<div><strong>Comensales:</strong><br>${quote.guests} pax</div>` : ''}
          </div>
          ` : ''}

          <div style="margin-bottom: 24px;">
            ${hasOptions ? `
              <div style="font-weight: 600; color: #1c1917; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">
                Servicios y Menús Incluidos en el Total
              </div>
            ` : ''}
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th class="text-right">Cant.</th>
                  <th class="text-right">Precio Ud.</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${includedItems.map(item => `
                  <tr>
                    <td>
                      <strong>${item.description}</strong>
                      ${item.isOption ? `<div style="font-size: 11px; color: #0f766e; font-weight: 500;">★ Opción de menú presupuestada (Grupo: ${item.optionGroup || 'Opciones'})</div>` : ''}
                    </td>
                    <td class="text-right">${item.quantity}</td>
                    <td class="text-right">${item.unitPrice.toFixed(2)} €</td>
                    <td class="text-right font-medium">${item.total.toFixed(2)} €</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          ${alternativeItems.length > 0 ? `
            <div style="margin-top: 20px; margin-bottom: 28px; padding: 16px; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                <div style="font-weight: bold; color: #0f766e; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">
                  Opciones de Menú Alternativas a Elegir (No acumulativas)
                </div>
                <div style="font-size: 11px; color: #78716c;">
                  1 opción a elegir por grupo
                </div>
              </div>
              <p style="font-size: 12px; color: #57534e; margin: 0 0 12px 0; line-height: 1.4;">
                Se presentan las siguientes opciones gastronómicas alternativas para este evento. El importe total del presupuesto contempla la opción base indicada arriba. En caso de elegir alguna de estas alternativas, se aplicará el ajuste por comensal correspondiente:
              </p>
              <table style="margin-bottom: 0; background: white;">
                <thead>
                  <tr style="background: #f5f5f4;">
                    <th>Opción Alternativa</th>
                    <th>Grupo</th>
                    <th class="text-right">Precio Ud.</th>
                    <th class="text-right">Diferencia / comensal</th>
                    <th class="text-right">Total Est. (${quote.guests || alternativeItems[0]?.quantity || 1} pax)</th>
                  </tr>
                </thead>
                <tbody>
                  ${alternativeItems.map(item => {
                    const baseItem = quote.items.find(i => i.isOption && i.optionGroup === item.optionGroup && i.isIncludedInTotal);
                    const diff = baseItem ? (item.unitPrice - baseItem.unitPrice) : 0;
                    const diffText = diff > 0 ? `+${diff.toFixed(2)} €` : diff < 0 ? `-${Math.abs(diff).toFixed(2)} €` : `0,00 € (Mismo precio)`;
                    const diffColor = diff > 0 ? '#b45309' : diff < 0 ? '#0f766e' : '#57534e';
                    return `
                      <tr>
                        <td>
                          <strong>${item.description}</strong>
                          <div style="font-size: 11px; color: #78716c;">Opción alternativa a elegir</div>
                        </td>
                        <td style="font-size: 12px; color: #57534e;">${item.optionGroup || 'Opciones'}</td>
                        <td class="text-right font-mono">${item.unitPrice.toFixed(2)} €</td>
                        <td class="text-right font-mono font-medium" style="color: ${diffColor};">${diffText}</td>
                        <td class="text-right font-mono" style="color: #78716c;">${item.total.toFixed(2)} €</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          <div class="totals">
            <div class="total-row">
              <span>Subtotal Presupuesto:</span>
              <span>${quote.subtotal.toFixed(2)} €</span>
            </div>
            ${quote.tax > 0 ? `
            <div class="total-row">
              <span>IGIC (${quote.tax}%):</span>
              <span>${(quote.subtotal * quote.tax / 100).toFixed(2)} €</span>
            </div>
            ` : ''}
            <div class="total-row final">
              <span>TOTAL PRESUPUESTO:</span>
              <span>${quote.total.toFixed(2)} €</span>
            </div>
          </div>
          ${hasOptions ? `
            <div style="font-size: 11px; color: #78716c; text-align: right; margin-top: 8px; line-height: 1.4;">
              * El importe total incluye los conceptos fijos y 1 opción de menú presupuestada como base. Las opciones alternativas no duplican ni incrementan este presupuesto a menos que sean formalmente elegidas.
            </div>
          ` : ''}

          ${quote.notes ? `
          <div class="notes">
            <strong>Notas y Condiciones:</strong><br>
            ${quote.notes.replace(/\n/g, '<br>')}
          </div>
          ` : ''}

          <div style="margin-top: 40px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #0f766e; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
              Imprimir Presupuesto
            </button>
          </div>
        </div>
        
        ${menusHtml}
        
        <script>
          // Esperar a que Tailwind procese las clases antes de imprimir
          setTimeout(() => {
            window.print();
          }, 1000);
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
                          Combina conceptos fijos (ej. Coffee Break) y opciones alternativas (ej. 3 cocktails a elegir).
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
                              selectedMenuId: menus[0]?.id || '',
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
                            className={`p-3 rounded-xl border transition-all ${
                              item.isOption 
                                ? isIncluded 
                                  ? 'bg-teal-50/60 border-teal-200' 
                                  : 'bg-amber-50/40 border-amber-200'
                                : 'bg-stone-50 border-stone-200'
                            }`}
                          >
                            {/* Cabecera / Clasificación del Concepto */}
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-stone-200/60 text-xs">
                              <div className="flex items-center gap-2">
                                {item.isOption ? (
                                  <div className="flex items-center gap-2">
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
                                        className="px-2 py-0.5 bg-white border border-stone-300 rounded text-xs w-36 font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
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
                    Seleccionar Menú
                  </label>
                  <select
                    value={addOptionModal.selectedMenuId}
                    onChange={e => setAddOptionModal({ ...addOptionModal, selectedMenuId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  >
                    {menus.map(menu => (
                      <option key={menu.id} value={menu.id}>
                        {menu.nameES} — {menu.price.toFixed(2)} € ({menu.recipes.length} platos)
                      </option>
                    ))}
                  </select>
                </div>

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

                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 leading-relaxed space-y-1">
                  <p className="font-semibold text-stone-800 flex items-center gap-1">
                    <Info size={14} className="text-teal-600" />
                    ¿Cómo se calcula en el presupuesto?
                  </p>
                  <p>
                    El <strong>primer menú</strong> de este grupo figurará como la <strong>opción base</strong> y se incluirá en el total del presupuesto.
                  </p>
                  <p>
                    Los <strong>siguientes menús</strong> del mismo grupo se añadirán como <strong>opciones alternativas</strong>: se presentarán al cliente para elegir en el presupuesto impreso/PDF pero <strong>no sumarán su importe dos veces</strong>.
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
                  onClick={() => {
                    if (!addOptionModal.selectedMenuId) return;
                    addMenuToQuote(addOptionModal.selectedMenuId, true, addOptionModal.optionGroup);
                    setAddOptionModal({ ...addOptionModal, isOpen: false });
                  }}
                  className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors"
                >
                  Añadir Opción
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
