/* HNR Tech Inc. · Interview journey. Local records only; no visitor analytics. */
(function(){
'use strict';
const H=window.HNR, MAIN=['g1','g2','g3','g6','8421'], REVIEW=['g4a','g5'];
const titles={g1:'정문 · 사람 회로',g2:'클린룸 · 빨대와 캔',g3:'암실 · 전선 없이 형광등 켜기',g4a:'입구 로비 · 코일기차 돌아보기',g5:'입구 로비 · 전자기 브레이크 돌아보기',g6:'중앙 연구실 · 1비트 기억회로 제작','8421':'[최종 면접] 4비트 이진수 연산 테스트'};
const links={g1:'energy',g2:'static',g3:'plasma',g4a:'train',g5:'eddy',g6:'dram','8421':'dram'};
const nums={g1:1,g2:2,g3:3,g4a:4,g5:5,g6:6,'8421':6};
const intros={
 g1:['게이트봇','면접 방문객을 확인했습니다. 손을 이어 출입 장치를 작동시켜 보십시오. 한 사람이 손을 놓으면 어떻게 될까요?'],
 g2:['먼지제로 반장','면접실 가는 길이구나? 이 캔을 손대지 않고 옮겨 볼래? 가는 빨대와 굵은 빨대도 비교해 보자.'],
 g3:['깜빡이','플라즈마볼 가까이 가져간 에너지스틱에 불이 들어왔어! 빠르게 변하는 전기장의 영향으로 작은 전류를 감지한 거야. 그렇다면 전선을 연결하지 않은 형광등을 켜려면 어떻게 해야 할까? 빛나는 자리를 찾으면 바로 기억회로 제작실로 갈 수 있어.'],
 g4a:['찌릿 기관사','입구에서 앞서 경험한 코일기차를 돌아보자. 건전지와 자석이 코일 속에서 움직였지? 이제 정문 사람 회로부터 차례로 출발해.'],
 g5:['터널지기','입구에서 앞서 경험한 전자기 브레이크를 돌아보세. 구리관 속 자석의 낙하가 느려졌지. 이 전시는 이동 관문이 아니네.'],
 g6:['소장','면접 보러 오는 길에 벌써 실험을 하고 왔다고? 직접 만든 것도 하나 보고 싶군. 전기로 기억 한 칸을 만들어 보세.'],
 '8421':['소장','최종 면접일세! 감독관이 제시하는 비밀 숫자를 네 회로의 0과 1로 출력해 보게. 왼쪽부터 8·4·2·1, 불이 켜진 자리만 더하면 되네. 회로끼리는 연결하지 않네.']
};
const steps={
 g1:['양 끝 사람이 에너지스틱의 양쪽 금속 부분을 하나씩 잡아요.','옆 사람과 손을 이어 불과 소리를 확인해요.','한 사람이 손을 놓았다가 다시 이으며 비교해요.'],
 g2:['같은 재질·길이의 가는 빨대와 굵은 빨대, 같은 캔과 바닥을 사용해요.','문지르는 범위·방법·횟수, 문지른 뒤 시간, 잡는 위치와 접근 방법을 맞춰요.','빨대를 먼 곳에서 천천히 가까이 가져가요. 캔이 처음 움직인 순간의 빨대–캔 표면 사이 거리를 비교해요.','비교 순서를 바꾸어 반복해도 좋아요. 비슷하거나 차이가 뚜렷하지 않은 결과도 기록해요.'],
 g3:['연구원이 플라즈마볼 가까이 가져간 에너지스틱에 불이 들어오는 모습을 보여 줘요.','형광등을 켜려면 어떻게 해야 할까요? 형광등을 가로로 눕혀 긴 옆면이 볼을 향하게 들어요.','멀리서 천천히 가까이 가져갔다가 다시 멀리 움직이며 빛을 비교해요.'],
 g4a:['앞서 코일 속에서 움직였던 건전지와 자석 열차를 떠올려요.','아래 화면 장치와 원리 설명으로 전류와 자기장이 만든 움직임을 다시 살펴봐요.'],
 g5:['앞서 관찰한 구리관 속 자석의 움직임을 떠올려요.','움직이는 자석이 구리관에 유도 전류를 만들고, 그 전류의 자기력이 낙하를 늦춰요.','아래 화면 장치와 원리 자료로 다시 살펴볼 수 있어요.'],
 g6:['최신 제작 도안과 학생 연구원의 안내에 따라 1비트 기억회로를 만들어요.','전원 연결과 LED·축전기의 방향을 함께 확인해요.','S1(쓰기)과 S2(읽기)의 역할을 확인하고, 완성 회로의 작동을 점검받아요.'],
 '8421':['준비: 네 회로를 왼쪽부터 8·4·2·1로 놓아요. 두 사람은 같은 방향에서 번갈아 조작해요. S1은 놓고, 네 회로 모두 S2를 충분히 눌러 비워요.','저장: 감독관의 비밀 숫자가 11이라면 8·2·1 자리의 S1만 눌러 충전해요. 4 자리는 비워 두고 모든 버튼에서 손을 떼요.','출력: 곧바로 각 S2만 하나씩 눌러요. 켜지면 1, 꺼져 있으면 0이에요. 1·0·1·1이면 8+2+1=11, 미션 성공!','교대: 역할을 바꾸고 0~15 중 새로운 비밀 숫자로 다시 도전해요.']
};
const safe={g1:'에너지스틱으로만 실험해요. 콘센트 전기로 하지 않아요.',g3:'유리관은 학생 연구원과 조심히 다뤄요. 금속 끝부분을 볼에 대지 않아요.',g4a:'건전지가 뜨거워지면 즉시 멈추고 학생 연구원에게 알려요.',g5:'강한 자석 사이에 손가락이 끼지 않도록 학생 연구원과 함께 다뤄요.',g6:'전원을 연결하기 전에 회로와 부품 방향을 학생 연구원과 확인해요.'};
const J=H.journey={version:2,order:MAIN,shortLabels:['사람 회로','정전기','플라즈마','회로 제작','8421'],busy:false,ensure,open,close,complete,ready:readyOrder,available:id=>complete(id)||readyOrder(id),confirm:finish,mainProgress,nextTarget,continueNext,records:()=>ensure(),library:()=>open('library'),settings:()=>open('settings')};
J.brand=new Image();J.brand.src='lab/cards/hnr-tech-mark.webp';
let overlay,body,heading,priorFocus,lockedBefore=false,current='',device='',completedActivity='',renderVersion=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ensure(){
 if(!H.S)return null;
 if(!H.S.journey){H.S.journey={version:2,activities:{},rooms:{},legacy:{passed:(H.S.passed||[]).slice(),forks:(H.S.forks||[]).slice(),cards:(H.S.cards||[]).slice()},migrationNotice:!!H.S.passed?.length};H.state.save();}
 const s=H.S.journey;s.activities=s.activities||{};s.rooms=s.rooms||{};s.version=2;
 s.legacy=s.legacy||{passed:(H.S.passed||[]).slice(),forks:(H.S.forks||[]).slice(),cards:(H.S.cards||[]).slice()};
 ['passed','forks','cards'].forEach(key=>{if(!Array.isArray(s.legacy[key]))s.legacy[key]=[];});
 [...MAIN,...REVIEW].forEach(id=>{if(!s.activities[id])s.activities[id]={visited:false,digital:false,real:false,explained:false,completed:false,optional:REVIEW.includes(id),checks:{},observations:{}};const r=s.activities[id];r.checks=r.checks||{};r.observations=r.observations||{};});
 // Preserve activities completed before the plasma passphrase was introduced.
 if(s.passphraseVersion!==2){
  const plasma=s.activities.g3;
  if(plasma.completed&&!plasma.routePass)plasma.routePass={side:'L',method:'previous-completion'};
  s.passphraseVersion=2;H.state.save();
 }
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
 if(id==='8421')return ['prepared','stored','read','swapped'].every(k=>r.checks[k])&&r.explained;
 return r.real&&r.explained;
}
async function finish(id){
 if(!MAIN.includes(id)||!requirements(id)||!readyOrder(id))return false;
 const r=rec(id);
 if(['g1','g2','g3'].includes(id)&&!r.showObserved){
  r.confirmed=true;save();close();
  const seen=await H.deviceShow?.play(id);
  if(!seen){H.ui.toast('장치 시연을 끝까지 본 뒤 다음으로 진행해요.');return false;}
  r.showObserved=true;r.digital=true;save();
 }
 if(H.routePass?.required(id)&&!r.routePass){open(id);return false;}
 const was=r.completed;r.completed=true;
 if(id==='8421')r.real=true;
 const n=nums[id];if(n&&H.S.passed.indexOf(n)<0)H.S.passed.push(n);
 const card=n>0&&n<=3?n:0;if(card&&!H.S.cards.includes(card))H.S.cards.push(card);
 save();close();
 if(!was)H.emit('journey:complete',{id,nextTarget:nextTarget()});
 showCompletion(id);
 return true;
}
function nextTarget(){
 if(!H.S)return null;
 const id=MAIN.find(id=>!complete(id));if(!id)return null;
 const r=rec(id),n=nums[id];
 if(H.routePass?.required(id)&&r.showObserved&&!r.routePass){const p=H.map?.forks[n]?.back;if(p)return {id,key:'route:'+id,kind:'route',n,x:p.x,z:p.z,yaw:p.yaw||0,label:titles[id]+' · 답을 고르고 암호 입력하기',action:()=>open(id)};}
 const special=H.map?.journeySpots?.[id];
 const p=special||H.flow.spots.gate[n]||{x:-650,z:2420,yaw:Math.PI};
 const action=id==='8421'?'8421 활동 안내':id==='g6'?'회로 제작 안내':'연구원에게 말 걸기';
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
 if(!H.S)return false;
 if(MAIN.includes(id)&&!complete(id)&&!readyOrder(id)){const next=nextTarget();H.ui.toast('먼저 '+(next?titles[next.id]:'앞 활동')+' 활동을 마쳐 주세요. 다음 장소 안내를 따라 순서대로 이동해요.',{ms:3500});return false;}
 if(!MAIN.includes(id)&&!REVIEW.includes(id)&&!['library','settings','records','complete'].includes(id))return false;
 if(H.opening?.active||H.deviceShow?.active)return false;
 H.routePass?.stop();J.routeSide=opt?.side||null;
 build();if(!J.busy){priorFocus=document.activeElement;lockedBefore=H.player.locked;}
 J.busy=true;current=id;device=opt?.device||id;H.player.stop();H.player.locked=true;H.input.setJoy(0,0);Object.keys(H.input.keys).forEach(k=>H.input.keys[k]=false);
 const r=rec(id);if(r){r.visited=true;save();}
 overlay.hidden=false;document.body.classList.add('journey-open');render();document.getElementById('journeyClose').focus();return true;
}
function close(){
 if(!J.busy)return;J.busy=false;renderVersion++;overlay.hidden=true;document.body.classList.remove('journey-open');H.player.locked=lockedBefore;H.player.stop();H.input.setJoy(0,0);Object.keys(H.input.keys).forEach(k=>H.input.keys[k]=false);if(priorFocus?.isConnected)priorFocus.focus();H.emit('journey:close');
}
function physical(id,r){
 if(id==='8421')return check('prepared','네 회로를 서로 연결하지 않고 8·4·2·1로 놓고, S1을 놓은 채 S2로 충분히 비웠어요.',r.checks.prepared)+check('stored','감독관의 비밀 숫자에 필요한 자리만 S1으로 충전하고 모든 버튼에서 손을 뗐어요.',r.checks.stored)+check('read','S2로 읽은 4비트 신호를 확인하고 켜진 자리의 합이 비밀 숫자와 같은지 확인했어요.',r.checks.read)+check('swapped','역할을 바꾸어 0~15 중 다른 숫자를 저장하고 읽었어요.',r.checks.swapped)+check('explained','학생 연구원과 숫자가 어디에 남아 있었는지 이야기했어요.',r.explained);
 return check('real',id==='g6'?'실물 기억회로를 만들고 학생 연구원과 작동을 확인했어요.':'학생 연구원과 실물 실험을 했어요.',r.real)+check('explained','학생 연구원의 원리 설명을 들었어요.',r.explained);
}
function render(){
 const focused=document.activeElement,hadFocus=body.contains(focused),focusAttrs=['data-check','data-predict','data-field','id'].filter(k=>focused?.hasAttribute?.(k));
 const focusQuery=focusAttrs.map(k=>'['+k+'="'+focused.getAttribute(k)+'"]').join('');
 renderVersion++;const id=current;heading.textContent=titles[id]||({library:'원리 설명 자료실',settings:'진행자 설정 · 통과 암호',records:'나의 연구 기록',complete:'미션 완료!'}[id]);
 if(id==='library'){renderLibrary();return;}if(id==='records'){renderRecords();return;}if(id==='settings'){renderSettings();return;}if(id==='complete'){renderCompletion();return;}if(REVIEW.includes(id)){renderReview(id);return;}
 const r=rec(id),intro=intros[id];
 let html='<p class="j-type">'+('본 체험 '+(MAIN.indexOf(id)+1)+' / '+MAIN.length)+'</p><div class="j-speech"><b>'+intro[0]+'</b><p>'+intro[1]+'</p></div>';
 if(ensure().migrationNotice)html+='<p class="j-note">이전 관문·카드 기록은 보존되어 있어요. 새 본 체험 확인과 8421 완료 기록은 별도로 남겨요.</p>';
 html+='<div class="j-status"><span>안내 열람 '+(r.visited?'✓':'—')+'</span><span>화면 조작 '+(r.digital?'✓':'—')+'</span><span>실물 확인 '+(r.real?'✓':'—')+'</span><span>활동 완료 '+(complete(id)?'✓':'—')+'</span></div>';
 {
  html+='<ol class="j-steps">'+(steps[id]||[]).map(s=>'<li>'+s+'</li>').join('')+'</ol>';
  if(safe[id])html+='<p class="j-safety"><b>안전 수칙</b> · '+safe[id]+'</p>';
  if(id==='g2')html+=staticHtml(r);
  if(id==='8421')html+='<p class="j-question">비밀 숫자를 4개의 회로 신호로 출력할 수 있나요?</p><div id="fourBitDemo"></div><p class="j-note">0~15를 나타내는 4비트 활동이에요. 아래 화면은 저장 상태 개념 모형이며 실제 배선도가 아니에요. 실물 세트 구성은 학생 연구원의 안내를 따라 주세요.</p>';
  html+='<h2>실물 활동 확인</h2>'+physical(id,r);
  if(H.routePass?.required(id)&&r.showObserved&&!r.routePass)html+='<div id="journeyRoute"></div>';
  if(r.routePass)html+='<p class="j-note">'+(id==='g3'?'기억회로 제작실로 가는 문이 열려 있어요.':'암호 확인 완료 · 선택한 통로가 열려 있어요.')+'</p>';
 }
 html+='<div class="j-links"><a href="explain/'+links[id]+'.html" target="_blank" rel="noopener">원리 설명 HTML 열기 ↗</a><button type="button" id="allExplanations">전체 원리 자료</button>'+(id==='8421'?'<a href="lab/resources/8421-activity.html" target="_blank" rel="noopener">최종 면접 · 8421 안내 ↗</a>':'')+'</div>';
 if(id!=='8421')html+='<button type="button" class="j-secondary" id="digitalTry">'+'화면에서 장치 살펴보기'+'</button><p class="j-note">화면 조작은 실물 활동 완료로 기록되지 않아요.</p>';
 if(!readyOrder(id))html+='<p class="j-note">앞 활동을 확인한 뒤 다음 연구실로 진행해요. 본 체험은 안내 순서에 따라 기록해 주세요.</p>';
 html+='<div class="j-actions"><button type="button" id="finishActivity" class="j-primary">'+(complete(id)?'다음 장소 안내 보기':['g1','g2','g3'].includes(id)?(r.showObserved?'장치 시연 다시 보기':'확인하고 장치 시연 보기'):'학생 연구원과 확인하고 기록')+'</button><button type="button" id="returnMain">본 체험 안내 보기</button></div><p id="jValidity" role="status"></p>';
 body.innerHTML=html;bindCommon(id,r);
 const routeHost=document.getElementById('journeyRoute');if(routeHost){H.routePass.mount(routeHost,id,r,(side,method)=>{if(!requirements(id)||!readyOrder(id))return false; r.routePass={side,method};finish(id);return true;});if(J.routeSide)routeHost.querySelector('[data-route="'+J.routeSide+'"]')?.click();}if(id==='g2')bindStatic(r);if(id==='8421')buildDemo();updateReady();
 if(hadFocus)(focusQuery&&body.querySelector(focusQuery)||document.getElementById('journeyClose')).focus({preventScroll:true});
}
function bindCommon(id,r){
 body.querySelectorAll('[data-check]').forEach(el=>el.onchange=()=>{const k=el.dataset.check;if(k==='real'||k==='explained')r[k]=el.checked;else r.checks[k]=el.checked;save();if(document.getElementById('journeyRoute')){render();}else updateReady();});
 body.querySelectorAll('[data-field]').forEach(el=>el.onchange=()=>{r.observations[el.dataset.field]=el.value;save();if(document.getElementById('journeyRoute'))render();else updateReady();});
 document.getElementById('finishActivity').onclick=()=>{if(complete(id))showCompletion(id);else {if(r.showObserved&&!r.routePass&&H.routePass?.required(id))r.showObserved=false;finish(id);}};
 document.getElementById('returnMain').onclick=()=>{const next=MAIN.find(x=>!complete(x));next?open(next):open('records');};
 document.getElementById('allExplanations').onclick=()=>open('library');
 const digital=document.getElementById('digitalTry');if(digital)digital.onclick=()=>{
  r.digital=true;save();
  close();if(['g1','g2','g3'].includes(id)){H.deviceShow?.play(id);return;}if(H.sim?.defOf(id)&&!H.sim.defOf(id).placeholder)H.sim.open(id);else H.missionWorld?.apparatus[id]?.activate();
 };
}
function updateReady(){
 const r=rec(current),button=document.getElementById('finishActivity');if(!r||!button)return;
 button.disabled=!complete(current)&&(!requirements(current)||!readyOrder(current));
 document.getElementById('jValidity').textContent=complete(current)?'이 활동의 확인 기록이 저장되어 있어요.':r.showObserved&&H.routePass?.required(current)?'위 질문의 답을 고르고, 진행자가 알려 준 암호를 타이핑하거나 말해 주세요.':!readyOrder(current)?'본 체험 안내 순서의 앞 활동을 먼저 확인해 주세요.':requirements(current)?(['g1','g2','g3'].includes(current)?'확인 버튼을 누르면 장치를 고정 시점으로 관찰해요.':'실물 활동 확인 내용을 이 기기에 저장할 수 있어요.'):'실물 활동과 설명을 확인하고, 필요한 관찰 기록을 남겨 주세요.';
 const labels=body.querySelectorAll('.j-status span');if(labels[1])labels[1].textContent='화면 조작 '+(r.digital?'✓':'—');if(labels[2])labels[2].textContent='실물 확인 '+(r.real?'✓':'—');
}
function staticHtml(r){
 const o=r.observations;o.trials=o.trials||[{order:'thin-first',thin:'',thick:'',unclear:false}];
 return '<h2>움직이기 시작한 거리 기록</h2><p>속도가 아니라 <b>빨대와 캔 표면 사이의 거리(cm)</b>를 비교해요. 비교 순서는 회차마다 바꿀 수 있어요.</p>'+select('prediction','실험 전 예상',[['thin','가는 빨대가 더 멀리'],['thick','굵은 빨대가 더 멀리'],['similar','비슷할 것 같아요'],['unsure','아직 모르겠어요']],o.prediction)+'<div id="staticTrials">'+o.trials.map((t,i)=>'<fieldset class="j-trial"><legend>'+(i+1)+'회 비교</legend><label>비교 순서<select data-trial="'+i+'" data-part="order"><option value="thin-first" '+(t.order==='thin-first'?'selected':'')+'>가는 → 굵은</option><option value="thick-first" '+(t.order==='thick-first'?'selected':'')+'>굵은 → 가는</option></select></label><label>가는 빨대 (cm)<input type="number" min="0" max="200" step="0.1" data-trial="'+i+'" data-part="thin" value="'+esc(t.thin)+'"></label><label>굵은 빨대 (cm)<input type="number" min="0" max="200" step="0.1" data-trial="'+i+'" data-part="thick" value="'+esc(t.thick)+'"></label><label class="j-check"><input type="checkbox" data-trial="'+i+'" data-part="unclear" '+(t.unclear?'checked':'')+'>움직임이나 거리 판정이 어려웠어요.</label></fieldset>').join('')+'</div><button type="button" id="addTrial">순서를 바꾸어 한 번 더 기록</button>'+select('result','실제로 관찰한 결과',[['thin','가는 빨대가 더 먼 거리에서 움직이기 시작'],['thick','굵은 빨대가 더 먼 거리에서 움직이기 시작'],['similar','비슷함'],['unclear','차이가 뚜렷하지 않거나 판단하기 어려움']],o.result)+'<p class="j-note">굵기에 따른 고정 정답은 없어요. 이 활동은 축전용량을 측정하거나 비교하는 실험이 아니에요.</p>';
}
function bindStatic(r){body.querySelectorAll('[data-trial]').forEach(el=>el.oninput=el.onchange=()=>{const row=r.observations.trials[+el.dataset.trial];row[el.dataset.part]=el.type==='checkbox'?el.checked:el.value;save();updateReady();});document.getElementById('addTrial').onclick=()=>{const a=r.observations.trials;if(a.length>=6){H.ui.toast('한 활동에 여섯 회까지 기록할 수 있어요.');return;}a.push({order:a.at(-1).order==='thin-first'?'thick-first':'thin-first',thin:'',thick:'',unclear:false});save();render();};}
function buildDemo(){
 const host=document.getElementById('fourBitDemo'),values=[8,4,2,1],bits=[0,0,0,0],read=[null,null,null,null];let show=false;const v=renderVersion;
 host.innerHTML='<details><summary>비밀 숫자 11 출력 연습 · 실물 완료와 별도</summary><p>목표는 <b>11</b>! 8·4·2·1에서 켜진 자리만 더해요. 각 상자는 독립된 기억회로의 개념 모형이에요. 실제 LED는 읽는 동안 켜져요. 화면에서는 읽기를 마치면 전하를 비우는 것으로 단순화했어요.</p><div class="j-bits">'+values.map((x,i)=>'<div class="j-bit"><b>'+x+' 자리</b><i class="j-led" id="bitLed'+i+'" aria-label="LED 꺼짐"></i><output id="bitState'+i+'">저장 상태 숨김</output><button type="button" data-write="'+i+'">S1 · 쓰기</button><button type="button" data-read="'+i+'">S2 · 읽기</button></div>').join('')+'</div><div class="j-links"><button type="button" id="clearBits">모두 비우기</button><button type="button" id="showBits">저장 상태 보기 · 개념</button></div><p id="bitSum" aria-live="polite">목표 11 · S1로 저장한 뒤 S2를 하나씩 눌러 신호 1011을 만들어 보세요.</p></details>';
 const summary=()=>{const seen=values.filter((_,j)=>read[j]===1),total=seen.reduce((a,b)=>a+b,0),allRead=read.every(x=>x!==null),code=read.map(x=>x===null?'—':x).join(' ');document.getElementById('bitSum').textContent='읽은 신호 [ '+code+' ] · '+(seen.join(' + ')||'0')+' = '+total+(allRead?(total===11?' · 미션 성공!':' · 목표는 11이에요. 모두 비우고 다시 도전해요.'):' · 남은 자리도 읽어 주세요.');};
 const paint=()=>{values.forEach((_,i)=>document.getElementById('bitState'+i).textContent=show?'저장 상태 '+bits[i]:'저장 상태 숨김');summary();};
 const touch=()=>{rec('8421').digital=true;save();updateReady();};
 host.querySelectorAll('[data-write]').forEach(el=>el.onclick=()=>{const i=+el.dataset.write;bits[i]=1;read[i]=null;touch();paint();});
 host.querySelectorAll('[data-read]').forEach(el=>el.onclick=()=>{const i=+el.dataset.read,value=bits[i],led=document.getElementById('bitLed'+i);read[i]=value;led.classList.toggle('lit',!!value);led.setAttribute('aria-label',value?'LED 켜짐':'LED 꺼짐');bits[i]=0;touch();paint();setTimeout(()=>{if(v===renderVersion){led.classList.remove('lit');led.setAttribute('aria-label','LED 꺼짐');}},1000);});
 document.getElementById('clearBits').onclick=()=>{bits.fill(0);read.fill(null);host.querySelectorAll('.j-led').forEach(el=>{el.classList.remove('lit');el.setAttribute('aria-label','LED 꺼짐');});document.getElementById('bitSum').textContent='네 회로를 비웠어요. 목표 11을 다시 저장해 보세요.';touch();paint();};
 document.getElementById('showBits').onclick=()=>{show=!show;paint();};
}
function renderLibrary(){body.innerHTML='<p>본 체험 세 가지와 기억회로의 원리 설명을 모았어요. 코일기차와 전자기 브레이크는 입구 로비에서 앞서 경험한 실험을 돌아보는 자료예요.</p><div class="j-library">'+['g1','g2','g3','g6','g4a','g5'].map(id=>'<a href="explain/'+links[id]+'.html" target="_blank" rel="noopener"><b>'+titles[id]+'</b><span>원리 · 애니메이션 · 심화 설명 ↗</span></a>').join('')+'<a href="lab/resources/8421-activity.html" target="_blank" rel="noopener"><b>[최종 면접] 4비트 이진수 연산 테스트</b><span>비밀 숫자 → 4개 회로의 신호 ↗</span></a><a href="academy/" target="_blank" rel="noopener"><b>운영 학생 학습 공간</b><span>설명 연습과 자료 ↗</span></a></div><button type="button" id="toRecords">나의 기록 보기</button> <button type="button" id="staffSettings">진행자 설정</button>';document.getElementById('toRecords').onclick=()=>open('records');document.getElementById('staffSettings').onclick=()=>open('settings');}
function renderRecords(){const s=ensure();body.innerHTML='<h2>본 체험 '+mainProgress().done+' / '+MAIN.length+'</h2><p>사람 회로 → 정전기 → 플라즈마볼 → 회로 제작 → 8421 순서로 진행해요.</p><div class="j-library">'+MAIN.map((id,i)=>'<button type="button" data-activity="'+id+'" '+(!readyOrder(id)&&!complete(id)?'disabled':'')+'><b>'+(complete(id)?'✓ ':!readyOrder(id)?'잠김 · ':'○ ')+(i+1)+'. '+titles[id]+'</b><span>'+(complete(id)?'활동 완료':!readyOrder(id)?'앞 활동을 마치면 열려요':'지금 진행할 활동')+' · 화면 '+(rec(id).digital?'✓':'—')+' · 실물 '+(rec(id).real?'✓':'—')+'</span></button>').join('')+'</div><details><summary>이전 버전 기록 · 보존됨</summary><p>완료 관문: '+(s.legacy.passed.join(', ')||'없음')+' / 연구 카드: '+(s.legacy.cards.join(', ')||'없음')+'</p><p>이 기록만으로 새 실물 활동이나 8421을 완료 처리하지 않습니다.</p></details>';body.querySelectorAll('[data-activity]').forEach(el=>el.onclick=()=>open(el.dataset.activity));}
function renderSettings(){body.innerHTML='<p>관문마다 진행자가 알려 줄 암호를 설정해요. 참가자는 같은 암호를 타이핑하거나 마이크로 말할 수 있어요.</p>';H.routePass?.settings(body);}
function showCompletion(id){completedActivity=id;open('complete');}
async function continueNext(){
 close();
 if(!nextTarget()){H.ui.ending();return true;}
 if(H.cruise?.continueNext)return H.cruise.continueNext();
 H.emit('journey:continue',nextTarget());return false;
}
function renderCompletion(){
 const t=nextTarget(),done=mainProgress();
 heading.textContent=t?'미션 완료! 다음 장소로 가요':'첫 연구 프로젝트 완료!';
 body.innerHTML='<div class="j-complete"><p class="j-type">본 체험 '+done.done+' / '+done.total+' 완료</p><h2>'+esc(titles[completedActivity]||'활동')+'</h2><p>실물 활동과 원리 설명 확인이 저장되었어요.</p>'+(t?'<div class="j-next"><b>다음 장소</b><strong>'+esc(titles[t.id])+'</strong><p>'+(completedActivity==='g3'?'암실 실험을 마쳤어요. 바로 이어지는 회로 제작대로 이동해 기억 한 칸을 만들어요.':'아래 버튼을 누르면 캐릭터가 다음 장소까지 걸어서 안내해요.')+'</p></div>':'<p>학생 연구원과 완성한 작품을 확인하고 가져가세요.</p>')+'<button type="button" id="continueJourney" class="j-primary">'+(t?(t.id==='g6'?'회로 제작대로 걸어가기 →':'다음 장소로 걸어가기 →'):'완료 화면 보기')+'</button><button type="button" id="stayHere">이 자리에서 더 살펴보기</button></div>';
 document.getElementById('continueJourney').onclick=continueNext;document.getElementById('stayHere').onclick=close;
}
function renderReview(id){
 const r=rec(id),intro=intros[id];
 body.innerHTML='<p class="j-type">입구 로비 · 앞서 경험한 실험 돌아보기</p><div class="j-speech"><b>'+intro[0]+'</b><p>'+intro[1]+'</p></div><ol class="j-steps">'+steps[id].map(line=>'<li>'+line+'</li>').join('')+'</ol><p class="j-safety"><b>안전 수칙</b> · '+safe[id]+'</p><div class="j-links"><a href="explain/'+links[id]+'.html" target="_blank" rel="noopener">원리 설명 HTML 열기 ↗</a></div><div class="j-actions"><button type="button" id="reviewDevice">화면 장치 다시 보기</button><button type="button" id="reviewNext" class="j-primary">본 체험의 다음 장소로 걸어가기 →</button></div><p class="j-note">입구 전시는 본 체험 완료 조건에 포함되지 않아요.</p>';
 document.getElementById('reviewDevice').onclick=()=>{r.digital=true;save();close();H.missionWorld?.apparatus[id]?.activate();};document.getElementById('reviewNext').onclick=continueNext;
}

// Keep the old save fields intact; new progression is deliberately independent.
const gateIds={1:'g1',2:'g2',3:'g3',4:'g4a',5:'g5',6:'g6'};
H.state.gatePassed=n=>n===6?complete('g6')&&complete('8421'):complete(gateIds[n]);
H.state.forkSolved=n=>[1,2,3].includes(n)?!!rec('g'+n)?.routePass:true;
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
