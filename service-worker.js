const CACHE_NAME = 'study-tracker-v1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './firebase.js',
    './manifest.json',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', event => {
    // Only cache GET requests originating from same protocol
    if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).then(fetchRes => {
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request.url, fetchRes.clone());
                    return fetchRes;
                });
            });
        }).catch(() => {
            // Offline fallback
            if (event.request.url.indexOf('.html') > -1) {
                return caches.match('./index.html');
            }
        })
    );
});
