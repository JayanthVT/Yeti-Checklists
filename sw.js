/* YETI Checklists - offline support.
   Keeps the app files on the tablet so it opens without internet.
   - Page (index.html): network first, so new versions arrive as soon as the tablet is online;
     if there is no signal (or it is very slow) the saved copy is used.
   - Libraries: saved copy first.
   Bump CACHE when the library files in /lib change. */
const CACHE='yeti-app-v1';
const ASSETS=['./','index.html','lib/jspdf.umd.min.js','lib/jspdf.plugin.autotable.min.js'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    e.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      const saved=async()=>(await cache.match(req,{ignoreSearch:true}))||(await cache.match('index.html'))||(await cache.match('./'));
      try{
        const fresh=await Promise.race([
          fetch(req,{cache:'no-cache'}), // always check with the server so new versions are not held back by the browser's HTTP cache
          new Promise((_,rej)=>setTimeout(()=>rej(new Error('slow')),4000))
        ]);
        if(fresh&&fresh.ok){cache.put(req,fresh.clone());return fresh;}
        return (await saved())||fresh;
      }catch(err){
        const s=await saved();
        if(s)return s;
        return fetch(req);
      }
    })());
    return;
  }
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const hit=await cache.match(req);
    if(hit)return hit;
    const res=await fetch(req);
    if(res&&res.ok)cache.put(req,res.clone());
    return res;
  })());
});
