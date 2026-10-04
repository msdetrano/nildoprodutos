import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as order from '../public/order.mjs';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const source=(await readFile(new URL('../public/app.js',import.meta.url),'utf8')).replace(/^import .*?;\n/,'const {money,normalize,cartRows,cartSummary,orderMessage,whatsAppURL}=order;\n');
const seed=JSON.parse(await readFile(new URL('../data/catalog.json',import.meta.url),'utf8'));
async function storefront({blockedStorage=false,notice=''}={}){
  const elements=new Map(),errors=[],navigations=[];
  for(const match of html.matchAll(/id="([^"]+)"/g)){
    const classes=new Set();elements.set('#'+match[1],{value:'',textContent:'',innerHTML:'',hidden:false,handlers:{},style:{},classList:{add(x){classes.add(x);},remove(x){classes.delete(x);},contains(x){return classes.has(x);},toggle(x,on){on?classes.add(x):classes.delete(x);}},setAttribute(){},addEventListener(type,fn){this.handlers[type]=fn;},focus(){}});
  }
  const storage={getItem(){if(blockedStorage)throw Error('Storage blocked');return null;},setItem(){if(blockedStorage)throw Error('Storage blocked');}};
  const css={};
  const document={querySelector(s){return elements.get(s)||null;},querySelectorAll(){return [];},addEventListener(){},documentElement:{style:{setProperty(k,v){css[k]=v;}}},body:{style:{},classList:{add(){},remove(){}}}};
  const window={localStorage:storage,sessionStorage:storage,addEventListener(){},location:{assign(url){navigations.push(url);}},open(){throw Error('O WhatsApp não deve abrir duas vezes.');}};
  const context={document,window,localStorage:storage,sessionStorage:storage,navigator:{userAgent:'Test'},console:{error(e){errors.push(e);}},setTimeout(){return 1;},clearTimeout(){},order,fetch:async()=>Response.json({...seed,settings:{...seed.settings,notice}})};
  vm.runInNewContext(source,context);
  await new Promise(resolve=>setImmediate(resolve));
  return {elements,errors,navigations,css};
}
test('catálogo inicia mesmo quando o navegador bloqueia armazenamento local',async()=>{
  const page=await storefront({blockedStorage:true});assert.deepEqual(page.errors,[]);
  assert.equal(page.elements.get('#resultCount').textContent,'62 produtos encontrados');assert.equal(page.css['--base'],'17px');
});
test('aviso salvo na gestão é exibido no catálogo',async()=>{
  const page=await storefront({notice:'Combine a entrega pelo WhatsApp.'});const notice=page.elements.get('#storeNotice');
  assert.equal(notice.hidden,false);assert.equal(notice.textContent,'Combine a entrega pelo WhatsApp.');
});
test('seleção e envio abrem uma única mensagem WhatsApp para o Nildo',async()=>{
  const page=await storefront();const id=seed.products[0].id;
  page.elements.get('#products').handlers.click({target:{closest(selector){return selector==='[data-add]'?{dataset:{add:id}}:null;}}});
  page.elements.get('#floatingCart').onclick();assert.equal(page.elements.get('#sendOrder').disabled,false);
  page.elements.get('#sendOrder').onclick();assert.equal(page.navigations.length,1);
  assert.match(page.navigations[0],/^https:\/\/wa\.me\/5514996437437\?text=/);assert.ok(decodeURIComponent(page.navigations[0]).includes(seed.products[0].name));
});
