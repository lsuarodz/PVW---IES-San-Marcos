import React, { useState, useRef } from 'react';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
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
  const { appUser, viewAsStudent } = useAuth();
  // Verificamos si el usuario tiene rol de administrador o docente
  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'docente';
  // Verificamos si el usuario es el administrador principal
  const isSuperAdmin = appUser?.role === 'admin';
  const { showToast } = useToast();
  
  // Estados para almacenar los datos de la base de datos
  const { menus, recipes, ingredients, clients, settings, users } = useData();
  
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

  // Estados para la evaluación
  const [evaluateModal, setEvaluateModal] = useState<{
    isOpen: boolean;
    menuId: string | null;
    score: number;
    feedback: string;
  }>({
    isOpen: false,
    menuId: null,
    score: 0,
    feedback: ''
  });
  
  // Estado para almacenar los datos del formulario del menú
  const [formData, setFormData] = useState({
    nameES: '',
    eventDate: '',
    eventTime: '',
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
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [printingMenu, setPrintingMenu] = useState<Menu | null>(null);
  const [printingEquipmentMenu, setPrintingEquipmentMenu] = useState<Menu | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    const id = editingId || doc(collection(db, 'menus')).id;
    const totalCost = calculateMenuTotalCost(formData.recipes, recipes);

    const existing = editingId ? menus.find(m => m.id === editingId) : null;

    const menuData = {
      ...formData,
      nameES: formData.nameES.trim() || 'Menú sin nombre',
      diners: formData.diners || null,
      nameEN: existing?.nameEN || '',
      totalCost,
      createdBy: existing?.createdBy || appUser.name,
      group: existing?.group !== undefined ? existing.group : (appUser.group || ''),
      score: existing?.score || null,
      feedback: existing?.feedback || '',
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    if (menuData.score === null) delete menuData.score;
    if (menuData.feedback === null) delete menuData.feedback;

    try {
      await setDoc(doc(db, 'menus', id), menuData);
      setIsModalOpen(false);
      resetForm();
      showToast('Menú guardado correctamente', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `menus/${id}`);
    }
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluateModal.menuId) return;

    try {
      await updateDoc(doc(db, 'menus', evaluateModal.menuId), {
        score: evaluateModal.score,
        feedback: evaluateModal.feedback.trim()
      });
      showToast('Evaluación guardada', 'success');
      setEvaluateModal({ isOpen: false, menuId: null, score: 0, feedback: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `menus/${evaluateModal.menuId}`);
    }
  };

  const openEvaluation = (menu: Menu) => {
    setEvaluateModal({
      isOpen: true,
      menuId: menu.id,
      score: menu.score || 0,
      feedback: menu.feedback || ''
    });
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
      eventTime: menu.eventTime || '',
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
    setFormData({ nameES: '', eventDate: '', eventTime: '', eventPlace: '', type: 'brunch', clientId: '', location: 'centro', occasion: '', diners: null, recipes: [], price: 0 });
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

  const exportPDF = async (menu: Menu) => {
    if (isPrinting) return;
    setIsPrinting(true);
    setPrintingMenu(menu);
    showToast('Generando PDF...', 'info');
    
    // Safety timeout to unblock UI if something goes wrong
    const safetyTimeout = setTimeout(() => {
      if (isPrinting) {
        setIsPrinting(false);
        setPrintingMenu(null);
        showToast('La generación del PDF está tardando más de lo esperado.', 'warning');
      }
    }, 15000);

    setTimeout(async () => {
      if (printRef.current) {
        try {
          const opt = {
            margin: 0,
            filename: `Menu_${menu.nameES.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.95 },
            html2canvas: { 
              scale: 1, 
              useCORS: true, 
              logging: false,
              useOverflow: true
            },
            jsPDF: { unit: 'px', format: [794, 1122] as [number, number], orientation: 'portrait' as const }
          };
          
          await html2pdf().set(opt).from(printRef.current).save();
        } catch (err: any) {
          console.error('Error generating PDF:', err);
          showToast('Error al generar el PDF. Por favor, inténtalo de nuevo.', 'error');
        } finally {
          clearTimeout(safetyTimeout);
          setPrintingMenu(null);
          setIsPrinting(false);
        }
      } else {
        clearTimeout(safetyTimeout);
        setIsPrinting(false);
      }
    }, 500);
  };

  const exportEquipmentPDF = async (menu: Menu) => {
    if (isPrinting) return;
    setIsPrinting(true);
    setPrintingEquipmentMenu(menu);
    showToast('Generando PDF...', 'info');
    
    // Safety timeout to unblock UI if something goes wrong
    const safetyTimeout = setTimeout(() => {
      if (isPrinting) {
        setIsPrinting(false);
        setPrintingEquipmentMenu(null);
        showToast('La generación del PDF está tardando más de lo esperado.', 'warning');
      }
    }, 15000);

    setTimeout(async () => {
      if (printEquipmentRef.current) {
        try {
          const opt = {
            margin: 0,
            filename: `Material_Menu_${menu.nameES.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.95 },
            html2canvas: { 
              scale: 1, 
              useCORS: true, 
              logging: false,
              useOverflow: true
            },
            jsPDF: { unit: 'px', format: [794, 1122] as [number, number], orientation: 'portrait' as const }
          };
          
          await html2pdf().set(opt).from(printEquipmentRef.current).save();
        } catch (err: any) {
          console.error('Error generating PDF:', err);
          showToast('Error al generar el PDF. Por favor, inténtalo de nuevo.', 'error');
        } finally {
          clearTimeout(safetyTimeout);
          setPrintingEquipmentMenu(null);
          setIsPrinting(false);
        }
      } else {
        clearTimeout(safetyTimeout);
        setIsPrinting(false);
      }
    }, 500);
  };

  const filteredMenus = menus.filter(m => {
    const isStudentView = appUser?.role === 'student' || (appUser?.role === 'admin' && viewAsStudent);
    if (isStudentView) {
      if (appUser?.role === 'student') {
        const matchesGroup = appUser?.group ? m.group === appUser.group : m.createdBy === appUser?.name;
        if (!matchesGroup) return false;
      } else {
        if (!m.group) return false;
      }
    }
    return m.nameES.toLowerCase().includes(search.toLowerCase()) || 
           m.nameEN?.toLowerCase().includes(search.toLowerCase());
  });

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
          onClick={() => { 
            resetForm(); 
            setIsModalOpen(true); 
            setTimeout(() => nameInputRef.current?.focus(), 100);
          }}
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
                  {isAdmin && !viewAsStudent && menu.group && (
                    <button 
                      onClick={() => openEvaluation(menu)} 
                      className={`p-2 rounded-lg transition-colors text-xs font-medium ${menu.score !== undefined && menu.score !== null ? 'bg-amber-100 text-amber-800' : 'text-stone-400 hover:text-amber-600 hover:bg-amber-50'}`}
                      title="Evaluar"
                    >
                      {menu.score !== undefined && menu.score !== null ? `Nota: ${menu.score}` : 'Evaluar'}
                    </button>
                  )}
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
                {menu.eventTime && <span>⏰ {menu.eventTime} </span>}
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
                          <a href={recipe.type === 'elaborado' ? `/elaborados?edit=${recipe.id}` : `/recipes?edit=${recipe.id}`} className="hover:text-teal-600 hover:underline">
                            {recipe.nameES}
                          </a>
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
              
              <div className="text-xs text-stone-400 border-t border-stone-100 pt-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span>Creado por</span>
                  <span className={`font-bold px-2 py-1 rounded-full ${getGroupColor(menu.createdBy)}`}>
                    {menu.group ? `Grupo ${menu.group}` : menu.createdBy}
                  </span>
                </div>
                {menu.group && (
                  <div className="text-[10px] text-stone-500 text-right leading-tight">
                    {users.filter(u => u.group === menu.group).map(u => u.name).join(', ')}
                  </div>
                )}
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
          <div ref={printRef} className="print-container px-12 py-12 bg-white text-stone-900 font-serif w-[794px] h-[1122px] mx-auto flex flex-col items-center relative overflow-hidden">
            <style>{`
              .print-container { background-color: #ffffff !important; color: #1c1917 !important; }
              .print-container .text-stone-900 { color: #1c1917 !important; }
              .print-container .text-stone-800 { color: #292524 !important; }
              .print-container .text-stone-700 { color: #44403c !important; }
              .print-container .text-stone-600 { color: #57534e !important; }
              .print-container .text-stone-500 { color: #78716c !important; }
              .print-container .text-stone-400 { color: #a8a29e !important; }
              .print-container .bg-white { background-color: #ffffff !important; }
              .print-container .bg-stone-300 { background-color: #d6d3d1 !important; }
              .print-container .border-stone-800 { border-color: #292524 !important; }
              .print-container .border-stone-300 { border-color: #d6d3d1 !important; }
            `}</style>
            {/* Elegant Borders */}
            <div className="absolute inset-4 border-2 border-stone-800 pointer-events-none"></div>
            <div className="absolute inset-6 border border-stone-300 pointer-events-none"></div>
            
            <div className="z-10 w-full flex flex-col items-center h-full">
              <div className="text-center mb-6 w-full pt-6">
                <div className="flex justify-center mb-4">
                  {settings?.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="h-16 object-contain" crossOrigin="anonymous" />
                  ) : (
                    <Utensils className="text-stone-800" size={28} strokeWidth={1.5} />
                  )}
                </div>
                <div className="text-stone-500 text-[10px] tracking-[0.4em] uppercase mb-3 font-sans font-medium">Propuesta Gastronómica</div>
                <h1 className="text-4xl font-serif font-bold mb-3 text-stone-900 tracking-tight leading-tight px-12 uppercase">{printingMenu.nameES}</h1>
                {printingMenu.eventDate && <h2 className="text-lg text-stone-600 font-serif mb-1">{printingMenu.eventDate}{printingMenu.eventTime ? ` a las ${printingMenu.eventTime}` : ''}</h2>}
                {printingMenu.eventPlace && <h2 className="text-lg text-stone-600 font-serif mb-3">{printingMenu.eventPlace}</h2>}
                
                <div className="flex items-center justify-center gap-6 mt-6">
                  <div className="h-px w-16 bg-stone-300"></div>
                  <div className="text-[11px] tracking-[0.3em] uppercase text-stone-800 font-sans font-semibold">
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

              <div className="space-y-6 mb-8 w-full flex flex-col items-center max-w-2xl flex-1 justify-center">
                {printingMenu.recipes.map((recipeId, index) => {
                  const recipe = recipes.find(r => r.id === recipeId);
                  if (!recipe) return null;
                  const recipeAllergens = getMenuAllergens([recipe.id], ingredients, recipes);
                  return (
                    <div key={recipe.id} className="text-center w-full">
                      <h3 className="text-[12px] font-serif font-bold mb-0.5 text-stone-900 tracking-wide uppercase">{recipe.nameES}</h3>
                      {recipe.descriptionES && (
                        <p className="text-stone-600 text-[8px] italic mb-1 leading-relaxed px-20 max-w-sm mx-auto">{recipe.descriptionES}</p>
                      )}
                      {recipeAllergens.length > 0 && (
                        <div className="flex justify-center gap-2 mt-2 opacity-60">
                          {recipeAllergens.map(a => {
                            const allergen = ALLERGENS.find(al => al.id === a);
                            return allergen ? (
                              <span key={a} title={allergen.name} className="text-xs">{allergen.icon}</span>
                            ) : null;
                          })}
                        </div>
                      )}
                      {index < printingMenu.recipes.length - 1 && (
                        <div className="mt-2 flex justify-center">
                          <div className="w-8 h-px bg-stone-300"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto w-full flex flex-col items-center pb-6">
                <div className="text-center mb-6">
                  <div className="text-3xl font-serif font-bold text-stone-900 mb-2">{printingMenu.price.toFixed(2)} €</div>
                  <div className="text-[9px] text-stone-500 uppercase tracking-[0.3em] font-sans font-medium">Precio por persona · IGIC incluido</div>
                </div>

                <div className="pt-6 border-t border-stone-300 w-full max-w-md text-center">
                  <p className="text-[8px] text-stone-500 uppercase tracking-[0.25em] font-sans leading-loose px-4">
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
          <div ref={printEquipmentRef} className="print-container px-16 py-20 bg-white text-stone-900 font-serif w-[794px] min-h-[1122px] mx-auto flex flex-col relative overflow-hidden">
            <style>{`
              .print-container { background-color: #ffffff !important; color: #1c1917 !important; }
              .print-container .text-stone-900 { color: #1c1917 !important; }
              .print-container .text-stone-800 { color: #292524 !important; }
              .print-container .text-stone-700 { color: #44403c !important; }
              .print-container .text-stone-600 { color: #57534e !important; }
              .print-container .text-stone-500 { color: #78716c !important; }
              .print-container .text-stone-400 { color: #a8a29e !important; }
              .print-container .text-stone-300 { color: #d6d3d1 !important; }
              .print-container .text-teal-900 { color: #134e4a !important; }
              .print-container .text-teal-800 { color: #115e59 !important; }
              .print-container .bg-white { background-color: #ffffff !important; }
              .print-container .bg-stone-300 { background-color: #d6d3d1 !important; }
              .print-container .bg-stone-50\\/50 { background-color: rgba(250, 250, 249, 0.5) !important; }
              .print-container .bg-teal-50\\/50 { background-color: rgba(240, 253, 250, 0.5) !important; }
              .print-container .border-stone-800 { border-color: #292524 !important; }
              .print-container .border-stone-300 { border-color: #d6d3d1 !important; }
              .print-container .border-stone-200 { border-color: #e7e5e4 !important; }
              .print-container .border-stone-100 { border-color: #f5f5f4 !important; }
              .print-container .border-teal-100 { border-color: #ccfbf1 !important; }
            `}</style>
            <div className="z-10 w-full">
              <div className="border-b border-stone-200 pb-8 mb-12">
                <div className="text-stone-400 text-[10px] tracking-[0.4em] uppercase mb-4 font-sans font-medium">Listado de Producción</div>
                <h1 className="text-4xl font-display font-medium text-stone-800 tracking-tight mb-2">{printingEquipmentMenu.nameES}</h1>
                <div className="flex items-center gap-4 text-stone-500 text-sm font-sans flex-wrap">
                  <span className="uppercase tracking-widest">{printingEquipmentMenu.type}</span>
                  <span className="text-stone-300">|</span>
                  <span>{printingEquipmentMenu.location === 'centro' ? 'En el centro' : 'Fuera del centro'}</span>
                  {printingEquipmentMenu.eventDate && (
                    <>
                      <span className="text-stone-300">|</span>
                      <span>{printingEquipmentMenu.eventDate}{printingEquipmentMenu.eventTime ? ` a las ${printingEquipmentMenu.eventTime}` : ''}</span>
                    </>
                  )}
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

                <div className="grid grid-cols-3 gap-4">
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
                    <label className="block text-sm font-medium text-stone-700 mb-1">Hora del Evento</label>
                    <input
                      type="time"
                      value={formData.eventTime || ''}
                      onChange={e => setFormData({...formData, eventTime: e.target.value})}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                      placeholder="Buscar receta para añadir..."
                      value={recipeSearch}
                      onChange={(e) => setRecipeSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                    {recipeSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {recipes.filter(r => r.nameES.toLowerCase().includes(recipeSearch.toLowerCase()) && !formData.recipes.includes(r.id)).map(recipe => (
                          <button
                            key={recipe.id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, recipes: [...prev.recipes, recipe.id] }));
                              setRecipeSearch('');
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-stone-50 text-sm flex justify-between items-center"
                          >
                            <span className="font-medium text-stone-900">{recipe.nameES}</span>
                            <span className="text-xs text-stone-500">{recipe.totalCost.toFixed(2)} €</span>
                          </button>
                        ))}
                        {recipes.filter(r => r.nameES.toLowerCase().includes(recipeSearch.toLowerCase()) && !formData.recipes.includes(r.id)).length === 0 && (
                          <div className="px-4 py-2 text-sm text-stone-500 text-center">No hay más recetas que coincidan</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                    {formData.recipes.length === 0 ? (
                      <p className="text-sm text-stone-500 text-center py-4">No hay recetas añadidas a este menú.</p>
                    ) : (
                      <div className="space-y-2">
                        {formData.recipes.map((recipeId, index) => {
                          const recipe = recipes.find(r => r.id === recipeId);
                          if (!recipe) return null;
                          return (
                            <div key={recipeId} className="flex items-center gap-3 p-2 bg-white border border-stone-200 rounded-lg">
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (index > 0) {
                                      const newRecipes = [...formData.recipes];
                                      [newRecipes[index - 1], newRecipes[index]] = [newRecipes[index], newRecipes[index - 1]];
                                      setFormData(prev => ({ ...prev, recipes: newRecipes }));
                                    }
                                  }}
                                  disabled={index === 0}
                                  className="text-stone-400 hover:text-teal-600 disabled:opacity-30"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (index < formData.recipes.length - 1) {
                                      const newRecipes = [...formData.recipes];
                                      [newRecipes[index + 1], newRecipes[index]] = [newRecipes[index], newRecipes[index + 1]];
                                      setFormData(prev => ({ ...prev, recipes: newRecipes }));
                                    }
                                  }}
                                  disabled={index === formData.recipes.length - 1}
                                  className="text-stone-400 hover:text-teal-600 disabled:opacity-30"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                </button>
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-stone-900">{recipe.nameES}</div>
                                <div className="text-xs text-stone-500">{recipe.totalCost.toFixed(2)} € coste</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleRecipe(recipe.id)}
                                className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          );
                        })}
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
      {/* Modal Evaluation */}
      {evaluateModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-stone-100 overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-stone-900 mb-4 tracking-tight">Evaluar Menú</h2>
              <p className="text-stone-500 text-sm mb-6">Asigna una puntuación y da una retroalimentación a los alumnos sobre su menú.</p>
              
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
                    onClick={() => setEvaluateModal({ isOpen: false, menuId: null, score: 0, feedback: '' })}
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