/* HNR Tech · NPC 전자 말소리 (외부 음원 없이 Web Audio로 합성).
 * core.js 이후, HNR.boot() 이전에 로드. 기존 대화 DOM·음소거 API에 연결한다.
 */
(function(){
'use strict';
const H=window.HNR;
if(!H||!H.ui||!H.sfx||H.voice)return;
const profiles={
  bit:{base:660,type:'sine',filter:2300,pace:66,level:.075,robot:true},
  gatebot:{base:205,type:'triangle',filter:1150,pace:100,level:.070,robot:true},
  dustzero:{base:430,type:'triangle',filter:1850,pace:70,level:.063},
  kkamppak:{base:300,type:'sine',filter:1100,pace:92,level:.045},
  jjirit:{base:350,type:'triangle',filter:1750,pace:64,level:.070},
  keeper:{base:155,type:'triangle',filter:950,pace:112,level:.080},
  boss:{base:240,type:'triangle',filter:1300,pace:94,level:.070},
  daechung:{base:515,type:'triangle',filter:2000,pace:61,level:.058}
};
const notes=[0,3,7,5,2,10,7,3];
let context=null,master=null,burstTimer=null,lastText='',currentWho=null,lastTone=-Infinity;
const active=new Set();
const V=H.voice={profiles,stats:{tones:0,lastWho:null},stop,ready:()=>!!context&&context.state==='running',activeCount:()=>active.size};
V.status=()=>({state:context?context.state:'locked',time:context?context.currentTime:0,active:active.size});
function allowed(){return V.ready()&&!H.sfx.isMuted()&&!document.hidden;}
function unlock(ev){
  if(!ev.isTrusted||H.sfx.isMuted())return;
  try{
    if(!context){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      context=new AC();master=context.createGain();master.gain.value=.5;master.connect(context.destination);
      // Prime the output device during the first trusted input, before the first sentence.
      const warmup=context.createBufferSource();warmup.buffer=context.createBuffer(1,128,context.sampleRate);
      warmup.connect(master);warmup.onended=()=>warmup.disconnect();warmup.start();
    }
    if(context.state==='suspended')context.resume().catch(()=>{});
  }catch(_){/* 오디오를 지원하지 않아도 대화와 진행은 유지한다. */}
}
// A tone starts and ends at (almost) zero to avoid clicks on tiny speakers.
function makeTone(ctx,destination,who,char,index,start){
  const p=profiles[who];if(!p)return null;
  const code=(char||'가').codePointAt(0),step=p.robot?[0,0,7,0,12][(code+index)%5]:notes[(code+index)%notes.length];
  const frequency=p.base*Math.pow(2,step/12),duration=p.robot?.060:.080;
  const filter=ctx.createBiquadFilter(),gain=ctx.createGain(),osc=ctx.createOscillator();
  filter.type='lowpass';filter.frequency.value=p.filter;filter.Q.value=.55;
  osc.type=p.type;osc.frequency.setValueAtTime(frequency,start);
  osc.frequency.exponentialRampToValueAtTime(frequency*(p.robot?1.025:.89),start+duration);
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(p.level,start+.009);
  gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(filter);filter.connect(gain);gain.connect(destination);
  const oscs=[osc];
  if(p.robot){
    const overtone=ctx.createOscillator();overtone.type='sine';overtone.frequency.value=frequency*1.5;
    const mix=ctx.createGain();mix.gain.value=.16;overtone.connect(mix);mix.connect(filter);oscs.push(overtone);
    overtone.onended=()=>{overtone.disconnect();mix.disconnect();};
  }
  const record={oscs,gain,filter};
  osc.onended=()=>{osc.disconnect();filter.disconnect();gain.disconnect();active.delete(record);};
  oscs.forEach(o=>{o.start(start);o.stop(start+duration+.012);});
  return record;
}
function stop(){
  if(burstTimer!==null){clearInterval(burstTimer);burstTimer=null;}
  const now=context?context.currentTime:0;
  active.forEach(r=>{
    try{r.gain.gain.cancelScheduledValues(now);r.gain.gain.setTargetAtTime(.0001,now,.003);r.oscs.forEach(o=>o.stop(now+.018));}catch(_){}
  });
  active.clear();lastTone=-Infinity;
}
function syllable(who,char,index){
  if(!allowed()||!profiles[who])return;
  const now=context.currentTime,p=profiles[who];if(now-lastTone<p.pace/1000)return;
  try{
    const record=makeTone(context,master,who,char,index,now+.003);
    if(record){active.add(record);lastTone=now;V.stats.tones++;V.stats.lastWho=who;}
  }catch(_){stop();}
}
function voicedCharacters(text){return Array.from(text).filter(c=>/[\p{L}\p{N}]/u.test(c));}
function burst(who,text){
  const chars=voicedCharacters(text).slice(0,12);if(!chars.length||!allowed())return;
  let index=0;syllable(who,chars[index],index++);
  burstTimer=setInterval(()=>{
    if(!allowed()||index>=chars.length||!dialog.classList.contains('show')){clearInterval(burstTimer);burstTimer=null;return;}
    syllable(who,chars[index],index++);
  },profiles[who].pace+4);
}
const dialog=document.getElementById('dlg'),text=document.getElementById('dlgTxt'),name=document.getElementById('dlgName');
if(!dialog||!text||!name)return;
function speaker(){return Object.keys(profiles).find(key=>H.char.nameOf(key)===name.textContent)||null;}
const observer=new MutationObserver(records=>{
  if(!dialog.classList.contains('show')){stop();lastText='';currentWho=null;return;}
  // Each line updates the speaker label, including consecutive lines by the same NPC.
  const newLine=records.some(r=>r.target===name),who=speaker(),value=text.textContent||'';
  if(text.querySelector('.memo,.board,.sign,.steps,.mcard')||!who){stop();lastText=value;currentWho=null;return;}
  if(newLine||who!==currentWho){
    stop();currentWho=who;lastText='';
    if(voicedCharacters(value).length>4)burst(who,value);
    else{const chars=voicedCharacters(value);if(chars.length)syllable(who,chars[0],0);}
  }else if(value!==lastText){
    const delta=value.startsWith(lastText)?value.slice(lastText.length):value;
    // Clicking to reveal the whole sentence stops the chatter instead of reading the skipped tail.
    if(delta.length>6){stop();}
    else{const chars=voicedCharacters(delta);if(chars.length)syllable(who,chars[0],value.length);}
  }
  lastText=value;
});
observer.observe(dialog,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
document.addEventListener('pointerdown',ev=>{
  unlock(ev);
  if(ev.target instanceof Element&&ev.target.closest('#dlgBtns,#dlgTxt'))stop();
},true);
document.addEventListener('keydown',ev=>{
  unlock(ev);
  if(['Enter','Space','Escape','NumpadEnter'].includes(ev.code)&&dialog.classList.contains('show'))stop();
},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('blur',stop);window.addEventListener('pagehide',stop);
const originalMute=H.sfx.mute;
H.sfx.mute=function(value){originalMute(value);if(value)stop();};
// Offline preview/QA uses exactly the same synthesizer; it never unlocks live audio.
V.renderSample=async function(who='bit'){
  const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!Offline||!profiles[who])return null;
  const sampleRate=22050,ctx=new Offline(1,sampleRate*2,sampleRate),gain=ctx.createGain();gain.gain.value=.5;gain.connect(ctx.destination);
  const chars=Array.from('어서오세요연구원님');chars.forEach((c,i)=>makeTone(ctx,gain,who,c,i,.12+i*.13));
  const buffer=await ctx.startRendering();return Array.from(buffer.getChannelData(0));
};
})();
