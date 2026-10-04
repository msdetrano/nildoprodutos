import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
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
    const wrong=await invoke(auth,{method:'POST',body:{password:'errada'}});
    assert.equal(wrong.statusCode,401);assert.equal(wrong.body.error,'Senha incorreta. Tente novamente.');
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

test('login indisponível ou segredo curto não expõe variáveis nem cria sessão',async()=>{
  delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const saved={password:process.env.ADMIN_PASSWORD,secret:process.env.SESSION_SECRET};
  try{
    for(const secret of ['', 'curto']){
      process.env.ADMIN_PASSWORD='senha-teste';process.env.SESSION_SECRET=secret;
      const result=await invoke(auth,{method:'POST',body:{password:'senha-teste'},ip:'no-config'});
      assert.equal(result.statusCode,503);assert.equal(result.headers['set-cookie'],undefined);
      assert.equal(result.body.error,'Acesso à gestão temporariamente indisponível. Tente novamente mais tarde.');
      assert.doesNotMatch(result.body.error,/ADMIN_PASSWORD|SESSION_SECRET/);
    }
    delete process.env.ADMIN_PASSWORD;process.env.SESSION_SECRET='s'.repeat(32);
    assert.equal((await invoke(auth,{method:'POST'})).statusCode,503);
  }finally{
    if(saved.password===undefined)delete process.env.ADMIN_PASSWORD;else process.env.ADMIN_PASSWORD=saved.password;
    if(saved.secret===undefined)delete process.env.SESSION_SECRET;else process.env.SESSION_SECRET=saved.secret;
  }
});

test('API pública corrige catálogo antigo no Redis preservando preços e configurações',async(t)=>{
  const seed=JSON.parse(await readFile(new URL('../data/catalog.json',import.meta.url),'utf8'));
  const source=seed.products.find(p=>p.galleryCode==='S13');
  const legacy={...source,name:'Produto Aylag · foto S13',description:'Imagem da galeria oficial Aylag (S13). O fabricante não informa o nome desta foto em texto.',volume:'Confirmar com o Nildo',price:3590,needsReview:true};
  process.env.UPSTASH_REDIS_REST_URL='https://redis.example.test';process.env.UPSTASH_REDIS_REST_TOKEN='token-teste';
  t.mock.method(globalThis,'fetch',async()=>Response.json({result:JSON.stringify({products:[legacy],settings:{whatsapp:'5514996437437',notice:'Minha loja'}})}));
  try{
    const result=await invoke(catalog);assert.equal(result.statusCode,200);
    assert.equal(result.body.products.length,1);assert.equal(result.body.products[0].name,source.name);
    assert.equal(result.body.products[0].description,source.description);assert.equal(result.body.products[0].volume,'5 litros');
    assert.equal(result.body.products[0].price,3590);assert.equal(result.body.products[0].needsReview,false);
    assert.equal(result.body.settings.notice,'Minha loja');
  }finally{delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;}
});
