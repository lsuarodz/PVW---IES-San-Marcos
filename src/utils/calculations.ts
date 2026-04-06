import { Ingredient, Recipe, RecipeIngredient, Menu } from '../types';

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
      return total + (subRecipe.totalCost * (Number(ri.quantity) || 0));
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

// Calcula el coste total de un menú sumando el coste de sus recetas
export const calculateMenuTotalCost = (
  recipeIds: string[],
  allRecipes: Recipe[]
): number => {
  return recipeIds.reduce((total, id) => {
    const recipe = allRecipes.find(r => r.id === id);
    return total + (recipe ? recipe.totalCost : 0);
  }, 0);
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
