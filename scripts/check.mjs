import {readdir, readFile, access} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
async function checkDirectory(directory){
  for(const entry of await readdir(join(root,directory),{withFileTypes:true})){
    const path=join(directory,entry.name);
    if(entry.isDirectory())await checkDirectory(path);
    else if(/\.(js|mjs)$/.test(path))execFileSync(process.execPath,['--check',join(root,path)],{stdio:'inherit'});
  }
}
for(const directory of ['api','lib','public','scripts','tests'])await checkDirectory(directory);
for(const name of ['index.html','admin.html','privacidade.html']){
  const html=await readFile(join(root,'public',name),'utf8');
  for(const match of html.matchAll(/(?:src|href)="(\/[^"?#]+)"/g)){
    if(/\.[a-z]+$/i.test(match[1]))await access(join(root,'public',match[1]));
  }
}
const manifest=JSON.parse(await readFile(join(root,'public','manifest.webmanifest'),'utf8'));
for(const icon of manifest.icons)await access(join(root,'public',icon.src));
console.log('Sintaxe, páginas e arquivos do PWA verificados.');
