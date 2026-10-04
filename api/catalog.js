import {getCatalog,json,onlyMethod,errorJSON} from '../lib/catalog.mjs';
export default async function handler(req,res){
 if(!onlyMethod(req,res,['GET']))return;
 try{const {products,settings}=await getCatalog();return json(res,200,{products:products.filter(p=>p.active),settings});}
 catch(e){return errorJSON(res,e);}
}
