/* HNR Tech Inc. · Interview journey. Local records only; no visitor analytics. */
(function(){
'use strict';
const H=window.HNR, MAIN=['compass','g1','g2','g3','g6','8421'], OPTIONAL=['g4a','g5'];
const titles={compass:'황금나침반 · 면접장으로 출발',g1:'정문 · 사람 회로',g2:'클린룸 · 빨대와 캔',g3:'암실 · 전선 없이 형광등 켜기',g4a:'터널 · 코일기차',g5:'브레이크실 · 구리관 비교',g6:'중앙 연구실 · 1비트 기억회로 제작','8421':'첫 공동 과제 · 8·4·2·1'};
const links={compass:'compass',g1:'energy',g2:'static',g3:'plasma',g4a:'train',g5:'eddy',g6:'dram','8421':'dram'};
const nums={compass:0,g1:1,g2:2,g3:3,g4a:4,g5:5,g6:6,'8421':6};
const intros={
 compass:['비트','오늘 면접은 중앙 연구실에서 진행해요. 황금나침반의 표시된 바늘 끝을 확인하고 출발해 주세요.'],
 g1:['게이트봇','면접 방문객을 확인했습니다. 손을 이어 출입 장치를 작동시켜 보십시오. 한 사람이 손을 놓으면 어떻게 될까요?'],
 g2:['먼지제로 반장','면접실 가는 길이구나? 이 캔을 손대지 않고 옮겨 볼래? 가는 빨대와 굵은 빨대도 비교해 보자.'],
 g3:['깜빡이','잠깐 이것 좀 봐. 플라즈마볼은 켜져 있는데 옆 형광등은 어둡네. 전선을 연결하지 않고 켤 수 있을까?'],
 g4a:['찌릿 기관사','여기는 자유 체험 터널이야. 코일 속으로 움직이는 건전지 열차를 살펴봐. 본 체험은 정원길로 계속 갈 수 있어.'],
 g5:['터널지기','시간이 있으면 구리관을 살펴보게. 먼저 닫힌 관에서 자석이 내려오는 모습을 보고 이야기하세.'],
 g6:['소장','면접 보러 오는 길에 벌써 실험을 하고 왔다고? 직접 만든 것도 하나 보고 싶군. 전기로 기억 한 칸을 만들어 보세.'],
 '8421':['소장','이제 네 회로를 8·4·2·1로 놓고 숫자를 저장해 보세. 네 회로는 서로 배선으로 연결하지 않네.']
};
const steps={
 compass:['학생 연구원과 실물 황금나침반에 전류를 흘려요.','표시된 바늘 끝이 가리키는 첫 실험대를 확인해요. 바늘 끝과 실험대의 같은 색·기호를 찾아요.','현장 이동 순서는 학생 연구원의 안내를 따라 주세요!'],
 g1:['양 끝 사람이 에너지스틱의 양쪽 금속 부분을 하나씩 잡아요.','옆 사람과 손을 이어 불과 소리를 확인해요.','한 사람이 손을 놓았다가 다시 이으며 비교해요.'],
 g2:['같은 재질·길이의 가는 빨대와 굵은 빨대, 같은 캔과 바닥을 사용해요.','문지르는 범위·방법·횟수, 문지른 뒤 시간, 잡는 위치와 접근 방법을 맞춰요.','빨대를 먼 곳에서 천천히 가까이 가져가요. 캔이 처음 움직인 순간의 빨대–캔 표면 사이 거리를 비교해요.','비교 순서를 바꾸어 반복해도 좋아요. 비슷하거나 차이가 뚜렷하지 않은 결과도 기록해요.'],
 g3:['진행자가 받침대에 세운 플라즈마볼을 켜요.','형광등을 가로로 눕혀 관의 긴 옆면이 볼을 향하게 들어요.','잡은 곳과 방향을 유지하고 멀리서 천천히 가까이 가져간 뒤, 다시 멀리 움직여요.'],
 g4a:['진행자와 함께 자석을 붙인 건전지를 코일에 넣어요.','열차가 움직이는 모습을 보고 학생 연구원의 설명을 들어요.'],
 g6:['최신 제작 도안과 학생 연구원의 안내에 따라 1비트 기억회로를 만들어요.','전원 연결과 LED·축전기의 방향을 함께 확인해요.','S1(쓰기)과 S2(읽기)의 역할을 확인하고, 완성 회로의 작동을 점검받아요.'],
 '8421':['준비: 네 회로를 왼쪽부터 8·4·2·1로 놓아요. 두 사람은 같은 방향에서 번갈아 조작해요. S1은 놓고, 네 회로 모두 S2를 충분히 눌러 비워요.','저장: 친구가 뒤돌아 있는 동안 8과 2 자리의 S1만 눌러 충전해요. 모든 버튼에서 손을 떼면 숫자 10을 숨긴 준비가 끝나요.','읽기: 친구가 곧바로 S2만 하나씩 눌러요. 켜지는 순간을 보고 해당 자리의 숫자를 더해요. 8과 2가 켜졌다면 8+2=10이에요.','교대: 성공하면 역할을 바꿔 0~15 중 다른 숫자를 숨겨요.']
};
const safe={g1:'에너지스틱으로만 실험해요. 콘센트 전기로 하지 않아요.',g3:'유리관은 학생 연구원과 조심히 다뤄요. 금속 끝부분을 볼에 대지 않아요.',g4a:'건전지가 뜨거워지면 즉시 멈추고 학생 연구원에게 알려요.',g5:'강한 자석 사이에 손가락이 끼지 않도록 학생 연구원과 함께 다뤄요.',g6:'전원을 연결하기 전에 회로와 부품 방향을 학생 연구원과 확인해요.'};
const J=H.journey={version:1,order:MAIN,shortLabels:['출발','사람 회로','정전기','플라즈마','회로 제작','8421'],busy:false,ensure,open,close,complete,confirm:finish,mainProgress,nextTarget,records:()=>ensure(),library:()=>open('library'),settings:()=>open('settings')};
J.brand=new Image();J.brand.src='lab/cards/hnr-tech-mark.webp';
let overlay,body,heading,priorFocus,lockedBefore=false,current='',device='',renderVersion=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ensure(){
 if(!H.S)return null;
 if(!H.S.journey){H.S.journey={version:1,activities:{},rooms:{},legacy:{passed:H.S.passed.slice(),forks:H.S.forks.slice(),cards:H.S.cards.slice()},migrationNotice:!!H.S.passed.length};H.state.save();}
 const s=H.S.journey;s.activities=s.activities||{};s.rooms=s.rooms||{};
 [...MAIN,...OPTIONAL].forEach(id=>{if(!s.activities[id])s.activities[id]={visited:false,digital:false,real:false,explained:false,completed:false,optional:OPTIONAL.includes(id),checks:{},observations:{}};});
 return s;
}
function rec(id){return ensure()?.activities[id];}
function save(){H.state.save();H.emit('state',{type:'journey'});}
function complete(id){const r=rec(id);return !!r?.completed&&(!H.routePass?.required(id)||!!r.routePass);}
function mainProgress(){return {done:MAIN.filter(complete).length,total:MAIN.length};}
function readyOrder(id){const i=MAIN.indexOf(id);return i<1||MAIN.slice(0,i).every(complete);}
function requirements(id){
 const r=rec(id);if(!r)return false;
 if(id==='g2')return !!(r.real&&r.explained&&r.observations.result&&r.observations.trials?.some(t=>t.unclear||(t.thin!==''&&t.thick!==''&&Number.isFinite(+t.thin)&&Number.isFinite(+t.thick)&&+t.thin>=0&&+t.thick>=0)));
 if(id==='g5')return !!(r.checks.closed&&r.explained&&r.observations.prediction&&r.observations.slit&&r.observations.plates&&r.checks.compared);
 if(id==='8421')return ['prepared','stored','read','swapped'].every(k=>r.checks[k])&&r.explained;
 return r.real&&(id==='compass'||r.explained);
}
async function finish(id){
 if(!requirements(id)||!readyOrder(id))return false;
 const r=rec(id);
 if(['g1','g2','g3'].includes(id)&&!r.showObserved){
  r.confirmed=true;save();close();
  const seen=await H.deviceShow?.play(id);
  if(!seen){H.ui.toast('장치 시연을 끝까지 본 뒤 다음으로 진행해요.');return false;}
  r.showObserved=true;r.digital=true;save();
 }
 if(H.routePass?.required(id)&&!r.routePass){open(id);return false;}
 const was=r.completed;r.completed=true;
 if(id==='g5'||id==='8421')r.real=true;
 const n=nums[id];if(n&&H.S.passed.indexOf(n)<0)H.S.passed.push(n);
 const card=id==='compass'?4:(n>0&&n<=5?n:0);if(card&&!H.S.cards.includes(card))H.S.cards.push(card);
 save();close();
 if(!was)H.ui.toast(OPTIONAL.includes(id)?'자유 체험을 기록했습니다. 본 체험 안내는 그대로 유지됩니다.':titles[id]+' · 실물 활동 확인',{ms:3300});
 if(!was&&id==='8421'&&MAIN.every(complete))setTimeout(()=>{if(!J.busy&&!H.ui.isOpen())H.ui.ending();},120);
 return true;
}
function nextTarget(){
 if(!H.S)return null;
 const id=MAIN.find(id=>!complete(id));if(!id)return null;
 const r=rec(id),n=nums[id];
 if(H.routePass?.required(id)&&r.showObserved&&!r.routePass){const p=H.map?.forks[n]?.back;if(p)return {id,key:'route:'+id,kind:'route',n,x:p.x,z:p.z,yaw:p.yaw||0,label:titles[id]+' · 답을 고르고 암호 말하기',action:()=>open(id)};}
 const special=H.map?.journeySpots?.[id];
 const p=special||H.flow.spots.gate[n]||{x:-650,z:2420,yaw:Math.PI};
 const action=id==='8421'?'8421 활동 안내':id==='g6'?'회로 제작 안내':id==='compass'?'출발 안내 확인':'연구원에게 말 걸기';
 return {id,key:'activity:'+id,x:p.x,z:p.z,yaw:p.yaw||0,n,kind:'activity',label:titles[id]+(r.visited?' · 실물 활동 확인':' · '+action),action};
}
function check(key,text,checked){return '<label class="j-check"><input type="checkbox" data-check="'+key+'" '+(checked?'checked':'')+'><span>'+text+'</span></label>';}
function select(key,label,values,value){return '<label class="j-field">'+label+'<select data-field="'+key+'"><option value="">선택해 주세요</option>'+values.map(([v,t])=>'<option value="'+v+'" '+(value===v?'selected':'')+'>'+t+'</option>').join('')+'</select></label>';}
function build(){
 if(overlay)return;
 overlay=document.createElement('section');overlay.id='journeyDialog';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','journeyTitle');
 overlay.innerHTML='<div class="j-sheet"><header class="j-head"><img src="lab/cards/hnr-tech-mark.webp" width="44" height="44" alt="HNR TECH"><div><b>HNR Tech Inc.</b><small>2026 서울STEM축제 · 해누리중학교</small></div><button type="button" id="journeyClose" aria-label="활동 안내 닫기">닫기 ×</button></header><div class="j-scroll"><h1 id="journeyTitle"></h1><div id="journeyBody"></div></div></div>';
 document.body.appendChild(overlay);body=document.getElementById('journeyBody');heading=document.getElementById('journeyTitle');document.getElementById('journeyClose').onclick=close;
 overlay.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const focus=[...overlay.querySelectorAll('button,input,select,a,summary')].filter(el=>!el.disabled&&el.getClientRects().length);const a=focus[0],b=focus.at(-1);if(e.shiftKey&&document.activeElement===a){e.preventDefault();b.focus();}else if(!e.shiftKey&&document.activeElement===b){e.preventDefault();a.focus();}}});
 overlay.addEventListener('keyup',e=>e.stopPropagation());
}
function open(id,opt){
 if(!H.S)return false;if(id==='g4b')id='compass';
 if(!MAIN.includes(id)&&!OPTIONAL.includes(id)&&!['library','settings','records'].includes(id))return false;
 if(H.opening?.active||H.deviceShow?.active)return false;
 H.routePass?.stop();J.routeSide=opt?.side||null;
 build();if(!J.busy){priorFocus=document.activeElement;lockedBefore=H.player.locked;}
 J.busy=true;current=id;device=opt?.device||id;H.player.stop();H.player.locked=true;H.input.setJoy(0,0);Object.keys(H.input.keys).forEach(k=>H.input.keys[k]=false);
 const r=rec(id);if(r){r.visited=true;if(id==='g5'&&r.checks.closed&&r.explained&&['faster','similar'].includes(opt?.prediction))r.observations.prediction=opt.prediction;save();}
 overlay.hidden=false;document.body.classList.add('journey-open');render();document.getElementById('journeyClose').focus();return true;
}
function close(){
 if(!J.busy)return;J.busy=false;renderVersion++;overlay.hidden=true;document.body.classList.remove('journey-open');H.player.locked=lockedBefore;H.player.stop();H.input.setJoy(0,0);Object.keys(H.input.keys).forEach(k=>H.input.keys[k]=false);if(priorFocus?.isConnected)priorFocus.focus();H.emit('journey:close');
}
function physical(id,r){
 if(id==='compass')return '<button type="button" id="compassSetup">진행자 설정 · 나침반 방향과 암호</button>'+check('real','학생 연구원과 실물 나침반의 표시된 끝이 가리키는 방향을 확인했어요.',r.real);
 if(id==='8421')return check('prepared','네 회로를 서로 연결하지 않고 8·4·2·1로 놓고, S1을 놓은 채 S2로 충분히 비웠어요.',r.checks.prepared)+check('stored','8과 2의 S1만 눌러 충전하고 모든 버튼에서 손을 뗐어요.',r.checks.stored)+check('read','친구가 곧바로 S2만 하나씩 눌러, 켜진 순간의 자리 값을 더했어요.',r.checks.read)+check('swapped','역할을 바꾸어 0~15 중 다른 숫자를 저장하고 읽었어요.',r.checks.swapped)+check('explained','학생 연구원과 숫자가 어디에 남아 있었는지 이야기했어요.',r.explained);
 return check('real',id==='g6'?'실물 기억회로를 만들고 학생 연구원과 작동을 확인했어요.':'학생 연구원과 실물 실험을 했어요.',r.real)+check('explained','학생 연구원의 원리 설명을 들었어요.',r.explained);
}
function render(){
 const focused=document.activeElement,hadFocus=body.contains(focused),focusAttrs=['data-check','data-predict','data-field','id'].filter(k=>focused?.hasAttribute?.(k));
 const focusQuery=focusAttrs.map(k=>'['+k+'="'+focused.getAttribute(k)+'"]').join('');
 renderVersion++;const id=current;heading.textContent=titles[id]||({library:'원리 설명 자료실',settings:'진행자 설정 · 방향과 암호',records:'나의 연구 기록'}[id]);
 if(id==='library'){renderLibrary();return;}if(id==='records'){renderRecords();return;}if(id==='settings'){renderSettings();return;}
 const r=rec(id),intro=intros[id],required=!OPTIONAL.includes(id);
 let html='<p class="j-type">'+(required?'본 체험 '+(MAIN.indexOf(id)+1)+' / 6':'자유 체험 · 본 체험 완료 조건에 포함되지 않아요')+'</p><div class="j-speech"><b>'+intro[0]+'</b><p>'+intro[1]+'</p></div>';
 if(ensure().migrationNotice)html+='<p class="j-note">이전 관문·카드 기록은 보존되어 있어요. 새 본 체험 확인과 8421 완료 기록은 별도로 남겨요.</p>';
 html+='<div class="j-status"><span>안내 열람 '+(r.visited?'✓':'—')+'</span><span>화면 조작 '+(r.digital?'✓':'—')+'</span><span>실물 확인 '+(r.real?'✓':'—')+'</span><span>활동 완료 '+(complete(id)?'✓':'—')+'</span></div>';
 if(id==='g5'){html+=brakeHtml(r);}else{
  html+='<ol class="j-steps">'+(steps[id]||[]).map(s=>'<li>'+s+'</li>').join('')+'</ol>';
  if(safe[id])html+='<p class="j-safety"><b>안전 수칙</b> · '+safe[id]+'</p>';
  if(id==='g2')html+=staticHtml(r);
  if(id==='8421')html+='<p class="j-question">모두 꺼져 보였는데, 숫자는 어디에 남아 있었을까요?</p><div id="fourBitDemo"></div><p class="j-note">0~15를 나타내는 4비트 활동이에요. 아래 화면은 저장 상태 개념 모형이며 실제 배선도가 아니에요. 실물 세트 구성은 학생 연구원의 안내를 따라 주세요.</p>';
  html+='<h2>실물 활동 확인</h2>'+physical(id,r);
  if(H.routePass?.required(id)&&r.showObserved&&!r.routePass)html+='<div id="journeyRoute"></div>';
  if(r.routePass)html+='<p class="j-note">암호 확인 완료 · 선택한 통로가 열려 있어요.</p>';
 }
 html+='<div class="j-links"><a href="explain/'+links[id]+'.html" target="_blank" rel="noopener">원리 설명 HTML 열기 ↗</a><button type="button" id="allExplanations">전체 원리 자료</button>'+(id==='8421'?'<a href="lab/resources/8421-activity.html" target="_blank" rel="noopener">8421 활동 원고 ↗</a>':'')+'</div>';
 if(id!=='8421')html+='<button type="button" class="j-secondary" id="digitalTry">'+(id==='compass'?(device==='g4b'?'터널의 코일·나침반 모형 작동':'화면 나침반 작동'):id==='g5'?'닫힌 구리관 화면 모형 보기':'화면에서 장치 살펴보기')+'</button><p class="j-note">화면 조작은 실물 활동 완료로 기록되지 않아요.</p>';
 if(!readyOrder(id))html+='<p class="j-note">앞 활동을 확인한 뒤 다음 연구실로 진행해요. 본 체험은 안내 순서에 따라 기록해 주세요.</p>';
 html+='<div class="j-actions"><button type="button" id="finishActivity" class="j-primary">'+(complete(id)?'확인한 활동 닫기':['g1','g2','g3'].includes(id)?(r.showObserved?'장치 시연 다시 보기':'확인하고 장치 시연 보기'):'학생 연구원과 확인하고 기록')+'</button><button type="button" id="returnMain">본 체험 안내 보기</button></div><p id="jValidity" role="status"></p>';
 body.innerHTML=html;bindCommon(id,r);
 const routeHost=document.getElementById('journeyRoute');if(routeHost){H.routePass.mount(routeHost,id,r,(side,method)=>{if(!requirements(id)||!readyOrder(id))return false; r.routePass={side,method};finish(id);return true;});if(J.routeSide)routeHost.querySelector('[data-route="'+J.routeSide+'"]')?.click();}if(id==='g2')bindStatic(r);if(id==='g5')bindBrake(r);if(id==='8421')buildDemo();updateReady();
 if(hadFocus)(focusQuery&&body.querySelector(focusQuery)||document.getElementById('journeyClose')).focus({preventScroll:true});
}
function bindCommon(id,r){
 body.querySelectorAll('[data-check]').forEach(el=>el.onchange=()=>{const k=el.dataset.check;if(k==='real'||k==='explained')r[k]=el.checked;else r.checks[k]=el.checked;save();if(id==='g5'||document.getElementById('journeyRoute')){render();}else updateReady();});
 body.querySelectorAll('[data-field]').forEach(el=>el.onchange=()=>{r.observations[el.dataset.field]=el.value;save();if(document.getElementById('journeyRoute'))render();else updateReady();});
 document.getElementById('finishActivity').onclick=()=>{if(complete(id))close();else {if(r.showObserved&&!r.routePass&&H.routePass?.required(id))r.showObserved=false;finish(id);}};
 document.getElementById('returnMain').onclick=()=>{const next=MAIN.find(x=>!complete(x));next?open(next):open('records');};
 document.getElementById('allExplanations').onclick=()=>open('library');
 const setup=document.getElementById('compassSetup');if(setup)setup.onclick=()=>open('settings');
 const digital=document.getElementById('digitalTry');if(digital)digital.onclick=()=>{
  r.digital=true;save();if(id==='compass'){close();if(device==='g4b')H.missionWorld?.apparatus.g4b?.activate();else H.missionWorld?.departure?.demo();H.ui.toast('화면 나침반 작동 · 실물 방향은 학생 연구원과 별도로 확인해요.');return;}
  close();if(['g1','g2','g3'].includes(id)){H.deviceShow?.play(id);return;}if(H.sim?.defOf(id)&&!H.sim.defOf(id).placeholder)H.sim.open(id);else H.missionWorld?.apparatus[id]?.activate();
 };
}
function updateReady(){
 const r=rec(current),button=document.getElementById('finishActivity');if(!r||!button)return;
 button.disabled=!complete(current)&&(!requirements(current)||!readyOrder(current));
 document.getElementById('jValidity').textContent=complete(current)?'이 활동의 확인 기록이 저장되어 있어요.':r.showObserved&&H.routePass?.required(current)?'위 질문의 답을 고르고, 진행자가 알려 준 암호를 말해 주세요.':!readyOrder(current)?'본 체험 안내 순서의 앞 활동을 먼저 확인해 주세요.':requirements(current)?(['g1','g2','g3'].includes(current)?'확인 버튼을 누르면 장치를 고정 시점으로 관찰해요.':'실물 활동 확인 내용을 이 기기에 저장할 수 있어요.'):'실물 활동과 설명을 확인하고, 필요한 관찰 기록을 남겨 주세요.';
 const labels=body.querySelectorAll('.j-status span');if(labels[1])labels[1].textContent='화면 조작 '+(r.digital?'✓':'—');if(labels[2])labels[2].textContent='실물 확인 '+(r.real?'✓':'—');
}
function staticHtml(r){
 const o=r.observations;o.trials=o.trials||[{order:'thin-first',thin:'',thick:'',unclear:false}];
 return '<h2>움직이기 시작한 거리 기록</h2><p>속도가 아니라 <b>빨대와 캔 표면 사이의 거리(cm)</b>를 비교해요. 비교 순서는 회차마다 바꿀 수 있어요.</p>'+select('prediction','실험 전 예상',[['thin','가는 빨대가 더 멀리'],['thick','굵은 빨대가 더 멀리'],['similar','비슷할 것 같아요'],['unsure','아직 모르겠어요']],o.prediction)+'<div id="staticTrials">'+o.trials.map((t,i)=>'<fieldset class="j-trial"><legend>'+(i+1)+'회 비교</legend><label>비교 순서<select data-trial="'+i+'" data-part="order"><option value="thin-first" '+(t.order==='thin-first'?'selected':'')+'>가는 → 굵은</option><option value="thick-first" '+(t.order==='thick-first'?'selected':'')+'>굵은 → 가는</option></select></label><label>가는 빨대 (cm)<input type="number" min="0" max="200" step="0.1" data-trial="'+i+'" data-part="thin" value="'+esc(t.thin)+'"></label><label>굵은 빨대 (cm)<input type="number" min="0" max="200" step="0.1" data-trial="'+i+'" data-part="thick" value="'+esc(t.thick)+'"></label><label class="j-check"><input type="checkbox" data-trial="'+i+'" data-part="unclear" '+(t.unclear?'checked':'')+'>움직임이나 거리 판정이 어려웠어요.</label></fieldset>').join('')+'</div><button type="button" id="addTrial">순서를 바꾸어 한 번 더 기록</button>'+select('result','실제로 관찰한 결과',[['thin','가는 빨대가 더 먼 거리에서 움직이기 시작'],['thick','굵은 빨대가 더 먼 거리에서 움직이기 시작'],['similar','비슷함'],['unclear','차이가 뚜렷하지 않거나 판단하기 어려움']],o.result)+'<p class="j-note">굵기에 따른 고정 정답은 없어요. 이 활동은 축전용량을 측정하거나 비교하는 실험이 아니에요.</p>';
}
function bindStatic(r){body.querySelectorAll('[data-trial]').forEach(el=>el.oninput=el.onchange=()=>{const row=r.observations.trials[+el.dataset.trial];row[el.dataset.part]=el.type==='checkbox'?el.checked:el.value;save();updateReady();});document.getElementById('addTrial').onclick=()=>{const a=r.observations.trials;if(a.length>=6){H.ui.toast('한 활동에 여섯 회까지 기록할 수 있어요.');return;}a.push({order:a.at(-1).order==='thin-first'?'thick-first':'thin-first',thin:'',thick:'',unclear:false});save();render();};}
function brakeHtml(r){
 const o=r.observations,first=!!r.checks.closed,second=first&&r.explained,third=second&&o.prediction;
 return '<p class="j-safety"><b>안전 수칙</b> · '+safe.g5+'</p><h2>1. 닫힌 구리관 관찰</h2><p>실물 닫힌 구리관에서 자석이 천천히 내려오는 모습을 먼저 관찰해요.</p>'+check('closed','닫힌 구리관에서 자석의 움직임을 관찰했어요.',first)+(first?'<h2>2. 학생 연구원의 원리 설명</h2><p>움직이는 자석 → 구리관에 생기는 유도 전류 → 움직임을 늦추는 자기력을 설명 자료로 살펴봐요.</p>'+check('explained','학생 연구원의 설명을 들었어요.',r.explained):'')+(second?'<h2>3. 세로로 틈을 낸 관 예상</h2><p>위에서 아래까지 <b>세로로 틈을 낸 관 구간</b>에서는 어떻게 내려올까요? 아래 구리판 구간과 구분해요. 어느 예상을 골라도 관찰로 이어집니다.</p><div class="j-predictions"><button type="button" data-predict="faster" aria-pressed="'+(o.prediction==='faster')+'">닫힌 관보다 빠르게 내려갈 것 같아요</button><button type="button" data-predict="similar" aria-pressed="'+(o.prediction==='similar')+'">비슷하게 천천히 내려갈 것 같아요</button></div>':'')+(third?'<h2>4. 실제로 관찰하고 비교</h2><p>학생 연구원과 두 구간을 따로 관찰해요. 틈이 있다는 이유만으로 전류가 완전히 0이거나 자유낙하한다고 단정하지 않아요.</p>'+select('slit','세로 절개 관 구간: 닫힌 관과 비교',[['faster','더 빠르게 내려옴'],['similar','비슷하게 내려옴'],['slower','더 느리게 내려옴'],['unclear','판단하기 어려움']],o.slit)+select('plates','아래에서 마주 보는 구리판 두 장 사이',[['slow','느려지는 모습을 봄'],['fast','빠르게 지나감'],['unclear','판단하기 어려움']],o.plates)+check('compared','예상과 실제 결과를 학생 연구원과 비교했어요.',r.checks.compared)+'<p class="j-note">아래 구리판이 절개 틈의 양쪽을 전기적으로 연결한다고 가정하지 않아요. 기록은 실제 관찰한 내용으로 남겨요.</p>':'');
}
function bindBrake(r){body.querySelectorAll('[data-predict]').forEach(el=>el.onclick=()=>{r.observations.prediction=el.dataset.predict;save();render();});}
function buildDemo(){
 const host=document.getElementById('fourBitDemo'),values=[8,4,2,1],bits=[0,0,0,0],read=[null,null,null,null];let show=false;const v=renderVersion;
 host.innerHTML='<details><summary>화면으로 8421 연습 · 실물 완료와 별도</summary><p>각 상자는 독립된 기억회로의 개념 모형이에요. 실제 LED는 읽는 동안 켜져요. 화면에서는 읽기를 마치면 전하를 비우는 것으로 단순화했어요.</p><div class="j-bits">'+values.map((x,i)=>'<div class="j-bit"><b>'+x+' 자리</b><i class="j-led" id="bitLed'+i+'" aria-label="LED 꺼짐"></i><output id="bitState'+i+'">저장 상태 숨김</output><button type="button" data-write="'+i+'">S1 · 쓰기</button><button type="button" data-read="'+i+'">S2 · 읽기</button></div>').join('')+'</div><div class="j-links"><button type="button" id="clearBits">모두 비우기</button><button type="button" id="showBits">저장 상태 보기 · 개념</button></div><p id="bitSum" aria-live="polite">S1로 저장한 뒤 S2를 하나씩 눌러 보세요.</p></details>';
 const paint=()=>values.forEach((_,i)=>document.getElementById('bitState'+i).textContent=show?'저장 상태 '+bits[i]:'저장 상태 숨김');
 const touch=()=>{rec('8421').digital=true;save();updateReady();};
 host.querySelectorAll('[data-write]').forEach(el=>el.onclick=()=>{const i=+el.dataset.write;bits[i]=1;read[i]=null;touch();paint();});
 host.querySelectorAll('[data-read]').forEach(el=>el.onclick=()=>{const i=+el.dataset.read,value=bits[i],led=document.getElementById('bitLed'+i);if(read[i]===null)read[i]=value;led.classList.toggle('lit',!!value);led.setAttribute('aria-label',value?'LED 켜짐':'LED 꺼짐');bits[i]=0;touch();paint();const seen=values.filter((_,j)=>read[j]===1);document.getElementById('bitSum').textContent='지금까지 켜진 자리: '+(seen.join(' + ')||'없음')+' → '+seen.reduce((a,b)=>a+b,0);setTimeout(()=>{if(v===renderVersion){led.classList.remove('lit');led.setAttribute('aria-label','LED 꺼짐');}},1000);});
 document.getElementById('clearBits').onclick=()=>{bits.fill(0);read.fill(null);host.querySelectorAll('.j-led').forEach(el=>el.classList.remove('lit'));document.getElementById('bitSum').textContent='네 회로를 비웠어요. 새 숫자를 저장해 보세요.';touch();paint();};
 document.getElementById('showBits').onclick=()=>{show=!show;paint();};
}
function renderLibrary(){body.innerHTML='<p>현장에서 체험하는지와 관계없이 모든 원리 설명을 열 수 있어요.</p><div class="j-library">'+['g1','g2','g3','g4a','compass','g5','g6'].map(id=>'<a href="explain/'+links[id]+'.html" target="_blank" rel="noopener"><b>'+titles[id]+'</b><span>원리 · 애니메이션 · 심화 설명 ↗</span></a>').join('')+'<a href="lab/resources/8421-activity.html" target="_blank" rel="noopener"><b>8·4·2·1 활동 원고</b><span>네 회로의 준비·저장·읽기 ↗</span></a><a href="academy/" target="_blank" rel="noopener"><b>운영 학생 학습 공간</b><span>설명 연습과 자료 ↗</span></a></div><button type="button" id="toRecords">나의 기록 보기</button> <button type="button" id="staffSettings">진행자 설정</button>';document.getElementById('toRecords').onclick=()=>open('records');document.getElementById('staffSettings').onclick=()=>open('settings');}
function renderRecords(){const s=ensure();body.innerHTML='<h2>본 체험 '+mainProgress().done+' / 6</h2><div class="j-library">'+[...MAIN,...OPTIONAL].map(id=>'<button type="button" data-activity="'+id+'"><b>'+(complete(id)?'✓ ':'○ ')+titles[id]+'</b><span>'+(OPTIONAL.includes(id)?'자유 체험':'본 체험')+' · 안내 '+(rec(id).visited?'✓':'—')+' · 화면 '+(rec(id).digital?'✓':'—')+' · 실물 '+(rec(id).real?'✓':'—')+'</span></button>').join('')+'</div><details><summary>이전 버전 기록 · 보존됨</summary><p>완료 관문: '+(s.legacy.passed.join(', ')||'없음')+' / 연구 카드: '+(s.legacy.cards.join(', ')||'없음')+'</p><p>이 기록만으로 새 실물 활동이나 8421을 완료 처리하지 않습니다.</p></details>';body.querySelectorAll('[data-activity]').forEach(el=>el.onclick=()=>open(el.dataset.activity));}
function renderSettings(){const angle=Number(localStorage.getItem('hnr.compass.heading')||26);body.innerHTML='<p>실물 나침반의 위치와 코일 방향은 현장에서 조정해 주세요. 표시된 바늘 끝과 첫 실험대에는 같은 파란색 ★ 기호를 붙여 주세요.</p><p>아래 설정은 <b>이 기기의 화면 나침반 표시 방향</b>만 바꿉니다. 실물 장치를 제어하거나 체험을 완료하지 않습니다.</p><label class="j-field">화면 표시 방향 (0~359°)<input id="compassAngle" type="number" min="0" max="359" value="'+angle+'"></label><button type="button" id="saveCompass">화면 방향 적용</button>';H.routePass?.settings(body);document.getElementById('saveCompass').onclick=()=>{const a=Number(document.getElementById('compassAngle').value);if(!Number.isFinite(a)||a<0||a>359)return;localStorage.setItem('hnr.compass.heading',String(a));H.missionWorld?.departure?.setDirection(a*Math.PI/180);H.ui.toast('이 기기의 화면 나침반 방향을 적용했습니다.');};}

// Keep the old save fields intact; new progression is deliberately independent.
const gateIds={1:'g1',2:'g2',3:'g3',4:'g4a',5:'g5',6:'g6'};
H.state.gatePassed=n=>n===6?complete('g6')&&complete('8421'):complete(gateIds[n]);
H.state.forkSolved=n=>n===1||n===2?!!rec('g'+n)?.routePass:true;
H.state.nextGate=()=>{const id=MAIN.find(x=>!complete(x));return id?nums[id]||1:7;};
H.state.passGate=()=>Promise.resolve(false); // Simulation success alone cannot confirm a real activity.
H.flow.gate=n=>open(gateIds[n]);H.flow.pass=n=>open(gateIds[n]);
H.flow.fork=(n,side)=>open(n===5?'g5':gateIds[n],n===5?{prediction:side==='L'?'faster':'similar'}:{side});
H.flow.nextTarget=nextTarget;
H.flow.suggestSpawn=()=>{const t=nextTarget();return t?{x:t.x,z:t.z,yaw:t.yaw}:H.flow.spots.ending;};
H.on('zone',zone=>{const s=ensure();if(s&&zone&&!s.rooms[zone.id]){s.rooms[zone.id]=true;H.state.save();}});
H.on('sim:enter',ctx=>{const id=ctx?.id||H.sim?.active?.id;if(rec(id)){rec(id).digital=true;save();}});
H.on('start',()=>{
 ensure();H.flow.guideAuto();
 // Original badges now open the corresponding main activity instead of obsolete gate questions.
 document.getElementById('badges')?.addEventListener('click',e=>{const b=e.target.closest('[data-n]');if(b&&!H.ui.isOpen())open(MAIN[+b.dataset.n-1]);});
});
})();
