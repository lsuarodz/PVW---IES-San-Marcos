import fs from 'fs';
let code = fs.readFileSync('src/components/RecipeIngredientInput.tsx', 'utf8');

// Replace padding and sizes
code = code.replace(/py-2/g, 'py-1.5');
code = code.replace(/text-sm/g, 'text-[13px]');
code = code.replace(/-top-4/g, '-top-3.5 text-[9px]');

fs.writeFileSync('src/components/RecipeIngredientInput.tsx', code);
