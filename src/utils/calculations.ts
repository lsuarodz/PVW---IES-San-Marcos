import { Ingredient, Recipe, RecipeIngredient, Menu, ExtraConcept } from '../types';

// Calcula el coste total de una receta sumando el coste de sus ingredientes (y sub-recetas)
export const calculateRecipeTotalCost = (
  recipeIngredients: RecipeIngredient[],
  allIngredients: Ingredient[],
  allRecipes: Recipe[]
): number => {
  return recipeIngredients.reduce((total, ri) => {
    // Buscamos si es un ingrediente normal
    const ing = allIngredients.find(i => i.id === ri.ingredientId);
    if (ing) {
      return total + (ing.costPerUnit * (Number(ri.quantity) || 0));
    }
    // Si no es un ingrediente, podría ser un sub-escandallo (receta dentro de receta)
    const subRecipe = allRecipes.find(r => r.id === ri.ingredientId);
    if (subRecipe) {
      if (ri.usePortions && subRecipe.portions) {
        const costPerServing = subRecipe.totalCost / subRecipe.portions;
        return total + (costPerServing * (Number(ri.quantity) || 0));
      }
      const unitCost = subRecipe.totalCost / (subRecipe.yieldQuantity || 1);
      return total + (unitCost * (Number(ri.quantity) || 0));
    }
    return total;
  }, 0);
};

// Extrae todos los alérgenos únicos de una receta
export const getRecipeAllergens = (
  recipeIngredients: RecipeIngredient[],
  allIngredients: Ingredient[],
  allRecipes: Recipe[]
): string[] => {
  const allergenSet = new Set<string>();
  
  const extractAllergens = (ingredientsList: RecipeIngredient[]) => {
    ingredientsList.forEach(ri => {
      const ing = allIngredients.find(i => i.id === ri.ingredientId);
      if (ing && ing.allergens) {
        ing.allergens.forEach(a => allergenSet.add(a));
      } else {
        const subRecipe = allRecipes.find(r => r.id === ri.ingredientId);
        if (subRecipe) {
          extractAllergens(subRecipe.ingredients);
        }
      }
    });
  };

  extractAllergens(recipeIngredients);
  return Array.from(allergenSet);
};

// Calcula el coste total de un menú sumando el coste de sus recetas y conceptos extra
export const calculateMenuTotalCost = (
  recipeIds: string[],
  allRecipes: Recipe[],
  extraConcepts: (ExtraConcept | { name: string; cost: number | string })[] = []
): number => {
  const recipesCost = (recipeIds || []).reduce((total, id) => {
    const recipe = allRecipes.find(r => r.id === id);
    const cost = recipe && typeof recipe.totalCost === 'number' && !isNaN(recipe.totalCost) ? recipe.totalCost : 0;
    return total + cost;
  }, 0);

  const extrasCost = (extraConcepts || []).reduce((total, concept) => {
    if (!concept || concept.cost === undefined || concept.cost === null || concept.cost === '') return total;
    const rawCost = typeof concept.cost === 'string' ? concept.cost.replace(',', '.') : concept.cost;
    const num = parseFloat(String(rawCost));
    return total + (isNaN(num) ? 0 : num);
  }, 0);

  return Number((recipesCost + extrasCost).toFixed(2));
};

// Extrae todos los alérgenos únicos de un menú
export const getMenuAllergens = (
  recipeIds: string[],
  allIngredients: Ingredient[],
  allRecipes: Recipe[]
): string[] => {
  const allergenSet = new Set<string>();
  
  const extractAllergens = (rId: string) => {
    const recipe = allRecipes.find(r => r.id === rId);
    if (recipe) {
      recipe.ingredients.forEach(ri => {
        const ing = allIngredients.find(i => i.id === ri.ingredientId);
        if (ing && ing.allergens) {
          ing.allergens.forEach(a => allergenSet.add(a));
        } else {
          const subRecipe = allRecipes.find(r => r.id === ri.ingredientId);
          if (subRecipe) {
            extractAllergens(subRecipe.id);
          }
        }
      });
    }
  };

  recipeIds.forEach(extractAllergens);
  return Array.from(allergenSet);
};

// Calcula el peso total aproximado de los ingredientes de una receta/elaborado (en kg)
export const calculateRecipeTotalWeightKg = (
  recipeIngredients: RecipeIngredient[],
  allIngredients: Ingredient[],
  allRecipes: Recipe[]
): number => {
  return (recipeIngredients || []).reduce((total, ri) => {
    const qty = Number(ri.quantity) || 0;
    if (qty <= 0) return total;
    const ing = allIngredients.find(i => i.id === ri.ingredientId);
    if (ing) {
      const u = (ing.unit || '').toLowerCase().trim();
      if (u === 'kg') return total + qty;
      if (u === 'g' || u === 'gr') return total + (qty / 1000);
      if (u === 'l' || u === 'litro' || u === 'litros') return total + qty;
      if (u === 'ml') return total + (qty / 1000);
      if (u === 'cl') return total + (qty / 100);
      if (u === 'dl') return total + (qty / 10);
      if ((u === 'ud' || u === 'unidad') && ing.weightPerUnit && ing.weightPerUnit > 0) {
        return total + (ing.weightPerUnit * qty);
      }
      return total;
    }
    const subRecipe = allRecipes.find(r => r.id === ri.ingredientId);
    if (subRecipe) {
      const u = (subRecipe.yieldUnit || '').toLowerCase().trim();
      if (u === 'kg') return total + qty;
      if (u === 'g' || u === 'gr') return total + (qty / 1000);
      if (u === 'l') return total + qty;
      if (u === 'ud' && subRecipe.unitWeight) {
        const subWKg = subRecipe.unitWeightUnit === 'kg' ? subRecipe.unitWeight : (subRecipe.unitWeight / 1000);
        return total + (subWKg * qty);
      }
    }
    return total;
  }, 0);
};

// Devuelve el texto formateado del peso por unidad para un elaborado (ej. "45 g", "0.250 kg")
export const getRecipeUnitWeightDisplay = (
  recipe: Partial<Recipe>,
  allIngredients: Ingredient[],
  allRecipes: Recipe[]
): string | null => {
  if (recipe.type !== 'elaborado' || recipe.yieldUnit !== 'ud') return null;

  // 1. Si el usuario definió explícitamente el peso por unidad
  if (recipe.unitWeight !== undefined && recipe.unitWeight !== null && Number(recipe.unitWeight) > 0) {
    const val = Number(recipe.unitWeight);
    const u = recipe.unitWeightUnit || 'g';
    return `${val} ${u}`;
  }

  // 2. Si no, calcularlo según el peso de los ingredientes y el rendimiento en unidades
  const units = Number(recipe.yieldQuantity) || 0;
  if (units > 0 && recipe.ingredients && recipe.ingredients.length > 0) {
    const totalWeightKg = calculateRecipeTotalWeightKg(recipe.ingredients, allIngredients, allRecipes);
    if (totalWeightKg > 0) {
      const weightPerUnitKg = totalWeightKg / units;
      if (weightPerUnitKg < 1) {
        const grams = Math.round(weightPerUnitKg * 1000 * 10) / 10;
        return `${grams} g`;
      }
      return `${weightPerUnitKg.toFixed(3)} kg`;
    }
  }

  return null;
};

