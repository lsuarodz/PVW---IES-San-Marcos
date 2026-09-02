import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, ChefHat } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { appUser } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] p-8 max-w-6xl mx-auto text-center">
      <h1 className="text-4xl md:text-6xl font-bold text-green-600 mb-6 font-serif tracking-tight">
        IES San Marcos
      </h1>
      
      <div className="flex items-center justify-center gap-12 mt-8 mb-8">
        {/* Left Icon: Link to Kitchen Hub (Elaborados/Platos) */}
        <Link 
          to="/kitchen-hub"
          className="bg-white p-4 rounded-2xl shadow-md border border-stone-100 flex items-center justify-center w-40 h-40 hover:shadow-lg hover:-translate-y-1 transition-all text-teal-600"
          title="Elaborados y Platos"
        >
          <ChefHat size={80} strokeWidth={1.5} />
        </Link>

        {/* Center: Logo */}
        <div className="bg-white p-4 rounded-2xl shadow-md border border-stone-100 flex items-center justify-center w-40 h-40"> 
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
            className="bg-white p-4 rounded-2xl shadow-md border border-stone-100 flex items-center justify-center w-40 h-40 hover:shadow-lg hover:-translate-y-1 transition-all text-emerald-600"
            title="Pedidos"
          >
            <ShoppingCart size={80} strokeWidth={1.5} />
          </Link>
        ) : (
          <div className="w-40 h-40 opacity-0 pointer-events-none" /> /* Placeholder to keep logo centered */
        )}
      </div>
    </div>
  );
}
