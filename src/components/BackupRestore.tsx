import React, { useRef, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Download, Upload, Trash2, Database, X, CheckSquare, Square } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import ConfirmModal from './ConfirmModal';
import jsPDF from 'jspdf';

export default function BackupRestore() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
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
    data: { recipes: any[], menus: any[] } | null;
    selectedRecipes: Set<string>;
    selectedMenus: Set<string>;
  }>({
    isOpen: false,
    data: null,
    selectedRecipes: new Set(),
    selectedMenus: new Set()
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

      // Crear objeto JSON
      const exportData = {
        recipes: recipesToExport,
        menus: menusToExport,
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

      docPdf.save(`informe-cierre-curso-${timestamp}.pdf`);
      
      showToast('Exportación JSON y PDF completada con éxito', 'success');
    } catch (error) {
      console.error('Error al exportar:', error);
      showToast('Error al exportar los datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. VACIAR DATOS
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

  // 3. SELECCIONAR ARCHIVO Y MOSTRAR MODAL DE SELECCIÓN
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.recipes && !data.menus) {
        throw new Error('El archivo no tiene el formato correcto.');
      }

      setImportModal({
        isOpen: true,
        data,
        selectedRecipes: new Set((data.recipes || []).map((r: any) => r.id)),
        selectedMenus: new Set((data.menus || []).map((m: any) => m.id))
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

  const selectAll = () => {
    setImportModal(prev => {
      if (!prev.data) return prev;
      return {
        ...prev,
        selectedRecipes: new Set((prev.data.recipes || []).map((r: any) => r.id)),
        selectedMenus: new Set((prev.data.menus || []).map((m: any) => m.id))
      };
    });
  };

  const deselectAll = () => {
    setImportModal(prev => ({
      ...prev,
      selectedRecipes: new Set(),
      selectedMenus: new Set()
    }));
  };

  // 4. CONFIRMAR IMPORTACIÓN DE LOS ELEMENTOS SELECCIONADOS
  const handleConfirmImport = async () => {
    if (!importModal.data) return;
    
    setLoading(true);
    try {
      let importedCount = 0;

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
      setImportModal({ isOpen: false, data: null, selectedRecipes: new Set(), selectedMenus: new Set() });
    } catch (error) {
      console.error('Error al importar:', error);
      showToast('Error al importar los datos seleccionados.', 'error');
    } finally {
      setLoading(false);
    }
  };

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
                onClick={() => setImportModal({ isOpen: false, data: null, selectedRecipes: new Set(), selectedMenus: new Set() })}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg transition-colors hover:bg-stone-100"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 bg-white border-b border-stone-200 flex justify-between items-center">
              <span className="text-sm text-stone-600">
                Seleccionados: <span className="font-bold text-stone-900">{importModal.selectedRecipes.size + importModal.selectedMenus.size}</span> de { (importModal.data.recipes?.length || 0) + (importModal.data.menus?.length || 0) } elementos
              </span>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">Marcar todo</button>
                <button onClick={deselectAll} className="text-xs px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors">Desmarcar todo</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
                onClick={() => setImportModal({ isOpen: false, data: null, selectedRecipes: new Set(), selectedMenus: new Set() })}
                className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={loading || (importModal.selectedRecipes.size === 0 && importModal.selectedMenus.size === 0)}
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
        Utiliza estas herramientas al final del curso escolar. Podrás exportar un archivo de seguridad con todos los platos, elaborados y menús, junto a un informe en PDF. Luego podrás vaciar el sistema para dejarlo limpio para el año siguiente.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* Vaciar */}
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex flex-col items-start gap-3">
          <div className="w-10 h-10 bg-red-100 text-red-700 rounded-full flex items-center justify-center">
            <Trash2 size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-red-900">2. Vaciar Sistema</h3>
            <p className="text-xs text-red-700 mt-1 mb-3">Borra todos los platos, elaborados y menús para el nuevo curso.</p>
          </div>
          <button
            onClick={handleClearData}
            disabled={loading}
            className="w-full mt-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex justify-center disabled:opacity-50"
          >
            Limpiar Sistema
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
    </div>
  );
}
