import {requireAdmin,requireSameOrigin,json,onlyMethod,errorJSON,saveImageData} from '../../lib/catalog.mjs';
export default async function handler(req,res){
 if(!onlyMethod(req,res,['POST'])||!requireAdmin(req,res)||!requireSameOrigin(req,res))return;
 try{const url=await saveImageData(req.body?.dataUri);return json(res,201,{url});}catch(e){return errorJSON(res,e);}
}
