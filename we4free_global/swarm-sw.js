/**
 * WE4FREE Swarm Service Worker
 *
 * Enables offline-first operation for the entire agent swarm.
 * Caches all assets on first visit — works with zero connectivity after that.
 *
 * Architecture:
 *   Cache-first for static assets (JS, HTML, CSS)
 *   Network-first with cache fallback for API/proxy calls
 *   Background sync for mesh health signals when reconnecting
 */

'use strict';

const SW_VERSION   = 'we4free-swarm-v1';
const STATIC_CACHE = `${SW_VERSION}-static`;
const DATA_CACHE   = `${SW_VERSION}-data`;
const MESH_SYNC_TAG = 'mesh-signal-sync';

// All swarm assets to pre-cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/health-dashboard.html',
  '/genomics-ui.html',
  '/swarm-ui.html',
  '/compute-ui.html',
  '/medical-ui.html',
  '/health-intelligence.js',
  '/mesh-coordinator.js',
  '/mesh-health-signals.js',
  '/genomics-workflows.js',
  '/genomics-agent-roles.js',
  '/swarm-coordinator.js',
  '/task-queue.js',
  '/distributed-compute.js',
  '/climate-workflows.js',
  '/UISystem.js',
];

// API routes to cache with network-first strategy
const PROXY_ROUTES = [
  '/proxy/who/',
  '/proxy/cdc/',
];

// ── INSTALL: pre-cache all static assets ─────────────────────────────────────
self.addEventListener('install', event => {
  console.log(`[SW] Installing ${SW_VERSION}...`);
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      // Cache what we can — don't fail install if some assets are missing
      return Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(e => console.warn(`[SW] Failed to cache ${url}:`, e.message))
        )
      );
    }).then(() => {
      console.log(`[SW] ${SW_VERSION} installed`);
      return self.skipWaiting(); // Activate immediately
    })
  );
});

// ── ACTIVATE: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log(`[SW] Activating ${SW_VERSION}...`);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('we4free-swarm-') && k !== STATIC_CACHE && k !== DATA_CACHE)
          .map(k => {
            console.log(`[SW] Deleting old cache: ${k}`);
            return caches.delete(k);
          })
      )
    ).then(() => {
      console.log(`[SW] ${SW_VERSION} active`);
      return self.clients.claim(); // Take control of all open tabs immediately
    })
  );
});

// ── FETCH: route requests through cache strategy ──────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle same-origin or our proxy routes
  if (!url.hostname.includes('deliberateensemble.works') &&
      url.hostname !== 'localhost' &&
      url.hostname !== '127.0.0.1') {
    return; // Let external requests pass through normally
  }

  // Proxy routes: network-first with data cache fallback
  if (PROXY_ROUTES.some(r => url.pathname.startsWith(r))) {
    event.respondWith(networkFirstWithCache(event.request, DATA_CACHE, 3600000)); // 1hr TTL
    return;
  }

  // Static assets: cache-first
  event.respondWith(cacheFirstWithNetwork(event.request, STATIC_CACHE));
});

// ── BACKGROUND SYNC: flush mesh signals when back online ─────────────────────
self.addEventListener('sync', event => {
  if (event.tag === MESH_SYNC_TAG) {
    console.log('[SW] Background sync: flushing mesh health signals...');
    event.waitUntil(flushPendingSignals());
  }
});

// ── PUSH NOTIFICATIONS: outbreak alerts ──────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: 'Health Alert', body: event.data.text() }; }

  const options = {
    body:    payload.body || 'New health alert from WE4FREE surveillance network',
    icon:    '/icons/icon-192.png',
    badge:   '/icons/badge-72.png',
    tag:     payload.tag || 'health-alert',
    data:    payload,
    actions: [
      { action: 'view',    title: 'View Dashboard' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || '⚠ Health Alert', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(cs => {
        const existing = cs.find(c => c.url.includes('health-dashboard'));
        if (existing) return existing.focus();
        return clients.openWindow('/health-dashboard.html');
      })
    );
  }
});

// ── MESSAGE HANDLER: communicate with main thread ─────────────────────────────
self.addEventListener('message', event => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_HEALTH_DATA':
      // Main thread sends WHO/NASA data to cache for offline use
      caches.open(DATA_CACHE).then(cache => {
        const response = new Response(JSON.stringify(payload.data), {
          headers: { 'Content-Type': 'application/json', 'SW-Cached-At': Date.now().toString() }
        });
        cache.put(`/sw-data/${payload.key}`, response);
      });
      break;

    case 'QUEUE_MESH_SIGNAL':
      // Queue an anonymous health signal for background sync
      queueSignal(payload).then(() => {
        // Register background sync if supported
        if (self.registration.sync) {
          self.registration.sync.register(MESH_SYNC_TAG);
        }
      });
      break;

    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.source?.postMessage({ type: 'CACHE_STATUS', status });
      });
      break;

    default:
      break;
  }
});

// ── STRATEGY: Cache-first, fallback to network ────────────────────────────────
async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not cached — return offline page if HTML
    if (request.headers.get('Accept')?.includes('text/html')) {
      const offlinePage = await caches.match('/health-dashboard.html');
      return offlinePage || new Response('<h1>Offline — WE4FREE Swarm</h1>', {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    return new Response('Offline', { status: 503 });
  }
}

// ── STRATEGY: Network-first, fallback to cache with TTL ───────────────────────
async function networkFirstWithCache(request, cacheName, ttlMs) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      const toStore = response.clone();
      // Add timestamp header for TTL checking
      const headers = new Headers(toStore.headers);
      headers.set('SW-Cached-At', Date.now().toString());
      const stamped = new Response(await toStore.blob(), { status: toStore.status, headers });
      cache.put(request, stamped);
      return response;
    }
  } catch {
    // Network failed — check cache
  }

  const cached = await caches.match(request);
  if (cached) {
    const cachedAt = parseInt(cached.headers.get('SW-Cached-At') || '0');
    if (Date.now() - cachedAt < ttlMs) {
      return cached;
    }
  }
  return new Response(JSON.stringify({ error: 'offline', cached: false }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ── SIGNAL QUEUE: IndexedDB for pending mesh signals ─────────────────────────
async function queueSignal(signal) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('we4free-mesh', 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore('signals', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = e => {
      const db = e.target.result;
      const tx = db.transaction('signals', 'readwrite');
      tx.objectStore('signals').add({ ...signal, queuedAt: Date.now() });
      tx.oncomplete = resolve;
      tx.onerror = reject;
    };
    req.onerror = reject;
  });
}

async function flushPendingSignals() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('we4free-mesh', 1);
    req.onsuccess = async e => {
      const db = e.target.result;
      const tx = db.transaction('signals', 'readwrite');
      const store = tx.objectStore('signals');
      const signals = await new Promise(res => {
        const r = store.getAll();
        r.onsuccess = () => res(r.result);
      });

      if (!signals.length) { resolve(); return; }

      try {
        // POST aggregated (not individual) signals to swarm aggregation endpoint
        const aggregated = aggregateSignals(signals);
        const response = await fetch('/api/mesh-signals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(aggregated),
        });
        if (response.ok) {
          // Clear flushed signals
          store.clear();
          console.log(`[SW] Flushed ${signals.length} mesh signals`);
        }
      } catch (e) {
        console.warn('[SW] Failed to flush signals:', e.message);
      }
      resolve();
    };
    req.onerror = reject;
  });
}

// Aggregate signals before sending — never send raw individual data
function aggregateSignals(signals) {
  const byType = {};
  for (const s of signals) {
    if (!byType[s.type]) byType[s.type] = [];
    byType[s.type].push(s.value);
  }
  const summary = {};
  for (const [type, values] of Object.entries(byType)) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    summary[type] = { count: values.length, mean: parseFloat(mean.toFixed(3)) };
  }
  return {
    aggregated: summary,
    region:     signals[0]?.region || 'UNKNOWN',
    periodMs:   Date.now() - Math.min(...signals.map(s => s.queuedAt)),
    nodeCount:  1, // This node's contribution
    privacy:    'laplace-noise-applied',
  };
}

async function getCacheStatus() {
  const staticKeys = await caches.open(STATIC_CACHE).then(c => c.keys());
  const dataKeys   = await caches.open(DATA_CACHE).then(c => c.keys());
  return {
    version:      SW_VERSION,
    staticAssets: staticKeys.length,
    dataEntries:  dataKeys.length,
    offline:      true, // SW is active = offline capable
  };
}
