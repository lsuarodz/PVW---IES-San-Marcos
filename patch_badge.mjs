import fs from 'fs';
let code = fs.readFileSync('src/pages/Orders.tsx', 'utf8');

code = code.replace(
  /<span className=\{\`px-1\.5 py-0\.5 rounded text-\[9px\] uppercase font-bold \$\{order\.status === 'completed' \? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'\}\`\}>\s*\{order\.status === 'completed' \? 'Completado' : 'Pendiente'\}\s*<\/span>/g,
  `<span className={\`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold \$\{order.status === 'completed' ? 'bg-green-100 text-green-800' : order.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-600'\}\`}>
                              {order.status === 'completed' ? 'Completado' : order.status === 'pending' ? 'Pendiente' : 'Borrador'}
                            </span>`
);

code = code.replace(
  /<span className=\{\`text-\[9px\] uppercase font-bold tracking-wider px-1\.5 py-0\.5 rounded flex-shrink-0 \$\{order\.status === 'completed' \? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'\}\`\}>\s*\{order\.status === 'completed' \? 'Completado' : 'Pendiente'\}\s*<\/span>/g,
  `<span className={\`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 \$\{order.status === 'completed' ? 'bg-green-100 text-green-800' : order.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-600'\}\`}>
                            {order.status === 'completed' ? 'Completado' : order.status === 'pending' ? 'Pendiente' : 'Borrador'}
                          </span>`
);

fs.writeFileSync('src/pages/Orders.tsx', code);
