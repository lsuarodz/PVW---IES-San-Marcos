import React from 'react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] p-8 max-w-6xl mx-auto text-center">
      <h1 className="text-4xl md:text-6xl font-bold text-green-600 mb-6 font-serif tracking-tight">
        IES San Marcos
      </h1>
      <h2 className="text-2xl md:text-3xl font-medium text-cyan-700 tracking-wide">
        Proyecto Intermodular
      </h2>
      {/* Imagen del logotipo */}
      <div className="bg-white p-4 rounded-2xl shadow-md border border-stone-100 mt-8 mb-8 flex items-center justify-center w-40 h-40"> 
        <img 
          src="/logoSolo.png" 
          alt="Logotipo IES San Marcos" 
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
