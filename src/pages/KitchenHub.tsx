import React from 'react';
import { Link } from 'react-router-dom';
import MenuTile from '../components/MenuTile';

export default function KitchenHub() {
  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-stone-800 mb-4 font-serif">Recetario</h1>
        <p className="text-stone-500 max-w-2xl mx-auto">
          Selecciona el área de trabajo en la que deseas entrar.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-3xl mx-auto">
        {/* Elaborados */}
        <Link 
          to="/elaborados" 
          className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 flex flex-col items-center justify-center gap-4 hover:shadow-md hover:-translate-y-1 transition-all group"
        >
          <MenuTile 
            label="ELABORADOS" 
            icon="elaborados" 
            className="w-44 h-44 group-hover:scale-105 transition-transform" 
          />
          <span className="text-sm font-semibold text-stone-500">Recetas base y preparaciones intermedias</span>
        </Link>

        {/* Platos */}
        <Link 
          to="/recipes" 
          className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 flex flex-col items-center justify-center gap-4 hover:shadow-md hover:-translate-y-1 transition-all group"
        >
          <MenuTile 
            label="PLATOS" 
            icon="platos" 
            className="w-44 h-44 group-hover:scale-105 transition-transform" 
          />
          <span className="text-sm font-semibold text-stone-500">Recetas finales y emplatados listos</span>
        </Link>
      </div>
    </div>
  );
}
