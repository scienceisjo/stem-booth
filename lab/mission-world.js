/* HNR Tech Inc. · PROJECT ONE: persistent apparatus and activity indicators.
 * Load after map-features.js, before HNR.boot(). Public HNR APIs only.
 * Animated exhibits explain what to look for; a digital demo never confirms a physical activity.
 */
(function(){
'use strict';
const H=window.HNR,M=H.map,P=H.P,W=H.world,B=H.BRICK,T=window.THREE,PI=Math.PI;
const X=H.missionWorld={version:'2.0.0-interview',apparatus:{},indicators:[],built:false};
const metadata={
  g1:{n:1,title:'에너지 스틱',action:'회로 연결하기',notice:'양쪽 접점을 잇는 길이 닫히면 불이 켜져요.'},
  g2:{n:2,title:'캔과 빨대',action:'빨대를 대전시켜 가까이 대기',notice:'화면은 문지르기와 접근을 보여 주는 모형이에요. 굵기에 따른 거리 차이는 실물로 반복 관찰해요.'},
  g4a:{n:4,title:'코일 열차',action:'열차 출발시키기',notice:'건전지와 자석으로 만든 열차가 구리 코일 안에서 움직여요.'},

  g5:{n:5,title:'구리관 전자기 브레이크',action:'구리관에서 자석 놓기',notice:'구리관과 자석의 상대적인 움직임이 낙하를 방해하는 힘을 만들어요. 자석은 멈추지 않고 내려와요.'}
};
function at(a,x,z){return H.flow.l2w(a.x,a.z,a.ry||0,x,z);}
function rect(x,z,w,d){return{x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2};}
function unlocked(n){return n===4||n===5||!H.journey||H.journey.available('g'+n);}
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
function stickSound(){
  let context=null,oscillator=null,gain=null,on=false;
  const silent=new URLSearchParams(location.search).get('nosfx')==='1';
  const sound={active:false,connected:false,set(connected){
    sound.connected=!!connected;
    const wanted=connected&&!silent&&!document.hidden&&!H.sfx.isMuted();
    if(wanted&&!context&&navigator.userActivation?.hasBeenActive){
      try{
        const AC=window.AudioContext||window.webkitAudioContext;context=AC?new AC():null;
        if(context){oscillator=context.createOscillator();gain=context.createGain();oscillator.type='sine';oscillator.frequency.value=523.25;gain.gain.value=0;oscillator.connect(gain);gain.connect(context.destination);oscillator.start();}
      }catch(e){context=null;}
    }
    if(wanted&&context?.state==='suspended'&&navigator.userActivation?.hasBeenActive)context.resume().catch(()=>{});
    const audible=!!(wanted&&context?.state==='running');
    if(gain&&audible!==on){gain.gain.cancelScheduledValues(context.currentTime);gain.gain.setTargetAtTime(audible?.035:0,context.currentTime,.025);on=audible;}
    sound.active=audible;
  }};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)sound.set(false);});
  return sound;
}
function makeStick(rec){
  table();
  P.cyl(17,17,210,B.acrylic,0,112,-20,{rz:PI/2,opacity:.5});
  [-117,117].forEach(x=>P.cyl(19,19,26,B.steel,x,112,-20,{rz:PI/2}));
  const lamp=P.cyl(10,10,70,B.blue,0,112,-20,{rz:PI/2,unique:true,dynamic:true,emissive:B.blue,emissiveIntensity:.08});
  line(-130,94,-20,-185,94,78,4,B.yellow);line(130,94,-20,185,94,78,4,B.yellow);
  line(-185,94,78,-48,94,78,4,B.yellow);line(48,94,78,185,94,78,4,B.yellow);
  const bridge=line(-48,94,78,48,94,78,4,B.yellow,{dynamic:true,visible:false});
  P.text('연결하면 빛과 소리 · 끊으면 멈춤',{x:0,y:173,z:0,w:280,bg:'#ffffff',color:'#102e54'});
  const sound=rec.sound=stickSound();rec.duration=8.5;rec.lamp=lamp;rec.bridge=bridge;
  const set=on=>{rec.connected=on;bridge.visible=on;bright(lamp,on,on?B.cyan:B.blue);sound.set(on);};
  rec.start=()=>{rec.elapsed=0;set(false);};
  rec.tick=dt=>{rec.elapsed+=dt;const t=rec.elapsed;set((t>=1&&t<3)||(t>=4.5&&t<7.2));if(t>=rec.duration)rec.running=false;};
  rec.end=()=>set(false);
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
  const fur=P.group(-170,88,35);P.with(fur,()=>{
    P.part(74,6,78,B.brown,0,0,0);
    for(let i=0;i<7;i++)for(let j=0;j<6;j++){const tuft=P.ball(4.8,(i+j)%2?0xa17145:0xbc8a58,-30+i*10,5,-30+j*12,{seg:6});tuft.scale.set(.7,1.25,1);}
  });
  P.text('움직이기 시작하는 거리',{x:40,y:190,z:10,w:240,bg:'#ffffff',color:'#102e54'});
  rec.duration=14;rec.can=can;rec.straw=straw;rec.fur=fur;
  rec.start=()=>{rec.elapsed=0;can.position.x=-95;can.rotation.z=0;straw.position.set(148,122,0);rec.phase='준비';};
  rec.tick=dt=>{
    rec.elapsed+=dt;const t=rec.elapsed,smooth=u=>{u=Math.max(0,Math.min(1,u));return u*u*(3-2*u);};
    if(t<1){rec.phase='들어 올리기';straw.position.set(148,122+52*smooth(t),0);}
    else if(t<2.4){rec.phase='털가죽으로 이동';const u=smooth((t-1)/1.4);straw.position.set(148-318*u,174,35*u);}
    else if(t<2.9){rec.phase='털가죽에 대기';straw.position.set(-170,174-71*smooth((t-2.4)/.5),35);}
    else if(t<6.5){rec.phase='털가죽에 문지르기';straw.position.set(-170+Math.sin((t-2.9)*Math.PI*2*(5/6))*18,103,35);}
    else if(t<7.3){rec.phase='들어 올리기';straw.position.set(-170,103+71*smooth((t-6.5)/.8),35);}
    else if(t<8.6){rec.phase='캔 옆으로 이동';const u=smooth((t-7.3)/1.3);straw.position.set(-170+318*u,174,35*(1-u));}
    else if(t<9.2){rec.phase='캔 높이에 맞추기';straw.position.set(148,174-52*smooth((t-8.6)/.6),0);}
    else{rec.phase=t<12.6?'캔에 천천히 접근':'캔의 움직임 관찰';const u=smooth((t-9.2)/3.4),roll=smooth((t-10.8)/1.8);straw.position.set(148-138*u,122,0);can.position.x=-95+45*roll;can.rotation.z=-45*roll/31;}
    if(t>=rec.duration)rec.running=false;
  };
  rec.end=ok=>{if(!ok)rec.start();};
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

function makeDrop(rec){
  P.part(540,24,260,B.white,0,14,0);P.part(540,5,260,B.blue,0,29,0);
  const closedX=-130,slitX=125;
  [-130,125].forEach(x=>{P.part(14,330,16,B.navy,x,195,-85);P.part(130,12,160,B.steel,x,40,0);});
  const tube=P.cyl(38,38,240,B.copper,closedX,206,0,{open:true,opacity:.48,side:T.DoubleSide});tube.name='g5-closed-copper-tube';
  [86,326].forEach(y=>P.torus(38,4,B.copper,closedX,y,0,{rx:PI/2,seg:24}));
  // A single continuous slit runs from the top to the bottom, on the visitor side.
  const slit=new T.Mesh(new T.CylinderGeometry(38,38,200,32,1,true,.24,PI*2-.48),new T.MeshStandardMaterial({color:B.copper,metalness:.35,roughness:.48,side:T.DoubleSide}));
  slit.position.set(slitX,241,0);slit.name='g5-longitudinal-slit-tube';rec.root.add(slit);
  [-39,39].forEach(dx=>{const plate=P.part(5,82,68,B.copper,slitX+dx,90,0);plate.name='g5-separate-facing-plate';});
  P.text('닫힌 구리관',{x:closedX,y:395,z:0,w:190,bg:'#ffffff',color:'#102e54'});
  P.text('세로 절개 관',{x:slitX,y:395,z:0,w:190,bg:'#ffffff',color:'#102e54'});
  P.text('아래: 마주 보는 구리판 2장',{x:slitX,y:45,z:130,w:255,bg:'#ffffff',color:'#102e54'});
  P.text('절개 관과 판의 결과는 실물 관찰',{x:80,y:447,z:0,w:340,bg:'#ffffff',color:'#102e54'});
  const magnet=P.cyl(25,25,18,B.steel,closedX,350,0,{dynamic:true});magnet.name='g5-magnet';
  const currents=[-20,20].map(dy=>{const ring=P.torus(39,2,B.gold,closedX,206+dy,0,{rx:PI/2,seg:24,dynamic:true,visible:false,basic:true});ring.name='g5-eddy-current-concept';return{dy,ring};});
  const held=.3,fall=2.9,tau=.15,total=held+fall,travel=t=>t-tau*(1-Math.exp(-t/tau)),normalizer=travel(fall);
  rec.start=()=>{rec.elapsed=0;magnet.position.y=350;currents.forEach(c=>{c.ring.visible=false;});};
  rec.tick=dt=>{rec.elapsed+=dt;const t=Math.max(0,Math.min(fall,rec.elapsed-held));magnet.position.y=350-294*travel(t)/normalizer;
    currents.forEach(c=>{const y=magnet.position.y+c.dy;c.ring.position.y=y;c.ring.visible=t>0&&t<fall&&y>90&&y<322;});
    if(rec.elapsed>=total){magnet.position.y=56;currents.forEach(c=>{c.ring.visible=false;});rec.running=false;}
  };rec.slow=magnet;rec.magnet=magnet;rec.copperTube=tube;rec.slitTube=slit;
}
const builders={g1:makeStick,g2:makeCan,g4a:makeTrain,g5:makeDrop};
function recordDemo(rec){
  if(rec.running)return rec.promise;
  H.sfx('click');
  rec.promise=new Promise(resolve=>{rec.resolve=resolve;});
  rec.running=true;rec.start();H.ui.toast(rec.info.notice,{icon:'🔬',ms:3900});return rec.promise;
}
function finishDemo(rec,ok){
  rec.running=false;if(rec.end)rec.end(ok);
  const resolve=rec.resolve;rec.resolve=null;if(resolve)resolve(!!ok);
  if(!ok)return;
  H.S.seen['apparatus:'+rec.id]=true;H.state.save();
  H.emit('state',{type:'observation',id:rec.id});H.emit('device:demo',{id:rec.id,completed:true});
  H.ui.toast(rec.info.title+' 화면 관찰 완료 · 실물 활동은 학생 연구원과 함께해요.',{icon:'✓',ms:3500});
}
function apparatus(id){
  // An actual simulation owns the same reservation, so never layer a second model on it.
  if(!M.anchors[id]||H.sim&&H.sim.defOf(id))return;
  const info=metadata[id],a=M.anchors[id],root=P.group(a.x,0,a.z,{ry:a.ry||0,dynamic:true,name:'apparatus:'+id});
  const rec=X.apparatus[id]={id,info,root,running:false,elapsed:0};
  P.with(root,()=>{
    builders[id](rec);
    P.text(info.title,{x:0,y:id==='g5'?500:275,z:-65,w:300,bg:'#102e54',color:'#ffffff'});
  });P.bake(root);trackLabels(root);
  const footprint=W.blocks.find(b=>b.id==='reserved:'+id);if(footprint)footprint.cameraHeight=id==='g5'?475:215;
  const front=at(a,0,310);mark('E · '+info.title,front.x,front.z);
  rec.interact=W.addInteract({id:'apparatus:'+id,x:front.x,z:front.z,r:145,mesh:root,visible:()=>unlocked(info.n),
    label:()=> 'E · '+info.action,onUse:()=>{
      if(H.journey)return H.journey.open(id);
      if(H.deviceShow)return H.deviceShow.play(id);
      if(rec.running)return 'running';
      recordDemo(rec);
      return 'demo';
    }});
  rec.activate=()=>recordDemo(rec);
  rec.stop=()=>{if(rec.running||rec.resolve)finishDemo(rec,false);};
  rec.duration=rec.duration||({g4a:2.5,g4b:4.2,g5:3.2})[id]||4;
  rec.view={pos:id==='g5'?[420,360,760]:[360,330,650],look:id==='g5'?[0,230,0]:[0,118,0],fov:48};
}
function lightPanel(r){
  const group=P.group(r.x+(r.n<=3?380:-380),0,r.z+(r.n<=3?470:-470),{dynamic:true,name:'recovery:'+r.n});
  let lamp,label,last='';
  P.with(group,()=>{
    P.part(125,70,24,B.white,0,70,0);P.part(130,8,28,B.blue,0,108,0);
    lamp=P.ball(13,B.blue,0,80,17,{unique:true,dynamic:true,emissive:B.blue,emissiveIntensity:.08});
  });P.bake(group);
  const rec={n:r.n,group,lamp,sync(){
    const id=({1:'g1',2:'g2',3:'g3',4:'g4a',5:'g5',6:'g6'})[r.n];
    const done=!!H.journey?.complete(id),optional=r.n===4||r.n===5,text=done?'체험 확인':optional?'자유 체험':'본 체험';if(text===last)return;last=text;
    bright(lamp,done,done?B.green:B.blue);
    removeLabel(group,label);
    label=P.text(('0'+r.step).slice(-2)+' · '+text,{x:0,y:142,z:0,w:190,bg:done?'#126346':'#102e54',color:'#ffffff',parent:group});
    trackLabels(group);
  }};X.indicators.push(rec);rec.sync();
}

function binaryDesk(){
  const x=900,z=-1780,g=P.group(x,0,z,{dynamic:true,name:'binary-8421-desk'}),lamps=[];
  P.with(g,()=>{
    P.part(500,12,170,B.white,0,70,0);[-215,215].forEach(dx=>P.part(18,64,135,B.blue,dx,35,0));
    [8,4,2,1].forEach((weight,i)=>{
      const dx=-180+i*120;P.part(100,5,115,B.green,dx,80,0);
      P.cyl(11,11,25,B.navy,dx,96,-24);P.part(24,9,23,B.blue,dx-27,88,25);P.part(24,9,23,B.gold,dx+27,88,25);
      const led=P.ball(7,B.red,dx+29,92,-23,{unique:true,emissive:B.red,emissiveIntensity:.05});lamps.push(led);
      P.text(String(weight),{x:dx,y:137,z:55,w:60,bg:'#ffffff',color:'#102e54'});
    });
    P.text('8 · 4 · 2 · 1',{x:0,y:240,z:0,w:330,bg:'#102e54',color:'#ffffff'});
    P.text('독립된 네 회로 · 서로 배선하지 않아요',{x:0,y:193,z:0,w:440,bg:'#ffffff',color:'#102e54'});
  });P.bake(g);trackLabels(g);W.addBlock({id:'binary-8421-desk',...rect(x,z,510,180)}).cameraHeight=155;
  mark('E · 숫자 저장하고 읽기',900,-1620);
  W.addInteract({id:'binary-8421',x:900,z:-1620,r:140,mesh:g,label:'E · 8 · 4 · 2 · 1 활동',onUse:()=>H.journey?.open('8421')});
  X.binaryDesk={root:g,lamps};
}
// Text is painted on the physical board, not a billboard that turns into its backing.
// Both faces use the same texture with their own outward-facing plane, so the rear is readable.
function boardFace(parent,texture,side){
  const material=new T.MeshBasicMaterial({map:texture,side:T.FrontSide,toneMapped:false,fog:false});
  const mesh=new T.Mesh(new T.PlaneGeometry(630,260),material);
  mesh.position.set(0,188,side*16);mesh.rotation.y=side<0?PI:0;
  mesh.name='project-board-text-'+(side>0?'front':'back');mesh.userData.dynamic=true;
  parent.add(mesh);return mesh;
}
function controlBoard(){
  const g=P.group(-550,0,2100,{dynamic:true,name:'project-one-board'});
  const steps=[['g1','사람 회로'],['g2','정전기'],['g3','플라즈마'],['g6','회로 제작'],['8421','8421']],lamps=[],backLamps=[];
  const canvas=document.createElement('canvas');canvas.width=1260;canvas.height=520;
  const ctx=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);
  texture.encoding=T.sRGBEncoding;texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;
  texture.anisotropy=Math.min(8,H.renderer?.capabilities?.getMaxAnisotropy()||1);
  const emblem=new Image();let last='',done=steps.map(()=>false);
  function textLine(value,y,size,color,weight,maxWidth){
    ctx.font=(weight||700)+' '+size+'px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
    while(ctx.measureText(value).width>(maxWidth||586)&&size>13){size--;ctx.font=(weight||700)+' '+size+'px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';}
    ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(value,315,318-y);
  }
  function paint(){
    ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,630,260);
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,630,260);
    ctx.fillStyle='#0066cc';ctx.fillRect(0,0,630,47);
    if(emblem.complete&&emblem.naturalWidth){const h=34,w=h*emblem.naturalWidth/emblem.naturalHeight;ctx.drawImage(emblem,13,6,w,h);}
    ctx.save();ctx.translate(23,0);textLine('HNR Tech Inc. · 면접 가는 길',295,22,'#ffffff',800,548);ctx.restore();
    const count=done.filter(Boolean).length;
    textLine(count===steps.length?'첫 연구 프로젝트 완료':count+' / '+steps.length+' 활동 확인',242,29,'#08274c',800);
    textLine('현장 이동은 학생 연구원의 안내에 따라요',201,18,'#111111',700);
    ctx.fillStyle='#c3d8ed';ctx.fillRect(18,145,594,1);
    steps.forEach(([id,title],i)=>{
      ctx.fillStyle='#111111';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 16px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
      ctx.fillText(title,75+i*120,318-100);
    });
    textLine('순서대로 체험하고 회로를 만들어요  ·  E',74,13,'#003d82',700);
    texture.needsUpdate=true;
  }
  P.with(g,()=>{
    P.part(644,274,28,B.navy,0,188,0);P.part(654,9,35,B.blue,0,330,0);
    [-240,240].forEach(x=>P.part(24,54,50,B.steel,x,27,0));
    steps.forEach(([id,title],i)=>{
      const x=-240+i*120;
      lamps.push(P.ball(12,B.blue,x,137,27,{unique:true,dynamic:true,emissive:B.blue,emissiveIntensity:.08}));
      backLamps.push(P.ball(12,B.blue,-x,137,-27,{unique:true,dynamic:true,emissive:B.blue,emissiveIntensity:.08}));
    });
  });P.bake(g);
  const faces=[boardFace(g,texture,1),boardFace(g,texture,-1)];
  W.addBlock({id:'project-one-board',...rect(-550,2100,655,40)}).cameraHeight=340;
  const sync=()=>{
    done=steps.map(([id])=>!!H.journey?.complete(id));const key=done.join(',');if(key===last)return;last=key;
    [lamps,backLamps].forEach(row=>row.forEach((lamp,i)=>bright(lamp,done[i],done[i]?B.green:B.blue)));
    paint();
  };
  sync();emblem.onload=paint;emblem.src='lab/cards/hnr-tech-mark.webp';H.on('state',sync);
  mark('E · 체험 순서 안내',-550,2310);
  W.addInteract({id:'project-one-board',x:-550,z:2310,r:150,mesh:g,label:'E · 순서대로 체험하는 방법',onUse:()=>H.ui.say([
    {who:'bit',t:'사람 회로 → 정전기 → 플라즈마볼 → 기억회로 제작 → 8·4·2·1 순서예요. 파란 길을 따라 한 공간씩 이동해요.'},
    {who:'bit',t:'코일 열차와 전자기 브레이크는 입구에서 앞서 경험한 실험을 돌아보는 전시예요. 플라즈마볼 실험을 마치면 바로 옆 기억회로 제작실 문이 열려요.'},
    {who:'bit',t:'가상 장치를 조작한 기록과 실물 체험 확인은 달라요. 실물 활동과 설명을 마친 뒤 해당 활동에서 확인해 주세요.'}
  ])});X.board={root:g,sync,lamps,backLamps,faces,canvas};
}
const originalBuild=M.build;
M.build=function(){
  originalBuild();if(X.built)return;X.built=true;
  Object.keys(metadata).forEach(apparatus);M.rooms.forEach(lightPanel);controlBoard();binaryDesk();
};
H.on('state',()=>X.indicators.forEach(r=>r.sync()));
H.on('tick',dt=>{if(!X.built)return;Object.values(X.apparatus).forEach(rec=>{
  if(!rec.running)return;rec.tick(Math.min(dt,.1));
  if(!rec.running)finishDemo(rec,true);
});});
})();
