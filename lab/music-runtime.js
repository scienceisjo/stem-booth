/* HNR Tech Inc. · One immutable music snapshot per opening; sound never blocks the map. */
(function(){
'use strict';
const H=window.HNR;if(!H||H.openingMusic)return;
const audio=new Audio();audio.preload='auto';audio.loop=true;
const silent='data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAAAA==';
let api='/api/music',settingsReady=null,cached=null,active=false,paused=false,muted=false,seq=0,ready=false,volume=.28,current=null;
const M=H.openingMusic={version:'1.0.0',begin,stop,setMuted,setPaused,setVolume,refresh:loadManifest,get active(){return active;},get track(){return current?{version:current.version,url:current.url,enabled:current.enabled}:null;},get playing(){return active&&!audio.paused&&ready;}};
async function json(url){const c=new AbortController(),timer=setTimeout(()=>c.abort(),3500);try{const r=await fetch(url,{cache:'no-store',signal:c.signal});if(!r.ok)throw new Error('unavailable');return await r.json();}finally{clearTimeout(timer);}}
settingsReady=json('lab/music-settings.json').then(s=>{if(typeof s.apiBase==='string'&&s.apiBase.trim())api=new URL(s.apiBase,location.href).href;}).catch(()=>{});
async function loadManifest(){
 await settingsReady;
 try{const m=await json(api);if(typeof m.enabled!=='boolean')return null;const url=m.url?new URL(m.url,api.startsWith('http')?api:location.origin+api).href:null;if(url&&!/^https?:/.test(url))return null;
  cached={enabled:m.enabled,url,version:String(m.version||''),volume:Math.max(0,Math.min(1,Number.isFinite(+m.volume)?+m.volume:.28))};return cached;
 }catch(e){return null;}
}
function coreMuted(){return muted||H.sfx?.isMuted()||H.Q?.nosfx==='1';}
function sync(){audio.muted=!!coreMuted();audio.volume=volume;}
function play(){if(!active||!ready||paused||document.hidden||!H.opening?.active)return;sync();const p=audio.play();if(p&&p.catch)p.catch(()=>{});}
function begin(){
 const token=++seq;active=true;paused=false;ready=false;current=null;audio.pause();audio.src=silent;audio.volume=0;audio.muted=!!coreMuted();
 // Call play in the initiating gesture, before waiting for the network.
 const warm=audio.play();if(warm&&warm.catch)warm.catch(()=>{});
 return loadManifest().then(fresh=>{
  if(token!==seq||!active||!H.opening?.active)return false;
  const m=fresh||cached;if(!m?.enabled||!m.url){audio.pause();return false;}
  current={...m};volume=m.volume;audio.pause();audio.src=m.url;ready=true;sync();play();return true;
 }).catch(()=>false);
}
function stop(){seq++;active=false;ready=false;current=null;audio.pause();audio.removeAttribute('src');audio.load();}
function setMuted(value){muted=!!value;sync();if(!muted)play();}
function setPaused(value){paused=!!value;if(paused)audio.pause();else play();}
function setVolume(value){const v=Number(value);if(Number.isFinite(v))volume=Math.max(0,Math.min(1,v));sync();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.pause();else play();});
document.addEventListener('pointerdown',play,true);document.addEventListener('keydown',play,true);
H.on('opening:end',stop);H.on('tick',()=>{if(active){if(!H.opening?.active)stop();else sync();}});
audio.addEventListener('error',()=>{audio.pause();});
loadManifest();
})();
