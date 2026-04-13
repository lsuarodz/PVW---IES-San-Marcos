import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, Edit2, Search, BookOpen, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { ALLERGENS } from '../constants/allergens';
import { getGroupColor } from '../utils/groupColors';
import CreateIngredientModal from '../components/CreateIngredientModal';
import ConfirmModal from '../components/ConfirmModal';
import html2pdf from 'html2pdf.js';
import { calculateRecipeTotalCost, getRecipeAllergens } from '../utils/calculations';
import { Recipe, RecipeIngredient, Ingredient } from '../types';

export default function Recipes({ type = 'plato' }: { type?: 'elaborado' | 'plato' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  // Obtenemos el usuario actual para verificar sus permisos
  const { appUser } = useAuth();
  // Verificamos si el usuario tiene rol de administrador o docente
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'docente';
  // Verificamos si el usuario es el administrador principal
  const isSuperAdmin = appUser?.role === 'admin';
  const { showToast } = useToast();
  
  // Estados para almacenar los datos de la base de datos
  const { recipes, ingredients, menus } = useData();
  
  // Filtrar recetas por tipo (las que no tienen tipo se consideran 'plato')
  const filteredByType = recipes.filter(r => type === 'plato' ? (!r.type || r.type === 'plato') : r.type === 'elaborado');
  
  // Estado para el buscador y paginación
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
  // Estados para controlar la visibilidad de los modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
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
  
  // Referencias y estados para la funcionalidad de impresión a PDF
  const printRef = useRef<HTMLDivElement>(null);
  const [printingRecipe, setPrintingRecipe] = useState<Recipe | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Estado para almacenar los datos del formulario del escandallo
  const [formData, setFormData] = useState({
    nameES: '',
    portions: null as number | null,
    yieldQuantity: null as number | null,
    yieldUnit: 'kg' as 'kg' | 'L' | 'ud',
    steps: [] as string[],
    equipment: [] as string[],
    miseEnPlace: '',
    sustainabilityTips: [] as string[],
    ingredients: [] as RecipeIngredient[],
    imageUrl: '',
  });

  const [uploadingImage, setUploadingImage] = useState(false);

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

    const recipeData = {
      ...formData,
      type,
      portions: formData.portions || null,
      yieldQuantity: formData.yieldQuantity || null,
      yieldUnit: formData.yieldUnit || 'kg',
      ingredients: formData.ingredients.map(ri => ({ ...ri, quantity: Number(ri.quantity) || 0 })),
      nameEN: editingId ? recipes.find(r => r.id === editingId)?.nameEN || '' : '',
      descriptionES: editingId ? recipes.find(r => r.id === editingId)?.descriptionES || '' : '',
      descriptionEN: editingId ? recipes.find(r => r.id === editingId)?.descriptionEN || '' : '',
      stepsEN: editingId ? recipes.find(r => r.id === editingId)?.stepsEN || [] : [],
      totalCost,
      createdBy: appUser.group || appUser.name,
      createdAt: editingId ? recipes.find(r => r.id === editingId)?.createdAt : new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'recipes', id), recipeData);
      setIsModalOpen(false);
      resetForm();
      showToast('Receta guardada correctamente', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `recipes/${id}`);
    }
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

  const openEdit = (recipe: Recipe) => {
    setFormData({
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
    setFormData({ nameES: '', portions: null, yieldQuantity: null, yieldUnit: 'kg', steps: [], equipment: [], miseEnPlace: '', sustainabilityTips: [], ingredients: [], imageUrl: '' });
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
      ingredients: [...formData.ingredients, { ingredientId: '', quantity: 0 }]
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

  const exportPDF = (recipe: Recipe) => {
    if (isPrinting) return;
    setIsPrinting(true);
    setPrintingRecipe(recipe);
    
    setTimeout(() => {
      if (printRef.current) {
        const opt = {
          margin: 0,
          filename: `Receta_${recipe.nameES.replace(/\s+/g, '_')}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'px', format: [794, 1122] as [number, number], orientation: 'portrait' as const }
        };
        
        html2pdf()
          .set(opt)
          .from(printRef.current)
          .save()
          .then(() => {
            setPrintingRecipe(null);
            setIsPrinting(false);
          })
          .catch((err: any) => {
            console.error('Error generating PDF:', err);
            setPrintingRecipe(null);
            setIsPrinting(false);
            showToast('Error al generar el PDF. Por favor, inténtalo de nuevo.', 'error');
          });
      } else {
        setIsPrinting(false);
      }
    }, 500);
  };

  const filteredRecipes = filteredByType.filter(r => 
    r.nameES.toLowerCase().includes(search.toLowerCase()) || 
    r.nameEN?.toLowerCase().includes(search.toLowerCase())
  );

  // Calcular paginación
  const totalPages = Math.ceil(filteredRecipes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecipes = filteredRecipes.slice(startIndex, startIndex + itemsPerPage);

  // Resetear a la página 1 cuando se busca
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, type]);

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
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          {type === 'elaborado' ? 'Nuevo Elaborado' : 'Nuevo Plato'}
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
          <input
            type="text"
            placeholder={`Buscar ${type === 'elaborado' ? 'elaborados' : 'platos'}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedRecipes.map((recipe) => {
          const recipeAllergens = getRecipeAllergens(recipe.ingredients, ingredients, recipes);
          return (
          <div key={recipe.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
            {recipe.imageUrl && (
              <div className="w-full h-48 bg-stone-100 overflow-hidden">
                <img 
                  src={recipe.imageUrl} 
                  alt={recipe.nameES} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                {!recipe.imageUrl && (
                  <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
                    <BookOpen size={24} />
                  </div>
                )}
                <div className={`flex gap-1 ${recipe.imageUrl ? 'w-full justify-end' : ''}`}>
                  <button 
                    onClick={() => exportPDF(recipe)} 
                    disabled={isPrinting}
                    className="p-2 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-50" 
                    title="Imprimir"
                  >
                    <Printer size={18} />
                  </button>
                  <button onClick={() => openEdit(recipe)} className="p-2 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors" title="Editar">
                    <Edit2 size={18} />
                  </button>
                  {isSuperAdmin && (
                    <button onClick={() => handleDelete(recipe.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-4">{recipe.nameES}</h3>
              
              {recipeAllergens.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {recipeAllergens.map(a => {
                    const allergen = ALLERGENS.find(al => al.id === a);
                    return allergen ? (
                      <span key={a} title={allergen.name} className="text-lg">{allergen.icon}</span>
                    ) : null;
                  })}
                </div>
              )}

              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Ingredientes:</span>
                  <span className="font-medium text-stone-900">{recipe.ingredients.length}</span>
                </div>
                {recipe.ingredients.some(ri => recipes.find(r => r.id === ri.ingredientId)) && (
                  <div className="pt-2 border-t border-stone-100">
                    <span className="text-xs text-stone-500 block mb-1">Elaborados:</span>
                    <div className="flex flex-wrap gap-1">
                      {recipe.ingredients.map(ri => {
                        const elaborado = recipes.find(r => r.id === ri.ingredientId);
                        if (!elaborado) return null;
                        return (
                          <button
                            key={ri.ingredientId}
                            onClick={() => openEdit(elaborado)}
                            className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded-md hover:bg-teal-100 transition-colors text-left"
                          >
                            {elaborado.nameES}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t border-stone-100">
                  <span className="text-stone-500">Coste Total:</span>
                  <span className="font-bold text-teal-700">{recipe.totalCost.toFixed(2)} €</span>
                </div>
              </div>
              
              <div className="text-xs text-stone-400 border-t border-stone-100 pt-4 flex items-center justify-between">
                <span>Creado por</span>
                <span className={`font-bold px-2 py-1 rounded-full ${getGroupColor(recipe.createdBy)}`}>
                  {recipe.createdBy}
                </span>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Nombre *</label>
                    <input
                      type="text" required
                      value={formData.nameES}
                      onChange={e => setFormData({...formData, nameES: e.target.value})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  {type === 'elaborado' ? (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-stone-700 mb-1">Cantidad resultante</label>
                        <input
                          type="number" min="0" step="0.01" required
                          value={formData.yieldQuantity || ''}
                          onChange={e => setFormData({...formData, yieldQuantity: parseFloat(e.target.value) || null})}
                          onFocus={e => e.target.select()}
                          className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="Ej: 1.5"
                        />
                      </div>
                      <div className="w-24">
                        <label className="block text-sm font-medium text-stone-700 mb-1">Unidad</label>
                        <select
                          value={formData.yieldUnit}
                          onChange={e => setFormData({...formData, yieldUnit: e.target.value as 'kg' | 'L' | 'ud'})}
                          className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="kg">kg</option>
                          <option value="L">L</option>
                          <option value="ud">ud</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Raciones (para cuántas personas)</label>
                      <input
                        type="number" min="1" step="1"
                        value={formData.portions || ''}
                        onChange={e => setFormData({...formData, portions: parseInt(e.target.value) || null})}
                        onFocus={e => e.target.select()}
                        className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="Opcional"
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
                        disabled={uploadingImage}
                        className="w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 disabled:opacity-50"
                      />
                      {uploadingImage && <p className="text-xs text-teal-600 mt-1">Subiendo imagen...</p>}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-stone-900">Ingredientes (Escandallo)</label>
                    <button
                      type="button"
                      onClick={() => setIsIngredientModalOpen(true)}
                      className="text-sm text-stone-500 hover:text-teal-600 font-medium flex items-center gap-1 mr-4"
                    >
                      <Plus size={16} /> Crear nuevo ingrediente
                    </button>
                    <button
                      type="button"
                      onClick={addIngredientToRecipe}
                      className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                    >
                      <Plus size={16} /> Añadir ingrediente
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.ingredients.map((ri, index) => {
                      const selectedIng = ingredients.find(i => i.id === ri.ingredientId);
                      const isRecipe = recipes.some(r => r.id === ri.ingredientId);
                      const cost = selectedIng ? (selectedIng.costPerUnit * (Number(ri.quantity) || 0)) : 0;
                      
                      return (
                        <div key={index} className="flex gap-3 items-center bg-stone-50 p-3 rounded-xl border border-stone-200">
                          <div className="flex-1 flex gap-2">
                            <select
                              required
                              value={ri.ingredientId}
                              onChange={e => updateRecipeIngredient(index, 'ingredientId', e.target.value)}
                              className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            >
                              <option value="">Selecciona un ingrediente o receta...</option>
                              <optgroup label="Ingredientes">
                                {ingredients.map(ing => (
                                  <option key={ing.id} value={ing.id}>
                                    {ing.nameES} ({ing.costPerUnit.toFixed(2)}€/{ing.unit})
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="Escandallos / Recetas">
                                {recipes.filter(r => r.id !== editingId).map(r => (
                                  <option key={r.id} value={r.id}>
                                    {r.nameES} ({r.totalCost.toFixed(2)}€/ud)
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                            {selectedIng && (
                              <button
                                type="button"
                                onClick={() => {
                                  // We need to trigger the edit ingredient modal.
                                  // We can use a custom event or pass a prop if we had a global state.
                                  // For now, since we have CreateIngredientModal, we can pass the ID to it.
                                  // Let's add an editingIngredientId state.
                                  setEditingIngredientId(selectedIng.id);
                                  setIsIngredientModalOpen(true);
                                }}
                                className="p-2 text-stone-500 hover:text-teal-600 bg-white border border-stone-200 rounded-lg"
                                title="Editar ingrediente"
                              >
                                <Edit2 size={16} />
                              </button>
                            )}
                          </div>
                          <div className="w-24 shrink-0">
                            <div className="relative">
                              <input
                                type="number"
                                step="0.001"
                                min="0"
                                required
                                value={ri.quantity}
                                onChange={e => updateRecipeIngredient(index, 'quantity', e.target.value)}
                                onFocus={e => e.target.select()}
                                className="w-full pl-2 pr-8 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                placeholder="Cant."
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 text-xs">
                                {selectedIng?.unit || (recipes.find(r => r.id === ri.ingredientId) ? 'ud' : '')}
                              </span>
                            </div>
                          </div>
                          <div className="w-24 text-right font-medium text-stone-700">
                            {cost.toFixed(2)} €
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRecipeIngredient(index)}
                            className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-stone-900">Pasos de Elaboración</label>
                    <button
                      type="button"
                      onClick={addStep}
                      className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                    >
                      <Plus size={16} /> Añadir paso
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.steps.map((step, index) => (
                      <div key={index} className="flex gap-3 items-start bg-stone-50 p-3 rounded-xl border border-stone-200">
                        <div className="pt-2 font-bold text-stone-400 w-6 text-center">{index + 1}.</div>
                        <textarea
                          required
                          rows={2}
                          value={step}
                          onChange={e => updateStep(index, e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="Describe este paso de la elaboración..."
                        />
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1"
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
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-stone-900">Material y Equipamiento</label>
                    <button
                      type="button"
                      onClick={addEquipment}
                      className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                    >
                      <Plus size={16} /> Añadir material
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.equipment.map((eq, index) => (
                      <div key={index} className="flex gap-3 items-start bg-stone-50 p-3 rounded-xl border border-stone-200">
                        <div className="pt-2 font-bold text-stone-400 w-6 text-center">•</div>
                        <input
                          type="text"
                          required
                          value={eq}
                          onChange={e => updateEquipment(index, e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="Ej: 1 sartén, 1 batidora..."
                        />
                        <button
                          type="button"
                          onClick={() => removeEquipment(index)}
                          className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1"
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
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-900 mb-1">Mise en place</label>
                  <textarea
                    rows={3}
                    value={formData.miseEnPlace}
                    onChange={e => setFormData({ ...formData, miseEnPlace: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Describe la mise en place necesaria..."
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-stone-900">Tips de Sostenibilidad</label>
                    <button
                      type="button"
                      onClick={addTip}
                      className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
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
                          onChange={e => updateTip(index, e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="Ej: Encender los hornos solo 5 minutos antes..."
                        />
                        <button
                          type="button"
                          onClick={() => removeTip(index)}
                          className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1"
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

      {/* Hidden Print Layout */}
      {printingRecipe && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={printRef} className="px-12 py-16 bg-white text-stone-900 font-serif w-[794px] min-h-[1122px] mx-auto flex flex-col relative overflow-hidden">
            <div className="z-10 w-full">
              <div className="border-b border-stone-200 pb-8 mb-10">
                <div className="text-stone-400 text-[10px] tracking-[0.4em] uppercase mb-4 font-sans font-medium">Ficha Técnica de Producción</div>
                <h1 className="text-4xl font-display font-medium text-stone-800 tracking-tight mb-3">{printingRecipe.nameES}</h1>
                {printingRecipe.nameEN && <h2 className="text-xl text-stone-500 italic mb-4">{printingRecipe.nameEN}</h2>}
                
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-stone-500 text-xs font-sans mt-6">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-400 uppercase tracking-widest">Coste:</span>
                    <span className="text-teal-700 font-bold text-sm">{printingRecipe.totalCost.toFixed(2)} €</span>
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

              {printingRecipe.imageUrl && (
                <div className="mb-10 w-full h-64 bg-stone-100 rounded-xl overflow-hidden border border-stone-200">
                  <img 
                    src={printingRecipe.imageUrl} 
                    alt={printingRecipe.nameES} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-12">
                <div>
                  <h3 className="text-sm font-bold mb-4 uppercase tracking-[0.2em] text-stone-800 border-b border-stone-100 pb-2 font-sans">Escandallo Detallado</h3>
                  <table className="w-full text-[11px] text-left mb-4 font-sans">
                    <thead>
                      <tr className="text-stone-400 uppercase tracking-wider border-b border-stone-100">
                        <th className="py-2 font-medium">Ingrediente</th>
                        <th className="py-2 font-medium text-right">Cantidad</th>
                        <th className="py-2 font-medium text-right">Coste/Ud</th>
                        <th className="py-2 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {printingRecipe.ingredients.map((ri, idx) => {
                        const ing = ingredients.find(i => i.id === ri.ingredientId);
                        const subRecipe = recipes.find(r => r.id === ri.ingredientId);
                        const name = ing ? ing.nameES : (subRecipe ? subRecipe.nameES : 'Desconocido');
                        const unit = ing ? ing.unit : 'ud';
                        
                        let realCostPerUnit = 0;
                        if (ing) {
                          realCostPerUnit = ing.costPerUnit;
                        } else if (subRecipe) {
                          realCostPerUnit = subRecipe.totalCost;
                        }
                        
                        const itemTotalCost = realCostPerUnit * ri.quantity;

                        return (
                          <tr key={idx}>
                            <td className="py-2 font-medium text-stone-800">{name}</td>
                            <td className="py-2 text-right text-stone-600">{ri.quantity} {unit}</td>
                            <td className="py-2 text-right text-stone-500">{realCostPerUnit.toFixed(2)} €</td>
                            <td className="py-2 text-right font-bold text-stone-800">{itemTotalCost.toFixed(2)} €</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-stone-100 font-bold text-stone-900">
                        <td colSpan={3} className="py-4 text-right uppercase tracking-widest text-[10px] text-stone-400">Coste Total de la Receta</td>
                        <td className="py-4 text-right text-teal-700 text-lg">{printingRecipe.totalCost.toFixed(2)} €</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-12">
                  <div>
                    <h3 className="text-sm font-bold mb-4 uppercase tracking-[0.2em] text-stone-800 border-b border-stone-100 pb-2 font-sans">Elaboración</h3>
                    {printingRecipe.steps && printingRecipe.steps.length > 0 ? (
                      <ol className="space-y-3 list-decimal pl-4 text-[11px] text-stone-700 font-sans">
                        {printingRecipe.steps.map((step, idx) => (
                          <li key={idx} className="leading-relaxed pl-2">{step}</li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-xs text-stone-400 italic font-sans">No hay pasos de elaboración definidos.</p>
                    )}
                  </div>

                  <div className="space-y-8">
                    {printingRecipe.equipment && printingRecipe.equipment.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold mb-4 uppercase tracking-[0.2em] text-stone-800 border-b border-stone-100 pb-2 font-sans">Material</h3>
                        <ul className="space-y-2 list-disc pl-4 text-[11px] text-stone-700 font-sans">
                          {printingRecipe.equipment.map((eq, idx) => (
                            <li key={idx} className="leading-relaxed pl-2">{eq}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {printingRecipe.sustainabilityTips && printingRecipe.sustainabilityTips.length > 0 && (
                      <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100">
                        <h3 className="text-[10px] font-bold mb-3 uppercase tracking-[0.2em] text-teal-800 font-sans flex items-center gap-2">
                          <span>🌱</span> Sostenibilidad
                        </h3>
                        <ul className="space-y-2 text-[10px] text-teal-900 font-sans">
                          {printingRecipe.sustainabilityTips.map((tip, idx) => (
                            <li key={idx} className="leading-relaxed">• {tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-12 text-center">
                <p className="text-[9px] text-stone-400 uppercase tracking-[0.3em] font-sans">
                  Ficha Técnica · Proyecto Intermodular Gastronómico
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
