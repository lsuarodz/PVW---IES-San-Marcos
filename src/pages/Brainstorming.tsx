import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, MessageSquare, CheckCircle, XCircle, Clock, Coffee, Utensils, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { BenchmarkingIdea, IdeaVote } from '../types';
import { handleFirestoreError, OperationType } from '../firebase';

export default function Brainstorming() {
  const { appUser } = useAuth();
  const { showToast } = useToast();
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'docente';

  const [ideas, setIdeas] = useState<BenchmarkingIdea[]>([]);
  const [votes, setVotes] = useState<IdeaVote[]>([]);
  const [newIdea, setNewIdea] = useState('');
  const [menuType, setMenuType] = useState<'coffee' | 'brunch'>('coffee');
  const [votingFor, setVotingFor] = useState<string | null>(null);
  const [voteScore, setVoteScore] = useState(5);
  const [voteReason, setVoteReason] = useState('');
  const [expandedVotes, setExpandedVotes] = useState<string[]>([]);

  useEffect(() => {
    const unsubIdeas = onSnapshot(query(collection(db, 'benchmarking_ideas'), orderBy('createdAt', 'asc')), (snapshot) => {
      setIdeas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BenchmarkingIdea)));
    });

    const unsubVotes = onSnapshot(collection(db, 'idea_votes'), (snapshot) => {
      setVotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IdeaVote)));
    });

    return () => {
      unsubIdeas();
      unsubVotes();
    };
  }, []);

  const handleAddIdea = async () => {
    if (!newIdea.trim() || !appUser) return;

    const id = doc(collection(db, 'benchmarking_ideas')).id;
    try {
      await setDoc(doc(db, 'benchmarking_ideas', id), {
        id,
        type: 'general', // We keep 'general' to separate from matrix ideas
        group: appUser.group || 'Sin Grupo',
        idea: newIdea,
        status: 'pending',
        menuType,
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

  const handleStatusChange = async (id: string, status: 'pending' | 'discarded' | 'approved') => {
    try {
      await updateDoc(doc(db, 'benchmarking_ideas', id), { status });
      showToast('Estado actualizado', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `benchmarking_ideas/${id}`);
      showToast('Error al actualizar estado', 'error');
    }
  };

  const handleVote = async (ideaId: string) => {
    if (!appUser || !voteReason.trim()) return;

    const voteId = `${ideaId}_${appUser.uid}`;
    try {
      await setDoc(doc(db, 'idea_votes', voteId), {
        ideaId,
        userId: appUser.uid,
        userName: appUser.name,
        score: voteScore,
        reason: voteReason,
        createdAt: new Date().toISOString()
      });
      setVotingFor(null);
      setVoteReason('');
      setVoteScore(5);
      showToast('Voto registrado', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `idea_votes/${voteId}`);
      showToast('Error al votar', 'error');
    }
  };

  const toggleVotes = (ideaId: string) => {
    setExpandedVotes(prev => 
      prev.includes(ideaId) ? prev.filter(id => id !== ideaId) : [...prev, ideaId]
    );
  };

  const getIdeaVotes = (ideaId: string) => votes.filter(v => v.ideaId === ideaId);
  const getAverageScore = (ideaId: string) => {
    const ideaVotes = getIdeaVotes(ideaId);
    if (ideaVotes.length === 0) return 0;
    const sum = ideaVotes.reduce((acc, v) => acc + v.score, 0);
    return (sum / ideaVotes.length).toFixed(1);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md"><CheckCircle size={14} /> Aprobada para escandallo</span>;
      case 'discarded':
        return <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-md"><XCircle size={14} /> Desechada</span>;
      default:
        return <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-md"><Clock size={14} /> Pendiente de revisión</span>;
    }
  };

  const generalIdeas = ideas.filter(i => i.type === 'general');

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">AE5. Recopilación de ideas de platos</h1>
        <p className="text-stone-500 mt-2">
          Búsqueda en fuentes concretadas y recopilación de ideas de platos para nuestra oferta de coffee breaks y brunchs.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-8">
        <div className="text-center mb-8">
          <MessageSquare size={48} className="mx-auto text-emerald-600 mb-4" />
          <h3 className="text-xl font-bold text-stone-800 mb-2">Puesta en común</h3>
          <p className="text-stone-500 max-w-2xl mx-auto">
            Añade aquí las ideas de platos. Posteriormente se hará una puesta en común y se desecharán aquellas menos realistas (por costes, diseño...). Las ideas NO desechadas se escandallarán.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4 mb-8">
            {generalIdeas.map(idea => (
              <div key={idea.id} className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start gap-4 transition-colors ${
                idea.status === 'discarded' ? 'bg-stone-100 border-stone-200 opacity-75' : 
                idea.status === 'approved' ? 'bg-emerald-50 border-emerald-200' : 
                'bg-white border-stone-200'
              }`}>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-stone-600 bg-stone-200 px-2 py-1 rounded-md">
                      {idea.group}
                    </span>
                    <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${
                      idea.menuType === 'brunch' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {idea.menuType === 'brunch' ? <Utensils size={14} /> : <Coffee size={14} />}
                      {idea.menuType === 'brunch' ? 'Brunch' : 'Coffee Break'}
                    </span>
                    {getStatusBadge(idea.status)}
                  </div>
                  <p className={`text-stone-800 break-words whitespace-pre-wrap ${idea.status === 'discarded' ? 'line-through text-stone-500' : ''}`}>
                    {idea.idea}
                  </p>

                  {/* Voting Summary */}
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1 text-amber-600 font-bold">
                      <Star size={16} fill="currentColor" />
                      <span>{getAverageScore(idea.id)}</span>
                      <span className="text-stone-400 font-normal text-sm">({getIdeaVotes(idea.id).length} votos)</span>
                    </div>
                    
                    <button 
                      onClick={() => toggleVotes(idea.id)}
                      className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1"
                    >
                      {expandedVotes.includes(idea.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {expandedVotes.includes(idea.id) ? 'Ocultar votos' : 'Ver valoraciones'}
                    </button>

                    {idea.status !== 'discarded' && (
                      <button 
                        onClick={() => {
                          setVotingFor(idea.id);
                          const myVote = getIdeaVotes(idea.id).find(v => v.userId === appUser?.uid);
                          if (myVote) {
                            setVoteScore(myVote.score);
                            setVoteReason(myVote.reason);
                          }
                        }}
                        className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                      >
                        {getIdeaVotes(idea.id).some(v => v.userId === appUser?.uid) ? 'Editar mi voto' : 'Votar idea'}
                      </button>
                    )}
                  </div>

                  {/* Voting Form */}
                  {votingFor === idea.id && (
                    <div className="mt-4 p-4 bg-white rounded-xl border border-emerald-200 shadow-sm">
                      <h4 className="font-bold text-stone-800 mb-3 text-sm">Tu valoración</h4>
                      <div className="flex items-center gap-2 mb-3">
                        {[1, 2, 3, 4, 5].map(s => (
                          <button
                            key={s}
                            onClick={() => setVoteScore(s)}
                            className={`p-1 transition-colors ${s <= voteScore ? 'text-amber-500' : 'text-stone-300'}`}
                          >
                            <Star size={24} fill={s <= voteScore ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={voteReason}
                        onChange={(e) => setVoteReason(e.target.value)}
                        placeholder="¿Por qué le das esta puntuación? (obligatorio)"
                        className="w-full p-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm mb-3"
                        rows={2}
                      />
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setVotingFor(null)}
                          className="px-3 py-1.5 text-stone-500 hover:text-stone-700 text-sm font-medium"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={() => handleVote(idea.id)}
                          disabled={!voteReason.trim()}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Guardar Voto
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Expanded Votes List */}
                  {expandedVotes.includes(idea.id) && (
                    <div className="mt-4 space-y-3 border-t border-stone-100 pt-4">
                      {getIdeaVotes(idea.id).length === 0 ? (
                        <p className="text-stone-400 text-sm italic">Aún no hay valoraciones para esta idea.</p>
                      ) : (
                        getIdeaVotes(idea.id).map(vote => (
                          <div key={vote.id} className="bg-stone-50 p-3 rounded-lg border border-stone-100">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-stone-700 text-sm">{vote.userName}</span>
                              <div className="flex items-center gap-0.5 text-amber-500">
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} size={12} fill={i < vote.score ? 'currentColor' : 'none'} />
                                ))}
                              </div>
                            </div>
                            <p className="text-stone-600 text-sm italic">"{vote.reason}"</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  {isAdmin && (
                    <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
                      <button 
                        onClick={() => handleStatusChange(idea.id, 'approved')}
                        className={`p-1.5 rounded-md transition-colors ${idea.status === 'approved' ? 'bg-emerald-200 text-emerald-800' : 'text-stone-500 hover:bg-stone-200 hover:text-emerald-700'}`}
                        title="Aprobar para escandallo"
                      >
                        <CheckCircle size={18} />
                      </button>
                      <button 
                        onClick={() => handleStatusChange(idea.id, 'pending')}
                        className={`p-1.5 rounded-md transition-colors ${!idea.status || idea.status === 'pending' ? 'bg-amber-200 text-amber-800' : 'text-stone-500 hover:bg-stone-200 hover:text-amber-700'}`}
                        title="Marcar como pendiente"
                      >
                        <Clock size={18} />
                      </button>
                      <button 
                        onClick={() => handleStatusChange(idea.id, 'discarded')}
                        className={`p-1.5 rounded-md transition-colors ${idea.status === 'discarded' ? 'bg-red-200 text-red-800' : 'text-stone-500 hover:bg-stone-200 hover:text-red-700'}`}
                        title="Desechar idea"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  )}
                  {isAdmin && (
                    <button onClick={() => handleDeleteIdea(idea.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {generalIdeas.length === 0 && (
              <p className="text-center text-stone-500 italic py-8">Aún no hay ideas de platos. ¡Sé el primero en aportar una!</p>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
            <select
              value={menuType}
              onChange={(e) => setMenuType(e.target.value as 'coffee' | 'brunch')}
              className="px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[160px]"
            >
              <option value="coffee">Coffee Break</option>
              <option value="brunch">Brunch</option>
            </select>
            <input
              type="text"
              value={newIdea}
              onChange={(e) => setNewIdea(e.target.value)}
              placeholder="Escribe el nombre o descripción del plato..."
              className="flex-1 px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddIdea();
              }}
            />
            <button
              onClick={handleAddIdea}
              disabled={!newIdea.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Plus size={20} />
              Añadir Plato
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
