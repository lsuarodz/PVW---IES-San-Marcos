import fs from 'fs';
let code = fs.readFileSync('src/pages/Recipes.tsx', 'utf8');

// Replace modal container
code = code.replace(/className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-\[90vh\] flex flex-col overflow-hidden ring-1 ring-stone-900\/5"/g, 'className="bg-[#FCFBFA] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-[#E5E0D8]"');

// Replace modal header
code = code.replace(/className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50\/50"/g, 'className="p-6 border-b border-[#EAE5DF] flex justify-between items-center bg-[#F4F1EB]"');
code = code.replace(/className="text-xl font-bold text-stone-900"/g, 'className="text-xl font-bold text-[#4A443B]"');
code = code.replace(/className="text-lg font-bold text-teal-700"/g, 'className="text-lg font-bold text-teal-800 bg-white px-3 py-1 rounded-lg shadow-sm border border-[#EAE5DF]"');

// Replace general inputs and textareas bg
code = code.replace(/bg-stone-50 border border-stone-200/g, 'bg-white border border-[#EAE5DF] shadow-sm');
code = code.replace(/border-stone-200/g, 'border-[#EAE5DF]');
code = code.replace(/border-stone-100/g, 'border-[#F0ECE6]');
code = code.replace(/bg-stone-50/g, 'bg-[#F4F1EB]');

// Form area footer
code = code.replace(/className="p-5 border-t border-stone-100 flex justify-end gap-3 bg-stone-50\/50 rounded-b-2xl"/g, 'className="p-5 border-t border-[#EAE5DF] flex justify-end gap-3 bg-[#F4F1EB] rounded-b-2xl"');
code = code.replace(/className="px-5 py-2.5 text-stone-600 hover:bg-stone-200\/50 rounded-xl font-medium transition-colors"/g, 'className="px-5 py-2.5 text-[#5C554C] hover:bg-[#EAE5DF] rounded-xl font-medium transition-colors"');

fs.writeFileSync('src/pages/Recipes.tsx', code);
