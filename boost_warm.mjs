import fs from 'fs';

const files = [
  'src/components/CreateElaboradoModal.tsx',
  'src/components/CreateRecipeModal.tsx',
  'src/components/CreateIngredientModal.tsx',
  'src/pages/Recipes.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');

  // Let's make it obviously warm!
  code = code.replace(/bg-amber-50\/40/g, 'bg-orange-50');
  code = code.replace(/bg-amber-100\/40/g, 'bg-orange-100');
  code = code.replace(/ring-amber-200\/50/g, 'ring-orange-200');
  code = code.replace(/border-amber-200\/60/g, 'border-orange-200');
  code = code.replace(/text-amber-950/g, 'text-orange-950');
  code = code.replace(/text-amber-900\/80/g, 'text-orange-900');
  code = code.replace(/hover:bg-amber-100\/50/g, 'hover:bg-orange-100');
  
  fs.writeFileSync(file, code);
}
