import fs from 'fs';
let code = fs.readFileSync('src/pages/Recipes.tsx', 'utf8');

// Modal container
code = code.replace(/bg-\[#FCFBFA\]/g, 'bg-stone-100');
code = code.replace(/ring-\[#E5E0D8\]/g, 'ring-stone-200');

// Header
code = code.replace(/bg-\[#F4F1EB\]/g, 'bg-stone-200/50');
code = code.replace(/border-\[#EAE5DF\]/g, 'border-stone-200');
code = code.replace(/text-\[#4A443B\]/g, 'text-stone-800');

// Inputs
code = code.replace(/bg-white border border-\[#EAE5DF\] shadow-sm/g, 'bg-white border border-stone-200 shadow-sm');
code = code.replace(/text-\[#5C554C\]/g, 'text-stone-700');

// We will change it to an elegant dark mode or an elegant slate mode for the form to make it distinct.
// Actually, let's use a very distinct warm elegant palette: bg-amber-50/30, headers in bg-amber-100/50
// Let's do a slate elegant look.

