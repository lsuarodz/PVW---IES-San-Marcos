import React, { useState } from 'react';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, Edit2, Phone, Mail, MapPin, Building2, User } from 'lucide-react';
import { Client } from '../types';
import ConfirmModal from '../components/ConfirmModal';

export default function Clients() {
  const { appUser } = useAuth();
  const { clients } = useData();
  const { showToast } = useToast();
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'docente';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({});

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    const id = editingId || doc(collection(db, 'clients')).id;
    const clientData: Client = {
      id,
      name: formData.name || '',
      contactName: formData.contactName || '',
      phone: formData.phone || '',
      email: formData.email || '',
      company: formData.company || '',
      address: formData.address || '',
      notes: formData.notes || '',
      createdBy: editingId ? (clients.find(c => c.id === editingId)?.createdBy || appUser.name) : appUser.name,
      createdAt: editingId ? (clients.find(c => c.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'clients', id), clientData);
      setIsModalOpen(false);
      setFormData({});
      setEditingId(null);
      showToast(editingId ? 'Cliente actualizado' : 'Cliente guardado', 'success');
    } catch (error) {
      console.error('Error saving client:', error);
      showToast('Error al guardar el cliente', 'error');
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Cliente',
      message: '¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'clients', id));
          showToast('Cliente eliminado', 'success');
        } catch (error) {
          console.error('Error deleting client:', error);
          showToast('Error al eliminar', 'error');
        }
      }
    });
  };

  const openEdit = (client: Client) => {
    setFormData(client);
    setEditingId(client.id);
    setIsModalOpen(true);
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
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Clientes</h1>
            <p className="text-stone-500 mt-2">Gestiona tu cartera de clientes y contactos.</p>
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
            Nuevo Cliente
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map(client => (
            <div key={client.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">{client.name}</h3>
                    {client.company && (
                      <div className="flex items-center gap-1.5 text-stone-500 text-sm mt-1">
                        <Building2 size={14} />
                        <span>{client.company}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(client)}
                      className="p-2 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    {(isAdmin || client.createdBy === appUser?.name) && (
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {client.contactName && (
                    <div className="flex items-start gap-3 text-sm">
                      <User size={16} className="text-stone-400 mt-0.5 shrink-0" />
                      <span className="text-stone-600">{client.contactName}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-start gap-3 text-sm">
                      <Phone size={16} className="text-stone-400 mt-0.5 shrink-0" />
                      <a href={`tel:${client.phone}`} className="text-stone-600 hover:text-teal-600 transition-colors">
                        {client.phone}
                      </a>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-start gap-3 text-sm">
                      <Mail size={16} className="text-stone-400 mt-0.5 shrink-0" />
                      <a href={`mailto:${client.email}`} className="text-stone-600 hover:text-teal-600 transition-colors break-all">
                        {client.email}
                      </a>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-start gap-3 text-sm">
                      <MapPin size={16} className="text-stone-400 mt-0.5 shrink-0" />
                      <span className="text-stone-600">{client.address}</span>
                    </div>
                  )}
                </div>

                {client.notes && (
                  <div className="mt-4 pt-4 border-t border-stone-100">
                    <p className="text-sm text-stone-500 line-clamp-2" title={client.notes}>
                      {client.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {clients.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-stone-200 border-dashed p-12 text-center">
              <User className="mx-auto h-12 w-12 text-stone-300 mb-4" />
              <h3 className="text-lg font-medium text-stone-900 mb-1">No hay clientes</h3>
              <p className="text-stone-500">Añade tu primer cliente para empezar a gestionar tu cartera.</p>
            </div>
          )}
        </div>

        {/* Modal Form */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-stone-100">
                <h2 className="text-xl font-bold text-stone-900">
                  {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h2>
              </div>
              <div className="p-6 overflow-y-auto">
                <form id="client-form" onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-stone-700 mb-1">Nombre del Cliente *</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="Nombre de la empresa o particular"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Empresa</label>
                      <input
                        type="text"
                        value={formData.company || ''}
                        onChange={e => setFormData({...formData, company: e.target.value})}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="Razón social"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Persona de contacto</label>
                      <input
                        type="text"
                        value={formData.contactName || ''}
                        onChange={e => setFormData({...formData, contactName: e.target.value})}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="Nombre del contacto"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Teléfono</label>
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="+34 600 000 000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-stone-700 mb-1">Dirección</label>
                      <input
                        type="text"
                        value={formData.address || ''}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="Dirección completa"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-stone-700 mb-1">Notas adicionales</label>
                      <textarea
                        rows={3}
                        value={formData.notes || ''}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                        placeholder="Condiciones especiales, preferencias..."
                      />
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
                  form="client-form"
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
