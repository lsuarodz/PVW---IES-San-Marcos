import fs from 'fs';
let code = fs.readFileSync('src/pages/Recipes.tsx', 'utf8');

code = code.replace(
  /              <\/div>\s*<div className="mt-auto pt-8 text-center">\s*<p className="text-\[8px\] text-stone-400 uppercase tracking-\[0\.3em\] font-sans">\s*Ficha Técnica · Proyecto Intermodular Gastronómico\s*<\/p>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\}/g,
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
      )}`
);

fs.writeFileSync('src/pages/Recipes.tsx', code);
