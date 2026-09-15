import fs from 'fs';
let code = fs.readFileSync('src/pages/Recipes.tsx', 'utf8');

// Target the specific injected slate classes from the previous patch
code = code.replace(/bg-slate-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-\[90vh\] flex flex-col overflow-hidden ring-1 ring-slate-200/g, 'bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-stone-200');

code = code.replace(/p-6 border-b border-slate-200 flex justify-between items-center bg-slate-800 text-white/g, 'p-6 border-b border-stone-100 flex justify-between items-center bg-white');

code = code.replace(/text-xl font-bold text-white/g, 'text-xl font-bold text-stone-900');

code = code.replace(/text-teal-100 bg-slate-700 border-slate-600/g, 'text-teal-700 bg-teal-50 border-teal-100');

code = code.replace(/bg-slate-800 text-white border-stone-300/g, 'bg-white border-stone-300');

code = code.replace(/bg-slate-800 text-white p-3 rounded-xl border border-slate-200/g, 'bg-stone-50 p-3 rounded-xl border border-stone-200');

code = code.replace(/py-3 bg-slate-800 text-white border-2/g, 'py-3 bg-white border-2');

code = code.replace(/bg-slate-800 text-white rounded-b-2xl/g, 'bg-stone-50 rounded-b-2xl');

code = code.replace(/hover:bg-slate-800 text-white\/50/g, 'hover:bg-stone-50');

code = code.replace(/bg-slate-800 text-white\/70 rounded-2xl border border-slate-200\/60/g, 'bg-stone-50 rounded-2xl border border-stone-200');

code = code.replace(/hover:bg-slate-800 text-white disabled:opacity-50/g, 'hover:bg-stone-100 disabled:opacity-50');

code = code.replace(/hover:bg-slate-800 text-white rounded-xl/g, 'hover:bg-stone-200 rounded-xl');

code = code.replace(/border-\[#F0ECE6\]/g, 'border-stone-100');

// For the rest of the text slate-700 that I might have added
code = code.replace(/text-slate-700/g, 'text-stone-700');
code = code.replace(/border-slate-200/g, 'border-stone-200');

fs.writeFileSync('src/pages/Recipes.tsx', code);
