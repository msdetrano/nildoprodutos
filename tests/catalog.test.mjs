import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {orderMessage} from '../public/order.mjs';
const seed=JSON.parse(await readFile(new URL('../data/catalog.json',import.meta.url)));
const gallery=JSON.parse(await readFile(new URL('../data/aylag-galleries.json',import.meta.url)));
const hash=u=>(u.match(/8f8890_[a-f0-9]{32}~mv2\.(?:jpg|png)/)||[])[0];
test('as 60 fotos das quatro galerias Aylag estão representadas',()=>{
 assert.equal(gallery.length,60);assert.equal(seed.products.length,62);
 for(const item of gallery)assert.ok(seed.products.some(p=>p.images.some(u=>hash(u)===hash(item.image))),`Foto ausente ${item.code}`);
});
test('as quatro categorias e o número WhatsApp estão configurados',()=>{
 assert.deepEqual(Object.fromEntries([...new Set(seed.products.map(p=>p.category))].map(c=>[c,seed.products.filter(p=>p.category===c).length])),{'Casa & Limpeza':26,'Lavanderia':15,'Automotiva & Profissional':8,'Cosméticos':13});
 assert.equal(seed.settings.whatsapp,'5514996437437');
});
test('22 referências sem texto são explicitamente sinalizadas, sem inventar rótulos',()=>{
 assert.equal(gallery.filter(p=>!p.verified_name).length,22);
 assert.equal(seed.products.filter(p=>p.needsReview).length,22);
});
test('pedido de uma foto sem legenda traz código e URL para identificação',()=>{
 const p=seed.products.find(p=>p.needsReview);const text=orderMessage([{product:p,qty:1}]);
 assert.match(text,/Produto Aylag/);assert.match(text,/Foto para identificação:/);assert.match(text,/wixstatic.com/);
});
