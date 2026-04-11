import React, { useState } from 'react';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, MessageSquare, Lightbulb } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../firebase';

export default function ProductionBrainstorming() {
  const { appUser } = useAuth();
  const { menus, productionIdeas } = useData();
  const { showToast } = useToast();
  
  const isAdminOrDocente = appUser?.role === 'admin' || appUser?.role === 'docente';

  const [selectedMenuId, setSelectedMenuId] = useState<string>('');
  const [newIdea, setNewIdea] = useState('');

  const handleAddIdea = async () => {
    if (!newIdea.trim() || !appUser || !selectedMenuId) return;

    const id = doc(collection(db, 'production_ideas')).id;
    try {
      await setDoc(doc(db, 'production_ideas', id), {
        id,
        menuId: selectedMenuId,
        idea: newIdea,
        createdBy: appUser.name,
        createdAt: new Date().toISOString()
      });
      setNewIdea('');
      showToast('Idea añadida', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `production_ideas/${id}`);
      showToast('Error al añadir idea', 'error');
    }
  };

  const handleDeleteIdea = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'production_ideas', id));
      showToast('Idea eliminada', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `production_ideas/${id}`);
      showToast('Error al eliminar idea', 'error');
    }
  };

  const filteredIdeas = productionIdeas.filter(idea => idea.menuId === selectedMenuId);
  const selectedMenu = menus.find(m => m.id === selectedMenuId);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-800 mb-2 flex items-center gap-3">
          <Lightbulb className="text-teal-600" size={32} />
          Tormenta de Ideas (Producción)
        </h1>
        <p className="text-stone-500">
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
          {menus.map(menu => (
            <option key={menu.id} value={menu.id}>{menu.nameES}</option>
          ))}
        </select>
      </div>

      {selectedMenuId && (
        <div className="space-y-6">
          {isAdminOrDocente && (
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex gap-4">
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
                className="px-6 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
              >
                <Plus size={20} />
                Añadir Idea
              </button>
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
                    <button
                      onClick={() => handleDeleteIdea(idea.id)}
                      className="text-stone-400 hover:text-red-600 transition-colors"
                      title="Eliminar idea"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                <p className="text-stone-800 flex-1 whitespace-pre-wrap">{idea.idea}</p>
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
