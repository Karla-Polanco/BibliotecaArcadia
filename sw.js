/* ============================================================================
   ARCADIA SERVICE WORKER - PWA, Caché Offline y Actualización Automática
   ============================================================================ */

const CACHE_NAME = 'arcadia-pwa-v160';

// App Shell: Archivos esenciales precacheados durante la instalación para soporte offline
const APP_SHELL_ASSETS = [
    './',
    './index.html',
    './manifest.json',

    // Iconos y Favicons
    './assets/icons/icons.svg',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './assets/icons/favicon.svg',
    './assets/icons/favicon.ico',
    './assets/icons/logo-transparent.png',

    // Hojas de estilo
    './css/tokens.css',
    './css/themes.css',
    './css/main.css',
    './css/layout.css',
    './css/library.css',
    './css/reader.css',
    './css/responsive.css',

    // Módulos JS principales
    './js/app.js',
    './js/db.js',
    './js/state.js',
    './js/utils.js',

    // Motor EPUB
    './js/epub/EPUBParser.js',
    './js/epub/EPUBValidator.js',

    // Biblioteca y almacenamiento
    './js/library/BookManager.js',
    './js/library/CollectionManager.js',
    './js/library/LibraryView.js',
    './js/library/StorageWidget.js',

    // Lector y navegación
    './js/reader/LocationsManager.js',
    './js/reader/ReaderManager.js',
    './js/reader/ReaderSettings.js',
    './js/reader/ReaderView.js',
    './js/reader/SearchManager.js',

    // Anotaciones y notas
    './js/annotations/AnnotationManager.js',
    './js/annotations/AnnotationsView.js',
    './js/annotations/NoteManager.js',

    // Vocabulario
    './js/vocabulary/VocabularyManager.js',
    './js/vocabulary/VocabularyView.js',

    // Integración PWA
    './js/pwa/PWAManager.js',

    // Interfaz de usuario (UI)
    './js/ui/Icons.js',
    './js/ui/Modal.js',
    './js/ui/CollectionModal.js',
    './js/ui/ScaleManager.js',
    './js/ui/FloatingMenu.js',
    './js/ui/ThemeManager.js',
    './js/ui/Toast.js',
    './js/ui/CustomSelect.js',
    './js/ui/BackupManager.js',
    './js/ui/SettingsView.js',
    './js/ui/ReadingStatsManager.js',

    // Librerías de terceros locales
    './assets/libs/jszip.min.js',
    './assets/libs/epub.min.js'
];

// Dominios externos permitidos para almacenamiento en caché (los EPUB residen en IndexedDB)
const EXTERNAL_CACHE_HOSTS = new Set([
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com'
]);

// 1. INSTALACIÓN: Precarga los recursos del App Shell de manera resiliente
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('[SW] Instalando:', CACHE_NAME);

            // Descarga individual para evitar que el fallo de un archivo bloquee la instalación
            const results = await Promise.allSettled(
                APP_SHELL_ASSETS.map(async (asset) => {
                    try {
                        const response = await fetch(asset, { cache: 'no-cache' });
                        if (!response.ok) { throw new Error(`HTTP ${response.status}`); }
                        await cache.put(asset, response);
                        console.log('[SW] Precacheado:', asset);
                    } catch (error) {
                        console.warn('[SW] No se pudo precachear:', asset, error);
                    }
                })
            );

            console.log('[SW] Instalación terminada:', results.length, 'recursos procesados');
            await self.skipWaiting();
        })
    );
});

// 2. ACTIVACIÓN: Limpia versiones antiguas de caché y toma control de los clientes
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('arcadia-pwa-') && name !== CACHE_NAME)
                    .map((oldCache) => {
                        console.log('[SW] Eliminando caché antigua:', oldCache);
                        return caches.delete(oldCache);
                    })
            );
        })
            .then(() => self.clients.claim())
            .then(() => console.log('[SW] Activado:', CACHE_NAME))
    );
});

/* ===================
 * 3. FETCH
 * ===================
 */

self.addEventListener('fetch', (event) => {
    const request = event.request;

    /*
     * Solo manejamos GET.
     */
    if (request.method !== 'GET') return;

    const url = new URL(event.request.url);

    /*
     * SOLO HTTP y HTTPS.
     */
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    /*
     * ======================
     * RECURSOS EXTERNOS
     * ======================
     */

    if (url.origin !== self.location.origin) {
        // Recursos de terceros: solo interceptar si pertenecen a dominios CDN autorizados
        if (!EXTERNAL_CACHE_HOSTS.has(url.hostname)) return;
        event.respondWith(handleExternalRequest(request));
        return;
    }

    // Navegación SPA: servir index.html como shell contenedor
    if (request.mode === 'navigate' || request.destination === 'document') {
        event.respondWith(handleNavigation(request));
        return;
    }

    // Recursos estáticos locales (CSS, JS, iconos, fuentes locales)
    event.respondWith(handleStaticAsset(request));
});

// 4. NAVEGACIÓN: Estrategia Cache-First con revalidación en segundo plano para el index.html
async function handleNavigation(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedIndex = await cache.match('./index.html');

    // Si ya existe en caché, devolver de inmediato y revalidar en segundo plano
    if (cachedIndex) {
        updateNavigationCache(request, cache);
        return cachedIndex;
    }

    // Si no está en caché, intentar obtenerlo de la red
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) await cache.put('./index.html', networkResponse.clone());
        return networkResponse;
    } catch (error) {
        console.warn('[SW] Navegación sin conexión:', request.url);
    }

    // Fallback cuando no hay caché ni conexión de red
    return offlineResponse();
}

// 5. ACTUALIZACIÓN DE NAVEGACIÓN: Revalida index.html sin bloquear la carga actual
async function updateNavigationCache(request, cache) {
    try {
        const networkResponse = await fetch(request, { cache: 'no-cache' });
        if (!networkResponse.ok) return;
        await cache.put('./index.html', networkResponse.clone());
        console.log('[SW] index.html actualizado');
    } catch (error) {
        // Modo offline: se conserva la versión previa en caché sin error
    }
}

// 6. RECURSOS ESTÁTICOS: Cache-First con revalidación en segundo plano
async function handleStaticAsset(request) {
    const cache = await caches.open(CACHE_NAME);
    const cacheResponse = await cache.match(request);

    // Servir desde caché y refrescar de fondo si hay conexión
    if (cacheResponse) {
        revalidateInBackground(request, cache);
        return cacheResponse;
    }

    // Descarga desde red y almacenamiento en caché si es del mismo origen
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok && networkResponse.type === 'basic') {
            await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.warn('[SW] Recurso no disponible:', request.url);
        return new Response('Offline: recurso no disponible', { status: 503, statusText: 'Offline' });
    }
}

// 7. REVALIDACIÓN EN SEGUNDO PLANO: Actualiza silenciosamente recursos estáticos locales
async function revalidateInBackground(request, cache) {
    try {
        const networkResponse = await fetch(request, { cache: 'no-cache' });
        if (networkResponse.ok && networkResponse.type === 'basic') {
            await cache.put(request, networkResponse.clone());
            console.log('[SW] Caché actualizada:', request.url);
        }
    } catch (error) {
        // Silencioso en desconexión: se preserva la versión en caché
    }
}

// 8. RECURSOS EXTERNOS (CDN): Cache-First para fuentes y librerías externas
async function handleExternalRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    const cacheResponse = await cache.match(request);

    if (cacheResponse) {
        revalidateExternalInBackground(request, cache);
        return cacheResponse;
    }

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.warn('[SW] CDN no disponible:', request.url);
        return new Response('Recurso externo no disponible offline', { status: 503, statusText: 'Offline' });
    }
}

// 9. REVALIDACIÓN DE CDN: Actualiza recursos externos de forma no bloqueante
async function revalidateExternalInBackground(request, cache) {
    try {
        const networkResponse = await fetch(request, { cache: 'no-cache' });
        if (networkResponse.ok) await cache.put(request, networkResponse.clone());
    } catch (error) {
        // Silencioso en desconexión
    }
}

// 10. RESPUESTA OFFLINE: Página mínima de contingencia cuando falla la carga inicial sin caché
function offlineResponse() {
    return new Response(
        `
        <!DOCTYPE html>
        <html lang="es">

        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Arcadia - Sin Conexión</title>

            <style>
            body {
                font-family: sans-serif; 
                padding: 40px; 
                text-align: center;
            }
            </style>
        </head>

        <body>
        <h1>Arcadia</h1>
        <p>La aplicación está sin conexión y no se pudo cargar.</p>
        </body>

        </html>
        `,
        {
            status: 503, headers: {
                'Content-Type': 'text/html; charset=UTF-8'
            }
        }
    );
}

// 11. COMUNICACIÓN CLIENTE-SW: Atiende solicitudes de activación inmediata (SKIP_WAITING)
self.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
});