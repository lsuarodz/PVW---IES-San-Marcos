/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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

function ProtectedRoute({ children, requireAdmin }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { appUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!appUser) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && appUser.role !== 'admin' && appUser.role !== 'docente') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { appUser } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={appUser ? <Navigate to="/ingredients" replace /> : <Login />} />
      
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/ingredients" replace />} />
        <Route path="ingredients" element={<Ingredients />} />
        <Route path="recipes" element={<Recipes />} />
        <Route path="menus" element={<Menus />} />
        <Route path="orders" element={<Orders />} />
        <Route path="coffee-brunch" element={<CoffeeBrunch />} />
        <Route path="standardization" element={<Standardization />} />
        <Route path="translations" element={<Translations />} />
        <Route path="manual" element={<Manual />} />
        <Route path="admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

