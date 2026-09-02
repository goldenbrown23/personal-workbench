// CACHE_NAME must be bumped as a literal string every release — do not compute it
// from an imported file. Safari/WebKit only re-checks this service worker for
// updates when sw.js's OWN bytes change; it does not re-check importScripts()
// targets, so deriving this from version.js silently breaks update detection there.
const CACHE_PREFIX = "personal-workbench-";
const CACHE_NAME = "personal-workbench-v0.17.0";
const APP_SHELL = [
  "./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png",
  "./styles.css",
  "./js/version.js", "./js/state.js", "./js/update.js", "./js/habits.js", "./js/practice.js", "./js/circle.js", "./js/home.js", "./js/settings.js", "./js/app.js"
];

self.addEventListener("install", event => {
  // cache:"reload" forces each precache fetch past the browser's HTTP disk cache —
  // without it, a newly-installed worker can silently precache stale bytes it
  // pulled from HTTP cache instead of the network, defeating the whole update.
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(APP_SHELL.map(url => cache.add(new Request(url, {cache:"reload"}))))
    )
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    // Only ever remove caches that belong to THIS app's own versioned naming scheme,
    // and only ones that aren't the current version — never touch unrelated Cache Storage entries.
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const isNavigation = req.mode === "navigate" || req.destination === "document";
  if (isNavigation) {
    // Network-first for HTML: a stale index.html is exactly what causes "still on the
    // old version" reports, so navigations always try the network first and only fall
    // back to the cached shell when actually offline.
    event.respondWith(
      fetch(req).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return response;
      }).catch(() =>
        caches.match(req).then(cached => cached || caches.match("./index.html"))
      )
    );
    return;
  }

  // Everything else (JS/CSS/icons) stays cache-first — this app revalidates them by
  // bumping CACHE_NAME each release, not per-file hashing, so cache-first is safe and fast.
  event.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(response => {
        if (!response || !response.ok || new URL(req.url).origin !== self.location.origin) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return response;
      })
    )
  );
});
