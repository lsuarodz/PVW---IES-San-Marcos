import React from 'react';
import { Info, Target, Package, Presentation } from 'lucide-react';

export default function ProjectPresentation() {
  // Este componente es puramente estático y muestra la información inicial del proyecto
  // No requiere estado ni conexión a base de datos
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl">
          <Presentation size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Presentación del Proyecto</h1>
          <p className="text-stone-500 mt-1 text-lg">Proyecto Intermodular 2ºCFGM Panadería y Pastelería</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        {/* Justificación */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
          <div className="flex items-center gap-3 mb-4 text-emerald-700">
            <Info size={28} />
            <h2 className="text-2xl font-semibold">Justificación</h2>
          </div>
          <div className="space-y-4 text-stone-600 leading-relaxed text-lg">
            <p>
              El presente proyecto intermodular parte de una situación real del IES San Marcos: <br/>
              <strong className="text-stone-900 block mt-2 text-xl">El diseño y estandarización de una oferta de menús de coffee breaks y brunchs.</strong>
            </p>
            <p>
              Anteriormente se han realizado, en el IES San Marcos, eventos que han necesitado de un menú de coffee breaks y de brunchs. La experiencia ha demostrado que es necesaria una estandarización de la oferta, por lo que se ha querido contar con vuestro equipo para tal cometido.
            </p>
          </div>
        </div>

        {/* Definición */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
          <div className="flex items-center gap-3 mb-4 text-emerald-700">
            <Target size={28} />
            <h2 className="text-2xl font-semibold">Definición</h2>
          </div>
          <div className="space-y-4 text-stone-600 leading-relaxed text-lg">
            <p>Por tanto, vuestro proyecto consistirá en:</p>
            <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 font-medium text-xl text-center shadow-inner">
              Diseño y estandarización de una oferta compuesta de 4 Coffee Breaks y 3 Brunchs.
            </div>
            <p>
              Esto comprende tanto la elección consensuada y razonada de las elaboraciones que componen esa oferta, así como la elaboración de escandallos y la planificación de la logística necesaria para la ejecución de cada menú.
            </p>
          </div>
        </div>

        {/* Productos */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
          <div className="flex items-center gap-3 mb-4 text-emerald-700">
            <Package size={28} />
            <h2 className="text-2xl font-semibold">Productos</h2>
          </div>
          <div className="space-y-4 text-stone-600 leading-relaxed text-lg">
            <ul className="list-disc list-inside space-y-3 ml-2">
              <li>Se espera de ustedes la entrega de todas las fichas técnicas y escandallos que componen la oferta de 4 coffee breaks y 3 brunchs.</li>
              <li>Presentación maquetada del conjunto de la oferta de menús.</li>
            </ul>
            <div className="mt-6 p-5 bg-stone-50 rounded-xl border border-stone-200 text-stone-800 italic text-center font-medium">
              El trabajo culminará en un dossier profesional y una exposición oral.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
