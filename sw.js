/* ============================================================
   PROJECT INDRA — SERVICE WORKER
   Offline-first PWA with background sync for pothole data
   ============================================================ */

const CACHE_NAME = 'indra-v1.0';
const RUNTIME_CACHE = 'indra-runtime-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/pages/hud.html',
  '/pages/dashboard.html',
  '/css/design-system.css',
  '/js/app.js',
  '/js/physics-engine.js',
  '/js/fatigue-guard.js',
  '/js/pothole-mapper.js',
  '/js/dead-mans-switch.js',
  '/js/wrong-side.js',
  '/js/audio-engine.js',
  '/js/sensor-sim.js',
  '/js/mock-data.js',
];

const SYNC_TAG = 'pothole-sync';

// ─── INSTALL ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH (Cache-first for assets, Network-first for API) ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin (except fonts/CDN)
  if (request.method !== 'GET') return;

  // Network-first for API calls
  if (url.pathname.includes('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first for static assets
  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return caches.match(request);
  }
}

// ─── BACKGROUND SYNC — Pothole Upload ───────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncPotholes());
  }
});

async function syncPotholes() {
  // Read queued potholes from IndexedDB (via postMessage in main thread)
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_POTHOLES' });
    });
  });
}

// ─── PUSH NOTIFICATIONS ──────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Project Indra Alert', {
      body: data.body || 'Road safety alert in your area.',
      icon: '/assets/icon-192.png',
      badge: '/assets/badge-72.png',
      vibrate: [200, 100, 200, 100, 400],
      tag: 'indra-alert',
      requireInteraction: data.critical || false,
      data: { url: data.url || '/pages/hud.html' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
