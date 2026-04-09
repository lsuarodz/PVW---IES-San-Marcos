/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
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

// Componente para proteger rutas que requieren autenticación o permisos específicos
function ProtectedRoute({ children, requireAdmin }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { appUser, loading } = useAuth();

  // Muestra un indicador de carga mientras se verifica el estado de autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  // Si no hay usuario autenticado, redirige al login
  if (!appUser) {
    return <Navigate to="/login" replace />;
  }

  // Si la ruta requiere permisos de administrador/docente y el usuario no los tiene, redirige al inicio
  if (requireAdmin && appUser.role !== 'admin' && appUser.role !== 'docente') {
    return <Navigate to="/" replace />;
  }

  // Si pasa todas las validaciones, renderiza el contenido protegido
  return <>{children}</>;
}

// Configuración principal de las rutas de la aplicación
function AppRoutes() {
  const { appUser } = useAuth();

  return (
    <Routes>
      {/* Ruta de login: si ya está autenticado, redirige a ingredientes */}
      <Route path="/login" element={appUser ? <Navigate to="/ingredients" replace /> : <Login />} />
      
      {/* Rutas protegidas que comparten el Layout principal (menú lateral, cabecera) */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/ingredients" replace />} />
        <Route path="presentation" element={<ProjectPresentation />} />
        <Route path="work-team" element={<WorkTeam />} />
        <Route path="benchmarking" element={<Benchmarking />} />
        <Route path="sources" element={<Sources />} />
        <Route path="brainstorming" element={<Brainstorming />} />
        <Route path="providers" element={<Providers />} />
        <Route path="ingredients" element={<Ingredients />} />
        <Route path="recipes" element={<Recipes />} />
        <Route path="menus" element={<Menus />} />
        <Route path="orders" element={<Orders />} />
        <Route path="coffee-brunch" element={<CoffeeBrunch />} />
        <Route path="standardization" element={<Standardization />} />
        <Route path="translations" element={<Translations />} />
        <Route path="manual" element={<Manual />} />
        {/* Ruta de administración: solo accesible para admin/docente */}
        <Route path="admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

// Componente raíz de la aplicación que provee el contexto de autenticación y el enrutador
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

