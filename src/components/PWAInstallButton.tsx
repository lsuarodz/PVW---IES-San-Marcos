import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showBrowserGuide, setShowBrowserGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  const handleClick = () => {
    if (isInstallable) {
      install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowBrowserGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center gap-2 rounded-full bg-green-600 px-4 py-2.5 text-xs md:text-sm font-medium text-white shadow-lg hover:bg-green-700 transition-colors"
        title="Instalar App"
      >
        <Download size={20} />
        <span className="hidden md:inline">Instalar App</span>
      </button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-stone-900">Instalar en iPhone / iPad</h3>
            <p className="mt-4 text-sm text-stone-600 space-y-2">
              <span className="block">1. Toca el botón <strong>Compartir</strong> (cuadrado con flecha hacia arriba) en la barra inferior de Safari.</span>
              <span className="block">2. Desliza hacia abajo y selecciona <strong>Añadir a la pantalla de inicio</strong>.</span>
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full rounded-xl bg-stone-100 py-3 text-sm font-bold text-stone-800 hover:bg-stone-200 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {showBrowserGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-stone-900">Instalar Aplicación</h3>
            <div className="mt-4 text-sm text-stone-600 space-y-3">
              <p>
                Para instalar esta aplicación, necesitas <strong>abrirla en una pestaña nueva</strong> (fuera de la vista previa) o usar un navegador compatible (Chrome/Edge).
              </p>
              <p>
                Si ya estás en una pestaña nueva, busca el icono de <strong>Instalar</strong> en la barra de direcciones de tu navegador (arriba a la derecha).
              </p>
            </div>
            <button
              onClick={() => setShowBrowserGuide(false)}
              className="mt-6 w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
