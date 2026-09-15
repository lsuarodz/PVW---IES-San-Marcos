import fs from 'fs';
let code = fs.readFileSync('src/components/CreateRecipeModal.tsx', 'utf8');

// Container
code = code.replace(/className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-\[90vh\] flex flex-col"/g, 'className="bg-[#FCFBFA] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col ring-1 ring-[#E5E0D8]"');

// Header
code = code.replace(/className="p-6 border-b border-stone-100 flex justify-between items-center"/g, 'className="p-6 border-b border-[#EAE5DF] flex justify-between items-center bg-[#F4F1EB] rounded-t-2xl"');

fs.writeFileSync('src/components/CreateRecipeModal.tsx', code);
