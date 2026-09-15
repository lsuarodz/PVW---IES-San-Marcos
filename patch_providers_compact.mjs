import fs from 'fs';
let code = fs.readFileSync('src/pages/Providers.tsx', 'utf8');

// Replace grid container
code = code.replace('<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">', '<div className="flex flex-col gap-3">');

// Find the map block
const startIndex = code.indexOf('providers.map(provider => (');
if (startIndex !== -1) {
    const startDiv = code.indexOf('<div key={provider.id}', startIndex);
    const endDiv = code.indexOf(')))}', startDiv);
    
    if (startDiv !== -1 && endDiv !== -1) {
        const newLayout = `<div key={provider.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-stone-200 overflow-hidden flex flex-col sm:flex-row items-stretch sm:items-center p-2 sm:px-3 gap-3 group relative">
            <div className="flex-1 flex flex-col min-w-0 py-1">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                 <div className="flex-1 min-w-0 flex items-center gap-2">
                    <div className="w-6 h-6 shrink-0 bg-teal-50 text-teal-600 rounded-md flex items-center justify-center">
                      <Building2 size={12} />
                    </div>
                    <div className="flex flex-col truncate">
                        <h3 className="text-[13px] font-bold text-stone-900 leading-tight truncate" title={provider.name}>{provider.name}</h3>
                        {provider.goodsType && (
                            <span className="text-[9px] font-medium text-stone-500 uppercase tracking-wider">{provider.goodsType}</span>
                        )}
                    </div>
                 </div>
                 
                 <div className="flex flex-wrap items-center gap-3 shrink-0 text-xs mt-1 sm:mt-0">
                    {provider.contactName && (
                        <div className="flex items-center gap-1">
                           <span className="text-stone-400 font-semibold uppercase tracking-wider text-[9px]">Contacto:</span>
                           <span className="font-bold text-stone-700 text-[11px]">{provider.contactName}</span>
                        </div>
                    )}
                    {provider.phone && (
                        <div className="flex items-center gap-1">
                           <Phone size={10} className="text-stone-400" />
                           <span className="font-bold text-stone-700 text-[11px]">{provider.phone}</span>
                        </div>
                    )}
                    {provider.email && (
                        <div className="flex items-center gap-1">
                           <Mail size={10} className="text-stone-400" />
                           <span className="font-bold text-stone-700 text-[11px] truncate max-w-[120px]" title={provider.email}>{provider.email}</span>
                        </div>
                    )}
                 </div>
               </div>
               
               {provider.notes && (
                 <div className="mt-1 pt-1 border-t border-stone-100 flex items-center gap-1 text-[9px] text-stone-500 italic">
                    <span className="font-medium mr-1 not-italic uppercase tracking-wider text-[8px]">Notas:</span>
                    <span className="truncate" title={provider.notes}>{provider.notes}</span>
                 </div>
               )}
            </div>

            <div className="shrink-0 flex items-center gap-1 border-t sm:border-t-0 sm:border-l border-stone-100 pt-2 sm:pt-0 sm:pl-2 w-full sm:w-auto justify-end mt-1 sm:mt-0">
                  <button onClick={() => openEdit(provider)} className="p-1 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors" title="Editar">
                    <Edit2 size={13} />
                  </button>
                  {isAdmin && (
                    <button onClick={() => handleDelete(provider.id)} className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Eliminar">
                      <Trash2 size={13} />
                    </button>
                  )}
            </div>
          </div>
        `;
        
        const originalCode = code.substring(startDiv, endDiv);
        code = code.replace(originalCode, newLayout);
        fs.writeFileSync('src/pages/Providers.tsx', code);
        console.log("Replaced successfully!");
    } else {
        console.log("Could not find startDiv or endDiv");
    }
} else {
    console.log("Could not find start of map");
}
