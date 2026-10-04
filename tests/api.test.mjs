import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import catalog from '../api/catalog.js';
import auth from '../api/auth.js';
import products from '../api/admin/products.js';
import upload from '../api/admin/upload.js';
import {getCatalog,saveCatalog} from '../lib/catalog.mjs';

function invoke(handler,{method='GET',body={},cookie='',origin,ip='test'}={}){
  const req={method,body,headers:{host:'nildoprodutos.vercel.app',cookie,'x-forwarded-for':ip,...(origin?{origin}:{})}};
  const res={statusCode:200,headers:{},status(code){this.statusCode=code;return this;},setHeader(key,value){this.headers[key.toLowerCase()]=value;return this;},json(value){this.body=value;return this;}};
  return Promise.resolve(handler(req,res)).then(()=>res);
}

test('catálogo embarcado funciona em produção sem Redis, mesmo com outro diretório de execução',async()=>{
  delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.VERCEL='1';
  const cwd=process.cwd(),temp=await mkdtemp(join(tmpdir(),'nildo-cwd-'));
  try{
    process.chdir(temp);
    const result=await invoke(catalog);
    assert.equal(result.statusCode,200);assert.equal(result.body.products.length,62);
    assert.equal(result.body.settings.whatsapp,'5514996437437');
    await assert.rejects(saveCatalog(result.body),/conecte um banco Upstash Redis/);
    process.env.WHATSAPP_NUMBER='55 (11) 99999-9999';
    assert.equal((await invoke(catalog)).body.settings.whatsapp,'5511999999999');
    delete process.env.WHATSAPP_NUMBER;
    assert.equal((await invoke(catalog,{method:'POST'})).statusCode,405);
  }finally{process.chdir(cwd);await rm(temp,{recursive:true,force:true});}
});

test('gestão exige senha e origem corretas; sessão permite CRUD persistido no Redis',async(t)=>{
  t.mock.method(console,'error',()=>{});
  process.env.VERCEL='1';process.env.ADMIN_PASSWORD='senha-apenas-para-testes';process.env.SESSION_SECRET='segredo-apenas-para-testes-com-mais-de-32-caracteres';
  process.env.UPSTASH_REDIS_REST_URL='https://redis.example.test';process.env.UPSTASH_REDIS_REST_TOKEN='token-apenas-para-testes';
  const originalFetch=globalThis.fetch,store=new Map();
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,'https://redis.example.test');assert.ok(options.signal);
    const [command,key,value]=JSON.parse(options.body);let result=null;
    if(command==='GET')result=store.get(key)||null;
    if(command==='SET'){store.set(key,value);result='OK';}
    if(command==='INCR'){result=Number(store.get(key)||0)+1;store.set(key,result);}
    if(command==='EXPIRE')result=1;
    return Response.json({result});
  };
  try{
    assert.equal((await invoke(products)).statusCode,401);
    assert.equal((await invoke(auth,{method:'POST',body:{password:'errada'}})).statusCode,401);
    assert.equal((await invoke(auth,{method:'POST',origin:'https://outro.example',body:{password:process.env.ADMIN_PASSWORD}})).statusCode,403);
    const login=await invoke(auth,{method:'POST',body:{password:process.env.ADMIN_PASSWORD}});
    assert.equal(login.statusCode,200);assert.match(login.headers['set-cookie'],/HttpOnly/);assert.match(login.headers['set-cookie'],/; Secure/);
    const cookie=login.headers['set-cookie'].split(';')[0];
    assert.equal((await invoke(auth,{cookie})).body.authenticated,true);
    assert.equal((await invoke(auth,{cookie:cookie.replace(/.$/,'!')})).body.authenticated,false);
    const product={name:'Produto de teste',category:'Lavanderia',volume:'1 litro',description:'Teste',price:1290,images:[],active:true};
    const created=await invoke(products,{method:'POST',cookie,body:{product}});
    assert.equal(created.statusCode,201);const id=created.body.product.id;
    assert.ok((await getCatalog()).products.some(item=>item.id===id));
    const invalid=await invoke(products,{method:'PUT',cookie,body:{id,product:{...product,price:-1}}});assert.equal(invalid.statusCode,400);
    const updated=await invoke(products,{method:'PUT',cookie,body:{id,product:{...product,active:false,price:1590}}});assert.equal(updated.statusCode,200);
    assert.ok(!(await invoke(catalog)).body.products.some(item=>item.id===id));
    assert.equal((await invoke(products,{method:'PATCH',cookie,body:{settings:{whatsapp:'123'}}})).statusCode,400);
    const settings=await invoke(products,{method:'PATCH',cookie,body:{settings:{whatsapp:'5514996437437',notice:'Retirada combinada pelo WhatsApp.'}}});assert.equal(settings.statusCode,200);
    assert.equal((await invoke(catalog)).body.settings.notice,'Retirada combinada pelo WhatsApp.');
    assert.equal((await invoke(upload,{method:'POST',body:{dataUri:'teste'}})).statusCode,401);
    assert.equal((await invoke(products,{method:'DELETE',cookie,body:{id}})).statusCode,200);
    assert.ok(!(await getCatalog()).products.some(item=>item.id===id));
    const logout=await invoke(auth,{method:'DELETE',cookie});assert.match(logout.headers['set-cookie'],/Max-Age=0/);
  }finally{globalThis.fetch=originalFetch;delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;}
});
