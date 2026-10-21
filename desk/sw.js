const CACHE = 'hnr-desk-20261021-guest-v3';
const ASSETS = ['./','./index.html','./hnr-tech-mark.webp','./festival-art.webp','./manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('hnr-desk-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL('./',self.location).pathname))return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(response=>{
      if(response.ok){const saved=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',saved));}
      return response;
    }).catch(()=>caches.match('./index.html')));
  }else event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(cached=>cached||fetch(event.request)));
});
self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='CACHE_STATUS'){
    event.waitUntil(caches.open(CACHE).then(async cache=>{
      const all=await Promise.all(ASSETS.map(url=>cache.match(url)));
      if(all.every(Boolean)&&event.source)event.source.postMessage({type:'CACHE_READY'});
    }));
  }
});
