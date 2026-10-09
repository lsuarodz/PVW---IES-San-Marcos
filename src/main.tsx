import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker for PWA in production; unregister in development
if (import.meta.env.PROD) {
  registerSW({ immediate: true });
} else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

// Punto de entrada principal de la aplicación React
// Busca el elemento con id 'root' en el index.html y renderiza la aplicación dentro de él
createRoot(document.getElementById('root')!).render(
  // StrictMode ayuda a encontrar problemas potenciales en la aplicación durante el desarrollo
  <StrictMode>
    <App />
  </StrictMode>,
);
