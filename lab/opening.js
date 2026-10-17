/* HNR TECH — 32-second interview arrival film. Camera only; activity progress is untouched. */
(function(){
'use strict';
const H=window.HNR;if(!H||H.opening)return;
const scenes=[
 ['overview','2026 서울STEM축제 · 해누리중학교','HNR Tech Inc.','면접 보러 왔는데요?',4],
 ['compass','출발 · 아트리움','면접실은 어느 쪽일까요?','황금나침반에서 출발 안내를 받아 보세요.',3.5],
 ['gate','본 체험 1 · 정문','출입 장치 앞에서','학생 연구원과 에너지스틱을 작동시켜 보세요.',3],
 ['cleanroom','본 체험 2 · 클린룸','잠깐, 손대지 말아 주세요!','빨대를 바꾸며 캔이 움직이기 시작하는 거리를 비교해요.',3],
 ['plasma','본 체험 3 · 암실','형광등에 불을 켜 주세요','전선을 잇지 않고 빛을 켜는 방법을 찾아보세요.',3.5],
 ['tunnel','선택 체험 · 터널','연구소의 작은 열차','코일기차 시연에도 들를 수 있어요.',3],
 ['drop','선택 체험 · 브레이크실','구리관 속 자석','예상하고 관찰하는 전자기브레이크 체험이 기다려요.',3],
 ['memory','면접 · 중앙 제어실','여러분의 첫 작품은 기억회로','1비트 기억회로를 만들고, 8·4·2·1로 숫자를 저장하고 읽어요.',5],
 ['return','면접 보러 가는 길','이제 출발해 볼까요?','현장 이동 순서는 학생 연구원의 안내를 따라 주세요!',3.5]
];
const duration=scenes.reduce((n,s)=>n+s[4],0),starts=[];let acc=0;scenes.forEach(s=>{starts.push(acc);acc+=s[4];});
const O=H.opening={version:'2.0.0',active:false,paused:false,index:0,elapsed:0,time:0,duration,phase:'idle',shots:scenes,start,finish,next,previous,pause,seek,credits:showCredits};
const preference=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=preference.matches,overlay,title,caption,kicker,progress,status,pauseBtn,motionBtn,soundBtn,creditsPanel,hero;
let initial=false,previousFocus=null,savedLock=false,savedExposure=null,savedFog=null,savedClouds=true,clouds=null,savedCamera=null,curvePos=null,curveLook=null,knots=[],lastIndex=-1,creditPaused=false;
const inputBlock={key:()=>true,wheel:()=>{},down:()=>{},move:()=>{},up:()=>{},cancel:()=>{}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function music(method,value){try{const r=H.openingMusic&&H.openingMusic[method]&&H.openingMusic[method](value);if(r&&r.catch)r.catch(()=>{});}catch(e){/* Audio never blocks the map. */}}
function clearInput(){Object.keys(H.input.keys).forEach(k=>H.input.keys[k]=false);H.input.setJoy(0,0);H.player.stop();}
function build(){
 if(overlay)return;
 overlay=document.createElement('section');overlay.id='opening';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','openingTitle');
 overlay.innerHTML='<div class="op-vignette" aria-hidden="true"></div><div class="op-letterbox op-letterbox-top" aria-hidden="true"></div><div class="op-letterbox op-letterbox-bottom" aria-hidden="true"></div><header class="op-top"><div class="op-brand"><img src="lab/cards/hnr-tech-mark.webp" alt="해누리 공식 엠블럼"><span>HNR Tech Inc.</span></div><div class="op-actions"><button class="op-about" type="button">소개·제작진</button><button class="op-sound" type="button">소리 끄기</button><button class="op-skip" type="button">건너뛰기 <kbd>Esc</kbd></button></div></header><div class="op-hero"><img src="lab/cards/hnr-tech-mark.webp" alt=""><p>2026 서울STEM축제 · 해누리중학교</p><strong>HNR Tech Inc.</strong><span>면접 보러 왔는데요?</span></div><div class="op-bottom"><div class="op-caption" aria-live="polite" aria-atomic="true"><p class="op-kicker"></p><h1 id="openingTitle"></h1><p class="op-text"></p></div><div class="op-progress" aria-hidden="true"><i></i></div><nav class="op-controls" aria-label="오프닝 재생"><span class="op-status"></span><button class="op-motion" type="button">동작 줄이기</button><button class="op-prev" type="button" aria-label="이전 장면">이전</button><button class="op-pause" type="button">잠시 멈춤</button><button class="op-next" type="button">다음</button></nav></div><section class="op-credits" hidden aria-label="연구소 소개와 제작진"><div class="op-credits-card"><img src="lab/cards/hnr-tech-mark.webp" alt="해누리 공식 엠블럼"><h2>HNR Tech Inc.</h2><div class="op-welcome"></div><p class="op-teachers"></p><button class="op-credits-close" type="button">오프닝으로 돌아가기</button></div></section>';
 document.body.appendChild(overlay);const q=s=>overlay.querySelector(s);
 title=q('h1');caption=q('.op-text');kicker=q('.op-kicker');progress=q('.op-progress i');status=q('.op-status');pauseBtn=q('.op-pause');motionBtn=q('.op-motion');soundBtn=q('.op-sound');creditsPanel=q('.op-credits');hero=q('.op-hero');
 const welcome=H.story('notice.lines',[]);welcome.forEach(line=>{const p=document.createElement('p');p.textContent=line;q('.op-welcome').appendChild(p);});
 q('.op-teachers').textContent=H.story('notice.credit','지도교사: 남국현(1비트 기억회로 설계), 조승재(프로그램 총괄 기획·제작)');
 q('.op-about').onclick=showCredits;q('.op-credits-close').onclick=hideCredits;q('.op-skip').onclick=()=>finish('skip');
 q('.op-next').onclick=next;q('.op-prev').onclick=previous;pauseBtn.onclick=()=>pause(!O.paused);
 soundBtn.onclick=()=>{H.sfx.mute(!H.sfx.isMuted());music('setMuted',H.sfx.isMuted());syncControls();};
 motionBtn.onclick=()=>{reduced=!reduced;overlay.dataset.reduced=String(reduced);if(reduced)pause(true);pose();syncControls();};
}
function syncControls(){
 const muted=H.sfx.isMuted()||!!(H.Q&&H.Q.nosfx==='1');soundBtn.textContent=muted?'소리 켜기':'소리 끄기';soundBtn.setAttribute('aria-pressed',String(muted));soundBtn.disabled=!!(H.Q&&H.Q.nosfx==='1');
 pauseBtn.textContent=O.paused?'계속 보기':'잠시 멈춤';pauseBtn.setAttribute('aria-pressed',String(O.paused));motionBtn.setAttribute('aria-pressed',String(reduced));motionBtn.textContent=reduced?'동작 줄임':'동작 줄이기';
 overlay.querySelector('.op-prev').disabled=O.index===0;overlay.querySelector('.op-next').textContent=O.index===scenes.length-1?'출발하기':'다음';
 status.textContent=(O.index+1)+' / '+scenes.length+(O.paused?' · 일시정지':'');
}
function installReplay(){
 const host=document.querySelector('#exploreBody');if(!host||document.getElementById('openingReplay'))return;
 const b=document.createElement('button');b.id='openingReplay';b.type='button';b.textContent='연구소 오프닝 다시 보기';b.onclick=()=>{if(start({initial:false})){host.hidden=true;const t=document.getElementById('exploreToggle');if(t)t.setAttribute('aria-expanded','false');}};host.appendChild(b);
}
function makePath(){
 const cameras=H.openingCameras,portrait=innerWidth/innerHeight<.85;
 knots=scenes.map((s,i)=>{const d=cameras[s[0]],p=portrait&&d.portrait?d.portrait:d;return{t:starts[i],p:p.pos.slice(),l:p.look.slice(),f:p.fov||52};});
 // Above-roof approach, then a vertical descent into the exact gameplay view.
 const home=savedCamera;
 knots[knots.length-1]={t:starts[starts.length-1],p:[home.p[0],Math.max(950,home.p[1]+750),home.p[2]],l:home.l.slice(),f:home.f};
 knots.push({t:duration,p:home.p.slice(),l:home.l.slice(),f:home.f});
 curvePos=new THREE.CatmullRomCurve3(knots.map(k=>new THREE.Vector3(...k.p)),false,'centripetal');
 curveLook=new THREE.CatmullRomCurve3(knots.map(k=>new THREE.Vector3(...k.l)),false,'centripetal');
}
function cameraAt(time){
 let i=0;while(i<knots.length-2&&time>=knots[i+1].t)i++;
 const u=clamp((time-knots[i].t)/(knots[i+1].t-knots[i].t),0,1),e=u*.5+u*u*(3-2*u)*.5,k=(i+e)/(knots.length-1);
 if(i===knots.length-2){const a=knots[i],b=knots[i+1],s=u*u*(3-2*u);return{pos:a.p.map((v,j)=>v+(b.p[j]-v)*s),look:a.l.map((v,j)=>v+(b.l[j]-v)*s),fov:a.f+(b.f-a.f)*s};}
 return{pos:curvePos.getPoint(k).toArray(),look:curveLook.getPoint(k).toArray(),fov:knots[i].f+(knots[i+1].f-knots[i].f)*e};
}
function pose(){
 if(!O.active||!curvePos)return;const time=reduced?starts[O.index]:O.time,p=cameraAt(time);H.cam.override(p,{instant:true});
 // tick listeners run after the engine camera, so render this pose in the same frame.
 H.camera.position.set(...p.pos);H.camera.lookAt(...p.look);H.camera.fov=p.fov;H.camera.updateProjectionMatrix();H.camera.updateMatrixWorld();
 const target=O.index===4?.76:1.04;H.fx.setExposure(target);
}
function render(){
 let index=scenes.length-1;for(let i=0;i<scenes.length;i++)if(O.time<starts[i]+scenes[i][4]){index=i;break;}
 O.index=index;O.elapsed=O.time-starts[index];
 if(index!==lastIndex){lastIndex=index;const s=scenes[index];kicker.textContent=s[1];title.textContent=s[2];caption.textContent=s[3];overlay.dataset.scene=s[0];hero.hidden=index!==0;syncControls();}
 progress.style.transform='scaleX('+clamp(O.time/duration,0,1)+')';pose();
}
function seek(time){if(!O.active)return false;O.time=clamp(Number(time)||0,0,duration-.001);render();return true;}
function next(){if(!O.active)return;if(O.index===scenes.length-1)finish('complete');else seek(starts[O.index+1]);}
function previous(){if(O.active)seek(starts[Math.max(0,O.index-1)]);}
function pause(value){if(!O.active)return;O.paused=!!value;music('setPaused',O.paused);syncControls();}
function showCredits(){if(!O.active)return;creditPaused=O.paused;pause(true);creditsPanel.hidden=false;overlay.querySelector('.op-credits-close').focus({preventScroll:true});}
function hideCredits(){if(!O.active)return;creditsPanel.hidden=true;pause(creditPaused);overlay.querySelector('.op-about').focus({preventScroll:true});}
function start(options){
 if(!H.S||!H.camera||O.active||H.ui.isOpen()||H.player.locked||H.cam.isOverride()||(H.sim&&H.sim.active))return false;
 if(!H.openingCameras||scenes.some(s=>!H.openingCameras[s[0]]))return false;build();
 initial=!!(options&&options.initial);previousFocus=document.activeElement;savedLock=H.player.locked;savedExposure=H.fx.override;
 const dir=new THREE.Vector3();H.camera.getWorldDirection(dir);savedCamera={p:H.camera.position.toArray(),l:H.camera.position.clone().addScaledVector(dir,600).toArray(),f:H.camera.fov};
 savedFog=H.scene.fog?{near:H.scene.fog.near,far:H.scene.fog.far}:null;if(savedFog){H.scene.fog.near=13000;H.scene.fog.far=16000;}
 clouds=H.scene.getObjectByName('hnr-clouds');if(clouds){savedClouds=clouds.visible;clouds.visible=false;}
 clearInput();H.player.lock(true);H.input.capture(inputBlock);if(H.voice)H.voice.stop();
 O.active=true;O.paused=reduced;O.phase='playing';O.time=0;O.elapsed=0;lastIndex=-1;overlay.hidden=false;creditsPanel.hidden=true;overlay.dataset.reduced=String(reduced);document.body.classList.add('opening');
 makePath();H.cam.inset(null);render();syncControls();
 music('begin');music('setMuted',H.sfx.isMuted()||!!(H.Q&&H.Q.nosfx==='1'));music('setPaused',O.paused);
 overlay.querySelector('.op-skip').focus({preventScroll:true});H.emit('opening:start',{initial,duration});return true;
}
function finish(reason){
 if(!O.active)return false;O.active=false;O.phase='idle';music('stop');if(H.voice)H.voice.stop();
 overlay.hidden=true;creditsPanel.hidden=true;document.body.classList.remove('opening');clearInput();H.input.capture(null);H.player.lock(savedLock);H.fx.setExposure(savedExposure);H.cam.inset(null);H.cam.override(null,{instant:true});H.cam.snap=true;
 if(savedFog&&H.scene.fog){H.scene.fog.near=savedFog.near;H.scene.fog.far=savedFog.far;}if(clouds)clouds.visible=savedClouds;
 if(initial){H.S.seen.openingViewed=true;H.S.seen.welcome=true;H.state.save();H.emit('welcomed');}
 H.emit('opening:end',{reason:reason||'complete',initial});H.tick(0);
 const focus=previousFocus&&previousFocus.isConnected&&previousFocus.getClientRects().length?previousFocus:document.getElementById('exploreToggle');if(focus)focus.focus({preventScroll:true});return true;
}
H.on('tick',dt=>{if(!O.active||document.hidden)return;if(!O.paused)O.time=Math.min(duration,O.time+dt);if(O.time>=duration){finish('complete');return;}render();});
document.addEventListener('keydown',ev=>{
 if(!O.active||ev.ctrlKey||ev.metaKey||ev.altKey)return;
 if(ev.code==='Tab'){
  const scope=creditsPanel.hidden?overlay:creditsPanel,buttons=[...scope.querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length),first=buttons[0],last=buttons[buttons.length-1];
  if(ev.shiftKey&&document.activeElement===first){last.focus();ev.preventDefault();}else if(!ev.shiftKey&&document.activeElement===last){first.focus();ev.preventDefault();}ev.stopPropagation();return;
 }
 if(ev.code==='Escape'){ev.preventDefault();ev.stopPropagation();if(!creditsPanel.hidden)hideCredits();else finish('skip');return;}
 if(['ArrowRight','ArrowLeft','Space'].includes(ev.code)&&!(ev.code==='Space'&&ev.target.tagName==='BUTTON')){
  ev.preventDefault();ev.stopPropagation();if(ev.repeat||!creditsPanel.hidden)return;if(ev.code==='ArrowRight')next();else if(ev.code==='ArrowLeft')previous();else pause(!O.paused);return;
 }
 if(['Enter','NumpadEnter','Space'].includes(ev.code)&&ev.target.tagName==='BUTTON'){ev.stopPropagation();return;}
 ev.preventDefault();ev.stopPropagation();
},true);
document.addEventListener('visibilitychange',()=>{if(O.active&&document.hidden)pause(true);});
preference.addEventListener('change',ev=>{reduced=ev.matches;if(O.active){overlay.dataset.reduced=String(reduced);if(reduced)pause(true);render();syncControls();}});
H.on('resize',()=>{if(O.active){makePath();render();}});H.on('start',installReplay);
})();
