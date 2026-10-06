// Integrity check only. Source of truth: data/catalog.json and data/aylag-galleries.json.
import {readFile} from 'node:fs/promises';
const catalog=JSON.parse(await readFile(new URL('../data/catalog.json',import.meta.url),'utf8'));
const gallery=JSON.parse(await readFile(new URL('../data/aylag-galleries.json',import.meta.url),'utf8'));
const photoKey=url=>(url.match(/8f8890_[a-f0-9]{32}~mv2\.(?:jpg|png)/)||[])[0];
const missing=gallery.filter(g=>!catalog.products.some(p=>p.images.includes(g.local_image)));
const cat=Object.fromEntries([...new Set(gallery.map(g=>g.category))].map(c=>[c,gallery.filter(g=>g.category===c).length]));
console.log(JSON.stringify({galleryPhotos:gallery.length,categories:cat,unnamed:gallery.filter(g=>!g.verified_name).length,products:catalog.products.length,missing:missing.map(g=>g.code)},null,2));
const provisional=catalog.products.filter(p=>p.needsReview||/^Produto Aylag · foto /.test(p.name)||/^Imagem da galeria oficial Aylag/.test(p.description));
if(missing.length||gallery.length!==60||catalog.products.length!==62||gallery.some(g=>!g.verified_name)||provisional.length)process.exitCode=1;
