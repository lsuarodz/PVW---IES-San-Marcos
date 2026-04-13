import React, { useState } from 'react';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, Edit2, FileText, Printer, PlusCircle, MinusCircle } from 'lucide-react';
import { Quote, QuoteItem } from '../types';
import ConfirmModal from '../components/ConfirmModal';

export default function Quotes() {
  const { appUser } = useAuth();
  const { quotes, clients, menus } = useData();
  const { showToast } = useToast();
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'docente';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Quote>>({
    items: [],
    tax: 21,
    status: 'draft',
    date: new Date().toISOString().split('T')[0]
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const calculateTotals = (items: QuoteItem[], taxRate: number) => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleItemChange = (index: number, field: keyof QuoteItem, value: string | number) => {
    const newItems = [...(formData.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate item total
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = Number(newItems[index].quantity) * Number(newItems[index].unitPrice);
    }

    const totals = calculateTotals(newItems, formData.tax || 21);
    
    setFormData({
      ...formData,
      items: newItems,
      ...totals
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...(formData.items || []), { description: '', quantity: 1, unitPrice: 0, total: 0 }]
    });
  };

  const addMenuToQuote = (menuId: string) => {
    const menu = menus.find(m => m.id === menuId);
    if (!menu) return;

    const quantity = formData.guests || 1;
    const newItem: QuoteItem = {
      description: `Menú: ${menu.nameES}`,
      quantity: quantity,
      unitPrice: menu.price,
      total: quantity * menu.price
    };

    const newItems = [...(formData.items || []), newItem];
    const totals = calculateTotals(newItems, formData.tax || 21);

    setFormData({
      ...formData,
      items: newItems,
      ...totals
    });
    showToast('Menú añadido al presupuesto', 'success');
  };

  const removeItem = (index: number) => {
    const newItems = [...(formData.items || [])];
    newItems.splice(index, 1);
    const totals = calculateTotals(newItems, formData.tax || 21);
    setFormData({
      ...formData,
      items: newItems,
      ...totals
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
    
    let reference = quotes.find(q => q.id === editingId)?.reference;
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
      items: formData.items || [],
      subtotal: formData.subtotal || 0,
      tax: formData.tax || 21,
      total: formData.total || 0,
      notes: formData.notes || '',
      status: formData.status as any || 'draft',
      createdBy: editingId ? (quotes.find(q => q.id === editingId)?.createdBy || appUser.name) : appUser.name,
      createdAt: editingId ? (quotes.find(q => q.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'quotes', id), quoteData);
      setIsModalOpen(false);
      setFormData({ items: [], tax: 21, status: 'draft', date: new Date().toISOString().split('T')[0] });
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

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Presupuesto - ${client?.name || 'Cliente'}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; color: #1c1917; line-height: 1.5; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #e7e5e4; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #0f766e; margin: 0; }
          .meta { text-align: right; color: #57534e; }
          .client-info { margin-bottom: 40px; background: #f5f5f4; padding: 20px; border-radius: 8px; }
          .client-info h3 { margin-top: 0; color: #0f766e; }
          .event-info { display: flex; gap: 20px; margin-bottom: 30px; }
          .event-info div { flex: 1; }
          table { w-full; border-collapse: collapse; margin-bottom: 30px; width: 100%; }
          th { text-align: left; padding: 12px; border-bottom: 2px solid #e7e5e4; color: #57534e; font-weight: 600; }
          td { padding: 12px; border-bottom: 1px solid #e7e5e4; }
          .text-right { text-align: right; }
          .totals { width: 300px; margin-left: auto; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .total-row.final { font-weight: bold; font-size: 1.2em; border-top: 2px solid #1c1917; margin-top: 8px; padding-top: 16px; }
          .notes { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e7e5e4; color: #57534e; font-size: 0.9em; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
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
            ${quote.items.map(item => `
              <tr>
                <td>${item.description}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${item.unitPrice.toFixed(2)} €</td>
                <td class="text-right">${item.total.toFixed(2)} €</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${quote.subtotal.toFixed(2)} €</span>
          </div>
          <div class="total-row">
            <span>IVA (${quote.tax}%):</span>
            <span>${quote.tax.toFixed(2)} €</span>
          </div>
          <div class="total-row final">
            <span>TOTAL:</span>
            <span>${quote.total.toFixed(2)} €</span>
          </div>
        </div>

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
              setFormData({ items: [], tax: 21, status: 'draft', date: new Date().toISOString().split('T')[0] });
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
                      {quote.total.toFixed(2)} €
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
                        onChange={e => setFormData({...formData, guests: Number(e.target.value)})}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-stone-900">Conceptos</h3>
                      <div className="flex items-center gap-3">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              addMenuToQuote(e.target.value);
                              e.target.value = ''; // Reset select
                            }
                          }}
                          className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="">Añadir menú...</option>
                          {menus.map(menu => (
                            <option key={menu.id} value={menu.id}>{menu.nameES} ({menu.price.toFixed(2)} €)</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={addItem}
                          className="text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 text-sm"
                        >
                          <PlusCircle size={16} />
                          Añadir línea
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-12 gap-3 text-sm font-medium text-stone-500 px-2">
                        <div className="col-span-6">Descripción</div>
                        <div className="col-span-2 text-right">Cantidad</div>
                        <div className="col-span-2 text-right">Precio Ud.</div>
                        <div className="col-span-2 text-right">Total</div>
                      </div>
                      
                      {formData.items?.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-3 items-center bg-stone-50 p-2 rounded-lg border border-stone-200">
                          <div className="col-span-6">
                            <input
                              type="text"
                              required
                              value={item.description}
                              onChange={e => handleItemChange(index, 'description', e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                              placeholder="Concepto..."
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                              className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 text-right"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={e => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                              className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 text-right"
                            />
                          </div>
                          <div className="col-span-1 text-right font-medium text-stone-700">
                            {item.total.toFixed(2)} €
                          </div>
                          <div className="col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-stone-400 hover:text-red-600 transition-colors p-1"
                            >
                              <MinusCircle size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {(!formData.items || formData.items.length === 0) && (
                        <div className="text-center py-6 text-stone-500 text-sm border border-dashed border-stone-300 rounded-lg">
                          No hay conceptos añadidos. Pulsa "Añadir línea" para empezar.
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
                      <div className="flex justify-between items-center text-stone-600">
                        <div className="flex items-center gap-2">
                          <span>IVA</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={formData.tax}
                            onChange={e => {
                              const tax = Number(e.target.value);
                              const totals = calculateTotals(formData.items || [], tax);
                              setFormData({...formData, tax, ...totals});
                            }}
                            className="w-16 px-2 py-1 text-sm bg-white border border-stone-200 rounded text-right"
                          />
                          <span>%</span>
                        </div>
                        <span>{(formData.tax || 0).toFixed(2)} €</span>
                      </div>
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
      </div>
    </div>
  );
}
