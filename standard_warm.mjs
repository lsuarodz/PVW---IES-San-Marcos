import fs from 'fs';

const files = [
  'src/components/CreateElaboradoModal.tsx',
  'src/components/CreateRecipeModal.tsx',
  'src/components/CreateIngredientModal.tsx',
  'src/pages/Recipes.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');

  // Replace arbitrary hex values with standard Tailwind warm colors (orange/stone/amber)
  
  // Backgrounds
  code = code.replace(/bg-\[#FCFBFA\]/g, 'bg-[#fcfbf9]'); // Wait, I shouldn't use hex. Let's replace the whole string.
  
  // We can just replace the specific strings.
  code = code.replace(/bg-\[#FCFBFA\]/g, 'bg-amber-50/40');
  code = code.replace(/bg-\[#F4F1EB\]/g, 'bg-amber-100/40');
  code = code.replace(/bg-white border border-\[#EAE5DF\]/g, 'bg-white border border-amber-200/60');
  
  // Borders and Rings
  code = code.replace(/ring-\[#E5E0D8\]/g, 'ring-amber-200/50');
  code = code.replace(/border-\[#EAE5DF\]/g, 'border-amber-200/60');
  
  // Text
  code = code.replace(/text-\[#4A443B\]/g, 'text-amber-950');
  code = code.replace(/text-\[#5C554C\]/g, 'text-amber-900/80');
  
  // Hovers
  code = code.replace(/hover:bg-\[#EAE5DF\]/g, 'hover:bg-amber-100/50');
  
  // Custom fix for recipes.tsx header badge if needed, though we already matched it
  
  fs.writeFileSync(file, code);
}
