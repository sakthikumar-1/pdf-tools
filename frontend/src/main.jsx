import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import './styles/global.css';

// Vite CSS & JS Dynamic Chunk Preload Resilience (Issue 3)
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  console.warn('[Vite Preload Error]: Detected chunk mismatch after production deployment:', event);
  const RELOAD_KEY = 'simatrix_vite_preload_reload';
  if (!sessionStorage.getItem(RELOAD_KEY)) {
    sessionStorage.setItem(RELOAD_KEY, 'true');
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);

// Register service worker for offline tool caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[ServiceWorker] Registered with scope:', reg.scope);
    }).catch((err) => {
      console.log('[ServiceWorker] Registration notice:', err);
    });
  });
}
