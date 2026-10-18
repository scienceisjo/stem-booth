/* HNR Tech Inc. · Observe a real map apparatus before choosing the next route. */
(function(){
'use strict';
const H=window.HNR;if(!H||H.deviceShow)return;
const copy={
 g1:['에너지스틱 · 사람 회로','손을 이었다가 놓을 때, 불과 소리가 어떻게 달라지는지 살펴보세요.'],
 g2:['클린룸 · 빨대와 캔','문지른 빨대를 천천히 가까이 가져가요. 캔이 움직이는 순간을 살펴보세요.'],
 g3:['암실 · 형광등 켜기','형광등의 긴 옆면이 플라즈마볼에 가까워질 때와 멀어질 때를 비교해 보세요.']
};
const moments={
 g1:{
  connected:{label:'짜잔! 회로 연결',title:'손을 이으니 빛과 소리가 나요!',caption:'전류가 흐를 길이 이어졌어요. 잠시 뒤 손을 놓았을 때와 비교해 보세요.',tone:'cyan',celebrate:true},
  broken:{label:'손을 놓으면?',title:'회로가 끊기니 빛과 소리도 멈춰요',caption:'길이 끊어지면 전류가 흐르지 못해요. 다시 손을 이으면 어떻게 될까요?',tone:'night'}
 },
 g2:{
  approaching:{label:'이제 캔을 보세요',title:'문지른 빨대를 천천히 가까이…',caption:'빨대와 캔은 아직 닿지 않았어요. 캔이 처음 움직이는 순간을 찾아보세요.',tone:'night'},
  moving:{label:'짜잔! 캔이 움직여요',title:'손대지 않았는데 캔이 따라와요!',caption:'대전된 빨대가 가까워지면 캔 안의 전하 분포가 달라져 끌어당기는 힘이 생겨요.',tone:'cyan',celebrate:true}
 },
 g3:{
  lit:{label:'짜잔! 전선 없이 점등',title:'형광등에 노란빛이 켜졌어요!',caption:'가까이 가져가니 빛이 선명해졌어요. 멀어질 때 어떻게 달라지는지도 살펴보세요.',tone:'gold',celebrate:true},
  dim:{label:'멀어지면 어떻게 될까요?',title:'형광등의 빛이 다시 약해져요',caption:'볼에서 멀어질수록 빛이 약해져요. 다시 가까이 가져가며 비교해 보세요.',tone:'night'}
 }
};
let current=null,overlay,title,caption,bar,cancelButton,soundButton,momentLabel,footer,header,audioContext=null,audioJob=null;
const soundAllowed=()=>H.Q?.nosfx!=='1'&&!H.sfx.isMuted()&&!document.hidden;
function primeSound(){
 if(!soundAllowed()||!navigator.userActivation?.hasBeenActive)return;
 try{if(!audioContext){const API=window.AudioContext||window.webkitAudioContext;if(API)audioContext=new API();}if(audioContext?.state==='suspended')audioContext.resume().catch(()=>{});}catch(e){}
}
function stopSound(){
 const job=audioJob;audioJob=null;if(!job)return;
 job.nodes.forEach(({osc,gain})=>{try{gain.gain.cancelScheduledValues(audioContext.currentTime);gain.gain.setValueAtTime(0,audioContext.currentTime);osc.stop();}catch(e){}});
}
function playReveal(s){
 if(!soundAllowed())return;primeSound();if(!audioContext||audioContext.state!=='running'||current!==s)return;
 stopSound();const job=audioJob={nodes:[],end:audioContext.currentTime+1.1};
 const notes=[[523.25,0,.12,.045],[659.25,.09,.14,.045],[783.99,.18,.16,.045],[523.25,.31,.55,.019],[659.25,.31,.55,.019],[783.99,.31,.55,.019],[1046.5,.31,.65,.032]],start=audioContext.currentTime+.015;
 notes.forEach(([freq,delay,duration,level],index)=>{
  const osc=audioContext.createOscillator(),gain=audioContext.createGain(),at=start+delay;
  osc.type=index<3?'triangle':'sine';osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(level,at+.025);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  osc.connect(gain);gain.connect(audioContext.destination);job.nodes.push({osc,gain});
  osc.onended=()=>{osc.disconnect();gain.disconnect();};osc.start(at);osc.stop(at+duration+.025);
 });
}
function syncSoundButton(){if(soundButton){const on=soundAllowed();soundButton.textContent=on?'소리 켜짐':'소리 꺼짐';soundButton.setAttribute('aria-pressed',String(on));soundButton.disabled=H.Q?.nosfx==='1';}}
function reveal(event){
 const s=current,info=s&&event?.id===s.id&&moments[s.id]?.[event.phase];if(!s||s.finished||!info||s.phase===event.phase)return;
 s.phase=event.phase;s.momentElapsed=0;overlay.dataset.phase=event.phase;overlay.dataset.tone=info.tone;
 title.textContent=info.title;caption.textContent=info.caption;momentLabel.textContent=info.label;momentLabel.hidden=false;
 overlay.classList.remove('ds-celebrate');
 if(info.celebrate){void overlay.offsetWidth;overlay.classList.add('ds-celebrate');if(!s.celebrated){s.celebrated=true;playReveal(s);}}
}
H.on('device:moment',reveal);
const inputBlock={key:()=>true,wheel:()=>{},down:()=>{},move:()=>{},up:()=>{},cancel:()=>{}};
const D=H.deviceShow={version:'1.1.0',play,cancel,get soundActive(){return !!audioJob;},get active(){return !!current;},get id(){return current?.id||null;}};
function build(){
 if(overlay)return;
 overlay=document.createElement('section');overlay.id='deviceShow';overlay.hidden=true;
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','deviceShowTitle');overlay.setAttribute('aria-describedby','deviceShowCaption');
 overlay.innerHTML='<header class="ds-header"><div class="ds-brand"><img src="lab/cards/hnr-tech-mark.webp" width="40" height="40" alt="해누리 공식 엠블럼"><span>HNR Tech Inc.</span></div><div class="ds-controls"><button type="button" class="ds-sound" aria-pressed="true">소리 켜짐</button><button type="button" class="ds-cancel">그만 보기 <kbd>Esc</kbd></button></div></header><div class="ds-aura" aria-hidden="true"></div><p class="ds-moment" role="status" hidden></p><div class="ds-footer"><div class="ds-copy"><p class="ds-eyebrow">장치 작동 관찰</p><h2 id="deviceShowTitle"></h2><p id="deviceShowCaption"></p></div><div class="ds-progress" aria-hidden="true"><i></i></div><p class="ds-status" role="status">시연이 끝나면 다음 안내로 이어져요.</p></div>';
 document.body.appendChild(overlay);title=overlay.querySelector('h2');caption=overlay.querySelector('#deviceShowCaption');bar=overlay.querySelector('.ds-progress i');cancelButton=overlay.querySelector('.ds-cancel');soundButton=overlay.querySelector('.ds-sound');momentLabel=overlay.querySelector('.ds-moment');footer=overlay.querySelector('.ds-footer');header=overlay.querySelector('.ds-header');
 cancelButton.onclick=()=>cancel('button');soundButton.onclick=()=>{H.sfx.mute(!H.sfx.isMuted());if(!soundAllowed())stopSound();else primeSound();syncSoundButton();};
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
 if(current!==s||s.finished)return false;s.finished=true;current=null;stopSound();
 overlay.classList.remove('ds-celebrate');delete overlay.dataset.phase;delete overlay.dataset.tone;momentLabel.hidden=true;momentLabel.textContent='';
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
 const s={id,driver,promise,resolve,elapsed:0,momentElapsed:0,phase:'',celebrated:false,finished:false,locked:H.player.locked,input:H.input.captured,focus:document.activeElement,cruise:H.cruise,cruisePaused:false,camera:{position:H.camera.position.clone(),quaternion:H.camera.quaternion.clone(),fov:H.camera.fov}};
 current=s;
 try{
  H.mouseLook?.release();stopMovement();H.player.lock(true);H.input.capture(inputBlock);H.voice?.stop();
  if(s.cruise?.enabled&&!s.cruise.paused){s.cruise.pause();s.cruisePaused=true;}
  primeSound();syncSoundButton();overlay.classList.remove('ds-celebrate');delete overlay.dataset.phase;delete overlay.dataset.tone;momentLabel.hidden=true;momentLabel.textContent='';
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
 s.elapsed+=Math.max(0,Math.min(.1,Number(dt)||0));s.momentElapsed+=Math.max(0,Math.min(.1,Number(dt)||0));
 if(s.momentElapsed>1.6)overlay.classList.remove('ds-celebrate');
 if(audioJob&&(!soundAllowed()||audioContext.currentTime>=audioJob.end))stopSound();syncSoundButton();
 const duration=Number(s.driver.duration)||15;bar.style.transform='scaleX('+Math.min(.98,s.elapsed/duration)+')';
 if(s.elapsed>Math.max(40,duration*2+8)){finish(s,false,'timeout');H.ui.toast('장치 시연을 다시 시작해 주세요.',{ms:3000});}
});
H.on('resize',pose);H.on('sim:enter',()=>cancel('sim-enter'));H.on('opening:start',()=>cancel('opening-start'));
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel('hidden');});window.addEventListener('pagehide',()=>cancel('pagehide'));
document.addEventListener('keydown',event=>{
 if(!current||event.ctrlKey||event.metaKey||event.altKey)return;
 if(event.code==='Escape'){event.preventDefault();event.stopPropagation();cancel('escape');return;}
 if(event.code==='Tab'){event.preventDefault();event.stopPropagation();const controls=soundButton.disabled?[cancelButton]:[soundButton,cancelButton];const i=controls.indexOf(document.activeElement);controls[(i+(event.shiftKey?-1:1)+controls.length)%controls.length].focus({preventScroll:true});return;}
 if((event.code==='Enter'||event.code==='Space'||event.code==='NumpadEnter')&&(event.target===cancelButton||event.target===soundButton)){event.stopPropagation();return;}
 event.preventDefault();event.stopPropagation();
},true);
})();
