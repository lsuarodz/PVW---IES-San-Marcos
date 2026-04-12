import React, { useState, useRef } from 'react';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, Edit2, Search, Utensils, Download, CookingPot, ChevronLeft, ChevronRight } from 'lucide-react';
import { ALLERGENS } from '../constants/allergens';
import { getGroupColor } from '../utils/groupColors';
import ConfirmModal from '../components/ConfirmModal';
import CreateRecipeModal from '../components/CreateRecipeModal';
import html2pdf from 'html2pdf.js';
import { calculateMenuTotalCost, getMenuAllergens } from '../utils/calculations';
import { Menu, Recipe, Ingredient } from '../types';

export default function Menus() {
  // Obtenemos el usuario actual para verificar sus permisos
  const { appUser } = useAuth();
  // Verificamos si el usuario tiene rol de administrador o docente
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'docente';
  // Verificamos si el usuario es el administrador principal
  const isSuperAdmin = appUser?.role === 'admin';
  const { showToast } = useToast();
  
  // Estados para almacenar los datos de la base de datos
  const { menus, recipes, ingredients, clients } = useData();
  
  // Estado para el buscador y paginación
  const [search, setSearch] = useState('');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Estados para controlar la visibilidad de los modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  
  // Estado para saber si estamos editando un menú existente
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
  
  // Estado para almacenar los datos del formulario del menú
  const [formData, setFormData] = useState({
    nameES: '',
    eventDate: '',
    eventPlace: '',
    type: 'brunch' as Menu['type'],
    clientId: '',
    location: 'centro' as 'centro' | 'fuera',
    occasion: '',
    diners: null as number | null,
    recipes: [] as string[],
    price: 0,
  });

  // Referencias y estados para la funcionalidad de impresión a PDF
  const printRef = useRef<HTMLDivElement>(null);
  const printEquipmentRef = useRef<HTMLDivElement>(null);
  const [printingMenu, setPrintingMenu] = useState<Menu | null>(null);
  const [printingEquipmentMenu, setPrintingEquipmentMenu] = useState<Menu | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    const id = editingId || doc(collection(db, 'menus')).id;
    const totalCost = calculateMenuTotalCost(formData.recipes, recipes);

    const menuData = {
      ...formData,
      nameES: formData.nameES.trim() || 'Menú sin nombre',
      diners: formData.diners || null,
      nameEN: editingId ? menus.find(m => m.id === editingId)?.nameEN || '' : '',
      totalCost,
      createdBy: appUser.group || appUser.name,
      createdAt: editingId ? menus.find(m => m.id === editingId)?.createdAt : new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'menus', id), menuData);
      setIsModalOpen(false);
      resetForm();
      showToast('Menú guardado correctamente', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `menus/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Menú',
      message: '¿Estás seguro de eliminar este menú? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'menus', id));
          showToast('Menú eliminado', 'success');
        } catch (error) {
          console.error('Error deleting menu:', error);
          showToast('Error al eliminar. Solo el tutor puede eliminar.', 'error');
        }
      }
    });
  };

  const openEdit = (menu: Menu) => {
    setFormData({
      nameES: menu.nameES,
      eventDate: menu.eventDate || '',
      eventPlace: menu.eventPlace || '',
      type: menu.type,
      clientId: menu.clientId || '',
      location: menu.location || 'centro',
      occasion: menu.occasion || '',
      diners: menu.diners,
      recipes: menu.recipes,
      price: menu.price,
    });
    setEditingId(menu.id);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ nameES: '', eventDate: '', eventPlace: '', type: 'brunch', clientId: '', location: 'centro', occasion: '', diners: null, recipes: [], price: 0 });
    setEditingId(null);
    setRecipeSearch('');
  };

  const toggleRecipe = (recipeId: string) => {
    setFormData(prev => ({
      ...prev,
      recipes: prev.recipes.includes(recipeId)
        ? prev.recipes.filter(id => id !== recipeId)
        : [...prev.recipes, recipeId]
    }));
  };

  const exportPDF = (menu: Menu) => {
    if (isPrinting) return;
    setIsPrinting(true);
    setPrintingMenu(menu);
    
    setTimeout(() => {
      if (printRef.current) {
        const opt = {
          margin: 0,
          filename: `Menu_${menu.nameES.replace(/\s+/g, '_')}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'px', format: [794, 1122] as [number, number], orientation: 'portrait' as const }
        };
        
        html2pdf()
          .set(opt)
          .from(printRef.current)
          .save()
          .then(() => {
            setPrintingMenu(null);
            setIsPrinting(false);
          })
          .catch((err: any) => {
            console.error('Error generating PDF:', err);
            setPrintingMenu(null);
            setIsPrinting(false);
            showToast('Error al generar el PDF. Por favor, inténtalo de nuevo.', 'error');
          });
      } else {
        setIsPrinting(false);
      }
    }, 500);
  };

  const exportEquipmentPDF = (menu: Menu) => {
    if (isPrinting) return;
    setIsPrinting(true);
    setPrintingEquipmentMenu(menu);
    
    setTimeout(() => {
      if (printEquipmentRef.current) {
        const opt = {
          margin: 0,
          filename: `Material_Menu_${menu.nameES.replace(/\s+/g, '_')}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'px', format: [794, 1122] as [number, number], orientation: 'portrait' as const }
        };
        
        html2pdf()
          .set(opt)
          .from(printEquipmentRef.current)
          .save()
          .then(() => {
            setPrintingEquipmentMenu(null);
            setIsPrinting(false);
          })
          .catch((err: any) => {
            console.error('Error generating PDF:', err);
            setPrintingEquipmentMenu(null);
            setIsPrinting(false);
            showToast('Error al generar el PDF. Por favor, inténtalo de nuevo.', 'error');
          });
      } else {
        setIsPrinting(false);
      }
    }, 500);
  };

  const filteredMenus = menus.filter(m => 
    m.nameES.toLowerCase().includes(search.toLowerCase()) || 
    m.nameEN?.toLowerCase().includes(search.toLowerCase())
  );

  // Calcular paginación
  const totalPages = Math.ceil(filteredMenus.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMenus = filteredMenus.slice(startIndex, startIndex + itemsPerPage);

  // Resetear a la página 1 cuando se busca
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500 tracking-tight mb-2">Menús</h1>
          <p className="text-stone-500 text-lg">Agrupa recetas para crear ofertas estandarizadas.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Nuevo Menú
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {paginatedMenus.map((menu) => {
          const menuAllergens = getMenuAllergens(menu.recipes, ingredients, recipes);
          return (
          <div key={menu.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <Utensils size={24} />
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => exportEquipmentPDF(menu)} 
                    disabled={isPrinting}
                    className="p-2 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-50" 
                    title="Imprimir material"
                  >
                    <CookingPot size={18} />
                  </button>
                  <button 
                    onClick={() => exportPDF(menu)} 
                    disabled={isPrinting}
                    className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50" 
                    title="Exportar Minuta"
                  >
                    <Download size={18} />
                  </button>
                  <button onClick={() => openEdit(menu)} className="p-2 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                    <Edit2 size={18} />
                  </button>
                  {isSuperAdmin && (
                    <button onClick={() => handleDelete(menu.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-xl font-bold text-stone-900">{menu.nameES}</h3>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                  menu.type === 'brunch' ? 'bg-orange-100 text-orange-700' : 
                  menu.type === 'cocktail' ? 'bg-indigo-100 text-indigo-700' :
                  menu.type === 'navidad' ? 'bg-red-100 text-red-700' :
                  menu.type === 'coffee' ? 'bg-amber-100 text-amber-800' :
                  menu.type === 'cafeteria' ? 'bg-blue-100 text-blue-700' :
                  'bg-teal-100 text-teal-700'
                }`}>
                  {menu.type === 'navidad' ? 'NAVIDAD SOLIDARIO' :
                   menu.type === 'coffee' ? 'COFFEE BREAK' :
                   menu.type === 'cafeteria' ? 'CAFETERÍA' :
                   menu.type === 'pedagogico' ? 'PEDAGÓGICO' :
                   menu.type.toUpperCase()}
                </span>
              </div>
              
              <div className="text-sm text-stone-500 mb-4 flex gap-3 flex-wrap">
                {menu.eventDate && <span>📅 {menu.eventDate} </span>}
                {menu.eventPlace && <span>📍 {menu.eventPlace} </span>}
                {menu.clientId && <span>👤 {clients.find(c => c.id === menu.clientId)?.name || menu.clientId}</span>}
              </div>
              
              {menuAllergens.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {menuAllergens.map(a => {
                    const allergen = ALLERGENS.find(al => al.id === a);
                    return allergen ? (
                      <span key={a} title={allergen.name} className="text-lg">{allergen.icon}</span>
                    ) : null;
                  })}
                </div>
              )}

              <div className="space-y-3 mb-6">
                <div className="text-sm">
                  <span className="text-stone-500 block mb-2">Recetas incluidas:</span>
                  <ul className="list-disc pl-5 space-y-1">
                    {menu.recipes.map(recipeId => {
                      const recipe = recipes.find(r => r.id === recipeId);
                      return recipe ? (
                        <li key={recipeId} className="text-stone-900 font-medium">
                          {recipe.nameES}
                        </li>
                      ) : null;
                    })}
                    {menu.recipes.length === 0 && (
                      <li className="text-stone-400 italic list-none -ml-5">Ninguna receta incluida</li>
                    )}
                  </ul>
                </div>
                <div className="flex justify-between text-sm pt-3 border-t border-stone-100">
                  <span className="text-stone-500">Coste Total (Escandallos):</span>
                  <span className="font-medium text-stone-900">{menu.totalCost.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm pt-3 border-t border-stone-100">
                  <span className="text-stone-700 font-medium">Precio de Venta:</span>
                  <span className="font-bold text-teal-700 text-lg">{menu.price.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Margen Bruto:</span>
                  <span className={`font-medium ${menu.price > menu.totalCost ? 'text-teal-600' : 'text-red-500'}`}>
                    {menu.price > 0 ? (((menu.price - menu.totalCost) / menu.price) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
              
              <div className="text-xs text-stone-400 border-t border-stone-100 pt-4 flex items-center justify-between">
                <span>Creado por</span>
                <span className={`font-bold px-2 py-1 rounded-full ${getGroupColor(menu.createdBy)}`}>
                  {menu.createdBy}
                </span>
              </div>
            </div>
          </div>
          );
        })}
        {paginatedMenus.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-500">
            No se encontraron menús.
          </div>
        )}
      </div>

      {/* Controles de paginación */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <div className="text-sm text-stone-500">
            Mostrando <span className="font-medium">{startIndex + 1}</span> a <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredMenus.length)}</span> de <span className="font-medium">{filteredMenus.length}</span> menús
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

      {/* Hidden PDF Template */}
      {printingMenu && (
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <div ref={printRef} className="px-16 py-20 bg-white text-stone-900 font-serif w-[794px] min-h-[1122px] mx-auto flex flex-col items-center relative overflow-hidden">
            {/* Elegant Borders */}
            <div className="absolute inset-6 border-2 border-stone-800 pointer-events-none"></div>
            <div className="absolute inset-8 border border-stone-300 pointer-events-none"></div>
            
            <div className="z-10 w-full flex flex-col items-center flex-1">
              <div className="text-center mb-12 w-full pt-12">
                <div className="flex justify-center mb-8">
                  <Utensils className="text-stone-800" size={32} strokeWidth={1.5} />
                </div>
                <div className="text-stone-500 text-[11px] tracking-[0.4em] uppercase mb-4 font-sans font-medium">Propuesta Gastronómica</div>
                <h1 className="text-5xl font-serif font-bold mb-4 text-stone-900 tracking-tight leading-tight px-12 uppercase">{printingMenu.nameES}</h1>
                {printingMenu.eventDate && <h2 className="text-xl text-stone-600 font-serif mb-2">{printingMenu.eventDate}</h2>}
                {printingMenu.eventPlace && <h2 className="text-xl text-stone-600 font-serif mb-4">{printingMenu.eventPlace}</h2>}
                
                <div className="flex items-center justify-center gap-6 mt-8">
                  <div className="h-px w-16 bg-stone-300"></div>
                  <div className="text-[12px] tracking-[0.3em] uppercase text-stone-800 font-sans font-semibold">
                    {printingMenu.type === 'brunch' ? 'Menú Brunch' : 
                     printingMenu.type === 'cocktail' ? 'Menú Cóctel' :
                     printingMenu.type === 'navidad' ? 'Menú Navidad Solidario' :
                     printingMenu.type === 'coffee' ? 'Coffee Break' :
                     printingMenu.type === 'cafeteria' ? 'Cafetería' :
                     'Menú Pedagógico'}
                  </div>
                  <div className="h-px w-16 bg-stone-300"></div>
                </div>
              </div>

              <div className="space-y-10 mb-16 w-full flex flex-col items-center max-w-2xl">
                {printingMenu.recipes.map((recipeId, index) => {
                  const recipe = recipes.find(r => r.id === recipeId);
                  if (!recipe) return null;
                  const recipeAllergens = getMenuAllergens([recipe.id], ingredients, recipes);
                  return (
                    <div key={recipe.id} className="text-center w-full">
                      <h3 className="text-2xl font-serif font-bold mb-2 text-stone-900 tracking-wide uppercase">{recipe.nameES}</h3>
                      {recipe.descriptionES && (
                        <p className="text-stone-600 text-sm italic mb-3 leading-relaxed px-12 max-w-md mx-auto">{recipe.descriptionES}</p>
                      )}
                      {recipeAllergens.length > 0 && (
                        <div className="flex justify-center gap-2 mt-3 opacity-60">
                          {recipeAllergens.map(a => {
                            const allergen = ALLERGENS.find(al => al.id === a);
                            return allergen ? (
                              <span key={a} title={allergen.name} className="text-sm">{allergen.icon}</span>
                            ) : null;
                          })}
                        </div>
                      )}
                      {index < printingMenu.recipes.length - 1 && (
                        <div className="mt-10 flex justify-center">
                          <div className="w-12 h-px bg-stone-300"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto w-full flex flex-col items-center pb-12">
                <div className="text-center mb-10">
                  <div className="text-4xl font-serif font-bold text-stone-900 mb-2">{printingMenu.price.toFixed(2)} €</div>
                  <div className="text-[10px] text-stone-500 uppercase tracking-[0.3em] font-sans font-medium">Precio por persona · IVA incluido</div>
                </div>

                <div className="pt-8 border-t border-stone-300 w-full max-w-md text-center">
                  <p className="text-[9px] text-stone-500 uppercase tracking-[0.25em] font-sans leading-loose px-4">
                    Todos nuestros productos son elaborados en una cocina compartida donde se manipulan alérgenos, por lo que pueden contener trazas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden PDF Template for Equipment */}
      {printingEquipmentMenu && (
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <div ref={printEquipmentRef} className="px-16 py-20 bg-white text-stone-900 font-serif w-[794px] min-h-[1122px] mx-auto flex flex-col relative overflow-hidden">
            <div className="z-10 w-full">
              <div className="border-b border-stone-200 pb-8 mb-12">
                <div className="text-stone-400 text-[10px] tracking-[0.4em] uppercase mb-4 font-sans font-medium">Listado de Producción</div>
                <h1 className="text-4xl font-display font-medium text-stone-800 tracking-tight mb-2">{printingEquipmentMenu.nameES}</h1>
                <div className="flex items-center gap-4 text-stone-500 text-sm font-sans">
                  <span className="uppercase tracking-widest">{printingEquipmentMenu.type}</span>
                  <span className="text-stone-300">|</span>
                  <span>{printingEquipmentMenu.location === 'centro' ? 'En el centro' : 'Fuera del centro'}</span>
                </div>
              </div>

              <div className="space-y-12">
                <div>
                  <h2 className="text-xl font-display font-medium text-stone-800 mb-6 flex items-center gap-3">
                    <span className="h-px w-8 bg-stone-300"></span>
                    Material y Equipamiento Necesario
                  </h2>
                  <div className="space-y-8">
                    {printingEquipmentMenu.recipes.map((recipeId) => {
                      const recipe = recipes.find(r => r.id === recipeId);
                      if (!recipe || !recipe.equipment || recipe.equipment.length === 0) return null;
                      return (
                        <div key={recipe.id} className="bg-stone-50/50 p-6 rounded-xl border border-stone-100">
                          <h3 className="text-lg font-serif font-bold text-stone-800 mb-3">{recipe.nameES}</h3>
                          <ul className="grid grid-cols-2 gap-x-8 gap-y-2 list-disc pl-5 text-xs text-stone-600 font-sans">
                            {recipe.equipment.map((eq, idx) => (
                              <li key={idx} className="pl-1 leading-relaxed">{eq}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                  
                  {printingEquipmentMenu.recipes.every(recipeId => {
                    const recipe = recipes.find(r => r.id === recipeId);
                    return !recipe || !recipe.equipment || recipe.equipment.length === 0;
                  }) && (
                    <p className="text-stone-400 italic text-sm text-center py-12 font-sans">No hay material ni equipamiento definido en las recetas de este menú.</p>
                  )}
                </div>
              </div>

              <div className="mt-20 pt-8 border-t border-stone-100 text-center">
                <p className="text-[9px] text-stone-400 uppercase tracking-[0.3em] font-sans">
                  Documento de uso interno · Proyecto Intermodular
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-stone-900">
                {editingId ? 'Editar Menú' : 'Nuevo Menú'}
              </h2>
              <div className="text-lg font-bold text-teal-700">
                Coste: {calculateMenuTotalCost(formData.recipes, recipes).toFixed(2)} €
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="menu-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={formData.nameES}
                      onChange={e => setFormData({...formData, nameES: e.target.value})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Fecha del Evento</label>
                    <input
                      type="text"
                      value={formData.eventDate}
                      onChange={e => setFormData({...formData, eventDate: e.target.value})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Ej. 15 de Mayo de 2026"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Lugar del Evento</label>
                    <input
                      type="text"
                      value={formData.eventPlace}
                      onChange={e => setFormData({...formData, eventPlace: e.target.value})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Ej. Salón Principal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Cliente</label>
                    <select
                      value={formData.clientId}
                      onChange={e => setFormData({...formData, clientId: e.target.value})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">-- Selecciona un cliente --</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Ocasión</label>
                    <input
                      type="text"
                      value={formData.occasion}
                      onChange={e => setFormData({...formData, occasion: e.target.value})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Ej. Graduación, Reunión..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Lugar</label>
                    <select
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value as 'centro' | 'fuera'})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="centro">En el centro</option>
                      <option value="fuera">Fuera del centro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Tipo de Menú *</label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value as any})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="brunch">Brunch</option>
                      <option value="cocktail">Cóctel</option>
                      <option value="navidad">Menú Navidad Solidario</option>
                      <option value="coffee">Coffee Break</option>
                      <option value="cafeteria">Cafetería</option>
                      <option value="pedagogico">Menú Pedagógico</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Precio de Venta (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price === 0 ? '' : formData.price}
                      onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                      onFocus={e => e.target.select()}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Número de Comensales</label>
                    <input
                      type="number" min="1" step="1"
                      value={formData.diners || ''}
                      onChange={e => setFormData({...formData, diners: parseInt(e.target.value) || null})}
                      onFocus={e => e.target.select()}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-stone-900">Recetas / Elaboraciones</label>
                    <button
                      type="button"
                      onClick={() => setIsRecipeModalOpen(true)}
                      className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                    >
                      <Plus size={16} /> Crear receta
                    </button>
                  </div>
                  
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input
                      type="text"
                      placeholder="Buscar receta..."
                      value={recipeSearch}
                      onChange={(e) => setRecipeSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 max-h-64 overflow-y-auto">
                    {recipes.length === 0 ? (
                      <p className="text-sm text-stone-500 text-center py-4">No hay recetas disponibles. Crea una primero.</p>
                    ) : (
                      <div className="space-y-2">
                        {recipes.filter(r => r.nameES.toLowerCase().includes(recipeSearch.toLowerCase())).map(recipe => (
                          <label key={recipe.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.recipes.includes(recipe.id)}
                              onChange={() => toggleRecipe(recipe.id)}
                              className="w-4 h-4 text-teal-600 rounded border-stone-300 focus:ring-teal-500"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-stone-900">{recipe.nameES}</div>
                              <div className="text-xs text-stone-500">{recipe.totalCost.toFixed(2)} € coste</div>
                            </div>
                          </label>
                        ))}
                        {recipes.filter(r => r.nameES.toLowerCase().includes(recipeSearch.toLowerCase())).length === 0 && recipeSearch && (
                          <p className="text-sm text-stone-500 text-center py-4">No se encontraron recetas con "{recipeSearch}".</p>
                        )}
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
                form="menu-form"
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors"
              >
                Guardar Menú
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateRecipeModal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        onSuccess={(newId) => {
          setFormData(prev => ({
            ...prev,
            recipes: [...prev.recipes, newId]
          }));
        }}
      />
    </div>
    </div>
  );
}
