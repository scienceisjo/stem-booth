/* HNR Tech Inc. · Observe a real map apparatus before choosing the next route. */
(function(){
'use strict';
const H=window.HNR;if(!H||H.deviceShow)return;
const copy={
 g1:['에너지스틱 · 사람 회로','손을 이었다가 놓을 때, 불과 소리가 어떻게 달라지는지 살펴보세요.'],
 g2:['클린룸 · 빨대와 캔','문지른 빨대를 천천히 가까이 가져가요. 캔이 움직이는 순간을 살펴보세요.'],
 g3:['암실 · 형광등 켜기','형광등의 긴 옆면이 플라즈마볼에 가까워질 때와 멀어질 때를 비교해 보세요.']
};
let current=null,overlay,title,caption,bar,cancelButton,footer,header;
const inputBlock={key:()=>true,wheel:()=>{},down:()=>{},move:()=>{},up:()=>{},cancel:()=>{}};
const D=H.deviceShow={version:'1.0.0',play,cancel,get active(){return !!current;},get id(){return current?.id||null;}};
function build(){
 if(overlay)return;
 overlay=document.createElement('section');overlay.id='deviceShow';overlay.hidden=true;
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','deviceShowTitle');overlay.setAttribute('aria-describedby','deviceShowCaption');
 overlay.innerHTML='<header class="ds-header"><div class="ds-brand"><img src="lab/cards/hnr-tech-mark.webp" width="40" height="40" alt="해누리 공식 엠블럼"><span>HNR Tech Inc.</span></div><button type="button" class="ds-cancel">그만 보기 <kbd>Esc</kbd></button></header><div class="ds-footer"><div class="ds-copy"><p class="ds-eyebrow">장치 작동 관찰</p><h2 id="deviceShowTitle"></h2><p id="deviceShowCaption"></p></div><div class="ds-progress" aria-hidden="true"><i></i></div><p class="ds-status" role="status">시연이 끝나면 다음 안내로 이어져요.</p></div>';
 document.body.appendChild(overlay);title=overlay.querySelector('h2');caption=overlay.querySelector('#deviceShowCaption');bar=overlay.querySelector('.ds-progress i');cancelButton=overlay.querySelector('button');footer=overlay.querySelector('.ds-footer');header=overlay.querySelector('.ds-header');
 cancelButton.onclick=()=>cancel('button');
 overlay.addEventListener('keyup',event=>event.stopPropagation());
}
function driverFor(id){
 if(id==='g3'){
  const ctx=H.sim?.ctxOf(id),device=ctx?.device;
  if(!device||typeof device.demo!=='function'||typeof device.stopDemo!=='function')return null;
  return{start:()=>device.demo(),stop:()=>device.stopDemo(),duration:device.demoDuration,view:device.demoView||ctx.def.camera,root:ctx.root};
 }
 const device=H.missionWorld?.apparatus[id];
 if(!device||typeof device.activate!=='function'||typeof device.stop!=='function')return null;
 return{start:()=>device.activate(),stop:()=>device.stop(),duration:device.duration,view:device.view,root:device.root};
}
function stopMovement(){
 H.player.stop();H.input.setJoy(0,0);Object.keys(H.input.keys).forEach(key=>H.input.keys[key]=false);
}
function pose(){
 const s=current;if(!s)return;
 const view=s.driver.view||{pos:[330,370,760],look:[0,125,0],fov:48};
 const position=new THREE.Vector3(...view.pos),look=new THREE.Vector3(...view.look),aspect=innerWidth/Math.max(1,innerHeight),baseFov=view.fov||48;
 let fov=baseFov;
 if(aspect<1){
  // Widen the vertical field while keeping the apparatus large on a portrait screen.
  fov=Math.min(82,baseFov+22);
  const distance=Math.max(1,.8/Math.max(.35,aspect)*Math.tan(baseFov*Math.PI/360)/Math.tan(fov*Math.PI/360));
  position.sub(look).multiplyScalar(distance).add(look);
 }
 s.driver.root.updateMatrixWorld(true);s.driver.root.localToWorld(position);s.driver.root.localToWorld(look);
 const p={pos:position,look,fov};H.cam.override(p,{instant:true});
 H.cam.inset({bottom:Math.max(0,footer.getBoundingClientRect().height-header.getBoundingClientRect().height+8)});
 // The engine emits tick after updating its camera; keep this fixed pose visible immediately.
 H.camera.position.copy(position);H.camera.lookAt(look);H.camera.fov=fov;H.camera.updateProjectionMatrix();H.camera.updateMatrixWorld();
}
function finish(s,completed,reason){
 if(current!==s||s.finished)return false;s.finished=true;current=null;
 if(!completed){try{s.driver.stop();}catch(error){console.warn('[HNR.deviceShow] 장치 정지 실패',error);}}
 const ownsInput=H.input.captured===inputBlock;
 overlay.hidden=true;document.body.classList.remove('device-showing');stopMovement();
 // A separately opened simulator may already own the camera/input. Do not undo that takeover.
 if(ownsInput){
  H.input.capture(s.input);H.player.lock(s.locked);H.cam.override(null,{instant:true});H.cam.inset(null);H.cam.snap=true;
  H.camera.position.copy(s.camera.position);H.camera.quaternion.copy(s.camera.quaternion);H.camera.fov=s.camera.fov;H.camera.updateProjectionMatrix();H.camera.updateMatrixWorld();
 }
 if(s.cruisePaused&&H.cruise===s.cruise&&s.cruise.enabled&&s.cruise.paused)s.cruise.pause();
 if(ownsInput&&!document.hidden&&!H.ui.isOpen()){
  const focus=s.focus?.isConnected&&s.focus.getClientRects().length?s.focus:H.renderer?.domElement;
  if(focus){if(focus===H.renderer?.domElement)focus.tabIndex=-1;focus.focus({preventScroll:true});}
 }
 H.emit('device-show:end',{id:s.id,completed:!!completed,reason});s.resolve(!!completed);return true;
}
function cancel(reason){return current?finish(current,false,reason||'cancel'):false;}
function play(id){
 if(current)return current.id===id?current.promise:Promise.resolve(false);
 if(!copy[id]||!H.S||!H.camera||H.ui.isOpen()||H.cam.isOverride()||H.input.captured||H.sim?.active||H.opening?.active||H.cruise?.traveling||document.hidden)return Promise.resolve(false);
 const driver=driverFor(id);if(!driver||!driver.root)return Promise.resolve(false);
 build();let resolve;const promise=new Promise(done=>resolve=done);
 const s={id,driver,promise,resolve,elapsed:0,finished:false,locked:H.player.locked,input:H.input.captured,focus:document.activeElement,cruise:H.cruise,cruisePaused:false,camera:{position:H.camera.position.clone(),quaternion:H.camera.quaternion.clone(),fov:H.camera.fov}};
 current=s;
 try{
  H.mouseLook?.release();stopMovement();H.player.lock(true);H.input.capture(inputBlock);H.voice?.stop();
  if(s.cruise?.enabled&&!s.cruise.paused){s.cruise.pause();s.cruisePaused=true;}
  title.textContent=copy[id][0];caption.textContent=copy[id][1];bar.style.transform='scaleX(0)';overlay.dataset.device=id;overlay.hidden=false;document.body.classList.add('device-showing');
  pose();cancelButton.focus({preventScroll:true});H.emit('device-show:start',{id,duration:driver.duration});
  const result=driver.start();
  // Only the device's own completion promise can mark a viewing complete; no elapsed-time shortcut.
  if(!result||typeof result.then!=='function')throw new Error('장치의 완료 신호가 없습니다.');
  Promise.resolve(result).then(ok=>finish(s,ok===true,ok===true?'complete':'device-stop'),error=>{
   if(current!==s)return;console.warn('[HNR.deviceShow] 시연 실패',error);finish(s,false,'error');H.ui.toast('장치 시연을 다시 시작해 주세요.',{ms:3000});
  });
 }catch(error){console.warn('[HNR.deviceShow] 시작 실패',error);finish(s,false,'error');H.ui.toast('장치 시연을 다시 시작해 주세요.',{ms:3000});}
 return promise;
}
H.on('tick',dt=>{
 const s=current;if(!s)return;
 if(H.input.captured!==inputBlock){finish(s,false,'input-change');return;}
 s.elapsed+=Math.max(0,Math.min(.1,Number(dt)||0));
 const duration=Number(s.driver.duration)||15;bar.style.transform='scaleX('+Math.min(.98,s.elapsed/duration)+')';
 if(s.elapsed>Math.max(40,duration*2+8)){finish(s,false,'timeout');H.ui.toast('장치 시연을 다시 시작해 주세요.',{ms:3000});}
});
H.on('resize',pose);H.on('sim:enter',()=>cancel('sim-enter'));H.on('opening:start',()=>cancel('opening-start'));
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel('hidden');});window.addEventListener('pagehide',()=>cancel('pagehide'));
document.addEventListener('keydown',event=>{
 if(!current||event.ctrlKey||event.metaKey||event.altKey)return;
 if(event.code==='Escape'){event.preventDefault();event.stopPropagation();cancel('escape');return;}
 if(event.code==='Tab'){event.preventDefault();event.stopPropagation();cancelButton.focus({preventScroll:true});return;}
 if((event.code==='Enter'||event.code==='Space'||event.code==='NumpadEnter')&&event.target===cancelButton){event.stopPropagation();return;}
 event.preventDefault();event.stopPropagation();
},true);
})();
