import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as order from '../public/order.mjs';
const html=await readFile(new URL('../public/admin.html',import.meta.url),'utf8');
const source=(await readFile(new URL('../public/admin.js',import.meta.url),'utf8')).replace(/^import .*?;\n/,'const {money,normalize}=order;\n');
const seed=JSON.parse(await readFile(new URL('../data/catalog.json',import.meta.url),'utf8'));
async function management(fetch){
 const elements=new Map();
 for(const match of html.matchAll(/id="([^"]+)"/g)){
  const classes=new Set();elements.set('#'+match[1],{value:'',hidden:false,disabled:false,textContent:'',innerHTML:'',checked:false,handlers:{},style:{},classList:{add(x){classes.add(x);},remove(x){classes.delete(x);},contains(x){return classes.has(x);}},focus(){},setAttribute(){},addEventListener(type,fn){this.handlers[type]=fn;}});
 }
 const submit={disabled:false};
 const document={querySelector(s){return elements.get(s)||(s.endsWith('button[type=submit]')?submit:null);},addEventListener(){},body:{style:{}}};
 vm.runInNewContext(source,{document,fetch,order,AbortSignal,console,setTimeout(){return 1;},clearTimeout(){},confirm(){return true;}});
 await new Promise(resolve=>setImmediate(resolve));
 return {elements,submit};
}
test('senha incorreta mantém login disponível e apresenta a mensagem da API',async()=>{
 const page=await management(async(url,opts)=>opts.method==='POST'?Response.json({error:'Senha incorreta. Tente novamente.'},{status:401}):Response.json({authenticated:false}));
 page.elements.get('#password').value='incorreta';
 await page.elements.get('#loginForm').handlers.submit({preventDefault(){}});
 assert.equal(page.elements.get('#loginView').hidden,false);
 assert.equal(page.elements.get('#adminView').hidden,true);
 assert.equal(page.elements.get('#loginError').textContent,'Senha incorreta. Tente novamente.');
 assert.equal(page.submit.disabled,false);
});
test('falha ao carregar catálogo após login mantém formulário e permite tentar novamente',async()=>{
 const page=await management(async(url,opts)=>url==='/api/admin/products'?Promise.reject(Error('Offline')):Response.json({authenticated:opts.method==='POST'}));
 await page.elements.get('#loginForm').handlers.submit({preventDefault(){}});
 assert.equal(page.elements.get('#loginView').hidden,false);
 assert.equal(page.elements.get('#adminView').hidden,true);
 assert.match(page.elements.get('#loginError').textContent,/Não foi possível conectar/);
 assert.equal(page.submit.disabled,false);
});
test('falha ao sair não esconde a gestão e permite repetir o logout',async()=>{
 const page=await management(async(url,opts)=>opts.method==='DELETE'?Promise.reject(Error('Offline')):Response.json(url==='/api/auth'?{authenticated:true}:seed));
 await page.elements.get('#logout').onclick();
 assert.equal(page.elements.get('#adminView').hidden,false);
 assert.equal(page.elements.get('#logout').disabled,false);
 assert.match(page.elements.get('#toast').textContent,/Não foi possível sair/);
});
test('edição mantém fotos e SKU, converte centavos e informa falha de atualização após salvar',async()=>{
 let saved=null,reads=0;
 const page=await management(async(url,opts)=>{
  if(url==='/api/auth')return Response.json({authenticated:true});
  if(opts.method==='PUT'){saved=JSON.parse(opts.body);return Response.json({ok:true});}
  if(++reads>1)throw Error('Offline');return Response.json({...seed,version:'versao-da-sessao'});
 });
 const product=seed.products.find(p=>p.active);
 await page.elements.get('#adminProducts').onclick({target:{closest(s){return s==='[data-edit]'?{dataset:{edit:product.id}}:null;}}});
 page.elements.get('#productPrice').value='10,29';
 await page.elements.get('#productForm').onsubmit({preventDefault(){}});
 assert.equal(saved.version,'versao-da-sessao');assert.equal(saved.product.price,1029);assert.equal(saved.product.sku,product.sku);assert.deepEqual(saved.product.images,product.images);
 assert.equal(page.elements.get('#saveProduct').disabled,false);
 assert.match(page.elements.get('#toast').textContent,/Produto salvo.*recarregue/);
});
