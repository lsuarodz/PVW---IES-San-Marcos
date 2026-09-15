import fs from 'fs';
let code = fs.readFileSync('src/pages/Recipes.tsx', 'utf8');

// Distinct elegant teal/slate theme
code = code.replace(/bg-\[#FCFBFA\]/g, 'bg-slate-50');
code = code.replace(/ring-\[#E5E0D8\]/g, 'ring-slate-200');
code = code.replace(/border-\[#EAE5DF\]/g, 'border-slate-200');
code = code.replace(/bg-\[#F4F1EB\]/g, 'bg-slate-800 text-white');
code = code.replace(/text-\[#4A443B\]/g, 'text-white');
code = code.replace(/text-teal-800 bg-white/g, 'text-teal-100 bg-slate-700 border-slate-600');
code = code.replace(/text-\[#5C554C\]/g, 'text-slate-700');

fs.writeFileSync('src/pages/Recipes.tsx', code);
