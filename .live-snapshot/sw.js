// WE4Free Service Worker - Offline-First Crisis Support
// Version 1.0.0

const CACHE_NAME = 'we4free-v10';
const EMERGENCY_CACHE = 'we4free-emergency-v1';

// Critical resources that MUST be available offline
const CRITICAL_ASSETS = [
    '/',
    '/index.html',
    '/resources.html',
    '/emergency.html',
    '/webchat.html',
    '/escalate.html',
    '/db.js',
    '/integrity.js',
    '/self_healing.js',
    '/channel_router.js',
    '/conflict_resolver.js',
    '/integrity.manifest.json',
    'https://unpkg.com/dexie@3.2.4/dist/dexie.min.js'
];

// Emergency data - embedded for guaranteed offline access
const EMERGENCY_DATA = {
    numbers: {
        '911': { service: 'Immediate Danger', always: true },
        '988': { service: 'Suicide Crisis', always: true },
        '811': { service: 'Health Lines', canada: true },
        '211': { service: 'Community Services', canada: true },
        '1-800-668-6868': { service: 'Kids Help Phone', canada: true, text: 'CONNECT to 686868' }
    },
    version: '1.0.0',
    updated: new Date().toISOString()
};

// ==============================================
// INSTALL - Pre-cache critical resources
// ==============================================
self.addEventListener('install', (event) => {
    console.log('[WE4Free SW] Installing...');

    event.waitUntil(
        Promise.all([
            // Cache critical pages
            caches.open(CACHE_NAME).then(cache => {
                console.log('[WE4Free SW] Caching critical assets');
                return cache.addAll(CRITICAL_ASSETS.map(url => new Request(url, { cache: 'reload' })));
            }),

            // Store emergency data
            caches.open(EMERGENCY_CACHE).then(cache => {
                console.log('[WE4Free SW] Storing emergency data');
                const response = new Response(JSON.stringify(EMERGENCY_DATA), {
                    headers: { 'Content-Type': 'application/json' }
                });
                return cache.put('/api/emergency-data.json', response);
            })
        ]).then(() => {
            console.log('[WE4Free SW] Installation complete');
            return self.skipWaiting(); // Activate immediately
        })
    );
});

// ==============================================
// ACTIVATE - Clean old caches
// ==============================================
self.addEventListener('activate', (event) => {
    console.log('[WE4Free SW] Activating...');

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name.startsWith('we4free-') && name !== CACHE_NAME && name !== EMERGENCY_CACHE)
                    .map(name => {
                        console.log('[WE4Free SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('[WE4Free SW] Activation complete');
            return self.clients.claim(); // Take control immediately
        })
    );
});

// ==============================================
// FETCH - Cache-first strategy with network fallback
// ==============================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle same-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // Special handling for emergency data
    if (url.pathname === '/api/emergency-data.json') {
        event.respondWith(handleEmergencyData());
        return;
    }

    // Cache-first strategy for all other resources
    event.respondWith(
        caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
                console.log('[WE4Free SW] Serving from cache:', url.pathname);

                // Update cache in background
                fetch(request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, networkResponse.clone());
                        });
                    }
                }).catch(() => {
                    // Network failed, but we already served from cache
                });

                return cachedResponse;
            }

            // Not in cache, fetch from network
            console.log('[WE4Free SW] Fetching from network:', url.pathname);
            return fetch(request).then(networkResponse => {
                // Clone response BEFORE doing anything with it
                if (!networkResponse || networkResponse.status !== 200) {
                    return networkResponse;
                }

                // Clone for caching (do this FIRST before any operations)
                const responseToCache = networkResponse.clone();

                // Cache in background (non-blocking)
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(request, responseToCache);
                }).catch(err => {
                    console.error('[WE4Free SW] Cache put failed:', err);
                });

                // Return original response to browser
                return networkResponse;
            }).catch(error => {
                console.error('[WE4Free SW] Fetch failed:', error);

                // If HTML page fails, serve emergency fallback
                if (request.destination === 'document') {
                    return caches.match('/emergency.html');
                }

                throw error;
            });
        })
    );
});

// ==============================================
// EMERGENCY DATA HANDLER
// ==============================================
async function handleEmergencyData() {
    try {
        // Try emergency cache first
        const cache = await caches.open(EMERGENCY_CACHE);
        const cachedResponse = await cache.match('/api/emergency-data.json');

        if (cachedResponse) {
            return cachedResponse;
        }

        // Fallback to embedded data
        return new Response(JSON.stringify(EMERGENCY_DATA), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('[WE4Free SW] Emergency data error:', error);
        // Last resort: return embedded data
        return new Response(JSON.stringify(EMERGENCY_DATA), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// ==============================================
// MESSAGE HANDLER - For manual cache updates
// ==============================================
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: EMERGENCY_DATA.version,
            cacheCount: CRITICAL_ASSETS.length
        });
    }
});

console.log('[WE4Free SW] Loaded successfully');
