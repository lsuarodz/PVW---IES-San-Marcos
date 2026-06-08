import React, { useState, useMemo, useRef } from 'react';
import { generatePDF } from '../utils/pdf';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { WorkList, WorkListTask } from '../types';
import { 
  Plus, Edit2, Trash2, Printer, GripVertical, Check, X, Search, ClipboardList 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableTableRowProps {
  task: WorkListTask;
  index: number;
  onUpdate: (id: string, field: keyof WorkListTask, value: any) => void;
  onDelete: (id: string) => void;
  teachers: string[];
  processes: string[];
  suggestedElements?: string[];
  suggestedPlatos?: string[];
  isExportingPDF?: boolean;
}

const getCourseColor = (course: string) => {
  switch (course) {
    case '1ºCOCINA': return 'text-amber-600';
    case '2ºCOCINA': return 'text-blue-600';
    case '1ºPANADERÍA': return 'text-pink-600';
    case '2ºPANADERÍA': return 'text-purple-600';
    case '2ºSUPERIOR COCINA': return 'text-teal-600';
    default: return 'text-teal-600';
  }
};

const getProcessColor = (process: string) => {
  const p = process?.toUpperCase().trim() || '';
  if (p.includes('ELABORAR')) return 'text-red-600';
  if (p.includes('DESCONGELAR')) return 'text-blue-600';
  if (p.includes('PREPARAR')) return 'text-green-600';
  if (p.includes('HORNEAR')) return 'text-orange-600';
  if (p.includes('MEZCLAR')) return 'text-purple-600';
  if (p.includes('LIMPIAR')) return 'text-teal-600';
  if (p.includes('CORTAR')) return 'text-pink-600';
  if (p.includes('ENVASAR') || p.includes('GUARDAR')) return 'text-indigo-600';
  if (!p) return 'text-stone-600';
  
  const colors = [
    'text-red-600', 'text-orange-600', 'text-amber-600', 'text-green-600',
    'text-emerald-600', 'text-teal-600', 'text-cyan-600', 'text-sky-600',
    'text-blue-600', 'text-indigo-600', 'text-violet-600', 'text-purple-600',
    'text-fuchsia-600', 'text-pink-600', 'text-rose-600'
  ];
  let hash = 0;
  for (let i = 0; i < p.length; i++) {
    hash = p.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

function SortableTableRow({ task, index, onUpdate, onDelete, teachers, processes, suggestedElements = [], suggestedPlatos = [], isExportingPDF }: SortableTableRowProps) {
  const [showTeachers, setShowTeachers] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  // Check if current process is in the options list
  const currentProcessLower = task.process?.toLowerCase().trim() || '';
  const processOptions = [...processes];
  if (currentProcessLower && !processes.map(p => p.toLowerCase()).includes(currentProcessLower)) {
    processOptions.push(task.process);
  }

  return (
    <tr ref={setNodeRef} style={style} className={`bg-white border-b border-stone-200 ${isDragging ? 'shadow-lg' : ''} print:border-stone-800`}>
      {!isExportingPDF && (
        <td className="px-2 py-2 w-10 print:hidden cursor-move" {...attributes} {...listeners}>
          <GripVertical size={16} className="text-stone-400" />
        </td>
      )}
      <td className="px-2 py-2">
        {isExportingPDF ? (
          <span className={`text-xs uppercase font-extrabold ${getProcessColor(task.process)}`}>
            {task.process || '--'}
          </span>
        ) : (
          <>
            <span className={`hidden print:inline-block text-xs uppercase font-extrabold ${getProcessColor(task.process)}`}>
              {task.process || '--'}
            </span>
            <select 
              value={task.process} 
              onChange={e => onUpdate(task.id, 'process', e.target.value)}
              className={`w-full text-xs uppercase font-medium bg-transparent border-none focus:ring-1 focus:ring-teal-500 rounded p-1 print:hidden ${getProcessColor(task.process)}`}
            >
              <option value="" className="text-stone-600">--</option>
              {processOptions.map((p, i) => (
                <option key={i} value={p} className={`${getProcessColor(p)} font-semibold uppercase`}>
                  {p.toUpperCase()}
                </option>
              ))}
            </select>
          </>
        )}
      </td>
      <td className="px-2 py-2">
        {isExportingPDF ? (
          <span className="text-xs text-stone-900 font-bold uppercase">
            {task.element || '--'}
          </span>
        ) : (
          <>
            <span className="hidden print:inline-block text-xs text-stone-900 font-bold uppercase">
              {task.element || '--'}
            </span>
            <input 
              type="text" 
              list="elements-list"
              value={task.element} 
              onChange={e => onUpdate(task.id, 'element', e.target.value)}
              className="w-full text-xs text-stone-900 bg-transparent border-none focus:ring-1 focus:ring-teal-500 rounded p-1 print:hidden"
              placeholder="DESCONGELAR PESCADO"
            />
          </>
        )}
      </td>
      <td className="px-2 py-2">
        {isExportingPDF ? (
          <span className="text-xs text-stone-900 uppercase platos-col-text">
            {task.plato || '--'}
          </span>
        ) : (
          <>
            <span className="hidden print:inline-block text-xs text-stone-900 uppercase platos-col-text">
              {task.plato || '--'}
            </span>
            <input 
              type="text" 
              list="platos-list"
              value={task.plato || ''} 
              onChange={e => onUpdate(task.id, 'plato', e.target.value)}
              className="w-full text-xs text-stone-900 bg-transparent border-none focus:ring-1 focus:ring-teal-500 rounded p-1 print:hidden"
              placeholder="Ej: Miniburguer de Ternera, queso ahumado y Rúcula"
            />
          </>
        )}
      </td>
      <td className="px-2 py-2">
        {isExportingPDF ? (
          <span className="text-xs text-stone-600 text-center block w-full uppercase dia-col-text">
            {task.priority || '--'}
          </span>
        ) : (
          <>
            <span className="hidden print:inline-block text-xs text-stone-600 text-center w-full uppercase dia-col-text">
              {task.priority || '--'}
            </span>
            <input 
              type="text" 
              value={task.priority} 
              onChange={e => onUpdate(task.id, 'priority', e.target.value)}
              className="w-full text-xs text-stone-600 bg-transparent border-none focus:ring-1 focus:ring-teal-500 rounded p-1 print:hidden text-center"
              placeholder="2 JUNIO"
            />
          </>
        )}
      </td>
      <td className="px-2 py-2 relative">
        {isExportingPDF ? (
          <span className="text-xs text-stone-600 font-medium text-center block w-full uppercase">
            {task.professor || '--'}
          </span>
        ) : (
          <>
            <span className="hidden print:inline-block text-xs text-stone-600 text-center w-full uppercase font-medium">
              {task.professor || '--'}
            </span>
            <input 
              type="text" 
              value={task.professor} 
              onChange={e => onUpdate(task.id, 'professor', e.target.value.toUpperCase())}
              onFocus={() => setShowTeachers(true)}
              onBlur={() => setTimeout(() => setShowTeachers(false), 200)}
              className="w-full text-xs text-stone-600 bg-transparent border-none focus:ring-1 focus:ring-teal-500 rounded p-1 uppercase text-center print:hidden"
              placeholder="JORGE / DOCENTE"
            />
            {showTeachers && teachers.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-stone-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                {teachers.map(t => {
                  const selected = (task.professor || '').split(',').map(s => s.trim()).includes(t);
                  return (
                    <label key={t} className="flex items-center gap-2 px-3 py-2 hover:bg-stone-50 cursor-pointer text-xs">
                      <input 
                        type="checkbox" 
                        checked={selected}
                        onChange={(e) => {
                          let current = (task.professor || '').split(',').map(s => s.trim()).filter(Boolean);
                          if (e.target.checked) {
                            current.push(t);
                          } else {
                            current = current.filter(c => c !== t);
                          }
                          onUpdate(task.id, 'professor', current.join(', '));
                        }}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-stone-700">{t}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </>
        )}
      </td>
      <td className="px-2 py-2 text-center">
        <div className="w-5 h-5 mx-auto border-2 border-stone-800 rounded-sm print:border-black flex items-center justify-center">
          {task.completed && <Check size={14} className="text-stone-900" />}
        </div>
        <button 
          className="print:hidden text-[10px] mt-1 text-stone-400 hover:text-stone-700"
          onClick={() => onUpdate(task.id, 'completed', !task.completed)}
        >
          {task.completed ? 'Desmarcar' : 'Marcar'}
        </button>
      </td>
      <td className="px-2 py-2">
        {isExportingPDF ? (
          <span className={`text-xs font-semibold uppercase text-center block w-full ${getCourseColor(task.student)}`}>
            {task.student || '--'}
          </span>
        ) : (
          <>
            <span className={`hidden print:inline-block text-xs font-semibold text-center w-full ${getCourseColor(task.student)}`}>
              {task.student || '--'}
            </span>
            <select 
              value={task.student} 
              onChange={e => onUpdate(task.id, 'student', e.target.value)}
              className={`w-full text-xs font-semibold bg-transparent border-none focus:ring-1 focus:ring-teal-500 rounded p-1 print:hidden ${getCourseColor(task.student)}`}
            >
              <option value="" className="text-stone-600">Seleccionar curso...</option>
              <option value="1ºCOCINA" className="text-amber-600 font-semibold">1º COCINA</option>
              <option value="2ºCOCINA" className="text-blue-600 font-semibold">2º COCINA</option>
              <option value="1ºPANADERÍA" className="text-pink-600 font-semibold">1º PANADERÍA</option>
              <option value="2ºPANADERÍA" className="text-purple-600 font-semibold">2º PANADERÍA</option>
              <option value="2ºSUPERIOR COCINA" className="text-teal-600 font-semibold">2º SUPERIOR COCINA</option>
            </select>
          </>
        )}
      </td>
      {!isExportingPDF && (
        <td className="px-2 py-2 w-10 print:hidden text-center">
          <button onClick={() => onDelete(task.id)} className="text-stone-400 hover:text-red-600 p-1 rounded hover:bg-stone-100">
            <Trash2 size={16} />
          </button>
        </td>
      )}
    </tr>
  );
}

export default function WorkLists() {
  const { workLists, recipes, users, loadingData, settings } = useData();
  const { appUser } = useAuth();
  const { showToast } = useToast();
  
  const teachers = useMemo(() => {
    return users?.filter(u => u.role === 'docente').map(u => u.name?.toUpperCase() || u.email?.toUpperCase()) || [];
  }, [users]);
  
  const processes = useMemo(() => settings?.processes || [], [settings]);

  const [editingList, setEditingList] = useState<WorkList | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const suggestedElements = useMemo(() => {
    const list = new Set<string>();
    workLists.forEach(wl => {
      wl.tasks?.forEach(t => {
        if (t.element) list.add(t.element);
      });
    });
    editingList?.tasks?.forEach(t => {
      if (t.element) list.add(t.element);
    });
    return Array.from(list).sort();
  }, [workLists, editingList]);

  const suggestedPlatos = useMemo(() => {
    const list = new Set<string>();
    recipes.forEach(r => {
      if (r.nameES) list.add(r.nameES);
    });
    workLists.forEach(wl => {
      wl.tasks?.forEach(t => {
        if (t.plato) list.add(t.plato);
      });
    });
    editingList?.tasks?.forEach(t => {
      if (t.plato) list.add(t.plato);
    });
    return Array.from(list).sort();
  }, [recipes, workLists, editingList]);

  const exportPDF = async () => {
    if (!printRef.current || !editingList) return;
    try {
      setIsExportingPDF(true);
      showToast('Generando PDF formateado...', 'info');
      // Esperar un breve momento para que React re-renderice la vista en modo estático
      await new Promise((resolve) => setTimeout(resolve, 350));

      const fileName = `lista_trabajo_${(editingList.title || 'sin_nombre')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/_+/g, '_')}.pdf`;

      await generatePDF(printRef.current, {
        filename: fileName,
        margin: [0.5, 0.4, 0.8, 0.4], // Top 0.5in, Right 0.4in, Bottom 0.8in, Left 0.4in
        pagebreak: { mode: 'css', avoid: 'tr' },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        },
        jsPDF: {
          unit: 'in',
          format: 'a4',
          orientation: 'landscape'
        }
      });
      showToast('¡PDF de cocina generado con éxito!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al exportar PDF', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  
  // Managing processes
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [newProcess, setNewProcess] = useState('');

  // States for the fast "Add Task from Recipe" feature
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  
  const handleAddProcess = async () => {
    const trimmed = newProcess.trim().toUpperCase();
    if (!trimmed) return;
    if (processes.includes(trimmed)) {
      showToast('Este proceso ya existe', 'error');
      return;
    }
    try {
      const updatedProcesses = [...processes, trimmed].sort();
      await setDoc(doc(db, 'settings', 'global'), { processes: updatedProcesses }, { merge: true });
      setNewProcess('');
      showToast('Proceso añadido', 'success');
    } catch (err) {
      showToast('Error al añadir proceso', 'error');
    }
  };

  const handleRemoveProcess = async (processToRemove: string) => {
    try {
      const updatedProcesses = processes.filter(p => p !== processToRemove);
      await setDoc(doc(db, 'settings', 'global'), { processes: updatedProcesses }, { merge: true });
      showToast('Proceso eliminado', 'success');
    } catch (err) {
      showToast('Error al eliminar proceso', 'error');
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredLists = useMemo(() => {
    return workLists.filter(list => 
      list.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      list.date.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [workLists, searchTerm]);

  const handleCreateNew = () => {
    setEditingList({
      id: crypto.randomUUID(),
      title: 'NUEVA LISTA DE TRABAJO',
      date: new Date().toLocaleDateString('es-ES'),
      pax: 35,
      tasks: [],
      createdBy: appUser?.name || '',
      createdAt: new Date().toISOString()
    });
    setIsModalOpen(true);
  };

  const handleEdit = (list: WorkList) => {
    setEditingList({ ...list });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta lista?')) {
      try {
        await deleteDoc(doc(db, 'work_lists', id));
        showToast('Lista eliminada', 'success');
      } catch (error: any) {
        showToast('Error al eliminar: ' + error.message, 'error');
      }
    }
  };

  const handleSave = async () => {
    if (!editingList) return;
    
    const { id, ...listData } = editingList;
    
    try {
      if (workLists.some(w => w.id === editingList.id)) {
        await updateDoc(doc(db, 'work_lists', editingList.id), {
          ...listData
        });
        showToast('Lista actualizada', 'success');
      } else {
        await setDoc(doc(db, 'work_lists', editingList.id), {
          ...listData,
          createdAt: new Date().toISOString()
        });
        showToast('Lista creada', 'success');
      }
    } catch (error: any) {
      showToast('Error al guardar: ' + error.message, 'error');
    }
  };

  const closeAndSave = async () => {
    await handleSave();
    setIsModalOpen(false);
    setEditingList(null);
  };

  // Task management within editing list
  const addTask = (elaborationsStr: string = '') => {
    if (!editingList) return;
    const newTask: WorkListTask = {
      id: crypto.randomUUID(),
      process: 'ELABORAR',
      element: '',
      plato: '',
      priority: '',
      professor: '',
      completed: false,
      student: 'Alumn Cocina',
      elaborations: elaborationsStr,
      order: editingList.tasks.length
    };
    
    setEditingList(prev => {
      if (!prev) return prev;
      return { ...prev, tasks: [...prev.tasks, newTask] };
    });
  };

  const addTaskFromRecipe = () => {
    if (!editingList || !selectedRecipeId) return;
    
    const recipe = recipes.find(r => r.id === selectedRecipeId);
    if (!recipe) return;
    
    setEditingList(prev => {
      if (!prev) return prev;
      
      let newTasks = [...prev.tasks];
      
      if (recipe.workListTasks && recipe.workListTasks.length > 0) {
        const generatedTasks = recipe.workListTasks.map((t, idx) => ({
          id: crypto.randomUUID(),
          process: t.process,
          element: t.element,
          plato: recipe.nameES,
          priority: '',
          professor: '',
          completed: false,
          student: 'Alumn Cocina',
          elaborations: recipe.nameES,
          order: prev.tasks.length + idx
        }));
        newTasks = [...newTasks, ...generatedTasks];
      } else {
        // Fallback to old behavior if no task templates exist
        newTasks.push({
          id: crypto.randomUUID(),
          process: 'ELABORAR',
          element: recipe.nameES,
          priority: '',
          professor: '',
          completed: false,
          student: 'Alumn Cocina',
          elaborations: recipe.nameES,
          order: prev.tasks.length
        });
      }
      
      return { ...prev, tasks: newTasks };
    });
    
    setSelectedRecipeId(''); // reset
  };

  const updateTask = (taskId: string, field: keyof WorkListTask, value: any) => {
    if (!editingList) return;
    setEditingList(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t)
      };
    });
  };

  const deleteTask = (taskId: string) => {
    if (!editingList) return;
    setEditingList(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== taskId)
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && editingList) {
      const oldIndex = editingList.tasks.findIndex(t => t.id === active.id);
      const newIndex = editingList.tasks.findIndex(t => t.id === over.id);
      
      setEditingList(prev => {
        if (!prev) return prev;
        const newTasks = arrayMove(prev.tasks, oldIndex, newIndex).map((t, i) => ({ ...t, order: i }));
        return { ...prev, tasks: newTasks };
      });
    }
  };

  if (loadingData) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  // Si estamos editando y en modo de impresión de un documento, ocupamos casi toda la pantalla
  if (isModalOpen && editingList) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col p-4 md:p-8 print:p-0 print:block">
        <datalist id="teachers-list">
          {teachers.map(t => <option key={t} value={t} />)}
        </datalist>
        <div className="flex justify-between items-center mb-6 print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={closeAndSave} className="text-stone-500 hover:text-stone-800">
              <X size={24} />
            </button>
            <h1 className="text-2xl font-bold text-stone-800">Editar Lista de Trabajo</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-2 px-4 py-2 bg-[#d97706] text-white rounded-lg hover:bg-[#b45309] font-medium transition-colors disabled:opacity-50"
              title="Generar PDF descargable para la cocina sin controles de edición"
            >
              <ClipboardList size={18} />
              {isExportingPDF ? 'Exportando...' : 'Exportar PDF Cocina'}
            </button>
            <button 
              onClick={exportPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-2 px-4 py-2 bg-stone-200 text-stone-800 rounded-lg hover:bg-stone-300 font-medium transition-colors disabled:opacity-50"
            >
              <Printer size={18} />
              Imprimir
            </button>
            <button 
              onClick={closeAndSave}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-colors"
            >
              <Check size={18} />
              Guardar y Cerrar
            </button>
          </div>
        </div>

        {/* Paper format for printing and editing */}
        <div ref={printRef} className={`bg-white rounded-xl shadow-sm border border-stone-200 overflow-visible print:overflow-visible flex-1 print:flex-none print:shadow-none print:border-none print:m-0 flex flex-col print:block max-w-[1400px] mx-auto w-full ${isExportingPDF ? 'print-export-mode' : ''}`}>
          <style>{`
            @media print {
              @page { size: landscape; margin: 15mm 10mm 20mm 10mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              table { font-size: 16px !important; }
              th, td { font-size: 16px !important; padding: 4px 6px !important; height: auto !important; }
              .text-xs { font-size: 16px !important; line-height: 1.5 !important; }
              .text-\\[11px\\] { font-size: 16px !important; }
              .text-\\[10px\\] { font-size: 16px !important; }
              .print\\:text-\\[10px\\] { font-size: 16px !important; }
              .platos-col-text { font-size: 11px !important; }
              .dia-col-text { font-size: 11px !important; }
            }
            .print-export-mode table { font-size: 16px !important; }
            .print-export-mode th, .print-export-mode td { font-size: 16px !important; padding: 4px 6px !important; height: auto !important; }
            .print-export-mode .text-xs { font-size: 16px !important; line-height: 1.5 !important; }
            .print-export-mode .text-\\[11px\\] { font-size: 16px !important; }
            .print-export-mode .text-\\[10px\\] { font-size: 16px !important; }
            .print-export-mode .print\\:text-\\[10px\\] { font-size: 16px !important; }
            .print-export-mode .print\\:hidden { display: none !important; }
            .print-export-mode .platos-col-text { font-size: 11px !important; }
            .print-export-mode .dia-col-text { font-size: 11px !important; }
          `}</style>
          
          {/* Work List Header */}
          <div className="p-4 border-b border-stone-200 print:border-black flex gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-stone-500 uppercase print:hidden">Título</label>
              {isExportingPDF ? (
                <div className="text-xl font-bold text-black border-none px-2 py-1">
                  {editingList.title || 'SIN TÍTULO'}
                </div>
              ) : (
                <input 
                  type="text"
                  value={editingList.title}
                  onChange={e => setEditingList(prev => prev ? { ...prev, title: e.target.value } : prev)}
                  className="w-full text-xl font-bold text-stone-800 bg-transparent border-none focus:ring-2 focus:ring-teal-500 rounded px-2 py-1 print:p-0 print:text-black print:text-lg"
                  placeholder="DÍA 03/06/26. MENÚ DE ARROCES. JORNADAS GASTRONÓMICAS"
                />
              )}
            </div>
            <div className="w-40">
              <label className="block text-[10px] font-semibold text-stone-500 uppercase print:hidden">Fecha</label>
              {isExportingPDF ? (
                <div className="font-medium text-black border-none px-2 py-1">
                  {editingList.date || '--'}
                </div>
              ) : (
                <input 
                  type="text"
                  value={editingList.date}
                  onChange={e => setEditingList(prev => prev ? { ...prev, date: e.target.value } : prev)}
                  className="w-full font-medium text-stone-600 bg-transparent border-none focus:ring-2 focus:ring-teal-500 rounded px-2 py-1 print:p-0 print:text-black"
                  placeholder="03/06/2026"
                />
              )}
            </div>
            <div className="w-24">
              <label className="block text-[10px] font-semibold text-stone-500 uppercase print:hidden">PAX</label>
              {isExportingPDF ? (
                <div className="font-medium text-black border-none px-2 py-1 text-right">
                  {editingList.pax || '0'} <span className="text-stone-700">pax</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-1 print:p-0 border-none">
                  <input 
                    type="number"
                    value={editingList.pax || ''}
                    onChange={e => setEditingList(prev => prev ? { ...prev, pax: Number(e.target.value) } : prev)}
                    className="w-full font-medium text-stone-600 bg-transparent border-none focus:ring-2 focus:ring-teal-500 rounded print:p-0 print:text-black text-right"
                    placeholder="35"
                  />
                  <span className="text-stone-600 print:text-black">pax</span>
                </div>
              )}
            </div>
          </div>

          {/* Tools for adding tasks - Hidden on Print or PDF export */}
          {!isExportingPDF && (
            <div className="p-3 bg-stone-50 border-b border-stone-200 print:hidden flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => addTask()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 text-stone-700 font-medium rounded-lg hover:bg-stone-100 hover:text-stone-900 transition-colors text-sm"
                >
                  <Plus size={16} />
                  Fila Vacía
                </button>
                
                <div className="w-px h-6 bg-stone-300"></div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedRecipeId}
                    onChange={e => setSelectedRecipeId(e.target.value)}
                    className="px-3 py-1.5 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-xs"
                  >
                    <option value="">-- Seleccionar Receta para Tarea --</option>
                    {recipes.map(r => (
                      <option key={r.id} value={r.id}>{r.nameES}</option>
                    ))}
                  </select>
                  <button
                    onClick={addTaskFromRecipe}
                    disabled={!selectedRecipeId}
                    className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-700 font-medium rounded-lg hover:bg-teal-100 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} />
                    Añadir de Receta
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="w-full overflow-visible print:overflow-visible print:block">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <datalist id="elements-list">
                {suggestedElements.map((el, i) => <option key={i} value={el} />)}
              </datalist>
              <datalist id="platos-list">
                {suggestedPlatos.map((pl, i) => <option key={i} value={pl} />)}
              </datalist>
              <table className="w-full text-left border-collapse print:table">
                <thead>
                  <tr className="bg-[#4c5c4e] text-white text-[11px] uppercase tracking-wider print:bg-[#4c5c4e] print:text-white print:border-black" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                    {!isExportingPDF && <th className="px-2 py-2 print:hidden w-10"></th>}
                    <th className="px-2 py-2 w-32 border-x border-[#5c6c5e]">
                      <div className="flex items-center justify-between">
                        Proceso
                        {!isExportingPDF && (
                          <button 
                            onClick={() => setIsProcessModalOpen(true)}
                            className="print:hidden hover:bg-[#5c6c5e] p-1 rounded transition-colors"
                            title="Gestionar procesos"
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                    </th>
                    <th className="px-2 py-2 w-64 border-r border-[#5c6c5e]">Elemento</th>
                    <th className="px-2 py-2 w-48 border-r border-[#5c6c5e]">Plato</th>
                    <th className="px-2 py-2 w-20 border-r border-[#5c6c5e]">Día/Ejecución</th>
                    <th className="px-2 py-2 w-30 border-r border-[#5c6c5e] text-center">Profesor</th>
                    <th className="px-2 py-2 w-20 border-r border-[#5c6c5e] text-center">Realizado</th>
                    <th className="px-2 py-2 w-32 border-r border-[#5c6c5e]">Alumnado</th>
                    {!isExportingPDF && <th className="px-2 py-2 print:hidden w-10"></th>}
                  </tr>
                </thead>
                <tbody className="print:text-[10px]">
                  <SortableContext items={editingList.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {editingList.tasks.map((task, index) => (
                      <SortableTableRow 
                        key={task.id} 
                        task={task} 
                        index={index} 
                        onUpdate={updateTask} 
                        onDelete={deleteTask}
                        teachers={teachers}
                        processes={processes}
                        suggestedElements={suggestedElements}
                        suggestedPlatos={suggestedPlatos}
                        isExportingPDF={isExportingPDF}
                      />
                    ))}
                  </SortableContext>
                </tbody>
              </table>
            </DndContext>
            
            {editingList.tasks.length === 0 && (
              <div className="p-12 text-center text-stone-500 print:hidden">
                No hay tareas en esta lista. Usa la barra superior para añadir tareas.
              </div>
            )}
          </div>
        </div>

        {isProcessModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex flex-col justify-center items-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
              <div className="flex justify-between items-center p-4 border-b border-stone-200">
                <h3 className="font-bold text-stone-800">Gestionar Procesos</h3>
                <button onClick={() => setIsProcessModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto">
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newProcess}
                    onChange={(e) => setNewProcess(e.target.value)}
                    placeholder="Nuevo proceso (ej: COCER)"
                    className="flex-1 px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddProcess()}
                  />
                  <button 
                    onClick={handleAddProcess}
                    className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium whitespace-nowrap"
                  >
                    Añadir
                  </button>
                </div>
                <div className="space-y-2">
                  {processes.length === 0 ? (
                    <p className="text-stone-500 text-sm italic">No hay procesos guardados.</p>
                  ) : (
                    processes.map(p => (
                      <div key={p} className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-100">
                        <span className={`font-semibold text-sm ${getProcessColor(p)} uppercase`}>{p}</span>
                        <button
                          onClick={() => handleRemoveProcess(p)}
                          className="text-stone-400 hover:text-red-600 p-1 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-stone-200 text-right">
                <button 
                  onClick={() => setIsProcessModalOpen(false)}
                  className="px-4 py-2 text-stone-600 font-medium hover:bg-stone-100 rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // Lista principal (Cards view)
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Listas de Trabajo</h1>
          <p className="text-stone-500 mt-1">Gestión de la producción y distribución de tareas.</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors font-medium shadow-sm"
        >
          <Plus size={20} />
          Nueva Lista
        </button>
      </div>

      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-stone-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar listas por título o fecha..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLists.map((list) => (
          <div key={list.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-lg text-stone-800">{list.title}</h3>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(list)}
                  className="p-2 text-stone-400 hover:text-teal-600 rounded-lg hover:bg-teal-50 transition-colors"
                  title="Editar"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(list.id)}
                  className="p-2 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 text-sm text-stone-600 space-y-1 mb-4">
              <div className="flex justify-between">
                <span className="font-medium text-stone-500">Fecha:</span>
                <span>{list.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-stone-500">PAX:</span>
                <span>{list.pax}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-stone-500">Tareas:</span>
                <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {list.tasks?.length || 0}
                </span>
              </div>
            </div>
            
            <div className="pt-3 border-t border-stone-100 text-[11px] text-stone-400 flex justify-between items-center">
              <span>Por: {list.createdBy}</span>
              <button 
                onClick={() => handleEdit(list)}
                className="text-teal-600 font-medium hover:text-teal-700"
              >
                Abrir lista &rarr;
              </button>
            </div>
          </div>
        ))}
        
        {filteredLists.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-stone-200 border-dashed">
            <ClipboardList size={48} className="mx-auto text-stone-300 mb-4" />
            <h3 className="text-lg font-medium text-stone-900 mb-1">No hay listas de trabajo</h3>
            <p className="text-stone-500">Crea tu primera lista para organizar la producción.</p>
          </div>
        )}
      </div>
    </div>
  );
}
