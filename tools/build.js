// Bundles src/ + data/world.json into one self-contained first-xi.html
// node tools/build.js [out.html] [world.json]
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..'),out=process.argv[2]||path.join(root,'dist','first-xi.html');
const css=fs.readFileSync(path.join(root,'src/styles.css'),'utf8');
const js=fs.readdirSync(path.join(root,'src/js')).filter(f=>f.endsWith('.js')).sort().map(f=>fs.readFileSync(path.join(root,'src/js',f),'utf8')).join('\n');
const data=fs.readFileSync(process.argv[3]||path.join(root,'data/world.json'),'utf8').trim().replace(/<\//g,'<\\/');
let t=fs.readFileSync(path.join(root,'src/template.html'),'utf8');
t=t.replace('/*@@CSS@@*/',()=>css).replace('/*@@DATA@@*/',()=>'const WORLD='+data+';').replace('/*@@JS@@*/',()=>js);
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,t);
// For hosting (GitHub Pages etc.): manifest, icon and an offline service worker next to the page.
// They are only used when the page is served over http(s); opening the file from disk ignores them.
const dir=path.dirname(out),page=path.basename(out),ver=require('crypto').createHash('sha1').update(t).digest('hex').slice(0,10);
fs.writeFileSync(path.join(dir,'manifest.webmanifest'),JSON.stringify({name:'First XI Cricket',short_name:'First XI',start_url:page,display:'standalone',
  background_color:'#0a0e1a',theme_color:'#0f172a',icons:[{src:'icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any maskable'}]},null,1));
fs.writeFileSync(path.join(dir,'icon.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#0a0e1a"/><circle cx="256" cy="256" r="150" fill="#b91c1c"/><path d="M150 180q106 76 212 0M150 332q106-76 212 0" stroke="#fde2e2" stroke-width="10" fill="none" stroke-dasharray="18 14"/><text x="256" y="470" font-family="system-ui,sans-serif" font-size="64" font-weight="800" fill="#06b6d4" text-anchor="middle">FIRST XI</text></svg>');
fs.writeFileSync(path.join(dir,'sw.js'),`// First XI offline cache (${ver}) - cache-first for the page, manifest and icon.
const C='first-xi-${ver}',FILES=['${page}','manifest.webmanifest','icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)));});
`);
console.log('built',out,Math.round(t.length/1024)+'KB');
