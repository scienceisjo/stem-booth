/* HNR Tech Inc. · PROJECT ONE: persistent apparatus and recovery indicators.
 * Load after map-features.js, before HNR.boot(). Public HNR APIs only.
 * Animated exhibits explain what to look for; a demo never grants a recovery badge.
 */
(function(){
'use strict';
const H=window.HNR,M=H.map,P=H.P,W=H.world,B=H.BRICK,T=window.THREE,PI=Math.PI;
const X=H.missionWorld={version:'1.0.0',apparatus:{},indicators:[],built:false};
const metadata={
  g1:{n:1,title:'에너지 스틱',action:'회로 연결하기',notice:'양쪽 접점을 잇는 길이 닫히면 불이 켜져요.'},
  g2:{n:2,title:'캔과 빨대',action:'빨대를 대전시켜 가까이 대기',notice:'닿지 않는 거리에서도 캔이 빨대 쪽으로 움직여요.'},
  g4a:{n:4,title:'코일 열차',action:'열차 출발시키기',notice:'건전지와 자석으로 만든 열차가 구리 코일 안에서 움직여요.'},
  g4b:{n:4,title:'황금 나침반',action:'전류 켜기 · 반전 · 복원',notice:'전류를 켜고 반전한 뒤 처음 방향으로 되돌려 바늘을 관찰해요.'},
  g5:{n:5,title:'자이로드롭 비교 장치',action:'두 자석 함께 놓기',notice:'같은 높이에서 놓아도 구리관 쪽 자석은 더 늦게 도착해요.'}
};
function at(a,x,z){return H.flow.l2w(a.x,a.z,a.ry||0,x,z);}
function rect(x,z,w,d){return{x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2};}
function unlocked(n){return n===1||H.state.forkSolved(n-1);}
function bright(mesh,on,color){
  const m=mesh.material;m.color.set(color|| (on?B.green:B.navy)).convertSRGBToLinear();
  if(m.emissive){m.emissive.set(color|| (on?B.green:B.navy)).convertSRGBToLinear();m.emissiveIntensity=on?.75:.08;}
}
function line(ax,ay,az,bx,by,bz,r,color,opt){
  const a=new T.Vector3(ax,ay,az),b=new T.Vector3(bx,by,bz),d=b.clone().sub(a);
  const tube=P.cyl(r,r,d.length(),color,(ax+bx)/2,(ay+by)/2,(az+bz)/2,opt);
  tube.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return tube;
}
function mark(label,x,z){
  P.torus(32,3,B.blue,x,7,z,{rx:PI/2,seg:24});
  const s=P.text(label,{x,y:36,z,h:18,bg:'#0066cc',color:'#ffffff'});
  if(H.explore)H.explore.labels.push(s);return s;
}
function trackLabels(root){if(H.explore)root.traverse(o=>{if(o.isSprite&&!H.explore.labels.includes(o))H.explore.labels.push(o);});}
function removeLabel(root,label){if(!label)return;root.remove(label);if(H.explore)H.explore.labels=H.explore.labels.filter(o=>o!==label);}
function table(){
  P.part(510,12,250,B.white,0,75,0);
  [-210,210].forEach(x=>P.part(22,68,215,B.steel,x,36,0));
  P.part(515,7,255,B.blue,0,82,0);
}
function makeStick(rec){
  table();
  P.cyl(17,17,210,B.acrylic,0,112,-20,{rz:PI/2,opacity:.5});
  [-117,117].forEach(x=>P.cyl(19,19,26,B.steel,x,112,-20,{rz:PI/2}));
  const lamp=P.cyl(10,10,70,B.blue,0,112,-20,{rz:PI/2,unique:true,dynamic:true,emissive:B.blue,emissiveIntensity:.08});
  line(-130,94,-20,-185,94,78,4,B.yellow);line(130,94,-20,185,94,78,4,B.yellow);
  line(-185,94,78,-48,94,78,4,B.yellow);line(48,94,78,185,94,78,4,B.yellow);
  const bridge=line(-48,94,78,48,94,78,4,B.yellow,{dynamic:true,visible:false});
  P.text('연결 전에는 꺼짐',{x:0,y:173,z:0,w:210,bg:'#ffffff',color:'#102e54'});
  rec.start=()=>{rec.elapsed=0;bridge.visible=true;bright(lamp,true,B.cyan);};
  rec.tick=dt=>{rec.elapsed+=dt;const on=rec.elapsed<1.2||rec.elapsed>=2.3;bridge.visible=on;bright(lamp,on,on?B.cyan:B.blue);if(rec.elapsed>4)rec.running=false;};
}
function makeCan(rec){
  table();
  const can=P.group(-95,117,0,{dynamic:true});
  P.with(can,()=>{
    P.cyl(31,31,78,B.steel,0,0,0,{rx:PI/2});
    P.torus(27,2,B.white,0,0,40);P.torus(27,2,B.white,0,0,-40);
    P.part(28,38,2,B.blue,0,0,40);
  });
  const straw=P.cyl(5,5,155,B.cyan,148,122,0,{rx:PI/2,dynamic:true});
  P.part(62,6,65,B.brown,-170,88,35);
  P.text('사이에 틈을 두어요',{x:40,y:190,z:10,w:240,bg:'#ffffff',color:'#102e54'});
  rec.start=()=>{rec.elapsed=0;can.position.x=-95;can.rotation.z=0;straw.position.x=148;};
  rec.tick=dt=>{
    rec.elapsed+=dt;
    if(rec.elapsed<1){straw.position.set(-170+Math.sin(rec.elapsed*28)*12,100,35);return;}
    const u=Math.min(1,(rec.elapsed-1)/2.2),ease=1-Math.pow(1-u,3);
    straw.position.set(148-30*ease,122,0);can.position.x=-95+158*ease;can.rotation.z=-158*ease/31;
    if(u===1)rec.running=false;
  };
}
function makeTrain(rec){
  table();
  [-180,180].forEach(x=>P.part(22,28,125,B.white,x,100,0));
  for(let i=0;i<30;i++)P.torus(37,2.2,B.copper,-203+i*14,143,0,{ry:PI/2,seg:20});
  const train=P.group(-165,143,0,{dynamic:true});
  P.with(train,()=>{
    P.cyl(18,18,68,B.yellow,0,0,0,{rz:PI/2});
    [-42,42].forEach(x=>P.cyl(27,27,14,B.steel,x,0,0,{rz:PI/2}));
    P.part(20,13,2,B.navy,0,0,18);
  });
  P.text('건전지 + 자석 + 구리 코일',{x:0,y:222,z:0,w:310,bg:'#ffffff',color:'#102e54'});
  rec.start=()=>{rec.elapsed=0;train.position.x=-165;};
  rec.tick=dt=>{rec.elapsed+=dt;train.position.x=-165+Math.min(1,rec.elapsed/2.5)*330;if(rec.elapsed>=2.5)rec.running=false;};
}
function makeCompass(rec){
  table();
  for(let i=0;i<11;i++)P.torus(38,3,B.copper,-90-i*7,130,0,{ry:PI/2,seg:20});
  P.part(120,14,125,B.white,-125,90,0);
  P.cyl(68,68,16,B.gold,105,94,0);P.cyl(60,60,3,B.white,105,104,0);
  const needle=P.group(105,110,0,{dynamic:true});
  P.with(needle,()=>{P.part(10,4,46,B.red,0,0,-23);P.part(10,4,46,B.blue,0,0,23);P.ball(6,B.gold,0,4,0);});
  P.text('N',{x:105,y:127,z:-60,h:17,bg:'#ffffff',color:'#ae122b'});
  P.part(65,26,40,B.navy,-150,100,85);
  line(-125,112,31,-150,113,65,3,B.red);line(-195,115,0,-190,110,85,3,B.blue);
  const sign=P.text('전류 방향을 바꾸어 보아요',{x:0,y:208,z:0,w:300,bg:'#ffffff',color:'#102e54'});
  rec.polarity=H.CONFIG.compassPointsAway?-1:1;
  rec.start=()=>{rec.elapsed=0;needle.rotation.y=0;};
  rec.tick=dt=>{
    rec.elapsed+=dt;const base=rec.polarity*PI/2,t=rec.elapsed;
    if(t<1.2)needle.rotation.y=base*Math.min(1,t/.8);
    else if(t<2.7)needle.rotation.y=base-2*base*Math.min(1,(t-1.2)/.8);
    else needle.rotation.y=-base+2*base*Math.min(1,(t-2.7)/.8);
    if(t>=4.2)rec.running=false;
  };
  rec.needle=needle;rec.sign=sign;
}
function makeDrop(rec){
  P.part(430,24,230,B.white,0,14,0);P.part(430,5,230,B.blue,0,29,0);
  [-105,105].forEach(x=>{P.part(120,12,140,B.steel,x,40,0);P.part(14,284,16,B.navy,x,176,-70);});
  // Open tubes, with the copper cutaway explicitly labelled as a view into the model.
  P.cyl(38,38,240,B.copper,-105,177,0,{open:true,opacity:.48,side:T.DoubleSide});
  P.cyl(38,38,240,B.acrylic,105,177,0,{open:true,opacity:.2,side:T.DoubleSide});
  [-105,105].forEach((x,i)=>[57,297].forEach(y=>P.torus(38,4,i?B.steel:B.copper,x,y,0,{rx:PI/2,seg:24})));
  const slow=P.cyl(25,25,18,B.steel,-105,286,0,{dynamic:true}),fast=P.cyl(25,25,18,B.steel,105,286,0,{dynamic:true});
  P.text('구리관 · 내부 보기',{x:-105,y:338,z:0,w:190,bg:'#ffffff',color:'#102e54'});
  P.text('아크릴관',{x:105,y:338,z:0,w:145,bg:'#ffffff',color:'#102e54'});
  rec.start=()=>{rec.elapsed=0;slow.position.y=fast.position.y=286;};
  rec.tick=dt=>{rec.elapsed+=dt;slow.position.y=286-225*Math.min(1,rec.elapsed/3.2);fast.position.y=286-225*Math.min(1,Math.pow(rec.elapsed/.68,2));if(rec.elapsed>=3.2)rec.running=false;};
  rec.slow=slow;rec.fast=fast;
}
const builders={g1:makeStick,g2:makeCan,g4a:makeTrain,g4b:makeCompass,g5:makeDrop};
function recordDemo(rec){
  H.sfx('click');
  rec.running=true;rec.start();H.ui.toast(rec.info.notice,{icon:'🔬',ms:3900});
}
function apparatus(id){
  // An actual simulation owns the same reservation, so never layer a second model on it.
  if(H.sim&&H.sim.defOf(id))return;
  const info=metadata[id],a=M.anchors[id],root=P.group(a.x,0,a.z,{ry:a.ry||0,dynamic:true,name:'apparatus:'+id});
  const rec=X.apparatus[id]={id,info,root,running:false,elapsed:0};
  P.with(root,()=>{
    builders[id](rec);
    P.text(info.title,{x:0,y:id==='g5'?390:275,z:-65,w:300,bg:'#102e54',color:'#ffffff'});
  });P.bake(root);trackLabels(root);
  const footprint=W.blocks.find(b=>b.id==='reserved:'+id);if(footprint)footprint.cameraHeight=id==='g5'?365:215;
  const front=at(a,0,310);mark('E · '+info.title,front.x,front.z);
  rec.interact=W.addInteract({id:'apparatus:'+id,x:front.x,z:front.z,r:145,mesh:root,visible:()=>unlocked(info.n),
    label:()=> '🔬 '+info.action,onUse:()=>{
      if(rec.running)return 'running';
      recordDemo(rec);
      return 'demo';
    }});
  rec.activate=()=>recordDemo(rec);
}
function lightPanel(r){
  const group=P.group(r.x+(r.n<=3?380:-380),0,r.z+(r.n<=3?470:-470),{dynamic:true,name:'recovery:'+r.n});
  let lamp,label,last='';
  P.with(group,()=>{
    P.part(125,70,24,B.white,0,70,0);P.part(130,8,28,B.blue,0,108,0);
    lamp=P.ball(13,B.blue,0,80,17,{unique:true,dynamic:true,emissive:B.blue,emissiveIntensity:.08});
  });P.bake(group);
  const rec={n:r.n,group,lamp,sync(){
    const done=H.state.gatePassed(r.n),text=done?'복구 완료':'복구 대기';if(text===last)return;last=text;
    bright(lamp,done,done?B.green:B.blue);
    removeLabel(group,label);
    label=P.text(('0'+r.n).slice(-2)+' · '+text,{x:0,y:142,z:0,w:190,bg:done?'#126346':'#102e54',color:'#ffffff',parent:group});
    trackLabels(group);
  }};X.indicators.push(rec);rec.sync();
}
function controlBoard(){
  const g=P.group(0,0,2025,{dynamic:true,name:'project-one-board'});let heading,detail,last='';
  const lamps=[];
  P.with(g,()=>{
    P.part(630,210,28,B.navy,0,165,0);P.part(644,9,35,B.blue,0,275,0);
    [-240,240].forEach(x=>P.part(24,100,50,B.steel,x,50,0));
    P.text('HNR Tech Inc. · PROJECT ONE',{x:0,y:255,z:22,w:560,bg:'#0066cc',color:'#ffffff'});
    M.rooms.forEach((r,i)=>{
      const x=-250+i*100;
      lamps.push(P.ball(12,B.blue,x,111,25,{unique:true,dynamic:true,emissive:B.blue,emissiveIntensity:.08}));
      P.text('0'+r.n,{x,y:78,z:25,w:65,bg:'#ffffff',color:'#102e54'});
    });
  });P.bake(g);W.addBlock({id:'project-one-board',...rect(0,2025,645,40)}).cameraHeight=280;
  const sync=()=>{
    const done=M.rooms.map(r=>H.state.gatePassed(r.n)),key=done.join(',');if(key===last)return;last=key;
    lamps.forEach((l,i)=>bright(l,done[i],done[i]?B.green:B.blue));
    removeLabel(g,heading);removeLabel(g,detail);
    const count=done.filter(Boolean).length,next=M.rooms.find(r=>!done[r.n-1]);
    heading=P.text(count===6?'준비 신호 1 · 시연 준비 완료':count+'/6 구역 복구 완료',{x:0,y:201,z:23,w:555,bg:'#ffffff',color:'#102e54',parent:g});
    detail=P.text(next?'현재 목표 · '+H.story('gates.'+next.n+'.system',H.info.gateName(next.n)):'수고했어요, 연구원님!',{x:0,y:153,z:23,w:550,bg:'#ffffff',color:'#102e54',parent:g});trackLabels(g);
  };sync();H.on('state',sync);
  mark('E · 복구 상황판',0,2220);
  W.addInteract({id:'project-one-board',x:0,z:2220,r:150,mesh:g,label:'📋 PROJECT ONE · 복구 상황 보기',onUse:()=>{
    const lines=M.rooms.map(r=>({who:'bit',t:(H.state.gatePassed(r.n)?'✓ 복구 완료':'○ 복구 대기')+' · '+H.info.gateName(r.n)+'\n'+H.story('gates.'+r.n+'.objective',r.sub)}));
    return H.ui.say(lines);
  }});X.board={root:g,sync,lamps};
}
const originalBuild=M.build;
M.build=function(){
  originalBuild();if(X.built)return;X.built=true;
  Object.keys(metadata).forEach(apparatus);M.rooms.forEach(lightPanel);controlBoard();
};
H.on('state',()=>X.indicators.forEach(r=>r.sync()));
H.on('tick',dt=>{if(!X.built)return;Object.values(X.apparatus).forEach(rec=>{
  if(!rec.running)return;rec.tick(Math.min(dt,.1));
  if(!rec.running){
    H.S.seen['apparatus:'+rec.id]=true;H.state.save();
    H.emit('state',{type:'observation',id:rec.id});
    H.ui.toast(rec.info.title+' 관찰 완료 · 연구원에게 복구를 확인받아요.',{icon:'✓',ms:3500});
  }
});});
})();
