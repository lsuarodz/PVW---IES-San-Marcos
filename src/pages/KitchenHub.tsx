import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, UtensilsCrossed } from 'lucide-react';

export default function KitchenHub() {
  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-stone-800 mb-4 font-serif">Recetario</h1>
        <p className="text-stone-500 max-w-2xl mx-auto">
          Selecciona el área de trabajo en la que deseas entrar.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-16">
        {/* Elaborados */}
        <Link 
          to="/elaborados" 
          className="bg-white p-10 rounded-2xl shadow-sm border border-stone-200 flex flex-col items-center justify-center gap-6 hover:shadow-md hover:-translate-y-1 transition-all group"
        >
          <div className="w-32 h-32 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <BookOpen size={64} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-stone-800">Elaborados</h2>
        </Link>

        {/* Platos */}
        <Link 
          to="/recipes" 
          className="bg-white p-10 rounded-2xl shadow-sm border border-stone-200 flex flex-col items-center justify-center gap-6 hover:shadow-md hover:-translate-y-1 transition-all group"
        >
          <div className="w-32 h-32 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <UtensilsCrossed size={64} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-stone-800">Platos</h2>
        </Link>
      </div>

      <div className="bg-stone-50 p-8 rounded-2xl border border-stone-200">
        <h3 className="text-xl font-bold text-stone-800 mb-6">Instrucciones de Uso</h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-teal-700 flex items-center gap-2 mb-2">
              <BookOpen size={20} />
              Sección "Elaborados"
            </h4>
            <p className="text-stone-600 leading-relaxed">
              En esta sección encontrarás y podrás crear las <strong>recetas base o sub-recetas</strong>. Estas son preparaciones que normalmente no se sirven directamente al cliente por sí solas (como fondos, salsas, masas, cremas base, etc.), sino que forman parte de la composición de un Plato final. Utiliza los elaborados para estandarizar procesos repetitivos y mantener un control de costes preciso en tus preparaciones intermedias.
            </p>
          </div>

          <div className="w-full h-px bg-stone-200" />

          <div>
            <h4 className="text-lg font-semibold text-rose-700 flex items-center gap-2 mb-2">
              <UtensilsCrossed size={20} />
              Sección "Platos"
            </h4>
            <p className="text-stone-600 leading-relaxed">
              En esta sección se gestionan las <strong>recetas finales o platos terminados</strong> que se presentarán al comensal o cliente. Un "Plato" puede estar compuesto por ingredientes sueltos y también por "Elaborados" previamente registrados. Aquí definirás el escandallo final, los alérgenos totales, el emplatado y el precio o coste de la ración servida.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
