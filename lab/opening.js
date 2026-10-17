/* HNR Tech Inc. — camera-only opening. Never teleports the player or completes experiments. */
(function(){
'use strict';
const H=window.HNR;
if(!H||H.opening)return;
const copy=[
 ['overview','PROJECT ONE · 함께 만든 사람들','HNR Tech Inc.','해누리의 멋진 학생들',14,'credits'],
 ['overview','해누리 연구팀의 초대','몇 달의 준비, 여러분의 발견으로','해누리의 학생들과 선생님이 몇 달 동안 준비한 전기와 자기의 세계에 오신 걸 환영해요. 신기한 실험을 직접 경험하고, 마지막에는 나만의 1비트 기억회로를 만들어 보세요.',13],
 ['overview','PROJECT ONE','연구소를 깨워라','HNR Tech Inc.에 온 걸 환영해요! 축제 직전 정전이 났어요. 전원은 돌아왔지만 시연 라인은 아직 멈춰 있어요.',7],
 ['gate','01 · 정문 보안 게이트','손을 이으면 무슨 일이?','첫 번째는 정문이에요. 에너지스틱이 켜지려면 사람들의 손이 어떻게 이어져야 할까요?',6.5],
 ['cleanroom','02 · 클린룸','손대지 않고 움직여라','클린룸에서는 손대지 않고 캔을 움직여야 해요. 빨대를 바꾸며 캔의 반응을 관찰해 보세요.',6.5],
 ['plasma','03 · 암실','전선 없이 불을 켜라','여기에는 켜진 플라즈마볼과 어두운 형광등이 있어요. 전선을 잇지 않고 형광등에 불을 켤 수 있을까요?',7],
 ['tunnel','04 · 터널 열차 · 황금 나침반','전류가 만드는 움직임','터널에서는 건전지 열차와 황금 나침반을 만나요. 전류를 흘렸을 때 움직임이 어떻게 달라질까요?',7],
 ['drop','05 · 자이로드롭 통로','구리관의 보이지 않는 브레이크','마지막 통로에는 구리관과 자석이 있어요. 자석이 구리관에서 천천히 내려오는 까닭을 찾아 감속 장치를 복구해 주세요.',7],
 ['memory','06 · 중앙 제어실','실험의 발견을, 기억 한 조각으로','마지막에는 1비트 기억회로를 직접 만들어요. 이 작은 모형으로 반도체 메모리가 정보를 저장하는 원리를 만나보세요. 연구소의 마지막 준비 신호도 1로 바꿔 주세요.',12],
 ['return','탐사 준비 완료','이제, 여러분 차례예요','장치를 눌러 관찰하고, 연구 카드의 단서로 다음 길을 열어요. 먼저 정문의 에너지스틱으로 가 볼까요?',8]
];
const O=H.opening={version:'1.1.0',active:false,paused:false,index:0,elapsed:0,phase:'idle',shots:[],start,finish,next,previous,pause};
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let overlay,shade,title,caption,kicker,status,progress,pauseBtn,nextBtn,previousBtn,soundBtn,card,help,credits;
let initial=false,previousFocus=null,savedLock=false,savedExposure=null,savedFog=null,clouds=null,savedClouds=true,transitionTime=0,pendingIndex=0;
const inputBlock={key:()=>true,wheel:()=>{},down:()=>{},move:()=>{},up:()=>{},cancel:()=>{}};
function clearInput(){Object.keys(H.input.keys).forEach(k=>H.input.keys[k]=false);H.input.setJoy(0,0);H.player.stop();}
function build(){
 if(overlay)return;
 overlay=document.createElement('section');overlay.id='opening';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','openingTitle');
 overlay.innerHTML='<div class="op-shade"></div><header class="op-top"><div class="op-brand"><img src="lab/cards/hnr-mark.webp" alt="해누리 마크"><span>HNR Tech Inc.<small>2026 서울STEM축제 · 해누리중학교</small></span></div><button class="op-skip" type="button">건너뛰기</button></header><div class="op-card"><div class="op-progress" aria-hidden="true"></div><div class="op-row"><div class="op-speaker"><canvas width="168" height="168" aria-label="안내 로봇 비트"></canvas><b>안내 로봇 비트</b></div><div class="op-copy"><p class="op-kicker"></p><h1 id="openingTitle"></h1><p class="op-text" aria-live="polite" aria-atomic="true"></p><p class="op-help"></p></div></div><nav class="op-controls" aria-label="오프닝 재생"><span class="op-status"></span><button class="op-prev" type="button" aria-label="이전 장면">이전</button><button class="op-pause" type="button">잠시 멈춤</button><button class="op-next" type="button">다음 장면</button></nav></div>';
 document.body.appendChild(overlay);
 const get=s=>overlay.querySelector(s);
 get('.op-speaker b').textContent='비트';
 const actions=document.createElement('div');actions.className='op-actions';soundBtn=document.createElement('button');soundBtn.type='button';soundBtn.className='op-sound';
 soundBtn.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5 5 9H2v6h3l5 4z"/><path class="op-waves" d="M14 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/><path class="op-slash" d="m15 8 7 8m0-8-7 8"/></svg>';
 actions.append(soundBtn,get('.op-skip'));get('.op-top').appendChild(actions);
 soundBtn.onclick=ev=>{H.sfx.toggle();syncSound();if(H.voice){if(H.sfx.isMuted())H.voice.stop();else{if(H.voice.unlock)H.voice.unlock(ev);H.voice.speak('bit',copy[O.index][3]);}}};
 syncSound();
 shade=get('.op-shade');title=get('h1');caption=get('.op-text');kicker=get('.op-kicker');status=get('.op-status');card=get('.op-card');help=get('.op-help');
 credits=document.createElement('div');credits.className='op-credits';credits.hidden=true;credits.setAttribute('aria-label','제작진');
 credits.innerHTML='<p class="op-team-line">함께 준비하고, 직접 안내하는 해누리 연구팀</p><dl class="op-teachers"><div><dt>대표교사</dt><dd>남국현</dd></div><div><dt>지도교사</dt><dd>조승재</dd></div></dl><dl class="op-makers"><div><dt>1비트 기억회로 설계</dt><dd>남국현</dd></div><div class="op-digital"><dt>디지털 콘텐츠 총괄 기획·개발</dt><dd>조승재<p>연구소 맵 · 과학 시뮬레이터 · 학습 공간 · 교육자료 제작</p></dd></div></dl>';
 card.insertBefore(credits,get('.op-controls'));
 pauseBtn=get('.op-pause');nextBtn=get('.op-next');previousBtn=get('.op-prev');
 get('.op-progress').innerHTML=copy.map(()=>'<span><i></i></span>').join('');progress=Array.from(overlay.querySelectorAll('.op-progress i'));
 get('.op-skip').onclick=()=>finish('skip');pauseBtn.onclick=()=>pause(!O.paused);nextBtn.onclick=next;previousBtn.onclick=previous;
 H.char.portrait(get('canvas'),'bit');
}
function syncSound(){const muted=H.sfx.isMuted();soundBtn.setAttribute('aria-label',muted?'소리 켜기':'소리 끄기');soundBtn.setAttribute('aria-pressed',String(muted));soundBtn.disabled=!!(H.Q&&H.Q.nosfx==='1');}
function installReplay(){
 const host=document.querySelector('#exploreBody');if(!host||document.getElementById('openingReplay'))return;
 const b=document.createElement('button');b.id='openingReplay';b.type='button';b.textContent='연구소 오프닝 다시 보기';b.onclick=()=>{
  if(start({initial:false})){host.hidden=true;const toggle=document.getElementById('exploreToggle');if(toggle)toggle.setAttribute('aria-expanded','false');}
 };host.appendChild(b);
}
function updateInset(){
 if(!O.active)return;
 help.textContent=innerWidth<=640?'바닥 터치로 이동 · 장치 터치로 관찰 · 시점 버튼으로 둘러보기':'WASD / 방향키로 이동 · E 또는 장치 클릭으로 관찰 · V로 시점 바꾸기';
 H.cam.inset(overlay.dataset.credits==='true'?null:{bottom:Math.max(0,card.getBoundingClientRect().height+28-60)});
}
function pose(){
 const shot=O.shots[O.index];if(!shot)return;
 const s=innerWidth/innerHeight<.85&&shot.portrait?shot.portrait:shot;
 const t=reduced.matches?0:Math.min(1,O.elapsed/copy[O.index][4]),e=t*t*(3-2*t);
 const start=s.posStart||s.pos,end=s.posEnd||start,look=s.look;
 let pos=start.map((v,i)=>v+(end[i]-v)*e);
 H.cam.override({pos,look,fov:s.fov||48},{instant:O.phase==='switch'||reduced.matches});
}
function show(index){
 O.index=index;O.elapsed=0;O.phase='switch';
 const c=copy[index];kicker.textContent=c[1];title.textContent=c[2];caption.textContent=c[3];
 const isCredits=c[5]==='credits';overlay.dataset.credits=String(isCredits);credits.hidden=!isCredits;card.scrollTop=0;
 overlay.dataset.last=String(index===copy.length-1);previousBtn.disabled=index===0;nextBtn.textContent=index===copy.length-1?'탐사 시작':'다음 장면';
 if(isCredits)nextBtn.textContent='초대 이야기';
 status.textContent=(index+1)+' / '+copy.length+(O.paused?' · 일시정지':' · 자동 안내');
 updateInset();pose();O.phase='hold';updateProgress();
 if(H.voice)H.voice.speak('bit',c[3]);
}
function updateProgress(){progress.forEach((bar,i)=>bar.style.transform='scaleX('+(i<O.index?1:i===O.index?Math.min(1,O.elapsed/copy[i][4]):0)+')');}
function transition(index){
 if(!O.active||O.phase==='fadeout')return;
 if(index>=copy.length){finish('complete');return;}
 if(index<0)return;
 if(H.voice)H.voice.stop();pendingIndex=index;transitionTime=0;
 if(reduced.matches||O.paused){show(index);shade.style.opacity='0';return;}
 O.phase='fadeout';
}
function next(){transition(O.index+1);}
function previous(){transition(O.index-1);}
function pause(value){
 if(!O.active)return;O.paused=!!value;pauseBtn.textContent=O.paused?'계속 보기':'잠시 멈춤';pauseBtn.setAttribute('aria-pressed',String(O.paused));
 status.textContent=(O.index+1)+' / '+copy.length+(O.paused?' · 일시정지':' · 자동 안내');
 if(O.paused&&H.voice)H.voice.stop();
}
function start(options){
 if(!H.S||!H.camera||O.active||H.ui.isOpen()||H.player.locked||H.cam.isOverride()||(H.sim&&H.sim.active))return false;
 build();
 const cameras=H.openingCameras;if(!cameras||copy.some(c=>!cameras[c[0]]))return false;
 O.shots=copy.map(c=>cameras[c[0]]);initial=!!(options&&options.initial);previousFocus=document.activeElement;savedLock=H.player.locked;savedExposure=H.fx.override;
 savedFog=H.scene.fog?{near:H.scene.fog.near,far:H.scene.fog.far}:null;if(savedFog){H.scene.fog.near=13000;H.scene.fog.far=16000;}
 clouds=H.scene.getObjectByName('hnr-clouds');if(clouds){savedClouds=clouds.visible;clouds.visible=false;}
 clearInput();H.player.lock(true);H.input.capture(inputBlock);H.fx.setExposure(.95);
 O.active=true;O.paused=reduced.matches;overlay.hidden=false;document.body.classList.add('opening');
 show(0);pause(O.paused);syncSound();shade.style.opacity=reduced.matches?'0':'1';O.phase=reduced.matches?'hold':'fadein';transitionTime=0;
 overlay.querySelector('.op-skip').focus({preventScroll:true});
 H.emit('opening:start',{initial});return true;
}
function finish(reason){
 if(!O.active)return false;
 O.active=false;O.phase='idle';if(H.voice)H.voice.stop();
 overlay.hidden=true;document.body.classList.remove('opening');clearInput();H.input.capture(null);H.player.lock(savedLock);H.fx.setExposure(savedExposure);H.cam.inset(null);H.cam.override(null,{instant:true});H.cam.snap=true;
 if(savedFog&&H.scene.fog){H.scene.fog.near=savedFog.near;H.scene.fog.far=savedFog.far;}if(clouds)clouds.visible=savedClouds;
 if(initial){H.S.seen.openingViewed=true;H.S.seen.welcome=true;H.state.save();H.emit('welcomed');}
 H.emit('opening:end',{reason:reason||'complete',initial});
 H.tick(0);const focus=previousFocus&&previousFocus.isConnected&&previousFocus.getClientRects().length?previousFocus:document.getElementById('exploreToggle');if(focus)focus.focus({preventScroll:true});
 return true;
}
H.on('tick',dt=>{
 if(!O.active||document.hidden||O.paused)return;
 if(O.phase==='fadeout'){
  transitionTime+=dt;shade.style.opacity=String(Math.min(1,transitionTime/.28));
  if(transitionTime>=.28){show(pendingIndex);O.phase='fadein';transitionTime=0;shade.style.opacity='1';}
 }else if(O.phase==='fadein'){
  transitionTime+=dt;shade.style.opacity=String(Math.max(0,1-transitionTime/.42));
  if(transitionTime>=.42){O.phase='hold';shade.style.opacity='0';}
 }else if(!O.paused){O.elapsed+=dt;pose();updateProgress();if(O.elapsed>=copy[O.index][4])next();}
});
document.addEventListener('keydown',ev=>{
 if(!O.active||ev.ctrlKey||ev.metaKey||ev.altKey)return;
 if(ev.code==='Tab'){
  const buttons=Array.from(overlay.querySelectorAll('button:not(:disabled)')),first=buttons[0],last=buttons[buttons.length-1];
  if(ev.shiftKey&&document.activeElement===first){last.focus();ev.preventDefault();}else if(!ev.shiftKey&&document.activeElement===last){first.focus();ev.preventDefault();}ev.stopPropagation();return;
 }
 if(ev.code==='Escape'){ev.preventDefault();ev.stopPropagation();finish('skip');return;}
 if(['ArrowRight','ArrowLeft','Space'].includes(ev.code)&&!(ev.code==='Space'&&ev.target.tagName==='BUTTON')){
  ev.preventDefault();ev.stopPropagation();if(ev.repeat)return;if(ev.code==='ArrowRight')next();else if(ev.code==='ArrowLeft')previous();else pause(!O.paused);return;
 }
 // Let Enter/Space activate the focused button; swallow game shortcuts and movement.
 if(['Enter','NumpadEnter','Space'].includes(ev.code)&&ev.target.tagName==='BUTTON'){ev.stopPropagation();return;}
 if(!['Enter','NumpadEnter','Space'].includes(ev.code)){ev.preventDefault();ev.stopPropagation();}
},true);
document.addEventListener('visibilitychange',()=>{if(O.active&&document.hidden)pause(true);});
H.on('resize',()=>{if(O.active){updateInset();pose();}});
H.on('start',installReplay);
})();
