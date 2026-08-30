/**
 * ============================================================================
 * ARCADIA SERVICE WORKER (PWA & OFFLINE CACHE)
 * ============================================================================
 * Provee funcionamiento offline 100% autónomo para la aplicación web
 * mediante caché Cache-First del App Shell y limpieza de versiones obsoletas.
 */

const CACHE_NAME = 'arcadia-pwa-v28';

// Recursos esenciales del App Shell a precachear
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/icons/favicon.svg',
  './css/tokens.css',
  './css/themes.css',
  './css/main.css',
  './css/layout.css',
  './css/library.css',
  './css/reader.css',
  './css/responsive.css',
  './js/app.js',
  './js/db.js',
  './js/state.js',
  './js/epub/EPUBParser.js',
  './js/epub/EPUBValidator.js',
  './js/library/BookManager.js',
  './js/library/CollectionManager.js',
  './js/library/LibraryView.js',
  './js/library/StorageWidget.js',
  './js/quotes/QuotesManager.js',
  './js/quotes/QuotesService.js',
  './js/quotes/QuotesView.js',
  './js/reader/BookmarkManager.js',
  './js/reader/LocationsManager.js',
  './js/reader/ReaderManager.js',
  './js/reader/ReaderSettings.js',
  './js/reader/ReaderView.js',
  './js/reader/SearchManager.js',
  './js/annotations/AnnotationManager.js',
  './js/annotations/AnnotationsView.js',
  './js/annotations/NoteManager.js',
  './js/vocabulary/VocabularyManager.js',
  './js/vocabulary/VocabularyView.js',
  './js/pwa/PWAManager.js',
  './js/ui/Modal.js',
  './js/ui/CollectionModal.js',
  './js/ui/QuoteModal.js',
  './js/ui/ScaleManager.js',
  './js/ui/FloatingMenu.js',
  './js/ui/ThemeManager.js',
  './js/ui/Toast.js',
  './assets/libs/jszip.min.js',
  './assets/libs/epub.min.js',
  './assets/sample/sample_book.epub',
  './assets/icons/logo.png',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

// 1. INSTALACIÓN: Precarga en caché de todos los archivos del App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Usar cache.all con tolerancia a fallos individuales
      const cachePromises = APP_SHELL_ASSETS.map(async (asset) => {
        try {
          const response = await fetch(asset, { cache: 'no-cache' });
          if (response.ok) {
            await cache.put(asset, response);
          }
        } catch (err) {
          console.warn(`[SW] No se pudo precachear el recurso: ${asset}`, err);
        }
      });
      await Promise.all(cachePromises);
      return self.skipWaiting();
    })
  );
});

// 2. ACTIVACIÓN: Limpieza rigurosa de cachés de versiones previas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('arcadia-pwa-') && name !== CACHE_NAME)
          .map((name) => {
            console.log(`[SW] Eliminando caché obsoleta: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. INTERCEPTACIÓN DE FETCH: Estrategia híbrida Cache-First / Network-First
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar peticiones que no sean HTTP/HTTPS (por ejemplo esquemas chrome-extension o data:)
  if (!url.protocol.startsWith('http')) return;

  // Ignorar peticiones de Analytics o externas si existiesen
  if (url.origin !== self.location.origin) {
    // Para CDNs de fuentes (Google Fonts, unpkg, etc.) usar Stale-While-Revalidate
    if (url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com') ||
        url.hostname.includes('jsdelivr.net') ||
        url.hostname.includes('cdnjs.cloudflare.com')) {
      event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
          const cached = await cache.match(event.request);
          const networkPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => null);

          return cached || networkPromise;
        })
      );
      return;
    }
    return;
  }

  // Estrategia Cache-First para el App Shell local
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        // En segundo plano revalidar recursos clave
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});

        return cachedResponse;
      }

      // Si no está en caché, buscar en la red y cachear
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || !networkResponse.ok || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(async () => {
        // Si no hay red ni caché y es una navegación HTML, retornar index.html precacheado
        if (event.request.mode === 'navigate' || event.request.destination === 'document') {
          return caches.match('./index.html') || caches.match('./');
        }
        return new Response('Offline: Recurso no disponible', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
