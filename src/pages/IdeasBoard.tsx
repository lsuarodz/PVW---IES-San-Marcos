import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, Edit2, X, Check, StickyNote, Palette, Sparkles, Filter, CornerDownLeft, CheckSquare, Square, User, Users } from 'lucide-react';
import { IdeasBoardNote, IdeasBoardItem } from '../types';
import { handleFirestoreError, OperationType } from '../firebase';

const PASTEL_COLORS = [
  { id: 'yellow', name: 'Amarillo', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', btn: 'bg-amber-100 border-amber-300 hover:bg-amber-200', textMute: 'text-amber-700/70', accent: 'border-amber-400 bg-amber-100 text-amber-800' },
  { id: 'blue', name: 'Azul', bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-900', btn: 'bg-sky-100 border-sky-300 hover:bg-sky-200', textMute: 'text-sky-700/70', accent: 'border-sky-400 bg-sky-100 text-sky-800' },
  { id: 'pink', name: 'Rosa', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900', btn: 'bg-rose-100 border-rose-300 hover:bg-rose-200', textMute: 'text-rose-700/70', accent: 'border-rose-400 bg-rose-100 text-rose-800' },
  { id: 'green', name: 'Verde', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', btn: 'bg-emerald-100 border-emerald-300 hover:bg-emerald-200', textMute: 'text-emerald-700/70', accent: 'border-emerald-400 bg-emerald-100 text-emerald-800' },
  { id: 'violet', name: 'Morado', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-900', btn: 'bg-violet-100 border-violet-300 hover:bg-violet-200', textMute: 'text-violet-700/70', accent: 'border-violet-400 bg-violet-100 text-violet-800' },
  { id: 'orange', name: 'Naranja', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', btn: 'bg-orange-100 border-orange-300 hover:bg-orange-200', textMute: 'text-orange-700/70', accent: 'border-orange-400 bg-orange-100 text-orange-800' }
];

export default function IdeasBoard() {
  const { appUser } = useAuth();
  const { showToast } = useToast();
  const isAdminOrDocente = appUser?.role === 'admin' || appUser?.role === 'docente';

  const [notes, setNotes] = useState<IdeasBoardNote[]>([]);
  const [loading, setLoading] = useState(true);

  // States for creating a new note
  const [newTitle, setNewTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState('yellow');

  // Input states for individual card bullet addition
  const [cardInputs, setCardInputs] = useState<{ [cardId: string]: string }>({});

  // Editing state for note title
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState('');

  // Editing state for individual item bullet text
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');

  // Filter conditions
  const [filterType, setFilterType] = useState<'all' | 'mine' | 'group'>('all');

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'design_boards'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: IdeasBoardNote[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as IdeasBoardNote);
      });
      setNotes(data);
      setLoading(false);
    }, (error) => {
      console.error("Error setting up snaps:", error);
      showToast('Error al conectar con el tablón de ideas', 'error');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !appUser) return;

    const id = doc(collection(db, 'design_boards')).id;
    try {
      await setDoc(doc(db, 'design_boards', id), {
        id,
        title: newTitle.trim(),
        color: selectedColor,
        items: [],
        createdBy: appUser.name,
        group: appUser.group || 'Sin Grupo',
        createdAt: new Date().toISOString()
      });
      setNewTitle('');
      showToast('Nota creada correctamente', 'success');
    } catch (error) {
      showToast('Error al crear la nota', 'error');
      handleFirestoreError(error, OperationType.WRITE, `design_boards/${id}`);
    }
  };

  const handleDeleteNote = async (id: string, title: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar la nota "${title}"?`)) return;

    try {
      await deleteDoc(doc(db, 'design_boards', id));
      showToast('Nota eliminada', 'success');
    } catch (error) {
      showToast('Error al eliminar la nota', 'error');
      handleFirestoreError(error, OperationType.DELETE, `design_boards/${id}`);
    }
  };

  const handleUpdateTitle = async (noteId: string) => {
    if (!editingNoteTitle.trim()) return;

    try {
      await updateDoc(doc(db, 'design_boards', noteId), {
        title: editingNoteTitle.trim()
      });
      setEditingNoteId(null);
      setEditingNoteTitle('');
      showToast('Título actualizado', 'success');
    } catch (error) {
      showToast('Error al actualizar el título', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `design_boards/${noteId}`);
    }
  };

  // Add individual item to a note card
  const handleAddItem = async (noteId: string) => {
    const text = cardInputs[noteId] || '';
    if (!text.trim()) return;

    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const newItem: IdeasBoardItem = {
      id: crypto.randomUUID(),
      text: text.trim(),
      completed: false
    };

    const updatedItems = [...note.items, newItem];

    try {
      await updateDoc(doc(db, 'design_boards', noteId), {
        items: updatedItems
      });
      // Clear specific card input
      setCardInputs(prev => ({ ...prev, [noteId]: '' }));
      showToast('Idea añadida', 'success');
    } catch (error) {
      showToast('Error al añadir la idea', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `design_boards/${noteId}`);
    }
  };

  // Toggle item completed state
  const handleToggleItem = async (noteId: string, itemId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const updatedItems = note.items.map(item => {
      if (item.id === itemId) {
        return { ...item, completed: !item.completed };
      }
      return item;
    });

    try {
      await updateDoc(doc(db, 'design_boards', noteId), {
        items: updatedItems
      });
    } catch (error) {
      showToast('Error al actualizar item', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `design_boards/${noteId}`);
    }
  };

  // Edit item text
  const handleSaveItemEdit = async (noteId: string, itemId: string) => {
    if (!editingItemText.trim()) return;

    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const updatedItems = note.items.map(item => {
      if (item.id === itemId) {
        return { ...item, text: editingItemText.trim() };
      }
      return item;
    });

    try {
      await updateDoc(doc(db, 'design_boards', noteId), {
        items: updatedItems
      });
      setEditingItemId(null);
      setEditingItemText('');
      showToast('Idea modificada', 'success');
    } catch (error) {
      showToast('Error al modificar idea', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `design_boards/${noteId}`);
    }
  };

  // Delete item from a note card
  const handleDeleteItem = async (noteId: string, itemId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const updatedItems = note.items.filter(item => item.id !== itemId);

    try {
      await updateDoc(doc(db, 'design_boards', noteId), {
        items: updatedItems
      });
      showToast('Idea eliminada', 'success');
    } catch (error) {
      showToast('Error al eliminar la idea', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `design_boards/${noteId}`);
    }
  };

  // Filter notes based on selection
  const filteredNotes = notes.filter(note => {
    if (filterType === 'mine') {
      return note.createdBy === appUser?.name;
    }
    if (filterType === 'group') {
      return appUser?.group ? note.group === appUser.group : true;
    }
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      {/* Page Title & Information */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 tracking-tight mb-2 flex items-center gap-3">
            <StickyNote className="text-violet-600" size={36} />
            Tablón de Ideas
          </h1>
          <p className="text-stone-500 text-lg max-w-2xl">
            Espacio creativo colaborativo para diseñar ideas de Coffee Breaks, Brunchs, platos innovadores y notas organizativas.
          </p>
        </div>

        {/* Dynamic Filters */}
        <div className="flex bg-stone-100 p-1 rounded-xl self-start md:self-auto shadow-inner">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
              filterType === 'all'
                ? 'bg-white text-stone-900 shadow'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Filter size={14} />
            Mostrar todo
          </button>
          <button
            onClick={() => setFilterType('mine')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
              filterType === 'mine'
                ? 'bg-white text-stone-900 shadow'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <User size={14} />
            Mis Notas
          </button>
          {appUser?.group && (
            <button
              onClick={() => setFilterType('group')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                filterType === 'group'
                  ? 'bg-white text-stone-900 shadow'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <Users size={14} />
              Grupo ({appUser.group})
            </button>
          )}
        </div>
      </div>

      {/* Creation form section */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm mb-10">
        <h2 className="text-stone-900 font-bold mb-4 flex items-center gap-2">
          <Sparkles className="text-amber-500" size={18} />
          Crear una Nueva Nota en el Tablón
        </h2>
        
        <form onSubmit={handleCreateNote} className="flex flex-col lg:flex-row gap-6 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              Título o Categoría de la Nota (ej: Ideas para un Coffee Break)
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Escribe el nombre de la nota..."
              required
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow text-stone-800"
            />
          </div>

          <div className="w-full lg:w-auto">
            <span className="block text-sm font-semibold text-stone-700 mb-2.5">Color Adhesivo</span>
            <div className="flex gap-3">
              {PASTEL_COLORS.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  title={col.name}
                  onClick={() => setSelectedColor(col.id)}
                  className={`w-9 h-9 rounded-full ${col.bg} border-2 relative transition-all duration-200 shadow-sm ${
                    selectedColor === col.id
                      ? 'ring-2 ring-violet-500 scale-110 border-stone-400'
                      : 'border-stone-200 hover:scale-105'
                  }`}
                >
                  {selectedColor === col.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-violet-600" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="w-full lg:w-auto px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-md"
          >
            <Plus size={20} />
            Colgar Nota
          </button>
        </form>
      </div>

      {/* Grid of notes */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-400">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 mb-4" />
          <p>Cargando tablón de ideas...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredNotes.map((note) => {
            const colorClass = PASTEL_COLORS.find(c => c.id === note.color) || PASTEL_COLORS[0];
            const isAuthor = note.createdBy === appUser?.name;
            const canManage = isAuthor || isAdminOrDocente;

            return (
              <div
                key={note.id}
                className={`${colorClass.bg} ${colorClass.border} border-t-8 rounded-2xl shadow-sm p-6 flex flex-col justify-between transition-all hover:shadow-md duration-200 relative overflow-hidden`}
              >
                <div>
                  {/* Note header section */}
                  <div className="flex items-start justify-between mb-4 gap-2 border-b border-stone-900/10 pb-3">
                    {editingNoteId === note.id ? (
                      <div className="flex-1 flex gap-2 w-full">
                        <input
                          type="text"
                          value={editingNoteTitle}
                          onChange={(e) => setEditingNoteTitle(e.target.value)}
                          className="w-full px-2 py-1 bg-white/70 border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 font-bold text-lg"
                        />
                        <button
                          onClick={() => handleUpdateTitle(note.id)}
                          className="p-1 text-emerald-700 hover:bg-emerald-100 rounded"
                          title="Guardar"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => setEditingNoteId(null)}
                          className="p-1 text-stone-500 hover:bg-stone-500/10 rounded"
                          title="Cancelar"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <h3 
                          className={`text-xl font-bold font-serif ${colorClass.text} tracking-tight select-none break-words`}
                          onDoubleClick={() => {
                            if (canManage) {
                              setEditingNoteId(note.id);
                              setEditingNoteTitle(note.title);
                            }
                          }}
                        >
                          {note.title}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px] text-stone-500">
                          <span className="font-semibold">{note.createdBy}</span>
                          <span>•</span>
                          <span className="bg-stone-900/5 px-2 py-0.5 rounded-full border border-stone-900/10 font-bold">{note.group}</span>
                        </div>
                      </div>
                    )}

                    {canManage && editingNoteId !== note.id && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingNoteId(note.id);
                            setEditingNoteTitle(note.title);
                          }}
                          className="p-1 hover:bg-stone-900/5 text-stone-600 rounded transition-colors"
                          title="Cambiar título"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id, note.title)}
                          className="p-1 hover:bg-stone-900/5 text-red-600 rounded transition-colors"
                          title="Eliminar nota"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bullet list of idea items */}
                  <div className="space-y-3 pr-1 my-4">
                    {note.items && note.items.map((item) => (
                      <div key={item.id} className="group/item flex items-start justify-between gap-2.5 text-sm">
                        <div className="flex-1 flex items-start gap-2 min-w-0">
                          <button
                            onClick={() => handleToggleItem(note.id, item.id)}
                            className={`p-0.5 transition-colors text-stone-500 mt-0.5`}
                          >
                            {item.completed ? (
                              <CheckSquare size={16} className="text-violet-600" />
                            ) : (
                              <Square size={16} className="text-stone-400 group-hover/item:text-stone-600" />
                            )}
                          </button>

                          {editingItemId === item.id ? (
                            <div className="flex-1 flex gap-1.5">
                              <input
                                type="text"
                                value={editingItemText}
                                onChange={(e) => setEditingItemText(e.target.value)}
                                className="w-full px-2 py-0.5 bg-white border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 text-sm"
                                onKeyPress={(e) => e.key === 'Enter' && handleSaveItemEdit(note.id, item.id)}
                              />
                              <button
                                onClick={() => handleSaveItemEdit(note.id, item.id)}
                                className="p-0.5 text-emerald-600"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setEditingItemId(null)}
                                className="p-0.5 text-stone-500"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <span 
                              className={`leading-relaxed text-stone-800 font-sans cursor-pointer break-words select-none flex-1 font-medium ${
                                item.completed ? 'line-through text-stone-400' : ''
                              }`}
                              onDoubleClick={() => {
                                if (canManage) {
                                  setEditingItemId(item.id);
                                  setEditingItemText(item.text);
                                }
                              }}
                            >
                              {item.text}
                            </span>
                          )}
                        </div>

                        {canManage && editingItemId !== item.id && (
                          <div className="opacity-0 group-hover/item:opacity-100 flex items-center shrink-0">
                            <button
                              onClick={() => {
                                setEditingItemId(item.id);
                                setEditingItemText(item.text);
                              }}
                              className="p-1 text-stone-500 hover:text-stone-800 transition-colors mr-0.5"
                              title="Editar idea"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(note.id, item.id)}
                              className="p-1 text-stone-500 hover:text-red-700 transition-colors"
                              title="Eliminar idea"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {(!note.items || note.items.length === 0) && (
                      <p className={`text-xs italic ${colorClass.textMute} select-none py-1`}>
                        No hay ideas todavía. ¡Escribe una abajo!
                      </p>
                    )}
                  </div>
                </div>

                {/* Card input at the bottom to append new items */}
                <div className="mt-4 pt-4 border-t border-stone-900/5 select-none">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nueva elaboración o nota..."
                      value={cardInputs[note.id] || ''}
                      onChange={(e) => setCardInputs(prev => ({ ...prev, [note.id]: e.target.value }))}
                      className="flex-1 px-3 py-1.5 bg-white/60 focus:bg-white border border-stone-900/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs text-stone-800 placeholder-stone-500/70 shadow-sm"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddItem(note.id);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleAddItem(note.id)}
                      disabled={!(cardInputs[note.id] || '').trim()}
                      className={`p-1.5 rounded-xl border text-stone-900 transition-all ${colorClass.btn} flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <CornerDownLeft size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredNotes.length === 0 && (
            <div className="col-span-full py-16 bg-white border border-stone-200 rounded-3xl text-center text-stone-400">
              <StickyNote size={56} className="mx-auto mb-4 opacity-10 text-stone-950" />
              <p className="text-stone-500 text-lg">El tablón de ideas está vacío para este filtro.</p>
              <p className="text-sm text-stone-400 mt-1">Saca tu lado más creativo y añade la primera nota.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
