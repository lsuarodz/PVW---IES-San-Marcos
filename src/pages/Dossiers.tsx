import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { 
  Plus, Trash2, Edit2, X, Check, BookOpen, User, FolderPlus, 
  ExternalLink, Palette, FileText, CheckCircle2, ChevronRight,
  Sparkles, Coffee, Utensils, MessageSquare, ArrowLeft, Star, Heart
} from 'lucide-react';
import { Dossier, Menu, Recipe } from '../types';
import { handleFirestoreError, OperationType } from '../firebase';

const THEMES = [
  { 
    id: 'gold-minimal', 
    name: 'Oro Minimalista', 
    bg: 'bg-stone-50', 
    text: 'text-stone-900', 
    accent: 'text-amber-700', 
    border: 'border-amber-200/60',
    card: 'bg-white border border-stone-200/80 shadow-sm',
    badge: 'bg-amber-100 text-amber-900', 
    fontSerif: 'font-serif',
    primaryBtn: 'bg-amber-800 hover:bg-amber-900 text-white shadow-amber-900/10'
  },
  { 
    id: 'dark-slate', 
    name: 'Pizarra Oscura', 
    bg: 'bg-stone-950', 
    text: 'text-stone-100', 
    accent: 'text-teal-400', 
    border: 'border-stone-800',
    card: 'bg-stone-900 border border-stone-800 shadow-md',
    badge: 'bg-teal-950 text-teal-300 border border-teal-800/40', 
    fontSerif: 'font-mono',
    primaryBtn: 'bg-teal-500 hover:bg-teal-600 text-stone-950 font-bold'
  },
  { 
    id: 'editorial', 
    name: 'Editorial Burdeos', 
    bg: 'bg-[#faf6f0]', 
    text: 'text-[#2a211e]', 
    accent: 'text-[#8c2d19]', 
    border: 'border-[#7d2210]/15',
    card: 'bg-[#fffcf9] border border-[#f0e6da] shadow-sm',
    badge: 'bg-[#8c2d19]/10 text-[#8c2d19]', 
    fontSerif: 'font-serif italic',
    primaryBtn: 'bg-[#8c2d19] hover:bg-[#722110] text-[#fffcf9] shadow-[#8c2d19]/10'
  },
  { 
    id: 'rustic-green', 
    name: 'Verde Rústico', 
    bg: 'bg-[#f5f6f2]', 
    text: 'text-emerald-950', 
    accent: 'text-emerald-800', 
    border: 'border-emerald-900/10',
    card: 'bg-[#fcfdfa] border border-emerald-900/10 shadow-sm',
    badge: 'bg-emerald-100 text-emerald-900', 
    fontSerif: 'font-serif',
    primaryBtn: 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-emerald-950/10'
  }
];

export default function Dossiers() {
  const { appUser } = useAuth();
  const { showToast } = useToast();
  const { menus, recipes, clients, ingredients } = useData();

  const [dossiers, setDossiers] = useState<Dossier[]>([]);

  // Dynamic helper to resolve allergens from ingredients used in a plate/recipe
  const getRecipeAllergens = (recipe: Recipe) => {
    const allergenSet = new Set<string>();
    recipe.ingredients?.forEach(ri => {
      const ing = ingredients.find(i => i.id === ri.ingredientId);
      if (ing?.allergens) {
        ing.allergens.forEach(allg => {
          if (allg && allg.trim()) {
            allergenSet.add(allg.trim());
          }
        });
      }
    });
    return Array.from(allergenSet);
  };

  const [loading, setLoading] = useState(true);

  // Form states for creating/editing a dossier
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [customClientName, setCustomClientName] = useState('');
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<'gold-minimal' | 'dark-slate' | 'editorial' | 'rustic-green'>('gold-minimal');
  const [status, setStatus] = useState<'draft' | 'presented' | 'approved' | 'rejected'>('draft');

  // Presentation State 
  const [activePresentationDossier, setActivePresentationDossier] = useState<Dossier | null>(null);
  const [isClientMode, setIsClientMode] = useState(false); // Simulated client perspective toggle
  const [selectedMenuChoice, setSelectedMenuChoice] = useState<string | null>(null);
  const [clientComment, setClientComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'design_dossiers'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data: Dossier[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Dossier);
      });
      setDossiers(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching dossiers:", error);
      showToast('Error al conectar con los dossiers', 'error');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setClientId('');
    setCustomClientName('');
    setSelectedMenus([]);
    setSelectedRecipes([]);
    setSelectedTheme('gold-minimal');
    setStatus('draft');
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (dossier: Dossier) => {
    setTitle(dossier.title);
    setDescription(dossier.description);
    setClientId(dossier.clientId || '');
    setCustomClientName(dossier.clientName || '');
    setSelectedMenus(dossier.menuIds || []);
    setSelectedRecipes(dossier.recipeIds || []);
    setSelectedTheme(dossier.theme || 'gold-minimal');
    setStatus(dossier.status || 'draft');
    setEditingId(dossier.id);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !appUser) return;

    const id = editingId || doc(collection(db, 'design_dossiers')).id;
    const resolvedClientName = customClientName.trim() 
      ? customClientName.trim() 
      : (clients.find(c => c.id === clientId)?.name || 'Cliente Sin Nombre');

    const dossierData: Partial<Dossier> = {
      id,
      title: title.trim(),
      description: description.trim(),
      clientId: clientId || undefined,
      clientName: resolvedClientName,
      menuIds: selectedMenus,
      recipeIds: selectedRecipes,
      theme: selectedTheme,
      status: status,
      createdBy: appUser.name,
      group: appUser.group || 'Sin Grupo',
      createdAt: editingId 
        ? (dossiers.find(d => d.id === editingId)?.createdAt || new Date().toISOString())
        : new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'design_dossiers', id), dossierData, { merge: true });
      showToast(editingId ? 'Dossier actualizado' : 'Dossier creado correctamente', 'success');
      resetForm();
    } catch (error) {
      showToast('Error al guardar el dossier', 'error');
      handleFirestoreError(error, OperationType.WRITE, `design_dossiers/${id}`);
    }
  };

  const handleDelete = async (id: string, dossierTitle: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar permanentemente el dossier "${dossierTitle}"?`)) return;

    try {
      await deleteDoc(doc(db, 'design_dossiers', id));
      showToast('Dossier eliminado', 'success');
      if (activePresentationDossier?.id === id) {
        setActivePresentationDossier(null);
      }
    } catch (error) {
      showToast('Error al eliminar el dossier', 'error');
      handleFirestoreError(error, OperationType.DELETE, `design_dossiers/${id}`);
    }
  };

  const toggleMenuSelection = (menuId: string) => {
    setSelectedMenus(prev => 
      prev.includes(menuId) ? prev.filter(id => id !== menuId) : [...prev, menuId]
    );
  };

  const toggleRecipeSelection = (recipeId: string) => {
    setSelectedRecipes(prev => 
      prev.includes(recipeId) ? prev.filter(id => id !== recipeId) : [...prev, recipeId]
    );
  };

  // Launch Presentation/Showcase Mode
  const openPresentation = (dossier: Dossier) => {
    setActivePresentationDossier(dossier);
    setSelectedMenuChoice(dossier.selectedMenuId || null);
    setClientComment(dossier.clientFeedback || '');
    setIsClientMode(false); // Reset default preview to student designer
  };

  // Keep track of client-side choice selection simulation
  const handleClientSubmitFeedback = async () => {
    if (!activePresentationDossier) return;
    setSubmittingComment(true);

    try {
      const docRef = doc(db, 'design_dossiers', activePresentationDossier.id);
      await updateDoc(docRef, {
        selectedMenuId: selectedMenuChoice,
        clientFeedback: clientComment,
        status: 'approved' // Automatically update status once they provide feedback
      });
      
      // Update local preview state
      const updatedDossier = {
        ...activePresentationDossier,
        selectedMenuId: selectedMenuChoice,
        clientFeedback: clientComment,
        status: 'approved' as const
      };
      setActivePresentationDossier(updatedDossier);
      showToast('¡Elección guardada con éxito! Su selección ha quedado registrada.', 'success');
    } catch (error) {
      console.error(error);
      showToast('Error al enviar la selección', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Display status in Spanish badge
  const renderStatusBadge = (statusVal: string) => {
    const map: { [key: string]: { label: string, color: string } } = {
      draft: { label: 'Borrador', color: 'bg-stone-100 text-stone-800 border-stone-200' },
      presented: { label: 'Presentado', color: 'bg-blue-50 text-blue-800 border-blue-200' },
      approved: { label: 'Aprobado por Cliente', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
      rejected: { label: 'Revisión Pendiente', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    };
    const resolved = map[statusVal] || { label: statusVal, color: 'bg-stone-50 text-stone-700 border-stone-100' };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${resolved.color}`}>
        {resolved.label}
      </span>
    );
  };

  // Find recipes of type "plato" vs "elaborado" (only show plates to represent to client)
  const availablePlates = recipes.filter(r => r.type === 'plato');

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      {/* Dynamic Fullscreen Elegant Presentation Overlay */}
      {activePresentationDossier && (() => {
        const dossier = activePresentationDossier;
        const currentTheme = THEMES.find(t => t.id === dossier.theme) || THEMES[0];
        
        // Load menus referenced inside dossier
        const dossierMenus = menus.filter(m => dossier.menuIds.includes(m.id));
        const dossierRecipes = recipes.filter(r => dossier.recipeIds.includes(r.id));

        return (
          <div className={`fixed inset-0 z-50 overflow-y-auto ${currentTheme.bg} ${currentTheme.text} transition-colors duration-300`}>
            
            {/* Elegant Floating Top Bar for Control */}
            <div className="sticky top-0 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-50">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActivePresentationDossier(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl hover:bg-stone-200 transition-all font-medium text-sm cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  Volver al Gestor
                </button>
                <span className="text-stone-400 font-light hidden sm:inline">|</span>
                <span className="font-semibold text-sm text-stone-500 max-w-xs truncate">
                  Visualizando: <strong className="text-stone-800 dark:text-stone-200">{dossier.title}</strong>
                </span>
              </div>

              {/* View Simulation Switcher */}
              <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-1 rounded-xl shadow-inner border border-stone-200 dark:border-stone-700">
                <button 
                  onClick={() => setIsClientMode(false)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    !isClientMode 
                      ? 'bg-violet-600 text-white shadow' 
                      : 'text-stone-500'
                  }`}
                >
                  Vista Alumno (Diseño)
                </button>
                <button 
                  onClick={() => setIsClientMode(true)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    isClientMode 
                      ? 'bg-violet-600 text-white shadow' 
                      : 'text-stone-500'
                  }`}
                >
                  Vista Cliente (Interactivo)
                </button>
              </div>
            </div>

            {/* Simulated Banner explaining preview */}
            {!isClientMode && (
              <div className="bg-amber-500 text-stone-950 px-6 py-2.5 text-center text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-2 select-none shadow">
                <Sparkles size={14} />
                MODO CREATIVO: ESTA ES LA VISTA PREVIA DEL DOSSIER DE PRESENTACIÓN ELEGANTE. PUEDES CAMBIAR A 'VISTA CLIENTE' PARA SIMULAR SU ELECCIÓN.
              </div>
            )}

            {/* Elegant Presentation Head */}
            <div className="max-w-4xl mx-auto px-6 py-16 sm:py-24 text-center">
              <span className={`px-4 py-1.5 rounded-full border ${currentTheme.border} ${currentTheme.badge} tracking-widest text-xs uppercase font-extrabold`}>
                Propuesta Gastronómica
              </span>
              
              <h1 className={`text-5xl sm:text-7xl font-bold tracking-tight mt-6 mb-8 uppercase ${currentTheme.fontSerif}`}>
                {dossier.title}
              </h1>

              <div className={`w-20 h-1 mx-auto my-6 bg-current opacity-30`} />

              <p className="text-lg sm:text-xl font-light italic max-w-2xl mx-auto leading-relaxed opacity-90 font-serif">
                "{dossier.description}"
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs font-semibold select-none">
                <span className="flex items-center gap-1.5 opacity-80">
                  <User size={14} />
                  Para: <strong className="underline">{dossier.clientName}</strong>
                </span>
                <span className="opacity-40 hidden sm:inline">•</span>
                <span className="opacity-80">
                  Elaborado por: <strong>{dossier.createdBy} ({dossier.group})</strong>
                </span>
              </div>
            </div>

            {/* Menus Section */}
            {dossierMenus.length > 0 && (
              <div className="max-w-5xl mx-auto px-6 py-12">
                <h2 className={`text-2xl sm:text-3xl font-bold mb-10 text-center select-none uppercase tracking-widest ${currentTheme.fontSerif} ${currentTheme.accent}`}>
                  Nuestros Menús Propuestos
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {dossierMenus.map((menu) => {
                    const isSelected = selectedMenuChoice === menu.id;

                    return (
                      <div 
                        key={menu.id} 
                        className={`transition-all duration-300 relative rounded-3xl ${currentTheme.card} ${
                          isSelected ? 'ring-4 ring-offset-2 ring-violet-500' : ''
                        }`}
                      >
                        {/* Selected Indicator Banner */}
                        {isSelected && (
                          <div className="absolute top-0 right-0 bg-violet-600 text-white rounded-bl-2xl rounded-tr-3xl px-4 py-1.5 text-xs font-bold flex items-center gap-1 select-none">
                            <CheckCircle2 size={13} />
                            Menú Elegido
                          </div>
                        )}

                        <div className="p-8">
                          <span className="text-[11px] font-bold uppercase tracking-widest opacity-60">
                            Categoría: {menu.type.toUpperCase()}
                          </span>

                          <h3 className={`text-2xl font-bold mt-1.5 mb-2 ${currentTheme.fontSerif}`}>
                            {menu.nameES}
                          </h3>
                          {menu.nameEN && (
                            <h4 className="text-sm italic opacity-70 mb-4 font-serif">
                              {menu.nameEN}
                            </h4>
                          )}

                          {menu.marketingDescription && (
                            <p className="text-sm italic opacity-80 leading-relaxed mb-6 font-serif border-l-2 pl-3 border-stone-300/30">
                              "{menu.marketingDescription}"
                            </p>
                          )}

                          {menu.price > 0 && !isClientMode && (
                            <div className="text-right text-lg font-bold mb-6">
                              Precio de Venta Sugerido: <span className={currentTheme.accent}>{menu.price.toFixed(2)} €</span>
                            </div>
                          )}

                          {/* Map internal recipe details of the Menu */}
                          <div className="space-y-4 pt-4 border-t border-stone-200/40">
                            <h5 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">
                              Composición del Menú:
                            </h5>

                            {recipes.filter(r => menu.recipes.includes(r.id)).map((recipe) => {
                              const recipeAllergens = getRecipeAllergens(recipe);
                              return (
                                <div key={recipe.id} className="text-sm border-b border-stone-200/20 pb-3 last:border-0 last:pb-0">
                                  <div className="flex items-center gap-2 justify-between">
                                    <div className="flex items-center gap-2">
                                      <Utensils size={14} className="opacity-60" />
                                      <span className="font-semibold">{recipe.nameES}</span>
                                    </div>
                                    {recipeAllergens.length > 0 && (
                                      <span className="text-[10px] bg-stone-200/40 dark:bg-stone-800 px-2 py-0.5 rounded-full opacity-70">
                                        {recipeAllergens.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs opacity-75 mt-0.5 pl-5 line-clamp-2 italic">
                                    {recipe.descriptionES}
                                  </p>
                                </div>
                              );
                            })}
                          </div>

                          {/* Interactive Button to choose menu inside presented dossier */}
                          <div className="mt-8 pt-4">
                            <button
                              onClick={() => setSelectedMenuChoice(menu.id)}
                              className={`w-full py-3.5 rounded-2xl font-bold text-sm tracking-widest uppercase transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
                                isSelected 
                                  ? 'bg-violet-600 text-white' 
                                  : 'bg-stone-200 text-stone-800 hover:bg-stone-300 dark:bg-stone-850 dark:text-stone-300'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check size={16} />
                                  ¡Menú Seleccionado para Evento!
                                </>
                              ) : (
                                <>
                                  <Heart size={15} />
                                  Egir este Menú
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Individual Plates Section */}
            {dossierRecipes.length > 0 && (
              <div className="max-w-4xl mx-auto px-6 py-12">
                <h2 className={`text-2xl sm:text-3xl font-bold mb-10 text-center select-none uppercase tracking-widest ${currentTheme.fontSerif} ${currentTheme.accent}`}>
                  Platos Especiales y Elaboraciones Recomendadas
                </h2>

                <div className="space-y-8">
                  {dossierRecipes.map((recipe) => (
                    <div 
                      key={recipe.id} 
                      className={`rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-start sm:items-center ${currentTheme.card}`}
                    >
                      {recipe.imageUrl && (
                        <div className="w-full md:w-44 h-44 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-stone-200/50">
                          <img 
                            src={recipe.imageUrl} 
                            alt={recipe.nameES} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      )}

                      <div className="flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Plato Sugerido</span>
                        <h3 className={`text-2xl font-bold mt-1 mb-2 ${currentTheme.fontSerif}`}>
                          {recipe.nameES}
                        </h3>
                        {recipe.nameEN && (
                          <h4 className="text-xs italic opacity-60 mb-3 block font-serif">
                            {recipe.nameEN}
                          </h4>
                        )}
                        <p className="text-sm opacity-80 font-serif leading-relaxed italic mb-4">
                          "{recipe.descriptionES}"
                        </p>

                        <div className="flex flex-wrap gap-2 text-[11px] items-center">
                          {getRecipeAllergens(recipe).length > 0 && (
                            <span className="bg-orange-100/50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-full font-semibold">
                              Alérgenos: {getRecipeAllergens(recipe).join(', ')}
                            </span>
                          )}
                          {recipe.score && (
                            <span className="bg-yellow-100 dark:bg-yellow-950/40 text-yellow-900 border border-yellow-500/15 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                              <Star size={11} className="fill-yellow-600 text-yellow-500" />
                              Nota técnica: {recipe.score}/10
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Feedback & Choice Confirmation Panel */}
            <div className={`max-w-3xl mx-auto px-6 py-12 mb-24 rounded-3xl border ${currentTheme.border} ${currentTheme.card}`}>
              <h3 className={`text-2xl font-bold mb-4 text-center ${currentTheme.fontSerif} ${currentTheme.accent}`}>
                {isClientMode ? 'Enviar Selección de Menú y Comentarios' : 'Estado de Elección del Cliente'}
              </h3>
              
              <p className="text-center text-xs opacity-75 mb-8 max-w-md mx-auto">
                {isClientMode 
                  ? 'Complete su voto eligiendo un menú en las tarjetas superiores e ingrese sus comentarios abajo. Los alumnos recibirán su feedback en tiempo real.' 
                  : 'Este panel simula cómo interactuaría el cliente final con este dossier elegante. Puede pulsar "Vista Cliente" en la esquina superior para probarlo.'
                }
              </p>

              <div className="space-y-6">
                {/* Chosen Menu Name Display */}
                <div className="bg-stone-500/5 p-4 rounded-2xl border border-stone-400/10">
                  <span className="block text-xs font-bold uppercase opacity-60 mb-1">Menú Seleccionado</span>
                  <div className="font-semibold text-base flex items-center gap-2">
                    {selectedMenuChoice ? (
                      <>
                        <CheckCircle2 size={18} className="text-violet-600" />
                        {menus.find(m => m.id === selectedMenuChoice)?.nameES || 'Menú Seleccionado'}
                      </>
                    ) : (
                      <span className="text-stone-400 italic">No ha seleccionado ningún menú todavía. Pulse "Elegir este Menú" arriba.</span>
                    )}
                  </div>
                </div>

                {/* Feedback Comment */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-2">
                    Observaciones, peticiones o modificaciones del cliente
                  </label>
                  <textarea
                    rows={4}
                    value={clientComment}
                    onChange={(e) => setClientComment(e.target.value)}
                    placeholder={isClientMode ? "Escriba aquí los detalles (ej: Dos menús vegetarianos, sustituir el postre del menú B, etc.)" : "Sugerencias o comentarios cargados..."}
                    disabled={!isClientMode}
                    className="w-full px-4 py-3 bg-stone-500/5 focus:bg-white border border-stone-500/10 focus:ring-1 focus:ring-violet-500 rounded-2xl focus:outline-none focus:shadow-sm text-sm transition-all"
                  />
                </div>

                {/* Submitting Buttons / Simulation indicators */}
                {isClientMode ? (
                  <button
                    onClick={handleClientSubmitFeedback}
                    disabled={submittingComment || !selectedMenuChoice}
                    className={`w-full py-4 rounded-2xl text-center text-sm font-bold uppercase tracking-widest shadow-md transition-all ${
                      selectedMenuChoice 
                        ? 'bg-violet-600 hover:bg-violet-700 text-white cursor-pointer active:scale-[0.99]' 
                        : 'bg-stone-200 text-stone-400 cursor-not-allowed dark:bg-stone-850 dark:text-stone-600'
                    }`}
                  >
                    {submittingComment ? 'Guardando respuesta...' : 'Confirmar Elección de Menú'}
                  </button>
                ) : (
                  <div className="text-center font-bold text-xs p-3 border border-dashed border-stone-200 rounded-2xl opacity-80 text-stone-500 select-none">
                    🔑 MODO EDICIÓN DE ALUMNOS: Los comentarios y elecciones guardadas por los clientes aparecerán actualizadas automáticamente.
                  </div>
                )}
              </div>
            </div>

          </div>
        );
      })()}

      {/* Main Dossier Manager Interface */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 tracking-tight mb-2 flex items-center gap-3 select-none">
            <BookOpen className="text-violet-600" size={36} />
            Dossiers de Presentación
          </h1>
          <p className="text-stone-500 text-lg max-w-2xl">
            Crea dosieres elegantes con propuestas de menús y platos para tus clientes, recopila sus valoraciones y hazles partícipes de su elección.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-bold tracking-wide transition-all shadow-md self-start md:self-auto cursor-pointer"
        >
          <FolderPlus size={18} />
          Nuevo Dossier Elegante
        </button>
      </div>

      {/* Embedded Form overlay */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm mb-10">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100 select-none">
            <h2 className="text-stone-900 text-xl font-bold flex items-center gap-2">
              <Sparkles className="text-violet-500" size={20} />
              {editingId ? 'Modificar Dossier' : 'Crear Propuesta de Dossier'}
            </h2>
            <button onClick={resetForm} className="text-stone-400 hover:text-stone-600 p-1.5 rounded-full hover:bg-stone-50 transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    Título Comercial del Dossier (ej. Propuesta Catering Bautizo - Familia Gómez)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Escribe el nombre del dossier..."
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow text-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">
                    Introducción o Carta de Presentación de los Alumnos
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Escribe un elegante texto introductorio dando la bienvenida al cliente y contando la filosofía de tus propuestas o elaboración culinaria..."
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow text-stone-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">
                      Ficha de Cliente Integrado (Opcional)
                    </label>
                    <select
                      value={clientId}
                      onChange={(e) => {
                        setClientId(e.target.value);
                        setCustomClientName('');
                      }}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow text-stone-800 text-sm"
                    >
                      <option value="">-- Ninguno o Cliente Nuevo --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">
                      Nombre Comercial Cliente Manual
                    </label>
                    <input
                      type="text"
                      value={customClientName}
                      onChange={(e) => {
                        setCustomClientName(e.target.value);
                        setClientId('');
                      }}
                      placeholder="ej: Hotel Bahía o Empresa S.A."
                      disabled={!!clientId}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow text-stone-800 text-sm disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">
                      Estilo / Plantilla Visual
                    </label>
                    <select
                      value={selectedTheme}
                      onChange={(e) => setSelectedTheme(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow text-stone-800 text-sm"
                    >
                      {THEMES.map(theme => (
                        <option key={theme.id} value={theme.id}>{theme.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-2">
                      Estado de Negociación
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 transition-shadow text-stone-800 text-sm font-bold"
                    >
                      <option value="draft">Borrador</option>
                      <option value="presented">Presentado a Cliente</option>
                      <option value="approved">Aprobado</option>
                      <option value="rejected">Revisión Pendiente</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Items selections lists */}
              <div className="space-y-4">
                <div>
                  <span className="block text-sm font-semibold text-stone-700 mb-2">
                    1. Vincular los Menús en Oferta (Selecciona uno o varios)
                  </span>
                  <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-2xl bg-stone-50 p-3 space-y-2">
                    {menus.map((menu) => {
                      const isChecked = selectedMenus.includes(menu.id);
                      return (
                        <label 
                          key={menu.id} 
                          className={`flex items-center gap-3 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                            isChecked ? 'bg-violet-50 border-violet-200 text-violet-900' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => toggleMenuSelection(menu.id)}
                            className="text-violet-600 rounded focus:ring-violet-500" 
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">{menu.nameES}</p>
                            <p className="text-[10px] text-stone-500">{menu.type.toUpperCase()} • {menu.recipes.length} elaboraciones</p>
                          </div>
                        </label>
                      );
                    })}
                    {menus.length === 0 && (
                      <p className="text-xs text-stone-400 italic text-center py-4">No hay menús registrados en cocina.</p>
                    )}
                  </div>
                </div>

                <div>
                  <span className="block text-sm font-semibold text-stone-700 mb-2">
                    2. Vincular Platos de Degustación Adicionales
                  </span>
                  <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-2xl bg-stone-50 p-3 space-y-2">
                    {availablePlates.map((recipe) => {
                      const isChecked = selectedRecipes.includes(recipe.id);
                      return (
                        <label 
                          key={recipe.id} 
                          className={`flex items-center gap-3 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                            isChecked ? 'bg-violet-50 border-violet-200 text-violet-900' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => toggleRecipeSelection(recipe.id)}
                            className="text-violet-600 rounded focus:ring-violet-500" 
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">{recipe.nameES}</p>
                            <p className="text-[10px] text-stone-500">{recipe.createdBy}</p>
                          </div>
                        </label>
                      );
                    })}
                    {availablePlates.length === 0 && (
                      <p className="text-xs text-stone-400 italic text-center py-4">No hay platos individuales registrados.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100 select-none">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2 hover:bg-stone-100 text-stone-700 rounded-xl font-medium transition-colors text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors flex items-center gap-1.5 text-sm cursor-pointer shadow-md"
              >
                <Check size={18} />
                {editingId ? 'Guardar Cambios' : 'Generar Dossier Gastronómico'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of existing dossiers */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-stone-400">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 mb-4" />
          <p>Cargando dossiers de presentación...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {dossiers.map((dossier) => {
            const hasChosenMenu = dossier.selectedMenuId;
            const chosenMenu = hasChosenMenu ? menus.find(m => m.id === dossier.selectedMenuId) : null;
            const themeObj = THEMES.find(t => t.id === dossier.theme) || THEMES[0];

            return (
              <div
                key={dossier.id}
                className="bg-white border border-stone-200 rounded-3xl h-full flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Dossier Card Header / Palette Preview */}
                <div className={`p-6 border-b border-stone-100 relative`}>
                  <div className="flex items-center justify-between mb-3.5 select-none hover:opacity-100">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border border-stone-300 ring-2 ring-white inline-block shadow-inner" style={{ backgroundColor: themeObj.id === 'dark-slate' ? '#09090b' : themeObj.id === 'editorial' ? '#faf6f0' : themeObj.id === 'rustic-green' ? '#f5f6f2' : '#fafafa' }} />
                      <span className="text-[11px] text-stone-500 font-bold tracking-wide uppercase">{themeObj.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(dossier)}
                        className="p-1 hover:bg-stone-100 text-stone-600 rounded-lg transition-colors"
                        title="Modificar dossier"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(dossier.id, dossier.title)}
                        className="p-1 hover:bg-stone-100 text-red-600 rounded-lg transition-colors"
                        title="Eliminar dossier"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-stone-900 text-lg tracking-tight hover:text-violet-700 transition-colors line-clamp-2">
                    {dossier.title}
                  </h3>

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {renderStatusBadge(dossier.status)}
                    <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-bold select-none">
                      Grupo: {dossier.group}
                    </span>
                  </div>
                </div>

                {/* Dossier Card Body */}
                <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                  <p className="text-stone-500 text-sm line-clamp-3 leading-relaxed">
                    {dossier.description}
                  </p>

                  <div className="space-y-2 border-t border-stone-100 pt-4">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span>Vínculo de Cliente:</span>
                      <strong className="text-stone-800">{dossier.clientName || 'Sin asignar'}</strong>
                    </div>

                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span>Menús Presentados:</span>
                      <strong className="text-stone-800">{(dossier.menuIds || []).length} menús</strong>
                    </div>

                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span>Platos Seleccionados:</span>
                      <strong className="text-stone-800">{(dossier.recipeIds || []).length} platos</strong>
                    </div>

                    {/* Show Client Selection if Approved/Reviewed */}
                    {dossier.selectedMenuId && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 mt-3 text-xs">
                        <span className="font-bold text-emerald-900 block mb-1 flex items-center gap-1 leading-none select-none">
                          <CheckCircle2 size={12} />
                          Menú Elegido por Cliente:
                        </span>
                        <span className="text-emerald-800 font-medium">
                          {chosenMenu?.nameES || 'Menú Seleccionado'}
                        </span>
                        {dossier.clientFeedback && (
                          <p className="text-[11px] text-emerald-700 italic border-t border-emerald-200/20 mt-1.5 pt-1.5 font-serif">
                            "{dossier.clientFeedback}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dossier Card Cta / Action Drawer */}
                <div className="p-6 bg-stone-50 border-t border-stone-100 select-none">
                  <button
                    onClick={() => openPresentation(dossier)}
                    className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl font-bold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <BookOpen size={14} />
                    Ver Dossier de Presentación
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            );
          })}

          {dossiers.length === 0 && (
            <div className="col-span-full py-20 bg-white border border-stone-200 rounded-3xl text-center text-stone-400">
              <BookOpen size={64} className="mx-auto mb-4 opacity-10 text-stone-950" />
              <p className="text-stone-600 text-lg font-bold">No hay dossiers de presentación creados.</p>
              <p className="text-sm text-stone-400 mt-1 max-w-sm mx-auto">
                Crea un nuevo dossier hoy y une tus menús y platos para presentarlos en un showroom pulido ante tus clientes.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
