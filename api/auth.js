import {validSession,requireSameOrigin,json,onlyMethod,blockLogin,passwordValid,sessionCookie,logoutCookie} from './_lib.mjs';
export default async function handler(req,res){
 if(!onlyMethod(req,res,['GET','POST','DELETE']))return;
 if(req.method==='GET')return json(res,200,{authenticated:validSession(req)});
 if(!requireSameOrigin(req,res))return;
 if(req.method==='DELETE'){res.setHeader('Set-Cookie',logoutCookie());return json(res,200,{ok:true});}
 try{
  if(await blockLogin(req))return json(res,429,{error:'Muitas tentativas. Tente novamente em 15 minutos.'});
  if(!passwordValid(req.body?.password))return json(res,401,{error:'Senha inválida ou ADMIN_PASSWORD / SESSION_SECRET não configurados.'});
  res.setHeader('Set-Cookie',sessionCookie());return json(res,200,{ok:true});
 }catch(e){console.error(e);return json(res,500,{error:'Falha temporária no acesso.'});}
}
