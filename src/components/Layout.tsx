import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  ClipboardList,
  Presentation,
  ChevronDown,
  ChevronRight,
  UserCog,
  Menu as MenuIcon,
  X,
  Link as LinkIcon,
  Lightbulb
} from 'lucide-react';

export default function Layout() {
  // Obtenemos los datos del usuario y la función de logout desde el contexto
  const { appUser, logout } = useAuth();
  // Obtenemos la ruta actual para saber qué menú está activo
  const location = useLocation();
  
  // Estado para controlar qué secciones del menú lateral están desplegadas
  const [openSections, setOpenSections] = useState({
    jornada1: false,
    jornada2: true,
    produccion: true,
    comercial: true,
    otros: true
  });

  // Estado para controlar el menú móvil
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Función para abrir o cerrar una sección del menú
  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Definición de los elementos del menú para la Jornada 1
  const jornada1Items = [
    { name: 'Presentación del proyecto', path: '/presentation', icon: <Presentation size={20} /> },
    { name: 'Coffee Break / Brunch / Menú Solidario', path: '/coffee-brunch', icon: <Coffee size={20} /> },
    { name: 'Estandarización', path: '/standardization', icon: <ClipboardList size={20} /> },
    { name: 'Equipo de Trabajo', path: '/work-team', icon: <Users size={20} /> },
  ];

  // Definición de los elementos del menú para la Jornada 2
  const jornada2Items = [
    { name: 'Matriz Benchmarking', path: '/benchmarking', icon: <FileText size={20} /> },
    { name: 'Fuentes', path: '/sources', icon: <LinkIcon size={20} /> },
    { name: 'Brainstorming', path: '/brainstorming', icon: <Lightbulb size={20} /> },
  ];

  // Definición de los elementos del menú para Producción
  const productionItems = [
    { name: 'Tormenta de Ideas', path: '/production-brainstorming', icon: <Lightbulb size={20} /> },
    { name: 'Proveedores', path: '/providers', icon: <Users size={20} /> },
    { name: 'Ingredientes', path: '/ingredients', icon: <ChefHat size={20} /> },
    { name: 'Escandallos', path: '/recipes', icon: <BookOpen size={20} /> },
    { name: 'Menús', path: '/menus', icon: <Utensils size={20} /> },
    { name: 'Pedidos', path: '/orders', icon: <ShoppingCart size={20} /> },
  ];

  // Definición de los elementos del menú para Gestión Comercial
  const comercialItems = [
    { name: 'Clientes', path: '/clients', icon: <Users size={20} /> },
    { name: 'Presupuestos', path: '/quotes', icon: <FileText size={20} /> },
  ];

  // Definición de otros elementos del menú
  const otherItems = [
    { name: 'Traducciones', path: '/translations', icon: <Languages size={20} /> },
    { name: 'Manual', path: '/manual', icon: <ManualIcon size={20} /> },
  ];

  // Si el usuario es administrador o docente, añadimos la sección de gestión de usuarios
  if (appUser?.role === 'admin' || appUser?.role === 'docente') {
    otherItems.push({ name: 'Usuarios', path: '/admin', icon: <UserCog size={20} /> });
  }

  return (
    <div className="flex h-screen bg-stone-100">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3 text-teal-700">
          <h1 className="text-lg font-bold tracking-tight">Proyecto Intermodular</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
        </button>
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Menú lateral) */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-stone-200 flex flex-col print:hidden
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-16 lg:h-auto p-6 border-b border-stone-200 flex items-center gap-3 text-teal-700">
          <h1 className="text-xl font-bold tracking-tight hidden lg:block">Proyecto Intermodular 2025-2026</h1>
          <h1 className="text-xl font-bold tracking-tight lg:hidden">Menú</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Sección Jornada 1 */}
          <div>
            <button 
              onClick={() => toggleSection('jornada1')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider hover:text-stone-800 transition-colors"
            >
              <span>Jornada 1: Definición del Proyecto</span>
              {openSections.jornada1 ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {openSections.jornada1 && (
              <div className="space-y-1 mt-2">
                {jornada1Items.map((item) => {
                  // Comprobamos si la ruta actual coincide con la del ítem para marcarlo como activo
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        isActive 
                          ? 'bg-sky-50 text-sky-700 font-medium' 
                          : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                      }`}
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sección Jornada 2 */}
          <div>
            <button 
              onClick={() => toggleSection('jornada2')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider hover:text-stone-800 transition-colors"
            >
              <span>Jornada 2: Benchmarking</span>
              {openSections.jornada2 ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {openSections.jornada2 && (
              <div className="space-y-1 mt-2">
                {jornada2Items.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        isActive 
                          ? 'bg-violet-50 text-violet-700 font-medium' 
                          : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                      }`}
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Gestión de Producción */}
          <div>
            <button 
              onClick={() => toggleSection('produccion')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider hover:text-stone-800 transition-colors"
            >
              <span>Gestión de Producción</span>
              {openSections.produccion ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {openSections.produccion && (
              <div className="space-y-1 mt-2">
                {productionItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        isActive 
                          ? 'bg-teal-50 text-teal-700 font-medium' 
                          : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                      }`}
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Gestión Comercial */}
          <div>
            <button 
              onClick={() => toggleSection('comercial')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider hover:text-stone-800 transition-colors"
            >
              <span>Gestión Comercial</span>
              {openSections.comercial ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {openSections.comercial && (
              <div className="space-y-1 mt-2">
                {comercialItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        isActive 
                          ? 'bg-rose-50 text-rose-700 font-medium' 
                          : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                      }`}
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Otros */}
          <div>
            <button 
              onClick={() => toggleSection('otros')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider hover:text-stone-800 transition-colors"
            >
              <span>Otros</span>
              {openSections.otros ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {openSections.otros && (
              <div className="space-y-1 mt-2">
                {otherItems.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        isActive 
                          ? 'bg-amber-50 text-amber-700 font-medium' 
                          : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                      }`}
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-stone-200">
          {/* Información del usuario actual */}
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
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
          {/* Botón para cerrar sesión */}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal (aquí se renderizan las páginas hijas según la ruta) */}
      <main className="flex-1 overflow-y-auto print:overflow-visible pt-16 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
