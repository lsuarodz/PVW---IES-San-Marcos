import React, { useState, useMemo } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { 
  ChefHat, 
  BookOpen, 
  Utensils, 
  Users, 
  LogOut,
  FileText,
  ShoppingCart,
  BookOpen as ManualIcon,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  UserCog,
  Menu as MenuIcon,
  X
} from 'lucide-react';

export default function Layout() {
  // Obtenemos los datos del usuario y la función de logout desde el contexto
    const { 
    appUser, 
    actualAppUser,
    impersonatedUserId,
    setImpersonatedUserId,
    viewAsStudent, 
    setViewAsStudent, 
    commissionMode, 
    setCommissionMode, 
    logout 
  } = useAuth();
  const { settings, users } = useData();

  const sortedUsers = useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => {
      // 1. Admin y docentes primero
      const aIsStaff = a.role === 'admin' || a.role === 'docente';
      const bIsStaff = b.role === 'admin' || b.role === 'docente';
      if (aIsStaff && !bIsStaff) return -1;
      if (!aIsStaff && bIsStaff) return 1;
      
      // 2. Ordenar por curso
      const aCourse = a.course || '';
      const bCourse = b.course || '';
      if (aCourse < bCourse) return -1;
      if (aCourse > bCourse) return 1;
      
      // 3. Ordenar alfabéticamente
      return a.name.localeCompare(b.name);
    });
  }, [users]);

  // Obtenemos la ruta actual para saber qué menú está activo
  const location = useLocation();
  
  // Estado para controlar qué secciones del menú lateral están desplegadas
  const [openSections, setOpenSections] = useState({
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

  // Definición de los elementos del menú para Producción
  const productionItems = [
    { name: 'Proveedores', path: '/providers', icon: <Users size={20} /> },
    { name: 'Ingredientes', path: '/ingredients', icon: <ChefHat size={20} /> },
    { name: 'Elaborados', path: '/elaborados', icon: <BookOpen size={20} /> },
    { name: 'Platos', path: '/recipes', icon: <BookOpen size={20} /> },
    { name: 'Menús', path: '/menus', icon: <Utensils size={20} /> },
    { name: 'Pedidos', path: '/orders', icon: <ShoppingCart size={20} /> },
    { name: 'Listas de Trabajo', path: '/work-lists', icon: <ClipboardList size={20} /> },
  ];

  // Definición de los elementos del menú para Gestión Comercial
  const comercialItems = [
    { name: 'Clientes', path: '/clients', icon: <Users size={20} /> },
    { name: 'Presupuestos', path: '/quotes', icon: <FileText size={20} /> },
  ];

  // Definición de otros elementos del menú
  const baseOtherItems = [
    { name: 'Manual', path: '/manual', icon: <ManualIcon size={20} /> },
  ];

  const isFirstYear = appUser?.course === '1ºCOCINA' || appUser?.course === '1ºPANADERÍA';

  const otherItems = isFirstYear ? [] : [...baseOtherItems];

  // Si el usuario es administrador o docente, añadimos la sección de gestión de usuarios
  if (appUser?.role === 'admin' || appUser?.role === 'docente') {
    otherItems.push({ name: 'Usuarios', path: '/admin', icon: <UserCog size={20} /> });
  }

  return (
    <div className="flex h-screen bg-stone-100 print:h-auto print:bg-white text-stone-900">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3 text-teal-700">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-8 object-contain" crossOrigin="anonymous" />
          ) : (
            <h1 className="text-lg font-bold tracking-tight">Proyecto Intermodular</h1>
          )}
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
        <div className="h-16 lg:h-auto p-4 border-b border-stone-200 flex items-center gap-3 text-teal-700" style={{ backgroundColor: '#e7f2f5' }}>
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="object-contain hidden lg:block rounded-[5px] pl-[3px] pt-0 pr-[2px] w-[139.438px] h-[55px]" crossOrigin="anonymous" />
          ) : (
            <h1 className="text-xl font-bold tracking-tight hidden lg:block">Proyecto Intermodular 2025-2026</h1>
          )}
          <h1 className="text-xl font-bold tracking-tight lg:hidden">Menú</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">

          {/* Gestión de Producción */}
          <div style={{ lineHeight: '20px', backgroundColor: '#e7f2f5', borderRadius: '6px' }}>
            <button 
              onClick={() => toggleSection('produccion')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider hover:text-stone-800 transition-colors"
              style={{ backgroundColor: '#d2efff', borderRadius: '6px' }}
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
          {appUser?.role !== 'student' && (
          <div style={{ lineHeight: '20px', backgroundColor: '#ECF5E7', borderRadius: '6px' }}>
            <button 
              onClick={() => toggleSection('comercial')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wider hover:text-stone-800 transition-colors"
              style={{ backgroundColor: '#C9E0C5', borderRadius: '6px'}} 
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
          )}

          {/* Otros */}
          {otherItems.length > 0 && (
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
          )}
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
          {appUser?.commission && (
            <button
              onClick={() => setCommissionMode(!commissionMode)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-colors mb-2 ${
                commissionMode 
                  ? 'bg-teal-100 text-teal-800 border border-teal-200' 
                  : 'text-stone-600 hover:bg-stone-50 border border-transparent'
              }`}
              title={commissionMode ? "Modo Comisión Activo" : "Cambiar a Modo Comisión"}
            >
              <div className="flex items-center gap-3">
                <UserCog size={18} />
                <span>Modo Comisión</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${commissionMode ? 'bg-teal-500' : 'bg-stone-300'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${commissionMode ? 'left-[18px]' : 'left-0.5'}`} />
              </div>
            </button>
          )}
          {appUser?.role === 'admin' && (
            <button
              onClick={() => setViewAsStudent(!viewAsStudent)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-colors mb-2 ${
                viewAsStudent 
                  ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                  : 'text-stone-600 hover:bg-stone-50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users size={18} />
                <span>Vista Alumno</span>
              </div>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${viewAsStudent ? 'bg-amber-500' : 'bg-stone-300'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${viewAsStudent ? 'left-[18px]' : 'left-0.5'}`} />
              </div>
            </button>
          )}
          {(actualAppUser?.role === 'admin' || actualAppUser?.role === 'docente') && users && (
            <div className="mb-2">
              <label className="block text-xs font-medium text-stone-500 mb-1 px-1">Ver como usuario:</label>
              <select
                value={impersonatedUserId || ''}
                onChange={(e) => setImpersonatedUserId(e.target.value || null)}
                className="w-full px-2 py-1.5 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">(Mi cuenta)</option>
                {sortedUsers.map(u => (
                  <option key={u.uid} value={u.uid}>
                    {u.course ? `[${u.course}] ` : ''}{u.name} {u.commission ? `- Comisión ${u.commission}` : (u.role === 'docente' ? '(Docente)' : (u.role === 'admin' ? '(Admin)' : ''))}
                  </option>
                ))}
              </select>
            </div>
          )}
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
