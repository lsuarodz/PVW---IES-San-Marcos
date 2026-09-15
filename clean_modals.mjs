import fs from 'fs';
const files = [
  'src/components/CreateElaboradoModal.tsx',
  'src/components/CreateRecipeModal.tsx',
  'src/components/CreateIngredientModal.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Revert pearl/sand to white/stone
  code = code.replace(/bg-\[#FCFBFA\]/g, 'bg-white');
  code = code.replace(/ring-\[#E5E0D8\]/g, 'ring-stone-200');
  code = code.replace(/border-\[#EAE5DF\]/g, 'border-stone-200');
  code = code.replace(/bg-\[#F4F1EB\]/g, 'bg-white');
  code = code.replace(/text-\[#4A443B\]/g, 'text-stone-900');
  code = code.replace(/text-\[#5C554C\]/g, 'text-stone-700');
  code = code.replace(/border-\[#EAE5DF\]/g, 'border-stone-200');
  code = code.replace(/bg-white border border-\[#EAE5DF\]/g, 'bg-white border border-stone-200');
  code = code.replace(/hover:bg-\[#EAE5DF\]/g, 'hover:bg-stone-100');
  
  // Custom for teal header badge in CreateRecipeModal
  code = code.replace(/text-teal-800 bg-white px-3 py-1 rounded-lg shadow-sm border border-\[#EAE5DF\]/g, 'text-teal-700 bg-teal-50 px-3 py-1 rounded-lg border border-teal-100');
  
  fs.writeFileSync(file, code);
}
