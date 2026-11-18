// E.Rent service worker. Navigations go to the network first and fall back to /offline. Static files are served from
// cache while a fresh copy loads in the background. Supabase calls, uploads and signed files are never cached.
const VERSION = "v3";
const STATIC = `erent-static-${VERSION}`;
const SHELL = ["/offline", "/icons/icon-192.png", "/brand/erent-wordmark-nodot.png", "/brand/erent-dot.png"];

self.addEventListener("install", (event) => {
  // allSettled: one missing file must never stop the worker from installing
  event.waitUntil(caches.open(STATIC).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("erent-") && k !== STATIC).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline").then((r) => r || Response.error())));
    return;
  }
  if (/^\/(_next\/static|icons|brand)\//.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        const fresh = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || fresh;
      }),
    );
  }
});
