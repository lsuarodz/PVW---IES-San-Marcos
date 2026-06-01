import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, Edit2, Search, BookOpen, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { ALLERGENS } from '../constants/allergens';
import { getGroupColor } from '../utils/groupColors';
import CreateIngredientModal from '../components/CreateIngredientModal';
import CreateElaboradoModal from '../components/CreateElaboradoModal';
import ConfirmModal from '../components/ConfirmModal';
import IngredientSelect from '../components/IngredientSelect';
import { generatePDF } from '../utils/pdf';
import { calculateRecipeTotalCost, getRecipeAllergens } from '../utils/calculations';
import { canViewItem } from '../utils/visibility';
import { Recipe, RecipeIngredient, Ingredient } from '../types';

export default function Recipes({ type = 'plato' }: { type?: 'elaborado' | 'plato' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  // Obtenemos el usuario actual para verificar sus permisos
  const { appUser, actualAppUser, viewAsStudent, commissionMode } = useAuth();
  // Verificamos si el usuario tiene rol de administrador o docente
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'docente';
  // Verificamos si el usuario es el administrador principal
  const isSuperAdmin = appUser?.role === 'admin';
  const { showToast } = useToast();
  
  // Estados para almacenar los datos de la base de datos
  const { recipes, ingredients, menus, settings, users } = useData();
  
  // Filtrar recetas por tipo (las que no tienen tipo se consideran 'plato')
  const filteredByType = recipes.filter(r => type === 'plato' ? (!r.type || r.type === 'plato') : r.type === 'elaborado');
  
  // Estado para el buscador, paginación y filtro de grupos
  const [search, setSearch] = useState('');
  const [selectedLetter, setSelectedLetter] = useState('todas');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewOtherGroups, setViewOtherGroups] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>('todos');
  const itemsPerPage = 12;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isKaled = (appUser?.name?.toLowerCase().includes('kaled') || appUser?.email?.toLowerCase().includes('kaled')) && commissionMode;
  
  // Estados para controlar la visibilidad de los modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [isElaboradoModalOpen, setIsElaboradoModalOpen] = useState(false);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  
  // Estado para saber si estamos editando un escandallo existente
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estados para el modal de confirmación
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Estados para la evaluación
  const [evaluateModal, setEvaluateModal] = useState<{
    isOpen: boolean;
    recipeId: string | null;
    score: number;
    feedback: string;
  }>({
    isOpen: false,
    recipeId: null,
    score: 0,
    feedback: ''
  });
  
  // Referencias y estados para la funcionalidad de impresión a PDF
  const printRef = useRef<HTMLDivElement>(null);
  const [printingRecipe, setPrintingRecipe] = useState<Recipe | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Estado para almacenar los datos del formulario del escandallo
  const [formData, setFormData] = useState({
    type: type as 'plato' | 'elaborado',
    nameES: '',
    portions: null as string | number | null,
    yieldQuantity: null as string | number | null,
    yieldUnit: 'kg' as 'kg' | 'L' | 'ud',
    steps: [] as string[],
    equipment: [] as string[],
    miseEnPlace: '',
    sustainabilityTips: [] as string[],
    ingredients: [] as RecipeIngredient[],
    imageUrl: '',
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  // Funciones de ayuda para permisos transversales
  const isOwner = (recipe: Recipe) => {
    if (!appUser) return false;
    if (isAdmin && !viewAsStudent) return true;
    return recipe.group === appUser.group;
  };

  const canEditField = (recipe: Recipe | null, fieldType: 'escandallo' | 'logistica' | 'sostenibilidad' | 'general') => {
    if (!appUser || !recipe) return false;
    if (isAdmin && !viewAsStudent) return true;
    
    const isRecipeOwner = recipe.group === appUser.group;
    if (isRecipeOwner) return true;

    // Kaled (Jefe Gastos) tiene permisos totales sobre escandallos
    if (isKaled && fieldType === 'escandallo') return true;

    // Si no es dueño, comprobamos comisiones transversales (solo si el modo comisión está activo)
    if (!commissionMode) return false;
    
    // Cada comisión actuará solo en los miembros de su curso
    const recipeCreator = users.find(u => u.name === recipe.createdBy || u.uid === recipe.createdBy);
    const recipeCourse = recipeCreator?.course;
    if (appUser.course && recipeCourse && appUser.course !== recipeCourse) {
      return false;
    }
    
    const commission = appUser.commission?.toLowerCase();
    if (fieldType === 'escandallo' && commission === 'gastos') return true;
    if (fieldType === 'logistica' && commission === 'logística') return true;
    if (fieldType === 'sostenibilidad' && commission === 'sostenibilidad') return true;
    
    return false;
  };

  const canEditAnyPartOfRecipe = (recipe: Recipe) => {
    return isOwner(recipe) || 
           canEditField(recipe, 'escandallo') || 
           canEditField(recipe, 'logistica') || 
           canEditField(recipe, 'sostenibilidad');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const storageRef = ref(storage, `recipes/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData({ ...formData, imageUrl: url });
      showToast('Imagen subida correctamente', 'success');
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast('Error al subir la imagen', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    const id = editingId || doc(collection(db, 'recipes')).id;
    const totalCost = calculateRecipeTotalCost(formData.ingredients, ingredients, recipes);

    const existing = editingId ? recipes.find(r => r.id === editingId) : null;
    
    const recipeData: Record<string, any> = {
      ...formData,
      portions: formData.type === 'plato' ? 1 : (Number(formData.portions) || null),
      yieldQuantity: Number(formData.yieldQuantity) || null,
      yieldUnit: formData.yieldUnit || 'kg',
      ingredients: formData.ingredients.map(ri => ({ ...ri, quantity: Number(ri.quantity) || 0 })),
      nameEN: existing?.nameEN || '',
      descriptionES: existing?.descriptionES || '',
      descriptionEN: existing?.descriptionEN || '',
      stepsEN: existing?.stepsEN || [],
      totalCost: isNaN(totalCost) || !isFinite(totalCost) ? 0 : totalCost,
      createdBy: existing?.createdBy || appUser.name || appUser.email || 'Usuario',
      group: existing?.group !== undefined ? existing.group : (appUser.group || ''),
      score: existing?.score || null,
      feedback: existing?.feedback || '',
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    if (recipeData.score === null) delete recipeData.score;
    if (recipeData.feedback === null || recipeData.feedback === '') delete recipeData.feedback;
    if (recipeData.portions === null) delete recipeData.portions;
    if (recipeData.yieldQuantity === null || recipeData.yieldQuantity === '') delete recipeData.yieldQuantity;
    if (!recipeData.imageUrl) delete recipeData.imageUrl;

    try {
      if (editingId) {
        const existing = recipes.find(r => r.id === editingId);
        if (existing && !isOwner(existing)) {
          // Actualización parcial basada en comisiones
          const patch: Record<string, any> = {};
          const commission = appUser.commission?.toLowerCase();
          
          if (commission === 'gastos' && commissionMode) {
            patch.ingredients = recipeData.ingredients;
            patch.yieldQuantity = recipeData.yieldQuantity;
            patch.yieldUnit = recipeData.yieldUnit;
            patch.portions = recipeData.portions;
            patch.totalCost = recipeData.totalCost;
          }
          if (commission === 'logística' && commissionMode) {
            patch.equipment = recipeData.equipment;
          }
          if (commission === 'sostenibilidad' && commissionMode) {
            patch.sustainabilityTips = recipeData.sustainabilityTips;
          }

          if (Object.keys(patch).length > 0) {
            await updateDoc(doc(db, 'recipes', editingId), patch);
          } else {
            showToast('No tienes permisos para editar esta receta', 'error');
            return;
          }
        } else {
          // Dueño o Admin: Actualización completa
          await setDoc(doc(db, 'recipes', id), recipeData);
        }
      } else {
        // Creación nueva: Siempre permitida para el grupo propio
        await setDoc(doc(db, 'recipes', id), recipeData);
      }
      
      setIsModalOpen(false);
      resetForm();
      showToast('Receta guardada correctamente', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `recipes/${id}`);
    }
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluateModal.recipeId) return;

    try {
      await updateDoc(doc(db, 'recipes', evaluateModal.recipeId), {
        score: evaluateModal.score,
        feedback: evaluateModal.feedback.trim()
      });
      showToast('Evaluación guardada', 'success');
      setEvaluateModal({ isOpen: false, recipeId: null, score: 0, feedback: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `recipes/${evaluateModal.recipeId}`);
    }
  };

  const openEvaluation = (recipe: Recipe) => {
    setEvaluateModal({
      isOpen: true,
      recipeId: recipe.id,
      score: recipe.score || 0,
      feedback: recipe.feedback || ''
    });
  };

  const handleDelete = async (id: string) => {
    const isUsedInMenu = menus.some(menu => 
      menu.recipes?.includes(id)
    );

    if (isUsedInMenu) {
      setConfirmModal({
        isOpen: true,
        title: 'No se puede eliminar',
        message: 'Este escandallo se está utilizando en uno o más menús. Elimínalo primero de los menús para poder borrarlo.',
        onConfirm: () => {},
        isDestructive: false
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Escandallo',
      message: '¿Estás seguro de eliminar este escandallo? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'recipes', id));
          showToast('Receta eliminada', 'success');
        } catch (error) {
          console.error('Error deleting recipe:', error);
          showToast('Error al eliminar. Solo el tutor puede eliminar.', 'error');
        }
      }
    });
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    
    // Check if any is used in menus
    const usedInMenus = Array.from(selectedIds).filter(id => 
      menus.some(menu => menu.recipes?.includes(id))
    );

    if (usedInMenus.length > 0) {
      setConfirmModal({
        isOpen: true,
        title: 'No se pueden eliminar',
        message: 'Algunos de los elementos seleccionados se están utilizando en uno o más menús. Elimínalos primero de los menús para poder borrarlos.',
        onConfirm: () => {},
        isDestructive: false
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `Eliminar ${selectedIds.size} elementos`,
      message: `¿Estás seguro de eliminar los ${selectedIds.size} elementos seleccionados? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        try {
          // Firebase doesn't have bulk delete client-side without batch, but we can do a simple loop since the list isn't huge. Or we can import writeBatch.
          // For simplicity we will loop.
          for (const id of Array.from(selectedIds)) {
            await deleteDoc(doc(db, 'recipes', id));
          }
          setSelectedIds(new Set());
          showToast(`${selectedIds.size} elementos eliminados`, 'success');
        } catch (error) {
          console.error('Error deleting recipes:', error);
          showToast('Error al eliminar. Revisa tus permisos.', 'error');
        }
      }
    });
  };

  const openEdit = (recipe: Recipe) => {
    setFormData({
      type: recipe.type === 'elaborado' ? 'elaborado' : 'plato',
      nameES: recipe.nameES,
      portions: recipe.portions,
      yieldQuantity: recipe.yieldQuantity || null,
      yieldUnit: recipe.yieldUnit as 'kg' | 'L' | 'ud' || 'kg',
      steps: recipe.steps || (recipe.descriptionES ? [recipe.descriptionES] : []),
      equipment: recipe.equipment || [],
      miseEnPlace: recipe.miseEnPlace || '',
      sustainabilityTips: recipe.sustainabilityTips || [],
      ingredients: recipe.ingredients,
      imageUrl: recipe.imageUrl || '',
    });
    setEditingId(recipe.id);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ type: type as 'plato' | 'elaborado', nameES: '', portions: null, yieldQuantity: null, yieldUnit: 'kg', steps: [], equipment: [], miseEnPlace: '', sustainabilityTips: [], ingredients: [], imageUrl: '' });
    setEditingId(null);
  };

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && recipes.length > 0) {
      const recipeToEdit = recipes.find(r => r.id === editId);
      if (recipeToEdit) {
        openEdit(recipeToEdit);
        // Remove the query param so it doesn't reopen on refresh
        setSearchParams({});
      }
    }
  }, [searchParams, recipes]);

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, '']
    });
  };

  const updateStep = (index: number, value: string) => {
    const newSteps = [...formData.steps];
    newSteps[index] = value;
    setFormData({ ...formData, steps: newSteps });
  };

  const removeStep = (index: number) => {
    const newSteps = formData.steps.filter((_, i) => i !== index);
    setFormData({ ...formData, steps: newSteps });
  };

  const addEquipment = () => {
    setFormData({ ...formData, equipment: [...formData.equipment, ''] });
  };

  const updateEquipment = (index: number, value: string) => {
    const newEq = [...formData.equipment];
    newEq[index] = value;
    setFormData({ ...formData, equipment: newEq });
  };

  const removeEquipment = (index: number) => {
    const newEq = formData.equipment.filter((_, i) => i !== index);
    setFormData({ ...formData, equipment: newEq });
  };

  const addTip = () => {
    setFormData({ ...formData, sustainabilityTips: [...formData.sustainabilityTips, ''] });
  };

  const updateTip = (index: number, value: string) => {
    const newTips = [...formData.sustainabilityTips];
    newTips[index] = value;
    setFormData({ ...formData, sustainabilityTips: newTips });
  };

  const removeTip = (index: number) => {
    const newTips = formData.sustainabilityTips.filter((_, i) => i !== index);
    setFormData({ ...formData, sustainabilityTips: newTips });
  };

  const addIngredientToRecipe = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { ingredientId: '', quantity: 0, itemType: 'ingredient' }]
    });
  };

  const addElaboradoToRecipe = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { ingredientId: '', quantity: 0, itemType: 'elaborado' }]
    });
  };

  const updateRecipeIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const removeRecipeIngredient = (index: number) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const exportPDF = async (recipe: Recipe) => {
    if (isPrinting) return;
    setIsPrinting(true);
    setPrintingRecipe(recipe);
    showToast('Generando PDF...', 'info');
    
    // Safety timeout to unblock UI if something goes wrong
    const safetyTimeout = setTimeout(() => {
      if (isPrinting) {
        setIsPrinting(false);
        setPrintingRecipe(null);
        showToast('La generación del PDF está tardando más de lo esperado.', 'info');
      }
    }, 15000);

    setTimeout(async () => {
      if (printRef.current) {
        try {
          const opt = {
            margin: 0,
            filename: `Receta_${recipe.nameES.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.95 },
            html2canvas: { 
              scale: 2, 
              useCORS: true, 
              logging: false,
              scrollY: 0,
              y: 0
            },
            jsPDF: { unit: 'px', format: [794, 1122] as [number, number], orientation: 'portrait' as const },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
          };
          
          await generatePDF(printRef.current, opt);
        } catch (err: any) {
          console.error('Error generating PDF:', err);
          showToast('Error al generar el PDF. Por favor, inténtalo de nuevo.', 'error');
        } finally {
          clearTimeout(safetyTimeout);
          setPrintingRecipe(null);
          setIsPrinting(false);
        }
      } else {
        clearTimeout(safetyTimeout);
        setIsPrinting(false);
      }
    }, 500);
  };

  const filteredRecipes = filteredByType.filter(r => {
    if (!canViewItem(r, appUser, users, {
      commissionMode,
      viewOtherGroups,
      selectedGroupFilter: selectedGroup,
      viewAsStudent,
      isKaled
    })) {
      return false;
    }

    if (viewAsStudent && appUser?.role === 'admin') {
      if (!r.group) return false;
      if (selectedGroup !== 'todos' && r.group !== selectedGroup) return false;
    }

    if (selectedLetter !== 'todas') {
      if (!r.nameES.toLowerCase().startsWith(selectedLetter.toLowerCase())) {
        return false;
      }
    }

    return r.nameES.toLowerCase().includes(search.toLowerCase()) || 
           r.nameEN?.toLowerCase().includes(search.toLowerCase());
  });

  // Calcular paginación
  const totalPages = Math.ceil(filteredRecipes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecipes = filteredRecipes.slice(startIndex, startIndex + itemsPerPage);

  // Resetear a la página 1 cuando se busca
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, type, selectedLetter]);

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className="min-h-full p-8">
      <div className="max-w-6xl mx-auto">
        <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        isDestructive={confirmModal.isDestructive}
      />
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500 tracking-tight mb-2">
            {type === 'elaborado' ? 'Elaborados' : 'Platos'}
          </h1>
          <p className="text-stone-500 text-lg">
            {type === 'elaborado' 
              ? 'Crea elaboraciones base que luego podrás usar en tus platos.' 
              : 'Crea platos finales combinando ingredientes y elaborados.'}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && !viewAsStudent && selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <Trash2 size={18} />
              Borrar Seleccionados ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            {type === 'elaborado' ? 'Nuevo Elaborado' : 'Nuevo Plato'}
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm mb-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between w-full">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            <input
              type="text"
              placeholder={`Buscar ${type === 'elaborado' ? 'elaborados' : 'platos'}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {(appUser?.course === '2ºPANADERÍA' && appUser?.role === 'student' && (appUser?.commission ? commissionMode : true)) && (
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <div className="flex bg-stone-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewOtherGroups(false)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    !viewOtherGroups 
                      ? 'bg-white text-teal-700 shadow-sm' 
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  Mi Grupo
                </button>
                <button
                  onClick={() => setViewOtherGroups(true)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    viewOtherGroups 
                      ? 'bg-white text-teal-700 shadow-sm' 
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  Otros Grupos
                </button>
              </div>

              {viewOtherGroups && (commissionMode || isAdmin) && (
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-sm font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
                >
                  <option value="todos">Todos los grupos</option>
                  {[...new Set(recipes.map(r => r.group).filter(Boolean))].sort().map(group => (
                    <option key={group} value={group!}>{group}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 w-full justify-center lg:justify-start border-t border-stone-100 pt-3 mt-1 items-center">
          {isAdmin && !viewAsStudent && (
            <button
              onClick={() => {
                if (selectedIds.size === paginatedRecipes.length && paginatedRecipes.length > 0) {
                  setSelectedIds(new Set());
                } else {
                  setSelectedIds(new Set(paginatedRecipes.map(r => r.id)));
                }
              }}
              className="px-3 py-1 rounded-lg text-xs font-semibold tracking-wider transition-all shadow-sm border border-stone-200 text-stone-600 hover:bg-stone-100 mr-2 flex items-center justify-center gap-1 h-7"
            >
              {selectedIds.size === paginatedRecipes.length && paginatedRecipes.length > 0 ? 'Desmarcar' : 'Seleccionar Vista'}
            </button>
          )}
          <button
            onClick={() => setSelectedLetter('todas')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all shadow-sm ${
              selectedLetter === 'todas'
                ? 'bg-teal-600 text-white'
                : 'bg-stone-100 text-stone-500 hover:bg-teal-50 hover:text-teal-600'
            }`}
          >
            Todas
          </button>
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              onClick={() => setSelectedLetter(letter)}
              className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all shadow-sm ${
                selectedLetter === letter
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-stone-50 text-stone-500 border border-stone-200 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {paginatedRecipes.map((recipe) => {
          const recipeAllergens = getRecipeAllergens(recipe.ingredients, ingredients, recipes);
          const members = recipe.group ? users.filter(u => u.group === recipe.group) : [];
          const course = members.length > 0 ? (members.find(m => m.course)?.course || members[0].course) : null;
          const memberNames = members.map(m => m.name).join(', ');

          return (
          <div key={recipe.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-stone-200 overflow-hidden flex flex-col group relative h-[150px]">
            {isAdmin && !viewAsStudent && (
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedIds.has(recipe.id)}
                  onChange={() => toggleSelection(recipe.id)}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
                />
              </div>
            )}
            <div className="p-3 flex flex-col h-full gap-2">
              <div className="flex justify-between items-start gap-2 relative">
                <div className={`flex-1 pr-6 ${isAdmin && !viewAsStudent ? 'pl-5' : ''}`}>
                  <h3 className="text-[13px] font-bold text-stone-900 leading-tight line-clamp-2" title={recipe.nameES}>{recipe.nameES}</h3>
                  {recipeAllergens.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {recipeAllergens.map(a => {
                        const allergen = ALLERGENS.find(al => al.id === a);
                        return allergen ? (
                          <span key={a} title={allergen.name} className="text-[11px] leading-none">{allergen.icon}</span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                
                <div className="flex bg-white/90 backdrop-blur-sm rounded-lg p-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity absolute right-0 top-0 border border-stone-100 shadow-sm z-10 gap-0.5 lg:-mr-1 lg:-mt-1">
                  {isAdmin && !viewAsStudent && recipe.group && (
                    <button 
                      onClick={() => openEvaluation(recipe)} 
                      className={`p-1 rounded-md transition-colors text-[9px] uppercase font-bold tracking-wider ${recipe.score !== undefined && recipe.score !== null ? 'bg-amber-100 text-amber-800' : 'text-stone-400 hover:text-amber-600 hover:bg-amber-50'}`}
                      title="Evaluar"
                    >
                      {recipe.score !== undefined && recipe.score !== null ? `Nota: ${recipe.score}` : 'Eval'}
                    </button>
                  )}
                  <button 
                    onClick={() => exportPDF(recipe)} 
                    disabled={isPrinting}
                    className="p-1 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors disabled:opacity-50" 
                    title="Imprimir"
                  >
                    <Printer size={12} />
                  </button>
                  {canEditAnyPartOfRecipe(recipe) && (
                    <button onClick={() => openEdit(recipe)} className="p-1 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors" title="Editar">
                      <Edit2 size={12} />
                    </button>
                  )}
                  {(isSuperAdmin || (actualAppUser && (actualAppUser.role === 'admin' || actualAppUser.role === 'docente') && recipe.group === appUser?.group)) && (
                    <button onClick={() => handleDelete(recipe.id)} className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Eliminar">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-end text-[11px] min-h-0 overflow-hidden">
                <div className="flex items-center justify-between text-stone-500 bg-stone-50 py-1 px-1.5 rounded-md mb-1 shrink-0">
                  <div className="flex items-center gap-1 font-medium">
                    <BookOpen size={12} className="text-teal-600" />
                    <span>{recipe.ingredients.length}</span>
                  </div>
                  <div className="font-bold text-teal-700">
                    {recipe.totalCost.toFixed(2)} €
                  </div>
                </div>
                
                {recipe.ingredients.some(ri => recipes.find(r => r.id === ri.ingredientId)) && (
                  <div className="overflow-y-auto min-h-0 flex-1 pr-1 custom-scrollbar">
                    <div className="flex flex-wrap gap-1">
                      {recipe.ingredients.map(ri => {
                        const elaborado = recipes.find(r => r.id === ri.ingredientId);
                        if (!elaborado) return null;
                        return (
                          <button
                            key={ri.ingredientId}
                            onClick={() => openEdit(elaborado)}
                            className="text-[9px] bg-teal-50 text-teal-700 px-1 py-0.5 rounded hover:bg-teal-100 transition-colors truncate max-w-[80px]"
                            title={elaborado.nameES}
                          >
                            {elaborado.nameES}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="border-t border-stone-100 pt-1.5 flex items-center justify-between shrink-0">
                <div className="text-[9px] text-stone-400 font-semibold uppercase tracking-wider">
                  {recipe.group ? 'Grupo' : 'Creador'}
                </div>
                <div className="flex flex-col items-end">
                  <span 
                    title={memberNames ? `Miembros: ${memberNames}` : undefined}
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-default ${getGroupColor(recipe.createdBy)}`}
                  >
                    {recipe.group ? `${course ? `${course} - ` : ''}Grupo ${recipe.group}` : recipe.createdBy}
                  </span>
                </div>
              </div>
            </div>
          </div>
          );
        })}
        {paginatedRecipes.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-500">
            No se encontraron recetas.
          </div>
        )}
      </div>

      {/* Controles de paginación */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <div className="text-sm text-stone-500">
            Mostrando <span className="font-medium">{startIndex + 1}</span> a <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredRecipes.length)}</span> de <span className="font-medium">{filteredRecipes.length}</span> recetas
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5) {
                  if (currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                  }
                  if (currentPage > totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  }
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-teal-600 text-white border border-teal-600'
                        : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-stone-900">
                {editingId ? 'Editar Receta' : 'Nueva Receta'}
              </h2>
              <div className="text-lg font-bold text-teal-700">
                Total: {calculateRecipeTotalCost(formData.ingredients, ingredients, recipes).toFixed(2)} €
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="recipe-form" onSubmit={handleSubmit} className="space-y-6">
                {editingId && recipes.find(r => r.id === editingId)?.group !== appUser?.group && !isAdmin && commissionMode && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-xl text-sm mb-4">
                    Estás editando una receta de otro grupo como miembro de la comisión de <strong>{appUser?.commission}</strong>. Solo puedes modificar los campos permitidos.
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Nombre *</label>
                    <input
                      type="text" required
                      value={formData.nameES}
                      disabled={editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'escandallo') : false}
                      onChange={e => setFormData({...formData, nameES: e.target.value})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder={`Ej: ${formData.type === 'elaborado' ? 'Sofrito tradicional' : 'Paella Valenciana'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Tipo *</label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value as 'plato' | 'elaborado'})}
                      disabled={editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'escandallo') : false}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="plato">Plato</option>
                      <option value="elaborado">Elaborado</option>
                    </select>
                  </div>
                  {formData.type === 'elaborado' ? (
                    <>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-stone-700 mb-1">Cantidad resultante</label>
                          <input
                            type="number" min="0" step="0.001" required
                            value={formData.yieldQuantity ?? ''}
                            disabled={editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'escandallo') : false}
                            onChange={e => setFormData({...formData, yieldQuantity: e.target.value})}
                            onFocus={e => e.target.select()}
                            className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="Ej: 1.5"
                          />
                        </div>
                        <div className="w-24">
                          <label className="block text-sm font-medium text-stone-700 mb-1">Unidad</label>
                          <select
                            value={formData.yieldUnit}
                            disabled={editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'escandallo') : false}
                            onChange={e => setFormData({...formData, yieldUnit: e.target.value as 'kg' | 'L' | 'ud'})}
                            className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="kg">kg</option>
                            <option value="L">L</option>
                            <option value="ud">ud</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-stone-700 mb-1">Raciones</label>
                          <input
                            type="number" min="1" step="1"
                            value={formData.portions ?? ''}
                            disabled={editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'escandallo') : false}
                            onChange={e => setFormData({...formData, portions: e.target.value})}
                            onFocus={e => e.target.select()}
                            className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="Ej: 10"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-stone-700 mb-1">Peso por ración</label>
                          <div className="w-full px-4 py-2 bg-stone-100 border border-stone-200 rounded-xl text-stone-600 font-medium h-[42px] flex items-center">
                            {formData.yieldQuantity && formData.portions 
                              ? `${(Number(formData.yieldQuantity) / Number(formData.portions)).toFixed(3)} ${formData.yieldUnit}`
                              : '-'}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Raciones</label>
                      <input
                        type="number"
                        value={1}
                        disabled
                        className="w-full px-4 py-2 bg-stone-100/50 text-stone-500 border border-stone-200 rounded-xl cursor-not-allowed"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Imagen de la Receta (opcional)</label>
                  <div className="flex items-center gap-4">
                    {formData.imageUrl && (
                      <img src={formData.imageUrl} alt="Vista previa" className="w-16 h-16 object-cover rounded-lg border border-stone-200" />
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage || (editingId ? !isOwner(recipes.find(r => r.id === editingId)!) : false)}
                        className="w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 disabled:opacity-50"
                      />
                      {uploadingImage && <p className="text-xs text-teal-600 mt-1">Subiendo imagen...</p>}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-stone-900">Ingredientes (Escandallo)</label>
                    <div className="flex items-center gap-4 mr-2">
                      <button
                        type="button"
                        disabled={editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'escandallo') : false}
                        onClick={() => setIsIngredientModalOpen(true)}
                        className="text-sm text-stone-500 hover:text-teal-600 font-medium flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Plus size={16} /> Nuevo ingrediente
                      </button>
                      <button
                        type="button"
                        disabled={editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'escandallo') : false}
                        onClick={() => setIsElaboradoModalOpen(true)}
                        className="text-sm text-stone-500 hover:text-indigo-600 font-medium flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Plus size={16} /> Nuevo elaborado
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.ingredients.map((ri, index) => {
                      const selectedIng = ingredients.find(i => i.id === ri.ingredientId);
                      const subRecipe = recipes.find(r => r.id === ri.ingredientId);
                      let cost = 0;
                      if (selectedIng) {
                        cost = selectedIng.costPerUnit * (Number(ri.quantity) || 0);
                      } else if (subRecipe) {
                        if (ri.usePortions && subRecipe.portions) {
                          const costPerServing = subRecipe.totalCost / subRecipe.portions;
                          cost = costPerServing * (Number(ri.quantity) || 0);
                        } else {
                          const unitCost = subRecipe.totalCost / (subRecipe.yieldQuantity || 1);
                          cost = unitCost * (Number(ri.quantity) || 0);
                        }
                      }
                      
                      return (
                        <div key={index} className="flex gap-3 items-center bg-stone-50 p-3 rounded-xl border border-stone-200">
                          <div className="flex-1 min-w-0 flex gap-2">
                            <IngredientSelect
                              value={ri.ingredientId}
                              onChange={id => updateRecipeIngredient(index, 'ingredientId', id)}
                              ingredients={ingredients}
                              recipes={recipes}
                              disabled={editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'escandallo') : false}
                              itemType={ri.itemType}
                              currentRecipeId={editingId}
                            />
                            {selectedIng && (
                              <button
                                type="button"
                                onClick={() => {
                                  // We need to trigger the edit ingredient modal.
                                  // Let's add an editingIngredientId state.
                                  setEditingIngredientId(selectedIng.id);
                                  setIsIngredientModalOpen(true);
                                }}
                                className="p-2 text-stone-500 hover:text-teal-600 bg-white border border-stone-200 rounded-lg flex-shrink-0"
                                title="Editar ingrediente"
                              >
                                <Edit2 size={16} />
                              </button>
                            )}
                            {subRecipe && (
                              <a
                                href={`/elaborados?edit=${ri.ingredientId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-stone-500 hover:text-indigo-600 bg-white border border-stone-200 rounded-lg flex items-center justify-center flex-shrink-0"
                                title="Editar elaborado en nueva pestaña"
                              >
                                <Edit2 size={16} />
                              </a>
                            )}
                          </div>
                          <div className="w-56 shrink-0 pt-4 relative">
                            <div className="flex gap-2 relative">
                              <div className="relative flex-1">
                                <div className="absolute -top-4 left-1 text-[10px] text-stone-500 font-medium">Bruto</div>
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  required
                                  value={ri.quantity}
                                  disabled={editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'escandallo') : false}
                                  onChange={e => updateRecipeIngredient(index, 'quantity', e.target.value)}
                                  onFocus={e => e.target.select()}
                                  className="w-full pl-2 pr-1 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                  placeholder="Bruto"
                                  title={`Peso bruto ${selectedIng?.wastePercentage ? `(Merma: ${selectedIng.wastePercentage}%)` : ''}`}
                                />
                              </div>
                              <div className="relative flex-1">
                                <div className="absolute -top-4 left-1 text-[10px] text-stone-500 font-medium">Neto</div>
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  required
                                  value={(ri.quantity as any) !== '' && ri.quantity !== undefined && !isNaN(Number(ri.quantity)) ? Number((Number(ri.quantity) * (1 - ((selectedIng?.wastePercentage || 0) / 100))).toFixed(4)).toString() : ''}
                                  disabled={editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'escandallo') : false}
                                  onChange={e => {
                                    const netValue = e.target.value;
                                    if (netValue === '') {
                                      updateRecipeIngredient(index, 'quantity', '');
                                      return;
                                    }
                                    const net = Number(netValue);
                                    const waste = selectedIng?.wastePercentage || 0;
                                    const gross = waste === 100 ? 0 : net / (1 - waste / 100);
                                    updateRecipeIngredient(index, 'quantity', Number(gross.toFixed(4)).toString());
                                  }}
                                  onFocus={e => e.target.select()}
                                  className="w-full pl-2 pr-7 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                  placeholder="Neto"
                                  title="Peso neto (listo para usar)"
                                />
                                <button
                                  type="button"
                                  disabled={(!subRecipe || !subRecipe.portions) || (editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'escandallo') : false)}
                                  onClick={() => updateRecipeIngredient(index, 'usePortions', !ri.usePortions)}
                                  title={ri.usePortions ? "Cambiar a unidad base" : (subRecipe?.portions ? "Cambiar a raciones" : "No hay raciones definidas")}
                                  className={`absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold px-1 py-0.5 rounded transition-colors ${
                                    ri.usePortions 
                                      ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' 
                                      : 'bg-stone-100 text-stone-500 hover:bg-stone-200 disabled:opacity-50'
                                  }`}
                                >
                                  {ri.usePortions ? 'ud' : (selectedIng?.unit || (subRecipe?.yieldUnit || 'ud'))}
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="w-24 text-right font-medium text-stone-700">
                            {cost.toFixed(2)} €
                          </div>
                          <button
                            type="button"
                            disabled={editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'escandallo') : false}
                            onClick={() => removeRecipeIngredient(index)}
                            className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      );
                    })}
                    {formData.ingredients.length === 0 && (
                      <div className="text-center py-6 text-stone-500 text-sm border-2 border-dashed border-stone-200 rounded-xl">
                        No hay ingredientes añadidos.
                      </div>
                    )}
                    <div className="flex gap-4 mt-4">
                      <button
                        type="button"
                        disabled={editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'escandallo') : false}
                        onClick={addIngredientToRecipe}
                        className="flex-1 py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:text-teal-600 hover:border-teal-300 hover:bg-teal-50 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Plus size={18} /> Añadir ingrediente
                      </button>
                      <button
                        type="button"
                        disabled={editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'escandallo') : false}
                        onClick={addElaboradoToRecipe}
                        className="flex-1 py-3 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Plus size={18} /> Añadir elaborado
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-stone-900">Pasos de Elaboración</label>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.steps.map((step, index) => (
                      <div key={index} className="flex gap-3 items-start bg-stone-50 p-3 rounded-xl border border-stone-200">
                        <div className="pt-2 font-bold text-stone-400 w-6 text-center">{index + 1}.</div>
                        <textarea
                          required
                          rows={2}
                          value={step}
                          disabled={editingId ? !isOwner(recipes.find(r => r.id === editingId)!) : false}
                          onChange={e => updateStep(index, e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Describe este paso de la elaboración..."
                        />
                        <button
                          type="button"
                          disabled={editingId ? !isOwner(recipes.find(r => r.id === editingId)!) : false}
                          onClick={() => removeStep(index)}
                          className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    {formData.steps.length === 0 && (
                      <div className="text-center py-6 text-stone-500 text-sm border-2 border-dashed border-stone-200 rounded-xl">
                        No hay pasos añadidos.
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={editingId ? !isOwner(recipes.find(r => r.id === editingId)!) : false}
                      onClick={addStep}
                      className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:text-teal-600 hover:border-teal-300 hover:bg-teal-50 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus size={18} /> Añadir paso
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-stone-900">Material y Equipamiento</label>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.equipment.map((eq, index) => (
                      <div key={index} className="flex gap-3 items-start bg-stone-50 p-3 rounded-xl border border-stone-200">
                        <div className="pt-2 font-bold text-stone-400 w-6 text-center">•</div>
                        <input
                          type="text"
                          required
                          value={eq}
                          disabled={editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'logistica') : false}
                          data-equipment-input={index}
                          onChange={e => updateEquipment(index, e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addEquipment();
                              setTimeout(() => {
                                const nextInput = document.querySelector(`[data-equipment-input="${index + 1}"]`) as HTMLInputElement;
                                if (nextInput) nextInput.focus();
                              }, 0);
                            }
                          }}
                          className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Ej: 1 sartén, 1 batidora..."
                        />
                        <button
                          type="button"
                          disabled={editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'logistica') : false}
                          onClick={() => removeEquipment(index)}
                          className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    {formData.equipment.length === 0 && (
                      <div className="text-center py-6 text-stone-500 text-sm border-2 border-dashed border-stone-200 rounded-xl">
                        No hay material añadido.
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'logistica') : false}
                      onClick={addEquipment}
                      className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:text-teal-600 hover:border-teal-300 hover:bg-teal-50 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus size={18} /> Añadir material
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-900 mb-1">Mise en place</label>
                  <textarea
                    rows={3}
                    value={formData.miseEnPlace}
                    disabled={editingId ? !isOwner(recipes.find(r => r.id === editingId)!) : false}
                    onChange={e => setFormData({ ...formData, miseEnPlace: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Describe la mise en place necesaria..."
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-stone-900">Tips de Sostenibilidad</label>
                    <button
                      type="button"
                      disabled={editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'sostenibilidad') : false}
                      onClick={addTip}
                      className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus size={16} /> Añadir tip
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.sustainabilityTips.map((tip, index) => (
                      <div key={index} className="flex gap-3 items-start bg-stone-50 p-3 rounded-xl border border-stone-200">
                        <div className="pt-2 font-bold text-stone-400 w-6 text-center">🌱</div>
                        <textarea
                          required
                          rows={2}
                          value={tip}
                          disabled={editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'sostenibilidad') : false}
                          onChange={e => updateTip(index, e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Ej: Encender los hornos solo 5 minutos antes..."
                        />
                        <button
                          type="button"
                          disabled={editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'sostenibilidad') : false}
                          onClick={() => removeTip(index)}
                          className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    {formData.sustainabilityTips.length === 0 && (
                      <div className="text-center py-6 text-stone-500 text-sm border-2 border-dashed border-stone-200 rounded-xl">
                        No hay tips de sostenibilidad añadidos.
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-stone-100 flex justify-end gap-3 bg-stone-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-stone-600 hover:bg-stone-200 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="recipe-form"
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors"
              >
                Guardar Receta
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateIngredientModal
        isOpen={isIngredientModalOpen}
        onClose={() => {
          setIsIngredientModalOpen(false);
          setEditingIngredientId(null);
        }}
        editingId={editingIngredientId}
        initialData={editingIngredientId ? ingredients.find(i => i.id === editingIngredientId) : undefined}
        onSuccess={(newId) => {
          if (!editingIngredientId) {
            setFormData(prev => ({
              ...prev,
              ingredients: [...prev.ingredients, { ingredientId: newId, quantity: 0 }]
            }));
          }
        }}
      />

      <CreateElaboradoModal
        isOpen={isElaboradoModalOpen}
        onClose={() => setIsElaboradoModalOpen(false)}
        onSuccess={(newId) => {
          setFormData(prev => ({
            ...prev,
            ingredients: [...prev.ingredients, { ingredientId: newId, quantity: 0 }]
          }));
        }}
      />

      {/* Hidden Print Layout */}
      {printingRecipe && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={printRef} className="print-container px-10 py-10 bg-white text-stone-900 font-serif w-[794px] mx-auto flex flex-col relative overflow-hidden">
            <style>{`
              .print-container { background-color: #ffffff !important; color: #1c1917 !important; min-height: 1122px; }
              .print-container .text-stone-900 { color: #1c1917 !important; }
              .print-container .text-stone-800 { color: #292524 !important; }
              .print-container .text-stone-700 { color: #44403c !important; }
              .print-container .text-stone-600 { color: #57534e !important; }
              .print-container .text-stone-500 { color: #78716c !important; }
              .print-container .text-stone-400 { color: #a8a29e !important; }
              .print-container .text-teal-900 { color: #134e4a !important; }
              .print-container .text-teal-800 { color: #115e59 !important; }
              .print-container .text-teal-700 { color: #0f766e !important; }
              .print-container .bg-white { background-color: #ffffff !important; }
              .print-container .bg-stone-100 { background-color: #f5f5f4 !important; }
              .print-container .bg-teal-50 { background-color: #f0fdfa !important; }
              .print-container .bg-teal-50\\/50 { background-color: rgba(240, 253, 250, 0.5) !important; }
              .print-container .border-stone-200 { border-color: #e7e5e4 !important; }
              .print-container .border-stone-100 { border-color: #f5f5f4 !important; }
              .print-container .border-stone-50 { border-color: #fafaf9 !important; }
              .print-container .border-teal-100 { border-color: #ccfbf1 !important; }
              .print-container .divide-stone-50 > :not([hidden]) ~ :not([hidden]) { border-color: #fafaf9 !important; }
            `}</style>
            <div className="z-10 w-full">
              <div className="border-b border-stone-200 pb-4 mb-6">
                {settings?.logoUrl && (
                  <img src={settings.logoUrl} alt="Logo" className="h-10 object-contain mb-4" crossOrigin="anonymous" />
                )}
                <div className="text-stone-400 text-[9px] tracking-[0.4em] uppercase mb-2 font-sans font-medium">Ficha Técnica de Producción</div>
                <h1 className="text-3xl font-display font-medium text-stone-800 tracking-tight mb-2">{printingRecipe.nameES}</h1>
                {printingRecipe.nameEN && <h2 className="text-lg text-stone-500 italic mb-2">{printingRecipe.nameEN}</h2>}
                
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-stone-500 text-[10px] font-sans mt-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-400 uppercase tracking-widest">Coste:</span>
                    <span className="text-teal-700 font-bold text-xs">{printingRecipe.totalCost.toFixed(2)} €</span>
                  </div>
                  {printingRecipe.portions && (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-400 uppercase tracking-widest">Raciones:</span>
                      <span className="text-stone-700 font-bold">{printingRecipe.portions}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-400 uppercase tracking-widest">Autor:</span>
                    <span className="text-stone-700">{printingRecipe.createdBy}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                <div>
                  <h3 className="text-xs font-bold mb-3 uppercase tracking-[0.2em] text-stone-800 border-b border-stone-100 pb-1 font-sans">Escandallo Detallado</h3>
                  <table className="w-full text-[10px] text-left mb-2 font-sans">
                    <thead>
                      <tr className="text-stone-400 uppercase tracking-wider border-b border-stone-100">
                        <th className="py-1 font-medium">Ingrediente</th>
                        <th className="py-1 font-medium text-right">Cantidad</th>
                        <th className="py-1 font-medium text-right">Coste/Ud</th>
                        <th className="py-1 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {printingRecipe.ingredients.map((ri, idx) => {
                        const ing = ingredients.find(i => i.id === ri.ingredientId);
                        const subRecipe = recipes.find(r => r.id === ri.ingredientId);
                        const name = ing ? ing.nameES : (subRecipe ? subRecipe.nameES : 'Desconocido');
                        const unit = ri.usePortions ? 'ud' : (ing ? ing.unit : (subRecipe ? subRecipe.yieldUnit || 'ud' : 'ud'));
                        
                        let realCostPerUnit = 0;
                        if (ing) {
                          realCostPerUnit = ing.costPerUnit;
                        } else if (subRecipe) {
                          if (ri.usePortions && subRecipe.portions) {
                            realCostPerUnit = subRecipe.totalCost / subRecipe.portions;
                          } else {
                            realCostPerUnit = subRecipe.totalCost / (subRecipe.yieldQuantity || 1);
                          }
                        }
                        
                        const itemTotalCost = realCostPerUnit * ri.quantity;

                        return (
                          <tr key={idx}>
                            <td className="py-1.5 font-medium text-stone-800">{name}</td>
                            <td className="py-1.5 text-right text-stone-600">{ri.quantity} {unit}</td>
                            <td className="py-1.5 text-right text-stone-500">{realCostPerUnit.toFixed(2)} €</td>
                            <td className="py-1.5 text-right font-bold text-stone-800">{itemTotalCost.toFixed(2)} €</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-stone-100 font-bold text-stone-900">
                        <td colSpan={3} className="py-2 text-right uppercase tracking-widest text-[9px] text-stone-400">Coste Total</td>
                        <td className="py-2 text-right text-teal-700 text-base">{printingRecipe.totalCost.toFixed(2)} €</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xs font-bold mb-3 uppercase tracking-[0.2em] text-stone-800 border-b border-stone-100 pb-1 font-sans">Elaboración</h3>
                    {printingRecipe.steps && printingRecipe.steps.length > 0 ? (
                      <ol className="space-y-2 list-decimal pl-4 text-[10px] text-stone-700 font-sans">
                        {printingRecipe.steps.map((step, idx) => (
                          <li key={idx} className="leading-relaxed pl-1">{step}</li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-[10px] text-stone-400 italic font-sans">No hay pasos definidos.</p>
                    )}
                  </div>

                  <div className="space-y-6">
                    {printingRecipe.equipment && printingRecipe.equipment.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold mb-3 uppercase tracking-[0.2em] text-stone-800 border-b border-stone-100 pb-1 font-sans">Material</h3>
                        <ul className="space-y-1.5 list-disc pl-4 text-[10px] text-stone-700 font-sans">
                          {printingRecipe.equipment.map((eq, idx) => (
                            <li key={idx} className="leading-relaxed pl-1">{eq}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {printingRecipe.sustainabilityTips && printingRecipe.sustainabilityTips.length > 0 && (
                      <div className="bg-teal-50/50 p-3 rounded-xl border border-teal-100">
                        <h3 className="text-[9px] font-bold mb-2 uppercase tracking-[0.2em] text-teal-800 font-sans flex items-center gap-2">
                          <span>🌱</span> Sostenibilidad
                        </h3>
                        <ul className="space-y-1.5 text-[9px] text-teal-900 font-sans">
                          {printingRecipe.sustainabilityTips.map((tip, idx) => (
                            <li key={idx} className="leading-relaxed">• {tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-8 text-center">
                <p className="text-[8px] text-stone-400 uppercase tracking-[0.3em] font-sans">
                  Ficha Técnica · Proyecto Intermodular Gastronómico
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
      {/* Modal Evaluation */}
      {evaluateModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-stone-100 overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-stone-900 mb-4 tracking-tight">Evaluar Receta</h2>
              <p className="text-stone-500 text-sm mb-6">Asigna una puntuación y da una retroalimentación a los alumnos sobre su receta o elaborado.</p>
              
              <form onSubmit={handleSubmitEvaluation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Nota (0-10)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    required
                    value={evaluateModal.score}
                    onChange={(e) => setEvaluateModal({ ...evaluateModal, score: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Feedback / Observaciones</label>
                  <textarea
                    rows={4}
                    value={evaluateModal.feedback}
                    onChange={(e) => setEvaluateModal({ ...evaluateModal, feedback: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors resize-none"
                    placeholder="Escribe tus comentarios para el grupo..."
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setEvaluateModal({ isOpen: false, recipeId: null, score: 0, feedback: '' })}
                    className="px-4 py-2 text-stone-600 hover:bg-stone-50 rounded-xl transition-colors font-medium text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors font-medium text-sm shadow-sm opacity-90"
                  >
                    Guardar Evaluación
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}