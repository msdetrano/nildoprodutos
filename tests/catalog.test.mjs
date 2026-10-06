import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {orderMessage} from '../public/order.mjs';
import {restoreProductDetails} from '../lib/catalog.mjs';
const seed=JSON.parse(await readFile(new URL('../data/catalog.json',import.meta.url)));
const gallery=JSON.parse(await readFile(new URL('../data/aylag-galleries.json',import.meta.url)));
const hash=u=>(u.match(/8f8890_[a-f0-9]{32}~mv2\.(?:jpg|png)/)||[])[0];
test('as 60 fotos das quatro galerias Aylag estão representadas',()=>{
 assert.equal(gallery.length,60);assert.equal(seed.products.length,62);
 for(const item of gallery)assert.ok(seed.products.some(p=>p.images.includes(item.local_image)),`Foto ausente ${item.code}`);
});
test('as quatro categorias e o número WhatsApp estão configurados',()=>{
 assert.deepEqual(Object.fromEntries([...new Set(seed.products.map(p=>p.category))].map(c=>[c,seed.products.filter(p=>p.category===c).length])),{'Casa & Limpeza':26,'Lavanderia':15,'Automotiva & Profissional':8,'Cosméticos':13});
 assert.equal(seed.settings.whatsapp,'5514996437437');
});
test('todos os anúncios têm nome e descrição; as 22 identificações guardam a fonte oficial',()=>{
 assert.equal(gallery.filter(p=>!p.verified_name).length,0);
 assert.equal(seed.products.filter(p=>p.needsReview).length,0);
 assert.equal(gallery.filter(p=>p.identity_evidence).length,23);
 for(const product of seed.products){
  assert.doesNotMatch(product.name,/Produto Aylag · foto/);
  assert.doesNotMatch(product.description,/Imagem da galeria oficial|O fabricante não informa|Mostre a foto/);
 }
 for(const item of gallery.filter(p=>p.identity_evidence)){
  assert.equal(item.identity_evidence.catalog,'https://heyzine.com/flip-book/7dd8cd6bd5.html');
  assert.ok(item.identity_evidence.label_image.startsWith('https://static.wixstatic.com/'));
  assert.ok(item.identity_evidence.catalog_page>0);
  assert.equal(seed.products.find(p=>p.galleryCode===item.code).name,item.name);
 }
});
test('pedido do antigo S13 usa o nome Sabonete Antisséptico e a apresentação correta',()=>{
 const p=seed.products.find(p=>p.galleryCode==='S13');const text=orderMessage([{product:p,qty:1}]);
 assert.equal(p.name,'Sabonete Antisséptico Aylag 5L');assert.equal(p.volume,'5 litros');
 assert.match(text,/Sabonete Antisséptico/);assert.doesNotMatch(text,/foto S13|Foto para identificação/);
});
test('catálogo salvo recebe identificações sem perder preços, fotos, visibilidade ou exclusões',()=>{
 const original=seed.products.find(p=>p.galleryCode==='S13');
 const legacy={...original,name:'Produto Aylag · foto S13',description:'Imagem da galeria oficial Aylag (S13). O fabricante não informa o nome desta foto em texto. Mostre a foto ou informe o código ao Nildo para confirmar o produto e a apresentação.',volume:'Confirmar com o Nildo',price:3590,images:['https://example.com/foto.jpg'],active:false,featured:true,needsReview:true};
 const saved={products:[legacy],settings:{notice:'Aviso personalizado'}};
 const updated=restoreProductDetails(saved,seed);
 assert.equal(updated.products.length,1);assert.deepEqual(updated.settings,saved.settings);
 assert.deepEqual(updated.products[0],{...legacy,name:original.name,description:original.description,volume:original.volume,needsReview:false});
 assert.equal(saved.products[0].name,legacy.name);
 assert.deepEqual(restoreProductDetails(updated,seed),updated);
});
test('nomes, descrições e apresentações personalizados na gestão são preservados',()=>{
 const original=seed.products.find(p=>p.galleryCode==='S13');
 const custom={...original,name:'Sabonete do Nildo',description:'Descrição editada na gestão.',volume:'Caixa com 4',needsReview:false};
 assert.deepEqual(restoreProductDetails({products:[custom]},seed).products[0],custom);
 const partial={...custom,description:'Imagem da galeria oficial Aylag (S13). O fabricante não informa o nome desta foto em texto.'};
 const repaired=restoreProductDetails({products:[partial]},seed).products[0];
 assert.equal(repaired.name,custom.name);assert.equal(repaired.volume,custom.volume);assert.equal(repaired.description,original.description);
});
