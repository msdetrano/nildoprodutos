import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID, createHash, createHmac, timingSafeEqual} from 'node:crypto';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const seedPath=join(ROOT,'data','catalog.json');
const localPath=join(ROOT,'data','catalog.local.json');
const redisURL=()=>process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/,'');
const redisToken=()=>process.env.UPSTASH_REDIS_REST_TOKEN;
export const hasRedis=()=>Boolean(redisURL()&&redisToken());
export const isProduction=()=>process.env.VERCEL==='1'||process.env.NODE_ENV==='production';
export async function redis(...args){
 if(!hasRedis())throw Error('Armazenamento não configurado: defina as variáveis UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN na Vercel.');
 const response=await fetch(redisURL(),{method:'POST',headers:{'Authorization':`Bearer ${redisToken()}`,'Content-Type':'application/json'},body:JSON.stringify(args),cache:'no-store',signal:AbortSignal.timeout(10000)});
 const result=await response.json();
 if(!response.ok||result.error)throw Error('Falha no armazenamento: '+(result.error||response.status));
 return result.result;
}
export async function getCatalog(){
 const seed=JSON.parse(await readFile(seedPath,'utf8'));
 let stored=null;
 if(hasRedis()){stored=await redis('GET','nildo:catalog:v1');if(stored)stored=JSON.parse(stored);}
 else if(existsSync(localPath))stored=JSON.parse(await readFile(localPath,'utf8'));
 const catalog=stored&&Array.isArray(stored.products)?stored:seed;
 if(!catalog.settings)catalog.settings={...seed.settings};
 if(catalog===seed&&process.env.WHATSAPP_NUMBER)catalog.settings.whatsapp=process.env.WHATSAPP_NUMBER.replace(/\D/g,'');
 if(typeof catalog.settings.whatsapp!=='string')catalog.settings.whatsapp=seed.settings.whatsapp||'5514996437437';
 return catalog;
}
export async function saveCatalog(catalog){
 if(hasRedis())return redis('SET','nildo:catalog:v1',JSON.stringify(catalog));
 if(isProduction())throw Error('Edição indisponível: conecte um banco Upstash Redis para persistir os dados na Vercel.');
 await writeFile(localPath,JSON.stringify(catalog,null,2)+'\n');return 'OK';
}
export function json(res,status,data){res.status(status).setHeader('Cache-Control','no-store').setHeader('X-Content-Type-Options','nosniff').json(data);}
export function onlyMethod(req,res,methods){if(!methods.includes(req.method)){res.setHeader('Allow',methods.join(', '));json(res,405,{error:'Método não permitido.'});return false;}return true;}
export function errorJSON(res,e){console.error(e);return json(res,400,{error:e.message||'Não foi possível concluir a operação.'});}
export const tidy=(v,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
const permittedImage=(u)=>/^https:\/\//i.test(u)||/^\/api\/image\?id=[a-f0-9-]{8,40}$/.test(u)||/^\/uploads\/[a-f0-9-]{8,40}\.(jpe?g|png|webp)$/.test(u);
export function cleanProduct(x,id){
 if(!x||typeof x!=='object')throw Error('Produto inválido.');
 const name=tidy(x.name,110),category=tidy(x.category,55),volume=tidy(x.volume,60),description=tidy(x.description,1400);
 if(name.length<2||!category)throw Error('Preencha o nome e a categoria.');
 if(x.price!==null&&(!Number.isSafeInteger(x.price)||x.price<0||x.price>100000000))throw Error('Preço inválido. Utilize reais e centavos.');
 if(!Array.isArray(x.images)||x.images.length>8)throw Error('Informe no máximo oito fotos.');
 const images=[...new Set(x.images.map(u=>tidy(u,1500)).filter(Boolean))];
 if(images.some(u=>!permittedImage(u)))throw Error('Use apenas links HTTPS para as fotos ou arquivos enviados pelo painel.');
 return {id:id||randomUUID(),name,category,volume,description,price:x.price,images,active:x.active!==false,featured:Boolean(x.featured),needsReview:Boolean(x.needsReview)&&/^Produto Aylag · foto /.test(name),source:tidy(x.source||'Cadastro próprio',300)};
}
function safeEq(a,b){return timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());}
const secret=()=>process.env.SESSION_SECRET||'';
const sign=data=>createHmac('sha256',secret()).update(data).digest('base64url');
export function validSession(req){
 if(secret().length<32||!process.env.ADMIN_PASSWORD)return false;
 const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(x=>x.startsWith('nildo_session='))?.slice(14);
 if(!cookie)return false;
 const [payload,mac]=cookie.split('.');if(!payload||!mac||!safeEq(sign(payload),mac))return false;
 try{const data=JSON.parse(Buffer.from(payload,'base64url').toString());return data.role==='admin'&&data.exp>Date.now();}catch{return false;}
}
export function requireAdmin(req,res){if(!validSession(req)){json(res,401,{error:'Acesso restrito. Faça login novamente.'});return false;}return true;}
export function requireSameOrigin(req,res){
 const origin=req.headers.origin;
 if(origin){try{if(new URL(origin).host!==req.headers.host){json(res,403,{error:'Origem da requisição não permitida.'});return false;}}catch{json(res,403,{error:'Origem inválida.'});return false;}}
 return true;
}
const loginHits=new Map();
export async function blockLogin(req){
 const ip=(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'local').split(',')[0].trim().slice(0,80);
 if(hasRedis()){const k='nildo:login:'+createHash('sha256').update(ip).digest('hex');const n=Number(await redis('INCR',k));if(n===1)await redis('EXPIRE',k,900);return n>8;}
 const now=Date.now(),p=loginHits.get(ip)||{at:now,n:0};const latest=now-p.at>900000?{at:now,n:1}:{at:p.at,n:p.n+1};loginHits.set(ip,latest);return latest.n>8;
}
export function passwordValid(value){return Boolean(process.env.ADMIN_PASSWORD&&secret().length>=32&&safeEq(String(value||''),process.env.ADMIN_PASSWORD));}
export function sessionCookie(){const payload=Buffer.from(JSON.stringify({role:'admin',exp:Date.now()+7*86400000})).toString('base64url');return `nildo_session=${payload}.${sign(payload)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=604800${isProduction()?'; Secure':''}`;}
export function logoutCookie(){return `nildo_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${isProduction()?'; Secure':''}`;}
export async function saveImageData(dataUri){
 if(typeof dataUri!=='string')throw Error('Imagem não enviada.');
 const match=/^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/=]+)$/.exec(dataUri);
 if(!match)throw Error('Envie uma foto JPG, PNG ou WebP.');
 const bytes=Buffer.from(match[2],'base64');
 if(bytes.length<100||bytes.length>350000)throw Error('Imagem muito grande: limite de 350 KB após compactação.');
 const id=randomUUID(),extension=match[1]==='jpeg'?'jpg':match[1];
 if(hasRedis()){await redis('SET',`nildo:image:${id}`,dataUri);return `/api/image?id=${id}`;}
 if(isProduction())throw Error('Para enviar fotos em produção, configure o Upstash Redis.');
 const dir=join(ROOT,'public','uploads');await mkdir(dir,{recursive:true});await writeFile(join(dir,`${id}.${extension}`),bytes);return `/uploads/${id}.${extension}`;
}
export async function readImage(id){if(!/^[a-f0-9-]{36}$/.test(id))return null;if(!hasRedis())return null;
 const raw=await redis('GET',`nildo:image:${id}`);if(!raw)return null;
 const m=/^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/=]+)$/.exec(raw);return m?{type:m[1],bytes:Buffer.from(m[2],'base64')}:null;
}
