/* HNR Tech Inc. · Desktop FPS mouse look; touch and other views retain drag controls. */
(function(){
'use strict';
const H=window.HNR,fine=matchMedia('(any-pointer: fine) and (any-hover: hover)');
let canvas,button,hint,aim,wanted=false,pending=false,denied=false,attempt=0,clock=0,installed=false;
const M=H.mouseLook={version:'1.0.0',request,release,get locked(){return !!canvas&&document.pointerLockElement===canvas;},get supported(){return !!canvas&&typeof canvas.requestPointerLock==='function';}};
function blocked(){return !H.S||H.player.locked||H.ui.isOpen()||H.input.captured||H.cam.isOverride()||H.sim?.active||H.opening?.active||H.cruise?.enabled||document.hidden||document.body.classList.contains('hud-off');}
function allowed(){return H.player.view==='fps'&&!blocked();}
function clearMovement(){H.player.stop();H.input.setJoy(0,0);Object.keys(H.input.keys).forEach(k=>H.input.keys[k]=false);if(!H.input.captured)H.input.capture(null);}
function failed(token){
 if(token!==attempt||!pending)return;
 pending=false;wanted=false;denied=true;refresh();
 H.ui.toast('이 창에서 마우스 모드를 시작하지 못했어요. 화면을 드래그하거나 Chrome의 새 탭에서 열어 주세요.',{ms:4500});
}
function request(){
 if(!M.supported||!allowed()||pending)return false;
 if(M.locked)return true;
 const token=++attempt;wanted=true;pending=true;denied=false;clearMovement();
 try{const promise=canvas.requestPointerLock();if(promise&&typeof promise.catch==='function')promise.catch(()=>failed(token));}
 catch(e){failed(token);}
 refresh();return true;
}
function release(){
 const active=M.locked||pending;wanted=false;pending=false;attempt++;
 if(M.locked){try{document.exitPointerLock();}catch(e){}}
 if(active)clearMovement();refresh();
}
function refresh(){
 if(!installed)return;
 const locked=M.locked;document.body.classList.toggle('mouse-looking',locked);
 hint.hidden=!fine.matches||H.player.view!=='fps'||blocked();
 const text=locked?'마우스: 시선 · WASD: 이동 · E: 대화 · Esc: 해제':denied?'화면 드래그로 둘러보기 · 시점·탐색에서 다시 시도':'화면 클릭: 마우스로 둘러보기 · Esc: 해제';
 if(hint.textContent!==text)hint.textContent=text;
 aim.hidden=!locked||blocked();
 button.hidden=!fine.matches;button.disabled=!M.supported||!!blocked();
 button.textContent=M.supported?'마우스로 둘러보기':'이 기기는 화면 드래그로 둘러보기';
}
function install(){
 if(installed)return;installed=true;canvas=H.renderer.domElement;
 hint=document.createElement('div');hint.id='mouseLookHint';hint.setAttribute('role','status');hint.hidden=true;document.body.appendChild(hint);
 aim=document.createElement('div');aim.id='mouseAim';aim.setAttribute('aria-hidden','true');aim.hidden=true;document.body.appendChild(aim);
 const row=document.createElement('div');row.className='explore-row';button=document.createElement('button');button.id='mouseLookStart';button.type='button';row.appendChild(button);
 const body=document.getElementById('exploreBody');body.insertBefore(row,document.getElementById('exploreHint'));
 button.onclick=()=>{
  if(H.cruise?.enabled)H.cruise.setEnabled(false);
  if(H.player.view!=='fps'&&!H.explore.setView('fps'))return;
  body.hidden=true;document.getElementById('exploreToggle').setAttribute('aria-expanded','false');request();
 };
 // Capture only real mouse input in FPS. The first click locks the cursor; it never walks or uses an item.
 canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='mouse'||e.button!==0||H.player.view!=='fps'||blocked())return;
  if(M.locked||pending||(!denied&&M.supported)){
   e.preventDefault();e.stopImmediatePropagation();if(!M.locked&&!pending)request();
  }
 },true);
 canvas.addEventListener('pointermove',e=>{if(M.locked||pending)e.stopImmediatePropagation();},true);
 canvas.addEventListener('pointerup',e=>{if(e.pointerType==='mouse'&&(M.locked||pending)){e.preventDefault();e.stopImmediatePropagation();}},true);
 document.addEventListener('mousemove',e=>{
  if(!M.locked)return;if(!allowed()){release();return;}
  const dx=Number(e.movementX),dy=Number(e.movementY);if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
  H.player.yaw-=dx*.0028;H.player.pitch=H.util.clamp(H.player.pitch-dy*.0028,-1.35,1.35);
  H.hud.hideHint();
 });
 document.addEventListener('pointerlockchange',()=>{
  pending=false;
  if(M.locked){if(!wanted||!allowed()){release();return;}denied=false;H.hud.hideHint();canvas.tabIndex=-1;canvas.focus({preventScroll:true});}
  else{wanted=false;clearMovement();}
  refresh();H.emit('mouse-look',M.locked);
 });
 document.addEventListener('pointerlockerror',()=>failed(attempt));
 document.addEventListener('keydown',e=>{
  if(e.target===button&&(e.code==='Enter'||e.code==='Space')){e.stopPropagation();return;}
  if(!M.locked&&!pending)return;
  if(e.code==='Escape'){release();e.stopPropagation();return;}
  if(e.code==='Tab'||e.code==='KeyV'||((e.code==='KeyE'||e.code==='Enter')&&H.world.near))release();
 },true);
 window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});
 fine.addEventListener?.('change',refresh);refresh();
}
H.on('start',install);H.on('view',()=>{if(H.player.view!=='fps')release();refresh();});
H.on('opening:start',release);H.on('sim:enter',release);H.on('state',refresh);
H.on('tick',dt=>{if(!installed)return;if((M.locked||pending)&&!allowed())release();clock+=dt;if(clock>.15){clock=0;refresh();}});
})();
