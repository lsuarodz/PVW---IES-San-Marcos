import React, { useState } from 'react';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, Edit2, Search, AlertCircle, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';
import { ALLERGENS } from '../constants/allergens';
import ConfirmModal from '../components/ConfirmModal';
import { Ingredient } from '../types';

export default function Ingredients() {
  // Obtenemos el usuario actual y sus permisos desde el contexto de autenticación
  const { appUser } = useAuth();
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'docente';
  const isSuperAdmin = appUser?.role === 'admin';
  const { showToast } = useToast();
  
  // Estados para almacenar los datos de la base de datos
  const { ingredients, recipes, standardWastes } = useData();
  
  // Estado para el buscador y paginación
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Estados para controlar el modal de creación/edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);
  const [editingWasteId, setEditingWasteId] = useState<string | null>(null);
  const [wasteFormData, setWasteFormData] = useState({
    item: '',
    percentage: '' as string | number,
    notes: ''
  });

  const [activeTab, setActiveTab] = useState<'ingredients' | 'wastes'>('ingredients');

  // Estado para selección múltiple
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // Función para manejar la selección
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedIngredients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedIngredients.map(i => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const idsToDelete: string[] = Array.from(selectedIds);
    
    // Comprobar si alguno está en uso
    const usedIngredients = idsToDelete.filter(id => 
      recipes.some(recipe => recipe.ingredients?.some((ing: any) => ing.ingredientId === id))
    );

    if (usedIngredients.length > 0) {
      const usedNames = ingredients
        .filter(i => usedIngredients.includes(i.id))
        .map(i => i.nameES)
        .join(', ');
        
      showToast(`No se pueden eliminar: ${usedNames}. Están en uso en escandallos.`, 'error');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Seleccionados',
      message: `¿Estás seguro de eliminar los ${selectedIds.size} ingredientes seleccionados? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        try {
          const deletePromises = idsToDelete.map(id => deleteDoc(doc(db, 'ingredients', id)));
          await Promise.all(deletePromises);
          setSelectedIds(new Set());
          showToast(`${idsToDelete.length} ingredientes eliminados correctamente`, 'success');
        } catch (error) {
          console.error('Error deleting ingredients:', error);
          showToast('Error al eliminar. Solo el tutor puede eliminar ingredientes.', 'error');
        }
      }
    });
  };

  // Estado para el formulario del modal
  const [formData, setFormData] = useState({
    nameES: '',
    provider: '',
    allergens: [] as string[],
    unit: 'kg' as Ingredient['unit'],
    purchasePrice: '' as string | number,
    wastePercentage: '' as string | number,
    purchaseFormat: '',
    formatPrice: '' as string | number,
    weightPerUnit: '' as string | number,
  });

  // Función para guardar un ingrediente (crear nuevo o actualizar existente)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    // Calculamos el coste real por unidad teniendo en cuenta el porcentaje de merma
    const waste = Number(formData.wastePercentage) || 0;
    const safeWaste = Math.min(Math.max(waste, 0), 99); // Evitamos divisiones por cero (máximo 99%)
    
    // Si se ha introducido un formato de compra con precio y peso, calculamos el purchasePrice
    let purchasePrice = Number(formData.purchasePrice) || 0;
    const formatPrice = Number(formData.formatPrice) || 0;
    const weightPerUnit = Number(formData.weightPerUnit) || 0;
    
    if (formatPrice > 0 && weightPerUnit > 0) {
      purchasePrice = formatPrice / weightPerUnit;
    }

    const costPerUnit = purchasePrice / (1 - (safeWaste / 100));

    // Si estamos editando usamos el ID existente, si no, generamos uno nuevo
    const id = editingId || doc(collection(db, 'ingredients')).id;
    const ingredientData = {
      ...formData,
      purchasePrice,
      formatPrice: formatPrice > 0 ? formatPrice : null,
      weightPerUnit: weightPerUnit > 0 ? weightPerUnit : null,
      nameEN: editingId ? ingredients.find(i => i.id === editingId)?.nameEN || '' : '',
      wastePercentage: safeWaste,
      costPerUnit,
      createdBy: appUser.group || appUser.name,
      createdAt: editingId ? ingredients.find(i => i.id === editingId)?.createdAt : new Date().toISOString(),
    };

    try {
      // Guardamos en Firestore
      await setDoc(doc(db, 'ingredients', id), ingredientData);
      setIsModalOpen(false);
      resetForm();
      showToast('Ingrediente guardado correctamente', 'success');
    } catch (error) {
      console.error('Error saving ingredient:', error);
      showToast('Error al guardar el ingrediente', 'error');
    }
  };

  // Función para eliminar un ingrediente
  const handleDelete = async (id: string) => {
    // Primero comprobamos si el ingrediente está siendo usado en alguna receta
    const isUsedInRecipe = recipes.some(recipe => 
      recipe.ingredients?.some((ing: any) => ing.ingredientId === id)
    );

    if (isUsedInRecipe) {
      setConfirmModal({
        isOpen: true,
        title: 'No se puede eliminar',
        message: 'Este ingrediente está siendo utilizado en uno o más escandallos (recetas). Elimínalo primero de los escandallos para poder borrarlo.',
        onConfirm: () => {},
        isDestructive: false
      });
      return;
    }

    // Confirmación antes de borrar
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Ingrediente',
      message: '¿Estás seguro de eliminar este ingrediente? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'ingredients', id));
          showToast('Ingrediente eliminado', 'success');
        } catch (error) {
          console.error('Error deleting ingredient:', error);
          showToast('Error al eliminar. Solo el tutor puede eliminar ingredientes.', 'error');
        }
      }
    });
  };

  // Función para abrir el modal en modo edición con los datos del ingrediente
  const openEdit = (ingredient: Ingredient) => {
    setFormData({
      nameES: ingredient.nameES,
      provider: ingredient.provider || '',
      allergens: ingredient.allergens || [],
      unit: (ingredient.unit as 'kg' | 'L' | 'ud') || 'kg',
      purchasePrice: ingredient.purchasePrice || ingredient.costPerUnit,
      wastePercentage: ingredient.wastePercentage || 0,
      purchaseFormat: ingredient.purchaseFormat || '',
      formatPrice: ingredient.formatPrice || '',
      weightPerUnit: ingredient.weightPerUnit || '',
    });
    setEditingId(ingredient.id);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ 
      nameES: '', provider: '', 
      allergens: [], unit: 'kg', purchasePrice: '' as string | number, wastePercentage: '' as string | number,
      purchaseFormat: '', formatPrice: '', weightPerUnit: ''
    });
    setEditingId(null);
  };

  const toggleAllergen = (allergenId: string) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergenId)
        ? prev.allergens.filter(id => id !== allergenId)
        : [...prev.allergens, allergenId]
    }));
  };

  const handleWasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    const id = editingWasteId || doc(collection(db, 'standard_wastes')).id;
    const wasteData = {
      id,
      item: wasteFormData.item,
      percentage: Number(wasteFormData.percentage) || 0,
      notes: wasteFormData.notes || '',
      createdBy: editingWasteId ? (standardWastes.find(w => w.id === editingWasteId)?.createdBy || appUser.name) : appUser.name,
      createdAt: editingWasteId ? (standardWastes.find(w => w.id === editingWasteId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'standard_wastes', id), wasteData);
      setIsWasteModalOpen(false);
      setWasteFormData({ item: '', percentage: '', notes: '' });
      setEditingWasteId(null);
      showToast('Merma estandarizada guardada', 'success');
    } catch (error) {
      console.error('Error saving waste:', error);
      showToast('Error al guardar', 'error');
    }
  };

  const handleWasteDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Merma Estandarizada',
      message: '¿Estás seguro de eliminar este registro?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'standard_wastes', id));
          showToast('Merma eliminada', 'success');
        } catch (error) {
          console.error('Error deleting waste:', error);
          showToast('Error al eliminar', 'error');
        }
      }
    });
  };

  const openWasteEdit = (waste: any) => {
    setWasteFormData({
      item: waste.item,
      percentage: waste.percentage,
      notes: waste.notes || ''
    });
    setEditingWasteId(waste.id);
    setIsWasteModalOpen(true);
  };

  const filteredIngredients = ingredients.filter(i => 
    i.nameES.toLowerCase().includes(search.toLowerCase()) || 
    i.nameEN?.toLowerCase().includes(search.toLowerCase())
  );

  // Calcular paginación
  const totalPages = Math.ceil(filteredIngredients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedIngredients = filteredIngredients.slice(startIndex, startIndex + itemsPerPage);

  // Resetear a la página 1 cuando se busca
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        isDestructive={confirmModal.isDestructive}
      />
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Ingredientes</h1>
          <p className="text-stone-500 mt-2">Gestiona el listado de ingredientes y sus costes.</p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'ingredients' && selectedIds.size > 0 && isSuperAdmin && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-50 hover:bg-red-100 text-red-600 px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 border border-red-200"
            >
              <Trash2 size={20} />
              Eliminar ({selectedIds.size})
            </button>
          )}
          {activeTab === 'ingredients' ? (
            <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Nuevo Ingrediente
            </button>
          ) : (
            <button
              onClick={() => {
                setWasteFormData({ item: '', percentage: '', notes: '' });
                setEditingWasteId(null);
                setIsWasteModalOpen(true);
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Nueva Merma
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 border-b border-stone-200 mb-6">
        <button
          onClick={() => setActiveTab('ingredients')}
          className={`pb-3 px-1 font-medium text-sm transition-colors relative ${
            activeTab === 'ingredients' ? 'text-teal-600' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Ingredientes
          {activeTab === 'ingredients' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('wastes')}
          className={`pb-3 px-1 font-medium text-sm transition-colors relative ${
            activeTab === 'wastes' ? 'text-teal-600' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Mermas Estandarizadas
          {activeTab === 'wastes' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-t-full" />
          )}
        </button>
      </div>

      {activeTab === 'ingredients' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-4 border-b border-stone-200 bg-stone-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            <input
              type="text"
              placeholder="Buscar ingredientes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="px-6 py-4 w-10">
                <button 
                  onClick={toggleSelectAll}
                  className="text-stone-400 hover:text-teal-600 transition-colors"
                >
                  {selectedIds.size === paginatedIngredients.length && paginatedIngredients.length > 0 ? (
                    <CheckSquare size={20} className="text-teal-600" />
                  ) : (
                    <Square size={20} />
                  )}
                </button>
              </th>
              <th className="px-6 py-4 text-sm font-semibold text-stone-900">Nombre</th>
              <th className="px-6 py-4 text-sm font-semibold text-stone-900">Proveedor</th>
              <th className="px-6 py-4 text-sm font-semibold text-stone-900">Alérgenos</th>
              <th className="px-6 py-4 text-sm font-semibold text-stone-900">Coste Real / Unidad</th>
              <th className="px-6 py-4 text-sm font-semibold text-stone-900 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {paginatedIngredients.map((ing) => (
              <tr key={ing.id} className={`hover:bg-stone-50 transition-colors ${selectedIds.has(ing.id) ? 'bg-teal-50/30' : ''}`}>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => toggleSelect(ing.id)}
                    className="text-stone-400 hover:text-teal-600 transition-colors"
                  >
                    {selectedIds.has(ing.id) ? (
                      <CheckSquare size={20} className="text-teal-600" />
                    ) : (
                      <Square size={20} />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-stone-900 font-medium">{ing.nameES}</div>
                </td>
                <td className="px-6 py-4">
                  <input
                    type="text"
                    value={ing.provider || ''}
                    onChange={(e) => {
                      const newProvider = e.target.value;
                      setDoc(doc(db, 'ingredients', ing.id), { ...ing, provider: newProvider });
                    }}
                    className="w-full px-2 py-1 text-sm bg-transparent border border-transparent hover:border-stone-200 focus:border-teal-500 focus:bg-white rounded transition-colors"
                    placeholder="Proveedor..."
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {ing.allergens && ing.allergens.length > 0 ? (
                      ing.allergens.map(a => {
                        const allergen = ALLERGENS.find(al => al.id === a);
                        return allergen ? (
                          <span key={a} title={allergen.name} className="text-lg">{allergen.icon}</span>
                        ) : null;
                      })
                    ) : (
                      <span className="text-xs text-stone-400">Ninguno</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={ing.purchasePrice || ing.costPerUnit}
                      onChange={(e) => {
                        const newPrice = Number(e.target.value) || 0;
                        const waste = ing.wastePercentage || 0;
                        const safeWaste = Math.min(Math.max(waste, 0), 99);
                        const newCost = newPrice / (1 - (safeWaste / 100));
                        setDoc(doc(db, 'ingredients', ing.id), { ...ing, purchasePrice: newPrice, costPerUnit: newCost });
                      }}
                      onFocus={e => e.target.select()}
                      className="w-20 px-2 py-1 text-sm bg-transparent border border-transparent hover:border-stone-200 focus:border-teal-500 focus:bg-white rounded transition-colors"
                    />
                    <span className="text-sm text-stone-500">€ / {ing.unit}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-stone-500">Merma:</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="99"
                      value={ing.wastePercentage || 0}
                      onChange={(e) => {
                        const newWaste = Number(e.target.value) || 0;
                        const safeWaste = Math.min(Math.max(newWaste, 0), 99);
                        const price = ing.purchasePrice || ing.costPerUnit;
                        const newCost = price / (1 - (safeWaste / 100));
                        setDoc(doc(db, 'ingredients', ing.id), { ...ing, wastePercentage: safeWaste, costPerUnit: newCost });
                      }}
                      onFocus={e => e.target.select()}
                      className="w-16 px-2 py-1 text-xs bg-transparent border border-transparent hover:border-stone-200 focus:border-teal-500 focus:bg-white rounded transition-colors text-orange-600"
                    />
                    <span className="text-xs text-orange-600">%</span>
                  </div>
                  <div className="text-xs text-teal-600 font-medium mt-1">
                    Coste real: {ing.costPerUnit.toFixed(2)} €
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(ing)}
                      className="text-stone-400 hover:text-teal-600 p-2 hover:bg-teal-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDelete(ing.id)}
                        className="text-stone-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {paginatedIngredients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-stone-500">
                  No se encontraron ingredientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Controles de paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
            <div className="text-sm text-stone-500">
              Mostrando <span className="font-medium">{startIndex + 1}</span> a <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredIngredients.length)}</span> de <span className="font-medium">{filteredIngredients.length}</span> ingredientes
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
                  // Lógica para mostrar páginas cercanas a la actual
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
      </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-6 py-4 text-sm font-semibold text-stone-900">Ingrediente / Categoría</th>
                <th className="px-6 py-4 text-sm font-semibold text-stone-900">Merma (%)</th>
                <th className="px-6 py-4 text-sm font-semibold text-stone-900">Notas</th>
                <th className="px-6 py-4 text-sm font-semibold text-stone-900 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {standardWastes.map((waste) => (
                <tr key={waste.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm text-stone-900 font-medium">{waste.item}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-orange-600 font-medium">{waste.percentage}%</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-stone-500">{waste.notes || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openWasteEdit(waste)}
                        className="text-stone-400 hover:text-teal-600 p-2 hover:bg-teal-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleWasteDelete(waste.id)}
                          className="text-stone-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {standardWastes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-stone-500">
                    No hay mermas estandarizadas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" style={{ backgroundColor: '#FAEBD7' }}>
            <div className="p-6 border-b border-stone-200/50">
              <h2 className="text-xl font-bold text-stone-900">
                {editingId ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
              </h2>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="ingredient-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      required
                      value={formData.nameES}
                      onChange={e => setFormData({...formData, nameES: e.target.value})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Proveedor</label>
                    <input
                      type="text"
                      value={formData.provider}
                      onChange={e => setFormData({...formData, provider: e.target.value})}
                      placeholder="Ej. Makro, Mercamadrid..."
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-4">
                  <h3 className="text-sm font-semibold text-stone-900">Formato de compra (Opcional)</h3>
                  <p className="text-xs text-stone-500">Si compras por paquetes o unidades pero quieres usarlo por Kg/L, rellena esto para calcular el precio automáticamente.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Formato</label>
                      <input
                        type="text"
                        value={formData.purchaseFormat}
                        onChange={e => setFormData({...formData, purchaseFormat: e.target.value})}
                        placeholder="Ej. Paquete de cilantro"
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Precio del formato (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.formatPrice}
                        onChange={e => {
                          const newFormatPrice = e.target.value;
                          setFormData(prev => {
                            const newFormData = {...prev, formatPrice: newFormatPrice};
                            const formatPriceNum = Number(newFormatPrice) || 0;
                            const weightPerUnitNum = Number(prev.weightPerUnit) || 0;
                            if (formatPriceNum > 0 && weightPerUnitNum > 0) {
                              newFormData.purchasePrice = (formatPriceNum / weightPerUnitNum).toFixed(3);
                            }
                            return newFormData;
                          });
                        }}
                        onFocus={e => e.target.select()}
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Peso del formato (kg o L)</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={formData.weightPerUnit}
                        onChange={e => {
                          const newWeight = e.target.value;
                          setFormData(prev => {
                            const newFormData = {...prev, weightPerUnit: newWeight};
                            const formatPriceNum = Number(prev.formatPrice) || 0;
                            const weightPerUnitNum = Number(newWeight) || 0;
                            if (formatPriceNum > 0 && weightPerUnitNum > 0) {
                              newFormData.purchasePrice = (formatPriceNum / weightPerUnitNum).toFixed(3);
                            }
                            return newFormData;
                          });
                        }}
                        onFocus={e => e.target.select()}
                        className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Unidad base *</label>
                    <select
                      value={formData.unit}
                      onChange={e => setFormData({...formData, unit: e.target.value as any})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="kg">Kilogramo (kg)</option>
                      <option value="L">Litro (L)</option>
                      <option value="ud">Unidad (ud)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Precio Compra (€ por {formData.unit}) *</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      required
                      value={formData.purchasePrice}
                      onChange={e => setFormData({...formData, purchasePrice: e.target.value})}
                      onFocus={e => e.target.select()}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-stone-700">% Merma</label>
                      <div className="relative group">
                        <button
                          type="button"
                          className="text-teal-600 hover:text-teal-700 text-xs font-medium"
                        >
                          Consultar
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-lg border border-stone-200 p-2 hidden group-hover:block z-10">
                          <div className="text-xs font-semibold text-stone-500 mb-2 px-2">Mermas Estandarizadas</div>
                          <div className="max-h-48 overflow-y-auto">
                            {standardWastes.map(waste => (
                              <button
                                key={waste.id}
                                type="button"
                                onClick={() => setFormData({...formData, wastePercentage: waste.percentage})}
                                className="w-full text-left px-2 py-1.5 hover:bg-stone-50 rounded-lg text-sm flex justify-between items-center"
                              >
                                <span className="text-stone-700 truncate pr-2">{waste.item}</span>
                                <span className="text-orange-600 font-medium">{waste.percentage}%</span>
                              </button>
                            ))}
                            {standardWastes.length === 0 && (
                              <div className="px-2 py-2 text-xs text-stone-400">No hay mermas registradas</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="99"
                      value={formData.wastePercentage}
                      onChange={e => setFormData({...formData, wastePercentage: e.target.value})}
                      onFocus={e => e.target.select()}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Real cost preview */}
                <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 flex items-center gap-3">
                  <AlertCircle className="text-teal-600" size={20} />
                  <div className="text-sm text-teal-800">
                    Coste real por <strong>1 {formData.unit}</strong> (aplicando merma): 
                    <span className="font-bold ml-2 text-lg">
                      {((Number(formData.purchasePrice) || 0) / (1 - (Math.min(Math.max(Number(formData.wastePercentage) || 0, 0), 99) / 100))).toFixed(2)} €
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-900 mb-3">Alérgenos</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {ALLERGENS.map(allergen => (
                      <label key={allergen.id} className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 hover:bg-stone-50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.allergens.includes(allergen.id)}
                          onChange={() => toggleAllergen(allergen.id)}
                          className="w-4 h-4 text-teal-600 rounded border-stone-300 focus:ring-teal-500"
                        />
                        <span className="text-lg" title={allergen.name}>{allergen.icon}</span>
                        <span className="text-sm text-stone-700">{allergen.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-stone-200/50 flex gap-3 justify-end rounded-b-2xl" style={{ backgroundColor: '#FAEBD7' }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-stone-600 hover:bg-stone-200/50 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="ingredient-form"
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
