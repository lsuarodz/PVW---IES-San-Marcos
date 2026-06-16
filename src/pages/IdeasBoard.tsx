import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, Edit2, X, Check, StickyNote, Palette, Sparkles, Filter, CornerDownLeft, CheckSquare, Square, User, Users, CornerDownRight, ArrowUp, ArrowDown, Printer } from 'lucide-react';
import { IdeasBoardNote, IdeasBoardItem, IdeasBoardSubItem } from '../types';
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
  const [printTarget, setPrintTarget] = useState<IdeasBoardNote | 'all' | null>(null);

  // States for creating a new note
  const [newTitle, setNewTitle] = useState('');
  const [newTagsStr, setNewTagsStr] = useState('');
  const [selectedColor, setSelectedColor] = useState('yellow');

  // Input states for individual card bullet addition
  const [cardInputs, setCardInputs] = useState<{ [cardId: string]: string }>({});

  // Editing state for note title
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState('');
  const [editingNoteTagsStr, setEditingNoteTagsStr] = useState('');

  // Editing state for individual item bullet text
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');

  // Sub-item input states
  const [activeSubInputId, setActiveSubInputId] = useState<string | null>(null);
  const [subItemInputText, setSubItemInputText] = useState('');

  // Editing state for sub-items
  const [editingSubItemId, setEditingSubItemId] = useState<string | null>(null);
  const [editingSubItemText, setEditingSubItemText] = useState('');

  // Filter conditions
  const [filterType, setFilterType] = useState<'all' | 'mine' | 'group'>('all');

  // Input refs to restore focus after adding items
  const cardInputRefs = useRef<{ [cardId: string]: HTMLInputElement | null }>({});
  const subInputRefs = useRef<{ [itemId: string]: HTMLInputElement | null }>({});

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
    const parsedTags = newTagsStr
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    try {
      await setDoc(doc(db, 'design_boards', id), {
        id,
        title: newTitle.trim(),
        tags: parsedTags,
        color: selectedColor,
        items: [],
        createdBy: appUser.name,
        group: appUser.group || 'Sin Grupo',
        createdAt: new Date().toISOString()
      });
      setNewTitle('');
      setNewTagsStr('');
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

    const parsedTags = editingNoteTagsStr
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    try {
      await updateDoc(doc(db, 'design_boards', noteId), {
        title: editingNoteTitle.trim(),
        tags: parsedTags
      });
      setEditingNoteId(null);
      setEditingNoteTitle('');
      setEditingNoteTagsStr('');
      showToast('Nota actualizada', 'success');
    } catch (error) {
      showToast('Error al actualizar la nota', 'error');
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
      
      // Refocus back to the input field
      setTimeout(() => {
        cardInputRefs.current[noteId]?.focus();
      }, 50);
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

  // Add sub-item to parent list item
  const handleSaveSubItemAdd = async (noteId: string, itemId: string) => {
    if (!subItemInputText.trim()) return;

    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const updatedItems = note.items.map(item => {
      if (item.id === itemId) {
        const subItems = item.subItems || [];
        const newSub: IdeasBoardSubItem = {
          id: crypto.randomUUID(),
          text: subItemInputText.trim(),
          completed: false
        };
        return {
          ...item,
          subItems: [...subItems, newSub]
        };
      }
      return item;
    });

    try {
      await updateDoc(doc(db, 'design_boards', noteId), {
        items: updatedItems
      });
      // Keep it active and clear text
      setSubItemInputText('');
      showToast('Sub-idea añadida', 'success');

      // Refocus back to the sub-item input field
      setTimeout(() => {
        subInputRefs.current[itemId]?.focus();
      }, 50);
    } catch (error) {
      showToast('Error al añadir sub-idea', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `design_boards/${noteId}`);
    }
  };

  // Toggle completed state of a sub-item
  const handleToggleSubItem = async (noteId: string, itemId: string, subItemId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const updatedItems = note.items.map(item => {
      if (item.id === itemId) {
        const subItems = (item.subItems || []).map(sub => {
          if (sub.id === subItemId) {
            return { ...sub, completed: !sub.completed };
          }
          return sub;
        });
        return { ...item, subItems };
      }
      return item;
    });

    try {
      await updateDoc(doc(db, 'design_boards', noteId), {
        items: updatedItems
      });
    } catch (error) {
      showToast('Error al actualizar sub-idea', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `design_boards/${noteId}`);
    }
  };

  // Save changes to sub-item body text
  const handleSaveSubItemEdit = async (noteId: string, itemId: string, subItemId: string) => {
    if (!editingSubItemText.trim()) return;

    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const updatedItems = note.items.map(item => {
      if (item.id === itemId) {
        const subItems = (item.subItems || []).map(sub => {
          if (sub.id === subItemId) {
            return { ...sub, text: editingSubItemText.trim() };
          }
          return sub;
        });
        return { ...item, subItems };
      }
      return item;
    });

    try {
      await updateDoc(doc(db, 'design_boards', noteId), {
        items: updatedItems
      });
      setEditingSubItemId(null);
      setEditingSubItemText('');
      showToast('Sub-idea modificada', 'success');
    } catch (error) {
      showToast('Error al modificar sub-idea', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `design_boards/${noteId}`);
    }
  };

  // Delete sub-item from a parent item
  const handleDeleteSubItem = async (noteId: string, itemId: string, subItemId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const updatedItems = note.items.map(item => {
      if (item.id === itemId) {
        const subItems = (item.subItems || []).filter(sub => sub.id !== subItemId);
        return { ...item, subItems };
      }
      return item;
    });

    try {
      await updateDoc(doc(db, 'design_boards', noteId), {
        items: updatedItems
      });
      showToast('Sub-idea eliminada', 'success');
    } catch (error) {
      showToast('Error al eliminar sub-idea', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `design_boards/${noteId}`);
    }
  };

  // Reorder items (points) within a note card
  const moveItem = async (noteId: string, itemId: string, direction: 'up' | 'down') => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const index = note.items.findIndex(item => item.id === itemId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= note.items.length) return;

    const updatedItems = [...note.items];
    const temp = updatedItems[index];
    updatedItems[index] = updatedItems[newIndex];
    updatedItems[newIndex] = temp;

    try {
      await updateDoc(doc(db, 'design_boards', noteId), {
        items: updatedItems
      });
    } catch (error) {
      showToast('Error al reordenar la idea', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `design_boards/${noteId}`);
    }
  };

  // Reorder sub-items within a parent item
  const moveSubItem = async (noteId: string, itemId: string, subItemId: string, direction: 'up' | 'down') => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const updatedItems = note.items.map(item => {
      if (item.id === itemId) {
        const subItems = item.subItems || [];
        const index = subItems.findIndex(sub => sub.id === subItemId);
        if (index === -1) return item;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= subItems.length) return item;

        const updatedSubItems = [...subItems];
        const temp = updatedSubItems[index];
        updatedSubItems[index] = updatedSubItems[newIndex];
        updatedSubItems[newIndex] = temp;

        return { ...item, subItems: updatedSubItems };
      }
      return item;
    });

    try {
      await updateDoc(doc(db, 'design_boards', noteId), {
        items: updatedItems
      });
    } catch (error) {
      showToast('Error al reordenar la sub-idea', 'error');
      handleFirestoreError(error, OperationType.UPDATE, `design_boards/${noteId}`);
    }
  };

  // Helper trigger to set target and open print dialog
  const handlePrintNote = (note: IdeasBoardNote) => {
    setPrintTarget(note);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintAll = () => {
    setPrintTarget('all');
    setTimeout(() => {
      window.print();
    }, 150);
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
    <>
      <div className="p-8 max-w-7xl mx-auto min-h-screen print:hidden">
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
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <div className="flex bg-stone-100 p-1 rounded-xl shadow-inner">
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

          <button
            onClick={handlePrintAll}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all border border-indigo-200 flex items-center gap-2 cursor-pointer shadow-sm"
            title="Imprimir todo el tablón en formato DIN A4"
          >
            <Printer size={15} />
            Imprimir Tablón (A4)
          </button>
        </div>
      </div>

      {/* Creation form section */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm mb-10">
        <h2 className="text-stone-900 font-bold mb-4 flex items-center gap-2">
          <Sparkles className="text-amber-500" size={18} />
          Crear una Nueva Nota en el Tablón
        </h2>
        
        <form onSubmit={handleCreateNote} className="space-y-4 w-full">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 w-full space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">
                  Título o Categoría de la Nota (ej: Ideas para un Coffee Break)
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Escribe el nombre de la nota..."
                  required
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow text-stone-800 font-sans"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">
                  Etiquetas como Subtítulo (ej: Lugar del evento, Postres) — Separadas por comas
                </label>
                <input
                  type="text"
                  value={newTagsStr}
                  onChange={(e) => setNewTagsStr(e.target.value)}
                  placeholder="ej: Barcelona, Catering, Importante..."
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow text-stone-800 font-sans text-sm"
                />
              </div>
            </div>

            <div className="w-full lg:w-auto shrink-0 space-y-4">
              <div>
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
              
              <div className="pt-2 lg:pt-6">
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="w-full px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-md"
                >
                  <Plus size={20} />
                  Colgar Nota
                </button>
              </div>
            </div>
          </div>
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
                      <div className="flex-1 flex flex-col gap-2 w-full">
                        <input
                          type="text"
                          value={editingNoteTitle}
                          onChange={(e) => setEditingNoteTitle(e.target.value)}
                          className="w-full px-2.5 py-1 bg-white/70 border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 font-bold text-base text-stone-900"
                          title="Título de la nota"
                          placeholder="Título de la nota..."
                        />
                        <input
                          type="text"
                          value={editingNoteTagsStr}
                          onChange={(e) => setEditingNoteTagsStr(e.target.value)}
                          className="w-full px-2.5 py-1 bg-white/70 border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs text-stone-700 font-medium"
                          title="Subtítulo / Etiquetas (separadas por comas)"
                          placeholder="Etiquetas (ej: Lugar, Catering...)"
                        />
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <button
                            onClick={() => handleUpdateTitle(note.id)}
                            className="p-1 px-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Guardar"
                          >
                            <Check size={14} /> Guardar
                          </button>
                          <button
                            onClick={() => setEditingNoteId(null)}
                            className="p-1 px-2.5 rounded bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                            title="Cancelar"
                          >
                            <X size={14} /> Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <h3 
                          className={`text-xl font-bold font-serif ${colorClass.text} tracking-tight select-none break-words cursor-pointer`}
                          onDoubleClick={() => {
                            if (canManage) {
                              setEditingNoteId(note.id);
                              setEditingNoteTitle(note.title);
                              setEditingNoteTagsStr(note.tags ? note.tags.join(', ') : '');
                            }
                          }}
                          title="Doble clic para editar título y etiquetas"
                        >
                          {note.title}
                        </h3>
                        
                        {/* Tags as subtitle */}
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5 mb-2">
                            {note.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded border border-current shadow-sm ${colorClass.accent || 'bg-stone-100 text-stone-700'}`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[11px] text-stone-500">
                          <span className="font-semibold">{note.createdBy}</span>
                          <span>•</span>
                          <span className="bg-stone-900/5 px-2 py-0.5 rounded-full border border-stone-900/10 font-bold">{note.group}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1 shrink-0">
                      {editingNoteId !== note.id && (
                        <button
                          onClick={() => handlePrintNote(note)}
                          className="p-1 hover:bg-stone-900/10 text-stone-600 hover:text-stone-900 rounded transition-colors"
                          title="Imprimir esta nota en A4"
                          type="button"
                        >
                          <Printer size={15} />
                        </button>
                      )}

                      {canManage && editingNoteId !== note.id && (
                        <>
                          <button
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setEditingNoteTitle(note.title);
                              setEditingNoteTagsStr(note.tags ? note.tags.join(', ') : '');
                            }}
                            className="p-1 hover:bg-stone-900/5 text-stone-600 rounded transition-colors"
                            title="Cambiar título o etiquetas"
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
                        </>
                      )}
                    </div>
                  </div>

                  {/* Bullet list of idea items */}
                  <div className="space-y-4 pr-1 my-4">
                    {note.items && note.items.map((item, itemIdx) => (
                      <div key={item.id} className="group/item border-b border-stone-950/5 pb-2.5 last:border-0 last:pb-0">
                        {/* Parent item row */}
                        <div className="flex items-start justify-between gap-2.5 text-sm">
                          <div className="flex-1 flex items-start gap-2 min-w-0">
                            <button
                              onClick={() => handleToggleItem(note.id, item.id)}
                              className="p-0.5 transition-colors text-stone-500 mt-0.5"
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
                                  autoFocus
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
                                className={`leading-relaxed text-stone-800 font-sans cursor-pointer break-words select-none flex-1 font-semibold ${
                                  item.completed ? 'line-through text-stone-400/80 font-normal' : ''
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
                                onClick={() => moveItem(note.id, item.id, 'up')}
                                disabled={itemIdx === 0}
                                className="p-1 text-stone-500 hover:text-stone-800 transition-colors mr-0.5 disabled:opacity-20"
                                title="Subir punto"
                              >
                                <ArrowUp size={13} />
                              </button>
                              <button
                                onClick={() => moveItem(note.id, item.id, 'down')}
                                disabled={itemIdx === note.items.length - 1}
                                className="p-1 text-stone-500 hover:text-stone-800 transition-colors mr-1 disabled:opacity-20"
                                title="Bajar punto"
                              >
                                <ArrowDown size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  setActiveSubInputId(activeSubInputId === item.id ? null : item.id);
                                  setSubItemInputText('');
                                }}
                                className="p-1 text-stone-500 hover:text-violet-700 transition-colors mr-0.5"
                                title="Añadir sub-punto"
                              >
                                <CornerDownRight size={13} />
                              </button>
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

                        {/* Nested Sub-items list */}
                        {item.subItems && item.subItems.length > 0 && (
                          <div className="mt-1.5 space-y-1.5">
                            {item.subItems.map((subItem, subIdx) => (
                              <div key={subItem.id} className="group/subitem pl-6 flex items-start justify-between gap-2 text-xs border-l-2 border-stone-400/20 ml-2.5">
                                <div className="flex-1 flex items-start gap-1.5 min-w-0">
                                  <button
                                    onClick={() => handleToggleSubItem(note.id, item.id, subItem.id)}
                                    className="p-0.5 text-stone-500 mt-0.5 shrink-0"
                                  >
                                    {subItem.completed ? (
                                      <CheckSquare size={13} className="text-violet-600" />
                                    ) : (
                                      <Square size={13} className="text-stone-400 group-hover/subitem:text-stone-600" />
                                    )}
                                  </button>

                                  {editingSubItemId === subItem.id ? (
                                    <div className="flex-1 flex gap-1 items-center">
                                      <input
                                        type="text"
                                        value={editingSubItemText}
                                        onChange={(e) => setEditingSubItemText(e.target.value)}
                                        className="w-full px-1.5 py-0.5 bg-white border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs text-stone-800"
                                        onKeyPress={(e) => e.key === 'Enter' && handleSaveSubItemEdit(note.id, item.id, subItem.id)}
                                        autoFocus
                                      />
                                      <button onClick={() => handleSaveSubItemEdit(note.id, item.id, subItem.id)} className="p-0.5 text-emerald-600">
                                        <Check size={12} />
                                      </button>
                                      <button onClick={() => setEditingSubItemId(null)} className="p-0.5 text-stone-500">
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <span
                                      className={`leading-relaxed text-stone-700 font-sans cursor-pointer break-words select-none flex-1 font-normal ${
                                        subItem.completed ? 'line-through text-stone-400/70' : ''
                                      }`}
                                      onDoubleClick={() => {
                                        if (canManage) {
                                          setEditingSubItemId(subItem.id);
                                          setEditingSubItemText(subItem.text);
                                        }
                                      }}
                                    >
                                      {subItem.text}
                                    </span>
                                  )}
                                </div>

                                {canManage && editingSubItemId !== subItem.id && (
                                  <div className="opacity-0 group-hover/subitem:opacity-100 flex items-center shrink-0">
                                    <button
                                      onClick={() => moveSubItem(note.id, item.id, subItem.id, 'up')}
                                      disabled={subIdx === 0}
                                      className="p-0.5 text-stone-500 hover:text-stone-800 transition-colors mr-0.5 disabled:opacity-20"
                                      title="Subir sub-punto"
                                    >
                                      <ArrowUp size={11} />
                                    </button>
                                    <button
                                      onClick={() => moveSubItem(note.id, item.id, subItem.id, 'down')}
                                      disabled={subIdx === item.subItems.length - 1}
                                      className="p-0.5 text-stone-500 hover:text-stone-800 transition-colors mr-0.5 disabled:opacity-20"
                                      title="Bajar sub-punto"
                                    >
                                      <ArrowDown size={11} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingSubItemId(subItem.id);
                                        setEditingSubItemText(subItem.text);
                                      }}
                                      className="p-0.5 text-stone-500 hover:text-stone-800 transition-colors mr-0.5"
                                      title="Editar sub-idea"
                                    >
                                      <Edit2 size={11} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSubItem(note.id, item.id, subItem.id)}
                                      className="p-0.5 text-stone-500 hover:text-red-700 transition-colors"
                                      title="Eliminar sub-idea"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Sub-item inline insertion field */}
                        {activeSubInputId === item.id && (
                          <div className="pl-6 flex items-center gap-1.5 mt-2 border-l-2 border-violet-500/30 ml-2.5">
                            <input
                              ref={(el) => { subInputRefs.current[item.id] = el; }}
                              type="text"
                              placeholder="Nuevo sub-punto..."
                              value={subItemInputText}
                              onChange={(e) => setSubItemInputText(e.target.value)}
                              className="flex-1 px-2 py-0.5 bg-white border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 text-xs text-stone-800 placeholder-stone-500/50 shadow-sm"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveSubItemAdd(note.id, item.id);
                                }
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveSubItemAdd(note.id, item.id)}
                              disabled={!subItemInputText.trim()}
                              className="p-1 px-1.5 rounded-md text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 disabled:opacity-40"
                              title="Guardar sub-punto"
                            >
                              <Check size={11} />
                            </button>
                            <button
                              onClick={() => {
                                setActiveSubInputId(null);
                                setSubItemInputText('');
                              }}
                              className="p-1 px-1.5 rounded-md text-stone-600 bg-stone-50 hover:bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0"
                              title="Cancelar"
                            >
                              <X size={11} />
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
                      ref={(el) => { cardInputRefs.current[note.id] = el; }}
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

      {/* ----------------- SECCIÓN DE IMPRESIÓN INTERACTIVA SÚPER-PULIDA DIN A4 ----------------- */}
      {printTarget && (
        <div className="fixed inset-0 bg-stone-900/95 backdrop-blur-md z-[9999] overflow-y-auto print:bg-white print:absolute print:inset-0 print:overflow-visible print:z-0 print-overlay-wrapper">
          
          {/* Modal Header Controls (invisible when printing) */}
          <div className="sticky top-0 bg-stone-900/90 border-b border-stone-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 text-stone-100 print:hidden no-print z-[10000]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-violet-600/20 text-violet-400 rounded-xl">
                <Printer size={22} className="animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                  Vista Previa de Impresión
                  <span className="text-[10px] bg-violet-500/20 text-violet-300 font-mono px-2 py-0.5 rounded border border-violet-500/30">
                    Formato DIN A4 (Estándar)
                  </span>
                </h3>
                <p className="text-stone-400 text-xs">
                  Ajustado para maquetación vertical estándar (210mm x 297mm)
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              <div className="text-[11px] bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium px-3 py-1.5 rounded-xl max-w-sm hidden lg:block leading-snug">
                ⚠️ Si estás en la vista previa y el botón de imprimir no rinde, haz clic en <strong>"Abrir en pestaña nueva"</strong> arriba a la derecha.
              </div>
              
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer border border-violet-500 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Printer size={16} />
                Mandar a Impresora / Guardar PDF
              </button>
              
              <button
                onClick={() => setPrintTarget(null)}
                className="px-4 py-2.5 bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-300 hover:text-white font-medium rounded-xl text-sm transition-all cursor-pointer"
              >
                Cerrar Vista Previa
              </button>
            </div>
          </div>

          {/* Actual DIN A4 Page Representation on Screen */}
          <div className="p-4 sm:p-10 flex justify-center bg-stone-950/40 min-h-[calc(100vh-80px)] print:bg-white print:p-0 print:m-0 print-section-container">
            <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-stone-900 rounded-3xl shadow-2xl p-8 sm:p-14 print:shadow-none print:rounded-none print:p-0 print:border-0 print-page-card flex flex-col justify-between font-sans">
              
              {/* Content body wrapper */}
              <div>
                {/* Visual Letterhead Header */}
                <div className="border-b-2 border-stone-900 pb-4 mb-6">
                  <h1 className="text-2xl font-black tracking-tight text-stone-950 leading-tight">
                    Tablón de Ideas
                  </h1>
                </div>

                {/* If printing all notes */}
                {printTarget === 'all' ? (
                  <div className="space-y-6">
                    {filteredNotes.map((note) => (
                      <div key={note.id} className="print-card border border-stone-200 rounded-2xl p-5 bg-stone-50/50 print-avoid-break">
                        {/* Note header details */}
                        <div className="border-b border-stone-200 pb-2 mb-3.5">
                          <h2 className="text-lg font-bold font-serif text-stone-950 leading-snug">{note.title}</h2>
                          {note.tags && note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {note.tags.map((tag, idx) => (
                                <span key={idx} className="text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border border-violet-200 bg-violet-50 text-violet-800">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Note bullets / task points list */}
                        <div className="space-y-3">
                          {note.items && note.items.map((item) => (
                            <div key={item.id} className="print-item">
                              <div className="flex items-start gap-2 text-xs">
                                <span className="text-stone-700 font-mono text-sm leading-none select-none shrink-0">
                                  {item.completed ? '☑' : '☐'}
                                </span>
                                <span className={`flex-1 font-semibold text-stone-900 ${item.completed ? 'line-through text-stone-400' : ''}`}>
                                  {item.text}
                                </span>
                              </div>

                              {/* Nested sub-items list */}
                              {item.subItems && item.subItems.length > 0 && (
                                <div className="pl-6 mt-1.5 space-y-1.5 border-l-2 border-stone-200 ml-1.5">
                                  {item.subItems.map((subItem) => (
                                    <div key={subItem.id} className="flex items-start gap-1.5 text-[11px]">
                                      <span className="text-stone-500 font-mono text-xs leading-none select-none shrink-0">
                                        {subItem.completed ? '☑' : '☐'}
                                      </span>
                                      <span className={`flex-1 text-stone-700 ${subItem.completed ? 'line-through text-stone-450' : ''}`}>
                                        {subItem.text}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                          {(!note.items || note.items.length === 0) && (
                            <p className="text-xs italic text-stone-400">Esta nota no contiene puntos o elaboraciones todavía.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* If printing single note */
                  <div className="print-card border-2 border-stone-300 rounded-3xl p-6 sm:p-8 bg-stone-50/40 my-4">
                    <div className="border-b-2 border-stone-250 pb-3 mb-6">
                      <h2 className="text-xl font-bold font-serif text-stone-950 leading-snug">{printTarget.title}</h2>
                      {printTarget.tags && printTarget.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {printTarget.tags.map((tag, idx) => (
                            <span key={idx} className="text-[9px] font-extrabold px-2 py-0.5 uppercase tracking-wider bg-violet-600/10 border border-violet-500/20 text-violet-700 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {printTarget.items && printTarget.items.map((item) => (
                        <div key={item.id} className="print-item pb-2 border-b border-stone-200/55 last:border-0">
                          <div className="flex items-start gap-2.5 text-sm leading-normal">
                            <span className="text-stone-800 font-mono text-base leading-none select-none shrink-0">
                              {item.completed ? '☑' : '☐'}
                            </span>
                            <span className={`flex-1 font-bold text-stone-950 ${item.completed ? 'line-through text-stone-400' : ''}`}>
                              {item.text}
                            </span>
                          </div>

                          {/* Sub-items list */}
                          {item.subItems && item.subItems.length > 0 && (
                            <div className="pl-7 mt-2 space-y-1.5 border-l-2 border-stone-200 ml-1.5">
                              {item.subItems.map((subItem) => (
                                <div key={subItem.id} className="flex items-start gap-2 text-xs">
                                  <span className="text-stone-500 font-mono text-sm leading-none select-none shrink-0">
                                    {subItem.completed ? '☑' : '☐'}
                                  </span>
                                  <span className={`flex-1 text-stone-800 ${subItem.completed ? 'line-through text-stone-400' : ''}`}>
                                    {subItem.text}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {(!printTarget.items || printTarget.items.length === 0) && (
                        <p className="text-xs italic text-stone-400 py-4 text-center">Esta nota no contiene puntos o elaboraciones todavía.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Print Footer block */}
              <div className="mt-12 pt-4 border-t border-stone-300 text-center text-[9px] text-stone-400 font-sans tracking-wide">
                © {new Date().getFullYear()} Coffee Break Suite - Universidad de Turismo y Gastronomía. Todos los derechos reservados.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stylesheet dedicated to print layout for A4 */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Force white background and default dark slate text for printed pages */
          body, html {
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #1c1917 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            width: 100% !important;
            height: auto !important;
          }
          
          /* Hide non-print structures cleanly */
          aside,
          header,
          nav,
          form,
          button,
          .toast-container,
          .print\\:hidden,
          .no-print,
          .print-overlay-wrapper *:not(.print-section-container):not(.print-section-container *) {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            height: 0 !important;
            width: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: hidden !important;
          }

          /* Ensure layout containers have full width and normal scrolling/flow for print */
          main, 
          #root, 
          #root > div {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            display: block !important;
            background: none !important;
            background-color: transparent !important;
          }

          /* Explicitly display our print preview block representing DIN A4 layout */
          .print-overlay-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            z-index: auto !important;
            overflow: visible !important;
            display: block !important;
          }

          .print-section-container {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            max-width: 100% !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }

          .print-page-card {
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            padding: 0mm !important;
            margin: 0mm !important;
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
          }

          .print-card {
            background-color: #fafaf9 !important;
            border: 1px solid #d6d3d1 !important;
            border-radius: 8px !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          @page {
            size: A4 portrait;
            margin: 18mm 15mm 18mm 15mm;
          }
        }
      `}} />
    </>
  );
}
