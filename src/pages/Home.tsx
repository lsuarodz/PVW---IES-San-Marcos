import React from 'react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] p-8 max-w-6xl mx-auto text-center">
      <h1 className="text-4xl md:text-6xl font-bold text-stone-900 mb-6 font-serif tracking-tight">
        IES San Marcos
      </h1>
      <h2 className="text-2xl md:text-3xl text-stone-500 font-light tracking-wide">
        Proyecto Intermodular
      </h2>
    </div>
  );
}
