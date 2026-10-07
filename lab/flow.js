/* ═══════════════════════════════════════════════════════════════
   HNR Tech 3D 연구소 v4 — flow.js (진행 흐름 조립 도우미)
   core.js 의 HNR.flow(gate · pass · fork) 위에, map.js 가 좌표만 주면 되는
   「관문 NPC」·「갈림길 문 두 개」·「다시 생각하는 방」·「엔딩 자리」·「자동 가이드」를 더한다.
   문서: lab/API.md §18.  로드 순서: core.js → sim.js → flow.js → models → sims → map.js
   ═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';
const HNR = window.HNR = window.HNR || {};
const THREE = window.THREE;
if (!HNR.flow || !HNR.world) { console.error('[HNR.flow] core.js 가 먼저 로드되어야 해요'); return; }
const flow = HNR.flow, world = HNR.world, state = HNR.state, P = HNR.P, props = HNR.props, BRICK = HNR.BRICK;
const ST = function (p, fb) { return HNR.story ? HNR.story(p, fb) : fb; };
const NOOPT = Object.freeze({});
const FB_NPC = { 1: 'gatebot', 2: 'dustzero', 3: 'kkamppak', 4: 'jjirit', 5: 'keeper', 6: 'boss' };
const CIRC = ['', '①', '②', '③', '④', '⑤', '⑥'];

/* 가이드·스폰이 쓰는 자리 등록부. gateNpc/forkDoors/thinkRoom/endingSpot 가 채운다 */
flow.spots = { gate: {}, fork: {}, think: null, ending: null };

/* (x,z) 를 중심으로 ry 만큼 돈 로컬 (lx,lz) → 월드 {x,z}. 로컬 +Z 가 「앞(관람자 쪽)」 */
function l2w(x, z, ry, lx, lz) { const c = Math.cos(ry || 0), s = Math.sin(ry || 0); return { x: x + lx * c + lz * s, z: z - lx * s + lz * c }; }
/* 중심 (cx,cz), 가로 w(로컬 X)·세로 d(로컬 Z), 회전 ry 인 사각형의 월드 AABB */
function rectOf(cx, cz, w, d, ry) {
  const pts = [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]; let x1 = Infinity, x2 = -Infinity, z1 = Infinity, z2 = -Infinity;
  pts.forEach(function (p) { const q = l2w(cx, cz, ry, p[0], p[1]); x1 = Math.min(x1, q.x); x2 = Math.max(x2, q.x); z1 = Math.min(z1, q.z); z2 = Math.max(z2, q.z); });
  return { x1: x1, x2: x2, z1: z1, z2: z2 };
}
flow.l2w = l2w; flow.rectOf = rectOf;
flow.npcOf = function (n) { return ST('gates.' + n + '.npc', FB_NPC[n]); };

/* ── 관문 NPC: 시험관을 세우고 「말 걸기」 → HNR.flow.gate(n). opt:{x,z,ry,r:140,parent} → {npc, interact, spot} ── */
flow.gateNpc = function (n, opt) {
  opt = opt || NOOPT;
  const key = flow.npcOf(n), ry = opt.ry || 0, x = opt.x || 0, z = opt.z || 0;
  const npc = world.addNpc(key, x, z, { ry: ry, parent: opt.parent });
  const name = HNR.char.nameOf(key);
  const it = world.addInteract({ id: 'gate' + n, x: x, z: z, r: opt.r || 140, mesh: npc,
    label: function () { return state.gatePassed(n) ? '💬 ' + name + ' (통과함)' : '💬 ' + name + '에게 말 걸기'; },
    onUse: function () { return flow.gate(n); } });
  const front = l2w(x, z, ry, 0, 100);
  const spot = { x: front.x, z: front.z, yaw: ry, n: n, key: key };
  flow.spots.gate[n] = spot;
  return { npc: npc, interact: it, spot: spot };
};

/* 갈림길 n 의 side('L'|'R') 문에 붙일 이름표. 정답 쪽은 STORY.gates[n].fork.ok, 아니면 .no.
   관문 4 는 near/far(코일 쪽/코일 반대쪽) 를 CONFIG.compassPointsAway 에 맞춰 붙인다 */
flow.forkLabel = function (n, side) {
  const F = ST('gates.' + n + '.fork', {}), right = state.forkCorrect(n) === side;
  if (n === 4 && F.near && F.far) { const away = !!(HNR.CONFIG && HNR.CONFIG.compassPointsAway); return (right === away) ? F.far : F.near; }
  return right ? (F.ok || '정답 문') : (F.no || '다른 문');
};

/* ── 갈림길: 문 두 개(L/R) + 단서 팻말 + (선택) 벽 + (선택) 대충이.
   opt:{x,z,ry:0,gap:340,w:150,h:110,color,wallLen:0,think:{x,z,yaw},back:{x,z,yaw},rival:false,clue:true,parent}
   → {doors:{L,R}, correct, interacts:{L,R}, spot, group}
   문을 누르면 HNR.flow.fork(n, side, {onOpen, think, back}) 표준 흐름. 정답 문은 해결 상태가 복원될 때 자동으로 열린다 */
flow.forkDoors = function (n, opt) {
  opt = opt || NOOPT;
  const x = opt.x || 0, z = opt.z || 0, ry = opt.ry || 0, gap = opt.gap || 340, w = opt.w || 150, h = opt.h || 110;
  const correct = state.forkCorrect(n), F = ST('gates.' + n + '.fork', {});
  const group = P.group(x, 0, z, { ry: ry, parent: opt.parent, dynamic: true });
  const doors = {}, interacts = {};
  const front = l2w(x, z, ry, 0, 150), spot = { x: front.x, z: front.z, yaw: ry, n: n };
  ['L', 'R'].forEach(function (side) {
    const lx = side === 'L' ? -gap / 2 : gap / 2, wp = l2w(x, z, ry, lx, 0), label = flow.forkLabel(n, side);
    const door = props.door(wp.x, wp.z, { w: w, h: h, ry: ry, label: CIRC[n] + ' ' + label, labelW: Math.min(320, w + 150), color: opt.color != null ? opt.color : BRICK.blue });
    HNR.scene.add(door);
    world.addBlock(Object.assign({ id: 'fork' + n + side }, rectOf(wp.x, wp.z, w + 10, 28, ry)), function () { return !door.userData.isOpen(); });
    const ip = l2w(x, z, ry, lx, 80);
    interacts[side] = world.addInteract({ id: 'fork' + n + side, x: ip.x, z: ip.z, r: opt.r || 110, mesh: door,
      visible: function () { return !state.forkSolved(n) || side === correct; },
      label: function () { return state.forkSolved(n) ? '🚪 열린 문 · 지나가요' : '🚪 「' + label + '」 열기'; },
      onUse: function () {
        if (state.forkSolved(n)) return HNR.ui.say([{ who: 'bit', t: '이 문은 벌써 열렸어요. 다음 관문으로 가 보아요!' }]);
        return flow.fork(n, side, { onOpen: function () { return door.userData.setOpen(true); }, think: opt.think || flow.spots.think || null, back: opt.back || spot });
      } });
    doors[side] = door;
  });
  const sync = function (instant) { if (state.forkSolved(n)) doors[correct].userData.setOpen(true, instant); };
  sync(true); HNR.on('state', function () { sync(false); });
  // 단서 팻말(문 사이 앞)
  if (opt.clue !== false && F.clue) { const cp = l2w(x, z, ry, 0, 50); props.signPost(cp.x, cp.z, F.clue, { w: 260, y: 112, ry: ry, parent: opt.parent }); world.addBlock(rectOf(cp.x, cp.z, 26, 26, ry)); }
  // 벽(문 양옆과 사이). 충돌은 map 의 걷기 사각형이 정한다 — 그림일 뿐
  if (opt.wallLen) {
    const L = opt.wallLen, hw = w / 2 + 14, c = opt.wallColor != null ? opt.wallColor : BRICK.white, wh = h + 14, wt = 22;
    const segs = [[-L / 2, -gap / 2 - hw], [-gap / 2 + hw, gap / 2 - hw], [gap / 2 + hw, L / 2]];
    P.with(group, function () { segs.forEach(function (s) { if (s[1] - s[0] > 4) P.wall(s[0], 0, s[1], 0, { h: wh, t: wt, color: c }); }); P.text('갈림길 ' + CIRC[n], { w: 200, y: wh + 60, x: 0, z: 0 }); });
  }
  // 대충이: 오답 문 곁에서 문을 밀고 있다
  if (opt.rival) { const wrong = correct === 'L' ? 'R' : 'L', lx = (wrong === 'L' ? -gap / 2 : gap / 2) + (wrong === 'L' ? -1 : 1) * (w / 2 + 50); const rp = l2w(x, z, ry, lx, 60); world.addNpc('daechung', rp.x, rp.z, { ry: ry + Math.PI, look: false }); }
  flow.spots.fork[n] = spot;
  return { doors: doors, correct: correct, interacts: interacts, spot: spot, group: group };
};

/* ── 다시 생각하는 방: 작은 방(바닥·벽·의자·포스터). opt:{ry:0,size:320,parent} → 순간이동 자리 {x,z,yaw}. flow.spots.think 에 등록 ── */
flow.thinkRoom = function (x, z, opt) {
  opt = opt || NOOPT;
  const s = opt.size || 320, ry = opt.ry || 0, half = s / 2, h = 120, t = 16;
  const poster = ST('think.poster', '괜찮아요. 연구는 원래 틀리면서 하는 거예요'), m = /^(.+?[.!?])\s+(.+)$/.exec(poster);
  const g = P.group(x, 0, z, { ry: ry, parent: opt.parent });
  P.with(g, function () {
    P.stud(s, s, BRICK.cream, 0, 0, 2.2);
    P.wall(-half, -half, half, -half, { h: h, t: t, color: BRICK.sand }); P.wall(-half, half, half, half, { h: h, t: t, color: BRICK.sand });
    P.wall(-half, -half, -half, half, { h: h, t: t, color: BRICK.sand }); P.wall(half, -half, half, half, { h: h, t: t, color: BRICK.sand });
    props.chair(0, 10, { ry: Math.PI, color: BRICK.violet });
    P.poster(m ? m[1] : poster, m ? m[2].replace(/\s+/, '\n') : '', { x: 0, y: 72, z: -half + t / 2 + 2, w: 96, bg: '#fff6b0' });
    props.plant(-half + 42, -half + 42); props.plant(half - 42, -half + 42);
    P.text('다시 생각하는 방', { w: 240, y: h + 50, bg: 'rgba(107,50,124,.95)', color: '#ffffff' });
  });
  P.bake(g);
  const inner = half - t - 14, rect = rectOf(x, z, inner * 2, inner * 2, ry);
  world.addWalk('think', rect);
  world.addZone({ id: 'think', rect: rect, name: '다시 생각하는 방', exposure: 0.9 });
  const sp = l2w(x, z, ry, 0, 70), spot = { x: sp.x, z: sp.z, yaw: ry };
  flow.spots.think = spot;
  return spot;
};

/* ── 엔딩 자리(아트리움·포토존): 금색 체크포인트 + 「사원증 다시 보기」 + 들어오면 축하 토스트(관문 6 통과 뒤). opt:{ry,label,parent} ── */
flow.endingSpot = function (x, z, opt) {
  opt = opt || NOOPT;
  props.checkpoint(x, z, { color: BRICK.gold, label: opt.label || '🏢 HNR Tech 아트리움', size: 150, labelY: 150, parent: opt.parent });
  world.addInteract({ id: 'ending', x: x, z: z, r: 150, visible: function () { return state.gatePassed(6); }, label: '📸 사원증 다시 보기', onUse: function () { return HNR.ui.ending(); } });
  world.addTrigger({ id: 'ending', rect: { x1: x - 110, x2: x + 110, z1: z - 110, z2: z + 110 }, cond: function () { return state.gatePassed(6); },
    onEnter: function () { const S = HNR.S; if (S && !S.seen.atrium) { S.seen.atrium = true; state.save(); HNR.ui.toast('합격을 축하해요! 여기가 포토존이에요', { icon: '📸', cls: 'gold', ms: 3400 }); } } });
  flow.spots.ending = { x: x, z: z, yaw: opt.ry || 0 };
  return flow.spots.ending;
};

/* ── 지금 가야 할 곳(진행 상태로 계산). {x,z,label,kind:'gate'|'fork'|'ending'} | null ── */
flow.nextTarget = function () {
  const S = HNR.S; if (!S) return null;
  const sp = flow.spots, n = state.nextGate();
  if (n > 6) return sp.ending ? { x: sp.ending.x, z: sp.ending.z, label: '아트리움 · 포토존', kind: 'ending', n: 7 } : null;
  if (n >= 2 && !state.forkSolved(n - 1)) { const f = sp.fork[n - 1]; return f ? { x: f.x, z: f.z, label: '갈림길 ' + CIRC[n - 1] + ' · 카드 수수께끼', kind: 'fork', n: n - 1 } : null; }
  const g = sp.gate[n]; if (!g) return null;
  return { x: g.x, z: g.z, label: '관문 ' + CIRC[n] + ' · ' + HNR.char.nameOf(g.key), kind: 'gate', n: n };
};
/* 가이드 비콘을 진행 상태에 맞춰 자동으로 가리키게 한다. 돌려주는 값 = 쓰인 함수(HNR.guide.set 에 다시 넣을 수 있다) */
flow.guideAuto = function () {
  const fn = function () { if (HNR.sim && HNR.sim.active) return null; return flow.nextTarget(); };
  HNR.guide.set(fn); return fn;
};
/* 진행 상태에 맞는 시작 자리(HNR.map.spawnFor 에서 그대로 돌려주면 된다). 자리가 없으면 null */
flow.suggestSpawn = function () {
  const S = HNR.S; if (!S) return null;
  const sp = flow.spots, n = state.nextGate();
  if (n > 6) return sp.ending ? { x: sp.ending.x, z: sp.ending.z + 120, yaw: sp.ending.yaw } : null;
  if (n >= 2 && !state.forkSolved(n - 1)) return sp.fork[n - 1] || null;
  return sp.gate[n] || null;
};
})();
