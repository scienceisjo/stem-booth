/* HNR Tech 연구소 지도 · 2026-10-06
 * 소유 범위: map.js. core/sim/flow의 공개 API만 사용한다.
 * 기존 6개 연구실 + 정원 연결 통로 + 선택 체험 + 기록실.
 * 앵커는 바닥 중심, 로컬 +Z가 관람자 방향. 자세한 계약은 MAP_HANDOFF.md.
 */
(function () {
'use strict';
const H = window.HNR, P = H.P, W = H.world, F = H.flow, B = H.BRICK;
const PI = Math.PI;
const rooms = [
  {n:1,x:-1150,z:1100,color:B.blue,sub:'출입 회로를 연결해요',entry:'S',exit:'N'},
  {n:2,x:-1150,z:-500,color:B.cyan,sub:'캔이 움직이기 시작하는 거리를 비교해요',entry:'S',exit:'N'},
  {n:3,x:-1150,z:-2100,color:B.violet,sub:'꺼진 형광등을 켜요',entry:'S',exit:'E'},
  {n:4,x:1150,z:-2100,color:B.orange,sub:'코일 열차를 자유롭게 체험해요',entry:'W',exit:'S'},
  {n:5,x:1150,z:-500,color:B.copper,sub:'전자기 브레이크를 확인해요',entry:'N',exit:'S'},
  {n:6,x:1150,z:1100,color:B.green,sub:'기억 회로를 만들고 숫자를 읽어요',entry:'N',exit:'S'}
];
const anchors = {
  g1:{x:-1600,z:1100,ry:PI/2}, g2:{x:-1600,z:-500,ry:PI/2},
  g3:{x:-1600,z:-2100,ry:PI/2}, g4a:{x:750,z:-2440,ry:0},
  g4b:{x:1550,z:-2440,ry:0}, g5:{x:1600,z:-500,ry:-PI/2},
  g6:{x:1600,z:1100,ry:-PI/2}
};
const M = H.map = {version:'3.0.0-interview', rooms, anchors,
  spawn:{x:-1150,z:2350,yaw:0}, forks:{}, reservations:{}, checkpoints:{},
  journeySpots:{compass:{x:-650,z:2420},'8421':{x:900,z:1580},library:{x:350,z:2315}},
  connections:[]};
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
  if(r.n===4){
    [-100,100].forEach(dx=>P.box(9,4,760,B.steel,r.x+dx,5,r.z));
    for(let i=0;i<8;i++)P.box(240,4,20,B.brown,r.x,4,r.z-350+i*100);
    board('터널 열차 연구실','코일 열차 · 나침반\n자유 탐색과 원리 설명',r.x,r.z-460,0,200);
  }
  if(r.n===5)board('자이로드롭 통로','구리관 전자기 브레이크\n느려지는 자석을 관찰해요',r.x-550,r.z+430,PI,170);
  if(r.n===6){
    board('중앙 제어실','1비트 기억 회로 만들기\n8 · 4 · 2 · 1 숫자 읽기',r.x-550,r.z+400,PI,170);
    for(let i=0;i<3;i++){H.props.cabinet(r.x-710,r.z-450+i*150,{color:B.navy,h:115});W.addBlock(rect(r.x-710,r.z-450+i*150,70,45));}
  }
}
async function useGate(n) {
  if(H.journey)return H.journey.open(({1:'g1',2:'g2',3:'g3',4:'g4a',5:'g5',6:'g6'})[n]);
  return H.ui.say(H.story('gates.'+n+'.intro',[{who:'bit',t:'학생 연구원과 함께 장치를 살펴보세요.'}]));
}
function room(r) {
  const unlocked=()=>true;
  const area=rect(r.x,r.z,1600,1200);
  W.addWalk('room'+r.n,area,unlocked);
  W.addZone({id:'room'+r.n,rect:area,name:r.n+' · '+H.info.gateName(r.n),exposure:r.n===3?.42:1.05});
  const stat=P.group(0,0,0);
  P.with(stat,()=>{
    P.stud(1600,1200,r.n===3?B.navy:B.floor,r.x,r.z,2);
    P.box(1600,5,24,r.color,r.x,5,r.z-575);
    P.box(24,5,1130,r.color,r.x-775,5,r.z);
    P.box(24,5,1130,r.color,r.x+775,5,r.z);
    ['N','S','E','W'].forEach(side=>{
      const gardenEntry=(r.n===5||r.n===6)&&side==='W';
      const holes=gardenEntry?[[-150,150]]:side===r.entry?[[-350,350]]:side===r.exit?(r.n===6?[[-140,140]]:[[-295,-85],[85,295]]):[];
      wallSide(r,side,holes);
    });
    const title=P.text(('0'+r.n).slice(-2)+'  '+H.info.gateName(r.n),{x:r.x,y:220,z:r.z-100,w:520,bg:'#162333',color:'#ffffff'});
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
  const n=r.n,f={x:r.x+(r.exit==='E'?800:0),z:r.z+(r.exit==='N'?-600:600)*(r.exit==='E'?0:1),ry:r.exit==='E'?-PI/2:r.exit==='S'?PI:0};
  const back=local(f,0,n===4?430:330);back.yaw=f.ry;
  const labels={1:['연결한 회로','끊어진 회로'],2:['가는 빨대','굵은 빨대'],3:['가까이에서 관찰','멀리에서 관찰'],4:['본 체험으로 돌아가기','자유 탐색 이어가기'],5:['닫힌 관보다 빠를까?','비슷하게 느릴까?']};
  const doors={},interacts={};
  ['L','R'].forEach((side,i)=>{
    const p=local(f,side==='L'?-190:190,0);
    const door=H.props.door(p.x,p.z,{w:190,h:130,ry:f.ry,color:r.color,label:labels[n][i],labelW:210});
    door.userData.setOpen(true,true);doors[side]=door;
    const ip=local(f,side==='L'?-190:190,80);
    interacts[side]=W.addInteract({id:'fork'+n+side,x:ip.x,z:ip.z,r:110,mesh:door,label:'E · '+labels[n][i],onUse:()=>{
      if(n===5)return H.journey?.open('g5',{prediction:side==='L'?'faster':'similar'});
      if(n===4)return H.ui.say([{who:'jjirit',t:'두 길 모두 열려 있어요. 정원 통로로 중앙 제어실에 가거나, 브레이크실에 들러 자유 체험을 해 보세요.'}]);
      return H.journey?.open('g'+n);
    }});
    const portal=local(f,side==='L'?-190:190,-40);
    W.addWalk('portal'+n+side,F.rectOf(portal.x,portal.z,190,200,f.ry));
  });
  if(n===2){const p=local(f,-335,60);W.addNpc('daechung',p.x,p.z,{ry:f.ry+PI,look:false});}
  M.forks[n]={...f,doors,interacts,back,spot:back};F.spots.fork[n]={...back,n};
  const sign=local(f,0,30);
  board(n===5?'예상하고 직접 관찰':'열린 연구실 통로',n===5?'어느 예상이든\n관찰하며 확인해요':'실험은 학생 연구원과 함께\n다음 안내는 지금 할 일에서',sign.x,sign.z,f.ry,130);
  if(n===4){
    const g=P.group(f.x,0,f.z,{ry:f.ry});P.with(g,()=>{
      P.cyl(60,60,20,B.gold,0,20,230);P.cyl(53,53,3,B.white,0,31,230);
      P.part(12,4,42,B.red,0,35,209);P.part(12,4,42,B.blue,0,35,251);
      P.text('나침반 원리 다시 보기',{x:0,y:85,z:230,w:170,bg:'#ffffff',color:'#102e54'});
    });P.bake(g);const p=local(f,0,230);W.addBlock(rect(p.x,p.z,125,125));
  }
}
function corridors() {
  // Leave a 40-unit separation between room and shared corridor: only door strips bridge it.
  rooms.slice(0,5).forEach(r=>{
    const f=M.forks[r.n], len=r.n===3?700:400;
    const p=local(f,0,-(len/2+20)), area=F.rectOf(p.x,p.z,700,len-40,f.ry);
    W.addWalk('link'+r.n,area);
    const stat=P.group(f.x,0,f.z,{ry:f.ry});
    P.with(stat,()=>{
      P.stud(700,len,B.floor,0,-len/2,2);
      P.wall(-350,0,-350,-len,{color:r.color,h:80});P.wall(350,0,350,-len,{color:r.color,h:80});
      H.props.tapeLine(0,-len/2,len-40,'z',{color:r.color,w:10});
    });P.bake(stat);
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
  W.addWalk('atrium',rect(0,2250,3900,600));
  W.addZone({id:'atrium',rect:rect(0,2250,3900,600),name:'HNR Tech · 신입 연구원 안내',exposure:1.05});
  W.addWalk('entry',rect(-1150,1825,700,350));
  W.addWalk('graduation',rect(1150,1825,280,350));
  const stat=P.group(0,0,0);
  P.with(stat,()=>{
    P.stud(3900,600,B.floor,0,2250,2);
    P.stud(700,350,B.floor,-1150,1825,2);P.stud(280,350,B.floor,1150,1825,2);
    P.part(500,30,40,B.blue,-1150,230,1950);
    [-1420,-880].forEach(x=>{P.part(40,230,40,B.blue,x,115,1950);W.addBlock(rect(x,1950,40,40));});
    P.text('HNR TECH  /  PROJECT ONE',{x:-1150,y:280,z:1950,w:540,bg:'#0d69ac'});
    board('면접 보러 오셨나요?','황금나침반으로 출발해요\n현장 이동은 학생 연구원 안내에 따라요',-1780,2200,PI/4,200);
    H.props.bench(-300,2470);H.props.bench(300,2470);
    [-300,300].forEach(x=>W.addBlock(rect(x,2470,170,65)));
    [-1810,1810].forEach(x=>{H.props.plant(x,2470);H.props.lampPost(x,2040);W.addBlock(rect(x,2470,60,60));});
    solid(-1950,1950,-1950,2100,B.blue,70);solid(-1950,2300,-1950,2550,B.blue,70);solid(1950,1950,1950,2550,B.blue,70);solid(-1950,2550,1950,2550,B.white,70);
    P.part(500,170,25,B.navy,700,85,2480);
    P.text('HNR TECH · 첫 연구 프로젝트',{x:700,y:135,z:2458,w:440,bg:'#162333',color:'#ffe46b'});
    // Garden trees stay; the central clear strip connects the optional and main routes.
    P.stud(560,4300,B.grass,0,-450,0);
    for(let i=0;i<5;i++)H.props.tree(-205,-2450+i*800,{s:1.5});
    [-2400,2400].forEach(x=>{H.props.building(x,-1900,500,650,600,{color:B.steel});H.props.building(x,0,400,430,600,{color:B.white});});
  });P.bake(stat);
  const door=H.props.door(1150,1700,{w:250,h:140,color:B.gold,label:'아트리움 · 안내 데스크'});
  door.userData.setOpen(true,true);
  F.endingSpot(700,2280,{label:'PROJECT ONE · 완료 기념',ry:PI});
  const bit=W.addNpc('bit',-1450,2220,{block:false});
  W.addInteract({id:'welcome-bit',x:-1450,z:2220,r:150,mesh:bit,label:'💬 비트 · 연구소 이용 안내',onUse:()=>H.ui.say([
    {who:'bit',t:'면접 보러 오셨죠? 중앙 제어실로 가는 길에 연구원들을 만나 보세요. 먼저 황금나침반의 표시된 바늘 끝과 같은 파란 별을 찾아 정문으로 출발해요.'},
    {who:'bit',t:'지금 할 일에서 다음 활동을 확인하세요. 터널 열차와 전자기브레이크는 선택 체험이에요. 현실의 책상 이동과 안전 수칙은 학생 연구원의 안내를 따라 주세요!'}
  ])});
}
function gardenConnections(){
  const path=(id,x,z,w,d)=>{const a=rect(x,z,w,d);W.addWalk(id,a);P.stud(w,d,B.floor,x,z,3);M.connections.push({id,...a});};
  path('garden-spine',0,-500,220,3420);
  path('garden-control-link',210,1100,640,280);
  path('garden-brake-link',210,-500,640,280);
  // Collision rails delimit the promenade. The west/right branches remain clear.
  solid(-130,-1960,-130,1240,B.white,44);
  [[-1960,-650],[-350,950]].forEach(([a,b])=>solid(130,a,130,b,B.white,44));
  [-500,1100].forEach(z=>{solid(130,z-150,350,z-150,B.blue,44);solid(130,z+150,350,z+150,B.blue,44);});
  for(let z=-1850;z<=1000;z+=250)H.props.tapeLine(0,z,120,'z',{color:B.blue,w:12});
  board('중앙 제어실 ↓','기억 회로 제작 · 8 · 4 · 2 · 1',0,-1920,0,210);
  board('← 본 체험 · 자유 탐색 →','터널 열차는 오른쪽\n기억 회로 제작은 정원 통로',0,-2160,0,230);
  board('전자기브레이크 →','선택 체험 · 언제든 돌아올 수 있어요',0,-650,0,190);
  board('중앙 제어실 →','면접 · 기억 회로 만들기',0,920,0,190);
  W.addZone({id:'garden',rect:rect(0,-500,260,3420),name:'중앙 정원 · 중앙 제어실 연결 통로',exposure:1.05});
}
function recordRoom(){
  const x=-2500,z=2200;W.addWalk('think',rect(x,z,360,360));
  W.addWalk('record-room-link',rect(-2130,2200,500,200));
  const g=P.group(0,0,0);P.with(g,()=>{
    P.stud(360,360,B.cream,x,z,2);P.stud(500,200,B.floor,-2130,2200,2);
    solid(x-180,z-180,x+180,z-180,B.sand,120);solid(x-180,z+180,x+180,z+180,B.sand,120);
    solid(x-180,z-180,x-180,z+180,B.sand,120);
    solid(x+180,z-180,x+180,z-100,B.sand,120);solid(x+180,z+100,x+180,z+180,B.sand,120);
    H.props.chair(x-90,z+65,{ry:PI,color:B.violet});H.props.plant(x-120,z-120);
    board('관찰 기록실','설명 다시 보기 · 관찰 메모\n어떤 예상도 기록할 수 있어요',x,z-115,0,220);
    P.text('관찰 기록실',{x,y:190,z,w:280,bg:'#102e54',color:'#ffffff'});
  });P.bake(g);F.spots.think={x,z,yaw:0};
  W.addZone({id:'think',rect:rect(x,z,360,360),name:'관찰 기록실 · 설명 다시 보기',exposure:1.05});
  W.addInteract({id:'record-library',x,z,r:160,label:'E · 원리 설명과 관찰 기록 보기',onUse:()=>H.explore?.openLibrary()});
}
M.spawnFor=function(){return H.journey?(F.suggestSpawn()||M.spawn):H.S&&H.S.passed.length?F.suggestSpawn():M.spawn;};
M.useGate=useGate;
M.build=function(){
  if(M.built)return;M.built=true;
  if(!F.gateNpc)throw new Error('map.js 앞에 lab/flow.js를 로드해 주세요.');
  recordRoom();
  rooms.forEach(room);rooms.slice(0,5).forEach(fork);corridors();
  Object.keys(anchors).forEach(id=>reserve(id,anchors[id]));atrium();gardenConnections();F.guideAuto();
};
})();
