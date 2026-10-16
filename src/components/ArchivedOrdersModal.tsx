import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ArchivedOrder, Recipe, Ingredient, Menu, AppSettings } from '../types';
import { useToast } from '../context/ToastContext';
import { generatePDF } from '../utils/pdf';
import {
  Archive,
  X,
  Printer,
  RotateCcw,
  Search,
  Calendar,
  User,
  Calculator,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  MessageSquare,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface ArchivedOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: Recipe[];
  ingredients: Ingredient[];
  menus: Menu[];
  settings: AppSettings | null;
  canManage?: boolean;
}

interface TeacherIngredient {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  provider: string;
  isCustom?: boolean;
  notes?: string;
}

interface AggregatedIngredient {
  ingredientId: string;
  name: string;
  totalQuantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  provider: string;
  isCustom?: boolean;
  byTeacher: Record<string, number>;
  teacherNotes?: Record<string, string>;
}

function formatTeacherName(fullName: string): string {
  if (!fullName) return '';
  if (fullName === 'Profesor' || fullName === 'Mi Pedido') return fullName;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) {
    return fullName;
  }
  return parts.slice(0, -1).join(' ');
}

export default function ArchivedOrdersModal({
  isOpen,
  onClose,
  recipes,
  ingredients,
  menus,
  settings,
  canManage = true
}: ArchivedOrdersModalProps) {
  const { showToast } = useToast();
  const [archivedOrders, setArchivedOrders] = useState<ArchivedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [searchTeacher, setSearchTeacher] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showOriginalOrders, setShowOriginalOrders] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Escuchar la colección 'archived_orders' en tiempo real
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'archived_orders'),
      (snapshot) => {
        const docs: ArchivedOrder[] = [];
        snapshot.forEach((d) => {
          docs.push({ id: d.id, ...(d.data() as any) });
        });
        // Ordenar los más recientes primero
        docs.sort((a, b) => {
          const timeA = new Date(a.archivedAt || a.createdAt).getTime();
          const timeB = new Date(b.archivedAt || b.createdAt).getTime();
          return timeB - timeA;
        });
        setArchivedOrders(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching archived orders:', err);
        handleFirestoreError(err, OperationType.GET, 'archived_orders');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [isOpen]);

  // Agrupar pedidos archivados por lotes de consolidación / fecha
  const batches = useMemo(() => {
    const map = new Map<string, { label: string; count: number; date: string }>();

    archivedOrders.forEach((o) => {
      const batchKey = o.archiveBatch || (o.archivedAt ? new Date(o.archivedAt).toLocaleDateString('es-ES') : 'Sin fecha');
      const existing = map.get(batchKey);
      if (existing) {
        existing.count += 1;
      } else {
        const dateFormatted = o.archivedAt ? new Date(o.archivedAt).toLocaleDateString('es-ES') : 'Histórico';
        map.set(batchKey, {
          label: o.archiveBatch ? `${o.archiveBatch}` : `Lote ${dateFormatted}`,
          count: 1,
          date: dateFormatted
        });
      }
    });

    return Array.from(map.entries()).map(([key, value]) => ({
      key,
      label: value.label,
      count: value.count,
      date: value.date
    }));
  }, [archivedOrders]);

  // Si cambia la lista de lotes y el actual no es válido, inicializar al primero o a 'all'
  useEffect(() => {
    if (selectedBatch !== 'all' && !batches.some((b) => b.key === selectedBatch)) {
      if (batches.length > 0) {
        setSelectedBatch(batches[0].key);
      } else {
        setSelectedBatch('all');
      }
    }
  }, [batches, selectedBatch]);

  // Filtrar pedidos según lote y búsqueda
  const filteredOrders = useMemo(() => {
    let result = archivedOrders;
    if (selectedBatch !== 'all') {
      result = result.filter(
        (o) => (o.archiveBatch || (o.archivedAt ? new Date(o.archivedAt).toLocaleDateString('es-ES') : 'Sin fecha')) === selectedBatch
      );
    }
    if (searchTeacher.trim()) {
      const q = searchTeacher.toLowerCase();
      result = result.filter(
        (o) =>
          (o.userName && o.userName.toLowerCase().includes(q)) ||
          (o.title && o.title.toLowerCase().includes(q))
      );
    }
    return result;
  }, [archivedOrders, selectedBatch, searchTeacher]);

  // Desglose consolidado de ingredientes por docente (exactamente como en impresión por profesor)
  const aggregatedData = useMemo(() => {
    const aggregation: Record<string, AggregatedIngredient> = {};

    const processRecipe = (
      recipeId: string,
      targetQuantity: number,
      userName: string,
      excludedIngredientIds: string[] = [],
      ingredientNotes: Record<string, string> = {},
      basePortionsOverride?: number,
      visited = new Set<string>()
    ) => {
      if (visited.has(recipeId)) return;
      visited.add(recipeId);

      const recipe = recipes.find((r) => r.id === recipeId);
      if (recipe) {
        const basePortions =
          basePortionsOverride && basePortionsOverride > 0
            ? basePortionsOverride
            : recipe.portions && recipe.portions > 0
            ? recipe.portions
            : recipe.yieldQuantity && recipe.yieldQuantity > 0
            ? recipe.yieldQuantity
            : 1;
        const multiplier = targetQuantity / basePortions;

        recipe.ingredients.forEach((ri) => {
          if (excludedIngredientIds.includes(ri.ingredientId)) return;

          const ing = ingredients.find((i) => i.id === ri.ingredientId);
          if (ing) {
            const requiredQty = ri.quantity * multiplier;
            const ingNote = ingredientNotes[ing.id];

            if (aggregation[ing.id]) {
              aggregation[ing.id].totalQuantity += requiredQty;
              aggregation[ing.id].totalCost += requiredQty * ing.costPerUnit;
              aggregation[ing.id].byTeacher[userName] =
                (aggregation[ing.id].byTeacher[userName] || 0) + requiredQty;
              if (ingNote) {
                if (!aggregation[ing.id].teacherNotes) aggregation[ing.id].teacherNotes = {};
                const prev = aggregation[ing.id].teacherNotes![userName];
                aggregation[ing.id].teacherNotes![userName] = prev ? `${prev}; ${ingNote}` : ingNote;
              }
            } else {
              aggregation[ing.id] = {
                ingredientId: ing.id,
                name: ing.nameES,
                totalQuantity: requiredQty,
                unit: ing.unit,
                costPerUnit: ing.costPerUnit,
                totalCost: requiredQty * ing.costPerUnit,
                provider: ing.provider || '',
                byTeacher: { [userName]: requiredQty },
                teacherNotes: ingNote ? { [userName]: ingNote } : {}
              };
            }
          } else {
            const subRecipe = recipes.find((r) => r.id === ri.ingredientId);
            if (subRecipe) {
              const subQty = ri.quantity * multiplier;
              processRecipe(
                subRecipe.id,
                subQty,
                userName,
                excludedIngredientIds,
                ingredientNotes,
                undefined,
                new Set(visited)
              );
            }
          }
        });
      }
    };

    filteredOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (item.quantity > 0) {
          if (item.type === 'recipe') {
            processRecipe(
              item.id,
              item.quantity,
              order.userName,
              item.excludedIngredientIds || [],
              item.ingredientNotes || {},
              item.basePortions
            );
          } else if (item.type === 'menu') {
            const menu = menus.find((m) => m.id === item.id);
            if (menu) {
              menu.recipes.forEach((recipeId) => {
                processRecipe(recipeId, item.quantity, order.userName);
              });
            }
          } else if (item.type === 'ingredient') {
            const ing = ingredients.find((i) => i.id === item.id);
            if (ing) {
              const requiredQty = item.quantity;
              const teacherLabel = item.justification
                ? `${order.userName} (Justificación: ${item.justification})`
                : order.userName;

              if (aggregation[ing.id]) {
                aggregation[ing.id].totalQuantity += requiredQty;
                aggregation[ing.id].totalCost += requiredQty * ing.costPerUnit;
                aggregation[ing.id].byTeacher[teacherLabel] =
                  (aggregation[ing.id].byTeacher[teacherLabel] || 0) + requiredQty;
                if (item.notes) {
                  if (!aggregation[ing.id].teacherNotes) aggregation[ing.id].teacherNotes = {};
                  aggregation[ing.id].teacherNotes![order.userName] = item.notes;
                }
              } else {
                aggregation[ing.id] = {
                  ingredientId: ing.id,
                  name: ing.nameES,
                  totalQuantity: requiredQty,
                  unit: ing.unit,
                  costPerUnit: ing.costPerUnit,
                  totalCost: requiredQty * ing.costPerUnit,
                  provider: ing.provider || '',
                  byTeacher: { [teacherLabel]: requiredQty },
                  teacherNotes: item.notes ? { [order.userName]: item.notes } : {}
                };
              }
            }
          } else if (item.type === 'custom') {
            const requiredQty = item.quantity;
            const customId = item.id;
            const customName = item.customName || 'Producto fuera de catálogo';
            const customUnit = item.customUnit || 'ud';
            const customCost = item.customEstimatedPrice || 0;
            const customProvider = item.customProvider || 'Fuera de catálogo / Especial';
            const teacherLabel = item.justification
              ? `${order.userName} (Justificación: ${item.justification})`
              : order.userName;

            if (aggregation[customId]) {
              aggregation[customId].totalQuantity += requiredQty;
              aggregation[customId].totalCost += requiredQty * customCost;
              aggregation[customId].byTeacher[teacherLabel] =
                (aggregation[customId].byTeacher[teacherLabel] || 0) + requiredQty;
              if (item.notes) {
                if (!aggregation[customId].teacherNotes) aggregation[customId].teacherNotes = {};
                aggregation[customId].teacherNotes![order.userName] = item.notes;
              }
            } else {
              aggregation[customId] = {
                ingredientId: customId,
                name: customName,
                totalQuantity: requiredQty,
                unit: customUnit,
                costPerUnit: customCost,
                totalCost: requiredQty * customCost,
                provider: customProvider,
                isCustom: true,
                byTeacher: { [teacherLabel]: requiredQty },
                teacherNotes: item.notes ? { [order.userName]: item.notes } : {}
              };
            }
          }
        }
      });
    });

    const aggregatedList = Object.values(aggregation).sort((a, b) => a.name.localeCompare(b.name));
    const totalCost = aggregatedList.reduce((sum, item) => sum + item.totalCost, 0);

    // Agrupar por profesor (Diseño de impresión por profesor)
    const teacherGroups: Record<string, TeacherIngredient[]> = {};
    aggregatedList.forEach((item) => {
      Object.entries(item.byTeacher).forEach(([teacher, qty]) => {
        if (!teacherGroups[teacher]) {
          teacherGroups[teacher] = [];
        }
        const parts = teacher.split(' (Justificación:');
        const rawTeacherName = parts[0];
        const teacherNote = item.teacherNotes
          ? item.teacherNotes[rawTeacherName] || item.teacherNotes[teacher]
          : undefined;

        teacherGroups[teacher].push({
          ingredientId: item.ingredientId,
          name: item.name,
          quantity: qty,
          unit: item.unit,
          costPerUnit: item.costPerUnit,
          totalCost: qty * item.costPerUnit,
          provider: item.provider,
          isCustom: item.isCustom,
          notes: teacherNote
        });
      });
    });

    const sortedTeachers = Object.keys(teacherGroups).sort((a, b) => a.localeCompare(b));

    return {
      aggregatedList,
      totalCost,
      groupedByTeacher: teacherGroups,
      sortedTeachers
    };
  }, [filteredOrders, recipes, ingredients, menus]);

  // Exportar a PDF el diseño de impresión por profesor
  const handleExportPDF = async () => {
    if (isPrinting || aggregatedData.aggregatedList.length === 0) return;
    setIsPrinting(true);
    showToast('Generando PDF del archivo por profesor...', 'info');

    const safetyTimeout = setTimeout(() => {
      if (isPrinting) {
        setIsPrinting(false);
        showToast('La generación del PDF tardó más de lo esperado.', 'info');
      }
    }, 20000);

    try {
      await new Promise((r) => setTimeout(r, 80));

      if (!printRef.current) {
        throw new Error('Contenedor de impresión no disponible');
      }

      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch (fontErr) {
          console.warn('Font loading check:', fontErr);
        }
      }

      const imgs = Array.from(printRef.current.querySelectorAll('img'));
      await Promise.all(
        imgs.map(async (img) => {
          try {
            if (!img.complete) {
              await new Promise<void>((resolve) => {
                const onFinish = () => {
                  img.removeEventListener('load', onFinish);
                  img.removeEventListener('error', onFinish);
                  resolve();
                };
                img.addEventListener('load', onFinish);
                img.addEventListener('error', onFinish);
                setTimeout(resolve, 3000);
              });
            }
            if (img.decode) {
              await img.decode().catch(() => {});
            }
          } catch (imgErr) {
            console.warn('Image loading/decode error:', imgErr);
          }
        })
      );

      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 150));

      const opt = {
        margin: [12, 10, 12, 10],
        filename: `Pedidos_Archivados_Por_Profesor_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 800,
          backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          avoid: ['tr', '.print-avoid-break', 'thead', 'tfoot', '.teacher-section', 'h1', 'h2', 'h3']
        }
      };

      await generatePDF(printRef.current, opt);
      showToast('PDF generado correctamente.', 'success');
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      showToast('Error al generar el PDF.', 'error');
    } finally {
      clearTimeout(safetyTimeout);
      setIsPrinting(false);
    }
  };

  // Restaurar un pedido archivado a la lista activa de pedidos
  const handleRestoreOrder = async (order: ArchivedOrder) => {
    if (!canManage) return;
    setIsRestoring(true);
    try {
      const { archivedAt, archivedBy, archiveBatch, ...originalOrder } = order;
      // Guardar de vuelta en 'orders'
      await setDoc(doc(db, 'orders', order.id), {
        ...originalOrder,
        status: 'pending'
      });
      // Eliminar de 'archived_orders'
      await deleteDoc(doc(db, 'archived_orders', order.id));
      showToast(`Pedido "${order.title}" restaurado a pedidos activos.`, 'success');
    } catch (err) {
      console.error('Error restoring order:', err);
      handleFirestoreError(err, OperationType.WRITE, `orders/${order.id}`);
      showToast('Error al restaurar el pedido.', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Restaurar todo el lote seleccionado
  const handleRestoreCurrentBatch = async () => {
    if (!canManage || filteredOrders.length === 0) return;
    const confirm = window.confirm(
      `¿Deseas restaurar los ${filteredOrders.length} pedidos a la lista activa de pedidos?`
    );
    if (!confirm) return;

    setIsRestoring(true);
    try {
      await Promise.all(
        filteredOrders.map(async (order) => {
          const { archivedAt, archivedBy, archiveBatch, ...originalOrder } = order;
          await setDoc(doc(db, 'orders', order.id), {
            ...originalOrder,
            status: 'pending'
          });
          await deleteDoc(doc(db, 'archived_orders', order.id));
        })
      );
      showToast(`Se han restaurado ${filteredOrders.length} pedidos a la lista activa.`, 'success');
    } catch (err) {
      console.error('Error restoring batch:', err);
      handleFirestoreError(err, OperationType.WRITE, 'orders');
      showToast('Error al restaurar el lote.', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl border border-stone-200 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200">
              <Archive size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900 truncate">
                  Historial de Pedidos Consolidados y Archivados
                </h2>
                <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full uppercase">
                  {archivedOrders.length} {archivedOrders.length === 1 ? 'archivado' : 'archivados'}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5 truncate">
                Consulta de pedidos consolidados eliminados con formato de impresión por profesor
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar de filtros y acciones */}
        <div className="p-3 sm:p-4 border-b border-stone-200 bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {/* Selector de Lote / Consolidación */}
            <div className="min-w-[180px] max-w-xs flex-1">
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full text-xs font-semibold border border-stone-200 rounded-lg bg-stone-50 text-stone-800 py-1.5 px-2.5 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Todos los lotes ({archivedOrders.length} pedidos)</option>
                {batches.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.label} ({b.count} {b.count === 1 ? 'pedido' : 'pedidos'})
                  </option>
                ))}
              </select>
            </div>

            {/* Buscador de profesor */}
            <div className="relative min-w-[160px] max-w-xs flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Filtrar por profesor..."
                value={searchTeacher}
                onChange={(e) => setSearchTeacher(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs font-medium border border-stone-200 rounded-lg bg-stone-50 text-stone-800 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Badge de coste total */}
            <div className="bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg flex items-center gap-2 shrink-0">
              <span className="text-[10px] uppercase font-bold text-indigo-700">Coste Lote</span>
              <span className="text-xs font-black text-indigo-900">
                {aggregatedData.totalCost.toFixed(2)} €
              </span>
            </div>
          </div>

          {/* Botones de acción: Imprimir / PDF y Restaurar */}
          <div className="flex items-center gap-2 shrink-0">
            {canManage && filteredOrders.length > 0 && (
              <button
                type="button"
                onClick={handleRestoreCurrentBatch}
                disabled={isRestoring}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
                title="Restaurar estos pedidos a la lista de pedidos activos"
              >
                <RotateCcw size={14} className="text-amber-700" />
                <span>{isRestoring ? 'Restaurando...' : 'Restaurar Lote'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isPrinting || aggregatedData.aggregatedList.length === 0}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              title="Descargar en PDF con el diseño de impresión por profesor"
            >
              <Printer size={14} />
              <span>{isPrinting ? 'Generando PDF...' : 'Imprimir / PDF'}</span>
            </button>
          </div>
        </div>

        {/* Cuerpo Principal del Modal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {loading ? (
            <div className="text-center py-16 text-stone-500 text-sm">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mb-2"></div>
              <p>Cargando pedidos archivados...</p>
            </div>
          ) : archivedOrders.length === 0 ? (
            <div className="text-center py-16 text-stone-400 border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50">
              <Archive size={36} className="mx-auto text-stone-300 mb-2" />
              <h3 className="font-bold text-stone-700 text-base">No hay pedidos archivados todavía</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                Cuando el departamento de compras elimine los pedidos tramitados desde la consolidación, se guardarán automáticamente aquí en el archivo para cualquier consulta o recuperación futura.
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-stone-400 border border-stone-200 rounded-xl bg-stone-50">
              <FolderOpen size={28} className="mx-auto text-stone-300 mb-1" />
              <p className="text-xs">No hay pedidos que coincidan con los filtros seleccionados.</p>
            </div>
          ) : (
            <>
              {/* TABLA PRINCIPAL: DISEÑO DE IMPRESIÓN POR PROFESOR */}
              <div className="border border-stone-300 rounded-xl overflow-hidden shadow-xs bg-white">
                <table className="w-full text-left border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '4%' }} />
                    <col style={{ width: '38%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '18%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-stone-900 text-white uppercase tracking-wider text-[9px]">
                      <th className="py-2.5 px-1 text-center">✓</th>
                      <th className="py-2.5 px-3 font-bold text-left">INGREDIENTE</th>
                      <th className="py-2.5 px-3 font-bold text-right">CANTIDAD</th>
                      <th className="py-2.5 px-3 font-bold text-left">PROVEEDOR</th>
                      <th className="py-2.5 px-3 font-bold text-right">COSTE EST.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {aggregatedData.sortedTeachers.map((teacher) => {
                      const teacherItems = aggregatedData.groupedByTeacher[teacher];
                      const teacherTotal = teacherItems.reduce((sum, item) => sum + item.totalCost, 0);
                      const parts = teacher.split(' (Justificación:');
                      const nameOnly = parts[0];
                      const formattedName = formatTeacherName(nameOnly);
                      const justification = parts.length > 1 ? ` (Justificación:${parts[1]}` : '';

                      // Encontrar el pedido original de este profesor en este lote para acción de restaurar individual
                      const matchingOrder = filteredOrders.find(
                        (o) => o.userName === nameOnly || o.userName === teacher
                      );

                      return (
                        <React.Fragment key={teacher}>
                          {/* Fila Encabezado del Docente (Estilo Impresión por Profesor) */}
                          <tr className="bg-[#e4e2e0] text-stone-900 border-t-2 border-b border-stone-300">
                            <td colSpan={5} className="py-2 px-3">
                              <div className="flex flex-wrap justify-between items-center text-xs font-bold gap-2">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <span className="w-2.5 h-2.5 rounded-full bg-stone-900 inline-block shrink-0"></span>
                                  <span className="uppercase tracking-wider text-stone-950 font-black truncate">
                                    DOCENTE: {formattedName}
                                  </span>
                                  {justification && (
                                    <span className="text-[10px] text-stone-600 font-normal italic truncate">
                                      {justification}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-stone-500 font-normal shrink-0">
                                    ({teacherItems.length} {teacherItems.length === 1 ? 'producto' : 'productos'})
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-xs font-black text-stone-900 whitespace-nowrap">
                                    Subtotal: {teacherTotal.toFixed(2)} €
                                  </span>
                                  {canManage && matchingOrder && (
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreOrder(matchingOrder)}
                                      disabled={isRestoring}
                                      className="px-2 py-0.5 bg-white hover:bg-amber-50 text-amber-900 border border-stone-300 hover:border-amber-400 rounded text-[10px] font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                                      title="Restaurar el pedido de este profesor a pedidos activos"
                                    >
                                      <RotateCcw size={10} className="text-amber-700" />
                                      <span>Restaurar</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* Filas de Productos de este Docente */}
                          {teacherItems.map((item, idx) => (
                            <tr
                              key={`${teacher}-${item.ingredientId}-${idx}`}
                              className="bg-white hover:bg-stone-50/50 transition-colors text-xs"
                            >
                              <td className="py-2 px-1 text-center align-middle">
                                <span className="inline-block w-3.5 h-3.5 border border-stone-300 rounded-[3px] bg-white"></span>
                              </td>
                              <td className="py-2 px-3 font-semibold text-stone-900 align-middle">
                                <div className="flex items-center gap-1.5">
                                  <span>{item.name}</span>
                                  {item.isCustom && (
                                    <span className="text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                                      Fuera cat.
                                    </span>
                                  )}
                                </div>
                                {item.notes && (
                                  <div className="text-[10px] text-amber-800 font-medium italic mt-0.5 flex items-center gap-1">
                                    <MessageSquare size={10} className="text-amber-600 shrink-0" />
                                    <span>[Nota compras: {item.notes}]</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-stone-900 whitespace-nowrap align-middle font-mono">
                                {item.quantity.toFixed(3)} <span className="font-normal text-stone-500">{item.unit}</span>
                              </td>
                              <td className="py-2 px-3 text-stone-600 text-xs italic align-middle truncate">
                                {item.provider || 'Sin proveedor'}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-stone-900 whitespace-nowrap align-middle">
                                {item.totalCost.toFixed(2)} €
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-stone-100 border-t-2 border-stone-300 font-bold text-stone-900">
                      <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider text-xs text-stone-800">
                        TOTAL ESTIMADO ARCHIVADO:
                      </td>
                      <td className="py-2.5 px-3 text-right text-sm font-black text-stone-950 whitespace-nowrap">
                        {aggregatedData.totalCost.toFixed(2)} €
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Botón y Sección colapsable para ver los pedidos originales individuales */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowOriginalOrders(!showOriginalOrders)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Archive size={14} className="text-indigo-600" />
                    <span>Ver fichas de pedidos originales ({filteredOrders.length})</span>
                  </span>
                  {showOriginalOrders ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showOriginalOrders && (
                  <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredOrders.map((o) => (
                      <div
                        key={o.id}
                        className="p-3 bg-white border border-stone-200 rounded-xl shadow-2xs space-y-2 text-xs"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <h4 className="font-bold text-stone-900">{o.title}</h4>
                            <p className="text-[11px] text-stone-500 font-medium">
                              {o.userName} · {new Date(o.createdAt).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleRestoreOrder(o)}
                              disabled={isRestoring}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                              title="Restaurar este pedido a pedidos activos"
                            >
                              <RotateCcw size={10} />
                              Restaurar
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-600 pt-1 border-t border-stone-100 flex justify-between">
                          <span>{o.items.length} artículos en pedido</span>
                          <span className="text-[10px] text-stone-400">
                            Archivado: {o.archivedAt ? new Date(o.archivedAt).toLocaleDateString('es-ES') : '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Modal */}
        <div className="p-3 sm:p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-stone-500">
            Los pedidos eliminados en consolidación permanecen en este archivo para histórico y recuperación.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* CONTENEDOR OCULTO PARA IMPRESIÓN / PDF (DISEÑO IDÉNTICO AL OFICIAL POR PROFESOR) */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div
          ref={printRef}
          style={{ width: '190mm', padding: '0', boxSizing: 'border-box' }}
          className="bg-white text-black font-sans"
        >
          {/* Encabezado Institucional del PDF */}
          <div className="flex justify-between items-center border-b-2 border-stone-800 pb-3 mb-3">
            <div className="flex items-center gap-3">
              <img
                src={settings?.logoUrl || '/logo.png'}
                alt="Logo Escuela"
                className="h-14 w-auto object-contain"
                crossOrigin="anonymous"
              />
              <div>
                <h2 className="text-base font-black tracking-tight text-stone-900 uppercase">
                  DEPARTAMENTO DE HOSTELERÍA Y COCINA
                </h2>
                <p className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">
                  Control de Compras y Suministros
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase font-bold text-stone-500 block">COSTE TOTAL ARCHIVADO</span>
              <span className="text-lg font-black text-stone-900">{aggregatedData.totalCost.toFixed(2)} €</span>
            </div>
          </div>

          {/* Título del Documento */}
          <div className="flex justify-between items-end mb-3 text-xs">
            <div>
              <h1 className="text-sm font-black uppercase tracking-wide text-stone-900">
                HISTÓRICO DE PEDIDOS CONSOLIDADOS (POR DOCENTE)
              </h1>
              <p className="text-[9.5px] text-stone-600 mt-0.5">
                Lote: {selectedBatch === 'all' ? 'Todos los pedidos archivados' : selectedBatch} · Total:{' '}
                {filteredOrders.length} pedidos
              </p>
            </div>
            <div className="text-right text-[9.5px] text-stone-600">
              <p>Fecha consulta: {new Date().toLocaleDateString('es-ES')}</p>
              <p>Total ingredientes: {aggregatedData.aggregatedList.length}</p>
            </div>
          </div>

          {/* Tabla de Impresión por Profesor */}
          <div className="border border-stone-300 rounded-lg overflow-hidden mb-5 w-full">
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col style={{ width: '4%' }} />
                <col style={{ width: '38%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '18%' }} />
              </colgroup>
              <thead>
                <tr className="bg-stone-900 text-white uppercase tracking-wider text-[8.5px]">
                  <th className="py-2 px-1 text-center">✓</th>
                  <th className="py-2 px-2 font-bold text-left">INGREDIENTE</th>
                  <th className="py-2 px-2 font-bold text-right">CANTIDAD</th>
                  <th className="py-2 px-2 font-bold text-left">PROVEEDOR</th>
                  <th className="py-2 px-2 font-bold text-right">COSTE EST.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {aggregatedData.sortedTeachers.map((teacher) => {
                  const teacherItems = aggregatedData.groupedByTeacher[teacher];
                  const teacherTotal = teacherItems.reduce((sum, item) => sum + item.totalCost, 0);
                  const parts = teacher.split(' (Justificación:');
                  const nameOnly = parts[0];
                  const formattedName = formatTeacherName(nameOnly);
                  const justification = parts.length > 1 ? ` (Justificación:${parts[1]}` : '';

                  return (
                    <React.Fragment key={teacher}>
                      <tr className="bg-[#e4e2e0] text-stone-900 border-t border-b border-stone-300 print-avoid-break">
                        <td colSpan={5} className="py-1.5 px-2">
                          <div className="flex justify-between items-center text-xs font-bold gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-stone-900 inline-block shrink-0"></span>
                              <span className="uppercase tracking-wider truncate">DOCENTE: {formattedName}</span>
                              {justification && (
                                <span className="text-[9.5px] text-stone-600 font-normal italic truncate">
                                  {justification}
                                </span>
                              )}
                              <span className="text-[9.5px] text-stone-500 font-normal shrink-0">
                                ({teacherItems.length} {teacherItems.length === 1 ? 'producto' : 'productos'})
                              </span>
                            </div>
                            <span className="text-[10.5px] font-bold text-stone-900 shrink-0 whitespace-nowrap">
                              Subtotal: {teacherTotal.toFixed(2)} €
                            </span>
                          </div>
                        </td>
                      </tr>
                      {teacherItems.map((item, idx) => (
                        <tr
                          key={`${teacher}-${item.ingredientId}-${idx}`}
                          className="bg-white border-b border-stone-200 print-avoid-break text-[9.5px]"
                        >
                          <td className="py-1.5 px-1 text-center align-middle">
                            <span className="inline-block w-3.5 h-3.5 border border-stone-300 rounded-[3px] bg-white"></span>
                          </td>
                          <td className="py-1.5 px-2 font-medium text-stone-900 align-middle break-words leading-tight">
                            <div>
                              {item.name}{' '}
                              {item.isCustom ? (
                                <span className="text-amber-700 text-[8.5px] font-semibold">(Fuera cat.)</span>
                              ) : (
                                ''
                              )}
                            </div>
                            {item.notes && (
                              <div className="text-[8px] text-amber-800 font-medium italic mt-0.5 break-words">
                                [Nota: {item.notes}]
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold text-stone-900 whitespace-nowrap align-middle font-mono">
                            {item.quantity.toFixed(3)} {item.unit}
                          </td>
                          <td className="py-1.5 px-2 text-stone-600 text-[9px] italic align-middle break-words">
                            {item.provider || 'Sin proveedor'}
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold text-stone-900 whitespace-nowrap align-middle">
                            {item.totalCost.toFixed(2)} €
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-stone-50 border-t-2 border-stone-300 font-bold text-stone-900">
                  <td colSpan={4} className="py-2 px-2 text-right uppercase tracking-wider text-[9px] text-stone-800">
                    TOTAL GENERAL ARCHIVADO:
                  </td>
                  <td className="py-2 px-2 text-right text-[11px] font-bold text-stone-950 whitespace-nowrap">
                    {aggregatedData.totalCost.toFixed(2)} €
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
