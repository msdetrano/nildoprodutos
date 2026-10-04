import http from 'node:http';
import {readFile,access} from 'node:fs/promises';
import {join,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEnvFile} from 'node:process';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));process.chdir(root);
try{loadEnvFile(join(root,'.env'));}catch{}
const publicRoot=join(root,'public');const port=Number(process.env.PORT)||3000;
const contentTypes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const handlers={'/api/catalog':'../api/catalog.js','/api/auth':'../api/auth.js','/api/admin/products':'../api/admin/products.js','/api/admin/upload':'../api/admin/upload.js','/api/image':'../api/image.js'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost:'+port);let pathname=decodeURIComponent(url.pathname);
  if(handlers[pathname]){
   const raw=await new Promise((done,reject)=>{const parts=[];let size=0;req.on('data',d=>{size+=d.length;if(size>1300000){reject(Error('Envio maior que o limite de 1,3 MB.'));req.destroy();}else parts.push(d);});req.on('end',()=>done(Buffer.concat(parts).toString()));req.on('error',reject);});
   req.body=raw?JSON.parse(raw):{};req.query=Object.fromEntries(url.searchParams.entries());
   res.status=function(code){this.statusCode=code;return this;};res.json=function(value){this.setHeader('Content-Type','application/json; charset=utf-8');this.end(JSON.stringify(value));return this;};
   return (await import(new URL(handlers[pathname],import.meta.url))).default(req,res);
  }
  if(pathname==='/gestao'||pathname==='/gestao/')pathname='/admin.html';else if(pathname==='/privacidade'||pathname==='/privacidade/')pathname='/privacidade.html';else if(pathname==='/')pathname='/index.html';
  const dest=resolve(publicRoot,'.'+pathname);if(dest!==publicRoot&&!dest.startsWith(publicRoot+sep)){res.writeHead(403).end('Proibido');return;}
  await access(dest);const bytes=await readFile(dest);res.setHeader('Content-Type',contentTypes[extname(dest)]||'application/octet-stream');res.setHeader('Cache-Control',pathname==='/sw.js'?'no-cache':'public, max-age=0');res.writeHead(200).end(bytes);
 }catch(err){console.error(err);if(!res.headersSent)res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Não encontrado.');}
});server.listen(port,()=>console.log(`Catálogo Nildo: http://localhost:${port} | Gestão: http://localhost:${port}/gestao`));
