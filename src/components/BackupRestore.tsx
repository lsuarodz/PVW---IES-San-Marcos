import React, { useRef, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Download, Upload, Trash2, Database, X, CheckSquare, Square, AlertTriangle, ShieldAlert, FileSpreadsheet, Sparkles } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import ConfirmModal from './ConfirmModal';
import ImportCatalogModal from './ImportCatalogModal';
import jsPDF from 'jspdf';

export default function BackupRestore() {
  const { showToast } = useToast();
  const { ingredients } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [deleteIngredientsModal, setDeleteIngredientsModal] = useState(false);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);

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

  const [importModal, setImportModal] = useState<{
    isOpen: boolean;
    data: { recipes?: any[], menus?: any[], ingredients?: any[] } | null;
    selectedRecipes: Set<string>;
    selectedMenus: Set<string>;
    selectedIngredients: Set<string>;
  }>({
    isOpen: false,
    data: null,
    selectedRecipes: new Set(),
    selectedMenus: new Set(),
    selectedIngredients: new Set()
  });

  // 1. EXPORTAR DATOS Y GENERAR PDF
  const handleExport = async () => {
    setLoading(true);
    try {
      // Obtener todas las recetas
      const recipesSnapshot = await getDocs(collection(db, 'recipes'));
      const allRecipes = recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filtrar solo platos y elaborados
      const recipesToExport = allRecipes.filter((r: any) => r.type === 'plato' || r.type === 'elaborado');
      
      // Obtener todos los menús
      const menusSnapshot = await getDocs(collection(db, 'menus'));
      const menusToExport = menusSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Obtener todos los ingredientes
      const ingredientsSnapshot = await getDocs(collection(db, 'ingredients'));
      const ingredientsToExport = ingredientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Crear objeto JSON
      const exportData = {
        recipes: recipesToExport,
        menus: menusToExport,
        ingredients: ingredientsToExport,
        exportDate: new Date().toISOString()
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().split('T')[0];
      
      // Descargar archivo JSON
      const a = document.createElement('a');
      a.href = url;
      a.download = `cierre-curso-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // --- GENERAR PDF ---
      const docPdf = new jsPDF();
      docPdf.setFontSize(18);
      docPdf.text('Informe de Cierre de Curso', 14, 22);
      docPdf.setFontSize(11);
      docPdf.text(`Fecha de exportación: ${new Date().toLocaleDateString()}`, 14, 30);
      docPdf.text(`Archivo de recuperación: cierre-curso-${timestamp}.json`, 14, 36);
      
      let y = 46;
      
      // Listar Menús
      docPdf.setFontSize(14);
      docPdf.text(`Menús exportados (${menusToExport.length}):`, 14, y);
      y += 8;
      docPdf.setFontSize(10);
      menusToExport.forEach((m: any) => {
        if (y > 280) { docPdf.addPage(); y = 20; }
        docPdf.text(`- ${m.nameES || m.name || 'Sin nombre'}`, 14, y);
        y += 6;
      });
      y += 4;

      // Listar Platos
      const platos = recipesToExport.filter((r: any) => r.type === 'plato');
      if (y > 260) { docPdf.addPage(); y = 20; }
      docPdf.setFontSize(14);
      docPdf.text(`Platos exportados (${platos.length}):`, 14, y);
      y += 8;
      docPdf.setFontSize(10);
      platos.forEach((p: any) => {
        if (y > 280) { docPdf.addPage(); y = 20; }
        docPdf.text(`- ${p.nameES || p.name || 'Sin nombre'}`, 14, y);
        y += 6;
      });
      y += 4;

      // Listar Elaborados
      const elaborados = recipesToExport.filter((r: any) => r.type === 'elaborado');
      if (y > 260) { docPdf.addPage(); y = 20; }
      docPdf.setFontSize(14);
      docPdf.text(`Elaborados exportados (${elaborados.length}):`, 14, y);
      y += 8;
      docPdf.setFontSize(10);
      elaborados.forEach((e: any) => {
        if (y > 280) { docPdf.addPage(); y = 20; }
        docPdf.text(`- ${e.nameES || e.name || 'Sin nombre'}`, 14, y);
        y += 6;
      });
      y += 4;

      // Listar Ingredientes
      if (y > 260) { docPdf.addPage(); y = 20; }
      docPdf.setFontSize(14);
      docPdf.text(`Ingredientes exportados (${ingredientsToExport.length}):`, 14, y);
      y += 8;
      docPdf.setFontSize(10);
      ingredientsToExport.slice(0, 80).forEach((ing: any) => {
        if (y > 280) { docPdf.addPage(); y = 20; }
        docPdf.text(`- ${ing.nameES || ing.name || 'Sin nombre'} (${ing.costPerUnit || 0}€/${ing.unit || 'ud'})`, 14, y);
        y += 6;
      });
      if (ingredientsToExport.length > 80) {
        if (y > 280) { docPdf.addPage(); y = 20; }
        docPdf.text(`... y ${ingredientsToExport.length - 80} ingredientes más.`, 14, y);
      }

      docPdf.save(`informe-cierre-curso-${timestamp}.pdf`);
      
      showToast('Exportación JSON y PDF completada con éxito', 'success');
    } catch (error) {
      console.error('Error al exportar:', error);
      showToast('Error al exportar los datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. VACIAR DATOS (PLATOS, ELABORADOS Y MENÚS)
  const handleClearData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Vaciar Platos, Elaborados y Menús',
      message: '¿Estás absolutamente seguro? Esta acción borrará todos los Platos, Elaborados y Menús de la base de datos. Se recomienda haber hecho una exportación antes.',
      isDestructive: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          const recipesSnapshot = await getDocs(collection(db, 'recipes'));
          const menusSnapshot = await getDocs(collection(db, 'menus'));
          
          let deletedCount = 0;
          
          for (const document of recipesSnapshot.docs) {
            const data = document.data();
            if (data.type === 'plato' || data.type === 'elaborado') {
              await deleteDoc(doc(db, 'recipes', document.id));
              deletedCount++;
            }
          }
          
          for (const document of menusSnapshot.docs) {
            await deleteDoc(doc(db, 'menus', document.id));
            deletedCount++;
          }
          
          showToast(`Programa limpio. Se han eliminado ${deletedCount} registros.`, 'success');
        } catch (error) {
          console.error('Error al vaciar los datos:', error);
          showToast('Error al limpiar la base de datos', 'error');
        } finally {
          setLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // 3. VACIAR TODOS LOS INGREDIENTES CON PREGUNTA DE SEGURIDAD
  const handleDeleteAllIngredients = async () => {
    setLoading(true);
    try {
      const ingredientsSnapshot = await getDocs(collection(db, 'ingredients'));
      const docs = ingredientsSnapshot.docs;
      const total = docs.length;

      if (total === 0) {
        showToast('No hay ingredientes para eliminar.', 'info');
        setDeleteIngredientsModal(false);
        setSecurityAnswer('');
        return;
      }

      // Firestore permite hasta 500 escrituras por batch; usamos bloques de 400 por margen de seguridad
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 400);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }

      showToast(`Se han eliminado ${total} ingredientes correctamente.`, 'success');
      setDeleteIngredientsModal(false);
      setSecurityAnswer('');
    } catch (error) {
      console.error('Error al borrar los ingredientes:', error);
      showToast('Error al eliminar los ingredientes de la base de datos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 4. SELECCIONAR ARCHIVO Y MOSTRAR MODAL DE SELECCIÓN
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.recipes && !data.menus && !data.ingredients) {
        throw new Error('El archivo no tiene el formato correcto.');
      }

      setImportModal({
        isOpen: true,
        data,
        selectedRecipes: new Set((data.recipes || []).map((r: any) => r.id)),
        selectedMenus: new Set((data.menus || []).map((m: any) => m.id)),
        selectedIngredients: new Set((data.ingredients || []).map((i: any) => i.id))
      });
      
    } catch (error) {
      console.error('Error al leer el archivo:', error);
      showToast('Error al leer el archivo. Verifica que sea un JSON válido.', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''; // reset input
    }
  };

  const toggleRecipeSelection = (id: string) => {
    const newSelection = new Set(importModal.selectedRecipes);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setImportModal({ ...importModal, selectedRecipes: newSelection });
  };

  const toggleMenuSelection = (id: string) => {
    const newSelection = new Set(importModal.selectedMenus);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setImportModal({ ...importModal, selectedMenus: newSelection });
  };

  const toggleIngredientSelection = (id: string) => {
    const newSelection = new Set(importModal.selectedIngredients);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setImportModal({ ...importModal, selectedIngredients: newSelection });
  };

  const selectAll = () => {
    setImportModal(prev => {
      if (!prev.data) return prev;
      return {
        ...prev,
        selectedRecipes: new Set((prev.data.recipes || []).map((r: any) => r.id)),
        selectedMenus: new Set((prev.data.menus || []).map((m: any) => m.id)),
        selectedIngredients: new Set((prev.data.ingredients || []).map((i: any) => i.id))
      };
    });
  };

  const deselectAll = () => {
    setImportModal(prev => ({
      ...prev,
      selectedRecipes: new Set(),
      selectedMenus: new Set(),
      selectedIngredients: new Set()
    }));
  };

  // 5. CONFIRMAR IMPORTACIÓN DE LOS ELEMENTOS SELECCIONADOS
  const handleConfirmImport = async () => {
    if (!importModal.data) return;
    
    setLoading(true);
    try {
      let importedCount = 0;

      // Importar ingredientes
      if (importModal.data.ingredients && Array.isArray(importModal.data.ingredients)) {
        for (const ingredient of importModal.data.ingredients) {
          if (importModal.selectedIngredients.has(ingredient.id)) {
            const { id, ...ingData } = ingredient;
            await setDoc(doc(db, 'ingredients', id), ingData);
            importedCount++;
          }
        }
      }

      // Importar recetas (platos y elaborados)
      if (importModal.data.recipes && Array.isArray(importModal.data.recipes)) {
        for (const recipe of importModal.data.recipes) {
          if (importModal.selectedRecipes.has(recipe.id)) {
            const { id, ...recipeData } = recipe;
            await setDoc(doc(db, 'recipes', id), recipeData);
            importedCount++;
          }
        }
      }

      // Importar menús
      if (importModal.data.menus && Array.isArray(importModal.data.menus)) {
        for (const menu of importModal.data.menus) {
          if (importModal.selectedMenus.has(menu.id)) {
            const { id, ...menuData } = menu;
            await setDoc(doc(db, 'menus', id), menuData);
            importedCount++;
          }
        }
      }

      showToast(`Importación exitosa. Se han cargado ${importedCount} registros.`, 'success');
      setImportModal({ isOpen: false, data: null, selectedRecipes: new Set(), selectedMenus: new Set(), selectedIngredients: new Set() });
    } catch (error) {
      console.error('Error al importar:', error);
      showToast('Error al importar los datos seleccionados.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalSelectedInImport = importModal.selectedRecipes.size + importModal.selectedMenus.size + importModal.selectedIngredients.size;
  const totalAvailableInImport = (importModal.data?.recipes?.length || 0) + (importModal.data?.menus?.length || 0) + (importModal.data?.ingredients?.length || 0);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 mb-8 border-l-4 border-l-blue-500">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => {
          setConfirmModal({ ...confirmModal, isOpen: false });
        }}
        isDestructive={confirmModal.isDestructive}
      />

      {/* MODAL CON PREGUNTA DE SEGURIDAD PARA BORRAR INGREDIENTES */}
      {deleteIngredientsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-red-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-2xl shrink-0">
                  <AlertTriangle size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-stone-900">
                    Borrar Catálogo de Ingredientes
                  </h3>
                  <p className="text-sm text-red-600 font-semibold mt-0.5">
                    Acción destructiva e irreversible
                  </p>
                </div>
                <button
                  onClick={() => {
                    setDeleteIngredientsModal(false);
                    setSecurityAnswer('');
                  }}
                  className="text-stone-400 hover:text-stone-600 transition-colors p-1 rounded-lg hover:bg-stone-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <p className="text-sm text-stone-600 leading-relaxed">
                  Estás a punto de eliminar de forma permanente todos los <strong className="text-stone-900 font-semibold">{ingredients.length} ingredientes</strong> registrados en el economato de la aplicación.
                </p>

                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
                  <p className="font-semibold flex items-center gap-1.5 text-amber-800">
                    <ShieldAlert size={16} className="shrink-0 text-amber-700" />
                    Advertencia sobre el impacto en el sistema:
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    Las recetas y elaborados no se borrarán, pero los ingredientes que las componen perderán sus precios unitarios y referencias de inventario.
                  </p>
                  <p className="font-medium text-amber-900 pt-0.5">
                    Se recomienda descargar primero una copia de seguridad mediante el botón "Descargar Copia".
                  </p>
                </div>

                {/* Pregunta de Seguridad */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                    Pregunta de seguridad:
                  </label>
                  <p className="text-xs text-stone-600 mb-2 leading-relaxed">
                    ¿Confirmas la eliminación permanente de todos los ingredientes? Para autorizar el borrado, escribe la palabra <strong className="text-red-600 font-mono font-bold">BORRAR</strong> en mayúsculas:
                  </p>
                  <input
                    type="text"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Escribe BORRAR aquí"
                    className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono tracking-wider font-semibold"
                    autoFocus
                  />
                </div>
              </div>
            </div>

            <div className="bg-stone-50 px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-2.5 border-t border-stone-200">
              <button
                type="button"
                onClick={() => {
                  setDeleteIngredientsModal(false);
                  setSecurityAnswer('');
                }}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-200 bg-stone-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAllIngredients}
                disabled={loading || securityAnswer.trim().toUpperCase() !== 'BORRAR'}
                className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                {loading ? 'Eliminando...' : 'Confirmar y Borrar Ingredientes'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL DE SELECCIÓN DE IMPORTACIÓN */}
      {importModal.isOpen && importModal.data && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50">
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Upload size={20} className="text-emerald-600" />
                Seleccionar Elementos para Importar
              </h2>
              <button
                onClick={() => setImportModal({ isOpen: false, data: null, selectedRecipes: new Set(), selectedMenus: new Set(), selectedIngredients: new Set() })}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg transition-colors hover:bg-stone-100"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 bg-white border-b border-stone-200 flex justify-between items-center">
              <span className="text-sm text-stone-600">
                Seleccionados: <span className="font-bold text-stone-900">{totalSelectedInImport}</span> de {totalAvailableInImport} elementos
              </span>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">Marcar todo</button>
                <button onClick={deselectAll} className="text-xs px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">Desmarcar todo</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Ingredientes */}
              {importModal.data.ingredients && importModal.data.ingredients.length > 0 && (
                <div>
                  <h3 className="font-semibold text-stone-800 mb-3 text-sm uppercase tracking-wider">Ingredientes ({importModal.data.ingredients.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {importModal.data.ingredients.map((ing: any) => {
                      const isSelected = importModal.selectedIngredients.has(ing.id);
                      return (
                        <div 
                          key={ing.id} 
                          onClick={() => toggleIngredientSelection(ing.id)}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:bg-stone-50'}`}
                        >
                          <div className={`mt-0.5 ${isSelected ? 'text-emerald-600' : 'text-stone-400'}`}>
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-stone-800 block">{ing.nameES || ing.name || 'Sin nombre'}</span>
                            <span className="text-xs text-stone-500">{ing.costPerUnit || 0} € / {ing.unit || 'ud'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Menús */}
              {importModal.data.menus && importModal.data.menus.length > 0 && (
                <div>
                  <h3 className="font-semibold text-stone-800 mb-3 text-sm uppercase tracking-wider">Menús ({importModal.data.menus.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {importModal.data.menus.map((m: any) => {
                      const isSelected = importModal.selectedMenus.has(m.id);
                      return (
                        <div 
                          key={m.id} 
                          onClick={() => toggleMenuSelection(m.id)}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:bg-stone-50'}`}
                        >
                          <div className={`mt-0.5 ${isSelected ? 'text-emerald-600' : 'text-stone-400'}`}>
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                          </div>
                          <span className="text-sm font-medium text-stone-800">{m.nameES || m.name || 'Sin nombre'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Platos */}
              {importModal.data.recipes && importModal.data.recipes.filter((r: any) => r.type === 'plato').length > 0 && (
                <div>
                  <h3 className="font-semibold text-stone-800 mb-3 text-sm uppercase tracking-wider">Platos</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {importModal.data.recipes.filter((r: any) => r.type === 'plato').map((p: any) => {
                      const isSelected = importModal.selectedRecipes.has(p.id);
                      return (
                        <div 
                          key={p.id} 
                          onClick={() => toggleRecipeSelection(p.id)}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:bg-stone-50'}`}
                        >
                          <div className={`mt-0.5 ${isSelected ? 'text-emerald-600' : 'text-stone-400'}`}>
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                          </div>
                          <span className="text-sm font-medium text-stone-800">{p.nameES || p.name || 'Sin nombre'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Elaborados */}
              {importModal.data.recipes && importModal.data.recipes.filter((r: any) => r.type === 'elaborado').length > 0 && (
                <div>
                  <h3 className="font-semibold text-stone-800 mb-3 text-sm uppercase tracking-wider">Elaborados</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {importModal.data.recipes.filter((r: any) => r.type === 'elaborado').map((e: any) => {
                      const isSelected = importModal.selectedRecipes.has(e.id);
                      return (
                        <div 
                          key={e.id} 
                          onClick={() => toggleRecipeSelection(e.id)}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:bg-stone-50'}`}
                        >
                          <div className={`mt-0.5 ${isSelected ? 'text-emerald-600' : 'text-stone-400'}`}>
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                          </div>
                          <span className="text-sm font-medium text-stone-800">{e.nameES || e.name || 'Sin nombre'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end gap-3">
              <button
                onClick={() => setImportModal({ isOpen: false, data: null, selectedRecipes: new Set(), selectedMenus: new Set(), selectedIngredients: new Set() })}
                className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={loading || totalSelectedInImport === 0}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-medium transition-colors"
              >
                {loading ? 'Importando...' : 'Importar Seleccionados'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <h2 className="text-lg font-semibold text-stone-900 mb-2 flex items-center gap-2">
        <Database size={20} className="text-blue-600" />
        Cierre de Curso (Copias de Seguridad)
      </h2>
      <p className="text-sm text-stone-600 mb-6 max-w-3xl">
        Utiliza estas herramientas al final del curso escolar. Podrás exportar un archivo de seguridad con todos los platos, elaborados, menús e ingredientes, junto a un informe en PDF. Luego podrás vaciar el sistema de forma selectiva para dejarlo preparado para el año siguiente.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Exportar */}
        <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl flex flex-col items-start gap-3">
          <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center">
            <Download size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-stone-900">1. Exportar y Guardar</h3>
            <p className="text-xs text-stone-500 mt-1 mb-3">Genera un archivo .json con los datos y un informe en PDF.</p>
          </div>
          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full mt-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex justify-center disabled:opacity-50"
          >
            Descargar Copia
          </button>
        </div>

        {/* Vaciar Recetas y Menús */}
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col items-start gap-3">
          <div className="w-10 h-10 bg-red-100 text-red-700 rounded-full flex items-center justify-center">
            <Trash2 size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-red-900">2. Vaciar Recetas y Menús</h3>
            <p className="text-xs text-red-700 mt-1 mb-3">Borra todos los platos, elaborados y menús para el nuevo curso.</p>
          </div>
          <button
            onClick={handleClearData}
            disabled={loading}
            className="w-full mt-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex justify-center disabled:opacity-50"
          >
            Limpiar Recetas
          </button>
        </div>

        {/* Borrar Ingredientes */}
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex flex-col items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center">
            <Trash2 size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-amber-950">3. Borrar Ingredientes</h3>
            <p className="text-xs text-amber-800 mt-1 mb-3">
              Elimina todos los ingredientes ({ingredients.length} registrados). Requiere confirmación de seguridad.
            </p>
          </div>
          <button
            onClick={() => {
              setSecurityAnswer('');
              setDeleteIngredientsModal(true);
            }}
            disabled={loading || ingredients.length === 0}
            className="w-full mt-auto bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 size={16} />
            Borrar Ingredientes
          </button>
        </div>

        {/* Importar */}
        <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl flex flex-col items-start gap-3">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center">
            <Upload size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-stone-900">Restaurar Copia</h3>
            <p className="text-xs text-stone-500 mt-1 mb-3">Carga un archivo .json de un cierre de curso anterior.</p>
          </div>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-full mt-auto bg-stone-800 hover:bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex justify-center disabled:opacity-50"
          >
            Cargar Archivo
          </button>
        </div>
      </div>

      {/* Catálogo Preparado para el nuevo curso */}
      <div className="mt-6 p-5 bg-teal-50/70 border border-teal-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-teal-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-xs">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h3 className="font-bold text-teal-950 text-sm sm:text-base">Catálogo de Ingredientes para el Nuevo Curso</h3>
            <p className="text-xs text-teal-700 mt-0.5">
              Dispones del catálogo completo preparado (447 ingredientes con precios, formatos y categorías) o puedes pegar cualquier tabla de Excel.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsCatalogModalOpen(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-xs shrink-0 flex items-center gap-2"
        >
          <Sparkles size={16} />
          <span>Cargar Catálogo (447)</span>
        </button>
      </div>

      <ImportCatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
      />
    </div>
  );
}
