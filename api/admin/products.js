import {getCatalog,saveCatalog,catalogVersion,requireAdmin,requireSameOrigin,json,onlyMethod,errorJSON,cleanProduct,tidy} from '../../lib/catalog.mjs';
export default async function handler(req,res){
 if(!onlyMethod(req,res,['GET','POST','PUT','DELETE','PATCH']))return;
 if(!requireAdmin(req,res))return;
 if(req.method!=='GET'&&!requireSameOrigin(req,res))return;
 try{
 const catalog=await getCatalog();
 if(req.method==='GET')return json(res,200,{...catalog,version:catalogVersion(catalog)});
 const body=req.body||{};
 if(body.version&&body.version!==catalogVersion(catalog))return json(res,409,{error:'O catálogo mudou em outra sessão. Atualize a página antes de salvar.'});
 if(req.method==='POST'){
  const item=cleanProduct(body.product);if(item.active&&item.sku&&catalog.products.some(p=>p.active&&p.sku===item.sku))return json(res,409,{error:'Já existe um anúncio visível com este código de produto.'});catalog.products.unshift(item);await saveCatalog(catalog);return json(res,201,{product:item});
 }
 if(req.method==='PUT'){
  const index=catalog.products.findIndex(p=>p.id===body.id);if(index<0)return json(res,404,{error:'Produto não encontrado.'});
  const item=cleanProduct({...catalog.products[index],...body.product},body.id);if(item.active&&item.sku&&catalog.products.some(p=>p.id!==item.id&&p.active&&p.sku===item.sku))return json(res,409,{error:'Já existe um anúncio visível com este código de produto.'});catalog.products[index]=item;await saveCatalog(catalog);return json(res,200,{product:item});
 }
 if(req.method==='DELETE'){
  const index=catalog.products.findIndex(p=>p.id===body.id);if(index<0)return json(res,404,{error:'Produto não encontrado.'});
  catalog.products.splice(index,1);await saveCatalog(catalog);return json(res,200,{ok:true});
 }
 if(req.method==='PATCH'){
  const number=tidy(body.settings?.whatsapp||'',25).replace(/\D/g,'');
  if(number&&!(number.length>=12&&number.length<=13&&number.startsWith('55')))return json(res,400,{error:'Informe WhatsApp com DDI 55 e DDD, por exemplo 5511999999999.'});
  catalog.settings.whatsapp=number;
  catalog.settings.notice=tidy(body.settings?.notice||'',240);
  await saveCatalog(catalog);return json(res,200,{settings:catalog.settings});
 }
 }catch(e){return errorJSON(res,e);}
}
