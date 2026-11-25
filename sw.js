const KEY='youjindu-shell-v1';
const BASE=self.registration.scope;
const FILES=['./','./index.html','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(KEY).then(c=>c.addAll(FILES.map(path=>new Request(new URL(path,BASE),{cache:'reload'}))))));
self.addEventListener('message',e=>{if(e.data==='activate')self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('youjindu-shell-')&&k!==KEY).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);if(e.request.method!=='GET'||!u.href.startsWith(BASE))return;
 const asset=FILES.find(p=>new URL(p,BASE).pathname===u.pathname);
 if(e.request.mode==='navigate'){e.respondWith(caches.open(KEY).then(c=>c.match(new URL('./index.html',BASE))).then(r=>r||fetch(e.request)));return;}
 if(asset)e.respondWith(caches.open(KEY).then(c=>c.match(new URL(asset,BASE))).then(r=>r||fetch(e.request)));
});
