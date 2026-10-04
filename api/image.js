import {readImage,json,onlyMethod} from './_lib.mjs';
export default async function handler(req,res){
 if(!onlyMethod(req,res,['GET']))return;
 try{const data=await readImage(String(req.query?.id||''));if(!data)return json(res,404,{error:'Foto não encontrada.'});
  res.status(200).setHeader('Content-Type',`image/${data.type}`).setHeader('Cache-Control','public, max-age=86400, s-maxage=86400').setHeader('X-Content-Type-Options','nosniff').end(data.bytes);
 }catch{json(res,500,{error:'Não foi possível carregar a foto.'});}
}
