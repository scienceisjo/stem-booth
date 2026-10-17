/* PROJECT ONE · final write / destructive read / restore interaction. */
(function(){
'use strict';
const H=window.HNR,B=H.BRICK,T=window.THREE,M=H.models.g6;
function refresh(c){
  const s=c.memory,level=s.v/3,lit=s.reading>0?Math.min(1,M.current(s.v,c.cfg)/.003):0;
  c.voltageBar.scale.y=Math.max(.015,level);c.voltageBar.position.y=91+45*level;
  c.readLed.material.emissiveIntensity=lit*2;c.readLed.material.color.setHex(lit>.05?0xffbd24:0x63572a);
  if(c.widgets){
    c.widgets.voltage.set(s.v.toFixed(2)+' V');c.widgets.bit.set(M.bit(s.v)+'');c.widgets.meter.set(s.v);
    c.widgets.read.setDisabled(s.reading>0);c.widgets.write.setDisabled(s.reading>0);
    c.widgets.status.textContent=s.reading>0?'S2를 눌러 읽는 동안 LED가 저장된 에너지를 사용해요.':s.written?'S1에서 손을 뗐어요. LED가 꺼져 있어도 전하가 남아 있을 수 있어요.':'S1을 눌러 축전기에 전하를 저장해요.';
  }
}
function write(c){
  const s=c.memory;if(s.reading>0||s.committed)return;
  s.v=M.step(s.v,.12,'write',c.cfg);s.written=true;c.task('write');
  if(s.read)s.restored=true;H.sfx('ok');refresh(c);
}
function read(c){
  const s=c.memory;if(s.reading>0||s.committed)return;
  if(!s.written){c.toast('먼저 1을 써서 축전기에 전하를 담아 주세요.');return;}
  s.reading=1.5;s.restored=false;refresh(c);
}
H.sim.register('g6',{
  gate:6,title:'1비트 기억회로 · S1 쓰기 / S2 읽기',size:{w:600,d:420,h:240},camera:{pos:[500,540,760],look:[0,105,0],fov:48},
  tasks:[{id:'write',text:'S1 · 축전기에 쓰기'},{id:'read',text:'S2 · LED로 읽기'}],
  build(c){
    const P=c.P;c.cfg=M.params(H.CONFIG.g6);c.memory={v:0,reading:0,written:false,read:false,restored:false,committed:false};
    P.part(560,14,350,B.white,0,76,0);[-240,240].forEach(x=>[-135,135].forEach(z=>P.box(14,70,14,B.steel,x,35,z)));
    P.part(460,6,265,B.green,0,86,0);
    P.part(75,44,112,B.navy,-175,112,-45);P.text('3 V',{x:-175,y:153,z:-45,w:60,bg:'#102846',color:'#ffffff'});
    P.cyl(31,31,75,B.navy,0,130,-40);P.cyl(30,30,4,B.steel,0,169,-40);P.box(8,68,1,B.white,18,130,-9);
    P.text('축전기',{x:0,y:210,z:-40,w:100,bg:'#102846',color:'#ffffff'});
    c.writeSwitch=P.part(80,18,58,B.blue,-110,104,88,{unique:true});P.text('쓰기',{x:-110,y:135,z:96,w:66,bg:'#0066cc',color:'#ffffff'});
    c.readSwitch=P.part(80,18,58,B.orange,75,104,88,{unique:true});P.text('읽기',{x:75,y:135,z:96,w:66,bg:'#102846',color:'#ffffff'});
    c.readLed=P.ball(17,B.gold,170,112,75,{unique:true,emissive:0xffb800,emissiveIntensity:0});
    P.text('읽기 LED',{x:172,y:152,z:78,w:92,bg:'#102846',color:'#ffffff'});
    P.part(32,104,25,B.navy,190,140,-70);c.voltageBar=P.box(22,90,28,B.cyan,190,136,-69,{unique:true,emissive:B.cyan,emissiveIntensity:.4});
    P.text('전압',{x:190,y:211,z:-70,w:65,bg:'#102846',color:'#ffffff'});
    c.tap(c.writeSwitch,()=>write(c));c.tap(c.readSwitch,()=>read(c));refresh(c);
  },
  enter(c){
    c.widgets=null;c.ui.note('화면 원리 모형입니다. 실물 회로 제작과 8421 활동은 학생 연구원과 별도로 확인해요.');
    const voltage=c.ui.readout('축전기 전압','0.00 V'),bit=c.ui.readout('개념상 저장 값','0'),meter=c.ui.meter('축전기 전압',{min:0,max:3,fmt:v=>v.toFixed(2)+' V'});
    let w,r;c.ui.row(()=>{w=c.ui.button('S1 · 쓰기',()=>write(c));r=c.ui.button('S2 · 읽기',()=>read(c),{cls:'yellow'});});
    const status=c.ui.note('');status.setAttribute('aria-live','polite');c.widgets={voltage,bit,meter,read:r,write:w,status};
    c.ui.about('실물 축전기·저항·LED를 단순화한 원리 모형이에요. 충전은 3 V, 누설은 R×C 시간상수로 계산해요. 읽을 때 LED가 저장된 에너지를 사용하며 어두워져요. 이 화면에서는 2.3 V 이상을 1로 정했어요. 실제 DRAM의 트랜지스터·감지 회로·배선은 생략했으며, 이 회로 자체가 반도체 칩은 아니에요. 실물의 최신 부품값과 배선은 제작 도안을 따라 주세요.');
    refresh(c);
  },
  exit(c){c.widgets=null;},
  update(c,dt,t,active){
    const s=c.memory;if(!active||s.committed)return;
    const elapsed=Math.min(.1,Math.max(0,dt));s.v=M.step(s.v,elapsed,s.reading>0?'read':'idle',c.cfg);
    if(s.reading>0){s.reading=Math.max(0,s.reading-elapsed);if(s.reading===0){s.read=true;c.task('read');}}
    refresh(c);
  }
});
})();
