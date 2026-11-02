/**
 * Lazy loader for Google Identity Services (GSI) SDK (accounts.google.com/gsi/client).
 * Avoids loading ~99.9 KiB globally on all 19 standard PDF utility routes.
 * Injects dynamically only when Login or LoginModal mounts.
 */

let gsiPromise = null;

export function loadGoogleGsi() {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }

  // Already loaded
  if (window.google?.accounts?.oauth2 || window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      // Check if script element already exists
      const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (existingScript) {
        if (window.google?.accounts?.oauth2) {
          return resolve(window.google);
        }
        existingScript.addEventListener('load', () => resolve(window.google));
        existingScript.addEventListener('error', (err) => reject(err));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        resolve(window.google);
      };
      script.onerror = (err) => {
        console.warn('[GSI Loader]: Failed to load Google Identity Services SDK:', err);
        gsiPromise = null; // Allow retry on failure
        reject(new Error('Google Sign-In SDK could not be loaded. Please check your network connection.'));
      };
      document.head.appendChild(script);
    });
  }

  return gsiPromise;
}

export default loadGoogleGsi;

