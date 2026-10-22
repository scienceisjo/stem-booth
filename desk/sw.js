const CACHE = 'hnr-desk-20261021-cloud-v4';
const ASSETS = ['./','./index.html','./receipt.html','./setup.html','./SETUP.sql','./hnr-tech-mark.webp','./festival-art.webp','./manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('hnr-desk-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(new URL('./',self.location).pathname))return;
  if(event.request.mode==='navigate'){
    const relative=url.pathname.slice(new URL('./',self.location).pathname.length);
    const pageKey=!relative||relative==='index.html'?'./index.html':['receipt.html','setup.html'].includes(relative)?'./'+relative:null;
    event.respondWith(fetch(event.request).then(response=>{
      if(response.ok&&pageKey){const saved=response.clone();caches.open(CACHE).then(cache=>cache.put(pageKey,saved));}
      return response;
    }).catch(async()=>pageKey&&(await caches.match(pageKey))||new Response('인터넷 연결 후 다시 열어 주세요.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})));
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
