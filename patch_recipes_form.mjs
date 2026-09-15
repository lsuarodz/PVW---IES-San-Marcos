import fs from 'fs';
let code = fs.readFileSync('src/pages/Recipes.tsx', 'utf8');

// Row container
code = code.replace(/<div key=\{index\} className="flex gap-3 items-start bg-stone-50 p-3 rounded-xl border border-stone-200">/g, '<div key={index} className="flex gap-2 items-start bg-white p-2 px-3 rounded-lg border border-stone-200 shadow-sm relative">');

// Padding on columns
code = code.replace(/className="flex-1 min-w-0 flex gap-2 pt-4"/g, 'className="flex-1 min-w-0 flex gap-1.5 pt-3"');
code = code.replace(/className="w-40 shrink-0 pt-4 relative"/g, 'className="w-40 shrink-0 pt-3 relative"');
code = code.replace(/className="w-56 shrink-0 pt-4 relative"/g, 'className="w-56 shrink-0 pt-3 relative"');
code = code.replace(/className="w-24 text-right font-medium text-stone-700 pt-\[26px\]"/g, 'className="w-24 text-right font-bold text-teal-700 pt-[22px] text-sm"');
code = code.replace(/className="pt-4"/g, 'className="pt-3"');

// Inputs in the row
code = code.replace(/className="w-full px-2 py-2 h-\[38px\] text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-stone-400 disabled:opacity-50 disabled:cursor-not-allowed"/g, 'className="w-full px-2 py-1.5 h-[34px] text-[13px] bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-stone-400 disabled:opacity-50 disabled:cursor-not-allowed"');

// Delete button
code = code.replace(/className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors h-\[38px\] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"/g, 'className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors h-[34px] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"');

// Edit buttons
code = code.replace(/className="p-2 text-stone-500 hover:text-teal-600 bg-white border border-stone-200 rounded-lg flex-shrink-0 h-\[38px\]"/g, 'className="p-1.5 text-stone-500 hover:text-teal-600 bg-white border border-stone-200 rounded-lg flex-shrink-0 h-[34px]"');
code = code.replace(/className="p-2 text-stone-500 hover:text-indigo-600 bg-white border border-stone-200 rounded-lg flex items-center justify-center flex-shrink-0 h-\[38px\]"/g, 'className="p-1.5 text-stone-500 hover:text-indigo-600 bg-white border border-stone-200 rounded-lg flex items-center justify-center flex-shrink-0 h-[34px]"');

// Add subtle labels for "preelaborar"
code = code.replace(/<div className="absolute top-0 left-1 text-\[10px\] text-stone-500 font-medium">preelaborar<\/div>/g, '<div className="absolute top-0 left-1 text-[9px] text-stone-500 font-medium uppercase tracking-wider">preelaborar</div>');

// Main form container (optional aesthetic improvements)
code = code.replace(/className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-\[90vh\] flex flex-col"/g, 'className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-stone-900/5"');
code = code.replace(/className="p-6 border-b border-stone-100 flex justify-between items-center"/g, 'className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/50"');
code = code.replace(/className="p-6 overflow-y-auto flex-1 space-y-6"/g, 'className="p-5 overflow-y-auto flex-1 space-y-5"');

// Save it
fs.writeFileSync('src/pages/Recipes.tsx', code);
