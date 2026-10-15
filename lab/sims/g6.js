/* PROJECT ONE · final write / destructive read / restore interaction. */
(function(){
'use strict';
const H=window.HNR,B=H.BRICK,T=window.THREE,M=H.models.g6;
function refresh(c){
  const s=c.memory,level=s.v/3,lit=s.reading>0?Math.min(1,M.current(s.v,c.cfg)/.003):0;
  c.voltageBar.scale.y=Math.max(.015,level);c.voltageBar.position.y=91+45*level;
  c.readLed.material.emissiveIntensity=lit*2;c.readLed.material.color.setHex(lit>.05?0xffbd24:0x63572a);
  if(c.widgets){
    c.widgets.voltage.set(s.v.toFixed(2)+' V');c.widgets.bit.set(s.committed?'준비 신호 1 전송됨':M.bit(s.v)+'');
    c.widgets.meter.set(s.v);c.widgets.ready.setDisabled(!s.restored||M.bit(s.v)!==1||s.reading>0||s.committed);
    c.widgets.read.setDisabled(s.reading>0||s.committed);c.widgets.write.setDisabled(s.reading>0||s.committed);
    c.widgets.status.textContent=s.committed?'준비 신호 1을 전송했어요. 복구 결과를 확인하러 돌아가요.':s.reading>0?(lit>.05?'LED가 켜지는 동안 축전기의 전하를 사용하고 있어요.':'전하가 줄어 LED가 거의 켜지지 않아요. 다시 쓰면 어떨까요?'):s.restored&&M.bit(s.v)!==1?'기다리는 동안 전하가 줄었어요. 1을 다시 써 주세요.':s.restored?'다시 쓴 1이 준비됐어요. 아래에서 준비 신호를 전송해요.':s.read?'읽는 데 전하를 사용했어요. 1을 다시 써 주세요.':s.written?'1을 썼어요. 읽기 버튼으로 LED를 확인해요.':'쓰기를 눌러 축전기를 충전해요.';
  }
}
function write(c){
  const s=c.memory;if(s.reading>0||s.committed)return;
  s.v=M.step(s.v,.12,'write',c.cfg);s.written=true;c.task('write');
  if(s.read){s.restored=true;c.task('restore');}H.sfx('ok');refresh(c);
}
function read(c){
  const s=c.memory;if(s.reading>0||s.committed)return;
  if(!s.written){c.toast('먼저 1을 써서 축전기에 전하를 담아 주세요.');return;}
  s.reading=1.5;s.restored=false;refresh(c);
}
H.sim.register('g6',{
  gate:6,title:'준비 신호 1 쓰기',size:{w:600,d:420,h:240},camera:{pos:[500,540,760],look:[0,105,0],fov:48},
  tasks:[{id:'write',text:'축전기에 1 쓰기'},{id:'read',text:'LED로 읽고 전압 변화 보기'},{id:'restore',text:'1을 다시 써서 복원하기'},{id:'ready',text:'준비 신호 1 전송하기'}],
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
    c.widgets=null;c.ui.note('1을 쓰고 → LED로 읽고 → 다시 쓰세요. 마지막 1은 연구소의 「준비 완료」 신호예요.');
    const voltage=c.ui.readout('축전기 전압','0.00 V'),bit=c.ui.readout('저장된 값','0'),meter=c.ui.meter('축전기 전압',{min:0,max:3,fmt:v=>v.toFixed(2)+' V'});
    let w,r;c.ui.row(()=>{w=c.ui.button('1 쓰기 / 다시 쓰기',()=>write(c));r=c.ui.button('LED로 읽기',()=>read(c),{cls:'yellow'});});
    const status=c.ui.note('');status.setAttribute('aria-live','polite');
    const ready=c.ui.button('준비 신호 1 전송',()=>{const s=c.memory;if(!s.restored||M.bit(s.v)!==1||s.reading>0)return;s.committed=true;H.S.seen.projectOneReady=true;H.state.save();c.task('ready');refresh(c);},{wide:true,cls:'green'});
    c.widgets={voltage,bit,meter,read:r,write:w,status,ready};
    c.ui.about('실물 축전기·저항·LED를 단순화한 원리 모형이에요. 충전은 3 V, 누설은 R×C 시간상수로 계산해요. 읽을 때 LED가 전하를 사용하며 어두워져요. 여기서는 2.3 V 이상을 1로 정했어요. 실제 DRAM의 트랜지스터·센스 앰프·배선은 생략했으며, 이 회로 자체가 반도체 칩은 아니에요. 전송 후에는 전달된 신호를 별도로 유지해요.');
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
