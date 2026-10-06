import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {restoreProductDetails,cleanProduct} from '../lib/catalog.mjs';
const seed=JSON.parse(await readFile(new URL('../data/catalog.json',import.meta.url),'utf8'));
const migration=JSON.parse(await readFile(new URL('../data/catalog-migration.json',import.meta.url),'utf8'));
const prices=JSON.parse(await readFile(new URL('../data/retail-prices.json',import.meta.url),'utf8'));
test('55 anúncios publicados têm preço final, foto, descrição e códigos sem duplicidade',async()=>{
 const active=seed.products.filter(p=>p.active);assert.equal(active.length,55);
 assert.equal(new Set(active.map(p=>p.sku)).size,active.length);
 for(const p of active){
  assert.ok(Number.isSafeInteger(p.price)&&p.price>0);assert.equal(p.priceUnit,'unidade');
  assert.ok(p.description.length>30&&p.volume);assert.ok(p.images.length);
  for(const image of p.images){assert.match(image,/^\/assets\/products\//);assert.ok((await readFile(new URL('../public'+image,import.meta.url))).length>100);}
 }
 assert.equal(seed.products.filter(p=>p.price===null).length,6);
 assert.ok(seed.products.filter(p=>p.price===null).every(p=>!p.active));
 assert.equal(seed.products.find(p=>p.galleryCode==='L04').volume,'5 litros');
});
test('valores vêm da coluna de venda por unidade, sem imposto ou margem adicionais',()=>{
 for(const item of prices.items){
  const [whole,fraction='']=item.salePriceProvided.split('.');
  const raw=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0').slice(0,2));
  const rounded=Number(raw+(Number(fraction[2]||0)>=5?1n:0n));
  assert.equal(item.priceCents,rounded);assert.equal(seed.products.find(p=>p.id===item.productId).price,rounded);
 }
 assert.equal(seed.products.find(p=>p.galleryCode==='S13').price,5568);
 assert.equal(seed.products.find(p=>p.galleryCode==='C22').price,358);
 assert.equal(seed.products.find(p=>p.galleryCode==='C02').price,688);
});
test('migração aplica tabela uma vez; depois preserva alterações e itens excluídos',()=>{
 const old=migration.previousProducts.find(p=>p.id==='aylag-004');
 const saved={products:[{...old,price:990,active:true}],settings:{notice:'Meu aviso'}};
 const updated=restoreProductDetails(saved,seed,migration);const p=updated.products[0];
 assert.equal(p.name,'Amaciante Azul Aylag 5L');assert.equal(p.price,2024);assert.equal(p.volume,'5 litros');
 assert.ok(p.images[0].startsWith('/assets/products/'));assert.equal(updated.products.length,1);
 assert.deepEqual(updated.settings,saved.settings);
 p.price=2490;p.description='Descrição personalizada';
 assert.deepEqual(restoreProductDetails(updated,seed,migration),updated);
});
test('publicação incompleta é rejeitada, mas rascunhos podem ficar ocultos',()=>{
 const p=seed.products.find(p=>p.active);
 for(const invalid of [{...p,price:null},{...p,price:0},{...p,images:[]},{...p,description:''},{...p,volume:''}])assert.throws(()=>cleanProduct(invalid),/Para publicar/);
 assert.equal(cleanProduct({...p,active:false,price:null}).active,false);
 assert.throws(()=>cleanProduct({...p,images:['/assets/products/../../segredo.jpg']}),/Use apenas links/);
});
