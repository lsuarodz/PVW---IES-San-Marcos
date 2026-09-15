import fs from 'fs';
let code = fs.readFileSync('src/components/IngredientSelect.tsx', 'utf8');

code = code.replace(/px-3 py-2/g, 'px-2 py-1.5 h-[34px]');
code = code.replace(/text-sm/g, 'text-[13px]');

fs.writeFileSync('src/components/IngredientSelect.tsx', code);
