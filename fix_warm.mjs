import fs from 'fs';

const files = [
  'src/components/CreateElaboradoModal.tsx',
  'src/components/CreateRecipeModal.tsx',
  'src/components/CreateIngredientModal.tsx',
  'src/pages/Recipes.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');

  code = code.replace(/bg-\[#fcfbf9\]/g, 'bg-amber-50/40');
  
  fs.writeFileSync(file, code);
}
