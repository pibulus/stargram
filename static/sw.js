// Stargram Service Worker
// Enables offline functionality and PWA features

// BUMP THIS on any deploy that touches an unhashed asset (styles.css,
// modal-shell.css, icons). They're served cache-first, so returning PWA
// users keep the old copy until the cache name changes.
const CACHE_NAME = "stargram-v6";
const APP_SHELL = [
  "/",
  "/styles.css",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/favicon.ico",
  "/favicon.svg",
];

// Install event - cache essential files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("🔮 Caching cosmic app shell");
        return cache.addAll(APP_SHELL);
      })
      .then(() => self.skipWaiting()), // Activate immediately
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_NAME &&
            (cacheName.startsWith("cosmic-horoscope-") ||
              cacheName.startsWith("stargram-"))
          ) {
            console.log("🗑️ Removing old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }).then(() => self.clients.claim()), // Take control immediately
  );
});

// Fetch strategy:
// - dev (localhost): network only, never cache
// - /api/* and cross-origin (PostHog, Ko-fi, horoscope sources): network only —
//   readings and the live sky packet must never be served stale
// - navigations (HTML): network first so new deploys land immediately,
//   cached shell as the offline fallback
// - same-origin static assets (hashed js chunks, icons, css, sounds):
//   cache first with runtime fill
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(event.request, copy)
            );
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) =>
            cached || caches.match("/")
          )
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached ||
      fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) =>
            cache.put(event.request, copy)
          );
        }
        return response;
      })
    ),
  );
});
