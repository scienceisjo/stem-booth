/* HNR Tech Inc. · Guided movement follows the main journey, never confirms real activities. */
(function(){
'use strict';
const H=window.HNR,KEY='hnr.lab.cruise';
const C=H.cruise={version:'3.1.0',enabled:false,paused:false,traveling:false,working:false,arrived:null,target:nextStage,setEnabled,pause,go:goNow,continueNext,act,choose:()=>false};
let panel,toggle,title,detail,primary,pauseBtn,clock=0,stable=0,lastKey='',paintKey='',failed='',endingSeen=false,trip=null,tripNo=0,changingView=false;
function busy(){return H.ui.isOpen()||H.player.locked||!!H.sim.active||!!H.opening?.active||H.cam.isOverride()||!!H.input.captured||!!H.journey?.busy;}
function observing(){return Object.values(H.missionWorld?.apparatus||{}).some(r=>r.running);}
function nextStage(){
 if(!H.S||!H.journey?.nextTarget)return null;
 const t=H.journey.nextTarget();if(!t||!Number.isFinite(t.x)||!Number.isFinite(t.z))return null;
 if(t.kind==='ending'&&endingSeen)return null;
 return{key:String(t.key||t.id),id:t.id,kind:t.kind||'activity',n:t.n,point:{x:t.x,z:t.z,yaw:t.yaw||0},title:t.label||'다음 본 체험',action:t.action,actionLabel:t.actionLabel};
}
function at(s){return s&&C.arrived===s.key&&Math.hypot(H.player.x-s.point.x,H.player.z-s.point.z)<180;}
function resetClock(){stable=0;lastKey='';paintKey='';}
function stopInput(){H.player.stop();H.input.setJoy(0,0);Object.keys(H.input.keys).forEach(k=>H.input.keys[k]=false);}
function setEnabled(value){
 if(trip)finishTrip(false,'manual');
 C.enabled=!!value;C.paused=false;failed='';C.arrived=null;resetClock();
 try{localStorage.setItem(KEY,C.enabled?'1':'0');}catch(e){}
 document.body.classList.toggle('cruising',C.enabled);
 if(C.enabled){stopInput();H.hud.hideHint();}
 render();return C.enabled;
}
function pause(){C.paused=!C.paused;if(C.paused&&trip)finishTrip(false,'pause');resetClock();render();}
function finishTrip(ok,reason){
 const t=trip;if(!t)return;trip=null;C.traveling=false;document.body.classList.remove('guided-walking');H.player.stop();
 H.cam.dist=t.camera.dist;H.cam.height=t.camera.height;
 if(H.player.view==='tps'){changingView=true;H.player.setView(t.camera.view);changingView=false;}
 if(ok){C.arrived=t.stage.key;H.player.yaw=t.stage.point.yaw;failed='';H.emit('cruise:arrive',{kind:t.stage.kind,n:t.stage.n,id:t.stage.id});}
 else if(reason==='blocked'){failed=t.stage.key;if(!C.enabled)H.ui.toast('길을 확인하지 못했어요. 다음 장소로 걸어가기를 다시 눌러 주세요.',{ms:3500});}
 resetClock();render();t.resolve(ok);
}
function travel(s,once=false){
 if((!C.enabled&&!once)||C.traveling||C.working||busy()||observing()||!s||nextStage()?.key!==s.key)return false;
 const p=H.world.nearest(s.point.x,s.point.z);
 if(!p||!H.world.allowed(p.x,p.z)||Math.hypot(p.x-s.point.x,p.z-s.point.z)>180){failed=s.key;render();return false;}
 const camera={view:H.player.view,dist:H.cam.dist,height:H.cam.height},id=++tripNo;
 C.traveling=true;C.arrived=null;document.body.classList.add('guided-walking');stopInput();
 const result=new Promise(resolve=>{trip={id,stage:s,resolve,camera,planning:true,elapsed:0};});
 changingView=true;H.cam.dist=280;H.cam.height=225;H.player.setView('tps');changingView=false;render();
 (async()=>{
  try{
   const path=await planPath({x:H.player.x,z:H.player.z},p,()=>trip?.id===id&&!busy()&&!observing());
   if(trip?.id!==id)return;
   if(!path||busy()||observing()||nextStage()?.key!==s.key){finishTrip(false,path?'interrupted':'blocked');return;}
   trip.planning=false;render();
   const ok=await H.player.walkPath(path);
   if(trip?.id!==id)return;
   finishTrip(!!ok&&Math.hypot(H.player.x-p.x,H.player.z-p.z)<70,busy()?'interrupted':'blocked');
  }catch(e){if(trip?.id===id){console.error('[HNR.cruise]',e);finishTrip(false,'blocked');}}
 })();return result;
}

// The engine's room graph gives a quick route. A local A* grid only supplies a
// detour when furniture or a locked door intersects that route. No block is disabled.
async function planPath(start,end,valid){
 const coarse=H.world.route(start.x,start.z,end.x,end.z);let previous=start;
 if(coarse.length&&coarse.every(p=>{const ok=H.world.clear(previous.x,previous.z,p.x,p.z);previous=p;return ok;}))return coarse;
 const radius=H.player.r,walks=H.world.walks.filter(w=>!w.cond||w.cond()),blocks=H.world.blocks.filter(b=>!b.cond||b.cond()),bucket=180,buckets=new Map();
 for(const b of blocks){for(let x=Math.floor((b.x1-radius)/bucket);x<=Math.floor((b.x2+radius)/bucket);x++)for(let z=Math.floor((b.z1-radius)/bucket);z<=Math.floor((b.z2+radius)/bucket);z++){const k=x+','+z;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(b);}}
 const samples=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[.7071,.7071],[-.7071,.7071],[.7071,-.7071],[-.7071,-.7071]];
 function allowed(x,z){for(const b of buckets.get(Math.floor(x/bucket)+','+Math.floor(z/bucket))||[])if(x>b.x1-radius&&x<b.x2+radius&&z>b.z1-radius&&z<b.z2+radius)return false;
  return samples.every(([dx,dz])=>walks.some(w=>x+dx*radius>=w.x1&&x+dx*radius<=w.x2&&z+dz*radius>=w.z1&&z+dz*radius<=w.z2));}
 function clear(a,b){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/10));for(let i=1;i<=n;i++)if(!allowed(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n))return false;return true;}
 const grid=32,heap=[],cost=new Map(),parents=new Map(),points=new Map(),closed=new Set();
 function push(v){heap.push(v);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p].f<=v.f)break;heap[i]=heap[p];i=p;}heap[i]=v;}
 function pop(){const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(true){let child=i*2+1;if(child>=heap.length)break;if(child+1<heap.length&&heap[child+1].f<heap[child].f)child++;if(last.f<=heap[child].f)break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;}
 function offer(key,p,g,parent){if(g>=(cost.get(key)??Infinity))return;cost.set(key,g);points.set(key,p);parents.set(key,parent);push({key,p,g,f:g+Math.hypot(p.x-end.x,p.z-end.z)});}
 offer('start',start,0,null);let expanded=0,goal=null;
 while(heap.length&&expanded<24000){
  const a=pop();if(closed.has(a.key))continue;closed.add(a.key);expanded++;
  if(expanded%400===0){await new Promise(resolve=>setTimeout(resolve,0));if(!valid())return null;}
  if(Math.hypot(a.p.x-end.x,a.p.z-end.z)<grid*3&&clear(a.p,end)){points.set('end',end);parents.set('end',a.key);goal='end';break;}
  const cx=Math.round(a.p.x/grid),cz=Math.round(a.p.z/grid),range=a.key==='start'?2:1;
  for(let dx=-range;dx<=range;dx++)for(let dz=-range;dz<=range;dz++){
   const p={x:(cx+dx)*grid,z:(cz+dz)*grid},key=(cx+dx)+','+(cz+dz);if(closed.has(key)||(!dx&&!dz&&a.key!=='start')||!allowed(p.x,p.z)||!clear(a.p,p))continue;
   offer(key,p,a.g+Math.hypot(p.x-a.p.x,p.z-a.p.z),a.key);
  }
 }
 if(!goal)return null;const path=[];for(let key=goal;parents.get(key)!=null;key=parents.get(key))path.unshift(points.get(key));
 const smooth=[];previous=start;
 for(let i=0;i<path.length;){let endIndex=i;while(endIndex+1<path.length&&clear(previous,path[endIndex+1]))endIndex++;smooth.push(path[endIndex]);previous=path[endIndex];i=endIndex+1;}
 return smooth;
}
function goNow(){const s=nextStage();failed='';return travel(s);}
// A single escorted walk is also available in manual mode. It never changes progress or the cruise preference.
function continueNext(){
 const s=nextStage();failed='';if(!s||C.traveling||C.working||busy()||observing())return false;
 if(Math.hypot(H.player.x-s.point.x,H.player.z-s.point.z)<140){C.arrived=s.key;render();return true;}
 return travel(s,true);
}
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
 const s=nextStage(),blocked=busy()||C.working;
 panel.hidden=(!C.enabled&&!C.traveling)||blocked||!s;toggle.disabled=C.working;panel.classList.toggle('cruise-walking',C.traveling);
 if(!s)return;
 const running=observing(),arrived=at(s),p=H.journey.mainProgress?.()||{done:0,total:5};
 const key=[s.key,s.title,s.action,arrived,C.enabled,C.paused,failed,blocked,running,p.done,C.traveling,trip?.planning].join('|');if(key===paintKey)return;paintKey=key;
 title.textContent=s.title;
 panel.querySelector('.cruise-heading span').textContent=C.enabled?'HNR Tech Inc. · 순서대로 크루즈':'HNR Tech Inc. · 다음 장소까지 함께 걷기';
 pauseBtn.hidden=!C.enabled;
 panel.querySelector('.cruise-progress').textContent='본 체험 '+p.done+' / '+p.total;
 detail.textContent=C.traveling?(trip?.planning?'걸어갈 수 있는 길을 확인하고 있어요.':'캐릭터가 다음 장소로 걷고 있어요. ‘직접 이동’을 누르면 멈출 수 있어요.'):failed===s.key?'현재 지나갈 수 있는 길이 없어요. 잠긴 문이나 앞 활동을 확인한 뒤 다시 이동해 주세요.':!arrived?(C.paused?'자동 이동을 멈췄어요. 다음 장소로 이동 버튼은 사용할 수 있어요.':'사람 회로 → 정전기 → 플라즈마 → 회로 제작 순서로 걸어가요.'):
 running?'장치가 움직이고 있어요. 관찰이 끝나면 활동 안내를 열어 보세요.':s.kind==='ending'?'기억회로 제작과 숫자 저장·읽기 기록을 확인해요.':'활동 안내를 열고 학생 연구원의 설명에 따라 체험해 주세요.';
 primary.disabled=running||C.traveling;primary.textContent=C.traveling?'걷는 중…':running?'관찰 중…':!arrived?'다음 장소로 걸어가기':s.actionLabel||typeof s.action==='string'&&s.action||(s.kind==='ending'?'완료 기록 보기':s.kind==='route'?'경로 안내 열기':'활동 안내 열기');
 pauseBtn.textContent=C.paused?'자동 이동 계속':'자동 이동 멈춤';pauseBtn.setAttribute('aria-pressed',String(C.paused));
}
function install(){
 if(panel)return;
 const host=document.getElementById('exploreTools');if(!host)return;
 toggle=document.createElement('button');toggle.type='button';toggle.id='cruiseToggle';toggle.setAttribute('aria-controls','cruisePanel');toggle.onclick=()=>setEnabled(!C.enabled);host.prepend(toggle);
 panel=document.createElement('section');panel.id='cruisePanel';panel.hidden=true;panel.setAttribute('aria-label','비트의 크루즈 안내');
 panel.innerHTML='<div class="cruise-heading"><span>HNR Tech Inc. · 비트의 크루즈</span><button class="cruise-off" type="button">직접 이동</button></div><h2></h2><p class="cruise-detail" aria-live="polite"></p><div class="cruise-actions"><button class="cruise-primary" type="button">다음 장소로 이동</button></div><div class="cruise-foot"><span class="cruise-progress">본 체험 0 / 5</span><button class="cruise-pause" type="button">자동 이동 멈춤</button></div>';
 document.body.appendChild(panel);title=panel.querySelector('h2');detail=panel.querySelector('.cruise-detail');primary=panel.querySelector('.cruise-primary');pauseBtn=panel.querySelector('.cruise-pause');
 primary.onclick=act;pauseBtn.onclick=pause;panel.querySelector('.cruise-off').onclick=()=>setEnabled(false);
 let saved=false;try{saved=localStorage.getItem(KEY)==='1';}catch(e){}
 C.enabled=H.Q.cruise==='1'||saved;document.body.classList.toggle('cruising',C.enabled);render();
}
H.on('start',install);
H.on('state',()=>{failed='';resetClock();render();});
H.on('opening:start',resetClock);H.on('opening:end',resetClock);H.on('sim:enter',render);H.on('sim:exit',()=>{resetClock();render();});
H.on('tick',dt=>{
 if((!C.enabled&&!trip)||!panel)return;
 if(trip){if(document.hidden||busy()||observing()||nextStage()?.key!==trip.stage.key){finishTrip(false,'interrupted');return;}trip.elapsed+=dt;if(trip.elapsed>180){finishTrip(false,'blocked');return;}stable=0;render();return;}
 if(document.hidden)return;
 if(busy()||observing()||C.working){stable=0;render();return;}
 const s=nextStage();if(!s){const p=H.journey?.mainProgress?.();if(p&&p.done>=p.total&&p.total>0){setEnabled(false);H.ui.toast('모든 활동을 마쳤어요. 학생 연구원과 완성한 기억회로를 확인해 주세요.',{ms:3500});}return;}
 if(s.key!==lastKey){lastKey=s.key;stable=0;}else stable+=dt;
 clock+=dt;if(clock>.15){clock=0;render();}
 if(!C.paused&&C.arrived!==s.key&&failed!==s.key&&stable>.75)Promise.resolve(travel(s)).catch(e=>{failed=s.key;console.error('[HNR.cruise]',e);render();});
});
H.on('view',v=>{if(trip&&!changingView&&v!=='tps'){finishTrip(false,'view');C.paused=true;render();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&trip)finishTrip(false,'interrupted');});
document.addEventListener('keydown',e=>{
 if((C.enabled||C.traveling)&&!busy()&&!C.working&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))setEnabled(false);
},true);
})();
