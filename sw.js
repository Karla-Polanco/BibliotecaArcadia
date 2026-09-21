/* ======================================
   ARCADIA SERVICE WORKER
   PWA + OFFLINE CACHE + AUTO UPDATE
   ====================================== */

const CACHE_NAME = 'arcadia-pwa-v132';

/*
 * =============================================
 * APP SHELL
 * =============================================
 * 
 * Estos archivos forman la aplicación principal.
 * 
 * Se almacenan durante la instalación para que
 * Arcadia pueda arrancar incluso sin conexión.
 */

const APP_SHELL_ASSETS = [
    './',
    './index.html',
    './manifest.json',

    // Iconos y Favicons exclusivos de Android y Web
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    './assets/icons/favicon.svg',
    './assets/icons/favicon.ico',
    './assets/icons/logo-transparent.png',

    // CSS
    './css/tokens.css',
    './css/themes.css',
    './css/main.css',
    './css/layout.css',
    './css/library.css',
    './css/reader.css',
    './css/responsive.css',

    // JavaScript Principal
    './js/app.js',
    './js/db.js',
    './js/state.js',

    // EPUB
    './js/epub/EPUBParser.js',
    './js/epub/EPUBValidator.js',

    // Library
    './js/library/BookManager.js',
    './js/library/CollectionManager.js',
    './js/library/LibraryView.js',
    './js/library/StorageWidget.js',

    // Reader
    './js/reader/LocationsManager.js',
    './js/reader/ReaderManager.js',
    './js/reader/ReaderSettings.js',
    './js/reader/ReaderView.js',
    './js/reader/SearchManager.js',

    // Annotations
    './js/annotations/AnnotationManager.js',
    './js/annotations/AnnotationsView.js',
    './js/annotations/NoteManager.js',

    // Vocabulary
    './js/vocabulary/VocabularyManager.js',
    './js/vocabulary/VocabularyView.js',

    // PWA
    './js/pwa/PWAManager.js',

    // UI
    './js/ui/Modal.js',
    './js/ui/CollectionModal.js',
    './js/ui/ScaleManager.js',
    './js/ui/FloatingMenu.js',
    './js/ui/ThemeManager.js',
    './js/ui/Toast.js',
    './js/ui/CustomSelect.js',
    './js/ui/BackupManager.js',

    // Librerías Locales
    './assets/libs/jszip.min.js',
    './assets/libs/epub.min.js'
];

/*
 * ===================================================
 * CDN EXTERNOS
 * ===================================================
 * 
 * Solo estos dominios externos serán manejados por el 
 * Service Worker.
 * 
 * Los EPUB del usuario NO pasan por aquí.
 * Los EPUB permanecen en el IndexedDB.
 */

const EXTERNAL_CACHE_HOSTS = new Set([
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com'
]);

/* 
 * ==================
 * 1. INSTALL
 * ==================
 */

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {

            console.log('[SW] Instalando:', CACHE_NAME);

            /*
             * Descargamos los recursos individualmente.
             *
             * Si un archivo falla, no impedimos que
             * los demás se almacenen.
             */

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

            /*
             * Activar inmediatamente el nuevo SW
             */

            await self.skipWaiting();
        })
    );
});

/*
 * ==================
 * 2. ACTIVATE
 * ==================
 */

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

            /*
             * El nuevo SW comienza a controlar
             * las páginas inmediatamente.
             */

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
        /*
         * Si el dominio no está autorizado,
         * dejamos que el navegador maneje la petición.
         */

        if (!EXTERNAL_CACHE_HOSTS.has(url.hostname)) return;
        event.respondWith(handleExternalRequest(request));
        return
    }

    /*
     * ==================
     * NAVEGACIÓN
     * ==================
     *
     * Arcadia es una SPA.
     * 
     * Libros, Colecciones, Lector, etc. se muestran dentro
     * de index.html.
     */

    if (request.mode === 'navigate' || request.destination === 'document') {
        event.respondWith(handleNavigation(request));
        return;
    }

    /*
     * ======================
     * RECURSOS ESTÁTICOS
     * ======================
     */

    event.respondWith(handleStaticAsset(request));
});

/*
 * ==================
 * 4. NAVEGACIÓN
 * ==================
 * 
 * Estrategia:
 * 
 * CACHE FIRST
 * 
 * 1. Buscar index.html en caché.
 * 2. Mostrarlo inmediatamente.
 * 3. Actualizarlo desde Internet en segundo plano.
 * 4. Si no existe caché, intentar red.
 */

async function handleNavigation(request) {
    const cache = await caches.open(CACHE_NAME);

    /*
     * Como Arcadia es un SPA, usamos index.html
     * como App Shell principal.
     */

    const cachedIndex = await cache.match('./index.html');

    /*
     * Si tenemos index.html:
     *
     * lo devolvemos inmediatamente.
     */

    if (cachedIndex) {

        /*
         * Actualizamos en segundo plano
         */

        updateNavigationCache(request, cache);
        return cachedIndex;
    }

    /*
     * Si todavía no tenemos caché,
     * intentamos conectarnos a Internet.
     */

    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) await cache.put('./index.html', networkResponse.clone());
        return networkResponse;
    } catch (error) {
        console.warn('[SW] Navegación sin conexión:', request.url);
    }

    /*
     * Último resurso
     */
    return offlineResponse();
}

/*
 * ============================
 * 5. ACTUALIZAR INDEX.HTML
 * ============================
 */

async function updateNavigationCache(request, cache) {
    try {

        const networkResponse = await fetch(request, { cache: 'no-cache' });

        if (!networkResponse.ok) return;

        /*
         * Guardamos siempre index.html
         */

        await cache.put('index.html', networkResponse.clone());
        console.log('[SW] index.html actualizado');
    } catch (error) {
        /* 
         * Sin Internet:
         *
         * no hacemos nada.
         * 
         * La versión anterior sigue siendo válida.
         */
    }
}

/* 
 * ========================
 * 6. RECURSOS ESTÁTICOS
 * ========================
 * 
 * Estrategia:
 * 
 * CACHE FIRST + actualización en segundo plano
 */

async function handleStaticAsset(request) {

    const cache = await caches.open(CACHE_NAME);
    const cacheResponse = await cache.match(request);

    /*
     * Tenemos una copia local.
     */

    if (cacheResponse) {

        /*
         * Actualización silenciosa.
         */

        revalidateInBackground(request, cache);
        return cacheResponse;
    }

    /*
     * No está en caché.
     *
     * Intentamos Internet.
     */

    try {

        const networkResponse = await fetch(request);

        /*
         * Solo guardamos respuestas válidad
         * del mismo origen.
         */

        if (networkResponse.ok && networkResponse.type === 'basic') {
            await cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.warn('[SW] Recurso no disponible:', request.url);

        /*
         * El recurso no está disponible.
         */

        return new Response('Offline: recurso no disponible', { status: 503, statusText: 'Offline' });
    }
}

/*
 * ===================================
 * 7. REVALIDACIÓN EN SEGUNDO PLANO
 * ===================================
 */

async function revalidateInBackground(request, cache) {
    try {

        const networkResponse = await fetch(request, { cache: 'no-cache' });

        if (networkResponse.ok && networkResponse.type === 'basic') {

            await cache.put(request, networkResponse.clone());
            console.log('[SW] Caché actualizada:', request.url);
        }
    } catch (error) {

        /*
         * Sin Internet:
         *
         * conservamos la versión existente.
         */
    }
}

/*
 * ==============================
 * 8. RECURSOS EXTERNOS / CDN
 * ==============================
 */

async function handleExternalRequest(request) {

    const cache = await caches.open(CACHE_NAME);
    const cacheResponse = await cache.match(request);

    /*
     * Tenemos una copia.
     */

    if (cacheResponse) {
        revalidateExternalInBackground(request, cache);
        return cacheResponse;
    }

    /*
     * Primera visita:
     * necesitamos Internet.
     */

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

/*
 * ==========================
 * 9. REVALIDACIÓN DE CDN
 * ==========================
 */

async function revalidateExternalInBackground(request, cache) {

    try {

        const networkResponse = await fetch(request, { cache: 'no-cache' });

        if (networkResponse.ok) await cache.put(request, networkResponse.clone());
    } catch (error) {

        /*
         * Sin Internet:
         * mantenemos la copia almacenada.
         */
    }
}

/*
 * =========================
 * 10. RESPUESTA OFFLINE
 * =========================
 */

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

/*
 * ============================
 * 11. MENSAJES DESDE LA APP
 * ============================
 */

self.addEventListener('message', (event) => {
    if (!event.data) return;

    /*
     * Permite que la aplicació solicite
     * la activación inmediata del nuevo SW.
     * 
     * Desde la aplicación:
     * 
     * navigator.serviceWorker.controller?.postMessage({ 
     *     type: 'SKIP_WAITING' 
     * }); 
     * 
     */

    if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
});