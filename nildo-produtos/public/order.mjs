export const money = cents => cents===null||cents===undefined?'Consulte o preço':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
export const normalize = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const cartRows = (cart,products) => Object.entries(cart).map(([id,qty])=>({product:products.find(p=>p.id===id&&p.active),qty:Number(qty)})).filter(x=>x.product&&Number.isSafeInteger(x.qty)&&x.qty>0&&x.qty<=99);
export const cartSummary = rows => ({quantity:rows.reduce((n,r)=>n+r.qty,0),total:rows.reduce((n,r)=>n+(r.product.price||0)*r.qty,0),unknown:rows.some(r=>r.product.price===null)});
export function orderMessage(rows,{name='',note='',store='Nildo'}={}){
 if(!rows.length)throw Error('O pedido está vazio.');
 const {total,unknown}=cartSummary(rows);
 const lines=[`Olá, ${store}! Gostaria de fazer este pedido pelo catálogo:`, ''];
 if(name.trim())lines.push(`Meu nome: ${name.trim().slice(0,80)}`, '');
 for(const [i,{product:p,qty}] of rows.entries()){
   const amount=p.price===null?'Preço a confirmar':`${qty} × ${money(p.price)} = ${money(p.price*qty)}`;
   lines.push(`${i+1}. ${p.name}${p.volume?' ('+p.volume+')':''}`,`   Quantidade: ${qty} | ${amount}`);
   if(p.needsReview&&p.images?.[0])lines.push(`   Foto para identificação: ${p.images[0].split('/v1/')[0]}`);
 }
 lines.push('',unknown?`Subtotal dos produtos com preço: ${money(total)} (demais preços a confirmar)`:`Total estimado: ${money(total)}`,'');
 if(note.trim())lines.push(`Observação: ${note.trim().slice(0,300)}`,'');
 lines.push('Pode confirmar a disponibilidade, o valor final e a forma de entrega/pagamento? Obrigado(a)!');
 return lines.join('\n');
}
export function whatsAppURL(number,text){const digits=String(number||'').replace(/\D/g,'');if(!/^55\d{10,11}$/.test(digits))return null;return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;}
