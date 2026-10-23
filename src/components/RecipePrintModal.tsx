import React, { useState, useEffect } from 'react';
import { Recipe } from '../types';
import { 
  ChefHat, 
  BookOpen, 
  Calculator, 
  Check, 
  X, 
  Printer, 
  Layers, 
  Users, 
  Scale, 
  Minus, 
  Plus, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

export type RecipePrintMode = 'technical' | 'complete' | 'costing';

interface RecipePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  onPrint: (recipe: Recipe, mode: RecipePrintMode, includeSubRecipes: boolean, targetPortions?: number) => void;
  isPrinting: boolean;
  hasSubRecipes?: boolean;
}

export default function RecipePrintModal({
  isOpen,
  onClose,
  recipe,
  onPrint,
  isPrinting,
  hasSubRecipes = false
}: RecipePrintModalProps) {
  const [selectedMode, setSelectedMode] = useState<RecipePrintMode>('complete');
  const [includeSubRecipes, setIncludeSubRecipes] = useState<boolean>(true);

  const isElaborado = recipe?.type === 'elaborado';
  const basePortions = recipe
    ? ((recipe.portions && Number(recipe.portions) > 0)
        ? Number(recipe.portions)
        : (recipe.yieldQuantity && Number(recipe.yieldQuantity) > 0 ? Number(recipe.yieldQuantity) : 1))
    : 1;

  const [targetPortions, setTargetPortions] = useState<number>(basePortions);

  // Sync state whenever modal opens or recipe changes
  useEffect(() => {
    if (recipe && isOpen) {
      const base = (recipe.portions && Number(recipe.portions) > 0)
        ? Number(recipe.portions)
        : (recipe.yieldQuantity && Number(recipe.yieldQuantity) > 0 ? Number(recipe.yieldQuantity) : 1);
      setTargetPortions(base);
      setSelectedMode('complete');
      setIncludeSubRecipes(true);
    }
  }, [recipe, isOpen]);

  if (!isOpen || !recipe) return null;

  const portionUnitLabel = isElaborado
    ? (recipe.yieldUnit === 'ud' ? 'unidades' : (recipe.yieldUnit || 'kg'))
    : 'raciones';

  const scaleFactor = basePortions > 0 ? targetPortions / basePortions : 1;
  const isScaled = Math.abs(scaleFactor - 1) > 0.001;

  const handleStepPortions = (delta: number) => {
    setTargetPortions(prev => {
      const next = Math.max(0.1, Number((prev + delta).toFixed(2)));
      return next;
    });
  };

  const handleSetPortions = (val: number) => {
    if (val > 0) {
      setTargetPortions(val);
    }
  };

  const quickPresets = [1, 2, 4, 6, 8, 10, 12, 15, 20, 50, 100];
  // Ensure base portion is available if not in list
  if (!quickPresets.includes(basePortions) && basePortions > 0) {
    quickPresets.push(basePortions);
    quickPresets.sort((a, b) => a - b);
  }

  const options: {
    mode: RecipePrintMode;
    badge: string;
    badgeColor: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    features: { text: string; included: boolean }[];
  }[] = [
    {
      mode: 'technical',
      badge: 'Cocina y Alumnado',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      title: 'Solo Ficha Técnica',
      subtitle: 'Sin datos económicos ni precios',
      icon: <ChefHat size={22} className="text-amber-600" />,
      features: [
        { text: 'Ingredientes con pesos brutos, netos y mermas', included: true },
        { text: 'Mise en place, materiales y equipamiento', included: true },
        { text: 'Pasos de elaboración y cronograma de sincronización', included: true },
        { text: 'Oculta costes, precios unitarios e importes', included: false }
      ]
    },
    {
      mode: 'complete',
      badge: 'Completa',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      title: 'Con Todos los Datos',
      subtitle: 'Ficha técnica y escandallo con todos los datos técnicos y económicos',
      icon: <BookOpen size={22} className="text-teal-600" />,
      features: [
        { text: 'Pesos brutos, pesos netos (3 decimales) y mermas', included: true },
        { text: 'Escandallo detallado con precios unitarios y totales', included: true },
        { text: 'Coste total y coste calculado por ración', included: true },
        { text: 'Ficha técnica de cocina, elaboración y diagrama de tiempos', included: true }
      ]
    },
    {
      mode: 'costing',
      badge: 'Gestión y Compras',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      title: 'Solo Escandallo',
      subtitle: 'Hoja de costes, rendimientos y materias primas',
      icon: <Calculator size={22} className="text-emerald-600" />,
      features: [
        { text: 'Pesos brutos y netos detallados con porcentajes de merma', included: true },
        { text: 'Escandallo completo con costes por ingrediente', included: true },
        { text: 'Coste total, coste por ración y resumen de materias primas', included: true },
        { text: 'Omite pasos de elaboración y diagrama de tiempos', included: false }
      ]
    }
  ];

  const handleConfirm = () => {
    onPrint(recipe, selectedMode, includeSubRecipes, targetPortions);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200">
              <Printer size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-stone-900 truncate">
                  Imprimir {isElaborado ? 'Elaborado' : 'Plato'}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${isElaborado ? 'bg-orange-50 text-orange-800 border-orange-200' : 'bg-teal-50 text-teal-800 border-teal-200'}`}>
                  {isElaborado ? 'Elaborado Base' : 'Plato'}
                </span>
                {isScaled && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                    Escalado x{scaleFactor.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 truncate mt-0.5 font-medium">
                {recipe.nameES}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPrinting}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Portions selector & Options selection */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* SECCIÓN ESCALADO PROPORCIONAL DE RACIONES */}
          <div className="bg-gradient-to-br from-teal-50/70 via-stone-50 to-orange-50/50 rounded-2xl border border-teal-200/80 p-3.5 sm:p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-100/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <Users size={15} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    <span>Número de {portionUnitLabel} a calcular</span>
                    <span className="text-[10px] font-semibold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-full">
                      Escalado proporcional
                    </span>
                  </h4>
                  <p className="text-[11px] text-stone-500 leading-tight">
                    Receta base original: <strong className="text-stone-700">{basePortions} {portionUnitLabel}</strong>. Modifica este valor para recalcular automáticamente los pesos brutos, netos y costes.
                  </p>
                </div>
              </div>

              {isScaled && (
                <button
                  type="button"
                  onClick={() => setTargetPortions(basePortions)}
                  className="self-start sm:self-center px-2 py-1 text-[11px] font-semibold text-teal-700 bg-white hover:bg-teal-50 border border-teal-300 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs"
                  title="Restablecer al número de raciones base de la receta"
                >
                  <RotateCcw size={12} />
                  <span>Restablecer base ({basePortions})</span>
                </button>
              )}
            </div>

            {/* Selector de Raciones con Stepper (+ / -) y Preset Chips */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center bg-white border-2 border-teal-600 rounded-xl shadow-xs overflow-hidden shrink-0 self-center sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleStepPortions(-1)}
                  disabled={targetPortions <= 1}
                  className="px-3.5 py-2 text-stone-600 hover:text-teal-700 hover:bg-stone-100 active:bg-stone-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Reducir 1 ración"
                >
                  <Minus size={16} />
                </button>
                <div className="flex items-center px-2 bg-white">
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={targetPortions}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v > 0) {
                        setTargetPortions(v);
                      }
                    }}
                    className="w-16 sm:w-20 text-center font-bold font-mono text-base sm:text-lg text-teal-900 focus:outline-none py-1"
                  />
                  <span className="text-xs font-semibold text-stone-400 select-none pr-1">
                    {portionUnitLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleStepPortions(1)}
                  className="px-3.5 py-2 text-stone-600 hover:text-teal-700 hover:bg-stone-100 active:bg-stone-200 transition-colors cursor-pointer"
                  title="Aumentar 1 ración"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Botones rápidos de selección de raciones */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider mr-0.5">
                    Acceso rápido:
                  </span>
                  {quickPresets.slice(0, 8).map((num) => {
                    const isCurrent = targetPortions === num;
                    const isOriginal = num === basePortions;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleSetPortions(num)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-teal-700 text-white shadow-xs'
                            : isOriginal
                              ? 'bg-orange-100 text-orange-900 border border-orange-300 hover:bg-orange-200'
                              : 'bg-white text-stone-700 border border-stone-200 hover:border-teal-400 hover:bg-stone-50'
                        }`}
                      >
                        {num} {isOriginal ? '★' : ''}
                      </button>
                    );
                  })}
                  {[20, 50, 100].map((num) => {
                    const isCurrent = targetPortions === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleSetPortions(num)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-teal-700 text-white shadow-xs'
                            : 'bg-white text-stone-600 border border-stone-200 hover:border-teal-400 hover:bg-stone-50'
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Resumen del factor de escala */}
            <div className="flex items-center justify-between text-[11px] text-stone-600 bg-white/80 p-2 rounded-xl border border-teal-100">
              <div className="flex items-center gap-1.5 font-medium">
                <Scale size={14} className="text-teal-600 shrink-0" />
                <span>
                  Factor aplicado: <strong className="font-mono text-teal-800 font-bold">x{scaleFactor.toFixed(2)}</strong>
                </span>
                <span className="text-stone-400">·</span>
                <span className="text-stone-500">
                  {isScaled
                    ? `Cantidades calculadas para ${targetPortions} ${portionUnitLabel}`
                    : 'Cantidades originales de la receta base'}
                </span>
              </div>
              <div className="text-[10px] text-stone-400 hidden sm:block">
                Costes y pesos se ajustan en la impresión
              </div>
            </div>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed font-medium">
            Elige el formato de documento que deseas generar e imprimir:
          </p>

          <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
            {options.map((opt) => {
              const isSelected = selectedMode === opt.mode;
              return (
                <div
                  key={opt.mode}
                  onClick={() => setSelectedMode(opt.mode)}
                  className={`relative rounded-2xl border-2 p-3 sm:p-3.5 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/40 shadow-sm ring-1 ring-teal-600/30'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                        isSelected ? 'bg-white border-teal-300 shadow-2xs' : 'bg-stone-100 border-stone-200'
                      }`}
                    >
                      {opt.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <h4 className="font-bold text-stone-900 text-sm sm:text-base leading-tight">
                          {opt.title}
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${opt.badgeColor}`}>
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mb-1.5 leading-snug">
                        {opt.subtitle}
                      </p>

                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-stone-600">
                        {opt.features.map((f, fIdx) => (
                          <li key={fIdx} className="flex items-center gap-1.5 leading-tight">
                            {f.included ? (
                              <Check size={12} className="text-emerald-600 shrink-0 font-bold" />
                            ) : (
                              <span className="w-3 h-3 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center text-[9px] font-bold shrink-0">
                                –
                              </span>
                            )}
                            <span className={f.included ? 'text-stone-700' : 'text-stone-400 italic'}>
                              {f.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="sm:self-center shrink-0 ml-auto sm:ml-0">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'border-teal-600 bg-teal-600' : 'border-stone-300 bg-white'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sub-recipes option if the dish contains linked elaborados */}
          {hasSubRecipes && (
            <div className="pt-1">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100/70 transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSubRecipes}
                  onChange={(e) => setIncludeSubRecipes(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-stone-300"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-semibold text-stone-800">
                    <Layers size={15} className="text-teal-600 shrink-0" />
                    <span>Incluir fichas de los elaborados vinculados en páginas siguientes (una por página)</span>
                  </div>
                  <p className="text-[11px] text-stone-500 pl-6 mt-0.5">
                    Cada elaborado se recalculará automáticamente con las cantidades proporcionales exactas necesarias para las {targetPortions} {portionUnitLabel}.
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-stone-400 text-center sm:text-left">
            El documento se descargará en PDF listo para imprimir en A4{isScaled ? ` (calculado para ${targetPortions} ${portionUnitLabel})` : ''}.
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isPrinting}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPrinting}
              className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Printer size={15} />
              <span>{isPrinting ? 'Generando PDF...' : `Generar PDF (${targetPortions} ${portionUnitLabel})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

