import React, { useState } from 'react';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, Edit2, Phone, Mail, MapPin, Building2 } from 'lucide-react';
import { Provider } from '../types';
import ConfirmModal from '../components/ConfirmModal';

export default function Providers() {
  const { appUser } = useAuth();
  const { providers } = useData();
  const { showToast } = useToast();
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'docente';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Provider>>({});

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    const id = editingId || doc(collection(db, 'providers')).id;
    const providerData: Provider = {
      id,
      name: formData.name || '',
      contactName: formData.contactName || '',
      phone: formData.phone || '',
      email: formData.email || '',
      goodsType: formData.goodsType || '',
      address: formData.address || '',
      notes: formData.notes || '',
      createdBy: editingId ? (providers.find(p => p.id === editingId)?.createdBy || appUser.name) : appUser.name,
      createdAt: editingId ? (providers.find(p => p.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'providers', id), providerData);
      setIsModalOpen(false);
      setFormData({});
      setEditingId(null);
      showToast(editingId ? 'Proveedor actualizado' : 'Proveedor guardado', 'success');
    } catch (error) {
      console.error('Error saving provider:', error);
      showToast('Error al guardar el proveedor', 'error');
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Proveedor',
      message: '¿Estás seguro de eliminar este proveedor? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'providers', id));
          showToast('Proveedor eliminado', 'success');
        } catch (error) {
          console.error('Error deleting provider:', error);
          showToast('Error al eliminar', 'error');
        }
      }
    });
  };

  const openEdit = (provider: Provider) => {
    setFormData(provider);
    setEditingId(provider.id);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-full p-8">
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
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500 tracking-tight mb-2">Proveedores</h1>
          <p className="text-stone-500 text-lg">Gestiona tu lista de proveedores y contactos.</p>
        </div>
        <button
          onClick={() => {
            setFormData({});
            setEditingId(null);
            setIsModalOpen(true);
          }}
          className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Nuevo Proveedor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map(provider => (
          <div key={provider.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
                <Building2 size={24} />
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(provider)} className="p-2 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Editar">
                  <Edit2 size={18} />
                </button>
                {isAdmin && (
                  <button onClick={() => handleDelete(provider.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-stone-900 mb-1">{provider.name}</h3>
            {provider.goodsType && (
              <span className="inline-block bg-stone-100 text-stone-600 text-xs px-2 py-1 rounded-md mb-4 font-medium">
                {provider.goodsType}
              </span>
            )}

            <div className="space-y-2 mb-6 flex-1">
              {provider.contactName && (
                <div className="text-sm text-stone-600 flex items-center gap-2">
                  <span className="font-medium text-stone-900">Contacto:</span> {provider.contactName}
                </div>
              )}
              {provider.phone && (
                <div className="text-sm text-stone-600 flex items-center gap-2">
                  <Phone size={14} className="text-stone-400" /> {provider.phone}
                </div>
              )}
              {provider.email && (
                <div className="text-sm text-stone-600 flex items-center gap-2">
                  <Mail size={14} className="text-stone-400" /> {provider.email}
                </div>
              )}
              {provider.address && (
                <div className="text-sm text-stone-600 flex items-center gap-2">
                  <MapPin size={14} className="text-stone-400" /> {provider.address}
                </div>
              )}
            </div>

            {provider.notes && (
              <div className="text-xs text-stone-500 bg-stone-50 p-3 rounded-lg mb-4 italic">
                {provider.notes}
              </div>
            )}
            
            <div className="text-xs text-stone-400 border-t border-stone-100 pt-4">
              Añadido por {provider.createdBy}
            </div>
          </div>
        ))}
        {providers.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-500">
            No hay proveedores registrados.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-stone-100">
              <h2 className="text-xl font-bold text-stone-900">
                {editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="provider-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-stone-700 mb-1">Nombre de la Empresa *</label>
                  <input required type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Tipo de Bienes</label>
                  <input type="text" placeholder="Ej. Pescadería, Frutería..." value={formData.goodsType || ''} onChange={e => setFormData({...formData, goodsType: e.target.value})} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Persona de Contacto</label>
                  <input type="text" value={formData.contactName || ''} onChange={e => setFormData({...formData, contactName: e.target.value})} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Teléfono</label>
                  <input type="tel" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                  <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-stone-700 mb-1">Dirección</label>
                  <input type="text" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-stone-700 mb-1">Notas adicionales</label>
                  <textarea rows={3} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-stone-100 flex justify-end gap-3 bg-stone-50 rounded-b-2xl">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-stone-600 hover:bg-stone-200 rounded-xl font-medium transition-colors">Cancelar</button>
              <button type="submit" form="provider-form" className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors">Guardar</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
