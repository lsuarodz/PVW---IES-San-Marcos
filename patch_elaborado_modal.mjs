import fs from 'fs';
let code = fs.readFileSync('src/components/CreateElaboradoModal.tsx', 'utf8');

// Container
code = code.replace(/className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col"/g, 'className="bg-[#FCFBFA] rounded-2xl shadow-2xl w-full max-w-md flex flex-col ring-1 ring-[#E5E0D8]"');

// Header
code = code.replace(/className="p-6 border-b border-stone-200\/50"/g, 'className="p-6 border-b border-[#EAE5DF] bg-[#F4F1EB] rounded-t-2xl"');
code = code.replace(/className="text-xl font-bold text-stone-900"/g, 'className="text-xl font-bold text-[#4A443B]"');

// Inputs
code = code.replace(/bg-stone-50 border border-stone-200/g, 'bg-white border border-[#EAE5DF] shadow-sm');
code = code.replace(/text-stone-700/g, 'text-[#5C554C]');

// Footer
code = code.replace(/className="p-6 border-t border-stone-200\/50 flex justify-end gap-3 bg-stone-50 rounded-b-2xl"/g, 'className="p-6 border-t border-[#EAE5DF] flex justify-end gap-3 bg-[#F4F1EB] rounded-b-2xl"');
code = code.replace(/className="px-5 py-2.5 text-stone-600 hover:bg-stone-200\/50 rounded-xl font-medium transition-colors"/g, 'className="px-5 py-2.5 text-[#5C554C] hover:bg-[#EAE5DF] rounded-xl font-medium transition-colors"');

fs.writeFileSync('src/components/CreateElaboradoModal.tsx', code);
