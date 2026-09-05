import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MenuTile from '../components/MenuTile';

export default function Home() {
  const { appUser } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] p-8 max-w-6xl mx-auto text-center">
      <h1 className="text-4xl md:text-6xl font-bold text-green-600 mb-6 font-serif tracking-tight">
        IES San Marcos
      </h1>
      
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 mt-8 mb-8">
        {/* Left Icon: Link to Kitchen Hub (Elaborados/Platos) */}
        <Link 
          to="/kitchen-hub"
          title="Elaborados y Platos (Recetas)"
        >
          <MenuTile label="RECETAS" icon="recetas" className="w-32 h-32 md:w-40 md:h-40" />
        </Link>

        {/* Center: Logo */}
        <div className="bg-white p-4 rounded-[24px] md:rounded-[28px] shadow-md border border-stone-100 flex items-center justify-center w-32 h-32 md:w-40 md:h-40"> 
          <img 
            src="/logoSolo.png" 
            alt="Logotipo IES San Marcos" 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Right Icon: Link to Orders (Except students) */}
        {appUser?.role !== 'student' ? (
          <Link 
            to="/orders"
            title="Pedidos"
          >
            <MenuTile label="PEDIDOS" icon="pedidos" className="w-32 h-32 md:w-40 md:h-40" />
          </Link>
        ) : (
          <div className="hidden md:block w-32 h-32 md:w-40 md:h-40 opacity-0 pointer-events-none" /> /* Placeholder to keep logo centered */
        )}
      </div>
    </div>
  );
}
