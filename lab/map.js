/* HNR Tech 연구소 지도 · 2026-10-06
 * 소유 범위: map.js. core/sim/flow의 공개 API만 사용한다.
 * 입구 전시 → 사람 회로 → 정전기 → 플라즈마 → 기억회로 제작. 한 방향 동선.
 * 앵커는 바닥 중심, 로컬 +Z가 관람자 방향. 자세한 계약은 MAP_HANDOFF.md.
 */
(function () {
'use strict';
const H = window.HNR, P = H.P, W = H.world, F = H.flow, B = H.BRICK;
const PI = Math.PI;
const rooms = [
  {n:1,step:1,x:-1150,z:1100,color:B.blue,sub:'사람 회로 · 확인 후 정전기로',entry:'S',exit:'N'},
  {n:2,step:2,x:-1150,z:-500,color:B.cyan,sub:'정전기 · 확인 후 플라즈마볼로',entry:'S',exit:'N'},
  {n:3,step:3,x:-1150,z:-2100,color:B.violet,sub:'플라즈마볼 · 확인 후 회로 제작대로',entry:'S',exit:'E'},
  {n:6,step:4,x:1150,z:-2100,color:B.green,sub:'기억회로 제작 · 이어서 8·4·2·1',entry:'W',exit:null}
];
const anchors = {
  g1:{x:-1600,z:1100,ry:PI/2},g2:{x:-1600,z:-500,ry:PI/2},
  g3:{x:-1600,z:-2100,ry:PI/2},g6:{x:1600,z:-2100,ry:-PI/2},
  g4a:{x:300,z:2150,ry:0},g5:{x:1250,z:2150,ry:0}
};
const M = H.map = {version:'4.0.0-linear',rooms,anchors,
  spawn:{x:-1150,z:2750,yaw:0},forks:{},reservations:{},checkpoints:{},
  journeySpots:{'8421':{x:900,z:-1620},library:{x:-550,z:2920}},
  connections:[],route:['g1','g2','g3','g6','8421'],cardIds:[1,2,3]};

function rect(x,z,w,d) { return {x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2}; }
function local(o,x,z) { return F.l2w(o.x,o.z,o.ry||0,x,z); }
function board(title,sub,x,z,ry,w) {
  return P.poster(title,sub,{x,y:106,z,ry:ry||0,w:w||160,bg:'#ffffff',fg:'#1b1d21'});
}
function solid(x1,z1,x2,z2,color,h) {
  P.wall(x1,z1,x2,z2,{color,h:h||124,t:22});
  W.addBlock({x1:Math.min(x1,x2)-11,x2:Math.max(x1,x2)+11,z1:Math.min(z1,z2)-11,z2:Math.max(z1,z2)+11});
}
function wallSide(r,side,holes) {
  const horizontal = side==='N'||side==='S', half=horizontal?800:600;
  function line(a,b) {
    if(b<=a)return;
    const fixed=(side==='N'?-600:side==='S'?600:side==='W'?-800:800);
    solid(r.x+(horizontal?a:fixed),r.z+(horizontal?fixed:a),r.x+(horizontal?b:fixed),r.z+(horizontal?fixed:b),r.n===3?B.navy:B.white,r.n===3?176:124);
  }
  let at=-half;
  holes.forEach(h=>{line(at,h[0]);at=h[1];}); line(at,half);
}
function furnishing(r) {
  // Equipment stays along outer walls; the middle and both doorway lanes stay clear.
  const sx=r.x+(r.n<=3?-680:680), sz=r.z+425;
  H.props.cabinet(sx,sz,{color:r.color});
  H.props.extinguisher(sx-100,sz);
  W.addBlock(rect(sx-40,sz,170,70));
  if(r.n!==4){ H.props.desk(r.x+(r.n<=3?560:-560),r.z-330);
    H.props.monitor(r.x+(r.n<=3?560:-560),r.z-330,{on:true});
    W.addBlock(rect(r.x+(r.n<=3?560:-560),r.z-330,150,85)); }
  if(r.n===2){
    for(let i=0;i<3;i++){P.part(110,150,32,B.white,r.x+720,75,r.z-300+i*180);W.addBlock(rect(r.x+720,r.z-300+i*180,110,32));}
    board('클린룸','먼지와 정전기를 조심해요',r.x+730,r.z+240,-PI/2,130);
  }
  if(r.n===3){
    // No roof: top view remains usable; dark walls and the exposure zone provide the darkroom.
    for(let i=0;i<6;i++)P.box(12,5,70,B.cyan,r.x+150,6,r.z-390+i*150,{emissive:B.cyan,emissiveIntensity:.6,shadow:false});
    board('암실 관찰 장치','형광등을 눕힌 채\n구에 가까이 가져가요',r.x+600,r.z-400,0,155);
  }

  if(r.n===6){
    board('기억회로 제작실','1비트 기억 회로 만들기\n8 · 4 · 2 · 1 숫자 읽기',r.x-550,r.z+400,PI,170);
    for(let i=0;i<3;i++){H.props.cabinet(r.x-710,r.z-450+i*150,{color:B.navy,h:115});W.addBlock(rect(r.x-710,r.z-450+i*150,70,45));}
  }
}
async function useGate(n) {
  if(H.journey)return H.journey.open(({1:'g1',2:'g2',3:'g3',4:'g4a',5:'g5',6:'g6'})[n]);
  return H.ui.say(H.story('gates.'+n+'.intro',[{who:'bit',t:'학생 연구원과 함께 장치를 살펴보세요.'}]));
}
function room(r) {
  const unlocked=()=>!H.journey||H.journey.available('g'+r.n);
  const area=rect(r.x,r.z,1600,1200);
  W.addWalk('room'+r.n,area,unlocked);
  W.addZone({id:'room'+r.n,rect:area,name:r.step+' · '+(r.n===6?'기억회로 제작실':H.info.gateName(r.n)),exposure:r.n===3?.42:1.05});
  const stat=P.group(0,0,0);
  P.with(stat,()=>{
    P.stud(1600,1200,r.n===3?B.navy:B.floor,r.x,r.z,2);
    P.box(1600,5,24,r.color,r.x,5,r.z-575);
    P.box(24,5,1130,r.color,r.x-775,5,r.z);
    P.box(24,5,1130,r.color,r.x+775,5,r.z);
    ['N','S','E','W'].forEach(side=>{
      const holes=side===r.entry?[[-350,350]]:side===r.exit?(r.n===3?[[-160,160]]:[[-295,-85],[85,295]]):[];
      wallSide(r,side,holes);
    });
    const title=P.text(('0'+r.step).slice(-2)+'  '+(r.n===6?'기억회로 제작실':H.info.gateName(r.n)),{x:r.x,y:220,z:r.z-100,w:520,bg:'#162333',color:'#ffffff'});
    title.name='room-title-'+r.n;
    furnishing(r);
  });
  P.bake(stat);
    const np=F.gateNpc(r.n,{x:r.x+150,z:r.z+(r.n===4?0:r.n<=3?250:-250),ry:r.n<=4?0:PI,r:210});
  // Keep the guide and touch-to-walk line in the clear central aisle, beside the NPC.
  np.spot.x=r.x;
  np.interact.visible=unlocked;
  np.interact.onUse=()=>useGate(r.n);
  np.interact.label=()=> 'E · '+H.char.nameOf(H.story('gates.'+r.n+'.npc','bit'))+'에게 말 걸기';
  M.checkpoints[r.n]=np.spot;
  H.props.checkpoint(np.spot.x,np.spot.z,{size:95,color:r.color,label:r.sub,labelH:20,labelY:155});
}
function fork(r) {
  const n=r.n,f={x:r.x+(r.exit==='E'?800:0),z:r.z+(r.exit==='N'?-600:0),ry:r.exit==='E'?-PI/2:0};
  const back=local(f,0,330);back.yaw=f.ry;
  const labels={1:['연결한 회로','끊어진 회로'],2:['가는 빨대','굵은 빨대']};
  const doors={},interacts={};
  const sides=n===3?['C']:['L','R'];
  sides.forEach((side,i)=>{
    const offset=side==='C'?0:side==='L'?-190:190,p=local(f,offset,0);
    const label=n===3?'다음 · 기억회로 제작실':labels[n][i],width=n===3?300:190;
    const door=H.props.door(p.x,p.z,{w:width,h:130,ry:f.ry,color:r.color,label,labelW:n===3?270:210});
    door.userData.setOpen(false,true);doors[side]=door;
    W.addBlock({...F.rectOf(p.x,p.z,width+20,38,f.ry),id:'route-lock-'+n+side},()=>!door.userData.isOpen());
    const ip=local(f,offset,80);
    interacts[side]=W.addInteract({id:'fork'+n+side,x:ip.x,z:ip.z,r:110,mesh:door,
      label:()=> 'E · '+(!door.userData.isOpen()?'잠긴 문 · ':'')+label,onUse:()=>{
        if(n===3&&H.journey?.complete('g3'))return H.cruise?.continueNext();
        return H.journey?.open('g'+n,n===3?undefined:{side});
      }});
    const portal=local(f,offset,-40);
    W.addWalk('portal'+n+side,F.rectOf(portal.x,portal.z,width,200,f.ry));
  });
  if(n===2){const p=local(f,-335,60);W.addNpc('daechung',p.x,p.z,{ry:f.ry+PI,look:false});}
  M.forks[n]={...f,doors,interacts,back,spot:back};F.spots.fork[n]={...back,n};
  const sync=instant=>{
    const selected=n===3?(H.journey?.complete('g3')?'C':null):H.routePass?.openSide(n);
    sides.forEach(side=>doors[side].userData.setOpen(selected===side,instant));
  };sync(true);H.on('state',()=>sync(false));
  // Sign sits beside the doorway, never in its walking lane.
  const sign=local(f,n===3?330:0,40);
  board(n===3?'다음은 기억회로 제작':'답을 고르고 암호 입력',n===3?'빛나는 자리를 고르고 암호 확인\n문이 열리면 바로 옆 제작실로':'암호를 타이핑하거나 말해요\n완료 후 다음 장소로 걸어가요',sign.x,sign.z,f.ry,n===3?225:150);
}
function corridors() {
  // Leave a 40-unit separation between room and shared corridor: only door strips bridge it.
  rooms.slice(0,3).forEach(r=>{
    const f=M.forks[r.n], len=r.n===3?700:400;
    const p=local(f,0,-(len/2+20)), area=F.rectOf(p.x,p.z,700,len-40,f.ry);
    W.addWalk('link'+r.n,area);
    const stat=P.group(f.x,0,f.z,{ry:f.ry});
    P.with(stat,()=>{
      P.stud(700,len,B.floor,0,-len/2,2);
      P.wall(-350,0,-350,-len,{color:r.color,h:80});P.wall(350,0,350,-len,{color:r.color,h:80});
      H.props.tapeLine(0,-len/2,len-40,'z',{color:r.color,w:10});
    });P.bake(stat);
    [-350,350].forEach(dx=>{const p=local(f,dx,-len/2);W.addBlock(F.rectOf(p.x,p.z,22,len,f.ry));});
    M.connections.push({id:'link'+r.n,...area});
  });
}
function reserve(id,a) {
  // Contract: 640×440 (local X/Z), plus clear space for the camera in front.
  const footprint=F.rectOf(a.x,a.z,640,440,a.ry);
  M.reservations[id]={...footprint,w:640,d:440,h:480};
  const stat=P.group(a.x,0,a.z,{ry:a.ry});
  P.with(stat,()=>{
    P.plane(640,440,B.steel,0,0,3);
    H.props.hazardStripe(0,225,640,'x',{w:10});
    // mission-world.js fills unregistered reservations with usable apparatus.
    // Registered simulations mount their own persistent models after map.build().
  });P.bake(stat);
  if(!H.sim||!H.sim.defOf(id))W.addBlock({id:'reserved:'+id,...footprint});
}
function atrium() {
  W.addWalk('atrium',rect(0,2550,3900,1200));
  W.addZone({id:'atrium',rect:rect(0,2550,3900,1200),name:'HNR Tech · 입구 전시와 출발 안내',exposure:1.05});
  W.addWalk('entry',rect(-1150,1825,700,350));
  const stat=P.group(0,0,0);
  P.with(stat,()=>{
    P.stud(3900,1200,B.floor,0,2550,2);P.stud(700,350,B.floor,-1150,1825,2);
    P.part(500,30,40,B.blue,-1150,230,1950);
    [-1420,-880].forEach(x=>{P.part(40,230,40,B.blue,x,115,1950);W.addBlock(rect(x,1950,40,40));});
    P.text('HNR TECH  /  PROJECT ONE',{x:-1150,y:280,z:1950,w:540,bg:'#0d69ac'});
    board('첫 실험 · 사람 회로','파란 길을 따라 정문으로\n1 → 2 → 3 → 기억회로 제작',-1710,2340,PI/4,230);
    P.text('입구 전시 · 앞서 경험한 실험 돌아보기',{x:775,y:560,z:1960,w:740,bg:'#102e54',color:'#ffffff'});
    [300,1250].forEach(x=>{H.props.bench(x,3030);W.addBlock(rect(x,3030,170,65));});
    [-1810,1810].forEach(x=>{H.props.plant(x,3000);H.props.lampPost(x,2040);W.addBlock(rect(x,3000,60,60));});
    solid(-1950,1950,-1500,1950,B.blue,70);solid(-800,1950,1950,1950,B.blue,70);
    solid(-1950,1950,-1950,3150,B.blue,70);solid(1950,1950,1950,3150,B.blue,70);solid(-1950,3150,1950,3150,B.white,70);
    for(let z=2050;z<2900;z+=200){H.props.tapeLine(-1150,z,120,'z',{color:B.blue,w:16});P.text('↑',{x:-1150,y:32,z,w:65,bg:'#0066cc',color:'#ffffff'});}
    // Scenic lawn is visible but has no walkable shortcuts or side experiments.
    P.stud(560,4000,B.grass,0,-100,0);
    for(let i=0;i<4;i++)H.props.tree(0,-1400+i*750,{s:1.5});
    [-2400,2400].forEach(x=>{H.props.building(x,-1900,500,650,600,{color:B.steel});H.props.building(x,0,400,430,600,{color:B.white});});
  });P.bake(stat);
  F.endingSpot(1450,-1650,{label:'PROJECT ONE · 완료 기념',ry:PI});
  const bit=W.addNpc('bit',-1450,2600,{block:false});
  W.addInteract({id:'welcome-bit',x:-1450,z:2600,r:150,mesh:bit,label:'E · 비트 · 출발 안내',onUse:()=>H.ui.say([
    {who:'bit',t:'HNR Tech Inc.에 오신 것을 환영해요. 입구에서는 앞서 경험한 코일 열차와 전자기 브레이크를 다시 살펴볼 수 있어요.'},
    {who:'bit',t:'이제 사람 회로 → 정전기 → 플라즈마볼 순서로 실험하고, 바로 옆 기억회로 제작실로 가요. 각 실험을 마치면 다음 장소로 걸어가기 버튼을 눌러 주세요.'},
    {who:'bit',t:'실물 실험과 안전 수칙은 학생 연구원의 안내를 따라 주세요. 암호는 타이핑하거나 마이크로 말할 수 있어요.'}
  ])});
}

M.spawnFor=function(){
  const progress=H.journey?.mainProgress();
  return progress&&progress.done>0?(F.suggestSpawn()||M.spawn):M.spawn;
};
M.useGate=useGate;
M.build=function(){
  if(M.built)return;M.built=true;
  if(!F.gateNpc)throw new Error('map.js 앞에 lab/flow.js를 로드해 주세요.');
  rooms.forEach(room);rooms.slice(0,3).forEach(fork);corridors();
  Object.keys(anchors).forEach(id=>reserve(id,anchors[id]));atrium();F.guideAuto();
};
})();
