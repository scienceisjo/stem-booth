/* HNR Tech Inc. · Local interaction cues and a camera-only first-person hand. */
(function(){
'use strict';
const H=window.HNR,T=window.THREE,reduced=matchMedia('(prefers-reduced-motion: reduce)');
const N=H.navigationUI={version:'1.0.0',hand:null,refresh:refresh};
let installed=false,hand=null,step=0,bob=0,cueTime=0,lastCue='';
function blocked(){return H.ui.isOpen()||H.player.locked||!!H.sim.active||!!H.opening?.active||H.cam.isOverride()||H.cam.k>.01||document.body.classList.contains('hud-off')||document.body.classList.contains('pre');}
function setTalk(label){
 const button=document.getElementById('talkBtn');if(!button||!label)return;
 const key=document.createElement('kbd'),text=document.createElement('span');key.textContent='E';key.setAttribute('aria-hidden','true');text.textContent=String(label).replace(/^(?:\[E\]\s*|E\s*[·:：]\s*)/,'');
 button.replaceChildren(key,text);button.classList.add('nav-interact');button.setAttribute('aria-label',text.textContent+' · E키 또는 이 버튼을 누르세요');
 button.title='E키 또는 이 버튼을 누르세요';
}
function box(w,h,d,colors,x,y,z){
 const mats=colors.map(color=>new T.MeshBasicMaterial({color,depthTest:false,depthWrite:false,toneMapped:false,fog:false}));
 const m=new T.Mesh(new T.BoxGeometry(w,h,d),mats);m.position.set(x,y,z);m.renderOrder=10000; m.frustumCulled=false;m.raycast=function(){};hand.add(m);return m;
}
function buildHand(){
 if(hand||!H.camera||!H.scene)return;
 hand=new T.Group();hand.name='HNR-first-person-hand';hand.userData.dynamic=true;
 // This view model is independent of the world avatar. Its size is in camera space.
 box(15,25,15,[0xc5ddf3,0xf5faff,0xffffff,0x9ebedc,0xe6f2ff,0xc5ddf3],0,-9,0);
 box(15.7,5,15.7,[0x075397,0x0073d9,0x2d9cf2,0x00437d,0x1682e0,0x075397],0,6,0);
 box(13.6,16,13.6,[0xd9b292,0xf1ceb0,0xffdcc1,0xbf9472,0xe7bd99,0xd0a180],0,16.5,0);
 box(4.8,8,7.5,[0xd9b292,0xf1ceb0,0xffdcc1,0xbf9472,0xe7bd99,0xd0a180],-8.8,12.5,1.4);
 // A small blue lab-coat seam, not a second logo or a modified school emblem.
 box(2,16,.35,Array(6).fill(0x0865bb),3,-8,7.7);
 hand.rotation.set(-.36,-.32,-.17);hand.visible=false;H.camera.add(hand);
 if(!H.camera.parent)H.scene.add(H.camera);
 N.hand=hand;
}
function refresh(){
 if(!installed)return;
 const goal=document.getElementById('missionGoal');if(goal){goal.setAttribute('aria-live','polite');goal.setAttribute('aria-atomic','true');}
 const near=H.world.near,hidden=blocked(),show=!!near&&!hidden;
 document.body.classList.toggle('nav-can-interact',show);
 const label=show?(typeof near.label==='function'?near.label(near):near.label)||'말 걸기':'';
 if(label!==lastCue){lastCue=label;if(label)setTalk(label);}
 const guide=document.getElementById('guide');if(guide)guide.setAttribute('aria-label','다음 본 체험 위치');
}
function install(){
 if(installed)return;installed=true;
 const old=H.hud.setTalk;H.hud.setTalk=function(label){old.call(H.hud,label);setTalk(label);};
 const button=document.getElementById('talkBtn');if(button){button.setAttribute('aria-keyshortcuts','E');button.setAttribute('aria-describedby','navInteractHelp');}
 const help=document.createElement('span');help.id='navInteractHelp';help.className='nav-sr-only';help.textContent='가까운 대상에게 E키로 말을 걸거나 이 버튼을 눌러 조작할 수 있습니다.';document.body.appendChild(help);
 buildHand();refresh();
}
H.on('start',install);H.on('state',refresh);H.on('view',refresh);H.on('opening:start',refresh);H.on('opening:end',refresh);
H.on('tick',dt=>{
 if(!installed)return;cueTime+=dt;if(cueTime>.15){cueTime=0;refresh();}
 if(!hand)return;
 hand.visible=H.player.view==='fps'&&!blocked()&&!H.cruise?.traveling;
 if(!hand.visible)return;
 if(H.player.walking&&!reduced.matches)step+=dt*8;
 const target=H.player.walking&&!reduced.matches?1:0;bob+=(target-bob)*Math.min(1,dt*12);
 const z=62,halfH=Math.tan(H.camera.fov*Math.PI/360)*z,halfW=halfH*H.camera.aspect;
 hand.position.set(Math.max(14,halfW*.64)+Math.sin(step)*.9*bob,-halfH*.98+Math.abs(Math.sin(step))*1.3*bob,-z);
 hand.rotation.z=-.17+Math.sin(step)*.025*bob;
 hand.updateMatrixWorld(true);
});
})();
