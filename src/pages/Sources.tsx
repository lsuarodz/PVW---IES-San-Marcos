import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { BenchmarkingSource } from '../types';
import ConfirmModal from '../components/ConfirmModal';

export default function Sources() {
  const { appUser } = useAuth();
  const { showToast } = useToast();
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'docente';

  const [sources, setSources] = useState<BenchmarkingSource[]>([]);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [sourceForm, setSourceForm] = useState<Partial<BenchmarkingSource>>({});

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    const unsubSources = onSnapshot(query(collection(db, 'benchmarking_sources'), orderBy('createdAt', 'asc')), (snapshot) => {
      setSources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BenchmarkingSource)));
    });

    return () => unsubSources();
  }, []);

  const handleSaveSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    const id = doc(collection(db, 'benchmarking_sources')).id;
    try {
      await setDoc(doc(db, 'benchmarking_sources', id), {
        id,
        group: appUser.group || 'Sin Grupo',
        url: sourceForm.url || '',
        strengths: sourceForm.strengths || '',
        weaknesses: sourceForm.weaknesses || '',
        description: sourceForm.description || '',
        createdAt: new Date().toISOString()
      });
      setIsSourceModalOpen(false);
      setSourceForm({});
      showToast('Fuente añadida correctamente', 'success');
    } catch (error) {
      console.error('Error saving source:', error);
      showToast('Error al guardar la fuente', 'error');
    }
  };

  const handleDeleteSource = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Fuente',
      message: '¿Estás seguro de eliminar esta fuente?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'benchmarking_sources', id));
          showToast('Fuente eliminada', 'success');
        } catch (error) {
          console.error('Error deleting source:', error);
          showToast('Error al eliminar', 'error');
        }
      }
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Fuentes de Inspiración</h1>
        <p className="text-stone-500 mt-2">Recopilación de páginas web útiles para el diseño y escandallo de menús.</p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-stone-800">Enlaces y Referencias</h3>
        <button
          onClick={() => setIsSourceModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
        >
          <Plus size={16} />
          Añadir Fuente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sources.map(source => (
          <div key={source.id} className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md">
                  {source.group}
                </span>
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-medium break-all">
                  {source.url} <ExternalLink size={14} />
                </a>
              </div>
              {(isAdmin || appUser?.group === source.group) && (
                <button onClick={() => handleDeleteSource(source.id)} className="text-stone-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-bold text-emerald-700 mb-1">Puntos Fuertes</h4>
                <p className="text-stone-700 bg-emerald-50 p-3 rounded-lg">{source.strengths}</p>
              </div>
              <div>
                <h4 className="font-bold text-red-700 mb-1">Puntos Débiles</h4>
                <p className="text-stone-700 bg-red-50 p-3 rounded-lg">{source.weaknesses}</p>
              </div>
              <div>
                <h4 className="font-bold text-stone-800 mb-1">¿Por qué nos viene bien?</h4>
                <p className="text-stone-600">{source.description}</p>
              </div>
            </div>
          </div>
        ))}
        {sources.length === 0 && (
          <div className="col-span-full text-center py-12 text-stone-500 bg-stone-50 rounded-xl border border-stone-200 border-dashed">
            No hay fuentes añadidas todavía.
          </div>
        )}
      </div>

      {/* Modal Fuente */}
      {isSourceModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-stone-100">
              <h2 className="text-xl font-bold text-stone-900">Añadir Fuente de Inspiración</h2>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="source-form" onSubmit={handleSaveSource} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">URL (Enlace)</label>
                  <input required type="url" value={sourceForm.url || ''} onChange={e => setSourceForm({...sourceForm, url: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Puntos Fuertes</label>
                  <textarea required value={sourceForm.strengths || ''} onChange={e => setSourceForm({...sourceForm, strengths: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" rows={3}></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Puntos Débiles</label>
                  <textarea required value={sourceForm.weaknesses || ''} onChange={e => setSourceForm({...sourceForm, weaknesses: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" rows={3}></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Descripción (¿Por qué nos viene bien?)</label>
                  <textarea required value={sourceForm.description || ''} onChange={e => setSourceForm({...sourceForm, description: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" rows={3}></textarea>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-stone-100 flex justify-end gap-3 bg-stone-50 rounded-b-2xl">
              <button onClick={() => setIsSourceModalOpen(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-200 rounded-lg font-medium">Cancelar</button>
              <button type="submit" form="source-form" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
