import React, { useState } from 'react';
import { Recipe } from '../types';
import { ChefHat, BookOpen, Calculator, FileText, Check, X, Printer, Layers } from 'lucide-react';

export type RecipePrintMode = 'technical' | 'complete' | 'costing';

interface RecipePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  onPrint: (recipe: Recipe, mode: RecipePrintMode, includeSubRecipes: boolean) => void;
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

  if (!isOpen || !recipe) return null;

  const isElaborado = recipe.type === 'elaborado';

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
      icon: <ChefHat size={24} className="text-amber-600" />,
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
      icon: <BookOpen size={24} className="text-teal-600" />,
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
      icon: <Calculator size={24} className="text-emerald-600" />,
      features: [
        { text: 'Pesos brutos y netos detallados con porcentajes de merma', included: true },
        { text: 'Escandallo completo con costes por ingrediente', included: true },
        { text: 'Coste total, coste por ración y resumen de materias primas', included: true },
        { text: 'Omite pasos de elaboración y diagrama de tiempos', included: false }
      ]
    }
  ];

  const handleConfirm = () => {
    onPrint(recipe, selectedMode, includeSubRecipes);
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

        {/* Modal Body: Options selection */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Elige el formato de documento que deseas generar e imprimir:
          </p>

          <div className="grid grid-cols-1 gap-3 sm:gap-3.5">
            {options.map((opt) => {
              const isSelected = selectedMode === opt.mode;
              return (
                <div
                  key={opt.mode}
                  onClick={() => setSelectedMode(opt.mode)}
                  className={`relative rounded-2xl border-2 p-4 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/40 shadow-sm ring-1 ring-teal-600/30'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                        isSelected ? 'bg-white border-teal-300 shadow-2xs' : 'bg-stone-100 border-stone-200'
                      }`}
                    >
                      {opt.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="font-bold text-stone-900 text-sm sm:text-base leading-tight">
                          {opt.title}
                        </h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${opt.badgeColor}`}>
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mb-2 leading-snug">
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
            <div className="pt-2">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100/70 transition-colors cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSubRecipes}
                  onChange={(e) => setIncludeSubRecipes(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-stone-300"
                />
                <div className="flex items-center gap-2 text-xs font-medium text-stone-700">
                  <Layers size={15} className="text-teal-600" />
                  <span>Incluir fichas de los elaborados vinculados en páginas siguientes (una por página)</span>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-stone-400 text-center sm:text-left">
            El documento se descargará en formato PDF listo para imprimir en A4.
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
              <span>{isPrinting ? 'Generando PDF...' : 'Generar PDF / Imprimir'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
