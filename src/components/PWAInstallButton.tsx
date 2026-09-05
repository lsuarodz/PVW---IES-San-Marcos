import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs md:text-sm font-medium text-white shadow-sm hover:bg-green-700 transition"
      >
        <Download size={16} />
        Instalar App
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs md:text-sm font-medium text-white shadow-sm hover:bg-green-700 transition"
        >
          <Download size={16} />
          Instalar en iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-stone-900">Instalar en iPhone / iPad</h3>
              <p className="mt-2 text-sm text-stone-600">
                1. Toca el botón <strong>Compartir</strong> (cuadrado con flecha hacia arriba) en la barra inferior de Safari.<br />
                2. Desliza hacia abajo y selecciona <strong>Añadir a la pantalla de inicio</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-stone-100 py-2 text-sm font-medium text-stone-800 hover:bg-stone-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
