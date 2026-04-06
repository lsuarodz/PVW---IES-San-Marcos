import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  // Obtenemos las funciones y estados del contexto de autenticación
  const { login, user, appUser, loading } = useAuth();

  // Mientras se comprueba si hay una sesión activa, mostramos un indicador de carga
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-stone-100 text-center">
        <h1 className="text-3xl font-bold text-stone-900 mb-2 tracking-tight">Proyecto Intermodular 2025-2026</h1>
        <p className="text-stone-500 mb-8">
          Plataforma colaborativa para la gestión de escandallos y menús.
        </p>

        {/* Si el usuario se ha logueado con Google pero no está en nuestra base de datos, mostramos un error */}
        {user && !appUser ? (
          <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm mb-6 border border-amber-200">
            Tu cuenta ({user.email}) no está registrada. Por favor, contacta con tu tutor para que te dé acceso.
          </div>
        ) : null}

        {/* Botón para iniciar sesión con Google */}
        <button
          onClick={login}
          className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl font-medium transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Iniciar sesión con Google
        </button>
      </div>
    </div>
  );
}
