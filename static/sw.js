// Cosmic Horoscope Service Worker v1.0
// Enables offline functionality and PWA features

const CACHE_NAME = "stargram-v2";
const urlsToCache = [
  "/",
  "/styles.css",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-512x512.png",
  "/favicon.ico",
];

// Install event - cache essential files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("🔮 Caching cosmic app shell");
        return cache.addAll(urlsToCache);
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

// Fetch event - serve from cache when possible
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip external API requests (horoscope API, PostHog)
  if (
    event.request.url.includes("/api/horoscope") ||
    event.request.url.includes("horoscope-app-api.vercel.app") ||
    event.request.url.includes("freehoroscopeapi.com") ||
    event.request.url.includes("posthog.com") ||
    event.request.url.includes("ko-fi.com")
  ) {
    // Network-only for API calls - don't cache horoscope data
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return cached response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (
            !response || response.status !== 200 ||
            response.type === "error"
          ) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Network failed, return offline page if available
          return caches.match("/");
        });
      }),
  );
});
