import React, { useState, useEffect } from 'react';
import { RecipeIngredient, Ingredient, Recipe } from '../types';
import { Trash2 } from 'lucide-react'; // not needed for this component actually, we're not rendering trash here

interface Props {
  ri: RecipeIngredient;
  index: number;
  selectedIng?: Ingredient;
  subRecipe?: Recipe;
  editingId: string | null;
  recipes: Recipe[];
  updateRecipeIngredient: (index: number, field: keyof RecipeIngredient, value: any) => void;
  canEditField: (recipe: Recipe, field: string) => boolean;
}

export const RecipeIngredientInput: React.FC<Props> = ({
  ri, index, selectedIng, subRecipe, editingId, recipes, updateRecipeIngredient, canEditField
}) => {
  const isUnit = ri.usePortions || selectedIng?.unit === 'ud' || selectedIng?.unit === 'unidad' || subRecipe?.yieldUnit === 'ud' || subRecipe?.yieldUnit === 'unidad';
  const waste = selectedIng?.wastePercentage || 0;
  
  const isDisabled = editingId ? !canEditField(recipes.find(r => r.id === editingId)!, 'escandallo') : false;

  // Local state to hold the exact string typed by the user to avoid losing dots/commas
  const [localGross, setLocalGross] = useState<string>(ri.quantity?.toString() || '');
  const [localNet, setLocalNet] = useState<string>('');

  // Sync from props
  useEffect(() => {
    const grossNum = Number(ri.quantity);
    if (!isNaN(grossNum) && (ri.quantity as any) !== '') {
      const expectedNet = (Math.max(0, grossNum * (1 - waste / 100))).toFixed(3);
      
      // Calculate missing net/gross if the component just mounted or waste changed
      if (Math.abs(Number(localGross) - grossNum) > 0.0001 || localGross === '' || localNet === '' || localNet !== expectedNet) {
        setLocalGross(Number(ri.quantity.toString()).toFixed(3).replace(/\.?0+$/, ''));
        setLocalNet(expectedNet.replace(/\.?0+$/, ''));
      }
    } else {
      if ((ri.quantity as any) === '' || ri.quantity === undefined) {
        setLocalGross('');
        setLocalNet('');
      }
    }
  }, [ri.quantity, waste]);

  if (isUnit) {
    return (
      <div className="relative">
        <div className="absolute -top-4 left-1 text-[10px] text-stone-500 font-medium">Unidades</div>
        <input
          type="number"
          step="0.001"
          min="0"
          required
          value={ri.quantity}
          disabled={isDisabled}
          onChange={e => updateRecipeIngredient(index, 'quantity', e.target.value)}
          onFocus={e => e.target.select()}
          className="w-full pl-2 pr-10 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          placeholder="Unidades"
        />
        <button
          type="button"
          disabled={(!subRecipe || !subRecipe.portions) || isDisabled}
          onClick={() => updateRecipeIngredient(index, 'usePortions', !ri.usePortions)}
          title={ri.usePortions ? "Cambiar a unidad base" : (subRecipe?.portions ? "Cambiar a raciones" : "No hay raciones definidas")}
          className={`absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold px-1 py-0.5 rounded transition-colors ${
            ri.usePortions 
              ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' 
              : 'bg-stone-100 text-stone-500 hover:bg-stone-200 disabled:opacity-50'
          }`}
        >
          {ri.usePortions ? 'ud' : (selectedIng?.unit || (subRecipe?.yieldUnit || 'ud'))}
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 relative">
      <div className="relative flex-1">
        <div className="absolute -top-4 left-1 text-[10px] text-stone-500 font-medium">Neto</div>
        <input
          type="text"
          inputMode="decimal"
          required
          value={localNet}
          disabled={isDisabled}
          onChange={e => {
            const val = e.target.value.replace(',', '.');
            setLocalNet(val); // Keep exact string
            
            if (val === '') {
              setLocalGross('');
              updateRecipeIngredient(index, 'quantity', '');
              return;
            }
            if (/^\d*\.?\d*$/.test(val) && !val.endsWith('.')) {
              const net = Number(val);
              const gross = waste === 100 ? 0 : net / (1 - waste / 100);
              const formattedGross = Number(gross.toFixed(3)).toString();
              setLocalGross(formattedGross);
              updateRecipeIngredient(index, 'quantity', formattedGross);
            }
          }}
          onBlur={() => {
            if (localNet && !isNaN(Number(localNet))) {
              const net = Number(localNet);
              const gross = waste === 100 ? 0 : net / (1 - waste / 100);
              const formattedNet = net.toFixed(3);
              const formattedGross = Number(gross.toFixed(3)).toString();
              setLocalNet(formattedNet);
              setLocalGross(formattedGross);
              updateRecipeIngredient(index, 'quantity', formattedGross);
            }
          }}
          onFocus={e => e.target.select()}
          className="w-full pl-2 pr-7 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          placeholder="Neto"
          title="Peso neto (listo para usar)"
        />
        <button
          type="button"
          disabled={(!subRecipe || !subRecipe.portions) || isDisabled}
          onClick={() => updateRecipeIngredient(index, 'usePortions', !ri.usePortions)}
          title={ri.usePortions ? "Cambiar a unidad base" : (subRecipe?.portions ? "Cambiar a raciones" : "No hay raciones definidas")}
          className={`absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold px-1 py-0.5 rounded transition-colors ${
            ri.usePortions 
              ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' 
              : 'bg-stone-100 text-stone-500 hover:bg-stone-200 disabled:opacity-50'
          }`}
        >
          {ri.usePortions ? 'ud' : (selectedIng?.unit || (subRecipe?.yieldUnit || 'ud'))}
        </button>
      </div>
      <div className="relative flex-1">
        <div className="absolute -top-4 left-1 text-[10px] text-stone-500 font-medium">Bruto</div>
        <input
          type="text"
          inputMode="decimal"
          required
          value={localGross}
          disabled={isDisabled}
          onChange={e => {
            const val = e.target.value.replace(',', '.');
            setLocalGross(val);
            if (val === '') {
              setLocalNet('');
              updateRecipeIngredient(index, 'quantity', '');
              return;
            }
            if (/^\d*\.?\d*$/.test(val) && !val.endsWith('.')) {
              const grossNum = Number(val);
              const netNum = grossNum * (1 - waste / 100);
              const formattedNet = netNum.toFixed(3);
              setLocalNet(formattedNet);
              updateRecipeIngredient(index, 'quantity', val);
            }
          }}
          onBlur={() => {
            if (localGross && !isNaN(Number(localGross))) {
              const formattedGross = Number(localGross).toFixed(3);
              setLocalGross(formattedGross);
              updateRecipeIngredient(index, 'quantity', formattedGross);
            }
          }}
          onFocus={e => e.target.select()}
          className="w-full pl-2 pr-1 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          placeholder="Bruto"
          title={`Peso bruto ${selectedIng?.wastePercentage ? `(Merma: ${selectedIng.wastePercentage}%)` : ''}`}
        />
      </div>
    </div>
  );
};
