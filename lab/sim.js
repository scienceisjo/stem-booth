/* ═══════════════════════════════════════════════════════════════
   HNR Tech 3D 연구소 v4 — sim.js (시뮬 프레임워크)
   · 장치 등록(register) → 앵커에 세우기(mountAll) → 시뮬 모드(open/close)
   · 패널 위젯(ctx.ui.*) · 장치 파츠 끌기/누르기(ctx.drag/tap) · 과제(ctx.task)
   · HNR.selftest 에 시뮬 항목을 더한다. 문서: lab/API.md §15~§17
   - 클래식 스크립트. 전역은 window.HNR 하나. core.js 다음, models/sims 앞에 로드.
   ═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';
const HNR = window.HNR = window.HNR || {};
const THREE = window.THREE;
if (!THREE || !HNR.P) { console.error('[HNR.sim] core.js 와 three.js 가 먼저 로드되어야 해요'); return; }
const sim = HNR.sim = HNR.sim || {};
const $ = function (s) { return document.querySelector(s); };
const noop = function () {};
const NOOPT = Object.freeze({});
const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };
const clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
const ST = function (p, fb) { return HNR.story ? HNR.story(p, fb) : fb; };
const V3 = THREE.Vector3;

/* ── 등록부 ── */
const defs = Object.create(null), order = [], mounted = Object.create(null), mountedIds = [];
let activeId = null, activeCtx = null, panelEl = null, bubbleEl = null, bubbleTimer = null, hiddenFollower = null;
sim.defs = defs; sim.ids = order; sim.mountedIds = mountedIds;
Object.defineProperty(sim, 'active', { get: function () { return activeId; } });
sim.ctxOf = function (id) { return mounted[id] || null; };
sim.defOf = function (id) { return defs[id] || null; };

/* 시뮬 등록. def: {gate,title,size:{w,d,h},camera:{pos,look,fov?},tasks:[{id,text}],build,enter,exit,update,key?} */
sim.register = function (id, def) {
  if (!id || !def) throw new Error('[HNR.sim] register(id, def) 인자가 모자라요');
  const d = Object.assign({ gate: 0, title: id }, def);
  d.id = id;
  d.size = Object.assign({ w: 300, d: 200, h: 200 }, def.size || {});
  d.camera = Object.assign({ pos: [0, 180, 420], look: [0, 100, 0] }, def.camera || {});
  d.tasks = (def.tasks || []).map(function (t, i) { return typeof t === 'string' ? { id: 't' + (i + 1), text: t } : Object.assign({}, t); });
  if (!defs[id]) order.push(id);
  defs[id] = d;
  return d;
};

/* 과제 전부 완료(세션에 저장된 값). 과제가 하나도 없는 시뮬은 false (관문이 저절로 통과되지 않게) */
sim.tasksDone = function (id) {
  const d = defs[id], S = HNR.S; if (!d || !S || !d.tasks.length) return false;
  const m = (S.simTasks || {})[id] || {};
  for (let i = 0; i < d.tasks.length; i++) if (!m[d.tasks[i].id]) return false;
  return true;
};
sim.taskDone = function (id, tid) { const S = HNR.S; return !!(S && S.simTasks && S.simTasks[id] && S.simTasks[id][tid]); };
/* 세션의 과제 기록을 지운다(시험·다시 하기). id 없으면 전부 */
sim.resetTasks = function (id) { const S = HNR.S; if (!S) return; S.simTasks = S.simTasks || {}; if (id) delete S.simTasks[id]; else S.simTasks = {}; HNR.state.save(); };

/* ── 좌표 도우미 ── */
function toV3(v, out) { out = out || new V3(); return Array.isArray(v) ? out.set(v[0] || 0, v[1] || 0, v[2] || 0) : out.copy(v); }
/* root 로컬 사각형(바닥)의 월드 AABB */
function localRect(root, x1, z1, x2, z2, pad) {
  const pts = [[x1, z1], [x2, z1], [x1, z2], [x2, z2]], v = new V3(); let ax = Infinity, bx = -Infinity, az = Infinity, bz = -Infinity;
  pts.forEach(function (p) { v.set(p[0], 0, p[1]); root.localToWorld(v); ax = Math.min(ax, v.x); bx = Math.max(bx, v.x); az = Math.min(az, v.z); bz = Math.max(bz, v.z); });
  pad = pad || 0; return { x1: ax - pad, x2: bx + pad, z1: az - pad, z2: bz + pad };
}
const prj = new V3();
/* Object3D(또는 Vector3 월드 좌표)의 화면 위치 {x,y,z,visible} (CSS px). 카메라가 갱신된 뒤(틱 뒤)에 부른다 */
sim.project = function (obj) {
  if (obj && obj.isObject3D) obj.getWorldPosition(prj); else toV3(obj, prj);
  HNR.camera.updateMatrixWorld();
  prj.project(HNR.camera);
  const w = window.innerWidth, h = window.innerHeight;
  return { x: (prj.x + 1) / 2 * w, y: (1 - prj.y) / 2 * h, z: prj.z, visible: prj.z > -1 && prj.z < 1 && Math.abs(prj.x) <= 1 && Math.abs(prj.y) <= 1 };
};

/* ── ctx.P / ctx.props: 기본 부모 = root ── */
function wrapWith(src, root) {
  const o = {};
  Object.keys(src).forEach(function (k) {
    const f = src[k]; if (typeof f !== 'function') return;
    o[k] = function () { const a = arguments; let r; HNR.P.with(root, function () { r = f.apply(src, a); }); return r; };
  });
  if (src === HNR.P) { o.with = HNR.P.with; o.parent = function () { return root; }; }
  return o;
}

/* ═══════════ 패널 위젯 ═══════════ */
function mk(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function hashStr(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
function detachedDom() { const W = mk('div', 'sp-widgets'); const about = mk('details', 'sp-fold sp-about', '<summary>이 모형은요</summary><div class="sp-fold-body"></div>'); const tasks = mk('ul', 'sp-tasks'); const pass = mk('div', 'sp-pass'); pass.hidden = true; return { W: W, cur: null, tasks: tasks, pass: pass, about: about, aboutBody: about.querySelector('.sp-fold-body'), body: null, detached: true }; }

function uiFor(ctx) {
  const dom = function () { return ctx._dom || (ctx._dom = detachedDom()); };
  const mount = function (el) { const d = dom(); (d.cur || d.W).appendChild(el); return el; };
  const safe = function (fn, a, b) { try { return fn && fn(a, b); } catch (e) { console.error('[HNR.sim] 위젯 콜백 오류 ' + ctx.id, e); } };
  const ui = {};
  /* 위젯 영역 비우기(머리말·과제·접이식은 남는다) */
  ui.clear = function () { const d = dom(); d.W.innerHTML = ''; d.cur = null; };
  /* 아무 요소/HTML 추가 */
  ui.el = function (el) { return mount(typeof el === 'string' ? mk('div', '', el) : el); };
  /* 설명 문단. opt:{warn:true} 면 빨간 띠 */
  ui.note = function (html, opt) { return mount(mk('div', 'sp-note' + (opt && opt.warn ? ' warn' : ''), html)); };
  /* 가로 줄. fn 안에서 만든 위젯이 한 줄에 놓인다 */
  ui.row = function (fn) { const d = dom(), row = mount(mk('div', 'sp-row')); const prev = d.cur; d.cur = row; try { if (fn) fn(row); } finally { d.cur = prev; } return row; };
  /* 버튼 → {el,setLabel,setDisabled}. opt:{cls:'blue|green|red|yellow|violet|grey|white', wide} */
  ui.button = function (label, fn, opt) {
    opt = opt || NOOPT;
    const el = mk('button', 'hbtn sm ' + (opt.cls || 'blue') + (opt.wide ? ' wide' : '')); el.type = 'button'; el.textContent = label;
    const h = { el: el, setLabel: function (t) { el.textContent = t; return h; }, setDisabled: function (b) { el.disabled = !!b; return h; } };
    el.addEventListener('click', function (ev) { if (el.disabled) return; HNR.sfx('click'); ctx._stats.clicks++; safe(fn, ev, h); });
    mount(el); return h;
  };
  /* 누르는 동안만(스위치). pointerdown/up/cancel/leave/lostpointercapture/blur 를 모두 처리해 「눌린 채 남는」 일이 없게 */
  ui.hold = function (label, onDown, onUp, opt) {
    opt = opt || NOOPT;
    const el = mk('button', 'hbtn sm sp-hold ' + (opt.cls || 'green') + (opt.wide ? ' wide' : '')); el.type = 'button'; el.textContent = label;
    let held = false, pid = null;
    const release = function (ev) {
      if (!held) return;
      if (ev && ev.pointerId != null && pid != null && ev.pointerId !== pid) return;
      held = false; pid = null; el.classList.remove('down'); safe(onUp, ev, h);
    };
    const down = function (ev) {
      if (held || el.disabled || (ev.button != null && ev.button !== 0)) return;
      held = true; pid = ev.pointerId; el.classList.add('down');
      try { el.setPointerCapture(ev.pointerId); } catch (e) { /* 지원 안 함 */ }
      ctx._stats.holds++; HNR.sfx('click'); safe(onDown, ev, h); ev.preventDefault();
    };
    el.addEventListener('pointerdown', down);
    ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave'].forEach(function (t) { el.addEventListener(t, release); });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    const onBlur = function () { release(null); }; window.addEventListener('blur', onBlur);
    const h = { el: el, release: function () { release(null); }, isHeld: function () { return held; }, setDisabled: function (b) { if (b) release(null); el.disabled = !!b; return h; }, _off: function () { window.removeEventListener('blur', onBlur); } };
    ctx._holds.push(h);
    mount(el); return h;
  };
  /* 토글(스위치 모양) → {el,set(v,silent),get}. opt:{xray:true} 면 보라색 투시경 모양 */
  ui.toggle = function (label, initial, fn, opt) {
    const el = mk('button', 'sp-toggle' + (opt && opt.xray ? ' xray' : '')); el.type = 'button'; el.textContent = label;
    let on = !!initial; el.classList.toggle('on', on);
    const set = function (v, silent) { on = !!v; el.classList.toggle('on', on); if (!silent) safe(fn, on); };
    el.addEventListener('click', function () { HNR.sfx('click'); set(!on); });
    mount(el); return { el: el, set: set, get: function () { return on; } };
  };
  /* 여러 개 중 하나. items:[{v,t}] → {el,set(v,silent),get} */
  ui.seg = function (label, items, initial, fn) {
    const wrap = mk('div', 'sp-ctl'); if (label) wrap.appendChild(mk('span', 'sp-label', esc(label)));
    const seg = mk('div', 'sp-seg'); wrap.appendChild(seg); let cur = initial;
    const btns = items.map(function (it) { const b = mk('button'); b.type = 'button'; b.textContent = it.t; b.classList.toggle('on', it.v === cur); b.addEventListener('click', function () { if (it.v === cur) return; HNR.sfx('click'); set(it.v); }); seg.appendChild(b); return b; });
    const set = function (v, silent) { cur = v; btns.forEach(function (b, i) { b.classList.toggle('on', items[i].v === v); }); if (!silent) safe(fn, v); };
    mount(wrap); return { el: wrap, set: set, get: function () { return cur; } };
  };
  /* 슬라이더 → {el,set(v,silent),get}. fmt(v) → 표시 글자 */
  ui.slider = function (label, min, max, step, initial, fn, fmt) {
    fmt = fmt || function (v) { return String(v); };
    const wrap = mk('div', 'sp-ctl'); if (label) wrap.appendChild(mk('span', 'sp-label', esc(label)));
    const box = mk('div', 'sp-slider'), inp = mk('input'), out = mk('output');
    inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = initial; out.textContent = fmt(+initial);
    box.appendChild(inp); box.appendChild(out); wrap.appendChild(box);
    let cur = +initial;
    inp.addEventListener('input', function () { cur = +inp.value; out.textContent = fmt(cur); safe(fn, cur); });
    mount(wrap);
    return { el: wrap, input: inp, set: function (v, silent) { cur = clamp(+v, min, max); inp.value = cur; out.textContent = fmt(cur); if (!silent) safe(fn, cur); }, get: function () { return cur; } };
  };
  /* 숫자·상태 표시 → {el,set(text)} */
  ui.readout = function (label, initial) {
    const el = mk('div', 'sp-readout', '<span>' + esc(label) + '</span><b></b>'), b = el.querySelector('b'); b.textContent = initial == null ? '—' : initial;
    mount(el); return { el: el, set: function (t) { const s = String(t); if (b.textContent !== s) b.textContent = s; } };
  };
  /* 막대 게이지 → {el,set(v)}. opt:{min:0,max:1,unit:'',fmt(v)} */
  ui.meter = function (label, opt) {
    opt = opt || NOOPT; const min = opt.min || 0, max = opt.max == null ? 1 : opt.max, unit = opt.unit || '';
    const el = mk('div', 'sp-meter', '<span class="sp-label">' + esc(label) + '</span><div class="track"><i></i></div><div class="val">—</div>'), bar = el.querySelector('i'), val = el.querySelector('.val');
    mount(el);
    return { el: el, set: function (v) { const k = clamp((v - min) / ((max - min) || 1), 0, 1); bar.style.width = (k * 100).toFixed(1) + '%'; val.textContent = opt.fmt ? opt.fmt(v) : (Math.round(v * 100) / 100) + unit; } };
  };
  /* 「예상 먼저!」 선택지 → Promise<index>. 고른 답은 세션에 기억되어 다시 들어오면 「내 예상」으로 보이고 곧바로 풀린다 */
  ui.predict = function (question, options, opt) {
    opt = opt || NOOPT;
    const key = opt.key || ('p' + hashStr(question));
    const S = HNR.S, store = S ? (S.simPredict = S.simPredict || {}) : {}, mine = store[ctx.id] = store[ctx.id] || {};
    const box = mk('div', 'sp-predict'), opts = mk('div', 'opts');
    box.appendChild(mk('div', 'q', esc(question))); box.appendChild(opts);
    return new Promise(function (res) {
      let picked = false;
      const pick = function (i, remembered) {
        if (picked) return; picked = true;
        box.classList.add('done');
        opts.querySelectorAll('.hbtn').forEach(function (b, k) { b.disabled = true; b.classList.toggle('yellow', k === i); b.classList.toggle('white', k !== i); });
        box.appendChild(mk('div', 'mine', '내 예상: <b>' + esc(options[i]) + '</b>' + (remembered ? ' <small>(아까 골랐어요)</small>' : '') + '<br>실험으로 확인해 보아요!'));
        if (!remembered) { mine[key] = i; if (HNR.state) HNR.state.save(); HNR.sfx('pop'); }
        ctx._stats.predicts++;
        res(i);
      };
      options.forEach(function (o, i) { const b = mk('button', 'hbtn sm white'); b.type = 'button'; b.textContent = o; b.addEventListener('click', function () { pick(i, false); }); opts.appendChild(b); });
      mount(box);
      if (mine[key] != null && mine[key] >= 0 && mine[key] < options.length) pick(mine[key], true);
    });
  };
  /* 투시경 토글(기본 꺼짐) → {el,set,get}. xray(fn) 처럼 라벨을 빼도 된다 */
  ui.xray = function (label, fn) {
    if (typeof label === 'function') { fn = label; label = null; }
    const t = ui.toggle('👓 ' + (label || '투시경'), false, function (on) { ctx._stats.xray++; safe(fn, on); }, { xray: true });
    ctx._xray = t; return t;
  };
  /* 「이 모형은요」 접이식(패널 아래). 다시 부르면 내용이 바뀐다 */
  ui.about = function (html) { const d = dom(); d.about.hidden = false; d.aboutBody.innerHTML = html; return d.about; };
  /* 접이식 하나 더(제목 자유) */
  ui.fold = function (title, html, open) { const f = mk('details', 'sp-fold', '<summary>' + esc(title) + '</summary><div class="sp-fold-body">' + html + '</div>'); if (open) f.open = true; return mount(f); };
  return ui;
}

/* ── 위젯 데모(시험·캡처용): 모든 위젯을 한 번씩. ?simdemo=1 로 자리표시 시뮬에서 볼 수 있다 ── */
sim.demoPanel = function (ctx) {
  const ui = ctx.ui;
  ui.note('위젯 데모예요. 글 안에 <b>굵은 글씨</b>도 넣을 수 있어요.');
  ui.note('주의 문단은 이렇게 보여요.', { warn: true });
  ui.predict('구리관에 떨어뜨린 자석은 어떻게 될까요?', ['더 빨리 떨어져요', '똑같이 떨어져요', '더 천천히 내려와요'], { key: 'demo' }).then(function (i) { ctx.toast('내 예상 ' + (i + 1) + '번! 실험으로 확인해 보아요'); });
  ui.row(function () { ui.button('단추', function () { ctx.toast('단추를 눌렀어요'); }); ui.button('빨강', noop, { cls: 'red' }); ui.button('노랑', noop, { cls: 'yellow' }); });
  const ro = ui.readout('스위치', '꺼짐');
  ui.hold('🔘 누르는 동안 스위치 켜기', function () { ro.set('켜짐'); }, function () { ro.set('꺼짐'); }, { wide: true });
  ui.toggle('방 불 켜기', true, function (on) { ro.set(on ? '불 켜짐' : '불 꺼짐'); });
  ui.seg('관 고르기', [{ v: 'cu', t: '구리관' }, { v: 'ac', t: '아크릴관' }, { v: 'al', t: '알루미늄관' }], 'cu', function (v) { ro.set('관: ' + v); });
  const m = ui.meter('떨어진 거리', { min: 0, max: 1, unit: ' m' }); m.set(0.62);
  ui.slider('자석 세기', 0, 100, 5, 60, function (v) { m.set(v / 100); }, function (v) { return v + ' %'; });
  ui.xray('전류 투시경', function (on) { ro.set(on ? '투시경 켜짐' : '투시경 꺼짐'); });
  ui.about('이 데모 패널은 위젯 모양을 확인하려고 만든 거예요. 진짜 시뮬에서는 모형의 단순화를 여기에 솔직하게 적어요.');
  ui.fold('접이식 예시', '아무 글이나 접어 둘 수 있어요.');
};

/* ═══════════ 패널(DOM) ═══════════ */
function buildPanel(ctx) {
  const def = ctx.def, id = ctx.id;
  panelEl.innerHTML = '';
  const gate = def.gate, sub = (gate ? '관문 ' + gate + ' · ' : '') + ST('gates.' + gate + '.exp', def.subtitle || '');
  const head = mk('div', 'sp-head', '<div class="sp-title">' + esc(ctx.title) + '<small>' + esc(sub) + '</small></div>');
  const exit = mk('button', 'hbtn sm red sp-exit'); exit.type = 'button'; exit.textContent = '나가기'; exit.addEventListener('click', function () { sim.close(); }); head.appendChild(exit);
  const body = mk('div', 'sp-body');
  const lead = ST('sims.' + id + '.lead', def.lead || ''); if (lead) body.appendChild(mk('div', 'sp-lead', esc(lead)));
  const tasks = mk('ul', 'sp-tasks', '<li class="hd">탐구 과제</li>' + def.tasks.map(function (t) { return '<li class="sp-task' + (sim.taskDone(id, t.id) ? ' done' : '') + '" data-task="' + esc(t.id) + '">' + esc(t.text) + '</li>'; }).join(''));
  body.appendChild(tasks);
  const pass = mk('div', 'sp-pass', '🎉 탐구 완료! 시험관에게 돌아가요'); pass.hidden = true;
  const pb = mk('button', 'hbtn sm green wide'); pb.type = 'button'; pb.textContent = '🚪 시험관에게 돌아가기'; pb.addEventListener('click', function () { sim.close(); }); pass.appendChild(pb);
  body.appendChild(pass);
  const W = mk('div', 'sp-widgets'); body.appendChild(W);
  const about = mk('details', 'sp-fold sp-about', '<summary>이 모형은요</summary><div class="sp-fold-body"></div>'); about.hidden = true; body.appendChild(about);
  const sci = ST('sims.' + id + '.science', def.science || ''), cau = ST('sims.' + id + '.caution', def.caution || '');
  if (sci || cau) body.appendChild(mk('details', 'sp-fold sp-science', '<summary>원리</summary><div class="sp-fold-body">' + (sci ? '<p>' + esc(sci) + '</p>' : '') + (cau ? '<div class="sp-note warn">⚠ ' + esc(cau) + '</div>' : '') + '</div>'));
  panelEl.appendChild(head); panelEl.appendChild(body);
  ctx._dom = { W: W, cur: null, tasks: tasks, pass: pass, about: about, aboutBody: about.querySelector('.sp-fold-body'), body: body, detached: false };
  if (sim.tasksDone(id)) showPass(ctx, true);
}
function showPass(ctx, quiet) {
  const d = ctx._dom; if (d && !d.detached) d.pass.hidden = false;
  if (!quiet) { HNR.sfx('badge'); HNR.ui.toast('탐구 완료! 시험관에게 돌아가요', { icon: '🎉', cls: 'gold', ms: 3200 }); }
}
function showBubble(text, ms) {
  if (!bubbleEl) { bubbleEl = mk('div', 'sp-bubble'); bubbleEl.hidden = true; document.body.appendChild(bubbleEl); }
  bubbleEl.textContent = '🤖 ' + text; bubbleEl.hidden = false;
  bubbleEl.style.animation = 'none'; void bubbleEl.offsetWidth; bubbleEl.style.animation = '';
  clearTimeout(bubbleTimer); bubbleTimer = setTimeout(function () { bubbleEl.hidden = true; }, ms || 2400);
}
function hideBubble() { clearTimeout(bubbleTimer); if (bubbleEl) bubbleEl.hidden = true; }
function applyInset() {
  if (!activeId || !panelEl) return;
  const portrait = window.innerHeight > window.innerWidth, r = panelEl.getBoundingClientRect();
  HNR.cam.inset(portrait ? { bottom: Math.round(r.height || window.innerHeight * 0.45) } : { right: Math.round(r.width || 340) });
}

/* ═══════════ 장치 파츠 끌기 · 누르기(시뮬 모드에서만) ═══════════ */
const invM = new THREE.Matrix4(), locRay = new THREE.Ray(), plane = new THREE.Plane(), hitPt = new V3(), tmpV = new V3();
let ptr = null;   // 지금 추적 중인 포인터 {id, x, y, x0, y0, rec, moved}
function pickRec(ctx, raycaster) {
  const list = ctx._pick; if (!list.length) return null;
  const hits = raycaster.intersectObjects(list, true); if (!hits.length) return null;
  const h = hits[0]; let o = h.object;
  while (o) { const rec = ctx._recOf.get(o); if (rec) return { rec: rec, hit: h }; o = o.parent; }
  return null;
}
function planeOf(rec) {
  const at = rec.at, n = rec.plane === 'xy' ? tmpV.set(0, 0, 1) : rec.plane === 'yz' ? tmpV.set(1, 0, 0) : tmpV.set(0, 1, 0);
  plane.setFromNormalAndCoplanarPoint(n, at);
}
function localHit(ctx, rec, ray) {
  invM.copy(ctx.root.matrixWorld).invert(); locRay.copy(ray).applyMatrix4(invM); planeOf(rec);
  return locRay.intersectPlane(plane, hitPt) ? hitPt : null;
}
const capHandlers = {
  down: function (e) {
    const ctx = activeCtx; if (!ctx || ptr) return;   // 두 번째 손가락은 무시
    const r = pickRec(ctx, HNR.input.raycaster); if (!r) return;
    ptr = { id: e.id, x: e.x, y: e.y, x0: e.x, y0: e.y, rec: r.rec, moved: false, hit: r.hit };
    if (r.rec.kind === 'drag') {
      ctx._stats.drags++; r.rec.active = true;
      const p = localHit(ctx, r.rec, e.ray); r.rec.last = p ? p.clone() : null;
      const info = { mesh: r.rec.mesh, object: r.hit.object, x: e.x, y: e.y, world: r.hit.point };
      try { if (r.rec.onStart) r.rec.onStart(p, info); } catch (err) { console.error('[HNR.sim] drag.onStart 오류', err); }
    }
  },
  move: function (e) {
    const ctx = activeCtx; if (!ctx || !ptr || e.id !== ptr.id) return;
    ptr.x = e.x; ptr.y = e.y; if (!ptr.moved && Math.hypot(e.x - ptr.x0, e.y - ptr.y0) > 12) ptr.moved = true;
    if (ptr.rec.kind !== 'drag') return;
    const p = localHit(ctx, ptr.rec, e.ray); if (!p) return;
    ptr.rec.last = ptr.rec.last ? ptr.rec.last.copy(p) : p.clone(); ctx._stats.moves++;
    try { if (ptr.rec.onMove) ptr.rec.onMove(p, { mesh: ptr.rec.mesh, x: e.x, y: e.y }); } catch (err) { console.error('[HNR.sim] drag.onMove 오류', err); }
  },
  up: function (e) { if (ptr && e.id === ptr.id) endPointer(false, e); },
  cancel: function (e) { if (ptr && e.id === ptr.id) endPointer(true, e); },
  key: function (code, ev) { const ctx = activeCtx; if (ctx && ctx.def.key) { try { return ctx.def.key(ctx, code, ev) === true; } catch (err) { console.error('[HNR.sim] key 오류', err); } } return false; },
  wheel: function (dy, ev) { const ctx = activeCtx; if (ctx && ctx.def.wheel) { try { ctx.def.wheel(ctx, dy, ev); } catch (err) { console.error('[HNR.sim] wheel 오류', err); } } }
};
function endPointer(cancel, e) {
  const p = ptr; ptr = null; if (!p || !activeCtx) return;
  const ctx = activeCtx, rec = p.rec;
  if (rec.kind === 'drag') {
    rec.active = false; const pt = e && e.ray ? localHit(ctx, rec, e.ray) || rec.last : rec.last;
    try { if (rec.onEnd) rec.onEnd(pt, { mesh: rec.mesh, cancel: !!cancel, x: p.x, y: p.y }); } catch (err) { console.error('[HNR.sim] drag.onEnd 오류', err); }
  } else if (!cancel && !p.moved) {
    ctx._stats.taps++; HNR.sfx('click');
    try { rec.fn({ mesh: rec.mesh, object: p.hit.object, point: p.hit.point, x: p.x, y: p.y }); } catch (err) { console.error('[HNR.sim] tap 오류', err); }
  }
}

/* ═══════════ ctx ═══════════ */
function makeCtx(id, def, root, anchor) {
  const ctx = {
    id: id, def: def, root: root, anchor: anchor,
    title: ST('sims.' + id + '.title', def.title || id),
    model: (HNR.models && HNR.models[id]) || null,
    P: wrapWith(HNR.P, root), props: wrapWith(HNR.props, root),
    get active() { return activeId === id; },
    get S() { return HNR.S; },
    _pick: [], _recOf: new Map(), _taps: [], _drags: [], _holds: [], _dom: null,
    _stats: { taps: 0, drags: 0, moves: 0, holds: 0, clicks: 0, predicts: 0, xray: 0 }
  };
  /* 로컬 좌표 → 월드(새 Vector3 또는 out) */
  ctx.toWorld = function (v, out) { root.updateMatrixWorld(true); return root.localToWorld(toV3(v, out)); };
  ctx.toLocal = function (v, out) { root.updateMatrixWorld(true); return root.worldToLocal(toV3(v, out)); };
  ctx.project = function (obj) { return sim.project(obj); };
  /* 과제 완료 표시(체크 + 저장 + 효과음). 이미 끝난 과제면 false */
  ctx.task = function (tid) {
    if (!def.tasks.some(function (t) { return t.id === tid; })) { console.warn('[HNR.sim] 모르는 과제 id: ' + id + '/' + tid); return false; }
    const S = HNR.S; if (!S) return false;
    S.simTasks = S.simTasks || {}; const m = S.simTasks[id] = S.simTasks[id] || {};
    if (m[tid]) return false;
    m[tid] = true; HNR.state.save();
    const d = ctx._dom; if (d) { const li = d.tasks.querySelector('[data-task="' + tid + '"]'); if (li) li.classList.add('done'); }
    HNR.sfx('ok'); HNR.emit('sim:task', { id: id, task: tid });
    if (sim.tasksDone(id)) { showPass(ctx, false); HNR.emit('sim:done', id); }
    return true;
  };
  ctx.tasksDone = function () { return sim.tasksDone(id); };
  ctx.taskDone = function (tid) { return sim.taskDone(id, tid); };
  ctx.ui = uiFor(ctx);
  /* 장치 위 말풍선(비트 한마디) */
  ctx.toast = function (text, ms) { if (activeId === id) showBubble(text, ms); };
  /* 시뮬 모드 동안 화면 밝기(암실). null 이면 구역 값 */
  ctx.setExposure = function (v) { ctx._exposure = v; if (activeId === id) HNR.fx.setExposure(v); };
  /* 파츠 끌기. opt:{plane:'xz'|'xy'|'yz', at:로컬 점(기본 mesh 자리), onStart(p,info), onMove(p,info), onEnd(p,info)} → {remove, rec} */
  ctx.drag = function (mesh, opt) {
    opt = opt || NOOPT;
    root.updateMatrixWorld(true);
    const at = opt.at != null ? toV3(opt.at) : ctx.toLocal(mesh.getWorldPosition(new V3()));
    const rec = { kind: 'drag', mesh: mesh, plane: opt.plane || 'xz', at: at, onStart: opt.onStart, onMove: opt.onMove, onEnd: opt.onEnd, active: false, last: null };
    ctx._drags.push(rec); ctx._pick.push(mesh); ctx._recOf.set(mesh, rec);
    return { rec: rec, remove: function () { unreg(ctx, mesh, rec); } };
  };
  /* 파츠 누르기(탭). fn(info) */
  ctx.tap = function (mesh, fn) {
    const rec = { kind: 'tap', mesh: mesh, fn: fn };
    ctx._taps.push(rec); ctx._pick.push(mesh); ctx._recOf.set(mesh, rec);
    return { rec: rec, remove: function () { unreg(ctx, mesh, rec); } };
  };
  return ctx;
}
function unreg(ctx, mesh, rec) {
  ctx._recOf.delete(mesh); ctx._pick = ctx._pick.filter(function (m) { return m !== mesh; });
  ctx._drags = ctx._drags.filter(function (r) { return r !== rec; }); ctx._taps = ctx._taps.filter(function (r) { return r !== rec; });
}

/* ═══════════ 세우기(mount) ═══════════ */
let ringGeo = null, ringMat = null;
function standMarker(ctx, x, z) {
  if (!ringGeo) { ringGeo = new THREE.RingGeometry(26, 38, 28); ringGeo.rotateX(-Math.PI / 2); ringMat = new THREE.MeshBasicMaterial({ color: 0x4ac7e3, transparent: true, opacity: 0.75, depthWrite: false }); }
  const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.set(x, 6.2, z); ring.userData.dynamic = true; ring.raycast = noop; ring.renderOrder = 3; HNR.scene.add(ring);
  const lbl = HNR.P.text('🔬 여기서 실험해요', { h: 18, x: x, y: 34, z: z, parent: HNR.scene, bg: 'rgba(13,105,172,.95)', color: '#ffffff' }); lbl.raycast = noop;
  ctx._ring = ring; ctx._ringLbl = lbl;
}
function mount(id, a) {
  const def = defs[id], root = new THREE.Group();
  root.name = 'sim:' + id; root.userData.dynamic = true; root.userData.sim = id;
  root.position.set(a.x || 0, a.y || 0, a.z || 0); root.rotation.y = a.ry || 0;
  HNR.scene.add(root); root.updateMatrixWorld(true);
  const ctx = makeCtx(id, def, root, a);
  mounted[id] = ctx; mountedIds.push(id);
  try { if (def.build) def.build(ctx); } catch (e) { console.error('[HNR.sim] build 오류 ' + id, e); ctx._buildError = String(e); }
  root.updateMatrixWorld(true);
  const s = def.size, hw = s.w / 2, hd = s.d / 2;
  ctx.rect = localRect(root, -hw, -hd, hw, hd, 4);
  ctx.footprint = HNR.world.addBlock(Object.assign({ id: 'sim:' + id }, ctx.rect));
  const f = ctx.toWorld([0, 0, hd + 60]);
  ctx.stand = { x: f.x, z: f.z, yaw: a.ry || 0 };
  standMarker(ctx, f.x, f.z);
  ctx.interact = HNR.world.addInteract({ id: 'sim:' + id, x: f.x, z: f.z, r: 130, mesh: root,
    label: function () { return '🔬 실험하기 · ' + ctx.title + (sim.tasksDone(id) ? ' ✓' : ''); },
    onUse: function () { return sim.open(id); } });
  return ctx;
}
function fallbackAnchors() { const o = {}; order.forEach(function (id, i) { o[id] = i < 4 ? { x: 260 + i * 350, z: 380, ry: 0 } : { x: 260 + (i - 4) * 350, z: 1000, ry: Math.PI }; }); return o; }
/* 등록된 시뮬을 전부 HNR.map.anchors 자리에 세운다(core 의 start 가 map.build 뒤에 부른다). 세운 id 배열을 돌려준다 */
sim.mountAll = function () {
  panelEl = $('#simPanel');
  const map = HNR.map || {}; let anchors = map.anchors || null;
  if (!anchors || !Object.keys(anchors).length) { anchors = fallbackAnchors(); if (order.length) console.warn('[HNR.sim] HNR.map.anchors 가 없어 시험 마당 자리에 세워요'); }
  order.forEach(function (id) {
    if (mounted[id]) return;
    const a = anchors[id]; if (!a) { console.warn('[HNR.sim] 앵커가 없어요: ' + id); return; }
    try { mount(id, a); } catch (e) { console.error('[HNR.sim] mount 오류 ' + id, e); }
  });
  return mountedIds.slice();
};

/* ═══════════ 시뮬 모드 열기 · 닫기 ═══════════ */
/* 시뮬 모드 진입. 들어가면(카메라가 움직이기 시작하면) 풀리는 Promise<true>. 나가는 때는 'sim:exit' 이벤트 */
sim.open = function (id) {
  const ctx = mounted[id];
  if (!ctx) return Promise.reject(new Error('[HNR.sim] 세워지지 않은 시뮬: ' + id));
  if (activeId === id) return Promise.resolve(true);
  if (activeId) closeNow();
  if (!panelEl) panelEl = $('#simPanel');
  activeId = id; activeCtx = ctx; ptr = null;
  const pl = HNR.player, st = ctx.stand;
  if (Math.hypot(pl.x - st.x, pl.z - st.z) > 300) pl.teleport(st.x, st.z, st.yaw);   // ?sim= 으로 바로 들어올 때
  pl.lock(true); HNR.hud.sim(true); HNR.hud.hideHint();
  applyInset();
  const c = ctx.def.camera; HNR.cam.override({ pos: ctx.toWorld(c.pos), look: ctx.toWorld(c.look), fov: c.fov });
  HNR.input.capture(capHandlers);
  if (ctx._exposure != null) HNR.fx.setExposure(ctx._exposure);
  const fw = HNR.world.follower && HNR.world.follower.g; if (fw) { hiddenFollower = fw; fw.visible = false; }
  buildPanel(ctx);
  try { if (ctx.def.enter) ctx.def.enter(ctx); } catch (e) { console.error('[HNR.sim] enter 오류 ' + id, e); }
  HNR.sfx('open');
  HNR.emit('sim:enter', id);
  return Promise.resolve(true);
};
sim.close = function () { if (!activeId) return false; closeNow(); return true; };
function closeNow() {
  const ctx = activeCtx, id = activeId;
  endPointer(true, null);
  ctx._holds.forEach(function (h) { try { h.release(); h._off(); } catch (e) { /* 무시 */ } }); ctx._holds.length = 0;
  try { if (ctx.def.exit) ctx.def.exit(ctx); } catch (e) { console.error('[HNR.sim] exit 오류 ' + id, e); }
  activeId = null; activeCtx = null; ptr = null;
  HNR.input.capture(null); HNR.cam.override(null); HNR.cam.inset(null); HNR.fx.setExposure(null); HNR.hud.sim(false); HNR.player.lock(false);
  if (hiddenFollower) { hiddenFollower.visible = true; hiddenFollower = null; }
  if (panelEl) panelEl.innerHTML = '';
  ctx._dom = null; hideBubble();
  HNR.sfx('click');
  HNR.emit('sim:exit', id);
}
HNR.on('key', function (code) { if (code === 'Escape' && activeId && !HNR.ui.isOpen()) sim.close(); });
HNR.on('resize', function () { if (activeId) applyInset(); });

/* ═══════════ 매 틱: 모든 장치 update(active 플래그). 예외가 나도 루프는 산다 ═══════════ */
function errOnce(ctx, where, e) { ctx._errs = (ctx._errs || 0) + 1; if (ctx._errs <= 3) console.error('[HNR.sim] ' + where + ' 오류 ' + ctx.id + (ctx._errs === 3 ? ' (이후 생략)' : ''), e); }
HNR.on('tick', function (dt, t) {
  for (let i = 0; i < mountedIds.length; i++) {
    const ctx = mounted[mountedIds[i]], def = ctx.def;
    if (ctx._ring) { const on = activeId === ctx.id; ctx._ring.visible = !on; if (ctx._ringLbl) ctx._ringLbl.visible = !on; if (!on) { const s = 1 + Math.sin(t * 3 + i) * 0.08; ctx._ring.scale.set(s, 1, s); } }
    if (!def.update) continue;
    try { def.update(ctx, dt, t, activeId === ctx.id); } catch (e) { errOnce(ctx, 'update', e); }
  }
});

/* ═══════════ 스모크 시험(HNR.selftest 에 합쳐진다) ═══════════ */
function synthPointer(type, x, y, id) { const el = HNR.renderer.domElement; el.dispatchEvent(new PointerEvent(type, { pointerId: id || 91, pointerType: 'mouse', clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true })); }
sim.selftest = async function () {
  const checks = {}, info = {};
  const chk = function (n, ok, i) { checks[n] = { ok: !!ok, info: i == null ? '' : String(i) }; };
  const step = function (n, render) { for (let i = 0; i < n; i++) HNR.tick(1 / 30, !(render && i === n - 1)); };
  const S = HNR.S, pl = HNR.player;
  const keepTasks = JSON.stringify((S && S.simTasks) || {}), keepPred = JSON.stringify((S && S.simPredict) || {}), home = { x: pl.x, z: pl.z, yaw: pl.yaw };
  chk('sim.mounted', order.length > 0 && mountedIds.length === order.length, mountedIds.length + '/' + order.length + ' ' + mountedIds.join(','));
  for (let k = 0; k < mountedIds.length; k++) {
    const id = mountedIds[k], ctx = mounted[id], def = ctx.def, errs0 = HNR._errors.length, note = []; let ok = true;
    try {
      if (ctx._buildError) { ok = false; note.push('build 오류'); }
      S.simTasks[id] = {};
      await sim.open(id); step(40, true);
      if (activeId !== id) { ok = false; note.push('active=' + activeId); }
      if (!document.body.classList.contains('sim')) { ok = false; note.push('body.sim 없음'); }
      if (!pl.locked) { ok = false; note.push('플레이어 잠금 안 됨'); }
      const want = ctx.toWorld(def.camera.pos), d = HNR.camera.position.distanceTo(want); if (d > 8) { ok = false; note.push('카메라 d=' + d.toFixed(1)); }
      const n = panelEl.querySelectorAll('.sp-task').length; if (n !== def.tasks.length) { ok = false; note.push('과제 ' + n + '/' + def.tasks.length); }
      if (!def.tasks.length) { ok = false; note.push('과제가 없음'); }
      if (ctx._taps.length) {   // 합성 포인터로 탭
        const t0 = ctx._stats.taps, p = sim.project(ctx._taps[0].mesh);
        synthPointer('pointerdown', p.x, p.y); synthPointer('pointerup', p.x, p.y);
        if (ctx._stats.taps !== t0 + 1) { ok = false; note.push('tap 안 먹음'); }
      }
      if (ctx._drags.length) {  // 합성 포인터로 끌기
        const m0 = ctx._stats.moves, p = sim.project(ctx._drags[0].mesh);
        synthPointer('pointerdown', p.x, p.y, 92); synthPointer('pointermove', p.x + 30, p.y, 92); synthPointer('pointermove', p.x + 60, p.y + 10, 92); synthPointer('pointerup', p.x + 60, p.y + 10, 92);
        if (ctx._stats.moves < m0 + 2 || ptr) { ok = false; note.push('drag 안 먹음'); }
      }
      def.tasks.forEach(function (t) { ctx.task(t.id); });
      if (!sim.tasksDone(id)) { ok = false; note.push('tasksDone=false'); }
      if (panelEl.querySelector('.sp-pass').hidden) { ok = false; note.push('완료 표시 안 뜸'); }
      sim.close(); step(40, true);
      if (activeId !== null || document.body.classList.contains('sim') || pl.locked || HNR.cam.isOverride() || HNR.input.captured) { ok = false; note.push('close 뒤 상태 안 돌아옴'); }
      if (HNR._errors.length > errs0) { ok = false; note.push('오류 +' + (HNR._errors.length - errs0)); }
    } catch (e) { ok = false; note.push(String(e && e.message || e)); try { sim.close(); } catch (e2) { /* 무시 */ } }
    chk('sim.' + id, ok, note.join(' · '));
    info[id] = { tasks: def.tasks.length, taps: ctx._taps.length, drags: ctx._drags.length, stats: Object.assign({}, ctx._stats) };
  }
  if (S) { S.simTasks = JSON.parse(keepTasks); S.simPredict = JSON.parse(keepPred); HNR.state.save(); }
  pl.teleport(home.x, home.z, home.yaw); step(5, true); hideBubble();
  return { checks: checks, info: info };
};
if (typeof HNR.selftest === 'function') {
  const base = HNR.selftest;
  /* 시뮬 항목을 먼저 돌리고 core 스모크 시험을 돌린 뒤 결과를 합친다(title 은 한 번만 TEST: 가 된다) */
  HNR.selftest = async function () {
    let add = { checks: {}, info: {} };
    try { add = await sim.selftest(); } catch (e) { add.checks['sim.exception'] = { ok: false, info: String(e && e.stack || e) }; }
    const R = await base();
    Object.keys(add.checks).forEach(function (k) { R.checks[k] = add.checks[k]; if (add.checks[k].ok) R.pass++; else { R.ok = false; R.fail.push(k); } });
    R.sim = add.info;
    const out = $('#test-out'); if (out) out.textContent = JSON.stringify(R, null, 1);
    document.title = 'TEST:' + JSON.stringify({ ok: R.ok, pass: R.pass, fail: R.fail });
    return R;
  };
}
})();
