/* HNR Tech 연구소 지도 · 2026-10-06
 * 소유 범위: map.js. core/sim/flow의 공개 API만 사용한다.
 * 6개 연구실의 U자 동선, 5개 이중문, 단서, 휴식실, 아트리움.
 * 앵커는 바닥 중심, 로컬 +Z가 관람자 방향. 자세한 계약은 MAP_HANDOFF.md.
 */
(function () {
'use strict';
const H = window.HNR, P = H.P, W = H.world, F = H.flow, B = H.BRICK;
const PI = Math.PI;
const rooms = [
  {n:1,x:-1150,z:1100,color:B.blue,sub:'손을 잡으면 길이 열릴까?',entry:'S',exit:'N'},
  {n:2,x:-1150,z:-500,color:B.cyan,sub:'손대지 않고 움직여 보아요',entry:'S',exit:'N'},
  {n:3,x:-1150,z:-2100,color:B.violet,sub:'전선 없이 빛을 깨워요',entry:'S',exit:'E'},
  {n:4,x:1150,z:-2100,color:B.orange,sub:'출발! 방향을 찾아서',entry:'W',exit:'S'},
  {n:5,x:1150,z:-500,color:B.copper,sub:'빨리 가는 길이 답일까?',entry:'N',exit:'S'},
  {n:6,x:1150,z:1100,color:B.green,sub:'비트에게 합격을 기억시켜요',entry:'N',exit:'S'}
];
const anchors = {
  g1:{x:-1600,z:1100,ry:PI/2}, g2:{x:-1600,z:-500,ry:PI/2},
  g3:{x:-1600,z:-2100,ry:PI/2}, g4a:{x:750,z:-2440,ry:0},
  g4b:{x:1550,z:-2440,ry:0}, g5:{x:1600,z:-500,ry:-PI/2},
  g6:{x:1600,z:1100,ry:-PI/2}
};
const M = H.map = {version:'1.0.0', rooms, anchors,
  spawn:{x:-1150,z:2350,yaw:0}, forks:{}, reservations:{}, checkpoints:{}};
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
    board('암실 관찰 약속','거리를 바꾸고\n방향도 바꾸어 보아요',r.x+600,r.z-400,0,155);
  }
  if(r.n===4){
    [-100,100].forEach(dx=>P.box(9,4,760,B.steel,r.x+dx,5,r.z));
    for(let i=0;i<8;i++)P.box(240,4,20,B.brown,r.x,4,r.z-350+i*100);
    board('터널 열차 연구실','코일 열차 · 나침반\n두 실험을 모두 만나 보아요',r.x,r.z-460,0,200);
  }
  if(r.n===5)board('자이로드롭 통로','구리관 · 아크릴관\n낙하를 비교하는 곳',r.x-550,r.z+430,PI,170);
  if(r.n===6){
    board('최종 면접','1비트 기억 회로\n오늘의 마지막 실험',r.x-550,r.z+400,PI,170);
    for(let i=0;i<3;i++){H.props.cabinet(r.x-710,r.z-300+i*150,{color:B.navy,h:115});W.addBlock(rect(r.x-710,r.z-300+i*150,70,45));}
  }
}
async function useGate(n) {
  const story=H.story('gates.'+n,{}), ids=story.sims||[];
  if(ids.length&&ids.every(id=>H.sim&&H.sim.defOf&&H.sim.defOf(id)))return F.gate(n);
  // The handed-off snapshot still has empty sims. Do not offer an action that rejects
  // inside core's openSim() and leaves its sim:exit listener waiting indefinitely.
  if(H.state.gatePassed(n)){
    await H.ui.say(story.done||[{who:story.npc,t:'이미 통과한 관문이에요.'}]);return 'done';
  }
  const choice=await H.ui.say(story.intro,{who:story.npc,buttons:[
    {t:'✅ 실물로 해 봤어요',v:'real',cls:'green'},{t:'나중에',v:'later',cls:'ghost'}]});
  if(choice!=='real')return 'later';
  const lines=[{steps:story.real||[],title:'실물 실험 순서',t:'부스에서 이렇게 해 보았나요?'}];
  if(story.safety)lines.push({sign:'⚠ '+story.safety});
  lines.push({who:'bit',t:'실물 실험을 다 해 보았나요?'});
  const answer=await H.ui.say(lines,{buttons:[{t:'아직이에요',v:'no',cls:'ghost'},{t:'✅ 다 해 봤어요!',v:'yes',cls:'green'}]});
  if(answer!=='yes')return 'later';
  await F.pass(n);return 'passed';
}
function room(r) {
  const unlocked=()=>r.n===1||H.state.forkSolved(r.n-1);
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
      const holes=side===r.entry?[[-350,350]]:side===r.exit?(r.n===6?[[-140,140]]:[[-295,-85],[85,295]]):[];
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
  M.checkpoints[r.n]=np.spot;
  H.props.checkpoint(np.spot.x,np.spot.z,{size:95,color:r.color,label:r.sub,labelH:20,labelY:155});
}
function clue(n,f,side) {
  const correct=side===H.state.forkCorrect(n), lx=side==='L'?-190:190;
  const g=P.group(f.x,0,f.z,{ry:f.ry});
  P.with(g,()=>{
    if(n===1){
      // A visibly closed rectangular loop versus the same loop with a gap.
      [-62,62].forEach(dx=>P.box(8,4,170,B.yellow,lx+dx,6,155));
      P.box(132,4,8,B.yellow,lx,6,70);
      if(correct)P.box(132,4,8,B.yellow,lx,6,240);
      else [-46,46].forEach(dx=>P.box(40,4,8,B.yellow,lx+dx,6,240));
      P.part(36,14,22,B.dgrey,lx+62,12,155);
    }
    if(n===2){
      P.part(12,115,12,B.yellow,lx,70,24,{rz:.42});
      if(correct){P.part(65,42,10,B.brown,lx-56,55,28);
        for(let i=0;i<5;i++)P.box(3,42,4,B.cream,lx-81+i*12,55,35);}
    }
    if(n===3){
      P.ball(28,B.violet,lx-58,65,36,{opacity:.75});
      P.part(36,15,36,B.black,lx-58,23,36);
      // The source-to-tube direction is horizontal in this front-facing comparison.
      P.cyl(6,6,90,B.white,lx+38,65,36,{rz:correct?PI/2:0,emissive:B.white,emissiveIntensity:correct?.7:.05});
    }
    if(n===4){
      const coilSide=H.CONFIG.compassPointsAway?(H.state.forkCorrect(4)==='L'?'R':'L'):H.state.forkCorrect(4);
      if(side===coilSide){for(let i=0;i<8;i++)P.torus(25,3,B.copper,lx+(side==='L'?-140:140),52,30+i*7);}
    }
    if(n===5){
      P.part(170,6,270,correct?B.copper:B.acrylic,lx,7,175,{opacity:correct?1:.42});
      if(!correct){P.part(170,95,10,B.acrylic,lx,48,-70,{opacity:.45});}
    }
  });
  P.bake(g);
}
function fork(r) {
  const n=r.n, f={x:r.x+(r.exit==='E'?800:0),z:r.z+(r.exit==='N'?-600:600)*(r.exit==='E'?0:1),ry:r.exit==='E'?-PI/2:r.exit==='S'?PI:0};
  const back=local(f,0,n===4?430:330); back.yaw=f.ry;
  const built=F.forkDoors(n,{...f,gap:380,w:190,h:130,clue:false,back,color:r.color,rival:n===2});
  M.forks[n]={...f,...built,back};
  ['L','R'].forEach(s=>clue(n,f,s));
  const sign=local(f,0,30);
  board('카드를 보고 골라요',H.story('gates.'+n+'.fork.clue','두 문을 비교해 보아요'),sign.x,sign.z,f.ry,125);
  if(n===4){
    const g=P.group(f.x,0,f.z,{ry:f.ry});
    P.with(g,()=>{
      P.cyl(60,60,20,B.gold,0,20,230);
      P.cyl(53,53,3,B.white,0,31,230);
      const needle=P.group(0,35,230,{dynamic:true});
      P.with(needle,()=>{P.part(12,4,42,B.red,0,0,-21);P.part(12,4,42,B.blue,0,0,21);});
      P.text('N',{x:0,y:46,z:166,h:18,bg:'#ffffff',color:'#b23a30'});
      function sync(){needle.rotation.y=H.state.forkSolved(4)?(H.state.forkCorrect(4)==='L'?PI/2:-PI/2):0;}
      sync();H.on('state',sync);
    });
    W.addBlock(F.rectOf(local(f,0,230).x,local(f,0,230).z,125,125,f.ry));
    // The guide/back point must be in front of the compass, never inside its pedestal.
    F.spots.fork[4]={...back,n:4};
  }
  // Separate narrow door strips keep the engine's rectangle route graph out of the divider.
  ['L','R'].forEach(s=>{
    const p=local(f,s==='L'?-190:190,-40);
    W.addWalk('portal'+n+s,F.rectOf(p.x,p.z,190,200,f.ry),()=>H.state.forkSolved(n)&&H.state.forkCorrect(n)===s);
  });
}
function corridors() {
  // Leave a 40-unit separation between room and shared corridor: only door strips bridge it.
  rooms.slice(0,5).forEach(r=>{
    const f=M.forks[r.n], len=r.n===3?700:400;
    const p=local(f,0,-(len/2+20)), area=F.rectOf(p.x,p.z,700,len-40,f.ry);
    W.addWalk('link'+r.n,area,()=>H.state.forkSolved(r.n));
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
    if(!H.sim||!H.sim.defOf(id)){
      P.part(230,52,100,B.white,0,26,0);
      board(H.story('sims.'+id+'.title','실험 장치'),'장치 준비 중\n시험관에게 실물 실험을 확인받아요',0,0,0,220);
    }
  });P.bake(stat);
  if(!H.sim||!H.sim.defOf(id))W.addBlock({id:'reserved:'+id,...footprint});
}
function atrium() {
  W.addWalk('atrium',rect(0,2250,3900,600));
  W.addZone({id:'atrium',rect:rect(0,2250,3900,600),name:'HNR Tech · 채용 아트리움',exposure:1.05});
  W.addWalk('entry',rect(-1150,1825,700,350));
  W.addWalk('graduation',rect(1150,1825,280,350),()=>H.state.gatePassed(6));
  const stat=P.group(0,0,0);
  P.with(stat,()=>{
    P.stud(3900,600,B.floor,0,2250,2);
    P.stud(700,350,B.floor,-1150,1825,2);P.stud(280,350,B.floor,1150,1825,2);
    P.part(500,30,40,B.blue,-1150,230,1950);
    [-1420,-880].forEach(x=>{P.part(40,230,40,B.blue,x,115,1950);W.addBlock(rect(x,1950,40,40));});
    P.text('HNR TECH  /  신입 연구원 모집',{x:-1150,y:280,z:1950,w:540,bg:'#0d69ac'});
    board('길은 실험이 알려 줘요','관문 6개 · 합격 카드 5장\n정문에서 첫 실험을 시작해요',-1780,2200,PI/4,200);
    H.props.bench(-300,2470);H.props.bench(300,2470);
    [-300,300].forEach(x=>W.addBlock(rect(x,2470,170,65)));
    [-1810,1810].forEach(x=>{H.props.plant(x,2470);H.props.lampPost(x,2040);W.addBlock(rect(x,2470,60,60));});
    solid(-1950,1950,-1950,2550,B.blue,70);solid(1950,1950,1950,2550,B.blue,70);solid(-1950,2550,1950,2550,B.white,70);
    P.part(500,170,25,B.navy,700,85,2480);
    P.text('HNR TECH · 오늘부터 연구원',{x:700,y:135,z:2458,w:440,bg:'#162333',color:'#ffe46b'});
    // Central garden is scenery, with no walk polygon that could bypass the gates.
    P.stud(560,4300,B.grass,0,-450,0);
    for(let i=0;i<5;i++)H.props.tree(0,-2450+i*800,{s:1.5});
    [-2400,2400].forEach(x=>{H.props.building(x,-1900,500,650,600,{color:B.steel});H.props.building(x,0,400,430,600,{color:B.white});});
  });P.bake(stat);
  const door=H.props.door(1150,1700,{w:250,h:140,color:B.gold,label:'합격 후 아트리움으로'});
  W.addBlock(rect(1150,1700,270,28),()=>!H.state.gatePassed(6));
  const sync=()=>door.userData.setOpen(H.state.gatePassed(6),true);sync();H.on('state',sync);
  F.endingSpot(700,2280,{label:'합격 기념 포토존',ry:PI});
  const bit=W.addNpc('bit',-1450,2220,{block:false});
  W.addInteract({id:'welcome-bit',x:-1450,z:2220,r:150,mesh:bit,label:'💬 비트 · 연구소 이용 안내',onUse:()=>H.ui.say([
    {who:'bit',t:'시험관을 만나 실험하고 합격 카드를 받아요. 카드의 수수께끼가 다음 문을 알려 줘요.'},
    {who:'bit',t:'화면의 화살표를 따라가 보아요. 틀려도 괜찮아요! 다시 생각하는 방에서 카드를 함께 읽어요.'}
  ])});
}
M.spawnFor=function(){return H.S&&H.S.passed.length?F.suggestSpawn():M.spawn;};
M.build=function(){
  if(M.built)return;M.built=true;
  if(!F.gateNpc)throw new Error('map.js 앞에 lab/flow.js를 로드해 주세요.');
  F.thinkRoom(-2500,2200,{size:360});
  rooms.forEach(room);rooms.slice(0,5).forEach(fork);corridors();
  Object.keys(anchors).forEach(id=>reserve(id,anchors[id]));atrium();F.guideAuto();
};
})();
