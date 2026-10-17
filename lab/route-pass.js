/* HNR Tech Inc. · Observe, choose a route, then speak the facilitator's passphrase. */
(function(){
'use strict';
const H=window.HNR,KEY='hnr.booth.routeCodes.v1',defaults={g1:'연결',g2:'정전기'};
let codes={...defaults},cleanup=null;
try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');for(const id of Object.keys(defaults))if(typeof saved[id]==='string'&&saved[id].trim()&&saved[id].length<=24)codes[id]=saved[id].trim();}catch(e){}
const normalize=s=>String(s||'').normalize('NFKC').replace(/[\s.,!?。！？·]/g,'').toLowerCase();
const R=H.routePass={required:id=>id==='g1'||id==='g2',mount,settings,stop,openSide(n){const r=H.journey?.records()?.activities['g'+n];return r?.routePass?.side||null;}};
function stop(){if(cleanup){const fn=cleanup;cleanup=null;fn();}}
function acceptable(id,r,side){if(id==='g1')return side==='L';const result=r.observations.result;return result==='thin'?side==='L':result==='thick'?side==='R':['similar','unclear'].includes(result);}
function mount(host,id,r,pass){
 stop();let alive=true,recognizer=null,timer=0,run=0,selected='',failure=false;
 const labels=id==='g1'?['연결한 회로','끊어진 회로']:['가는 빨대','굵은 빨대'];
 const q=id==='g1'?'에너지스틱의 불과 소리가 이어지려면 어떤 회로여야 할까요?':'오늘 실물 비교에서, 어느 빨대가 더 먼 거리에서 캔을 움직이기 시작했나요?';
 host.innerHTML='<section class="j-route"><p class="j-type">시연 관찰 완료 · 경로 선택과 음성 암호</p><h2></h2><div class="j-predictions"><button type="button" data-route="L" aria-pressed="false"></button><button type="button" data-route="R" aria-pressed="false"></button></div><p class="j-route-feedback" role="status"></p><div class="j-voice"><b>진행자에게 암호를 받아요</b><p>답을 고른 뒤 마이크 버튼을 누르고, 진행자가 알려 준 짧은 암호를 말하세요. 확인되면 고른 문만 열려요.</p><button type="button" class="j-primary" id="routeMic" disabled>마이크 켜고 암호 말하기</button><button type="button" id="routeStop" hidden>듣기 중지</button><p id="routeVoiceStatus" role="status">먼저 질문의 답을 골라 주세요.</p><p class="j-note">버튼을 누를 때만 듣습니다. 음성은 브라우저의 인식 서비스로 전송될 수 있어요. 이 앱은 음성 파일이나 말한 내용을 저장하지 않습니다.</p><details id="routeAssist" hidden><summary>진행자용 · 음성 인식이 어려울 때</summary><p>주변 소음이나 브라우저 문제로 인식이 안 되면, 진행자가 참가자의 말을 직접 듣고 확인해 주세요.</p><label class="j-check"><input type="checkbox" id="routeHeard"><span>진행자가 참가자가 외친 암호를 직접 들었습니다.</span></label><label class="j-field">진행자가 확인한 암호<input id="routeStaffWord" type="password" maxlength="24" autocomplete="off"></label><button type="button" id="routeStaffPass">직접 들은 암호 확인</button></details></div></section>';
 host.querySelector('h2').textContent=q;
 const choices=[...host.querySelectorAll('[data-route]')],feedback=host.querySelector('.j-route-feedback'),mic=host.querySelector('#routeMic'),cancel=host.querySelector('#routeStop'),status=host.querySelector('#routeVoiceStatus'),assist=host.querySelector('#routeAssist');
 choices.forEach((b,i)=>{b.textContent=labels[i];b.onclick=()=>{
  end();selected=b.dataset.route;choices.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  const ok=acceptable(id,r,selected);mic.disabled=!ok;assist.hidden=!failure||!ok;
  feedback.textContent=ok?(id==='g2'&&['similar','unclear'].includes(r.observations.result)?'기록한 결과는 비슷함 또는 구분 어려움이에요. 어느 길이든 고를 수 있어요. 굵기만으로 결과가 항상 정해지는 것은 아니에요.':'관찰한 내용과 맞아요. 이제 진행자에게 암호를 받아 말해 보세요.'):(id==='g1'?'손을 놓으면 회로가 끊어져 불과 소리가 멈췄어요. 이어지는 길을 다시 골라 보세요.':'앞에서 기록한 실물 관찰 결과와 비교해 다시 골라 주세요. 기록을 잘못했다면 아래에서 수정할 수 있어요.');
  status.textContent=ok?'마이크 버튼을 누르면 최대 12초 동안 들어요.':'문은 아직 잠겨 있어요.';
 } });
 function end(){const hadFocus=host.contains(document.activeElement);run++;clearTimeout(timer);timer=0;if(recognizer){recognizer.onresult=recognizer.onerror=recognizer.onend=null;try{recognizer.abort();}catch(e){}recognizer=null;}cancel.hidden=true;mic.textContent='마이크 켜고 암호 말하기';mic.disabled=!selected||!acceptable(id,r,selected);if(alive&&hadFocus&&!mic.disabled)mic.focus({preventScroll:true});}
 function problem(message){failure=true;end();status.textContent=message;assist.hidden=!selected||!acceptable(id,r,selected);}
 function succeed(method){if(!alive||!selected||!acceptable(id,r,selected))return;end();if(pass(selected,method)===false){status.textContent='실물 활동 확인과 앞 활동을 먼저 마친 뒤 다시 말해 주세요.';return;}alive=false;status.textContent='암호 확인! 선택한 문이 열립니다.';}
 mic.onclick=()=>{
  if(!selected||!acceptable(id,r,selected))return;end();const API=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!API){problem('이 브라우저는 음성 인식을 지원하지 않아요. Chrome에서 열거나 진행자에게 직접 확인받아 주세요.');return;}
  const token=run;let resultSeen=false;
  try{
   recognizer=new API();recognizer.lang='ko-KR';recognizer.continuous=false;recognizer.interimResults=false;recognizer.maxAlternatives=3;
   recognizer.onresult=e=>{if(!alive||token!==run)return;const result=e.results[e.resultIndex];if(!result?.isFinal)return;resultSeen=true;const heard=Array.from(result).map(a=>a.transcript);if(heard.some(s=>normalize(s)===normalize(codes[id]))){succeed('speech');}else{end();status.textContent='“'+String(heard[0]||'').slice(0,60)+'”로 들었어요. 진행자에게 받은 암호를 다시 말해 주세요.';}};
   recognizer.onerror=e=>{if(!alive||token!==run)return;const messages={'not-allowed':'마이크 권한이 허용되지 않았어요. 주소창의 마이크 권한을 확인해 주세요.','service-not-allowed':'이 브라우저에서 음성 인식 서비스를 사용할 수 없어요.','audio-capture':'마이크를 찾지 못했어요. 연결 상태를 확인해 주세요.','network':'음성 인식 서비스에 연결되지 않았어요. 인터넷 연결을 확인해 주세요.','no-speech':'목소리가 들리지 않았어요. 마이크 가까이에서 다시 말해 주세요.','aborted':'듣기를 중지했어요.'};problem(messages[e.error]||'음성 인식을 완료하지 못했어요. 다시 시도해 주세요.');};
   recognizer.onend=()=>{if(!alive||token!==run)return;if(!resultSeen)problem('암호를 듣지 못했어요. 다시 말하거나 진행자에게 확인받아 주세요.');};
   recognizer.start();mic.disabled=true;mic.textContent='듣는 중…';cancel.hidden=false;cancel.focus({preventScroll:true});status.textContent='지금 암호를 말해 주세요. 조용하고 또렷하게 말해도 돼요.';
   timer=setTimeout(()=>{if(alive&&token===run)problem('듣는 시간이 끝났어요. 다시 시도해 주세요.');},12000);
  }catch(e){problem('마이크를 시작하지 못했어요. 권한을 확인하고 다시 시도해 주세요.');}
 };
 cancel.onclick=()=>{end();status.textContent='듣기를 중지했어요.';};
 host.querySelector('#routeStaffPass').onclick=()=>{if(!failure)return;const heard=host.querySelector('#routeHeard'),word=host.querySelector('#routeStaffWord');if(!heard.checked){status.textContent='진행자가 참가자의 말을 직접 들은 뒤 확인해 주세요.';return;}if(normalize(word.value)!==normalize(codes[id])){status.textContent='설정된 암호와 달라요. 진행자가 확인해 주세요.';return;}word.value='';succeed('facilitator-heard');};
 const hidden=()=>{if(document.hidden){end();status.textContent='다른 화면으로 이동해 듣기를 중지했어요.';}};document.addEventListener('visibilitychange',hidden);
 cleanup=()=>{alive=false;end();document.removeEventListener('visibilitychange',hidden);};
}
function settings(host){
 const box=document.createElement('details');box.className='j-route-settings';box.innerHTML='<summary>진행자용 · 관문별 음성 암호</summary><p>행사에서 사용할 짧은 한국어 암호를 정하고, 실험 후 참가자에게 말로 알려 주세요. 이 기기에만 저장됩니다.</p><label class="j-field">사람 회로 암호<input data-code="g1" maxlength="24" autocomplete="off"></label><label class="j-field">정전기 암호<input data-code="g2" maxlength="24" autocomplete="off"></label><button type="button">암호 저장</button><p role="status"></p>';
 host.appendChild(box);box.querySelectorAll('input').forEach(el=>el.value=codes[el.dataset.code]);box.querySelector('button').onclick=()=>{const values={};for(const el of box.querySelectorAll('input')){const value=el.value.trim();if(!normalize(value)||value.length>24){box.querySelector('[role=status]').textContent='각 암호를 1~24자로 입력해 주세요.';return;}values[el.dataset.code]=value;}try{localStorage.setItem(KEY,JSON.stringify(values));codes=values;box.querySelector('[role=status]').textContent='이 기기에 암호를 저장했습니다.';}catch(e){box.querySelector('[role=status]').textContent='암호를 저장하지 못했습니다. 브라우저 저장 권한을 확인해 주세요.';}};
}
H.on('journey:close',stop);window.addEventListener('pagehide',stop);
})();
