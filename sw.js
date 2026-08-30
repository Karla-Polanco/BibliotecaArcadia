/**
 * ============================================================================
 * ARCADIA SERVICE WORKER (PWA & OFFLINE CACHE)
 * ============================================================================
 * Provee funcionamiento offline 100% autónomo para la aplicación web
 * mediante caché Cache-First del App Shell y limpieza de versiones obsoletas.
 */

const CACHE_NAME = 'arcadia-pwa-v19';

// Recursos esenciales del App Shell a precachear
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
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
  './js/quotes/QuotesService.js',
  './js/library/BookManager.js',
  './js/library/CollectionManager.js',
  './js/library/CoverExtractor.js',
  './js/library/LibraryView.js',
  './js/library/StorageWidget.js',
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
  './js/ui/FloatingMenu.js',
  './js/ui/ThemeManager.js',
  './js/ui/Toast.js',
  './assets/libs/jszip.min.js',
  './assets/libs/epub.min.js',
  './assets/sample/sample_book.epub'
];

// 1. INSTALACIÓN: Precarga en caché de todos los archivos del App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Usar cache.all con tolerancia a fallos individuales
      const promises = APP_SHELL_ASSETS.map(async (url) => {
        try {
          const resp = await fetch(url, { cache: 'no-cache' });
          if (resp.ok) {
            await cache.put(url, resp);
          }
        } catch (err) {
          console.warn(`[SW] No se pudo precachear ${url}:`, err);
        }
      });
      await Promise.all(promises);
      return self.skipWaiting();
    })
  );
});

// 2. ACTIVACIÓN: Limpieza de versiones de caché antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log(`[SW] Eliminando caché obsoleta: ${key}`);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH: Estrategia Cache-First para recursos locales con actualización en background
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignorar métodos no GET o esquemas no soportados (ej. extensiones)
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // Las peticiones a APIs externas usan Network-First
  if (request.url.includes('dictionaryapi.dev') || request.url.includes('googleapis.com')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Para el App Shell y recursos estáticos: Cache-First con fallback a red
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // En background actualizar la caché si hay red (Stale-While-Revalidate selectivo)
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {/* Modo offline silencioso */});

        return cachedResponse;
      }

      // Si no está en caché, buscar en la red y guardar copia
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || !networkResponse.ok || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });

        return networkResponse;
      }).catch(() => {
        // Si es una petición de navegación HTML y no hay red, servir index.html precacheado
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
