import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, Edit2, Lightbulb } from 'lucide-react';
import { BenchmarkingCompany, BenchmarkingIdea } from '../types';
import ConfirmModal from '../components/ConfirmModal';

export default function Benchmarking() {
  const { appUser } = useAuth();
  const { showToast } = useToast();
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'docente';

  const [companies, setCompanies] = useState<BenchmarkingCompany[]>([]);
  const [ideas, setIdeas] = useState<BenchmarkingIdea[]>([]);

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [companyType, setCompanyType] = useState<'coffee' | 'brunch'>('coffee');
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [companyForm, setCompanyForm] = useState<Partial<BenchmarkingCompany>>({});

  const [newIdea, setNewIdea] = useState('');
  const [ideaType, setIdeaType] = useState<'coffee' | 'brunch'>('coffee');

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    const unsubCompanies = onSnapshot(query(collection(db, 'benchmarking_companies'), orderBy('createdAt', 'asc')), (snapshot) => {
      setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BenchmarkingCompany)));
    });
    const unsubIdeas = onSnapshot(query(collection(db, 'benchmarking_ideas'), orderBy('createdAt', 'asc')), (snapshot) => {
      setIdeas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BenchmarkingIdea)));
    });

    return () => {
      unsubCompanies();
      unsubIdeas();
    };
  }, []);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    const id = editingCompanyId || doc(collection(db, 'benchmarking_companies')).id;
    const data: BenchmarkingCompany = {
      id,
      type: companyType,
      group: appUser.group || 'Sin Grupo',
      name: companyForm.name || '',
      companyType: companyForm.companyType || '',
      hasWebAndPrices: companyForm.hasWebAndPrices || '',
      clearPlates: companyForm.clearPlates || '',
      variety: companyForm.variety || '',
      travels: companyForm.travels || '',
      flexibleHours: companyForm.flexibleHours || '',
      hasPhotos: companyForm.hasPhotos || '',
      quality: companyForm.quality || '',
      priceRange: companyForm.priceRange || '',
      reviews: companyForm.reviews || '',
      bestPlate: companyForm.bestPlate || '',
      coffeeType: companyForm.coffeeType || '',
      sustainability: companyForm.sustainability || '',
      createdAt: editingCompanyId ? (companies.find(c => c.id === editingCompanyId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'benchmarking_companies', id), data);
      setIsCompanyModalOpen(false);
      setCompanyForm({});
      setEditingCompanyId(null);
      showToast('Empresa guardada correctamente', 'success');
    } catch (error) {
      console.error('Error saving company:', error);
      showToast('Error al guardar la empresa', 'error');
    }
  };

  const handleDeleteCompany = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Empresa',
      message: '¿Estás seguro de eliminar esta empresa del benchmarking?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'benchmarking_companies', id));
          showToast('Empresa eliminada', 'success');
        } catch (error) {
          console.error('Error deleting company:', error);
          showToast('Error al eliminar', 'error');
        }
      }
    });
  };

  const handleAddIdea = async (type: 'coffee' | 'brunch' | 'general') => {
    if (!newIdea.trim() || !appUser) return;

    const id = doc(collection(db, 'benchmarking_ideas')).id;
    try {
      await setDoc(doc(db, 'benchmarking_ideas', id), {
        id,
        type,
        group: appUser.group || 'Sin Grupo',
        idea: newIdea,
        createdAt: new Date().toISOString()
      });
      setNewIdea('');
      showToast('Idea añadida', 'success');
    } catch (error) {
      console.error('Error adding idea:', error);
      showToast('Error al añadir idea', 'error');
    }
  };

  const handleDeleteIdea = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'benchmarking_ideas', id));
      showToast('Idea eliminada', 'success');
    } catch (error) {
      console.error('Error deleting idea:', error);
      showToast('Error al eliminar idea', 'error');
    }
  };

  const renderCompanyTable = (type: 'coffee' | 'brunch') => {
    const typeCompanies = companies.filter(c => c.type === type);
    const title = type === 'coffee' ? 'Coffee Breaks' : 'Brunchs';

    return (
      <div className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-stone-800">{title}</h3>
          {typeCompanies.length < 9 && (
            <button
              onClick={() => {
                setCompanyType(type);
                setCompanyForm({});
                setEditingCompanyId(null);
                setIsCompanyModalOpen(true);
              }}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
            >
              <Plus size={16} />
              Añadir Empresa ({typeCompanies.length}/9)
            </button>
          )}
        </div>

        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-stone-200 mb-6">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-violet-800 text-white text-xs">
                <th className="p-3 border-r border-violet-700">Grupo</th>
                <th className="p-3 border-r border-violet-700">Nombre de Empresa</th>
                <th className="p-3 border-r border-violet-700">Tipo de Empresa</th>
                <th className="p-3 border-r border-violet-700">Página Web / Precios</th>
                <th className="p-3 border-r border-violet-700">Exposición de platos</th>
                <th className="p-3 border-r border-violet-700">Variedad dulce/salado</th>
                <th className="p-3 border-r border-violet-700">Desplazamiento isla</th>
                <th className="p-3 border-r border-violet-700">Flexibilidad horaria</th>
                <th className="p-3 border-r border-violet-700">Fotos de menús</th>
                <th className="p-3 border-r border-violet-700">Calidad productos</th>
                <th className="p-3 border-r border-violet-700">Rango precios</th>
                <th className="p-3 border-r border-violet-700">Puntuación reseñas</th>
                <th className="p-3 border-r border-violet-700">Plato llamativo</th>
                <th className="p-3 border-r border-violet-700">Tipo/Marca café</th>
                <th className="p-3 border-r border-violet-700">Sostenibilidad</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-sm">
              {typeCompanies.length === 0 ? (
                <tr>
                  <td colSpan={16} className="p-8 text-center text-stone-500">
                    Aún no hay empresas analizadas para {title.toLowerCase()}.
                  </td>
                </tr>
              ) : (
                typeCompanies.map(company => (
                  <tr key={company.id} className="hover:bg-stone-50">
                    <td className="p-3 border-r border-stone-200 font-medium text-violet-700">{company.group}</td>
                    <td className="p-3 border-r border-stone-200 font-bold">{company.name}</td>
                    <td className="p-3 border-r border-stone-200">{company.companyType}</td>
                    <td className="p-3 border-r border-stone-200">{company.hasWebAndPrices}</td>
                    <td className="p-3 border-r border-stone-200">{company.clearPlates}</td>
                    <td className="p-3 border-r border-stone-200">{company.variety}</td>
                    <td className="p-3 border-r border-stone-200">{company.travels}</td>
                    <td className="p-3 border-r border-stone-200">{company.flexibleHours}</td>
                    <td className="p-3 border-r border-stone-200">{company.hasPhotos}</td>
                    <td className="p-3 border-r border-stone-200">{company.quality}</td>
                    <td className="p-3 border-r border-stone-200">{company.priceRange}</td>
                    <td className="p-3 border-r border-stone-200">{company.reviews}</td>
                    <td className="p-3 border-r border-stone-200">{company.bestPlate}</td>
                    <td className="p-3 border-r border-stone-200">{company.coffeeType}</td>
                    <td className="p-3 border-r border-stone-200">{company.sustainability}</td>
                    <td className="p-3 flex gap-2">
                      {(isAdmin || appUser?.group === company.group) && (
                        <>
                          <button onClick={() => {
                            setCompanyType(type);
                            setCompanyForm(company);
                            setEditingCompanyId(company.id);
                            setIsCompanyModalOpen(true);
                          }} className="p-1 text-stone-400 hover:text-violet-600">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteCompany(company.id)} className="p-1 text-stone-400 hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-violet-50 rounded-xl p-6 border border-violet-100">
          <h4 className="font-bold text-violet-800 mb-4 flex items-center gap-2">
            <Lightbulb size={20} />
            Ideas de mejora (¿Dónde podemos ser mejores?)
          </h4>
          <div className="space-y-3 mb-4">
            {ideas.filter(i => i.type === type).map(idea => (
              <div key={idea.id} className="bg-white p-3 rounded-lg border border-violet-200 flex justify-between items-start gap-4">
                <div>
                  <span className="text-xs font-bold text-violet-600 bg-violet-100 px-2 py-1 rounded-md mr-2">
                    {idea.group}
                  </span>
                  <span className="text-stone-800">{idea.idea}</span>
                </div>
                {(isAdmin || appUser?.group === idea.group) && (
                  <button onClick={() => handleDeleteIdea(idea.id)} className="text-stone-400 hover:text-red-600 shrink-0">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {ideas.filter(i => i.type === type).length === 0 && (
              <p className="text-sm text-violet-600/70 italic">Aún no hay ideas de mejora.</p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={ideaType === type ? newIdea : ''}
              onChange={(e) => {
                setIdeaType(type);
                setNewIdea(e.target.value);
              }}
              placeholder="Escribe una idea de mejora..."
              className="flex-1 px-4 py-2 rounded-lg border border-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddIdea(type);
              }}
            />
            <button
              onClick={() => handleAddIdea(type)}
              disabled={!newIdea.trim() || ideaType !== type}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Añadir Idea
            </button>
          </div>
        </div>
      </div>
    );
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
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Jornada 2: Matriz Benchmarking</h1>
        <p className="text-stone-500 mt-2">Análisis de la competencia para Coffee Breaks y Brunchs.</p>
      </div>

      {/* Content */}
      <div>
        {renderCompanyTable('coffee')}
        {renderCompanyTable('brunch')}
      </div>

      {/* Modal Empresa */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-stone-100">
              <h2 className="text-xl font-bold text-stone-900">
                {editingCompanyId ? 'Editar Empresa' : `Añadir Empresa (${companyType === 'coffee' ? 'Coffee Break' : 'Brunch'})`}
              </h2>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="company-form" onSubmit={handleSaveCompany} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Nombre de Empresa</label>
                  <input required type="text" value={companyForm.name || ''} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-violet-500 focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Tipo de Empresa</label>
                  <input required type="text" value={companyForm.companyType || ''} onChange={e => setCompanyForm({...companyForm, companyType: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-violet-500 focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">¿Tiene Web clara con precios?</label>
                  <input required type="text" value={companyForm.hasWebAndPrices || ''} onChange={e => setCompanyForm({...companyForm, hasWebAndPrices: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-violet-500 focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Exposición clara de platos</label>
                  <input required type="text" value={companyForm.clearPlates || ''} onChange={e => setCompanyForm({...companyForm, clearPlates: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-violet-500 focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Variedad dulce/salado</label>
                  <input required type="text" value={companyForm.variety || ''} onChange={e => setCompanyForm({...companyForm, variety: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-violet-500 focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">¿Se desplazan a toda la isla?</label>
                  <input required type="text" value={companyForm.travels || ''} onChange={e => setCompanyForm({...companyForm, travels: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-violet-500 focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Flexibilidad horaria</label>
                  <input required type="text" value={companyForm.flexibleHours || ''} onChange={e => setCompanyForm({...companyForm, flexibleHours: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-violet-500 focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">¿Hay fotos de los menús?</label>
                  <input required type="text" value={companyForm.hasPhotos || ''} onChange={e => setCompanyForm({...companyForm, hasPhotos: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-violet-500 focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Calidad de productos</label>
                  <input required type="text" value={companyForm.quality || ''} onChange={e => setCompanyForm({...companyForm, quality: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-violet-500 focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Rango de precios</label>
                  <input required type="text" value={companyForm.priceRange || ''} onChange={e => setCompanyForm({...companyForm, priceRange: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-violet-500 focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Puntuación reseñas</label>
                  <input required type="text" value={companyForm.reviews || ''} onChange={e => setCompanyForm({...companyForm, reviews: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-violet-500 focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Plato que más llama la atención</label>
                  <input required type="text" value={companyForm.bestPlate || ''} onChange={e => setCompanyForm({...companyForm, bestPlate: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-violet-500 focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Tipo y marca de café</label>
                  <input required type="text" value={companyForm.coffeeType || ''} onChange={e => setCompanyForm({...companyForm, coffeeType: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-violet-500 focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Preocupación por Sostenibilidad</label>
                  <input required type="text" value={companyForm.sustainability || ''} onChange={e => setCompanyForm({...companyForm, sustainability: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-violet-500 focus:border-violet-500" />
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-stone-100 flex justify-end gap-3 bg-stone-50 rounded-b-2xl">
              <button onClick={() => setIsCompanyModalOpen(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-200 rounded-lg font-medium">Cancelar</button>
              <button type="submit" form="company-form" className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
