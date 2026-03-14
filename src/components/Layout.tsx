import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoUrl from '../assets/logo.png';
import { 
  ChefHat, 
  BookOpen, 
  Utensils, 
  Languages, 
  Users, 
  LogOut,
  FileText,
  ShoppingCart,
  BookOpen as ManualIcon,
  Coffee,
  ClipboardList
} from 'lucide-react';

export default function Layout() {
  const { appUser, logout } = useAuth();
  const location = useLocation();

  const jornada1Items = [
    { name: 'Coffee Break / Brunch / Menú Solidario', path: '/coffee-brunch', icon: <Coffee size={20} /> },
    { name: 'Estandarización', path: '/standardization', icon: <ClipboardList size={20} /> },
  ];

  const productionItems = [
    { name: 'Ingredientes', path: '/ingredients', icon: <ChefHat size={20} /> },
    { name: 'Escandallos', path: '/recipes', icon: <BookOpen size={20} /> },
    { name: 'Menús', path: '/menus', icon: <Utensils size={20} /> },
    { name: 'Pedidos', path: '/orders', icon: <ShoppingCart size={20} /> },
  ];

  const otherItems = [
    { name: 'Traducciones', path: '/translations', icon: <Languages size={20} /> },
    { name: 'Manual', path: '/manual', icon: <ManualIcon size={20} /> },
  ];

  if (appUser?.role === 'admin' || appUser?.role === 'docente') {
    otherItems.push({ name: 'Usuarios', path: '/admin', icon: <Users size={20} /> });
  }

  return (
    <div className="flex h-screen bg-stone-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col">
        <div className="p-6 border-b border-stone-200 flex items-center gap-3 text-emerald-700">
          <img src={logoUrl} alt="Logo Proyecto Intermodular" className="h-10 w-auto object-contain" />
          <h1 className="text-xl font-bold tracking-tight">Proyecto Intermodular</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          <div>
            <h2 className="px-3 text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Jornada 1: Definición del Proyecto
            </h2>
            <div className="space-y-1">
              {jornada1Items.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                      isActive 
                        ? 'bg-emerald-50 text-emerald-700 font-medium' 
                        : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="px-3 text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Gestión de Producción
            </h2>
            <div className="space-y-1">
              {productionItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                      isActive 
                        ? 'bg-emerald-50 text-emerald-700 font-medium' 
                        : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="px-3 text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Otros
            </h2>
            <div className="space-y-1">
              {otherItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                      isActive 
                        ? 'bg-emerald-50 text-emerald-700 font-medium' 
                        : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-stone-200">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              {appUser?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-900 truncate">{appUser?.name}</p>
              <p className="text-xs text-stone-500 truncate">
                {appUser?.role === 'admin' ? 'Tutor' : appUser?.role === 'docente' ? 'Docente' : 'Alumno'}
                {appUser?.group ? ` - ${appUser.group}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
