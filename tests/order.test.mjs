import {test} from 'node:test';import assert from 'node:assert/strict';
import {money,cartRows,cartSummary,normalize,orderMessage,whatsAppURL} from '../public/order.mjs';
const products=[{id:'a',name:'Amaciante Azul',volume:'2 litros',price:1290,active:true},{id:'b',name:'Desinfetante Algas',volume:'2 litros',price:null,active:true},{id:'c',name:'Oculto',price:100,active:false}];
test('moeda brasileira e preço indefinido',()=>{assert.equal(money(1290),'R$ 12,90');assert.equal(money(null),'Consulte o preço');});
test('busca tolera acentuação',()=>assert.equal(normalize('ÁGUA SANITÁRIA'),'agua sanitaria'));
test('carrinho ignora produtos ocultos ou ausentes e soma centavos',()=>{const rows=cartRows({a:2,b:1,c:3,z:2},products);assert.equal(rows.length,2);assert.deepEqual(cartSummary(rows),{quantity:3,total:2580,unknown:true});});
test('mensagem WhatsApp inclui itens, preços indefinidos e observação',()=>{const rows=cartRows({a:2,b:1},products),msg=orderMessage(rows,{name:'Maria',note:'Retirada na sexta'});assert.match(msg,/Amaciante Azul/);assert.match(msg,/R\$\s?25,80/);assert.match(msg,/Preço a confirmar/);assert.match(msg,/Maria/);assert.match(msg,/Retirada na sexta/);});
test('URL só funciona com DDI e telefone brasileiro',()=>{assert.equal(whatsAppURL('1234','texto'),null);assert.match(whatsAppURL('55 (11) 99999-9999','olá'),/^https:\/\/wa\.me\/5511999999999\?text=/);});

test('número de WhatsApp do Nildo gera link correto',()=>assert.match(whatsAppURL('+55 (14) 99643-7437','Pedido do catálogo'),/^https:\/\/wa\.me\/5514996437437\?text=/));
