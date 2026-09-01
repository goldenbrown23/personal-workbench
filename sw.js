importScripts("./js/version.js");
const CACHE_NAME = "personal-workbench-" + APP_VERSION;
const APP_SHELL = [
  "./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png",
  "./styles.css",
  "./js/version.js", "./js/state.js", "./js/update.js", "./js/habits.js", "./js/practice.js", "./js/circle.js", "./js/home.js", "./js/settings.js", "./js/app.js"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(response => {
        if (!response || !response.ok || new URL(event.request.url).origin !== self.location.origin) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
    ).catch(() => event.request.mode === "navigate" ? caches.match("./index.html") : undefined)
  );
});
