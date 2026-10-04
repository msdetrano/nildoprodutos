const CACHE='nildo-catalogo-v5';
const SHELL=['/','/index.html','/styles.css','/app.js','/order.mjs','/manifest.webmanifest','/assets/icon-192.png','/assets/icon-512.png','/assets/photo-placeholder.svg'];
const SHELL_PATHS=new Set(SHELL);
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nildo-catalogo-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  // Só o catálogo público e os arquivos da loja podem ser guardados offline.
  const catalog=url.pathname==='/api/catalog';
  if(!catalog&&!SHELL_PATHS.has(url.pathname))return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(request);
      if(response.ok){
        const copy=response.clone();
        event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{}));
        return response;
      }
      if(catalog&&response.status>=500){const hit=await caches.match(request);if(hit)return hit;}
      return response;
    }catch{
      const hit=await caches.match(request);
      if(hit)return hit;
      if(request.mode==='navigate')return (await caches.match('/index.html'))||new Response('Sem conexão.',{status:503});
      return catalog?new Response(JSON.stringify({error:'Catálogo indisponível offline. Conecte-se e tente novamente.'}),{status:503,headers:{'Content-Type':'application/json'}}):new Response('Sem conexão.',{status:503});
    }
  })());
});
