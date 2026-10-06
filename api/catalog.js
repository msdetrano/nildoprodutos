import {getCatalog,json,onlyMethod} from '../lib/catalog.mjs';
export default async function handler(req,res){
 if(!onlyMethod(req,res,['GET']))return;
 try{const {products,settings}=await getCatalog();return json(res,200,{products:products.filter(p=>p.active&&Number.isSafeInteger(p.price)&&p.price>0),settings});}
 catch(e){console.error(e);return json(res,503,{error:'Catálogo temporariamente indisponível. Tente novamente em instantes.'});}
}
