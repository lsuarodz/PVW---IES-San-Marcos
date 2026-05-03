import React from 'react';
import { ChefHat, Info } from 'lucide-react';

export default function TestRecipe() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shadow-inner">
          <ChefHat size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Receta de Prueba</h1>
          <p className="text-stone-500 mt-1">Práctica de integración de recetas con "Gestión de la Producción".</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
        <Info className="shrink-0 mt-0.5" size={20} />
        <div>
          <p className="font-semibold mb-1">Misión de esta práctica</p>
          <p className="text-sm">
            Transformar unos Huevos Benedictinos en un formato de cóctel o "finger food" es una idea brillante. La clave es la miniaturización: usaremos mini muffins ingleses caseros y huevos de codorniz para que se puedan comer de dos bocados.
            Debes integrar estas recetas en la sección de "Gestión de la Producción" trabajando con tu grupo habitual.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Sección 1 */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="bg-stone-50 border-b border-stone-200 px-6 py-4">
            <h2 className="text-xl font-bold text-stone-900">1. El Pan: Mini English Muffins</h2>
            <p className="text-stone-500 text-sm mt-1">Estos panes no se hornean, se hacen a la plancha, lo que les da su textura característica.</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-stone-900 mb-3 uppercase text-xs tracking-wider">Ingredientes (20-24 mini muffins)</h3>
              <ul className="space-y-2 text-stone-600 text-sm list-disc pl-4 marker:text-amber-500">
                <li>250g de harina de fuerza</li>
                <li>150ml de leche tibia</li>
                <li>15g de mantequilla pomada</li>
                <li>5g de levadura seca de panadería</li>
                <li>5g de azúcar</li>
                <li>5g de sal</li>
                <li>Sémola de maíz (polenta) para espolvorear</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-3 uppercase text-xs tracking-wider">Preparación</h3>
              <ul className="space-y-3 text-stone-600 text-sm">
                <li><span className="font-medium text-stone-800">Amasado:</span> Mezcla la leche, el azúcar y la levadura. Añade la harina y la sal. Amasa hasta que esté elástica y añade la mantequilla al final.</li>
                <li><span className="font-medium text-stone-800">Primer levado:</span> Deja reposar en un bol tapado 1 hora o hasta que doble su tamaño.</li>
                <li><span className="font-medium text-stone-800">Formado:</span> Estira la masa con un grosor de 1.5 cm. Corta círculos pequeños (unos 4-5 cm de diámetro).</li>
                <li><span className="font-medium text-stone-800">Segundo levado:</span> Pasa los círculos por la sémola de maíz y déjalos reposar 30 min sobre una bandeja.</li>
                <li><span className="font-medium text-stone-800">Cocción:</span> Cocina en una sartén a fuego muy bajo unos 6-7 minutos por cada lado. Deben quedar dorados por fuera y cocidos por dentro.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Sección 2 */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="bg-stone-50 border-b border-stone-200 px-6 py-4">
            <h2 className="text-xl font-bold text-stone-900">2. La Salsa Holandesa (Versión Estable)</h2>
            <p className="text-stone-500 text-sm mt-1">Para un evento tipo cóctel, necesitas que la salsa aguante bien la temperatura.</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-stone-900 mb-3 uppercase text-xs tracking-wider">Ingredientes</h3>
              <ul className="space-y-2 text-stone-600 text-sm list-disc pl-4 marker:text-amber-500">
                <li>3 yemas de huevo</li>
                <li>150g de mantequilla clarificada (caliente)</li>
                <li>Una pizca de sal y pimienta blanca</li>
                <li>Unas gotas de zumo de limón o vinagre de estragón</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-3 uppercase text-xs tracking-wider">Preparación</h3>
              <ul className="space-y-3 text-stone-600 text-sm">
                <li>Pon las yemas con el limón en un vaso de batidora de mano.</li>
                <li>Empieza a batir y añade la mantequilla caliente en un hilo fino (como si hicieras mayonesa). La temperatura de la mantequilla cocinará ligeramente las yemas y creará la emulsión.</li>
                <li className="bg-stone-100 p-3 rounded-lg border border-stone-200 italic mt-2">
                  <span className="font-semibold not-italic text-amber-600">Tip Pro: </span>
                  Si está muy espesa, añade una cucharadita de agua tibia. Mantenla templada en un termo hasta el momento de servir.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Sección 3 */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="bg-stone-50 border-b border-stone-200 px-6 py-4">
            <h2 className="text-xl font-bold text-stone-900">3. El Relleno y los Huevos de Codorniz</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-stone-900 mb-3 uppercase text-xs tracking-wider">Ingredientes</h3>
              <ul className="space-y-2 text-stone-600 text-sm list-disc pl-4 marker:text-amber-500">
                <li>12-15 huevos de codorniz (uno por cada mini muffin)</li>
                <li>Lonchas de jamón cocido de buena calidad o Bacon ahumado (cortado al tamaño del pan)</li>
                <li>Vinagre de vino blanco (para el escalfado)</li>
                <li>Cebollino fresco picado para decorar</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 mb-3 uppercase text-xs tracking-wider">Preparación de los huevos</h3>
              <ul className="space-y-3 text-stone-600 text-sm">
                <li>Pon agua a calentar con un chorro de vinagre (sin sal, para que la clara no se disperse).</li>
                <li>Cuando esté a punto de hervir, crea un suave remolino y echa los huevos de codorniz uno a uno.</li>
                <li>Cocina solo 1 minuto y medio. Saca a un bol con agua fría y hielo para cortar la cocción.</li>
                <li>Recorta los bordes "feos" con una tijera para que queden perfectos.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Sección 4 */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="bg-stone-50 border-b border-stone-200 px-6 py-4">
            <h2 className="text-xl font-bold text-stone-900">4. Montaje del Cóctel</h2>
            <p className="text-stone-500 text-sm mt-1">Para que sean fáciles de comer de pie, sigue este orden:</p>
          </div>
          <div className="p-6">
            <div className="space-y-4 text-stone-600 text-sm">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700 shrink-0">1</div>
                <div><span className="font-semibold text-stone-900">Base:</span> Abre los mini muffins por la mitad y tuéstalos ligeramente.</div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700 shrink-0">2</div>
                <div><span className="font-semibold text-stone-900">Proteína:</span> Coloca un círculo de jamón o bacon crujiente.</div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700 shrink-0">3</div>
                <div><span className="font-semibold text-stone-900">El Huevo:</span> Coloca el huevo de codorniz (puedes darle un golpe de calor de 30 segundos en el horno justo antes si estaban fríos).</div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700 shrink-0">4</div>
                <div><span className="font-semibold text-stone-900">Napa:</span> Cubre con una cucharada generosa de salsa holandesa.</div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700 shrink-0">5</div>
                <div><span className="font-semibold text-stone-900">Toque final:</span> Espolvorea cebollino picado o una pizca de pimentón de la Vera.</div>
              </div>
              
              <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 mt-6 text-teal-800">
                <span className="font-bold flex items-center gap-2 mb-1">
                  <ChefHat size={18} />
                  Truco de presentación:
                </span>
                Si quieres que sean más estables para que los camareros los muevan en bandejas, pon una gota de holandesa debajo del jamón para que haga de "pegamento".
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
