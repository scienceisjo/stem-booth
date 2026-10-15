(function(){
'use strict';
const H=window.HNR;
function placeTools(){
  const panel=document.querySelector('#topR'),tools=document.getElementById('exploreTools'),body=document.getElementById('exploreBody');
  if(panel&&tools){const top=panel.getBoundingClientRect().bottom+10;tools.style.setProperty('top',top+'px','important');if(body){body.style.maxHeight=Math.max(90,innerHeight-top-60)+'px';body.style.overflowY='auto';}}
}
function status(){
  if(!H.S)return;
  const t=H.flow.nextTarget(),n=t&&t.n;
  const goal=document.getElementById('missionGoal');
  if(goal)goal.textContent=n>6?'복구 완료 · 시연 준비 신호 1':t&&t.kind==='fork'?'관찰한 결과로 다음 이동 경로를 설정해요.':H.story('gates.'+n+'.objective','정문에서 비트와 첫 장치를 확인해요.');
  requestAnimationFrame(placeTools);
}
function install(){
  const panel=document.querySelector('#topR .panel');
  const line=document.createElement('div');line.id='missionLine';
  const button=document.createElement('button');button.type='button';button.textContent='임무 기록';button.onclick=()=>H.ui.say([{
    who:'bit',t:'PROJECT ONE · 멈춘 시연 라인을 다시 켜는 중이에요.'
  }].concat([1,2,3,4,5,6].map(n=>({who:'bit',t:(H.state.gatePassed(n)?'✓ 완료 · ':'○ 대기 · ')+H.story('gates.'+n+'.system','')+'\n'+H.story('gates.'+n+(H.state.gatePassed(n)?'.restored':'.objective'), '')}))));
  const goal=document.createElement('p');goal.id='missionGoal';line.append(goal,button);panel.appendChild(line);status();
}
H.on('start',install);H.on('state',status);H.on('sim:task',status);
H.on('resize',placeTools);
})();
