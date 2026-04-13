import React, { useState } from 'react';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, MessageSquare, Lightbulb, Edit2, X, Check, ExternalLink } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../firebase';

export default function ProductionBrainstorming() {
  const { appUser } = useAuth();
  const { menus, productionIdeas, clients } = useData();
  const { showToast } = useToast();
  
  const isAdminOrDocente = appUser?.role === 'admin' || appUser?.role === 'docente';

  const [selectedMenuId, setSelectedMenuId] = useState<string>('');
  const [newIdea, setNewIdea] = useState('');
  const [newReferenceLink, setNewReferenceLink] = useState('');
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [editingIdeaText, setEditingIdeaText] = useState('');
  const [editingReferenceLink, setEditingReferenceLink] = useState('');

  const handleAddIdea = async () => {
    if (!newIdea.trim() || !appUser || !selectedMenuId) return;

    const id = doc(collection(db, 'production_ideas')).id;
    try {
      await setDoc(doc(db, 'production_ideas', id), {
        id,
        menuId: selectedMenuId,
        idea: newIdea,
        referenceLink: newReferenceLink.trim() || null,
        createdBy: appUser.name,
        createdAt: new Date().toISOString()
      });
      setNewIdea('');
      setNewReferenceLink('');
      showToast('Idea añadida', 'success');
    } catch (error) {
      showToast('Error al añadir idea', 'error');
      handleFirestoreError(error, OperationType.WRITE, `production_ideas/${id}`);
    }
  };

  const handleDeleteIdea = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'production_ideas', id));
      showToast('Idea eliminada', 'success');
    } catch (error) {
      showToast('Error al eliminar idea', 'error');
      handleFirestoreError(error, OperationType.DELETE, `production_ideas/${id}`);
    }
  };

  const handleStartEdit = (ideaId: string, currentText: string, currentLink?: string) => {
    setEditingIdeaId(ideaId);
    setEditingIdeaText(currentText);
    setEditingReferenceLink(currentLink || '');
  };

  const handleCancelEdit = () => {
    setEditingIdeaId(null);
    setEditingIdeaText('');
    setEditingReferenceLink('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingIdeaText.trim()) return;
    
    try {
      await updateDoc(doc(db, 'production_ideas', id), {
        idea: editingIdeaText,
        referenceLink: editingReferenceLink.trim() || null
      });
      setEditingIdeaId(null);
      setEditingIdeaText('');
      setEditingReferenceLink('');
      showToast('Idea actualizada', 'success');
    } catch (error) {
      showToast('Error al actualizar idea', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `production_ideas/${id}`);
    }
  };

  const filteredIdeas = productionIdeas.filter(idea => idea.menuId === selectedMenuId);
  const selectedMenu = menus.find(m => m.id === selectedMenuId);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500 tracking-tight mb-2 flex items-center gap-3">
          <Lightbulb className="text-teal-600" size={36} />
          Tormenta de Ideas (Producción)
        </h1>
        <p className="text-stone-500 text-lg">
          Pizarra de trabajo para añadir ideas vinculadas a los menús.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm mb-8">
        <label className="block text-sm font-medium text-stone-700 mb-2">Selecciona un Menú</label>
        <select
          value={selectedMenuId}
          onChange={(e) => setSelectedMenuId(e.target.value)}
          className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">-- Selecciona un menú --</option>
          {menus.map(menu => {
            const dateStr = menu.eventDate ? ` - 📅 ${menu.eventDate}` : '';
            const placeStr = menu.eventPlace ? ` - 📍 ${menu.eventPlace}` : '';
            const clientName = clients.find(c => c.id === menu.clientId)?.name || menu.clientId;
            const clientStr = clientName ? ` - 👤 ${clientName}` : '';
            return (
              <option key={menu.id} value={menu.id}>
                {menu.nameES}{dateStr}{placeStr}{clientStr}
              </option>
            );
          })}
        </select>
      </div>

      {selectedMenuId && selectedMenu && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-wrap gap-4 text-sm text-stone-600">
            {selectedMenu.clientId && <div className="flex items-center gap-2">👤 <span className="font-medium">Cliente:</span> {clients.find(c => c.id === selectedMenu.clientId)?.name || selectedMenu.clientId}</div>}
          </div>

          {isAdminOrDocente && (
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-4">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={newIdea}
                  onChange={(e) => setNewIdea(e.target.value)}
                  placeholder="Escribe una nueva idea para este menú..."
                  className="flex-1 px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddIdea()}
                />
                <button
                  onClick={handleAddIdea}
                  disabled={!newIdea.trim()}
                  className="px-6 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shrink-0"
                >
                  <Plus size={20} />
                  Añadir Idea
                </button>
              </div>
              <input
                type="url"
                value={newReferenceLink}
                onChange={(e) => setNewReferenceLink(e.target.value)}
                placeholder="Enlace de referencia (opcional)..."
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleAddIdea()}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIdeas.map(idea => (
              <div key={idea.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2 text-stone-500 text-sm">
                    <MessageSquare size={16} />
                    <span>{idea.createdBy}</span>
                  </div>
                  {isAdminOrDocente && (
                    <div className="flex items-center gap-2">
                      {editingIdeaId !== idea.id && (
                        <button
                          onClick={() => handleStartEdit(idea.id, idea.idea, idea.referenceLink)}
                          className="text-stone-400 hover:text-teal-600 transition-colors"
                          title="Editar idea"
                        >
                          <Edit2 size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteIdea(idea.id)}
                        className="text-stone-400 hover:text-red-600 transition-colors"
                        title="Eliminar idea"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
                {editingIdeaId === idea.id ? (
                  <div className="flex-1 flex flex-col gap-2">
                    <textarea
                      value={editingIdeaText}
                      onChange={(e) => setEditingIdeaText(e.target.value)}
                      className="w-full flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                      rows={4}
                    />
                    <input
                      type="url"
                      value={editingReferenceLink}
                      onChange={(e) => setEditingReferenceLink(e.target.value)}
                      placeholder="Enlace de referencia (opcional)..."
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleCancelEdit}
                        className="p-1.5 text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
                        title="Cancelar"
                      >
                        <X size={18} />
                      </button>
                      <button
                        onClick={() => handleSaveEdit(idea.id)}
                        disabled={!editingIdeaText.trim() || (editingIdeaText === idea.idea && editingReferenceLink === (idea.referenceLink || ''))}
                        className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Guardar"
                      >
                        <Check size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <p className="text-stone-800 whitespace-pre-wrap">{idea.idea}</p>
                    {idea.referenceLink && (
                      <a 
                        href={idea.referenceLink.startsWith('http') ? idea.referenceLink : `https://${idea.referenceLink}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:text-teal-700 text-sm mt-2 flex items-center gap-1.5 w-fit font-medium bg-teal-50 px-2 py-1 rounded-md transition-colors"
                      >
                        <ExternalLink size={14} />
                        <span className="truncate max-w-[250px] sm:max-w-sm">{idea.referenceLink}</span>
                      </a>
                    )}
                  </div>
                )}
                <div className="mt-4 text-xs text-stone-400">
                  {new Date(idea.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
            {filteredIdeas.length === 0 && (
              <div className="col-span-full bg-white p-12 rounded-2xl border border-stone-200 text-center text-stone-500">
                <Lightbulb size={48} className="mx-auto mb-4 opacity-20" />
                <p>Aún no hay ideas para este menú.</p>
                {isAdminOrDocente && <p className="text-sm mt-2">¡Sé el primero en añadir una!</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
