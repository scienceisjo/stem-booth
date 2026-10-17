/* HNR Tech Inc. · Guided movement follows the main journey, never confirms real activities. */
(function(){
'use strict';
const H=window.HNR,KEY='hnr.lab.cruise',reduced=matchMedia('(prefers-reduced-motion: reduce)');
const C=H.cruise={version:'2.0.0',enabled:false,paused:false,traveling:false,working:false,arrived:null,target:nextStage,setEnabled,pause,go:goNow,act,choose:()=>false};
let panel,toggle,title,detail,primary,pauseBtn,clock=0,stable=0,lastKey='',paintKey='',failed='',endingSeen=false;
function busy(){return H.ui.isOpen()||H.player.locked||!!H.sim.active||!!H.opening?.active||H.cam.isOverride()||!!H.input.captured||!!H.journey?.busy;}
function observing(){return Object.values(H.missionWorld?.apparatus||{}).some(r=>r.running);}
function nextStage(){
 if(!H.S||!H.journey?.nextTarget)return null;
 const t=H.journey.nextTarget();if(!t||!Number.isFinite(t.x)||!Number.isFinite(t.z))return null;
 if(t.kind==='ending'&&endingSeen)return null;
 return{key:String(t.id),id:t.id,kind:t.kind||'activity',n:t.n,point:{x:t.x,z:t.z,yaw:t.yaw||0},title:t.label||'다음 본 체험',action:t.action};
}
function at(s){return s&&C.arrived===s.key&&Math.hypot(H.player.x-s.point.x,H.player.z-s.point.z)<180;}
function resetClock(){stable=0;lastKey='';paintKey='';}
function stopInput(){H.player.stop();H.input.setJoy(0,0);Object.keys(H.input.keys).forEach(k=>H.input.keys[k]=false);}
function setEnabled(value){
 C.enabled=!!value;C.paused=false;failed='';C.arrived=null;resetClock();
 try{localStorage.setItem(KEY,C.enabled?'1':'0');}catch(e){}
 document.body.classList.toggle('cruising',C.enabled);
 if(C.enabled){stopInput();H.hud.hideHint();}
 render();return C.enabled;
}
function pause(){C.paused=!C.paused;resetClock();render();}
async function travel(s){
 if(!C.enabled||C.traveling||C.working||busy()||observing()||!s||nextStage()?.key!==s.key)return false;
 const p=H.world.nearest(s.point.x,s.point.z);
 if(!p||!H.world.allowed(p.x,p.z)||Math.hypot(p.x-s.point.x,p.z-s.point.z)>180){failed=s.key;render();return false;}
 C.traveling=true;stopInput();render();
 try{
  await H.ui.fade(reduced.matches?0:180,'out');
  if(!C.enabled||nextStage()?.key!==s.key||H.sim.active||H.opening?.active||H.player.locked||H.journey?.busy)return false;
  H.player.teleport(p.x,p.z,s.point.yaw);H.cam.snap=true;C.arrived=s.key;failed='';H.emit('cruise:arrive',{kind:s.kind,n:s.n,id:s.id});return true;
 }finally{await H.ui.fade(reduced.matches?0:200,'in');C.traveling=false;resetClock();render();}
}
function goNow(){const s=nextStage();failed='';return travel(s);}
async function run(action){
 if(!C.enabled||C.working||C.traveling||busy()||observing())return false;
 C.working=true;render();
 try{return await action();}catch(e){console.error('[HNR.cruise]',e);H.ui.toast('안내를 다시 눌러 주세요.',{ms:2500});return false;}
 finally{C.working=false;resetClock();render();}
}
function act(){
 const s=nextStage();if(!s)return false;if(!at(s))return goNow();
 return run(async()=>{
  const r=typeof s.action==='function'?await s.action():await H.journey.open(s.id);
  if(s.kind==='ending'){endingSeen=true;setEnabled(false);}
  return r;
 });
}
function render(){
 if(!panel)return;
 toggle.textContent=C.enabled?'크루즈 켜짐':'크루즈 모드';toggle.setAttribute('aria-pressed',String(C.enabled));
 const s=nextStage(),blocked=busy()||C.working||C.traveling;
 panel.hidden=!C.enabled||blocked||!s;toggle.disabled=C.traveling||C.working;
 if(!s)return;
 const running=observing(),arrived=at(s),p=H.journey.mainProgress?.()||{done:0,total:6};
 const key=[s.key,s.title,s.action,arrived,C.paused,failed,blocked,running,p.done].join('|');if(key===paintKey)return;paintKey=key;
 title.textContent=s.title;
 panel.querySelector('.cruise-progress').textContent='본 체험 '+p.done+' / '+p.total;
 detail.textContent=failed===s.key?'이동 지점을 확인할 수 없어요. 다시 이동을 누르거나 직접 이동해 주세요.':!arrived?(C.paused?'자동 이동을 멈췄어요. 다음 장소로 이동 버튼은 사용할 수 있어요.':'비트가 다음 본 체험 장소로 안내해요.'):
 running?'장치가 움직이고 있어요. 관찰이 끝나면 활동 안내를 열어 보세요.':s.kind==='ending'?'기억회로 제작과 숫자 저장·읽기 기록을 확인해요.':'활동 안내를 열고 학생 연구원의 설명에 따라 체험해 주세요.';
 primary.disabled=running;primary.textContent=running?'관찰 중…':!arrived?'다음 장소로 이동':typeof s.action==='string'?s.action:s.kind==='ending'?'완료 기록 보기':'활동 안내 열기';
 pauseBtn.textContent=C.paused?'자동 이동 계속':'자동 이동 멈춤';pauseBtn.setAttribute('aria-pressed',String(C.paused));
}
function install(){
 if(panel)return;
 const host=document.getElementById('exploreTools');if(!host)return;
 toggle=document.createElement('button');toggle.type='button';toggle.id='cruiseToggle';toggle.setAttribute('aria-controls','cruisePanel');toggle.onclick=()=>setEnabled(!C.enabled);host.prepend(toggle);
 panel=document.createElement('section');panel.id='cruisePanel';panel.hidden=true;panel.setAttribute('aria-label','비트의 크루즈 안내');
 panel.innerHTML='<div class="cruise-heading"><span>HNR Tech Inc. · 비트의 크루즈</span><button class="cruise-off" type="button">직접 이동</button></div><h2></h2><p class="cruise-detail" aria-live="polite"></p><div class="cruise-actions"><button class="cruise-primary" type="button">다음 장소로 이동</button></div><div class="cruise-foot"><span class="cruise-progress">본 체험 0 / 6</span><button class="cruise-pause" type="button">자동 이동 멈춤</button></div>';
 document.body.appendChild(panel);title=panel.querySelector('h2');detail=panel.querySelector('.cruise-detail');primary=panel.querySelector('.cruise-primary');pauseBtn=panel.querySelector('.cruise-pause');
 primary.onclick=act;pauseBtn.onclick=pause;panel.querySelector('.cruise-off').onclick=()=>setEnabled(false);
 let saved=false;try{saved=localStorage.getItem(KEY)==='1';}catch(e){}
 C.enabled=H.Q.cruise==='1'||saved;document.body.classList.toggle('cruising',C.enabled);render();
}
H.on('start',install);
H.on('state',()=>{failed='';resetClock();render();});
H.on('opening:start',resetClock);H.on('opening:end',resetClock);H.on('sim:enter',render);H.on('sim:exit',()=>{resetClock();render();});
H.on('tick',dt=>{
 if(!C.enabled||!panel||document.hidden)return;
 if(busy()||observing()||C.working||C.traveling){stable=0;render();return;}
 const s=nextStage();if(!s){const p=H.journey?.mainProgress?.();if(p&&p.done>=p.total&&p.total>0){setEnabled(false);H.ui.toast('본 체험을 마쳤어요. 이제 연구소를 자유롭게 둘러보세요.',{ms:3500});}return;}
 if(s.key!==lastKey){lastKey=s.key;stable=0;}else stable+=dt;
 clock+=dt;if(clock>.15){clock=0;render();}
 if(!C.paused&&C.arrived!==s.key&&failed!==s.key&&stable>.75)travel(s).catch(e=>{failed=s.key;console.error('[HNR.cruise]',e);render();});
});
document.addEventListener('keydown',e=>{
 if(C.enabled&&!busy()&&!C.traveling&&!C.working&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))setEnabled(false);
},true);
})();
