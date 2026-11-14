// First XI offline cache (9e0657ac86). Online, the page comes from the network (so a new version shows on the next
// open) and the cached copy is refreshed; offline, the cached copy. The manifest and icon are cache-first.
const C='first-xi-9e0657ac86',FILES=['first-xi.html','manifest.webmanifest','icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
  const page=e.request.mode==='navigate'||/\.html?(\?|$)/.test(new URL(e.request.url).pathname);
  if(page){e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{if(r&&r.ok){const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));}return r;})
    .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('first-xi.html'))));return;}
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)));});
