/* Goblin Town service worker — offline town.
 *
 * Strategy:
 *   - Precache the game shell (page + core assets) on install.
 *   - Navigations: network-first with cache fallback (fresh HTML when online).
 *   - Static assets (img/fonts/css/js): stale-while-revalidate.
 *   - Firestore/API: never intercepted (must hit network).
 *
 * Bump CACHE_VERSION whenever precache lists change.
 */
const CACHE_VERSION = "gt-v1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

const SHELL_ASSETS = ["/game/", "/", "/logo/pwa-192.png", "/logo/pwa-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never touch Firestore, Google APIs, or the site's own admin/API routes.
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin"))
  ) {
    return;
  }
  if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("firebaseio.com")) {
    return;
  }

  // Navigations: try network, fall back to cache (offline town).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/game/"))),
    );
    return;
  }

  // Same-origin static assets + Google Fonts: stale-while-revalidate.
  const isStatic =
    (url.origin === self.location.origin &&
      (url.pathname.startsWith("/img/") ||
        url.pathname.startsWith("/extra/") ||
        url.pathname.startsWith("/logo/") ||
        url.pathname.startsWith("/_astro/"))) ||
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com";

  if (!isStatic) return;

  event.respondWith(
    caches.open(ASSET_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
