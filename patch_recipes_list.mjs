import fs from 'fs';
let code = fs.readFileSync('src/pages/Recipes.tsx', 'utf8');

const regex = /<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">[\s\S]*?(?={paginatedRecipes\.length === 0)/;

const newLayout = `<div className="flex flex-col gap-3">
        {paginatedRecipes.map((recipe) => {
          const recipeAllergens = getRecipeAllergens(recipe.ingredients, ingredients, recipes);
          const members = recipe.group ? users.filter(u => u.group === recipe.group) : [];
          const course = members.length > 0 ? (members.find(m => m.course)?.course || members[0].course) : null;
          const memberNames = members.map(m => m.name).join(', ');

          return (
          <div key={recipe.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-stone-200 overflow-hidden flex flex-col sm:flex-row items-stretch sm:items-center p-3 gap-4 group relative">
            {isAdmin && !viewAsStudent && (
              <div className="shrink-0 flex items-center justify-center pl-1 sm:pl-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(recipe.id)}
                  onChange={() => toggleSelection(recipe.id)}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
                />
              </div>
            )}
            
            <div className="flex-1 flex flex-col min-w-0">
               <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                 <div className="flex-1">
                    <h3 className="text-[15px] font-bold text-stone-900 leading-tight truncate" title={recipe.nameES}>{recipe.nameES}</h3>
                    {recipeAllergens.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {Array.from(new Set(recipeAllergens)).map((a, idx) => {
                          const allergen = ALLERGENS.find(al => al.id === a || al.name.toLowerCase() === a.toLowerCase());
                          return allergen ? (
                            <span key={\`\${a}-\${idx}\`} title={allergen.name} className="text-xs leading-none">{allergen.icon}</span>
                          ) : null;
                        })}
                      </div>
                    )}
                 </div>
                 
                 <div className="flex items-center gap-4 shrink-0 text-xs mt-2 sm:mt-0">
                    <div className="flex flex-col items-start sm:items-end">
                       <span className="text-stone-400 font-semibold uppercase tracking-wider text-[9px] mb-0.5">Coste</span>
                       <span className="font-bold text-teal-700">{recipe.totalCost.toFixed(2)} €</span>
                    </div>
                    <div className="flex flex-col items-start sm:items-end">
                       <span className="text-stone-400 font-semibold uppercase tracking-wider text-[9px] mb-0.5">Ingredientes</span>
                       <div className="flex items-center gap-1 font-medium text-stone-600">
                         <BookOpen size={12} className="text-teal-600" />
                         <span>{recipe.ingredients.length}</span>
                       </div>
                    </div>
                    <div className="flex flex-col items-start sm:items-end">
                       <span className="text-stone-400 font-semibold uppercase tracking-wider text-[9px] mb-0.5">{recipe.group ? 'Grupo' : 'Creador'}</span>
                       <span 
                         title={memberNames ? \`Miembros: \${memberNames}\` : undefined}
                         className={\`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-default \${getGroupColor(recipe.createdBy)}\`}
                       >
                         {recipe.group ? \`\${course ? \`\${course} - \` : ''}Grupo \${recipe.group}\` : recipe.createdBy}
                       </span>
                    </div>
                 </div>
               </div>

               {recipe.ingredients.some(ri => recipes.find(r => r.id === ri.ingredientId)) && (
                 <div className="mt-2 pt-2 border-t border-stone-100 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-stone-400 font-medium mr-1">Elaborados:</span>
                    {recipe.ingredients.map(ri => {
                      const elaborado = recipes.find(r => r.id === ri.ingredientId);
                      if (!elaborado) return null;
                      return (
                        <button
                          key={ri.ingredientId}
                          onClick={() => openEdit(elaborado)}
                          className="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded hover:bg-teal-100 transition-colors truncate max-w-[150px]"
                          title={elaborado.nameES}
                        >
                          {elaborado.nameES}
                        </button>
                      );
                    })}
                 </div>
               )}
            </div>

            <div className="shrink-0 flex sm:flex-col items-center gap-1 pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l border-stone-100 sm:pl-4 mt-2 sm:mt-0 w-full sm:w-auto justify-end">
                  {isAdmin && !viewAsStudent && recipe.group && (
                    <button 
                      onClick={() => openEvaluation(recipe)} 
                      className={\`p-1.5 rounded-md transition-colors text-[10px] uppercase font-bold tracking-wider \${recipe.score !== undefined && recipe.score !== null ? 'bg-amber-100 text-amber-800' : 'text-stone-400 hover:text-amber-600 hover:bg-amber-50'}\`}
                      title="Evaluar"
                    >
                      {recipe.score !== undefined && recipe.score !== null ? \`Nota: \${recipe.score}\` : 'Eval'}
                    </button>
                  )}
                  <button 
                    onClick={() => exportPDF(recipe)} 
                    disabled={isPrinting}
                    className="p-1.5 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors disabled:opacity-50" 
                    title="Imprimir"
                  >
                    <Printer size={14} />
                  </button>
                  {canEditAnyPartOfRecipe(recipe) && (
                    <button onClick={() => openEdit(recipe)} className="p-1.5 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors" title="Editar">
                      <Edit2 size={14} />
                    </button>
                  )}
                  {(isSuperAdmin || (actualAppUser && (actualAppUser.role === 'admin' || actualAppUser.role === 'docente') && recipe.group === appUser?.group)) && (
                    <button onClick={() => handleDelete(recipe.id)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  )}
            </div>
          </div>
          );
        })}
        `;

code = code.replace(regex, newLayout);

fs.writeFileSync('src/pages/Recipes.tsx', code);
