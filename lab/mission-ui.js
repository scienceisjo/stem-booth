/* Main and optional activities have separate local records. */
(function(){'use strict';const H=window.HNR;let panel,goal,count;
function place(){const box=document.getElementById('topR'),tools=document.getElementById('exploreTools'),body=document.getElementById('exploreBody');if(box&&tools){const top=box.getBoundingClientRect().bottom+8;tools.style.setProperty('top',top+'px','important');if(body){body.style.maxHeight=Math.max(90,innerHeight-top-60)+'px';body.style.overflowY='auto';}}}
function status(){if(!goal||!H.S)return;const t=H.journey.nextTarget(),p=H.journey.mainProgress();goal.textContent=t?'지금 할 일 · '+t.label:'첫 프로젝트 완료 · 모든 연구실을 자유롭게 둘러보세요.';count.textContent='본 체험 '+p.done+'/6 · 자유 체험 '+['g4a','g5'].filter(H.journey.complete).length+'/2';requestAnimationFrame(place);}
H.on('start',()=>{panel=document.querySelector('#topR .panel');const line=document.createElement('div');line.id='missionLine';line.innerHTML='<p id="missionGoal" aria-live="polite"></p><span class="j-optional-count"></span><button type="button" class="j-shortcut" data-j="records">활동 기록</button> <button type="button" class="j-shortcut" data-j="library">원리 자료</button>';panel.appendChild(line);goal=line.querySelector('p');count=line.querySelector('span');line.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>H.journey.open(b.dataset.j));status();});
H.on('state',status);H.on('resize',place);
})();
