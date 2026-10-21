// CacheStorage 按 origin 共享；作用域前缀避免影响其他 Pages 项目。
const SCOPE = self.registration.scope;
const CACHE_PREFIX = `nitu:${SCOPE}:`;
const CACHE = `${CACHE_PREFIX}__BUILD_VERSION__`;
const SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./rendering/clay.js",
  "./core/dom.js",
  "./core/storage.js",
  "./core/router.js",
  "./data/catalog.js",
  "./ui/icons.js",
  "./ui/views.js",
  "./style.css",
  "./vendor/three.module.js",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./manifest.webmanifest",
  "./assets/renders/0-5-0.webp",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(SCOPE)) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) {
          const clone = r.clone();
          e.waitUntil(caches.open(CACHE).then((c) => c.put(e.request, clone)));
        }
        return r;
      })
      .catch(() =>
        caches
          .open(CACHE)
          .then((cache) => cache.match(e.request))
          .then(
            (r) =>
              r ||
              new Response("此内容尚未缓存，请联网后重试。", { status: 503 }),
          ),
      ),
  );
});
