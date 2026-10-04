const CACHE = 'nildo-catalogo-v4';
const SHELL = ['/', '/index.html', '/styles.css', '/app.js', '/order.mjs', '/manifest.webmanifest', '/assets/icon-192.png', '/assets/icon-512.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', event => {
 const {request} = event;
 if(request.method!=='GET' || new URL(request.url).origin !== location.origin || new URL(request.url).pathname.startsWith('/api/admin')) return;
 if(new URL(request.url).pathname.startsWith('/api/')){
   event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response;}).catch(()=>caches.match(request)));return;
 }
 event.respondWith(fetch(request).then(response=>{ if(response.ok && !new URL(request.url).pathname.startsWith('/gestao')){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}return response; }).catch(()=>caches.match(request).then(hit=>hit||caches.match('/index.html'))));
});
