/* HNR Tech · 연구소 탐색 기능. map.js 다음, HNR.boot() 전에 로드한다. */
(function(){
'use strict';
const H=window.HNR,M=H.map,P=H.P,W=H.world,B=H.BRICK,T=window.THREE;
const E=H.explore={version:'1.1.0',objects:0,stations:[],labels:[],cameraObstructed:false};
const labels=['','출입 기록대','클린룸 작업대','광학 관찰대','열차 제어반','낙하 점검대','기억 보관대'];
const simIds=['','g1','g2','g3','g4b','g5','g6'];
function area(x,z,w,d){return{x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2};}
function block(x,z,w,d,h){const b=W.addBlock(area(x,z,w,d));b.cameraHeight=h||120;return b;}
function prop(fn){E.objects++;return fn();}
function rack(x,z,color,type){
  prop(()=>{
    P.part(110,140,58,B.steel,x,70,z);
    for(let j=0;j<3;j++){
      P.part(96,6,60,color,x,20+j*43,z);
      for(let k=0;k<3;k++){
        if(type==='optics')P.cyl(8,8,26,B.violet,x-31+k*31,35+j*43,z,{seg:8});
        else P.part(22,24,32,j===1?B.white:color,x-31+k*31,35+j*43,z);
      }
    }
  });block(x,z,114,62,145);
}
function cart(x,z,color){
  prop(()=>{
    P.part(105,8,68,B.steel,x,56,z);P.part(105,6,68,color,x,17,z);
    [-44,44].forEach(dx=>[-25,25].forEach(dz=>{
      P.box(6,45,6,B.steel,x+dx,32,z+dz);P.ball(8,B.black,x+dx,8,z+dz,{seg:8});
    }));
    P.part(44,24,34,color,x-20,72,z);P.cyl(12,12,30,B.white,x+25,75,z,{seg:8});
  });block(x,z,112,76,95);
}
function instrument(x,z,color,kind){
  prop(()=>{
    P.part(135,12,90,B.white,x,68,z);
    [-50,50].forEach(dx=>P.part(12,64,65,B.steel,x+dx,32,z));
    if(kind===1){ // Reception badge printer, not a new science simulation.
      P.part(68,35,55,color,x,92,z);P.box(40,4,2,B.black,x,90,z+28);P.part(25,2,25,B.white,x,80,z+38);
    }else if(kind===2){
      P.part(100,65,20,B.acrylic,x,106,z-27,{opacity:.4});P.cyl(15,15,29,B.steel,x-30,90,z);
      P.part(32,12,22,B.brown,x+25,82,z);P.box(4,5,75,B.yellow,x+25,93,z);
    }else if(kind===3){
      P.cyl(22,22,8,B.black,x,79,z);P.cyl(8,8,70,B.steel,x,115,z);
      P.cyl(21,21,48,B.violet,x,145,z,{rx:Math.PI/2});
    }else if(kind===4){
      P.part(85,35,48,B.orange,x,93,z);P.part(38,15,45,B.white,x,118,z);
      [-28,28].forEach(dx=>[-21,21].forEach(dz=>P.ball(9,B.black,x+dx,77,z+dz,{seg:8})));
    }else if(kind===5){
      [-28,28].forEach((dx,i)=>{P.cyl(15,15,95,i?B.acrylic:B.copper,x+dx,124,z,{opacity:i?.45:1});});
    }else{
      P.part(90,4,58,B.green,x,79,z);for(let i=0;i<3;i++)P.part(20,6,25,B.black,x-28+i*28,84,z);
    }
  });block(x,z,145,100,kind===3||kind===5?178:125);
}
function station(r){
  const sign=r.n<=4?1:-1,x=r.x+sign*590,z=r.z+(r.n<=4?350:0);
  const g=P.group(x,0,z,{ry:sign>0?-Math.PI/2:Math.PI/2,dynamic:true});
  let lamp;
  P.with(g,()=>{
    P.part(74,64,55,r.color,0,32,0);P.part(84,50,14,B.navy,0,85,-13);
    P.box(66,31,2,B.cyan,0,88,-5,{emissive:B.cyan,emissiveIntensity:.35});
    lamp=P.ball(5,B.green,26,58,28,{unique:true,emissive:B.green,emissiveIntensity:.25,seg:8});
    P.text(labels[r.n],{x:0,y:133,z:0,w:155,bg:'#162333',color:'#ffffff'});
  });E.objects++;block(x,z,80,80,118);
  const rec={n:r.n,x:x-sign*140,z,mesh:g,lamp,label:labels[r.n]};E.stations.push(rec);
  W.addInteract({id:'facility'+r.n,x:rec.x,z,r:155,mesh:g,visible:()=>r.n===1||H.state.forkSolved(r.n-1),
    label:()=> '🔎 '+rec.label+(H.S.seen['facility'+r.n]?' · 다시 보기':''),
    onUse:async()=>{
      H.S.seen['facility'+r.n]=true;H.state.save();lamp.material.emissiveIntensity=1;
      await H.ui.say([{who:'bit',t:H.story('sims.'+simIds[r.n]+'.lead','이 방의 장비를 살펴보아요.')},
        {who:'bit',t:H.story('sims.'+simIds[r.n]+'.science','시험관과 함께 실험해 보아요.')}]);
      return 'observed';
    }});
}
function dressRoom(r){
  const stat=P.group(0,0,0);stat.name='room-props-'+r.n;
  P.with(stat,()=>{
    const sign=r.n<=3?1:-1;
    if(r.n!==4){
      rack(r.x+sign*690,r.z-60,r.color,r.n===3?'optics':'supplies');
      instrument(r.x+sign*560,r.z+150,r.color,r.n);
      cart(r.x+sign*410,r.z-430,r.color);
      // Small contents on the existing workbench, counted as objects rather than individual parts.
      prop(()=>{P.part(25,3,35,B.white,r.x+sign*525,45,r.z-330);});
      prop(()=>{P.cyl(9,9,21,r.color,r.x+sign*590,54,r.z-330,{seg:8});});
    }else{
      rack(r.x-690,r.z+350,r.color,'supplies');
      cart(r.x-490,r.z+410,r.color);instrument(r.x+590,r.z+90,r.color,4);
    }
    // Corners remain outside the central aisle and the two 640×440 simulator reservations.
    const corners=r.n===4?[[-710,520],[710,520]]:[[-710,-490],[710,-490]];
    corners.forEach(([dx,dz])=>{prop(()=>H.props.plant(r.x+dx,r.z+dz));block(r.x+dx,r.z+dz,65,65,110);});
    for(let i=0;i<3;i++){
      const x=r.x+(r.n===4?-500+i*130:-260+i*130),z=r.z+(r.n<=3?520:-520);
      // Low storage on rear wall; gap aligns with the entrance for all six rooms.
      if(r.n===4){prop(()=>H.props.crate(x,r.z+500,{color:B.steel,s:32,n:2}));block(x,r.z+500,40,40,70);}
      else{
        const sx=r.x+(r.n<=3?-690:690),sz=r.z-400+i*110;
        prop(()=>H.props.crate(sx,sz,{color:i===1?B.white:r.color,s:30,n:2}));block(sx,sz,40,40,70);
      }
    }
    // Wall-mounted ventilation, cable ducts, warning strips and room number tiles.
    [-1,1].forEach(side=>{
      const x=r.x+side*786;
      prop(()=>{P.part(10,46,120,B.steel,x,112,r.z);for(let j=0;j<5;j++)P.box(12,3,95,B.dgrey,x,97+j*7,r.z);});
      prop(()=>P.box(10,8,950,r.color,x,155,r.z));
    });
    prop(()=>H.props.bin(r.x+(r.n<=3?710:-710),r.z+480,{color:r.color}));
    block(r.x+(r.n<=3?710:-710),r.z+480,45,45,65);
  });P.bake(stat);station(r);
}
function dressAtrium(){
  const stat=P.group(0,0,0);stat.name='atrium-props';
  P.with(stat,()=>{
    [-1550,-650,0,1250,1700].forEach(x=>{
      prop(()=>H.props.plant(x,2480));block(x,2480,65,65,110);
      prop(()=>H.props.cone(x,2520));
    });
    [-650,0,1250].forEach(x=>{prop(()=>H.props.bench(x,2420));block(x,2420,170,65,80);});
    [-1810,1810].forEach(x=>{
      prop(()=>H.props.cabinet(x,2320,{color:B.blue,h:105}));block(x,2320,70,45,105);
      prop(()=>H.props.bin(x,2250,{color:B.green}));block(x,2250,45,45,65);
    });
    for(let i=0;i<7;i++){
      const z=-2500+i*620;
      prop(()=>H.props.tree(i%2?180:-180,z,{s:1.3}));
      prop(()=>H.props.lampPost(i%2?-210:210,z));
      prop(()=>P.part(48,20,48,B.white,0,10,z+170));
    }
    [-2120,2120].forEach(x=>{for(let i=0;i<9;i++)prop(()=>H.props.tree(x,-2600+i*560,{s:1.5}));});
  });P.bake(stat);
}
const originalBuild=M.build;
M.build=function(){originalBuild();if(E.built)return;E.built=true;M.rooms.forEach(dressRoom);dressAtrium();
  H.scene.traverse(o=>{if(!o.isSprite||!o.visible)return;let p=o.parent;while(p){if(p.userData.isChar)return;p=p.parent;}E.labels.push(o);});
};
function busy(){return H.player.locked||H.ui.isOpen()||!!(H.sim&&H.sim.active)||H.cam.isOverride();}
E.setView=function(view){if(busy())return false;H.player.stop();H.player.setView(view);return true;};
E.zoom=function(delta){
  if(busy()||H.player.view==='fps')return false;
  if(H.player.view==='tps')H.cam.dist=H.util.clamp(H.cam.dist+delta*100,240,1100);
  else H.cam.topH=H.util.clamp(H.cam.topH+delta*220,600,2600);
  return true;
};
E.resetCamera=function(){
  if(busy())return false;H.player.stop();H.player.pitch=0;H.cam.dist=500;H.cam.height=320;H.cam.topH=1250;
  const target=H.flow.nextTarget();if(target)H.player.face(target.x,target.z);H.cam.snap=true;return true;
};
function memo(){
  const seen=E.stations.filter(s=>H.S.seen['facility'+s.n]);
  H.ui.say(seen.length?seen.map(s=>({who:'bit',t:labels[s.n]+'\n'+H.story('sims.'+simIds[s.n]+'.science','')})):
    [{who:'bit',t:'각 실험실의 안내 단말기를 살펴보면 여기에 관찰 메모가 모여요. 관문 통과와는 별개로 편하게 둘러보아요.'}]);
}
function installControls(){
  const style=document.createElement('style');style.textContent=`
  #exploreTools{position:fixed;right:12px;top:142px;z-index:21;color:white;font-family:var(--font);pointer-events:auto}
  #exploreTools button{min-height:40px;border:1px solid #ffffff50;background:#182531ed;color:white;border-radius:10px;padding:8px 11px;font-weight:800;font-size:13px}
  #exploreTools button[aria-pressed=true]{background:#0d69ac;border-color:#fff}
  #exploreTools button:disabled{opacity:.4;cursor:default}
  #exploreToggle{float:right}#exploreBody{clear:both;padding:10px;background:#182531f5;border:1px solid #ffffff40;border-radius:14px;width:262px;margin-top:7px}
  #exploreBody[hidden]{display:none}#exploreBody .explore-row{display:flex;gap:5px;margin:7px 0}#exploreBody .explore-row button{flex:1;padding:8px 5px}
  #exploreBody p{font-size:12px;line-height:1.65;color:#d5e4ee;margin:8px 0}#exploreBody strong{font-size:14px}
  #exploreTools button:focus-visible{outline:3px solid #ffda55;outline-offset:2px}
  body.pre #exploreTools,body.sim #exploreTools,body.dlg #exploreTools,body.hud-off #exploreTools{display:none}
  @media(max-width:640px){#topL{right:10px}#topL .row{max-width:100%}#who{max-width:250px;overflow:hidden}#zone{max-width:100%;font-size:12px}
  #topR{top:91px;right:10px;left:10px}#topR .panel{min-width:0;padding:6px 10px}#topR .bar{margin-top:3px;height:5px}#badges{margin-top:4px}#badges .bd{width:auto}#badges .bd i{width:24px;height:24px;font-size:12px}
  #exploreTools{top:181px;right:10px}#exploreBody{max-width:calc(100vw - 20px)}#exploreToggle{font-size:12px;padding:6px 10px}}
  @media(max-height:520px) and (min-width:641px){#exploreTools{top:110px}#exploreBody{max-height:calc(100vh - 165px);overflow-y:auto;touch-action:pan-y}}
  @media(prefers-reduced-motion:reduce){#exploreTools *{animation:none;transition:none}}
  `;document.head.appendChild(style);
  const panel=document.createElement('div');panel.id='exploreTools';panel.innerHTML=`
    <button id="exploreToggle" type="button" aria-expanded="false" aria-controls="exploreBody">📷 시점 · 탐색</button>
    <section id="exploreBody" aria-label="시점과 탐색 설정" hidden>
      <strong>어떤 시점으로 볼까요?</strong>
      <div class="explore-row"><button data-view="fps" type="button">1인칭</button><button data-view="tps" type="button">따라가기</button><button data-view="top" type="button">위에서</button></div>
      <div class="explore-row"><button data-action="in" aria-label="시점 확대" type="button">＋ 확대</button><button data-action="out" aria-label="시점 축소" type="button">－ 축소</button><button data-action="reset" type="button">시선 복원</button></div>
      <p id="exploreHint"></p><div class="explore-row"><button data-action="memo" type="button">관찰 메모 <span id="exploreCount">0/6</span></button></div>
      <p>화면 드래그로 둘러보기 · 바닥을 눌러 이동<br>PC: WASD 이동 · V 시점 전환 · E 말 걸기</p>
    </section>`;
  document.body.appendChild(panel);
  const toggle=panel.querySelector('#exploreToggle'),body=panel.querySelector('#exploreBody');
  function close(){body.hidden=true;toggle.setAttribute('aria-expanded','false');}
  toggle.onclick=()=>{body.hidden=!body.hidden;toggle.setAttribute('aria-expanded',String(!body.hidden));sync();};
  panel.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{E.setView(b.dataset.view);sync();});
  panel.querySelector('[data-action=in]').onclick=()=>{E.zoom(-1);sync();};
  panel.querySelector('[data-action=out]').onclick=()=>{E.zoom(1);sync();};
  panel.querySelector('[data-action=reset]').onclick=()=>{E.resetCamera();sync();};
  panel.querySelector('[data-action=memo]').onclick=()=>{close();memo();};
  function sync(){
    const view=H.player.view,locked=busy();
    panel.querySelectorAll('[data-view]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.view===view));b.disabled=locked;});
    panel.querySelectorAll('[data-action=in],[data-action=out]').forEach(b=>b.disabled=locked||view==='fps');
    panel.querySelector('[data-action=reset]').disabled=locked;
    panel.querySelector('#exploreHint').textContent=view==='fps'?'내 눈높이로 관찰해요. 드래그로 위아래도 볼 수 있어요.':view==='tps'?'캐릭터를 따라가요. 드래그로 각도를, 휠·두 손가락으로 거리를 조절해요.':'주변 동선을 위에서 봐요. 휠·두 손가락으로 넓게 보거나 가까이 보아요.';
    panel.querySelector('#exploreCount').textContent=E.stations.filter(s=>H.S.seen['facility'+s.n]).length+'/6';
  }
  E.syncControls=sync;H.on('view',sync);H.on('state',sync);H.on('sim:enter',close);
  document.addEventListener('keydown',ev=>{if(ev.code==='Escape'&&!body.hidden){close();toggle.focus();}});
  sync();
}
const eye=new T.Vector3(),direction=new T.Vector3(),hit=new T.Vector3(),bounds=new T.Box3(),ray=new T.Ray();
// Elevated entrance lintel: a ground collision rectangle cannot describe its open passage.
// The camera volume includes a near-plane margin so the beam cannot fill half the screen.
E.cameraVolumes=[{x1:-1430,x2:-870,y1:160,y2:300,z1:1910,z2:1990}];
const labelPosition=new T.Vector3();
function readableLabels(){
  const camDistance=H.camera.position.distanceTo(new T.Vector3(H.player.x,65,H.player.z));
  for(const label of E.labels){
    label.getWorldPosition(labelPosition);
    const distance=labelPosition.distanceTo(H.camera.position),nearPlayer=Math.hypot(labelPosition.x-H.player.x,labelPosition.z-H.player.z)<1900;
    // Large billboard signs between avatar and camera must not cover the whole scene.
    const foreground=H.player.view!=='fps'&&distance<camDistance*.85;
    const tooClose=distance<100&&label.scale.x>180;
    label.visible=nearPlayer&&!foreground&&!tooClose;
  }
}
function protectCamera(){
  E.cameraObstructed=false;
  if(H.player.view!=='tps'||H.cam.isOverride()||H.cam.k>.001)return;
  eye.set(H.player.x,65+H.player.y,H.player.z);direction.copy(H.camera.position).sub(eye);
  let distance=direction.length();if(distance<1)return;direction.normalize();ray.set(eye,direction);
  for(const b of W.blocks){
    if(b.cond&&!b.cond())continue;
    const h=b.cameraHeight||(b.id&&b.id.startsWith('sim:')&&H.sim.defOf(b.id.slice(4))?.size.h)||180;
    bounds.min.set(b.x1-4,0,b.z1-4);bounds.max.set(b.x2+4,h,b.z2+4);
    if(bounds.containsPoint(eye))continue;
    if(ray.intersectBox(bounds,hit)){const d=hit.distanceTo(eye)-12;if(d<distance){distance=Math.max(30,d);E.cameraObstructed=true;}}
  }
  for(const b of E.cameraVolumes){
    bounds.min.set(b.x1,b.y1,b.z1);bounds.max.set(b.x2,b.y2,b.z2);
    if(!bounds.containsPoint(eye)&&ray.intersectBox(bounds,hit)){const d=hit.distanceTo(eye)-12;if(d<distance){distance=Math.max(30,d);E.cameraObstructed=true;}}
  }
  if(E.cameraObstructed){H.camera.position.copy(eye).addScaledVector(direction,distance);H.camera.lookAt(eye);H.camera.updateMatrixWorld();}
  const avatar=H.scene.getObjectByName('player');if(avatar&&E.cameraObstructed&&distance<80)avatar.visible=false;
}
H.on('start',()=>{installControls();H.cam.height=320;});
H.on('tick',()=>{if(E.built&&H.camera){protectCamera();readableLabels();}});
})();
