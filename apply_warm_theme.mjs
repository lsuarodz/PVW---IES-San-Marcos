import fs from 'fs';

const files = [
  'src/components/CreateElaboradoModal.tsx',
  'src/components/CreateRecipeModal.tsx',
  'src/components/CreateIngredientModal.tsx',
  'src/pages/Recipes.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');

  // We need to carefully target the modal structures.
  // In Recipes.tsx, the modal container is `bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-stone-200`
  // In CreateRecipeModal.tsx: `bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col ring-1 ring-stone-200`
  
  // Actually, since I reverted everything globally to white/stone in `clean_modals.mjs`, I can just replace the specific strings.

  // 1. Container
  code = code.replace(/className="bg-white rounded-2xl shadow-(xl|2xl) w-full max-w-(4xl|2xl|md)( max-h-\[90vh\])?( flex flex-col)?( overflow-hidden)? ring-1 ring-stone-200"/g, 
    'className="bg-[#FCFBFA] rounded-2xl shadow-2xl w-full max-w-$2$3$4$5 ring-1 ring-[#E5E0D8]"');

  // 2. Header
  // e.g. className="p-6 border-b border-stone-100 flex justify-between items-center bg-white" (Recipes.tsx)
  // e.g. className="p-6 border-b border-stone-200 flex justify-between items-center bg-white rounded-t-2xl" (CreateRecipeModal.tsx)
  code = code.replace(/className="p-6 border-b border-stone-[12]00( \/50)?( flex justify-between items-center)? bg-white( rounded-t-2xl)?"/g, 
    'className="p-6 border-b border-[#EAE5DF]$2 bg-[#F4F1EB]$3"');
  
  code = code.replace(/className="p-6 border-b border-stone-200 bg-white rounded-t-2xl"/g, 
    'className="p-6 border-b border-[#EAE5DF] bg-[#F4F1EB] rounded-t-2xl"');

  // 3. Header Text
  code = code.replace(/className="text-xl font-bold text-stone-900"/g, 'className="text-xl font-bold text-[#4A443B]"');

  // 4. Inputs and internal items
  // e.g. bg-white border border-stone-200 shadow-sm
  code = code.replace(/bg-white border border-stone-200/g, 'bg-white border border-[#EAE5DF]');
  code = code.replace(/text-stone-700/g, 'text-[#5C554C]');
  code = code.replace(/border-stone-200/g, 'border-[#EAE5DF]');
  code = code.replace(/border-stone-100/g, 'border-[#EAE5DF]'); // for footers

  // 5. Footers
  code = code.replace(/className="p-6 border-t border-[#EAE5DF] flex justify-end gap-3 bg-white rounded-b-2xl"/g, 
    'className="p-6 border-t border-[#EAE5DF] flex justify-end gap-3 bg-[#F4F1EB] rounded-b-2xl"');
  code = code.replace(/className="p-6 border-t border-[#EAE5DF] flex gap-3 justify-end bg-white rounded-b-2xl"/g, 
    'className="p-6 border-t border-[#EAE5DF] flex justify-end gap-3 bg-[#F4F1EB] rounded-b-2xl"');

  // Buttons in footer
  code = code.replace(/hover:bg-stone-100/g, 'hover:bg-[#EAE5DF]');

  // Teal header badge
  code = code.replace(/text-teal-700 bg-teal-50( px-3 py-1 rounded-lg)? border border-teal-100/g, 
    'text-teal-800 bg-white$1 shadow-sm border border-[#EAE5DF]');

  fs.writeFileSync(file, code);
}
