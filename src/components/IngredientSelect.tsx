import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';
import { Ingredient, Recipe } from '../types';

interface IngredientSelectProps {
  value: string;
  onChange: (id: string) => void;
  ingredients: Ingredient[];
  recipes: Recipe[];
  disabled?: boolean;
  itemType?: 'ingredient' | 'elaborado';
  currentRecipeId?: string | null;
  autoFocus?: boolean;
  onClose?: () => void;
}

export default function IngredientSelect({ 
  value, 
  onChange, 
  ingredients, 
  recipes, 
  disabled, 
  itemType,
  currentRecipeId,
  autoFocus,
  onClose
}: IngredientSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
        onClose?.();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle autoFocus on mount or when autoFocus prop becomes true
  useEffect(() => {
    if (autoFocus && !disabled) {
      setIsOpen(true);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
        wrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, disabled]);

  // When isOpen becomes true, focus the input
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const selectedIngredient = ingredients.find(i => i.id === value);
  const selectedRecipe = recipes.find(r => r.id === value);
  
  const displayValue = selectedIngredient 
    ? `${selectedIngredient.nameES} (${selectedIngredient.costPerUnit.toFixed(2)}€/${selectedIngredient.unit})`
    : selectedRecipe
    ? `${selectedRecipe.nameES} (${(selectedRecipe.totalCost / (selectedRecipe.yieldQuantity || 1)).toFixed(2)}€/${selectedRecipe.yieldUnit || 'ud'})`
    : '';

  const filteredIngredients = itemType === 'elaborado' ? [] : ingredients.filter(i => 
    i.nameES.toLowerCase().includes(search.toLowerCase())
  );
  
  const filteredRecipes = itemType === 'ingredient' ? [] : recipes
    .filter(r => r.id !== currentRecipeId && r.type === 'elaborado')
    .filter(r => r.nameES.toLowerCase().includes(search.toLowerCase()));

  const allVisibleItems = [
    ...filteredIngredients.map(i => ({
      id: i.id,
      name: i.nameES,
      detail: `${i.costPerUnit.toFixed(2)}€/${i.unit}`,
      category: 'Ingredientes',
      isRecipe: false,
    })),
    ...filteredRecipes.map(r => ({
      id: r.id,
      name: r.nameES,
      detail: `${(r.totalCost / (r.yieldQuantity || 1)).toFixed(2)}€/${r.yieldUnit || 'ud'}`,
      category: 'Elaborados',
      isRecipe: true,
    })),
  ];

  // Auto-scroll to highlighted item in the dropdown
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-highlighted="true"]') as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearch('');
    onClose?.();
  };

  const handleMouseMove = (index: number, e: React.MouseEvent) => {
    if (e.clientX !== lastMousePosRef.current.x || e.clientY !== lastMousePosRef.current.y) {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      setHighlightedIndex(index);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (allVisibleItems.length > 0) {
        setHighlightedIndex(prev => (prev < allVisibleItems.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (allVisibleItems.length > 0) {
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : allVisibleItems.length - 1));
      }
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (allVisibleItems.length > 0) {
        e.preventDefault();
        const itemToSelect = allVisibleItems[highlightedIndex] || allVisibleItems[0];
        if (itemToSelect) {
          handleSelect(itemToSelect.id);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearch('');
      onClose?.();
    }
  };

  const placeholderText = itemType === 'elaborado' 
    ? 'Selecciona o escribe para buscar elaborado...' 
    : itemType === 'ingredient'
      ? 'Selecciona o escribe para buscar ingrediente...'
      : 'Selecciona o escribe para buscar...';

  return (
    <div className="relative flex-1 min-w-0" ref={wrapperRef}>
      {!isOpen ? (
        <div 
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') && !disabled) {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
          onClick={() => !disabled && setIsOpen(true)}
          className={`flex items-center px-2.5 py-1.5 h-[34px] bg-white border border-stone-200 rounded-lg cursor-pointer transition-all ${
            disabled 
              ? 'opacity-50 cursor-not-allowed bg-stone-50' 
              : 'hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500'
          }`}
          title={displayValue || placeholderText}
        >
          <span className={`flex-1 truncate text-[13px] ${displayValue ? 'text-stone-800 font-medium' : 'text-stone-400'}`}>
            {displayValue || placeholderText}
          </span>
          <ChevronDown size={16} className="text-stone-400 shrink-0 ml-1" />
        </div>
      ) : (
        <div className="flex items-center px-2 py-1 h-[34px] bg-white border-2 border-teal-500 rounded-lg shadow-xs ring-2 ring-teal-500/20">
          <Search size={14} className="text-teal-600 mr-1.5 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setHighlightedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={displayValue || placeholderText}
            className="flex-1 text-[13px] outline-none bg-transparent placeholder:text-stone-400 font-medium text-stone-900 min-w-0"
          />
          {search ? (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setSearch('');
                searchInputRef.current?.focus();
              }}
              className="text-stone-400 hover:text-stone-600 p-0.5 rounded cursor-pointer"
              title="Borrar texto"
            >
              <X size={14} />
            </button>
          ) : (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsOpen(false);
                onClose?.();
              }}
              className="text-stone-400 hover:text-stone-600 p-0.5 rounded cursor-pointer"
              title="Cerrar selector"
            >
              <ChevronDown size={16} className="text-teal-600" />
            </button>
          )}
        </div>
      )}

      {isOpen && !disabled && (
        <div 
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl max-h-60 overflow-y-auto p-1 text-[13px]"
        >
          {itemType !== 'elaborado' && filteredIngredients.length > 0 && (
            <div className="mb-1">
              {itemType !== 'ingredient' && (
                <div className="px-2 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Ingredientes</div>
              )}
              {filteredIngredients.map(ing => {
                const itemIndex = allVisibleItems.findIndex(i => i.id === ing.id && !i.isRecipe);
                const isHighlighted = itemIndex === highlightedIndex;
                const isSelected = ing.id === value;

                return (
                  <div
                    key={ing.id}
                    data-highlighted={isHighlighted ? "true" : undefined}
                    onMouseMove={(e) => handleMouseMove(itemIndex, e)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(ing.id);
                    }}
                    className={`px-2.5 py-1.5 h-[34px] flex items-center justify-between cursor-pointer rounded-lg truncate transition-colors ${
                      isHighlighted 
                        ? 'bg-teal-100 text-teal-950 font-semibold ring-1 ring-teal-400' 
                        : isSelected
                          ? 'bg-teal-50 text-teal-900 font-semibold'
                          : 'text-stone-800 hover:bg-stone-50'
                    }`}
                  >
                    <span className="truncate">
                      {ing.nameES} <span className="text-stone-500 text-xs font-mono">({ing.costPerUnit.toFixed(2)}€/{ing.unit})</span>
                    </span>
                    {isSelected && <Check size={14} className="text-teal-600 shrink-0 ml-1.5" />}
                  </div>
                );
              })}
            </div>
          )}
          
          {itemType !== 'ingredient' && filteredRecipes.length > 0 && (
            <div>
              {itemType !== 'elaborado' && (
                <div className="px-2 py-1 text-[10px] font-bold text-indigo-400 uppercase tracking-wider mt-1">Elaborados</div>
              )}
              {filteredRecipes.map(r => {
                const unitCost = r.totalCost / (r.yieldQuantity || 1);
                const itemIndex = allVisibleItems.findIndex(i => i.id === r.id && i.isRecipe);
                const isHighlighted = itemIndex === highlightedIndex;
                const isSelected = r.id === value;

                return (
                  <div
                    key={r.id}
                    data-highlighted={isHighlighted ? "true" : undefined}
                    onMouseMove={(e) => handleMouseMove(itemIndex, e)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(r.id);
                    }}
                    className={`px-2.5 py-1.5 h-[34px] flex items-center justify-between cursor-pointer rounded-lg truncate transition-colors ${
                      isHighlighted 
                        ? 'bg-indigo-100 text-indigo-950 font-semibold ring-1 ring-indigo-400' 
                        : isSelected
                          ? 'bg-indigo-50 text-indigo-900 font-semibold'
                          : 'text-stone-800 hover:bg-stone-50'
                    }`}
                  >
                    <span className="truncate">
                      {r.nameES} <span className="text-indigo-500 text-xs font-mono">({unitCost.toFixed(2)}€/{r.yieldUnit || 'ud'})</span>
                    </span>
                    {isSelected && <Check size={14} className="text-indigo-600 shrink-0 ml-1.5" />}
                  </div>
                );
              })}
            </div>
          )}

          {allVisibleItems.length === 0 && (
            <div className="p-4 text-[13px] text-stone-500 text-center">
              No se encontraron resultados para "{search}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
