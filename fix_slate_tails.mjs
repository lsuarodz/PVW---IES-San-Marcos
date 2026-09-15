import fs from 'fs';
let code = fs.readFileSync('src/pages/Recipes.tsx', 'utf8');

code = code.replace(/bg-slate-800 text-white text-stone-500/g, 'bg-white text-stone-500');
code = code.replace(/hover:bg-slate-800 text-white/g, 'hover:bg-stone-50');

fs.writeFileSync('src/pages/Recipes.tsx', code);
