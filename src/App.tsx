/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// IMPORTACIONES (IMPORTS)
// ============================================================================
// Aquí traemos todas las "piezas" que necesitamos de otros archivos o librerías.
// React es la librería principal que usamos para construir la interfaz.
import React from 'react';
// React Router nos permite navegar entre diferentes "páginas" sin recargar el navegador.
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importamos los "Contextos" (Providers). Un contexto es como un altavoz global 
// que comparte información (como el usuario o los datos) con toda la aplicación.
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';

// Importamos los componentes visuales (las diferentes pantallas de nuestra app)
import Layout from './components/Layout';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Ingredients from './pages/Ingredients';
import Recipes from './pages/Recipes';
import Menus from './pages/Menus';
import Orders from './pages/Orders';
import Translations from './pages/Translations';
import Manual from './pages/Manual';
import CoffeeBrunch from './pages/CoffeeBrunch';
import Standardization from './pages/Standardization';
import ProjectPresentation from './pages/ProjectPresentation';
import WorkTeam from './pages/WorkTeam';
import Benchmarking from './pages/Benchmarking';
import Sources from './pages/Sources';
import Brainstorming from './pages/Brainstorming';
import Providers from './pages/Providers';
import Clients from './pages/Clients';
import Quotes from './pages/Quotes';
import ProductionBrainstorming from './pages/ProductionBrainstorming';

// ============================================================================
// COMPONENTE: ProtectedRoute (Ruta Protegida)
// ============================================================================
// Este componente actúa como un "guardia de seguridad" para nuestras páginas.
// Envuelve a otras páginas y decide si el usuario puede verlas o no.
// Recibe dos "props" (parámetros):
// - children: El contenido que queremos proteger (la página en sí).
// - requireAdmin: Un valor opcional (true/false) que indica si se necesita ser jefe/admin.
function ProtectedRoute({ children, requireAdmin }: { children: React.ReactNode, requireAdmin?: boolean }) {
  // Obtenemos el usuario actual (appUser) y si la app está cargando (loading) desde el contexto de autenticación.
  const { appUser, loading } = useAuth();

  // 1. Si la aplicación todavía está comprobando si el usuario ha iniciado sesión,
  // mostramos un icono de carga (spinner) en lugar de la página.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  // 2. Si terminó de cargar y NO hay usuario (no ha iniciado sesión),
  // lo redirigimos (Navigate) a la página de "/login".
  if (!appUser) {
    return <Navigate to="/login" replace />;
  }

  // 3. Si la página exige ser administrador (requireAdmin es true), 
  // pero el usuario tiene un rol normal (no es 'admin' ni 'docente'),
  // lo devolvemos a la página principal ("/").
  if (requireAdmin && appUser.role !== 'admin' && appUser.role !== 'docente') {
    return <Navigate to="/" replace />;
  }

  // 4. Si pasa todas las pruebas de seguridad, le mostramos el contenido (children).
  return <>{children}</>;
}

// ============================================================================
// COMPONENTE: AppRoutes (Rutas de la Aplicación)
// ============================================================================
// Aquí definimos el "mapa" de nuestra aplicación. Qué URL carga qué página.
function AppRoutes() {
  // Volvemos a preguntar quién es el usuario actual para saber a dónde mandarlo.
  const { appUser } = useAuth();

  return (
    // <Routes> es el contenedor que evalúa la URL actual del navegador.
    <Routes>
      {/* 
        Ruta de login ("/login"): 
        Si el usuario ya inició sesión (appUser existe), lo mandamos directamente a "/ingredients".
        Si no, le mostramos el componente <Login />.
      */}
      <Route path="/login" element={appUser ? <Navigate to="/ingredients" replace /> : <Login />} />
      
      {/* 
        Ruta principal ("/"):
        Esta ruta está protegida por <ProtectedRoute>. Si el usuario no está logueado, no pasa.
        Además, carga el <Layout />, que es el "esqueleto" de la app (el menú lateral y la barra superior).
        Todas las rutas que están dentro de esta, aparecerán en el espacio central del Layout.
      */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        
        {/* "index" significa que si entramos a "/", nos redirige automáticamente a "/ingredients" */}
        <Route index element={<Navigate to="/ingredients" replace />} />
        
        {/* Aquí listamos todas las páginas y la URL que les corresponde */}
        <Route path="presentation" element={<ProjectPresentation />} />
        <Route path="work-team" element={<WorkTeam />} />
        <Route path="benchmarking" element={<Benchmarking />} />
        <Route path="sources" element={<Sources />} />
        <Route path="brainstorming" element={<Brainstorming />} />
        <Route path="providers" element={<Providers />} />
        <Route path="clients" element={<Clients />} />
        <Route path="quotes" element={<Quotes />} />
        <Route path="production-brainstorming" element={<ProductionBrainstorming />} />
        <Route path="ingredients" element={<Ingredients />} />
        <Route path="recipes" element={<Recipes />} />
        <Route path="menus" element={<Menus />} />
        <Route path="orders" element={<Orders />} />
        <Route path="coffee-brunch" element={<CoffeeBrunch />} />
        <Route path="standardization" element={<Standardization />} />
        <Route path="translations" element={<Translations />} />
        <Route path="manual" element={<Manual />} />
        
        {/* 
          Ruta de administración ("/admin"): 
          Tiene una protección extra: requireAdmin. Solo los administradores pueden entrar.
        */}
        <Route path="admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL: App
// ============================================================================
// Este es el punto de partida de TODA la aplicación React.
// Aquí envolvemos nuestras rutas (AppRoutes) con los "Providers" (Proveedores).
// Los Providers son como capas que le dan superpoderes a la app:
// - AuthProvider: Gestiona quién ha iniciado sesión.
// - DataProvider: Descarga y guarda los ingredientes, recetas, etc.
// - ToastProvider: Permite mostrar mensajitos emergentes (ej. "Guardado con éxito").
// - BrowserRouter: Habilita el sistema de navegación por URLs.
export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </DataProvider>
    </AuthProvider>
  );
}

