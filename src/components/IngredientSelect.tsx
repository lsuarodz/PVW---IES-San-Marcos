import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Ingredient, Recipe } from '../types';

interface IngredientSelectProps {
  value: string;
  onChange: (id: string) => void;
  ingredients: Ingredient[];
  recipes: Recipe[];
  disabled?: boolean;
  itemType?: 'ingredient' | 'elaborado';
  currentRecipeId?: string | null;
}

export default function IngredientSelect({ 
  value, 
  onChange, 
  ingredients, 
  recipes, 
  disabled, 
  itemType,
  currentRecipeId
}: IngredientSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedIngredient = ingredients.find(i => i.id === value);
  const selectedRecipe = recipes.find(r => r.id === value);
  
  const displayValue = selectedIngredient 
    ? `${selectedIngredient.nameES} (${selectedIngredient.costPerUnit.toFixed(2)}€/${selectedIngredient.unit})`
    : selectedRecipe
    ? `${selectedRecipe.nameES} (${(selectedRecipe.totalCost / (selectedRecipe.yieldQuantity || 1)).toFixed(2)}€/${selectedRecipe.yieldUnit || 'ud'})`
    : '';

  const filteredIngredients = ingredients.filter(i => 
    i.nameES.toLowerCase().includes(search.toLowerCase())
  );
  
  const filteredRecipes = recipes
    .filter(r => r.id !== currentRecipeId && r.type === 'elaborado')
    .filter(r => r.nameES.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative flex-1 min-w-0" ref={wrapperRef}>
      <div 
        className={`flex items-center px-3 py-2 bg-white border border-stone-200 rounded-lg cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed bg-stone-50' : 'focus-within:ring-2 focus-within:ring-teal-500'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className="flex-1 truncate text-sm">
          {displayValue || (itemType === 'elaborado' ? 'Selecciona un elaborado...' : 'Selecciona un ingrediente...')}
        </span>
        <ChevronDown size={16} className="text-stone-400" />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-60 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-stone-100 flex items-center gap-2">
            <Search size={16} className="text-stone-400 ml-1" />
            <input
              type="text"
              autoFocus
              className="flex-1 text-sm outline-none bg-transparent"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {itemType !== 'elaborado' && filteredIngredients.length > 0 && (
              <div className="mb-2">
                <div className="px-2 py-1 text-xs font-semibold text-stone-500 uppercase tracking-wider">Ingredientes</div>
                {filteredIngredients.map(ing => (
                  <div
                    key={ing.id}
                    className="px-3 py-2 text-sm hover:bg-teal-50 hover:text-teal-700 cursor-pointer rounded-lg truncate"
                    onClick={() => {
                      onChange(ing.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                  >
                    {ing.nameES} <span className="text-stone-400">({ing.costPerUnit.toFixed(2)}€/{ing.unit})</span>
                  </div>
                ))}
              </div>
            )}
            
            {itemType !== 'ingredient' && filteredRecipes.length > 0 && (
              <div>
                <div className="px-2 py-1 text-xs font-semibold text-stone-500 uppercase tracking-wider">Elaborados</div>
                {filteredRecipes.map(r => {
                  const unitCost = r.totalCost / (r.yieldQuantity || 1);
                  return (
                    <div
                      key={r.id}
                      className="px-3 py-2 text-sm hover:bg-teal-50 hover:text-teal-700 cursor-pointer rounded-lg truncate"
                      onClick={() => {
                        onChange(r.id);
                        setIsOpen(false);
                        setSearch('');
                      }}
                    >
                      {r.nameES} <span className="text-stone-400">({unitCost.toFixed(2)}€/{r.yieldUnit || 'ud'})</span>
                    </div>
                  );
                })}
              </div>
            )}

            {filteredIngredients.length === 0 && filteredRecipes.length === 0 && (
              <div className="p-3 text-sm text-stone-500 text-center">
                No se encontraron resultados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
