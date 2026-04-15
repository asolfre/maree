/**
 * Maree Service Worker
 *
 * Strategy:
 * - App shell (HTML, CSS, JS, fonts, icons): Cache first, network fallback
 * - API requests: Network first, stale cache fallback
 * - Navigation requests: Network first, offline fallback page
 *
 * Version-bumping the CACHE_VERSION will clear old caches on activation.
 */

const CACHE_VERSION = "maree-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;

/** URLs to pre-cache on install (app shell). */
const PRECACHE_URLS = [
  "/",
  "/search",
  "/forecast",
  "/vedas",
  "/map",
  "/offline",
  "/manifest.json",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/fonts/material-symbols-outlined.woff2",
];

// --- Install: pre-cache app shell ---
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// --- Activate: clean up old caches ---
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(CACHE_VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// --- Fetch: route-based caching strategy ---
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests (external APIs, CDN fonts already cached by browser)
  if (url.origin !== self.location.origin) return;

  // API routes: network first, stale cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstThenCache(request, API_CACHE));
    return;
  }

  // Navigation requests: network first, offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/offline"))
        )
    );
    return;
  }

  // Static assets: cache first, network fallback
  event.respondWith(cacheFirstThenNetwork(request, STATIC_CACHE));
});

/**
 * Cache first: serve from cache if available, otherwise fetch and cache.
 */
async function cacheFirstThenNetwork(request, cacheName) {
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
    // Return a basic offline response for non-navigation requests
    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

/**
 * Network first: try network, fall back to stale cache.
 * Caches successful responses for future offline use.
 */
async function networkFirstThenCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    return new Response(
      JSON.stringify({ error: "Offline", offline: true }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
