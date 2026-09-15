const fs = require('fs');
let code = fs.readFileSync('src/pages/Recipes.tsx', 'utf8');

const getPrintableRecipesFn = `
  const getPrintableRecipes = (mainRecipe: Recipe) => {
    const list: Recipe[] = [mainRecipe];
    if (mainRecipe.type !== 'elaborado') {
      const elaboradosIds = mainRecipe.ingredients
        .filter(ri => ri.itemType === 'elaborado' || recipes.find(r => r.id === ri.ingredientId)?.type === 'elaborado')
        .map(ri => ri.ingredientId);
      const uniqueElaboradosIds = Array.from(new Set(elaboradosIds));
      uniqueElaboradosIds.forEach(id => {
        const elab = recipes.find(r => r.id === id);
        if (elab) list.push(elab);
      });
    }
    return list;
  };
`;

code = code.replace(
  "const exportPDF = async (recipe: Recipe) => {", 
  getPrintableRecipesFn + "\n  const exportPDF = async (recipe: Recipe) => {"
);

code = code.replace(
  /<div ref=\{printRef\} className="print-container px-12 py-12 bg-white text-stone-900 font-serif w-\[794px\]  flex flex-col relative overflow-hidden">\s*<style>\{`([\s\S]*?)`\}<\/style>\s*<div className="z-10 w-full">/,
  `<div ref={printRef} className="print-container w-[794px] flex flex-col relative bg-white">
            <style>{\`$1
              .page-break { page-break-before: always; }
            \`}</style>
            {getPrintableRecipes(printingRecipe).map((pRecipe, index) => {
              const printingRecipe = pRecipe;
              return (
                <div key={printingRecipe.id + index} className={\`px-12 py-12 flex flex-col relative overflow-hidden text-stone-900 font-serif w-[794px] min-h-[1122px] bg-white \${index > 0 ? 'page-break' : ''}\`}>
                  <div className="z-10 w-full">`
);

code = code.replace(
  /              <\/div>\s*<div className="mt-auto pt-8 text-center">\s*<p className="text-\[8px\] text-stone-400 uppercase tracking-\[0\.3em\] font-sans">\s*Ficha Técnica · Proyecto Intermodular Gastronómico\s*<\/p>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\}/,
  `              </div>
              <div className="mt-auto pt-8 text-center">
                <p className="text-[8px] text-stone-400 uppercase tracking-[0.3em] font-sans">
                  Ficha Técnica · Proyecto Intermodular Gastronómico
                </p>
              </div>
            </div>
          </div>
          );
        })}
        </div>
        </div>
      )}`
);

fs.writeFileSync('src/pages/Recipes.tsx', code);
