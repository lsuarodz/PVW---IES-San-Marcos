import fs from 'fs';
let code = fs.readFileSync('src/pages/Orders.tsx', 'utf8');

code = code.replace(
  /className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold py-2\.5 px-4 rounded-xl transition-colors shadow-sm text-sm disabled:opacity-50 flex justify-center items-center gap-2"/g,
  'className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors shadow-sm text-sm disabled:opacity-50 flex justify-center items-center gap-2"'
);

fs.writeFileSync('src/pages/Orders.tsx', code);
