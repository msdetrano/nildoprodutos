import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
function serviceWorker(){
  const handlers={},entries=new Map(),pending=[];let offline=false;
  const self={location:{origin:'https://nildoprodutos.vercel.app'},addEventListener(type,handler){handlers[type]=handler;},skipWaiting(){},clients:{claim(){}}};
  const caches={async open(){return {async put(request,response){entries.set(request.url,response);},async addAll(){}};},async match(request){return entries.get(typeof request==='string'?new URL(request,self.location.origin).href:request.url)?.clone();},async keys(){return [];}};
  vm.runInNewContext(source,{self,caches,URL,Response,Set,fetch:async()=>{if(offline)throw Error('offline');return Response.json({products:[{id:'a'}]});}});
  async function request(path){
    let response;handlers.fetch({request:new Request(self.location.origin+path),waitUntil(p){pending.push(p);},respondWith(p){response=p;}});
    const result=await response;await Promise.all(pending.splice(0));return result;
  }
  return {request,entries,setOffline(){offline=true;}};
}
test('login, gestão e uploads não entram no cache offline',async()=>{
  const worker=serviceWorker();
  for(const path of ['/api/auth','/api/admin/products','/api/admin/upload','/gestao','/admin.html','/admin.js','/api/image?id=teste'])assert.equal(await worker.request(path),undefined);
  assert.equal(worker.entries.size,0);
});
test('catálogo público já visitado permanece disponível sem conexão',async()=>{
  const worker=serviceWorker();assert.equal((await worker.request('/api/catalog')).status,200);worker.setOffline();
  const cached=await worker.request('/api/catalog');assert.equal(cached.status,200);assert.equal((await cached.json()).products[0].id,'a');
});
test('primeiro acesso offline retorna erro JSON e nunca HTML como catálogo',async()=>{
  const worker=serviceWorker();worker.setOffline();const response=await worker.request('/api/catalog');
  assert.equal(response.status,503);assert.match(response.headers.get('content-type'),/application\/json/);assert.match((await response.json()).error,/offline/);
});
