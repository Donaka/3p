const staticCacheName = "3p-chicken-pops-static-v81";
const imageCacheName = "image-cache-v2";
const files = [
  "./",
  "./index.html",
  "./admin.html",
  "./admin.js",
  "./styles.css",
  "./app.js",
  "./firebase-config.js",
  "./manifest.json",
  "./icon.svg",
  "./logo-3p.png",
  "./pwa-icon-192.png",
  "./pwa-icon-512.png",
  "./splash-3p-bowl.png",
  "./loading-logo-fire.png"
];

const MAX_IMAGE_CACHE_ENTRIES = 80;

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then(response => {
    if (response && (response.ok || response.type === "opaque")) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);
  return cached || networkPromise;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && (response.ok || response.type === "opaque")) {
    cache.put(request, response.clone());
    trimCache(cacheName, MAX_IMAGE_CACHE_ENTRIES);
  }
  return response;
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await cache.delete(keys[0]);
  return trimCache(cacheName, maxEntries);
}

self.addEventListener("install", event => {
  event.waitUntil(caches.open(staticCacheName).then(cache => cache.addAll(files)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => ![staticCacheName, imageCacheName].includes(key))
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isImageRequest = event.request.destination === "image"
    || url.pathname === "/api/image"
    || /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(url.pathname);

  if (isImageRequest) {
    event.respondWith(cacheFirst(event.request, imageCacheName).catch(() => caches.match(event.request)));
    return;
  }

  const isAppShellAsset = url.origin === self.location.origin
    && (files.includes(`.${url.pathname}`) || url.pathname === "/" || url.pathname.endsWith(".css") || url.pathname.endsWith(".js"));

  if (isAppShellAsset) {
    event.respondWith(staleWhileRevalidate(event.request, staticCacheName).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
