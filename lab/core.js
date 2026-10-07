/* ═══════════════════════════════════════════════════════════════
   HNR Tech 3D 연구소 v4 — core.js (엔진)
   렌더 · 파츠(P) · 소품(props) · 캐릭터(char) · 월드(world) · 플레이어 ·
   카메라(cam) · 입력(input) · 가이드(guide) · 상태(state) · UI(ui) · 효과음(sfx) ·
   boot / tick / selftest.
   - 클래식 스크립트. 전역은 window.HNR 하나. file:// 로 열어도 동작.
   - 문서: lab/API.md (다른 담당은 그 문서를 먼저 본다)
   ═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';
const HNR = window.HNR = window.HNR || {};
const THREE = window.THREE;
const CONFIG = HNR.CONFIG = Object.assign({ version:'4.0.0', sessionKey:'hnr.lab.v4', compassPointsAway:true, g6:{ leakOhm:100e3 }, exposure:1.05, debug:false }, HNR.CONFIG || {});
const PCFG = Object.assign({ speed:330, radius:14, eye:76 }, CONFIG.player || {});
const PER_M = (CONFIG.units && CONFIG.units.perMeter) || 60;

const $ = s => document.querySelector(s);
const noop = function () {};
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;
const TAU = Math.PI * 2;
const smooth = k => k * k * (3 - 2 * k);
function lerpAngle(a, b, k) { const d = ((b - a) % TAU + TAU * 1.5) % TAU - Math.PI; return a + d * k; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c])); }
HNR.util = { clamp, lerp, lerpAngle, smooth, esc };

/* ── URL 파라미터 ── */
const Q = {};
try { new URLSearchParams(location.search).forEach((v, k) => { Q[k] = v; }); } catch (e) {}
HNR.Q = Q;
const AUTO = Q.auto === '1';
const UA = navigator.userAgent || '';
HNR.MOBILE = Q.mobile === '1' || /Android|iPad|iPhone|Mobile|CrOS/.test(UA) || (navigator.maxTouchPoints || 0) > 1;

/* ── 이벤트 버스 ── */
const handlers = Object.create(null);
HNR.on = function (evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); return function () { HNR.off(evt, fn); }; };
HNR.off = function (evt, fn) { const l = handlers[evt]; if (!l) return; const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); };
HNR.once = function (evt, fn) { const off = HNR.on(evt, function (a, b, c) { off(); fn(a, b, c); }); return off; };
HNR.emit = function (evt, a, b, c) {
  const l = handlers[evt]; if (!l) return;
  for (let i = 0; i < l.length; i++) { try { l[i](a, b, c); } catch (e) { console.error('[HNR] "' + evt + '" 핸들러 오류', e); } }
};
HNR._errors = [];
window.addEventListener('error', function (e) { HNR._errors.push(String(e.message || e.type) + (e.filename ? ' @' + String(e.filename).split('/').pop() + ':' + e.lineno : '')); });
window.addEventListener('unhandledrejection', function (e) { HNR._errors.push('unhandledrejection: ' + String(e.reason && e.reason.message || e.reason)); });

/* ── 고정 난수(캡처가 매번 같게) ── */
function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry(20261005);
HNR.rand = rnd;

/* ── 색 · 단위 ── */
const U = HNR.U = 16;
const BRICK = HNR.BRICK = {
  white:0xf2f3f3, grey:0xa3a2a5, dgrey:0x635f62, black:0x1b2a35, red:0xc4281c, blue:0x0d69ac, green:0x4b974b,
  yellow:0xf5cd30, orange:0xda8541, violet:0x6b327c, skin:0xf5cd30, brown:0x624732, lime:0xa4bd47, cyan:0x4ac7e3,
  pink:0xe8adc8, sand:0xe7d3a1, copper:0xb87333, acrylic:0xbfe9f7, gold:0xf5c518,
  navy:0x1f3a5f, cream:0xfff6d6, asphalt:0x3a3f4a, floor:0xd9d9dc, steel:0xc8ccd2, grass:0x4b974b
};
const _col = new THREE.Color();
HNR.LIN = function (hex) { return _col.set(hex).convertSRGBToLinear().getHex(); };
const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
HNR.FONT = FONT;
function cssHex(c) { return typeof c === 'string' ? c : '#' + ('000000' + (c >>> 0).toString(16)).slice(-6); }
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function fitFont(g, text, weight, size, maxW, min) { let s = size; do { g.font = weight + ' ' + s + 'px ' + FONT; if (g.measureText(text).width <= maxW) break; s -= 2; } while (s > (min || 12)); return s; }
HNR.util.makeCanvas = makeCanvas; HNR.util.roundRect = roundRect; HNR.util.cssHex = cssHex;

/* ═══════════ 렌더러 · 하늘 · 조명 ═══════════ */
let scene = null, camera = null, renderer = null, sun = null, skyDome = null, cloudGroup = null;
let SHADOW = true, T = 0;
const SKY_TOP = 0x5fb4ec, SKY_HORIZON = 0xbfe6fb;
const BASE_EXPOSURE = CONFIG.exposure || 1.05;
const fx = HNR.fx = { override: null, zone: null, quality: 2,
  /* v: 숫자면 그 밝기로 고정(시뮬 모드·암실), null 이면 구역 밝기로 되돌림 */
  setExposure: function (v) { fx.override = (v == null ? null : +v); },
  get exposure() { return renderer ? renderer.toneMappingExposure : BASE_EXPOSURE; }
};

function initRenderer() {
  const host = $('#game');
  scene = HNR.scene = new THREE.Scene();
  scene.fog = new THREE.Fog(SKY_HORIZON, 2800, 8200);   // r128 은 안개를 출력(sRGB) 공간에서 섞는다 → 하늘 돔(toneMapped:false)과 같은 색
  camera = HNR.camera = new THREE.PerspectiveCamera(64, 1, 6, 14000);
  try {
    renderer = HNR.renderer = new THREE.WebGLRenderer({ antialias: !(HNR.MOBILE && (window.devicePixelRatio || 1) >= 2), preserveDrawingBuffer: AUTO, powerPreference: 'high-performance' });
  } catch (e) {
    host.innerHTML = '<div class="nogl">이 기기에서는 3D 화면을 열 수 없어요.<br>크롬 브라우저로 다시 열어 보아요.</div>';
    throw e;
  }
  fx.pixelRatio = Math.min(window.devicePixelRatio || 1, HNR.MOBILE ? 1.5 : 2);
  renderer.setPixelRatio(fx.pixelRatio);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = BASE_EXPOSURE;
  renderer.shadowMap.enabled = SHADOW;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  renderer.domElement.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  renderer.domElement.addEventListener('webglcontextlost', function (e) { e.preventDefault(); if (HNR.ui) HNR.ui.toast('화면을 다시 불러오는 중이에요. 잠시만요!', { icon:'⏳' }); });

  scene.add(new THREE.AmbientLight(0xffffff, 0.66));
  scene.add(new THREE.HemisphereLight(0xcfe9ff, 0x8f8a78, 0.46));
  sun = HNR.sun = new THREE.DirectionalLight(0xfff3dc, 0.82);
  sun.castShadow = SHADOW;
  const sm = HNR.MOBILE ? 1024 : 2048; sun.shadow.mapSize.set(sm, sm);
  const sc = sun.shadow.camera; sc.left = -1150; sc.right = 1150; sc.top = 1150; sc.bottom = -1150; sc.near = 200; sc.far = 4200; sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 1.2;
  sun.position.set(720, 1600, 980);
  scene.add(sun); scene.add(sun.target);

  /* 하늘 돔: 위는 파랗고 지평선은 옅게. 안개색과 같은 톤매핑을 거치게 메시로 그린다 */
  const sg = new THREE.SphereGeometry(11000, 24, 14);
  const cols = [], p = sg.attributes.position, top = new THREE.Color(SKY_TOP).convertSRGBToLinear(), hor = new THREE.Color(SKY_HORIZON).convertSRGBToLinear(), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const k = clamp(p.getY(i) / 11000 * 2.4, 0, 1); c.copy(hor).lerp(top, Math.pow(k, 0.7)); cols.push(c.r, c.g, c.b); }
  sg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  skyDome = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
  skyDome.frustumCulled = false; skyDome.renderOrder = -10; skyDome.userData.dynamic = true; skyDome.raycast = noop;
  scene.add(skyDome);
  buildClouds();
  onResize();
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', function () { setTimeout(onResize, 250); });
}
function buildClouds() {
  cloudGroup = new THREE.Group(); cloudGroup.userData.dynamic = true;
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.55, fog: true });
  const r = mulberry(77), tmp = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const a = r() * TAU, d = 1700 + r() * 3600, cx = Math.cos(a) * d, cz = Math.sin(a) * d, cy = 1250 + r() * 700, s = 0.8 + r() * 1.3;
    const n = 3 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry((190 + r() * 200) * s, (60 + r() * 50) * s, (150 + r() * 130) * s), m);
      b.position.set(cx + (k - n / 2) * 120 * s + r() * 40, cy + r() * 50 * s, cz + (r() - 0.5) * 150 * s); tmp.add(b);
    }
  }
  cloudGroup.add(tmp);
  P.bake(cloudGroup, { shadow: false });
  cloudGroup.traverse(function (o) { o.raycast = noop; });
  scene.add(cloudGroup);
}
let viewW = 1, viewH = 1;
function onResize() {
  if (!renderer) return;
  viewW = Math.max(1, window.innerWidth); viewH = Math.max(1, window.innerHeight);
  renderer.setSize(viewW, viewH);
  camera.aspect = viewW / viewH;
  cam._insetDirty = true;
  camera.updateProjectionMatrix();
  document.body.classList.toggle('portrait', viewH > viewW);
  HNR.emit('resize', viewW, viewH);
}

/* ═══════════ 파츠 빌더 P ═══════════ */
const P = HNR.P = {};
let curParent = null;
const NOOPT = Object.freeze({});
/* fn 안에서 만든 파츠는 parent 아래에 붙는다. parent 를 돌려준다 */
P.with = function (parent, fn) { const prev = curParent; curParent = parent; try { fn(parent); } finally { curParent = prev; } return parent; };
P.parent = function () { return curParent || scene; };

const matCache = new Map();
/* 캐시된 Lambert 재질. 같은 인자면 같은 재질을 돌려준다(여럿이 공유!).
   색·빛을 프레임마다 바꿀 재질은 {unique:true} 로 따로 만든다. */
P.mat = function (color, opt) {
  opt = opt || NOOPT;
  const opacity = opt.opacity == null ? 1 : opt.opacity;
  const transparent = opt.transparent != null ? !!opt.transparent : opacity < 1;
  const eI = opt.emissive != null ? (opt.emissiveIntensity == null ? 1 : opt.emissiveIntensity) : 0;
  const key = opt.unique ? null : [cssHex(color), opt.emissive != null ? cssHex(opt.emissive) : '-', eI, opacity, transparent ? 1 : 0, opt.map ? opt.map.uuid : '', opt.side || 0, opt.basic ? 'b' : 'l', opt.depthWrite === false ? 0 : 1].join('|');
  if (key && matCache.has(key)) return matCache.get(key);
  const m = opt.basic ? new THREE.MeshBasicMaterial({ color: color }) : new THREE.MeshLambertMaterial({ color: color });
  m.color.convertSRGBToLinear();
  if (opt.emissive != null && m.emissive) { m.emissive = new THREE.Color(opt.emissive).convertSRGBToLinear(); m.emissiveIntensity = eI; }
  if (transparent) { m.transparent = true; m.opacity = opacity; m.depthWrite = opt.depthWrite != null ? !!opt.depthWrite : opacity >= 0.6; }
  if (opt.map) m.map = opt.map;
  if (opt.side) m.side = opt.side;
  if (opt.fog === false) m.fog = false;
  if (key) matCache.set(key, m);
  return m;
};

const geoCache = new Map();
function gkey(a) { let s = ''; for (let i = 0; i < a.length; i++) s += (typeof a[i] === 'number' ? Math.round(a[i] * 100) / 100 : a[i]) + '|'; return s; }
function geom(args, make) { const k = gkey(args); let g = geoCache.get(k); if (!g) { g = make(); geoCache.set(k, g); } return g; }
const boxGeo = (w, h, d) => geom(['b', w, h, d], () => new THREE.BoxGeometry(w, h, d));
const edgeMats = new Map();
function edgeMat(op) { let m = edgeMats.get(op); if (!m) { m = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: op }); edgeMats.set(op, m); } return m; }
function addEdge(mesh, op) {
  const g = mesh.geometry; let eg = g.userData.edge;
  if (!eg) eg = g.userData.edge = new THREE.EdgesGeometry(g, 30);
  const ln = new THREE.LineSegments(eg, edgeMat(op == null || op === true ? 0.3 : op));
  ln.userData.isEdge = true; ln.raycast = noop;
  mesh.add(ln); return mesh;
}
P.edge = addEdge;
function place(o, x, y, z, opt) {
  o.position.set(x || 0, y || 0, z || 0);
  if (opt) {
    if (opt.rx) o.rotation.x = opt.rx; if (opt.ry) o.rotation.y = opt.ry; if (opt.rz) o.rotation.z = opt.rz;
    if (opt.name) o.name = opt.name; if (opt.dynamic) o.userData.dynamic = true; if (opt.visible === false) o.visible = false;
  }
  ((opt && opt.parent) || curParent || scene).add(o);
  return o;
}
function mk(geometry, color, x, y, z, opt, edge) {
  const material = (opt && opt.material) || P.mat(color, opt);
  const m = new THREE.Mesh(geometry, material);
  const sh = SHADOW && !(opt && opt.shadow === false);
  m.castShadow = sh && !material.transparent; m.receiveShadow = sh;
  if (edge) addEdge(m, edge);
  return place(m, x, y, z, opt);
}
/* 임의의 Object3D(직접 만든 메시 등)를 같은 규칙(parent·ry·name…)으로 붙인다 */
P.add = function (obj, x, y, z, opt) { return place(obj, x, y, z, opt); };
P.mesh = function (geometry, color, x, y, z, opt) { return mk(geometry, color, x, y, z, opt, opt && opt.edge); };
P.group = function (x, y, z, opt) { return place(new THREE.Group(), x, y, z, opt); };
P.box = function (w, h, d, color, x, y, z, opt) { return mk(boxGeo(w, h, d), color, x, y, z, opt, opt && opt.edge); };
P.part = function (w, h, d, color, x, y, z, opt) {
  const small = Math.max(w, h, d) < 8 || (w < 8 && d < 8) || (w < 8 && h < 8) || (h < 8 && d < 8) && Math.max(w, h, d) < 24;
  const e = opt && opt.edge != null ? opt.edge : !small;
  return mk(boxGeo(w, h, d), color, x, y, z, opt, e);
};
P.cyl = function (rTop, rBot, h, color, x, y, z, opt) {
  const seg = (opt && opt.seg) || 16, open = !!(opt && opt.open);
  return mk(geom(['c', rTop, rBot, h, seg, open ? 1 : 0], () => new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open)), color, x, y, z, opt, opt && opt.edge);
};
P.ball = function (r, color, x, y, z, opt) {
  const seg = (opt && opt.seg) || 16;
  return mk(geom(['s', r, seg], () => new THREE.SphereGeometry(r, seg, Math.max(8, Math.round(seg * 0.75)))), color, x, y, z, opt, false);
};
/* 도넛. 기본은 XY 평면에 선 고리(축 = Z). 눕히려면 {rx: Math.PI/2} */
P.torus = function (R, r, color, x, y, z, opt) {
  const seg = (opt && opt.seg) || 24, arc = (opt && opt.arc) || TAU;
  return mk(geom(['t', R, r, seg, arc], () => new THREE.TorusGeometry(R, r, 8, seg, arc)), color, x, y, z, opt, false);
};
function flatGeo(w, d, ru, rv) {
  return geom(['p', w, d, ru || 0, rv || 0], function () {
    const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
    if (ru) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv); }
    return g;
  });
}
/* 바닥에 누운 평면. 인자 순서 주의: (w, d, color, x, z, y) */
P.plane = function (w, d, color, x, z, y, opt) {
  const m = mk(flatGeo(w, d), color, x, y == null ? 1 : y, z, opt, false); m.castShadow = false; return m;
};
let studTex = null;
function studTexture() {
  if (studTex) return studTex;
  const c = makeCanvas(128, 128), g = c.getContext('2d');
  g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const cx = 32 + i * 64, cy = 32 + j * 64;
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.arc(cx, cy + 4, 19, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, cy - 1, 19, 0, TAU); g.fill();
    g.fillStyle = '#f0f0f0'; g.beginPath(); g.arc(cx, cy, 16, 0, TAU); g.fill();
  }
  studTex = new THREE.CanvasTexture(c); studTex.encoding = THREE.sRGBEncoding; studTex.wrapS = studTex.wrapT = THREE.RepeatWrapping;
  if (renderer) studTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return studTex;
}
/* 스터드 바닥(스터드 1개 = 16 유닛). 인자 순서: (w, d, color, x, z, y) */
P.stud = function (w, d, color, x, z, y, opt) {
  const o = Object.assign({}, opt || NOOPT, { map: studTexture() });
  const m = mk(flatGeo(w, d, w / 32, d / 32), color, x, y == null ? 1 : y, z, o, false); m.castShadow = false; return m;
};
/* 낮은 벽. (x1,z1)→(x2,z2). opt:{h:96,t:22,color,y} — 충돌은 world.addWalk/addBlock 이 정한다(벽은 그림일 뿐) */
P.wall = function (x1, z1, x2, z2, opt) {
  opt = opt || NOOPT;
  const h = opt.h || 96, t = opt.t || 22, len = Math.hypot(x2 - x1, z2 - z1);
  const o = Object.assign({}, opt, { ry: -Math.atan2(z2 - z1, x2 - x1) });
  return P.part(len, h, t, opt.color != null ? opt.color : BRICK.white, (x1 + x2) / 2, (opt.y || 0) + h / 2, (z1 + z2) / 2, o);
};
const texCache = new Map();
/* 캔버스 텍스처(캐시). draw(g, w, h) 로 그린다 */
P.tex = function (key, w, h, draw) {
  let t = texCache.get('x|' + key);
  if (!t) { const c = makeCanvas(w, h); draw(c.getContext('2d'), w, h); t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; texCache.set('x|' + key, t); }
  return t;
};
/* 3D 팻말(스프라이트, 늘 카메라를 본다).
   opt:{w:220} → 가로 w, 세로 w/4 인 판(글자는 판에 맞춰 줄어든다)  |  opt:{h:22} → 세로 h, 가로는 글자 길이에 맞춤(이름표)
   그 밖에 {size,bg,color,stroke,x,y,z,depthTest} */
P.text = function (text, opt) {
  opt = opt || NOOPT; text = String(text);
  const auto = opt.h != null && opt.w == null, size = opt.size || (auto ? 62 : 44);
  const key = 't|' + text + '|' + size + '|' + (auto ? 'a' : 'w') + '|' + (opt.bg || '') + '|' + (opt.color || '') + '|' + (opt.stroke || '') + '|' + (opt.depthTest === false ? 0 : 1);
  let rec = texCache.get(key);
  if (!rec) {
    const c = makeCanvas(512, 128); let g = c.getContext('2d'), cw = 512;
    if (auto) { g.font = '800 ' + size + 'px ' + FONT; cw = clamp(Math.ceil(g.measureText(text).width) + 72, 128, 1024); c.width = cw; g = c.getContext('2d'); }
    g.fillStyle = opt.bg || 'rgba(255,255,255,.96)'; roundRect(g, 8, 16, cw - 16, 96, 28); g.fill();
    g.strokeStyle = opt.stroke || 'rgba(27,29,33,.9)'; g.lineWidth = 7; g.stroke();
    g.fillStyle = opt.color || '#1b1d21'; fitFont(g, text, '800', size, cw - 56, 20);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cw / 2, 67);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;
    rec = { m: new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: opt.depthTest !== false, depthWrite: false }), aspect: cw / 128 };
    texCache.set(key, rec);
  }
  const s = new THREE.Sprite(rec.m); s.userData.dynamic = true;
  if (auto) s.scale.set(opt.h * rec.aspect, opt.h, 1); else { const w = opt.w || 220; s.scale.set(w, w / 4, 1); }
  return place(s, opt.x, opt.y, opt.z, opt);
};
/* 캔버스 포스터(세로 판, 로컬 +Z 를 본다). opt:{w:56,bg,fg,x,y,z,ry} */
P.poster = function (title, sub, opt) {
  opt = opt || NOOPT;
  const bg = opt.bg || '#ffffff', fg = opt.fg || '#1b1d21', key = 'p|' + title + '|' + (sub || '') + '|' + bg + '|' + fg;
  let m = texCache.get(key);
  if (!m) {
    const c = makeCanvas(256, 320), g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 256, 320); g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 12; g.strokeRect(6, 6, 244, 308);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const tl = String(title).split('\n'); tl.forEach(function (ln, i) { fitFont(g, ln, '900', tl.length > 1 ? 44 : 56, 216, 18); g.fillText(ln, 128, 118 + (i - (tl.length - 1) / 2) * 54); });
    const sl = String(sub || '').split('\n'); sl.forEach(function (ln, i) { fitFont(g, ln, '700', 28, 216, 14); g.fillText(ln, 128, 214 + i * 34); });
    g.fillRect(48, 276, 160, 8);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    m = new THREE.MeshLambertMaterial({ map: t }); texCache.set(key, m);
  }
  const w = opt.w || 56;
  const p = new THREE.Mesh(geom(['pv', w], () => new THREE.PlaneGeometry(w, w * 1.25)), m); p.receiveShadow = false; p.castShadow = false;
  return place(p, opt.x, opt.y == null ? 62 : opt.y, opt.z, opt);
};
/* 정적 파츠 합치기: group 아래의 메시를 재질별로 한 덩어리로 굽는다(드로우 콜 절약).
   - userData.dynamic(또는 opt.dynamic 으로 만든 것)·스프라이트·투명 재질·자식이 딸린 메시는 건드리지 않는다.
   - 구운 뒤에는 개별 파츠 참조(변수)가 장면에서 빠지므로, 움직이거나 눌러야 하는 것은 dynamic 으로 만들 것. */
const niCache = new WeakMap();
function nonIndexed(g) { if (!g.index) return g; let n = niCache.get(g); if (!n) { n = g.toNonIndexed(); niCache.set(g, n); } return n; }
P.bake = function (group, opt) {
  opt = opt || NOOPT;
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map(), edges = new Map(); let before = 0;
  (function walk(o) {
    if (o !== group && (o.userData.dynamic || o.userData.baked || !o.visible)) return;
    if (o.isMesh && o !== group) {
      const mt = o.material; let ok = !Array.isArray(mt) && !mt.transparent && o.geometry && o.geometry.attributes && o.geometry.attributes.normal;
      for (let i = 0; ok && i < o.children.length; i++) if (!o.children[i].userData.isEdge) ok = false;
      if (ok) {
        const k = mt.uuid + (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '');
        let b = buckets.get(k); if (!b) buckets.set(k, b = { mat: mt, cast: o.castShadow, recv: o.receiveShadow, list: [] });
        b.list.push(o); before++;
        for (let i = 0; i < o.children.length; i++) { const e = o.children[i]; let l = edges.get(e.material); if (!l) edges.set(e.material, l = []); l.push(e); }
        return;
      }
    }
    for (let i = 0; i < o.children.length; i++) walk(o.children[i]);
  })(group);
  const M = new THREE.Matrix4(), N = new THREE.Matrix3(), v = new THREE.Vector3(); let after = 0;
  buckets.forEach(function (b) {
    let total = 0, hasUv = true; const src = b.list.map(function (m) { const g = nonIndexed(m.geometry); total += g.attributes.position.count; if (!g.attributes.uv) hasUv = false; return g; });
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = hasUv ? new Float32Array(total * 2) : null; let off = 0;
    b.list.forEach(function (m, i) {
      const g = src[i], p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
      M.multiplyMatrices(inv, m.matrixWorld); N.getNormalMatrix(M);
      for (let k = 0; k < p.count; k++, off++) {
        v.fromBufferAttribute(p, k).applyMatrix4(M); pos[off * 3] = v.x; pos[off * 3 + 1] = v.y; pos[off * 3 + 2] = v.z;
        v.fromBufferAttribute(n, k).applyMatrix3(N).normalize(); nor[off * 3] = v.x; nor[off * 3 + 1] = v.y; nor[off * 3 + 2] = v.z;
        if (uv) { uv[off * 2] = u.getX(k); uv[off * 2 + 1] = u.getY(k); }
      }
      if (m.parent) m.parent.remove(m);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (uv) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.computeBoundingSphere(); g.computeBoundingBox();
    const out = new THREE.Mesh(g, b.mat); out.castShadow = b.cast && opt.shadow !== false; out.receiveShadow = b.recv && opt.shadow !== false; out.userData.baked = true;
    group.add(out); after++;
  });
  edges.forEach(function (list, mat) {
    let total = 0; list.forEach(function (e) { total += e.geometry.attributes.position.count; });
    const pos = new Float32Array(total * 3); let off = 0;
    list.forEach(function (e) {
      const p = e.geometry.attributes.position; M.multiplyMatrices(inv, e.matrixWorld);
      for (let k = 0; k < p.count; k++, off++) { v.fromBufferAttribute(p, k).applyMatrix4(M); pos[off * 3] = v.x; pos[off * 3 + 1] = v.y; pos[off * 3 + 2] = v.z; }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.computeBoundingSphere();
    const ln = new THREE.LineSegments(g, mat); ln.userData.baked = true; ln.userData.isEdge = true; ln.raycast = noop; group.add(ln); after++;
  });
  return { before: before, after: after };
};

/* ═══════════ 소품 라이브러리 props (모두 Group 을 돌려준다) ═══════════ */
const props = HNR.props = {};
function G(x, z, opt, fn) { const g = P.group(x, 0, z, opt ? { ry: opt.ry, parent: opt.parent, name: opt.name, dynamic: opt.dynamic } : null); P.with(g, fn); return g; }
const oc = (opt, k, d) => (opt && opt[k] != null ? opt[k] : d);

props.desk = function (x, z, opt) { const c = oc(opt, 'color', BRICK.sand); return G(x, z, opt, function () {
  P.part(90, 6, 46, c, 0, 38, 0);
  [[-40, -18], [40, -18], [-40, 18], [40, 18]].forEach(function (a) { P.box(5, 36, 5, BRICK.dgrey, a[0], 17, a[1]); });
  P.part(28, 26, 40, BRICK.grey, 28, 15, 0);
}); };
/* 책상 위 모니터. opt:{on:true,y:41(책상 윗면 높이)} 화면은 로컬 +Z 를 본다 */
props.monitor = function (x, z, opt) { const on = oc(opt, 'on', true), y = oc(opt, 'y', 41); return G(x, z, opt, function () {
  P.part(30, 20, 3, BRICK.black, 0, y + 14, 0);
  P.box(26, 16, 1.2, on ? BRICK.cyan : 0x2a2f3a, 0, y + 14, 2, on ? { emissive: BRICK.cyan, emissiveIntensity: 0.55, shadow: false } : { shadow: false });
  P.box(8, 10, 8, BRICK.dgrey, 0, y + 5, -2); P.box(20, 3, 12, BRICK.dgrey, 0, y + 1.5, -2); P.box(28, 2, 10, BRICK.grey, 0, y + 1, 14);
}); };
props.chair = function (x, z, opt) { const c = oc(opt, 'color', BRICK.blue); return G(x, z, opt, function () {
  P.part(24, 4, 24, c, 0, 22, 0); P.part(24, 26, 4, c, 0, 37, -10); P.box(4, 20, 4, BRICK.dgrey, 0, 10, 0); P.part(26, 3, 26, BRICK.dgrey, 0, 2, 0);
}); };
props.cabinet = function (x, z, opt) { const h = oc(opt, 'h', 90), c = oc(opt, 'color', BRICK.grey); return G(x, z, opt, function () {
  P.part(40, h, 30, c, 0, h / 2, 0); for (let k = 0; k < 3; k++) P.box(16, 2, 2, BRICK.dgrey, 0, h * (k + 1) / 4, 16);
}); };
props.crate = function (x, z, opt) { const n = oc(opt, 'n', 1), c = oc(opt, 'color', BRICK.brown), s = oc(opt, 's', 34); return G(x, z, opt, function () {
  for (let k = 0; k < n; k++) P.part(s, s - 4, s, c, (k % 2) * 3, (s - 4) / 2 + k * (s - 4), -(k % 2) * 3);
}); };
props.plant = function (x, z, opt) { return G(x, z, opt, function () {
  P.part(18, 18, 18, BRICK.orange, 0, 9, 0); P.part(26, 26, 26, BRICK.green, 0, 30, 0); P.part(14, 14, 14, BRICK.lime, 6, 44, -4);
}); };
props.cone = function (x, z, opt) { return G(x, z, opt, function () {
  P.cyl(2, 9, 22, BRICK.orange, 0, 11, 0, { seg: 8 }); P.part(18, 3, 18, BRICK.orange, 0, 1.5, 0, { edge: false }); P.cyl(5.6, 6.6, 3, BRICK.white, 0, 12, 0, { seg: 8, shadow: false });
}); };
props.extinguisher = function (x, z, opt) { return G(x, z, opt, function () {
  P.cyl(6, 6, 26, BRICK.red, 0, 13, 0, { seg: 10 }); P.box(4, 6, 4, BRICK.black, 0, 29, 0);
}); };
props.bin = function (x, z, opt) { return G(x, z, opt, function () { P.cyl(9, 8, 26, oc(opt, 'color', BRICK.dgrey), 0, 13, 0, { seg: 10 }); }); };
/* 바닥 전선. (x1,z1)→(x2,z2) 로 구불구불. 좌표는 부모 기준 */
props.cable = function (x1, z1, x2, z2, opt) { const c = oc(opt, 'color', BRICK.black); return G(0, 0, opt, function () {
  const n = 4; let px = x1, pz = z1;
  for (let k = 1; k <= n; k++) {
    const t = k / n, nx = x1 + (x2 - x1) * t + (k < n ? (rnd() - 0.5) * 20 : 0), nz = z1 + (z2 - z1) * t + (k < n ? (rnd() - 0.5) * 20 : 0);
    P.box(Math.hypot(nx - px, nz - pz) + 2, 2.5, 3, c, (px + nx) / 2, 4.3, (pz + nz) / 2, { ry: -Math.atan2(nz - pz, nx - px), shadow: false });
    px = nx; pz = nz;
  }
}); };
/* 바닥 테이프 선. axis 'x'|'z' */
props.tapeLine = function (x, z, len, axis, opt) { const w = oc(opt, 'w', 5); return G(x, z, opt, function () {
  P.plane(axis === 'x' ? len : w, axis === 'x' ? w : len, oc(opt, 'color', BRICK.yellow), 0, 0, oc(opt, 'y', 4.5), { shadow: false });
}); };
/* 노랑·검정 빗금 띠(텍스처 1장) */
props.hazardStripe = function (x, z, len, axis, opt) { const w = oc(opt, 'w', 10); return G(x, z, opt, function () {
  const tex = P.tex('hazard', 64, 32, function (g) { g.fillStyle = '#f5cd30'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#1b1d21'; g.beginPath(); g.moveTo(0, 32); g.lineTo(16, 0); g.lineTo(32, 0); g.lineTo(16, 32); g.closePath(); g.fill(); g.beginPath(); g.moveTo(32, 32); g.lineTo(48, 0); g.lineTo(64, 0); g.lineTo(48, 32); g.closePath(); g.fill(); });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const m = new THREE.Mesh(flatGeo(len, w, len / (w * 2), 1), P.mat(0xffffff, { map: tex })); m.receiveShadow = SHADOW;
  P.add(m, 0, oc(opt, 'y', 4.6), 0, { ry: axis === 'x' ? 0 : Math.PI / 2 });
}); };
/* 천장 조명 막대. opt:{on:true,y:101}. userData.lamp = 빛나는 막대(고유 재질: emissiveIntensity 로 켜고 끔) */
props.lightBar = function (x, z, len, axis, opt) { const on = oc(opt, 'on', true), y = oc(opt, 'y', 101); const g = G(x, z, opt, function () {
  const ry = axis === 'x' ? 0 : Math.PI / 2;
  const bar = P.box(len, 6, 10, BRICK.white, 0, y, 0, { emissive: 0xfff6d0, emissiveIntensity: on ? 0.9 : 0, unique: true, shadow: false, ry: ry, dynamic: true });
  const a = P.group(0, 0, 0, { ry: ry }); P.with(a, function () { P.box(6, 6, 10, BRICK.dgrey, -len / 2 - 3, y, 0, { shadow: false }); P.box(6, 6, 10, BRICK.dgrey, len / 2 + 3, y, 0, { shadow: false }); });
  P.parent().userData.lamp = bar;
}); return g; };
/* 화이트보드(세로 판, 로컬 +Z 를 본다). opt:{w:120,h:70,y:58,title,sub} */
props.whiteboard = function (x, z, opt) { const w = oc(opt, 'w', 120), h = oc(opt, 'h', 70), y = oc(opt, 'y', 58); return G(x, z, opt, function () {
  P.part(w + 6, h + 6, 3, BRICK.dgrey, 0, y, 0); P.box(w, h, 1, BRICK.white, 0, y, 1.8, { shadow: false });
  if (opt && opt.title) P.poster(opt.title, opt.sub || '', { w: Math.min(w * 0.5, h * 0.74), bg: '#f2f3f3', y: y, z: 2.6 });
}); };
props.bench = function (x, z, opt) { return G(x, z, opt, function () {
  P.part(70, 5, 22, BRICK.brown, 0, 20, 0); P.part(70, 16, 4, BRICK.brown, 0, 32, -10); P.part(5, 20, 20, BRICK.dgrey, -30, 10, 0); P.part(5, 20, 20, BRICK.dgrey, 30, 10, 0);
}); };
props.lampPost = function (x, z, opt) { return G(x, z, opt, function () {
  P.part(8, 140, 8, BRICK.dgrey, 0, 70, 0); P.box(30, 6, 8, BRICK.dgrey, 11, 140, 0); P.part(22, 10, 16, BRICK.yellow, 22, 136, 0, { emissive: BRICK.yellow, emissiveIntensity: 0.5, shadow: false });
}); };
function windowTex(cols, rows) {
  return P.tex('win|' + cols + '|' + rows, cols * 24, rows * 24, function (g, w, h) {
    const r = mulberry(cols * 131 + rows * 17); g.fillStyle = '#3d4654'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { g.fillStyle = r() < 0.55 ? (r() < 0.5 ? '#bfe3ff' : '#e9f6ff') : '#6d8fb3'; g.fillRect(i * 24 + 5, j * 24 + 5, 14, 14); }
  });
}
/* 배경 건물(창문 텍스처). opt:{color,cols,rows} */
props.building = function (x, z, w, h, d, opt) { const c = oc(opt, 'color', 0x6a7686), cols = oc(opt, 'cols', Math.max(3, Math.round(w / 50))), rows = oc(opt, 'rows', Math.max(3, Math.round(h / 45))); return G(x, z, opt, function () {
  P.part(w, h, d, c, 0, h / 2, 0, { edge: 0.5 });
  const tex = windowTex(cols, rows); tex.magFilter = THREE.NearestFilter; const m = P.mat(0xffffff, { map: tex });
  [[0, d / 2 + 0.6, 0, w], [0, -d / 2 - 0.6, Math.PI, w], [w / 2 + 0.6, 0, Math.PI / 2, d], [-w / 2 - 0.6, 0, -Math.PI / 2, d]].forEach(function (s) {
    const pl = new THREE.Mesh(geom(['pv2', s[3] - 8, h - 22], () => new THREE.PlaneGeometry(s[3] - 8, h - 22)), m); P.add(pl, s[0], h / 2, s[1], { ry: s[2] });
  });
  P.part(w * 0.4, 16, d * 0.4, BRICK.dgrey, 0, h + 8, 0); P.box(6, 40, 6, BRICK.dgrey, w * 0.3, h + 20, 0);
}); };
/* 도로(중앙 점선·가장자리 선 포함, 텍스처 1장). axis 'x'|'z', opt:{w:160} */
props.road = function (x, z, len, axis, opt) { const w = oc(opt, 'w', 160); return G(x, z, opt, function () {
  const tex = P.tex('road', 64, 128, function (g) { g.fillStyle = '#3a3f4a'; g.fillRect(0, 0, 64, 128); g.fillStyle = '#f2f3f3'; g.fillRect(0, 4, 64, 5); g.fillRect(0, 119, 64, 5); g.fillRect(8, 61, 34, 6); });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
  const m = new THREE.Mesh(flatGeo(len, w, len / 60, 1), P.mat(0xffffff, { map: tex })); m.receiveShadow = SHADOW;
  P.add(m, 0, oc(opt, 'y', 2), 0, { ry: axis === 'x' ? 0 : Math.PI / 2 });
}); };
/* 울타리. (x1,z1)→(x2,z2), 좌표는 부모 기준 */
props.fence = function (x1, z1, x2, z2, opt) { const c = oc(opt, 'color', BRICK.dgrey); return G(0, 0, opt, function () {
  const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(len / 70)), ry = -Math.atan2(z2 - z1, x2 - x1);
  for (let k = 0; k <= n; k++) { const t = k / n; P.box(6, 40, 6, c, x1 + (x2 - x1) * t, 20, z1 + (z2 - z1) * t, { ry: ry }); }
  [14, 32].forEach(function (y) { P.box(len, 3, 3, BRICK.grey, (x1 + x2) / 2, y, (z1 + z2) / 2, { ry: ry }); });
}); };
props.tree = function (x, z, opt) { const s = oc(opt, 's', 1); return G(x, z, opt, function () {
  P.part(16 * s, 50 * s, 16 * s, BRICK.brown, 0, 25 * s, 0); P.part(56 * s, 56 * s, 56 * s, BRICK.green, 0, 78 * s, 0); P.part(36 * s, 30 * s, 36 * s, BRICK.lime, 10 * s, 116 * s, -6 * s);
}); };
/* 블록 구름 하나(월드 장식용). cloud(x, y, z, {s}) */
props.cloud = function (x, y, z, opt) { const s = oc(opt, 's', 1); const g = P.group(x, y, z, opt ? { parent: opt.parent } : null); P.with(g, function () {
  const o = { emissive: 0xffffff, emissiveIntensity: 0.5, shadow: false };
  P.box(200 * s, 60 * s, 150 * s, 0xffffff, 0, 0, 0, o); P.box(140 * s, 70 * s, 120 * s, 0xffffff, 110 * s, 22 * s, 20 * s, o); P.box(130 * s, 50 * s, 110 * s, 0xffffff, -120 * s, 8 * s, -16 * s, o);
}); return g; };
/* 체크포인트 패드(로블록스 스폰 패드). opt:{color,label,size:110} */
props.checkpoint = function (x, z, opt) { const c = oc(opt, 'color', BRICK.blue), s = oc(opt, 'size', 110); return G(x, z, opt, function () {
  P.part(s, 6, s, BRICK.grey, 0, 3, 0); P.plane(s * 0.72, s * 0.72, BRICK.white, 0, 0, 6.4, { shadow: false });
  const ring = new THREE.Mesh(geom(['ring', s * 0.22, s * 0.3], function () { const g = new THREE.RingGeometry(s * 0.22, s * 0.3, 28); g.rotateX(-Math.PI / 2); return g; }), P.mat(c, { emissive: c, emissiveIntensity: 0.35 }));
  P.add(ring, 0, 6.9, 0);
  const star = new THREE.Mesh(geom(['ring', 0, s * 0.11], function () { const g = new THREE.CircleGeometry(s * 0.11, 5); g.rotateX(-Math.PI / 2); return g; }), P.mat(c)); P.add(star, 0, 6.9, 0);
  if (opt && opt.label) P.text(opt.label, { h: oc(opt, 'labelH', 30), y: oc(opt, 'labelY', 140), bg: cssHex(c), color: '#ffffff' });
}); };
/* 세운 팻말(기둥 + 글자). opt:{w:200,y:120,bg,color} */
props.signPost = function (x, z, text, opt) { return G(x, z, opt, function () {
  P.box(8, oc(opt, 'y', 120) - 14, 8, BRICK.dgrey, 0, (oc(opt, 'y', 120) - 14) / 2, 0); P.part(26, 4, 26, BRICK.dgrey, 0, 2, 0);
  P.text(text, { w: oc(opt, 'w', 200), y: oc(opt, 'y', 120), bg: opt && opt.bg, color: opt && opt.color });
}); };
/* 여닫는 문(문틀 + 아래로 내려가는 문짝). 문짝은 로컬 X 방향으로 넓다. opt:{w:150,h:110,t:14,color,label,frame}
   돌려준 그룹: userData.setOpen(bool, 즉시?) · userData.isOpen() · userData.slab · userData.sign
   충돌은 따로: world.addBlock(rect, () => !door.userData.isOpen()) */
props.door = function (x, z, opt) {
  const w = oc(opt, 'w', 150), h = oc(opt, 'h', 110), t = oc(opt, 't', 14), c = oc(opt, 'color', BRICK.blue);
  let slab = null, sign = null, open = false, seq = 0;
  const g = G(x, z, Object.assign({}, opt || NOOPT, { dynamic: true }), function () {
    if (!opt || opt.frame !== false) { P.part(14, h + 14, t + 10, BRICK.dgrey, -w / 2 - 7, (h + 14) / 2, 0); P.part(14, h + 14, t + 10, BRICK.dgrey, w / 2 + 7, (h + 14) / 2, 0); P.part(w + 28, 14, t + 10, BRICK.dgrey, 0, h + 7, 0); }
    slab = P.part(w, h, t, c, 0, h / 2, 0);
    P.box(8, 8, t + 6, BRICK.yellow, w * 0.36, -h * 0.02, 0, { parent: slab });   // 손잡이(문짝과 함께 움직인다)
    if (opt && opt.label) sign = P.text(opt.label, { w: oc(opt, 'labelW', Math.min(300, w + 90)), y: h + 46 });
  });
  g.userData.slab = slab; g.userData.sign = sign;
  g.userData.isOpen = function () { return open; };
  g.userData.setOpen = function (b, instant) {
    b = !!b; if (b === open && !instant) return Promise.resolve(); open = b; const my = ++seq;
    const from = slab.position.y, to = b ? -h / 2 - 2 : h / 2; slab.visible = true;
    if (instant) { slab.position.y = to; slab.visible = !b; return Promise.resolve(); }
    return HNR.tween(0.7, function (k) { if (my !== seq) return; slab.position.y = lerp(from, to, k); }).then(function () { if (my === seq) slab.visible = !open; });
  };
  return g;
};

/* ═══════════ 틱으로 도는 트윈(헤드리스에서도 HNR.tick 으로 진행) ═══════════ */
const tweens = [];
/* sec 초 동안 fn(easeK, rawK) 를 매 틱 부른다. 끝나면 resolve. opt:{ease:k=>k} */
HNR.tween = function (sec, fn, opt) { return new Promise(function (res) { tweens.push({ t: 0, d: Math.max(0.0001, sec), fn: fn, ease: (opt && opt.ease) || smooth, res: res }); }); };
HNR.wait = function (sec) { return HNR.tween(sec, null); };
function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const w = tweens[i]; w.t += dt; const k = Math.min(1, w.t / w.d);
    if (w.fn) { try { w.fn(w.ease(k), k); } catch (e) { console.error('[HNR] tween 오류', e); } }
    if (k >= 1) { tweens.splice(i, 1); w.res(); }
  }
}

/* ═══════════ 이야기 데이터 접근(없어도 죽지 않게) ═══════════ */
function ST(path, fb) { let o = HNR.STORY; const ks = String(path).split('.'); for (let i = 0; i < ks.length; i++) { if (o == null) return fb; o = o[ks[i]]; } return o == null ? fb : o; }
HNR.story = ST;
const FB = {
  gateName: { 1:'정문 보안 게이트', 2:'클린룸', 3:'암실', 4:'터널 열차', 5:'자이로드롭 통로', 6:'최종 면접실' },
  badge: { 1:'협동력', 2:'섬세함', 3:'관찰력', 4:'방향 감각', 5:'인내심', 6:'기억력' },
  gateNpc: { 1:'gatebot', 2:'dustzero', 3:'kkamppak', 4:'jjirit', 5:'keeper', 6:'boss' },
  gateSims: { 1:['g1'], 2:['g2'], 3:['g3'], 4:['g4a', 'g4b'], 5:['g5'], 6:['g6'] },
  card: {
    1:{ front:'불이 켜졌을 때처럼, 끊긴 데 없는 길로.', back:'전류는 끊긴 데 없이 한 바퀴 이어진 길로만 흘러요. 전기는 스틱 안 전지가 보내고, 몸은 그 길의 일부예요.' },
    2:{ front:'캔이 따라온 빨대가 걸린 문으로.', back:'캔은 원래 +도 −도 아닌 중성이에요. 문지른 빨대가 다가오면 캔 속 전하가 자리를 바꿔서 캔이 끌려와요.' },
    3:{ front:'형광등이 가장 밝게 깨어났던 방향으로 든 문으로.', back:'볼 주변의 빠르게 변하는 전기장이 형광등 속 기체를 자극해서 빛나요. 볼을 향해 들면 양 끝의 차이가 커서 더 잘 깨어나요.' },
    4:{ front:'스위치를 눌렀을 때 실험대 나침반 N극이 가리킨 쪽. 황금 나침반도 똑같이 깨어난다.', back:'전류가 흐르는 코일 주위에는 자기장이 생겨요. 스위치를 끄면 바늘은 다시 북쪽으로 돌아가요.' },
    5:{ front:'급할수록 돌아가라 했지… 자석이 천천히 내려온 길로 가시게.', back:'자석이 움직이면 구리관에 전류가 생기고, 그 전류가 자석의 움직임을 방해해요. 전기가 잘 통하는 길일수록 더 세게 붙잡아요.' }
  }
};
const BADGE_ICON = { 1:'🤝', 2:'✨', 3:'👀', 4:'🧭', 5:'⏳', 6:'🧠' };
const CIRC = ['', '①', '②', '③', '④', '⑤', '⑥'];
function gateName(n) { return ST('gates.' + n + '.name', FB.gateName[n] || ('관문 ' + n)); }
function badgeName(n) { return ST('gates.' + n + '.badge', FB.badge[n] || ''); }
function cardText(n, side) { return ST('gates.' + n + '.card.' + side, (FB.card[n] || {})[side] || ''); }
HNR.info = { gateName: gateName, badgeName: badgeName, cardText: cardText, badgeIcon: function (n) { return BADGE_ICON[n]; } };

/* ═══════════ 캐릭터 (R6 블록 리그 · NPC 8종) ═══════════ */
const char = HNR.char = {};
const NPCS = {
  bit:      { kind:'bit', name:'비트', role:'채용 안내 로봇', bg:'#d9efff' },
  gatebot:  { kind:'gatebot', name:'게이트봇', role:'정문 보안 로봇', bg:'#dfe3e8' },
  dustzero: { kind:'r6', name:'먼지제로 반장', role:'클린룸 반장', shirt:BRICK.white, pants:BRICK.white, hand:0x8fd0ea, hat:'hood', hatColor:BRICK.white, mask:true, face:'stern', bg:'#e3f5ff' },
  kkamppak: { kind:'r6', name:'깜빡이', role:'암실지기', shirt:0x2f2745, pants:BRICK.black, hat:'hood', hatColor:0x2f2745, face:'shh', item:'flashlight', bg:'#4a4168' },
  jjirit:   { kind:'r6', name:'찌릿 기관사', role:'터널 열차 기관사', shirt:BRICK.blue, pants:BRICK.navy, vest:BRICK.orange, hat:'cap', hatColor:BRICK.navy, face:'grin', bg:'#ffe6cc' },
  keeper:   { kind:'r6', name:'터널지기 할아버지', role:'자이로드롭 통로 관리인', shirt:BRICK.brown, pants:BRICK.dgrey, hat:'brim', hatColor:BRICK.sand, beard:true, face:'old', bg:'#efe4c8' },
  boss:     { kind:'r6', name:'소장', role:'최종 면접관', shirt:BRICK.black, pants:BRICK.black, suit:true, glasses:true, hair:BRICK.dgrey, face:'calm', bg:'#dde2ea' },
  daechung: { kind:'r6', name:'대충이', role:'경쟁 지원자', shirt:BRICK.red, pants:BRICK.blue, hat:'hood', hatColor:BRICK.red, face:'smirk', bg:'#ffdcd6' }
};
char.NPCS = NPCS;
char.keys = Object.keys(NPCS);
char.nameOf = function (key) { return ST('npcs.' + key + '.name', (NPCS[key] || {}).name || key); };
char.roleOf = function (key) { return ST('npcs.' + key + '.role', (NPCS[key] || {}).role || ''); };

/* 얼굴 그리기(128 격자). 3D 얼굴 텍스처와 대화창 초상이 같이 쓴다 */
function drawFace(g, type, ox, oy, s, o) {
  o = o || NOOPT;
  g.save(); g.translate(ox, oy); g.scale(s / 128, s / 128);
  g.fillStyle = '#111'; g.strokeStyle = '#111'; g.lineCap = 'round'; g.lineJoin = 'round';
  const eye = function (x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); };
  if (type === 'stern') {
    eye(44, 60, 7, 10); eye(84, 60, 7, 10);
    g.lineWidth = 8; g.beginPath(); g.moveTo(28, 36); g.lineTo(56, 45); g.moveTo(100, 36); g.lineTo(72, 45); g.stroke();
    if (!o.mask) { g.beginPath(); g.moveTo(48, 94); g.lineTo(80, 94); g.stroke(); }
  } else if (type === 'shh') {
    eye(44, 54, 9, 13); eye(84, 54, 9, 13); g.fillStyle = '#fff'; eye(47, 49, 3, 4); eye(87, 49, 3, 4); g.fillStyle = '#111';
    g.lineWidth = 6; g.beginPath(); g.ellipse(64, 93, 6, 7, 0, 0, TAU); g.stroke();
  } else if (type === 'grin') {
    eye(44, 50, 7, 11); eye(84, 50, 7, 11);
    g.beginPath(); g.moveTo(36, 76); g.quadraticCurveTo(64, 114, 92, 76); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.fillRect(49, 78, 30, 7);
  } else if (type === 'old') {
    g.lineWidth = 7; g.beginPath(); g.arc(44, 60, 9, Math.PI, TAU); g.stroke(); g.beginPath(); g.arc(84, 60, 9, Math.PI, TAU); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 9; g.beginPath(); g.moveTo(28, 40); g.lineTo(56, 37); g.moveTo(72, 37); g.lineTo(100, 40); g.stroke(); g.strokeStyle = '#111';
    if (!o.beard) { g.lineWidth = 6; g.beginPath(); g.moveTo(50, 92); g.quadraticCurveTo(64, 100, 78, 92); g.stroke(); }
  } else if (type === 'calm') {
    eye(43, 56, 6, 8); eye(85, 56, 6, 8);
    g.lineWidth = 6; g.beginPath(); g.moveTo(46, 92); g.quadraticCurveTo(64, 101, 82, 92); g.stroke();
  } else if (type === 'smirk') {
    eye(44, 57, 7, 10); eye(84, 57, 7, 10);
    g.lineWidth = 7; g.beginPath(); g.moveTo(30, 41); g.lineTo(54, 37); g.moveTo(74, 34); g.lineTo(98, 43); g.stroke();
    g.beginPath(); g.moveTo(44, 91); g.quadraticCurveTo(70, 99, 90, 80); g.stroke();
  } else {   // 'smile' 클래식
    eye(44, 52, 7, 12); eye(84, 52, 7, 12);
    g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 27, Math.PI * 0.18, Math.PI * 0.82); g.stroke();
  }
  if (o.glasses) {
    g.lineWidth = 5; g.strokeStyle = '#111'; g.fillStyle = 'rgba(190,225,255,.35)';
    roundRect(g, 24, 40, 36, 32, 7); g.fill(); g.stroke(); roundRect(g, 68, 40, 36, 32, 7); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(60, 54); g.lineTo(68, 54); g.stroke();
  }
  g.restore();
}
const faceMats = new Map();
function faceMat(type, o) {
  const key = type + (o.glasses ? 'g' : '') + (o.mask ? 'm' : '') + (o.beard ? 'b' : '');
  let m = faceMats.get(key);
  if (!m) { const c = makeCanvas(128, 128); drawFace(c.getContext('2d'), type, 0, 0, 128, o); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }); faceMats.set(key, m); }
  return m;
}
const blobGeo = new THREE.CircleGeometry(22, 20); blobGeo.rotateX(-Math.PI / 2);
const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false });
function blob(g, r) { const s = new THREE.Mesh(blobGeo, blobMat); s.position.y = 3.6; s.scale.setScalar((r || 22) / 22); s.raycast = noop; g.add(s); return s; }
function tagFor(g, name, y) {
  if (!name) return null;
  const tag = P.text(name, { h: 21, y: y, parent: g }); g.userData.tag = tag; return tag;
}
/* R6 블록 캐릭터. 앞 = 로컬 +Z.
   o:{name,shirt,pants,skin,hand,face:'smile|stern|shh|grin|old|calm|smirk',hat:'hood|cap|brim',hatColor,hair,beard,glasses,mask,vest,suit,coat,item:'flashlight'} */
char.make = function (o) {
  o = o || NOOPT;
  const g = new THREE.Group(); g.userData.dynamic = true; g.userData.isChar = true; g.userData.kind = 'r6'; g.userData.phase = rnd() * 6;
  const skin = o.skin != null ? o.skin : BRICK.skin, shirt = o.shirt != null ? o.shirt : BRICK.white, pants = o.pants != null ? o.pants : BRICK.blue;
  blob(g);
  let legL, legR, armL, armR, head, torso;
  P.with(g, function () {
    const limb = function (px, py, col, handCol) {
      const p = P.group(px, py, 0);
      P.with(p, function () { if (handCol != null) { P.part(U, 1.4 * U, U, col, 0, -0.7 * U, 0); P.part(U, 0.6 * U, U, handCol, 0, -1.7 * U, 0); } else P.part(U, 2 * U, U, col, 0, -U, 0); });
      return p;
    };
    legL = limb(-U / 2, 2 * U, pants); legR = limb(U / 2, 2 * U, pants);
    torso = P.part(2 * U, 2 * U, U, shirt, 0, 3 * U, 0);
    armL = limb(-1.5 * U, 4 * U, shirt, o.hand != null ? o.hand : skin); armR = limb(1.5 * U, 4 * U, shirt, o.hand != null ? o.hand : skin);
    head = P.part(1.2 * U, 1.2 * U, 1.2 * U, skin, 0, 4.6 * U, 0);
    const fo = { glasses: !!o.glasses, mask: !!o.mask, beard: !!o.beard };
    const face = new THREE.Mesh(geom(['fv', 1.2 * U], () => new THREE.PlaneGeometry(1.2 * U, 1.2 * U)), faceMat(o.face || 'smile', fo));
    face.raycast = noop; P.add(face, 0, 4.6 * U, 0.6 * U + 0.35);
    let top = 5.2 * U;
    if (o.coat) { P.box(5, 18, 2, BRICK.blue, 0, 3 * U + 3, U / 2 + 1.2, { shadow: false }); P.box(7, 9, 2, pants, -10, 3 * U + 5, U / 2 + 1.2, { shadow: false }); }
    if (o.suit) { P.box(0.7 * U, 1.3 * U, 1.6, BRICK.white, 0, 3.3 * U, U / 2 + 0.9, { shadow: false }); P.box(0.26 * U, 1.05 * U, 1.6, BRICK.red, 0, 3.28 * U, U / 2 + 1.8, { shadow: false }); }
    if (o.vest != null) { P.part(2.12 * U, 1.5 * U, 1.12 * U, o.vest, 0, 3.22 * U, 0); P.box(2.14 * U, 0.2 * U, 1.14 * U, BRICK.yellow, 0, 2.95 * U, 0, { shadow: false }); }
    if (o.hair != null) { P.part(1.26 * U, 0.3 * U, 1.26 * U, o.hair, 0, 5.2 * U + 0.1 * U, 0); top += 0.3 * U; }
    if (o.hat === 'hood') { P.part(1.44 * U, 1.44 * U, 1.3 * U, o.hatColor != null ? o.hatColor : shirt, 0, 4.66 * U, -0.14 * U); top = 5.4 * U; }
    else if (o.hat === 'cap') { const hc = o.hatColor != null ? o.hatColor : BRICK.navy; P.part(1.3 * U, 0.42 * U, 1.3 * U, hc, 0, 5.2 * U + 0.2 * U, 0); P.part(1.3 * U, 0.13 * U, 0.55 * U, BRICK.black, 0, 5.2 * U + 0.05 * U, 0.86 * U); P.box(0.34 * U, 0.26 * U, 0.1 * U, BRICK.gold, 0, 5.2 * U + 0.22 * U, 0.67 * U, { shadow: false }); top = 5.65 * U; }
    else if (o.hat === 'brim') { const hc = o.hatColor != null ? o.hatColor : BRICK.sand; P.part(2.1 * U, 0.13 * U, 2.1 * U, hc, 0, 5.2 * U + 0.06 * U, 0); P.part(1.26 * U, 0.5 * U, 1.26 * U, hc, 0, 5.2 * U + 0.36 * U, 0); P.box(1.3 * U, 0.14 * U, 1.3 * U, BRICK.brown, 0, 5.2 * U + 0.2 * U, 0, { shadow: false }); top = 5.75 * U; }
    if (o.beard) P.part(1.06 * U, 0.6 * U, 0.3 * U, BRICK.white, 0, 4.14 * U, 0.66 * U);
    if (o.mask) P.part(1.0 * U, 0.48 * U, 0.14 * U, 0xcfe8f5, 0, 4.3 * U, 0.66 * U);
    if (o.item === 'flashlight') {
      P.with(armR, function () { P.cyl(3.2, 3.2, 15, BRICK.dgrey, 0, -2.0 * U - 2, 5, { rx: Math.PI / 2, seg: 10 }); P.cyl(4.6, 3.2, 5, BRICK.yellow, 0, -2.0 * U - 2, 14, { rx: Math.PI / 2, seg: 10, emissive: 0xfff2a8, emissiveIntensity: 1, shadow: false }); });
      g.userData.armPose = -1.05;
    }
    tagFor(g, o.name, top + 0.85 * U);
  });
  g.userData.limbs = { legL: legL, legR: legR, armL: armL, armR: armR };
  g.userData.head = head; g.userData.torso = torso;
  return g;
};
function makeBit(pr) {
  const g = new THREE.Group(); g.userData.dynamic = true; g.userData.isChar = true; g.userData.kind = 'bit'; g.userData.phase = rnd() * 6; g.userData.ledState = 'blink';
  blob(g, 20);
  const body = new THREE.Group(); g.add(body);
  P.with(body, function () {
    P.part(38, 34, 28, BRICK.white, 0, 50, 0);
    P.box(30, 15, 1.4, 0x18222e, 0, 56, 14.4, { shadow: false });
    const eyeO = { emissive: BRICK.cyan, emissiveIntensity: 0.9, shadow: false };
    P.box(5, 7, 1, BRICK.cyan, -7, 56.5, 15.3, eyeO); P.box(5, 7, 1, BRICK.cyan, 7, 56.5, 15.3, eyeO);
    g.userData.led = P.cyl(4.8, 4.8, 3, 0xc8ccd2, 0, 40.5, 14.4, { rx: Math.PI / 2, seg: 14, emissive: 0x3aa8ff, emissiveIntensity: 0, unique: true, shadow: false });
    P.box(11, 2, 1, BRICK.dgrey, 0, 46.5, 14.3, { shadow: false });
    P.part(7, 15, 7, BRICK.grey, -22.6, 48, 0); P.part(7, 15, 7, BRICK.grey, 22.6, 48, 0);
    P.cyl(9, 5.5, 9, BRICK.dgrey, 0, 28.5, 0, { seg: 10 });
    P.box(2.4, 11, 2.4, BRICK.dgrey, 0, 72.5, 0); P.ball(3.6, BRICK.blue, 0, 80, 0, { seg: 10, emissive: BRICK.blue, emissiveIntensity: 0.4 });
  });
  g.userData.body = body;
  tagFor(g, pr.name, 100);
  return g;
}
function makeGatebot(pr) {
  const g = new THREE.Group(); g.userData.dynamic = true; g.userData.isChar = true; g.userData.kind = 'gatebot'; g.userData.phase = 0;
  blob(g, 34);
  let armL, armR, head;
  P.with(g, function () {
    P.part(48, 16, 38, BRICK.black, 0, 8, 0); P.box(52, 8, 30, BRICK.dgrey, 0, 7, 0);
    P.part(42, 46, 28, BRICK.navy, 0, 40, 0);
    P.box(30, 10, 1.4, BRICK.yellow, 0, 47, 14.6, { shadow: false }); P.box(30, 3, 1.6, BRICK.black, 0, 47, 14.7, { shadow: false });
    P.box(10, 10, 1.4, BRICK.steel, 0, 31, 14.6, { shadow: false });
    head = P.group(0, 76, 0);
    P.with(head, function () {
      P.part(32, 24, 26, BRICK.dgrey, 0, 0, 0);
      g.userData.visor = P.box(26, 7, 1.4, BRICK.red, 0, 2, 13.6, { emissive: BRICK.red, emissiveIntensity: 0.9, unique: true, shadow: false });
      g.userData.siren = P.cyl(5.5, 5.5, 7, BRICK.red, 0, 15.5, 0, { seg: 10, emissive: 0xff3b2f, emissiveIntensity: 0.6, unique: true, shadow: false });
      P.box(2, 12, 2, BRICK.black, 12, 18, -6);
    });
    const arm = function (px) { const p = P.group(px, 58, 0); P.with(p, function () { P.part(10, 34, 12, BRICK.dgrey, 0, -17, 0); P.part(13, 8, 15, BRICK.yellow, 0, -37, 0); }); return p; };
    armL = arm(-27); armR = arm(27);
  });
  g.userData.limbs = { armL: armL, armR: armR }; g.userData.head = head;
  tagFor(g, pr.name, 112);
  return g;
}
/* NPC 프리셋. key: bit gatebot dustzero kkamppak jjirit keeper boss daechung */
char.npc = function (key, opt) {
  const pr = NPCS[key]; if (!pr) { console.warn('[HNR] 모르는 NPC 키:', key); return char.make({ name: key }); }
  const o = Object.assign({}, pr, { name: opt && opt.name === false ? null : char.nameOf(key) });
  const g = pr.kind === 'bit' ? makeBit(o) : pr.kind === 'gatebot' ? makeGatebot(o) : char.make(o);
  g.userData.key = key; g.name = 'npc:' + key;
  return g;
};
/* 비트 가슴 LED: 'on' | 'off' | 'blink' */
char.setLed = function (g, state) { if (g && g.userData) g.userData.ledState = state; };
/* 캐릭터가 (x,z) 를 보게 돌린다. k(0~1) 를 주면 부드럽게 */
char.face = function (g, x, z, k) { const a = Math.atan2(x - g.position.x, z - g.position.z); g.rotation.y = k == null ? a : lerpAngle(g.rotation.y, a, k); };
/* 팔다리 스윙(walking) / 숨쉬기(idle). t = 초 */
char.animate = function (g, t, walking) {
  const ud = g.userData, L = ud.limbs;
  if (ud.kind === 'bit') {
    ud.body.position.y = Math.sin(t * 2.2 + ud.phase) * 3.2; ud.body.rotation.z = Math.sin(t * 1.3 + ud.phase) * 0.035;
    const st = ud.ledState; ud.led.material.emissiveIntensity = st === 'on' ? 1.2 : st === 'off' ? 0 : (Math.sin(t * 5 + ud.phase) > 0 ? 1.1 : 0.05);
    return;
  }
  if (ud.kind === 'gatebot') {
    ud.siren.material.emissiveIntensity = 0.25 + 0.9 * Math.max(0, Math.sin(t * 4.2));
    ud.head.rotation.y = Math.sin(t * 0.8) * 0.3;
    L.armL.rotation.x = Math.sin(t * 1.4) * 0.06; L.armR.rotation.x = -Math.sin(t * 1.4) * 0.06;
    return;
  }
  if (!L) return;
  if (walking) { const sw = Math.sin(t * 9.2) * 0.8; L.legL.rotation.x = sw; L.legR.rotation.x = -sw; L.armL.rotation.x = -sw; L.armR.rotation.x = sw; }
  else { const br = Math.sin(t * 1.8 + (ud.phase || 0)) * 0.05; L.legL.rotation.x = 0; L.legR.rotation.x = 0; L.armL.rotation.x = br; L.armR.rotation.x = -br + (ud.armPose || 0); }
};
/* 대화창 초상: 캔버스에 블록 얼굴을 그린다. who = NPC 키 | 'me' | 'memo' | 'sys' | {프리셋} */
char.portrait = function (cv, who) {
  const g = cv.getContext('2d'), s = cv.width / 128;
  g.save(); g.setTransform(s, 0, 0, s, 0, 0); g.clearRect(0, 0, 128, 128);
  let pr = typeof who === 'string' ? NPCS[who] : who;
  if (who === 'me') pr = { kind:'r6', shirt:BRICK.white, pants:(HNR.S && HNR.S.avatar) || BRICK.blue, coat:true, face:'smile', bg:'#e9f3ff' };
  g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = '#1b1d21';
  if (!pr) {
    g.fillStyle = who === 'memo' ? '#fff2a8' : '#e7ebf1'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#fff'; roundRect(g, 26, 22, 76, 84, 8); g.fill(); g.stroke();
    g.lineWidth = 5; g.beginPath(); [44, 60, 76].forEach(function (y) { g.moveTo(40, y); g.lineTo(88, y); }); g.stroke();
    g.restore(); return;
  }
  g.fillStyle = pr.bg || '#dfeaf5'; g.fillRect(0, 0, 128, 128);
  if (pr.kind === 'bit') {
    g.fillStyle = '#635f62'; g.fillRect(61, 8, 6, 16); g.fillStyle = cssHex(BRICK.blue); g.beginPath(); g.arc(64, 9, 7, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#a3a2a5'; roundRect(g, 8, 52, 16, 34, 5); g.fill(); g.stroke(); roundRect(g, 104, 52, 16, 34, 5); g.fill(); g.stroke();
    g.fillStyle = '#f2f3f3'; roundRect(g, 20, 22, 88, 84, 14); g.fill(); g.stroke();
    g.fillStyle = '#18222e'; roundRect(g, 30, 32, 68, 34, 7); g.fill();
    g.fillStyle = '#4ac7e3'; roundRect(g, 42, 40, 11, 17, 3); g.fill(); roundRect(g, 75, 40, 11, 17, 3); g.fill();
    g.fillStyle = '#3aa8ff'; g.beginPath(); g.arc(64, 86, 10, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(58,168,255,.5)'; g.lineWidth = 4; g.beginPath(); g.arc(64, 86, 16, 0, TAU); g.stroke();
  } else if (pr.kind === 'gatebot') {
    g.fillStyle = cssHex(BRICK.navy); roundRect(g, 14, 92, 100, 44, 8); g.fill(); g.stroke();
    g.fillStyle = cssHex(BRICK.yellow); g.fillRect(34, 104, 60, 12); g.fillStyle = '#1b1d21'; g.fillRect(34, 108, 60, 4);
    g.fillStyle = '#ff3b2f'; roundRect(g, 54, 8, 20, 16, 5); g.fill(); g.stroke();
    g.fillStyle = cssHex(BRICK.dgrey); roundRect(g, 24, 22, 80, 66, 8); g.fill(); g.stroke();
    g.fillStyle = '#2a0b08'; roundRect(g, 32, 40, 64, 20, 6); g.fill();
    g.fillStyle = '#ff3b2f'; roundRect(g, 36, 44, 56, 12, 4); g.fill();
    g.fillStyle = '#1b1d21'; g.fillRect(44, 72, 40, 5);
  } else {
    const shirt = cssHex(pr.shirt != null ? pr.shirt : BRICK.white), skin = cssHex(pr.skin != null ? pr.skin : BRICK.skin), hc = cssHex(pr.hatColor != null ? pr.hatColor : (pr.shirt != null ? pr.shirt : BRICK.white));
    g.fillStyle = shirt; roundRect(g, 16, 96, 96, 44, 8); g.fill(); g.stroke();
    if (pr.vest != null) { g.fillStyle = cssHex(pr.vest); g.fillRect(19, 99, 34, 30); g.fillRect(75, 99, 34, 30); g.fillStyle = cssHex(BRICK.yellow); g.fillRect(19, 116, 34, 6); g.fillRect(75, 116, 34, 6); }
    if (pr.suit) { g.fillStyle = '#f2f3f3'; g.beginPath(); g.moveTo(50, 98); g.lineTo(78, 98); g.lineTo(64, 128); g.closePath(); g.fill(); g.fillStyle = cssHex(BRICK.red); g.fillRect(60, 100, 8, 28); }
    if (pr.coat) { g.fillStyle = cssHex(BRICK.blue); g.fillRect(60, 100, 8, 26); }
    if (pr.hat === 'hood') { g.fillStyle = hc; roundRect(g, 24, 14, 80, 86, 10); g.fill(); g.stroke(); }
    g.fillStyle = skin; roundRect(g, 34, 26, 60, 64, 6); g.fill(); g.stroke();
    if (pr.hair != null) { g.fillStyle = cssHex(pr.hair); roundRect(g, 32, 20, 64, 16, 5); g.fill(); g.stroke(); }
    drawFace(g, pr.face || 'smile', 34, 28, 60, { glasses: pr.glasses, mask: pr.mask, beard: pr.beard });
    g.lineWidth = 5; g.strokeStyle = '#1b1d21';
    if (pr.beard) { g.fillStyle = '#f2f3f3'; roundRect(g, 38, 68, 52, 34, 10); g.fill(); g.stroke(); }
    if (pr.mask) { g.fillStyle = '#cfe8f5'; roundRect(g, 40, 64, 48, 24, 6); g.fill(); g.stroke(); }
    if (pr.hat === 'cap') { g.fillStyle = hc; roundRect(g, 30, 10, 68, 22, 6); g.fill(); g.stroke(); g.fillStyle = '#1b1d21'; roundRect(g, 26, 28, 76, 9, 4); g.fill(); g.fillStyle = cssHex(BRICK.gold); g.fillRect(57, 14, 14, 11); }
    if (pr.hat === 'brim') { g.fillStyle = hc; roundRect(g, 38, 4, 52, 24, 6); g.fill(); g.stroke(); roundRect(g, 12, 22, 104, 12, 6); g.fill(); g.stroke(); g.fillStyle = cssHex(BRICK.brown); g.fillRect(40, 16, 48, 6); }
  }
  g.restore();
};

/* ═══════════ 월드: 걷기 영역 · 블록 · 상호작용 · 트리거 · 구역 ═══════════ */
const PR = PCFG.radius;
const world = HNR.world = { walks: [], blocks: [], interacts: [], triggers: [], zones: [], npcs: {}, npcList: [], near: null, zone: null, follower: null };
function normRect(r) { return { x1: Math.min(r.x1, r.x2), x2: Math.max(r.x1, r.x2), z1: Math.min(r.z1, r.z2), z2: Math.max(r.z1, r.z2) }; }
/* 걸을 수 있는 사각형. cond() 가 false 면 막힌 것으로 본다(잠긴 방 등). 걷기 영역 = 모든 사각형의 합집합 */
world.addWalk = function (id, r, cond) { const w = normRect(r); w.id = id; w.cond = cond || null; world.walks.push(w); return w; };
world.removeWalk = function (id) { world.walks = world.walks.filter(function (w) { return w.id !== id && w !== id; }); };
/* 못 지나가는 사각형(장치·가구·닫힌 문). cond() 가 false 면 없는 것으로 본다. 돌려준 객체를 removeBlock 에 넘기면 지워진다 */
world.addBlock = function (r, cond) { const b = normRect(r); b.id = r.id || null; b.cond = cond || null; world.blocks.push(b); return b; };
world.removeBlock = function (b) { world.blocks = world.blocks.filter(function (x) { return x !== b && (b == null || x.id == null || x.id !== b); }); };
world.inWalk = function (x, z) {
  const W = world.walks;
  for (let i = 0; i < W.length; i++) { const w = W[i]; if (x >= w.x1 && x <= w.x2 && z >= w.z1 && z <= w.z2 && (!w.cond || w.cond())) return true; }
  return false;
};
const SAMP = [0, 0, 1, 0, -1, 0, 0, 1, 0, -1, 0.7071, 0.7071, -0.7071, 0.7071, 0.7071, -0.7071, -0.7071, -0.7071];
/* (x,z) 에 반지름 r(기본 14) 원이 설 수 있나: 걷기 영역 안 + 블록 밖 */
world.allowed = function (x, z, r) {
  r = r == null ? PR : r;
  const B = world.blocks;
  for (let i = 0; i < B.length; i++) { const b = B[i]; if (x > b.x1 - r && x < b.x2 + r && z > b.z1 - r && z < b.z2 + r && (!b.cond || b.cond())) return false; }
  const n = r > 0 ? 9 : 1;
  for (let k = 0; k < n; k++) if (!world.inWalk(x + SAMP[k * 2] * r, z + SAMP[k * 2 + 1] * r)) return false;
  return true;
};
/* (x,z) 에서 가장 가까운, 설 수 있는 점 {x,z}. 없으면 null */
world.nearest = function (x, z) {
  if (world.allowed(x, z)) return { x: x, z: z };
  let best = null, bd = Infinity; const W = world.walks, m = PR + 1;
  for (let i = 0; i < W.length; i++) {
    const w = W[i]; if (w.cond && !w.cond()) continue;
    if (w.x2 - w.x1 < 2 * m || w.z2 - w.z1 < 2 * m) continue;
    const cx = clamp(x, w.x1 + m, w.x2 - m), cz = clamp(z, w.z1 + m, w.z2 - m), d = (cx - x) * (cx - x) + (cz - z) * (cz - z);
    if (d < bd && world.allowed(cx, cz)) { bd = d; best = { x: cx, z: cz }; }
  }
  if (best) return best;
  for (let ring = 1; ring <= 12; ring++) for (let a = 0; a < 16; a++) {     // 블록에 걸린 경우: 둘레를 넓혀 가며 찾는다
    const px = x + Math.cos(a / 16 * TAU) * ring * 24, pz = z + Math.sin(a / 16 * TAU) * ring * 24;
    if (world.allowed(px, pz)) return { x: px, z: pz };
  }
  return null;
};
/* 두 점 사이를 곧장 걸을 수 있나(10 유닛 간격으로 훑는다) */
world.clear = function (x1, z1, x2, z2) {
  const d = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.ceil(d / 10));
  for (let i = 1; i <= n; i++) { const t = i / n; if (!world.allowed(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t)) return false; }
  return true;
};
/* 걷기 사각형 그래프로 길 찾기 → 경유점 배열 [{x,z}...] (마지막이 목적지) */
world.route = function (sx, sz, tx, tz) {
  const A = world.walks.filter(function (w) { return !w.cond || w.cond(); }), n = A.length;
  const inR = function (w, x, z) { return x >= w.x1 && x <= w.x2 && z >= w.z1 && z <= w.z2; };
  const starts = [], goals = [];
  for (let i = 0; i < n; i++) { if (inR(A[i], sx, sz)) starts.push(i); if (inR(A[i], tx, tz)) goals.push(i); }
  const end = { x: tx, z: tz };
  if (!starts.length || !goals.length) return [end];
  for (let i = 0; i < starts.length; i++) if (goals.indexOf(starts[i]) >= 0) return [end];
  const dist = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), via = new Array(n).fill(null), px = new Array(n), pz = new Array(n), done = new Array(n).fill(false);
  starts.forEach(function (i) { dist[i] = 0; px[i] = sx; pz[i] = sz; });
  for (;;) {
    let u = -1, best = Infinity; for (let i = 0; i < n; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
    if (u < 0) break; done[u] = true; if (goals.indexOf(u) >= 0) break;
    const a = A[u];
    for (let j = 0; j < n; j++) {
      if (done[j]) continue; const b = A[j];
      const ix1 = Math.max(a.x1, b.x1), ix2 = Math.min(a.x2, b.x2), iz1 = Math.max(a.z1, b.z1), iz2 = Math.min(a.z2, b.z2);
      if (ix1 > ix2 || iz1 > iz2 || Math.max(ix2 - ix1, iz2 - iz1) < 2 * PR) continue;
      const cx = (ix1 + ix2) / 2, cz = (iz1 + iz2) / 2, d = dist[u] + Math.hypot(cx - px[u], cz - pz[u]);
      if (d < dist[j]) { dist[j] = d; prev[j] = u; via[j] = { x: cx, z: cz }; px[j] = cx; pz[j] = cz; }
    }
  }
  let g = -1, gd = Infinity; goals.forEach(function (i) { const d = dist[i] + Math.hypot(tx - (px[i] || 0), tz - (pz[i] || 0)); if (dist[i] < Infinity && d < gd) { gd = d; g = i; } });
  if (g < 0) return [end];
  const out = [end]; for (let i = g; prev[i] >= 0; i = prev[i]) out.unshift(via[i]);
  return out;
};
/* 상호작용 지점. 가까이(r) 가면 아래 가운데 버튼이 뜬다.
   {id,x,z,r:120,label:문자열|함수,visible:함수,onUse(it),mesh:Object3D(누르면 걸어가서 말 걸기),icon:'💬'} */
world.addInteract = function (o) { const it = Object.assign({ r: 120 }, o); world.interacts.push(it); return it; };
world.removeInteract = function (id) { world.interacts = world.interacts.filter(function (i) { return i.id !== id && i !== id; }); if (world.near && (world.near.id === id || world.near === id)) world.near = null; };
/* 밟으면 한 번 실행. {id,rect,cond,once,onEnter,onLeave} */
world.addTrigger = function (o) { const t = Object.assign({}, o); t.rect = normRect(o.rect); t.inside = false; world.triggers.push(t); return t; };
world.removeTrigger = function (id) { world.triggers = world.triggers.filter(function (t) { return t.id !== id && t !== id; }); };
/* 구역: 이름(HUD 칩)과 밝기. 겹치면 나중에 넣은 것이 이긴다. {id,rect,exposure,name} */
world.addZone = function (o) { const z = Object.assign({}, o); z.rect = normRect(o.rect); world.zones.push(z); return z; };
world.removeZone = function (id) { world.zones = world.zones.filter(function (z) { return z.id !== id && z !== id; }); };
/* NPC 를 세운다(자동 애니메이션 + 가까이 오면 플레이어를 바라봄 + 몸통 충돌 블록).
   opt:{ry, parent, look:true, block:true, name:false(이름표 숨김)} → Group. world.npcs[key] 로 찾는다 */
world.addNpc = function (key, x, z, opt) {
  opt = opt || NOOPT;
  const g = char.npc(key, opt); g.position.set(x, 0, z); g.rotation.y = opt.ry || 0;
  (opt.parent || scene).add(g);
  const rec = { key: key, g: g, ry: opt.ry || 0, look: opt.look !== false, block: null };
  if (opt.block !== false) rec.block = world.addBlock({ x1: x - 15, x2: x + 15, z1: z - 12, z2: z + 12 });
  world.npcs[key] = g; world.npcList.push(rec); g.userData.rec = rec;
  return g;
};
/* NPC 자리 옮기기(충돌 블록도 같이) */
world.moveNpc = function (key, x, z, ry) {
  const g = world.npcs[key]; if (!g) return; const rec = g.userData.rec;
  g.position.x = x; g.position.z = z; if (ry != null) { g.rotation.y = ry; rec.ry = ry; }
  if (rec.block) { rec.block.x1 = x - 15; rec.block.x2 = x + 15; rec.block.z1 = z - 12; rec.block.z2 = z + 12; }
};
/* 플레이어를 졸졸 따라다니는 캐릭터(비트). null 이면 해제. opt:{dist:95, side:0.55} */
world.setFollower = function (g, opt) { world.follower = g ? { g: g, dist: (opt && opt.dist) || 95, side: (opt && opt.side) != null ? opt.side : 0.55, x: g.position.x, z: g.position.z } : null; if (g && g.userData.rec && g.userData.rec.block) { world.removeBlock(g.userData.rec.block); g.userData.rec.block = null; g.userData.rec.look = true; } };
function itVisible(it) { return !it.visible || it.visible(it) !== false; }
function itLabel(it) { const l = typeof it.label === 'function' ? it.label(it) : it.label; return l || '💬 말 걸기'; }
/* 지금 가까이 있는 상호작용을 실행(「말 걸기」 버튼·E·Enter). 창을 닫은 직후 0.35초는 무시(연타로 다시 열리지 않게) */
let useCooldown = 0;
world.use = function (it) {
  it = it || world.near; if (!it || !itVisible(it)) return false;
  if (ui.isOpen() || player.locked || performance.now() < useCooldown) return false;
  player.stop(); sfx('click');
  try { const r = it.onUse && it.onUse(it); if (r && r.catch) r.catch(function (e) { console.error('[HNR] onUse 오류', e); }); } catch (e) { console.error('[HNR] onUse 오류', e); }
  return true;
};
let worldClock = 0, lastTalkLabel = null;
function worldUpdate(dt) {
  const px = player.x, pz = player.z;
  // 트리거
  const TR = world.triggers;
  for (let i = TR.length - 1; i >= 0; i--) {
    const t = TR[i], r = t.rect, inside = px >= r.x1 && px <= r.x2 && pz >= r.z1 && pz <= r.z2 && (!t.cond || t.cond());
    if (inside && !t.inside) { t.inside = true; if (t.once) TR.splice(i, 1); try { if (t.onEnter) t.onEnter(t); } catch (e) { console.error('[HNR] trigger 오류', e); } }
    else if (!inside && t.inside) { t.inside = false; try { if (t.onLeave) t.onLeave(t); } catch (e) { console.error('[HNR] trigger 오류', e); } }
  }
  // 구역
  let zn = null; const Z = world.zones;
  for (let i = Z.length - 1; i >= 0; i--) { const r = Z[i].rect; if (px >= r.x1 && px <= r.x2 && pz >= r.z1 && pz <= r.z2) { zn = Z[i]; break; } }
  if (zn !== world.zone) { world.zone = zn; fx.zone = zn && zn.exposure != null ? zn.exposure : null; hud.setZone(zn ? zn.name : ''); HNR.emit('zone', zn); }
  // 상호작용(가장 가까운 것)
  let best = null, bd = Infinity; const I = world.interacts;
  if (!player.locked) for (let i = 0; i < I.length; i++) { const it = I[i], d = Math.hypot(px - it.x, pz - it.z); if (d < it.r && d < bd && itVisible(it)) { bd = d; best = it; } }
  worldClock += dt;
  if (best !== world.near || worldClock > 0.25) {
    worldClock = 0; world.near = best;
    const lbl = best ? itLabel(best) : null;
    if (lbl !== lastTalkLabel) { lastTalkLabel = lbl; hud.setTalk(lbl); }
  }
  if (pendingUse && world.near === pendingUse && bd < pendingUse.r * 0.8 && !player.walking) { const it = pendingUse; pendingUse = null; world.use(it); }
  // NPC
  const NL = world.npcList;
  for (let i = 0; i < NL.length; i++) {
    const rec = NL[i], g = rec.g; if (!g.visible) continue;
    const dx = px - g.position.x, dz = pz - g.position.z, d2 = dx * dx + dz * dz;
    if (d2 > 2600 * 2600) continue;
    let moving = false;
    if (world.follower && world.follower.g === g) moving = followStep(world.follower, dt);
    else if (rec.look) g.rotation.y = lerpAngle(g.rotation.y, d2 < 420 * 420 ? Math.atan2(dx, dz) : rec.ry, 1 - Math.exp(-dt * 5));
    char.animate(g, T, moving);
  }
}
function followStep(f, dt) {
  const g = f.g, fxx = -Math.sin(player.yaw), fzz = -Math.cos(player.yaw), rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
  const tx = player.x + fxx * f.dist + rx * f.dist * f.side, tz = player.z + fzz * f.dist + rz * f.dist * f.side;
  const dx = tx - g.position.x, dz = tz - g.position.z, d = Math.hypot(dx, dz);
  if (d > 900) { g.position.x = tx; g.position.z = tz; return false; }
  const k = 1 - Math.exp(-dt * (d > 200 ? 5 : 2.4)); g.position.x += dx * k; g.position.z += dz * k;
  g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(player.x - g.position.x, player.z - g.position.z), 1 - Math.exp(-dt * 6));
  return d > 30;
}

/* ═══════════ 플레이어 · 시점 ═══════════ */
const VIEWS = ['fps', 'tps', 'top'], VIEW_LABEL = { fps: '1인칭', tps: '3인칭', top: '탑뷰' };
let VIEW = 'fps', playerChar = null, walkQueue = [], pendingUse = null, onArrive = null, stuckT = 0, losT = 0, bobT = 0, faceAngle = Math.PI, faceTarget = Math.PI, userLookT = 9;
const player = HNR.player = {
  x: 0, z: 0, yaw: 0, pitch: 0, y: 0, vy: 0, walking: false, locked: false, speed: PCFG.speed, r: PR,
  get view() { return VIEW; },
  /* 순간 이동. yaw 는 라디안(0 = 북쪽(−Z)을 봄). 설 수 없는 곳이면 가장 가까운 곳으로 */
  teleport: function (x, z, yaw) {
    const p = world.walks.length ? (world.nearest(x, z) || { x: x, z: z }) : { x: x, z: z };
    player.x = p.x; player.z = p.z; if (yaw != null) { player.yaw = yaw; faceAngle = faceTarget = yaw + Math.PI; }
    player.pitch = 0; player.y = 0; player.vy = 0; player.stop(); cam.snap = true;
  },
  /* 걷기·시점 입력 잠금(시뮬 모드·연출용) */
  lock: function (b) { player.locked = !!b; if (b) { player.stop(); input.setJoy(0, 0); } },
  stop: function () { walkQueue = []; pendingUse = null; onArrive = null; player.walking = false; },
  /* (x,z) 로 걸어간다(문을 거쳐 길을 찾는다). 도착하면 Promise<true>, 막히거나 취소되면 false */
  walkTo: function (x, z) {
    const p = world.nearest(x, z) || { x: x, z: z };
    walkQueue = world.route(player.x, player.z, p.x, p.z); stuckT = 0; losT = 0; pendingUse = null;
    const prev = onArrive; if (prev) prev(false);
    return new Promise(function (res) { onArrive = res; });
  },
  jump: function () { if (player.y <= 0.01 && !player.locked && !ui.isOpen()) { player.vy = 265; sfx('jump'); } },
  setView: function (v) { setView(v); },
  face: function (x, z) { player.yaw = Math.atan2(-(x - player.x), -(z - player.z)); }
};
function setView(v, silent) {
  if (VIEWS.indexOf(v) < 0) v = 'fps';
  VIEW = v; if (HNR.S && !silent) { HNR.S.view = v; state.save(); }
  const l = $('#viewLbl'); if (l) l.textContent = VIEW_LABEL[v];
  if (v === 'fps') player.pitch = 0;
  cam.snap = true; HNR.emit('view', v);
}
function cycleView() { setView(VIEWS[(VIEWS.indexOf(VIEW) + 1) % VIEWS.length]); sfx('click'); }
function tryMove(nx, nz) {
  if (world.allowed(nx, nz)) { player.x = nx; player.z = nz; return true; }
  if (world.allowed(nx, player.z)) { player.x = nx; return true; }
  if (world.allowed(player.x, nz)) { player.z = nz; return true; }
  return false;
}
function finishWalk(ok) { walkQueue = []; player.walking = false; const f = onArrive; onArrive = null; if (f) f(ok); if (!ok) pendingUse = null; }
function stepPlayer(dt) {
  // 점프(꾸밈)
  if (player.y > 0 || player.vy > 0) { player.vy -= 900 * dt; player.y += player.vy * dt; if (player.y <= 0) { player.y = 0; player.vy = 0; } }
  if (player.locked || ui.isOpen()) { player.walking = false; return; }
  userLookT += dt;
  let turn = 0, ix = 0, iz = 0;
  if (keys.ArrowLeft) turn += 1; if (keys.ArrowRight) turn -= 1;
  if (keys.KeyA) ix -= 1; if (keys.KeyD) ix += 1; if (keys.KeyW || keys.ArrowUp) iz += 1; if (keys.KeyS || keys.ArrowDown) iz -= 1;
  let jt = 0;
  if (joy.active) {
    if (VIEW === 'top') { ix += joy.x; iz += -joy.y; }
    else { jt = -joy.x * (Math.abs(joy.x) > 0.22 ? 1 : 0); ix += joy.x * 0.4; iz += -joy.y; }
  }
  if (turn || jt) { player.yaw += (turn * 2.3 + jt * 1.9) * dt; userLookT = 0; }
  const mag = Math.hypot(ix, iz);
  if (mag > 0.08) {
    if (walkQueue.length) finishWalk(false);
    const k = Math.min(1, mag) / mag, fx_ = -Math.sin(player.yaw), fz_ = -Math.cos(player.yaw), rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
    const dx = (fx_ * iz + rx * ix) * k, dz = (fz_ * iz + rz * ix) * k, sp = player.speed * dt;
    player.walking = tryMove(player.x + dx * sp, player.z + dz * sp);
    faceTarget = Math.atan2(dx, dz);
  } else if (walkQueue.length) {
    // 길 다듬기: 다음다음 경유점이 곧장 보이면 건너뛴다
    losT += dt; if (losT > 0.15 && walkQueue.length > 1) { losT = 0; if (world.clear(player.x, player.z, walkQueue[1].x, walkQueue[1].z)) walkQueue.shift(); }
    const t = walkQueue[0], tx = t.x - player.x, tz = t.z - player.z, d = Math.hypot(tx, tz);
    if (d < 12) { walkQueue.shift(); if (!walkQueue.length) finishWalk(true); }
    else {
      const st = Math.min(d, player.speed * dt), ox = player.x, oz = player.z;
      const ok = tryMove(player.x + tx / d * st, player.z + tz / d * st), moved = Math.hypot(player.x - ox, player.z - oz);
      if (!ok || moved < st * 0.25) { stuckT += dt; if (stuckT > 0.45) finishWalk(walkQueue.length === 1 && d < 60); } else stuckT = 0;
      player.walking = ok; faceTarget = Math.atan2(tx, tz);
      if (VIEW !== 'top' && userLookT > 0.6 && d > 40) player.yaw = lerpAngle(player.yaw, Math.atan2(-tx, -tz), 1 - Math.exp(-dt * 4.5));   // 가는 쪽을 보게
    }
  } else player.walking = false;
  if (player.walking) bobT += dt;
}

/* ═══════════ 카메라 ═══════════ */
const V3 = THREE.Vector3;
const cam = HNR.cam = { dist: 500, height: 400, topH: 1250, snap: true, _insetDirty: false, k: 0 };
const camPos = new V3(), camWant = new V3(), basePos = new V3(), baseLook = new V3(), ovPosT = new V3(), ovLookT = new V3(), ovPos = new V3(), ovLook = new V3(), finPos = new V3(), finLook = new V3();
let ovActive = false, ovFov = null, insetT = { r: 0, b: 0 }, insetC = { r: 0, b: 0 };
function toV3(v, out) { return Array.isArray(v) ? out.set(v[0], v[1], v[2]) : out.copy(v); }
/* 카메라를 정해 둔 자리로 부드럽게 옮긴다(시뮬 모드). o:{pos,look,fov?} (Vector3 또는 [x,y,z], 월드 좌표) | null 이면 플레이어 시점으로 복귀.
   opt:{instant:true} 면 바로 */
cam.override = function (o, opt) {
  if (!o) { ovActive = false; if (opt && opt.instant) cam.k = 0; return; }
  toV3(o.pos, ovPosT); toV3(o.look, ovLookT); ovFov = o.fov || null;
  if (!ovActive && cam.k <= 0.001) { ovPos.copy(ovPosT); ovLook.copy(ovLookT); }
  ovActive = true;
  if (opt && opt.instant) { cam.k = 1; ovPos.copy(ovPosT); ovLook.copy(ovLookT); }
};
cam.isOverride = function () { return ovActive; };
/* 화면 오른쪽/아래를 패널이 가릴 때, 장면 중심을 남은 영역 가운데로 옮긴다(px). null 이면 해제 */
cam.inset = function (o) { insetT.r = (o && o.right) || 0; insetT.b = (o && o.bottom) || 0; };
function updateCamera(dt) {
  const bob = player.walking && VIEW === 'fps' ? Math.sin(bobT * 11) * 1.4 : 0;
  const eyeY = PCFG.eye + player.y + bob, fxx = -Math.sin(player.yaw), fzz = -Math.cos(player.yaw);
  const portrait = camera.aspect < 1; let fov;
  if (VIEW === 'fps') {
    const cp = Math.cos(player.pitch);
    basePos.set(player.x, eyeY, player.z);
    baseLook.set(player.x + fxx * cp * 200, eyeY + Math.sin(player.pitch) * 200, player.z + fzz * cp * 200);
    fov = portrait ? 80 : 64;
  } else {
    if (VIEW === 'tps') { camWant.set(player.x - fxx * cam.dist, cam.height + player.y * 0.4, player.z - fzz * cam.dist); baseLook.set(player.x, 52, player.z); }
    else { camWant.set(player.x - fxx * cam.topH * 0.2, cam.topH, player.z - fzz * cam.topH * 0.2); baseLook.set(player.x, 0, player.z); }
    if (cam.snap) camPos.copy(camWant); else camPos.lerp(camWant, 1 - Math.exp(-dt * 9));
    basePos.copy(camPos); fov = portrait ? 66 : 52;
  }
  cam.snap = false;
  cam.k = clamp(cam.k + (ovActive ? 1 : -1) * dt / 0.7, 0, 1);
  if (cam.k > 0) {
    const e = 1 - Math.exp(-dt * 8); ovPos.lerp(ovPosT, e); ovLook.lerp(ovLookT, e);
    const k = smooth(cam.k); finPos.lerpVectors(basePos, ovPos, k); finLook.lerpVectors(baseLook, ovLook, k);
    if (ovFov) fov = lerp(fov, ovFov, k);
    camera.position.copy(finPos); camera.lookAt(finLook);
  } else { camera.position.copy(basePos); camera.lookAt(baseLook); }
  let dirty = false;
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; dirty = true; }
  const e2 = 1 - Math.exp(-dt * 7);
  if (Math.abs(insetC.r - insetT.r) > 0.5 || Math.abs(insetC.b - insetT.b) > 0.5 || cam._insetDirty) {
    insetC.r = Math.abs(insetC.r - insetT.r) < 1 ? insetT.r : lerp(insetC.r, insetT.r, e2); insetC.b = Math.abs(insetC.b - insetT.b) < 1 ? insetT.b : lerp(insetC.b, insetT.b, e2);
    cam._insetDirty = false; dirty = false;
    if (insetC.r > 0.5 || insetC.b > 0.5) camera.setViewOffset(viewW, viewH, insetC.r / 2, insetC.b / 2, viewW, viewH); else { camera.clearViewOffset(); camera.updateProjectionMatrix(); }
  }
  if (dirty) camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  if (near_ !== (VIEW === 'fps' && cam.k < 0.5 ? 6 : 12)) { near_ = (VIEW === 'fps' && cam.k < 0.5 ? 6 : 12); camera.near = near_; camera.updateProjectionMatrix(); }
  // 플레이어 몸(1인칭·시뮬 카메라에서는 숨김)
  if (playerChar) {
    playerChar.visible = VIEW !== 'fps' && cam.k < 0.4;
    if (VIEW === 'fps' || !player.walking) { if (VIEW === 'fps') faceTarget = player.yaw + Math.PI; }
    faceAngle = lerpAngle(faceAngle, faceTarget, 1 - Math.exp(-dt * 14));
    playerChar.rotation.y = faceAngle;
    playerChar.position.set(player.x, player.y + (player.walking ? Math.abs(Math.sin(bobT * 9.2)) * 3 : 0), player.z);
    if (playerChar.visible) char.animate(playerChar, bobT * 1.0 + (player.walking ? 0 : T), player.walking);
  }
  if (skyDome) skyDome.position.copy(camera.position);
  if (cloudGroup) { cloudGroup.position.set(camera.position.x * 0.92 + Math.sin(T * 0.01) * 300 + T * 4 % 600, 0, camera.position.z * 0.92); }
  // 그림자: 플레이어 둘레만(64 유닛 격자에 맞춰 떨림 줄임)
  const sx = Math.round(player.x / 64) * 64, sz = Math.round(player.z / 64) * 64;
  if (sun.target.position.x !== sx || sun.target.position.z !== sz) { sun.target.position.set(sx, 0, sz); sun.position.set(sx + 720, 1600, sz + 980); sun.target.updateMatrixWorld(); }
}
let near_ = 6;

/* ═══════════ 입력: 키보드 · 조이스틱 · 포인터 ═══════════ */
const keys = Object.create(null);
const joy = { x: 0, y: 0, active: false };
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
const MOVE_KEYS = { KeyW:1, KeyA:1, KeyS:1, KeyD:1, ArrowUp:1, ArrowDown:1, ArrowLeft:1, ArrowRight:1, Space:1 };
const input = HNR.input = {
  keys: keys, joy: joy, captured: null, raycaster: raycaster,
  /* 시뮬이 캔버스 포인터를 가로챈다. handlers:{down(e),move(e),up(e),cancel(e),key(code,e)} | null(해제)
     e = {type,id,x,y(화면 px),ndc(Vector2),ray(THREE.Ray, 월드),pressed(누른 채인가),orig(PointerEvent)} — e 와 ray 는 재사용되니 보관하려면 clone() */
  capture: function (h) { input.captured = h || null; drag = null; ptrs.clear(); pinchD = 0; },
  /* 조이스틱 값을 직접 넣는다(시험용). x 오른쪽 +, y 아래 + (−1 = 앞으로) */
  setJoy: function (x, y) { joy.x = x; joy.y = y; joy.active = !!(x || y); const k = $('#joyK'); if (k) k.style.transform = 'translate(' + (x * 40) + 'px,' + (y * 40) + 'px)'; },
  /* 화면 좌표 → 월드 광선(THREE.Ray, 재사용 객체) */
  ray: function (cx, cy) { return setRay(cx, cy); },
  /* 화면 좌표에서 objects 중 맨 앞에 걸린 것 → {object,point,distance} | null */
  pick: function (objects, cx, cy, recursive) { setRay(cx, cy); const h = Array.isArray(objects) ? raycaster.intersectObjects(objects, recursive !== false) : raycaster.intersectObject(objects, recursive !== false); return h.length ? h[0] : null; }
};
function setRay(cx, cy) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  raycaster.camera = camera; raycaster.setFromCamera(ndc, camera);
  return raycaster.ray;
}
const ptrs = new Map(); let drag = null, pinchD = 0;
const capEv = { type: '', id: 0, x: 0, y: 0, ndc: ndc, ray: raycaster.ray, pressed: false, orig: null };
function capFill(type, ev) { setRay(ev.clientX, ev.clientY); capEv.type = type; capEv.id = ev.pointerId; capEv.x = ev.clientX; capEv.y = ev.clientY; capEv.pressed = ptrs.has(ev.pointerId); capEv.orig = ev; return capEv; }
function capCall(name, ev) { const h = input.captured; if (h && h[name]) { try { h[name](capFill(name, ev)); } catch (e) { console.error('[HNR] input.capture.' + name + ' 오류', e); } } }
const tapMark = { mesh: null, t: 0 };
function showTapMark(x, z) {
  if (!tapMark.mesh) { const g = new THREE.RingGeometry(10, 15, 24); g.rotateX(-Math.PI / 2); tapMark.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false })); tapMark.mesh.userData.dynamic = true; tapMark.mesh.raycast = noop; tapMark.mesh.renderOrder = 5; scene.add(tapMark.mesh); }
  tapMark.mesh.position.set(x, 7.5, z); tapMark.mesh.visible = true; tapMark.t = 0;
}
function handleTap(cx, cy) {
  setRay(cx, cy);
  let best = null; const I = world.interacts;
  for (let i = 0; i < I.length; i++) { const it = I[i]; if (!it.mesh || !itVisible(it)) continue; const h = raycaster.intersectObject(it.mesh, true); if (h.length && h[0].distance < 1500 && (!best || h[0].distance < best.d)) best = { it: it, d: h[0].distance }; }
  if (best) {
    const it = best.it, dx = player.x - it.x, dz = player.z - it.z, d = Math.hypot(dx, dz) || 1;
    if (d < it.r * 0.8) { world.use(it); return; }
    const back = Math.min(it.r * 0.6, 78); player.walkTo(it.x + dx / d * back, it.z + dz / d * back); pendingUse = it; showTapMark(it.x + dx / d * back, it.z + dz / d * back); return;
  }
  const ray = raycaster.ray; if (ray.direction.y > -0.03) return;
  const t = -ray.origin.y / ray.direction.y; let x = ray.origin.x + ray.direction.x * t, z = ray.origin.z + ray.direction.z * t;
  const dx = x - player.x, dz = z - player.z, d = Math.hypot(dx, dz); if (d > 1600) { x = player.x + dx / d * 1600; z = player.z + dz / d * 1600; }
  const p = world.nearest(x, z); if (!p) return;
  player.walkTo(p.x, p.z); showTapMark(p.x, p.z); hud.hideHint();
}
function initInput() {
  const el = renderer.domElement; el.style.touchAction = 'none';
  el.addEventListener('pointerdown', function (ev) {
    sfxUnlock();
    ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    try { el.setPointerCapture(ev.pointerId); } catch (e) {}
    if (input.captured) { capCall('down', ev); ev.preventDefault(); return; }
    if (ui.isOpen() || player.locked) return;
    if (ptrs.size === 2) { const a = Array.from(ptrs.values()); pinchD = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); drag = null; }
    else if (ptrs.size === 1) drag = { x: ev.clientX, y: ev.clientY, sx: ev.clientX, sy: ev.clientY, moved: false, id: ev.pointerId, t: performance.now() };
  });
  el.addEventListener('pointermove', function (ev) {
    const p = ptrs.get(ev.pointerId); if (p) { p.x = ev.clientX; p.y = ev.clientY; }
    if (input.captured) { capCall('move', ev); return; }
    if (ptrs.size === 2 && pinchD) {
      const a = Array.from(ptrs.values()), d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
      if (VIEW === 'top') cam.topH = clamp(cam.topH - (d - pinchD) * 3, 600, 2600); else if (VIEW === 'tps') cam.dist = clamp(cam.dist - (d - pinchD) * 1.4, 240, 1100);
      pinchD = d; return;
    }
    if (!drag || ev.pointerId !== drag.id || player.locked) return;
    const mx = ev.clientX - drag.x, my = ev.clientY - drag.y;
    if (!drag.moved && Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) > 9) drag.moved = true;
    if (drag.moved) {
      const s = VIEW === 'fps' ? 0.0042 : 0.0055;
      player.yaw -= mx * s; userLookT = 0;
      if (VIEW === 'fps') player.pitch = clamp(player.pitch - my * 0.0036, -1.1, 1.1); else if (VIEW === 'tps') cam.height = clamp(cam.height + my * 1.5, 160, 900);
      drag.x = ev.clientX; drag.y = ev.clientY; hud.hideHint();
    }
  });
  const end = function (ev, cancel) {
    const had = ptrs.has(ev.pointerId);
    if (input.captured) { if (had) capCall(cancel ? 'cancel' : 'up', ev); ptrs.delete(ev.pointerId); return; }
    ptrs.delete(ev.pointerId); if (ptrs.size < 2) pinchD = 0;
    if (!drag || ev.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (!cancel && !d.moved && performance.now() - d.t < 600 && !ui.isOpen() && !player.locked) handleTap(ev.clientX, ev.clientY);
  };
  el.addEventListener('pointerup', function (ev) { end(ev, false); });
  el.addEventListener('pointercancel', function (ev) { end(ev, true); });
  el.addEventListener('wheel', function (ev) { ev.preventDefault(); if (input.captured) { if (input.captured.wheel) input.captured.wheel(ev.deltaY, ev); return; } if (VIEW === 'top') cam.topH = clamp(cam.topH + ev.deltaY * 1.2, 600, 2600); else if (VIEW === 'tps') cam.dist = clamp(cam.dist + ev.deltaY * 0.6, 240, 1100); }, { passive: false });

  // 조이스틱
  const jb = $('#joy'), jk = $('#joyK'); let jid = null;
  const jset = function (ev) {
    const r = jb.getBoundingClientRect(), R = r.width / 2, max = R * 0.62;
    let dx = ev.clientX - (r.left + R), dy = ev.clientY - (r.top + R); const d = Math.hypot(dx, dy);
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    jk.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    let x = dx / max, y = dy / max; const m = Math.hypot(x, y);
    if (m < 0.16) { x = 0; y = 0; }
    joy.x = x; joy.y = y; joy.active = m >= 0.16;
  };
  const jend = function (ev) { if (ev.pointerId !== jid) return; jid = null; joy.x = 0; joy.y = 0; joy.active = false; jk.style.transform = ''; jb.classList.remove('on'); };
  jb.addEventListener('pointerdown', function (ev) { sfxUnlock(); if (jid != null) return; jid = ev.pointerId; try { jb.setPointerCapture(jid); } catch (e) {} jb.classList.add('on'); jset(ev); hud.hideHint(); ev.preventDefault(); });
  jb.addEventListener('pointermove', function (ev) { if (ev.pointerId === jid) jset(ev); });
  jb.addEventListener('pointerup', jend); jb.addEventListener('pointercancel', jend);

  // 키보드
  window.addEventListener('keydown', function (e) {
    const tag = ((e.target && e.target.tagName) || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    sfxUnlock();
    const c = e.code;
    HNR.emit('key', c, e);
    if (ui.keydown(c)) { e.preventDefault(); return; }
    if (input.captured && input.captured.key && input.captured.key(c, e) === true) { e.preventDefault(); return; }
    if (MOVE_KEYS[c]) { keys[c] = true; e.preventDefault(); hud.hideHint(); }
    if (e.repeat || player.locked) return;
    if (c === 'Space') player.jump();
    else if (c === 'KeyV') cycleView();
    else if (c === 'KeyE' || c === 'Enter') world.use();
    else if (c === 'KeyM') sfx.toggle();
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });
  window.addEventListener('blur', function () { for (const k in keys) keys[k] = false; });
}

/* ═══════════ 가이드: 빛기둥 비콘 + 화면 가장자리 화살표 ═══════════ */
let guideFn = null, guideT = 9, beacon = null, beaconRing = null;
const guide = HNR.guide = {
  target: null,
  /* fn() → {x,z,label}|null. 0.2초마다 다시 부른다(진행 상태에 따라 목적지가 바뀌게) */
  set: function (fn) { guideFn = typeof fn === 'function' ? fn : (fn ? function () { return fn; } : null); guideT = 9; },
  clear: function () { guideFn = null; guide.target = null; guideT = 9; }
};
function buildBeacon() {
  const tex = P.tex('beacon', 8, 128, function (g) { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,.95)'); g.fillStyle = gr; g.fillRect(0, 0, 8, 128); });
  beacon = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 1000, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd21a, map: tex, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false }));
  beacon.position.y = 500; beacon.userData.dynamic = true; beacon.raycast = noop; beacon.visible = false; beacon.renderOrder = 4; scene.add(beacon);
  const rg = new THREE.RingGeometry(30, 44, 32); rg.rotateX(-Math.PI / 2);
  beaconRing = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
  beaconRing.userData.dynamic = true; beaconRing.raycast = noop; beaconRing.visible = false; beaconRing.renderOrder = 4; scene.add(beaconRing);
}
const gv = new V3();
function guideUpdate(dt) {
  guideT += dt;
  if (guideT > 0.2) { guideT = 0; let t = null; if (guideFn) { try { t = guideFn() || null; } catch (e) { t = null; } } guide.target = t; }
  const t = guide.target, el = hud.guideEl;
  if (tapMark.mesh && tapMark.mesh.visible) { tapMark.t += dt; const s = 1 + Math.sin(tapMark.t * 8) * 0.15; tapMark.mesh.scale.set(s, 1, s); tapMark.mesh.material.opacity = Math.max(0, 0.9 - tapMark.t * 0.35); if (!player.walking && tapMark.t > 0.4 || tapMark.t > 2.6) tapMark.mesh.visible = false; }
  if (!t || cam.k > 0.3) { if (beacon) { beacon.visible = false; beaconRing.visible = false; } if (el && hud.guideOn) { el.classList.remove('show'); hud.guideOn = false; } return; }
  const dx = t.x - player.x, dz = t.z - player.z, d = Math.hypot(dx, dz), close = d < 110;
  beacon.visible = !close; beaconRing.visible = !close;
  if (!close) {
    beacon.position.x = t.x; beacon.position.z = t.z; beacon.material.opacity = 0.42 + Math.sin(T * 3) * 0.14;
    const s = 1 + (T * 0.8 % 1) * 0.8; beaconRing.position.set(t.x, 8, t.z); beaconRing.scale.set(s, 1, s); beaconRing.material.opacity = 0.9 * (1 - (T * 0.8 % 1));
  }
  if (!el) return;
  if (close || ui.isOpen()) { if (hud.guideOn) { el.classList.remove('show'); hud.guideOn = false; } return; }
  // 화면 위 표시: 보이면 목표 위에, 안 보이면 방위(앞=위, 오른쪽=오른쪽, 뒤=아래)에 맞춰 화면 둘레에
  gv.set(t.x, t.y != null ? t.y : 150, t.z).applyMatrix4(camera.matrixWorldInverse);
  const behind = gv.z > -1; let sx, sy, rot;
  gv.applyMatrix4(camera.projectionMatrix);
  if (!behind && Math.abs(gv.x) < 0.9 && gv.y < 0.74 && gv.y > -0.62) { sx = (gv.x * 0.5 + 0.5) * viewW; sy = (-gv.y * 0.5 + 0.5) * viewH - 30; rot = 180; }
  else {
    const fxx = -Math.sin(player.yaw), fzz = -Math.cos(player.yaw), rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
    const a = Math.atan2(dx * rx + dz * rz, dx * fxx + dz * fzz);   // 0 = 정면, + = 오른쪽
    sx = viewW / 2 + Math.sin(a) * (viewW / 2 - 74); sy = viewH / 2 - Math.cos(a) * (viewH / 2 - 150) + 10; rot = a * 180 / Math.PI;
  }
  el.style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px)';
  hud.guideArrow.style.transform = 'rotate(' + rot.toFixed(0) + 'deg)';
  const txt = (t.label || '여기로') + '|' + Math.max(1, Math.round(d / PER_M));
  if (txt !== hud.guideTxt) { hud.guideTxt = txt; hud.guideLbl.innerHTML = esc(t.label || '여기로 가 보아요') + '<b>' + Math.max(1, Math.round(d / PER_M)) + ' m</b>'; }
  if (!hud.guideOn) { el.classList.add('show'); hud.guideOn = true; }
}

/* ═══════════ 효과음 (WebAudio 삑 소리) ═══════════ */
let actx = null, muted = false;
try { muted = localStorage.getItem('hnr.lab.mute') === '1'; } catch (e) {}
function sfxUnlock() {
  if (!actx) { try { const AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); } catch (e) { actx = null; } }
  if (actx && actx.state === 'suspended') { try { const p = actx.resume(); if (p && p.catch) p.catch(noop); } catch (e) {} }
}
const SFX = {   // [주파수, 시작(s), 길이(s), 파형]
  ok:    [[660, 0, 0.09], [880, 0.09, 0.16]],
  no:    [[233, 0, 0.13, 'square'], [175, 0.13, 0.22, 'square']],
  card:  [[523, 0, 0.08], [659, 0.08, 0.08], [784, 0.16, 0.18]],
  badge: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.3]],
  click: [[540, 0, 0.045, 'triangle']],
  open:  [[392, 0, 0.1], [523, 0.1, 0.1], [659, 0.2, 0.22]],
  jump:  [[330, 0, 0.05, 'triangle'], [494, 0.05, 0.09, 'triangle']],
  pop:   [[760, 0, 0.05]],
  tick:  [[1200, 0, 0.02, 'square']]
};
/* 효과음: 'ok','no','card','badge','click','open','jump','pop','tick' */
function sfx(name) {
  const seq = SFX[name]; if (muted || !seq || !actx || actx.state !== 'running') return;
  try {
    const t0 = actx.currentTime + 0.005;
    for (let i = 0; i < seq.length; i++) {
      const n = seq[i], o = actx.createOscillator(), g = actx.createGain();
      o.type = n[3] || 'sine'; o.frequency.value = n[0];
      g.gain.setValueAtTime(0.0001, t0 + n[1]); g.gain.exponentialRampToValueAtTime(n[3] === 'square' ? 0.07 : 0.16, t0 + n[1] + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + n[1] + n[2]);
      o.connect(g); g.connect(actx.destination); o.start(t0 + n[1]); o.stop(t0 + n[1] + n[2] + 0.03);
    }
  } catch (e) {}
}
HNR.sfx = sfx;
sfx.mute = function (b) { muted = !!b; try { localStorage.setItem('hnr.lab.mute', muted ? '1' : '0'); } catch (e) {} const el = $('#btnMute'); if (el) { el.firstChild.nodeValue = muted ? '🔇' : '🔊'; el.classList.toggle('off', muted); } };
sfx.toggle = function () { sfx.mute(!muted); if (!muted) sfx('click'); };
sfx.isMuted = function () { return muted; };

/* ═══════════ 상태(세션) ═══════════ */
const KEY = CONFIG.sessionKey || 'hnr.lab.v4';
const AVS = [['#0d69ac', '파랑'], ['#c4281c', '빨강'], ['#4b974b', '초록'], ['#f5cd30', '노랑'], ['#da8541', '주황'], ['#6b327c', '보라'], ['#4ac7e3', '하늘'], ['#e8adc8', '분홍']];
const numArr = a => (Array.isArray(a) ? a.filter(n => typeof n === 'number') : []);
function normS(s) {
  if (!s || typeof s !== 'object' || !s.name) return null;
  s.passed = numArr(s.passed); s.forks = numArr(s.forks); s.cards = numArr(s.cards);
  s.forkSide = s.forkSide || {}; for (let n = 1; n <= 5; n++) if (s.forkSide[n] !== 'L' && s.forkSide[n] !== 'R') s.forkSide[n] = Math.random() < 0.5 ? 'L' : 'R';
  s.simTasks = s.simTasks || {}; s.seen = s.seen || {}; s.view = VIEWS.indexOf(s.view) >= 0 ? s.view : (CONFIG.view || 'fps');
  s.avatar = typeof s.avatar === 'string' && s.avatar[0] === '#' ? s.avatar : AVS[0][0]; s.no = s.no || 1 + Math.floor(Math.random() * 99);
  return s;
}
function newS(name, avatar) {
  const fs = {}, pat = Q.forks || '';
  for (let n = 1; n <= 5; n++) fs[n] = /[LR]/.test(pat[n - 1] || '') ? pat[n - 1] : (AUTO ? (n % 2 ? 'L' : 'R') : (Math.random() < 0.5 ? 'L' : 'R'));
  return { name: String(name).slice(0, 12), avatar: avatar || AVS[0][0], no: AUTO ? 27 : 1 + Math.floor(Math.random() * 99), start: new Date().toISOString(), passed: [], forks: [], cards: [], forkSide: fs, simTasks: {}, seen: {}, view: CONFIG.view || 'fps' };
}
function loadS() { try { return normS(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return null; } }
HNR.S = null;
const state = HNR.state = {
  gatePassed: function (n) { return !!HNR.S && HNR.S.passed.indexOf(n) >= 0; },
  forkSolved: function (n) { return !!HNR.S && HNR.S.forks.indexOf(n) >= 0; },
  hasCard: function (n) { return !!HNR.S && HNR.S.cards.indexOf(n) >= 0; },
  /* 갈림길 n 의 정답 문: 'L' | 'R' */
  forkCorrect: function (n) { return HNR.S ? HNR.S.forkSide[n] : 'L'; },
  /* 다음에 할 관문 번호(1~6), 전부 통과했으면 7 */
  nextGate: function () { for (let n = 1; n <= 6; n++) if (!state.gatePassed(n)) return n; return 7; },
  /* 관문 n 통과 처리: 저장 + 'state' 이벤트 + 배지 토스트 + (n≤5) 합격 카드 팝업.
     Promise<처음 통과했나>. 카드 팝업을 닫으면 풀린다. opt:{silent:true} 면 화면 연출 없이 */
  passGate: function (n, opt) {
    const S = HNR.S; if (!S || !(n >= 1 && n <= 6)) return Promise.resolve(false);
    if (state.gatePassed(n)) return Promise.resolve(false);
    S.passed.push(n); S.passed.sort(); if (n <= 5 && S.cards.indexOf(n) < 0) { S.cards.push(n); S.cards.sort(); }
    state.save(); HNR.emit('state', { type: 'gate', n: n });
    if (opt && opt.silent) return Promise.resolve(true);
    ui.badge(n);
    if (n <= 5) return ui.card(n, 'front').then(function () { return true; });
    return Promise.resolve(true);
  },
  /* 갈림길 n 해결 처리(저장 + 'state'). 화면 연출(카드 뒤집기)은 부르는 쪽이 ui.card(n,'flip') 로 */
  solveFork: function (n) { const S = HNR.S; if (!S || state.forkSolved(n)) return false; S.forks.push(n); S.forks.sort(); state.save(); HNR.emit('state', { type: 'fork', n: n }); return true; },
  save: function () { if (!HNR.S) return; try { localStorage.setItem(KEY, JSON.stringify(HNR.S)); } catch (e) {} },
  /* 세션 지우기. 기본은 지우고 새로 고침(다음 팀). {reload:false} 면 지우기만 */
  reset: function (opt) { try { localStorage.removeItem(KEY); } catch (e) {} HNR.S = null; if (!opt || opt.reload !== false) { try { const u = new URL(location.href); u.searchParams.delete('pass'); u.searchParams.delete('fresh'); location.href = u.toString(); } catch (e) { location.reload(); } } },
  /* 시험용: 관문 1..n 통과 + 카드 + 갈림길 해결 상태로 */
  setPassed: function (n) { const S = HNR.S; if (!S) return; S.passed = []; S.cards = []; S.forks = []; for (let i = 1; i <= Math.min(6, n); i++) { S.passed.push(i); if (i <= 5) { S.cards.push(i); S.forks.push(i); } } state.save(); HNR.emit('state', { type: 'set' }); }
};

/* ═══════════ HUD ═══════════ */
const hud = HNR.hud = {
  guideEl: null, guideArrow: null, guideLbl: null, guideOn: false, guideTxt: '', hintGone: false,
  /* HUD 전체 숨김/보임(연출·시뮬 모드) */
  hide: function (b) { document.body.classList.toggle('hud-off', !!b); },
  /* 시뮬 모드 화면: HUD 를 숨기고 #simPanel 을 보인다 */
  sim: function (b) { document.body.classList.toggle('sim', !!b); },
  setZone: function (name) { const el = $('#zone'); if (el) el.textContent = name ? '📍 ' + name : ''; },
  setTalk: function (label) { const w = $('#talk'); if (!w) return; if (label) { $('#talkBtn').textContent = label; w.classList.add('show'); } else w.classList.remove('show'); },
  hideHint: function () { if (hud.hintGone) return; hud.hintGone = true; const h = $('#hint'); if (h) { h.classList.add('gone'); setTimeout(function () { h.hidden = true; }, 500); } },
  refresh: function () {
    const S = HNR.S; if (!S) return;
    const n = S.passed.length, p = Math.round(n / 6 * 100);
    $('#rateT').textContent = ST('common.progress', '입사 진행률');
    $('#rateN').textContent = p + '%'; $('#rateI').style.width = p + '%';
    let h = '';
    for (let i = 1; i <= 6; i++) { const got = S.passed.indexOf(i) >= 0; h += '<span class="bd' + (got ? ' got' : '') + '" data-n="' + i + '"><i>' + (got ? BADGE_ICON[i] : i) + '</i><em>' + esc(badgeName(i)) + '</em></span>'; }
    $('#badges').innerHTML = h;
    $('#who').innerHTML = '<span class="no">No.' + ('00' + S.no).slice(-3) + '</span><b>' + esc(S.name) + '</b><span class="st">' + (n >= 6 ? '연구원' : '지원자') + '</span>';
    const wn = $('#walletN'); wn.textContent = S.cards.length; wn.setAttribute('data-n', S.cards.length);
  }
};
HNR.on('state', function () { hud.refresh(); });

/* ═══════════ UI: 대화창 · 토스트 · 카드 · 페이드 · 엔딩 ═══════════ */
const ui = HNR.ui = { instant: AUTO };
let dlgState = null, sayChain = Promise.resolve(), cardState = null, walletOpen = false, endingRes = null, entryOpen = true, fading = false;
/* 화면을 가리는 창(대화·카드·지갑·엔딩·입장·페이드)이 떠 있나 → 떠 있으면 걷기·말 걸기가 멈춘다 */
ui.isOpen = function () { return !!(dlgState || cardState || walletOpen || endingRes || entryOpen || fading); };
function fill(t) { return String(t == null ? '' : t).replace(/\{name\}/g, (HNR.S && HNR.S.name) || '지원자'); }
function fmt(t) { return esc(fill(t)).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'); }
function plain(t) { return fill(t).replace(/\*\*/g, ''); }
ui.fill = fill;
function normLines(lines) { if (lines == null) return []; if (!Array.isArray(lines)) lines = [lines]; return lines.filter(function (l) { return l != null && l !== ''; }).map(function (l) { return typeof l === 'string' ? { t: l } : l; }); }
function normBtns(b) { if (!b || !b.length) return [{ t: '확인', v: 'ok', cls: 'blue' }]; return b.map(function (x) { return typeof x === 'string' ? { t: x, v: x } : x; }); }
function speaker(line, opt) {
  if (line.memo != null) return { key: 'memo', name: '쪽지', role: '' };
  if (line.board != null) return { key: 'memo', name: line.title || '칠판', role: '' };
  if (line.sign != null) return { key: 'memo', name: '표지판', role: '' };
  if (line.steps) return { key: 'memo', name: line.title || '이렇게 해 보아요', role: '' };
  const who = line.who || opt.who || 'bit';
  if (who === 'me' || who === 'player') return { key: 'me', name: (HNR.S && HNR.S.name) || '나', role: '지원자' };
  if (who === 'sys' || who === 'none') return { key: 'sys', name: '안내', role: '' };
  if (NPCS[who]) return { key: who, name: char.nameOf(who), role: char.roleOf(who) };
  return { key: 'sys', name: String(who), role: '' };
}
function cardHtml(n, side, cls) {
  return '<div class="pcard ' + (cls || '') + (side === 'back' ? ' flipped' : '') + '" data-n="' + n + '"><div class="inner">' +
    '<div class="face front"><div class="hd"><span>' + esc(ST('common.card', '합격 카드')) + '</span><span class="num">' + n + '</span></div><div class="tx">' + fmt(cardText(n, 'front')) + '</div><div class="ft">다음 갈림길의 수수께끼예요</div></div>' +
    '<div class="face back"><div class="hd"><span>과학 한 줄</span><span class="num">' + n + '</span></div><div class="tx">' + fmt(cardText(n, 'back')) + '</div><div class="ft">HNR Tech Inc. ' + esc(ST('common.album', '합격 자료집')) + '</div></div></div></div>';
}
/* 대화창. lines: 문자열 | {who,t} | {memo} | {board} | {sign} | {steps:[...],title} | {card:n,side,t} 또는 그 배열.
   opt:{who:기본 화자(NPC 키·'me'·'sys'·아무 이름), buttons:[{t,v,cls}] (마지막 줄에 뜬다), instant}
   Promise<누른 버튼의 v>. 여러 번 부르면 차례로 뜬다 */
ui.say = function (lines, opt) {
  const p = sayChain.then(function () { return runSay(lines, opt || NOOPT); });
  sayChain = p.then(noop, noop);
  return p;
};
function runSay(lines, opt) {
  return new Promise(function (res) {
    const L = normLines(lines); if (!L.length) { res(null); return; }
    const dlg = $('#dlg'), txt = $('#dlgTxt'), btns = $('#dlgBtns'), dots = $('#dlgDots'), nameEl = $('#dlgName'), roleEl = $('#dlgRole'), face = $('#dlgFace');
    const endBtns = normBtns(opt.buttons);
    let i = 0, timer = null, typing = false, fullHtml = '';
    const stopType = function () { if (timer) { clearTimeout(timer); timer = null; } };
    const done = function (v) { stopType(); dlg.classList.remove('show'); document.body.classList.remove('dlg'); dlgState = null; txt.onclick = null; useCooldown = performance.now() + 350; res(v); };
    const addBtn = function (b, fn) { const el = document.createElement('button'); el.type = 'button'; el.className = 'hbtn ' + (b.cls || 'blue'); el.textContent = b.t; if (b.v != null) el.setAttribute('data-v', b.v); el.addEventListener('click', fn); btns.appendChild(el); return el; };
    const showButtons = function () {
      btns.innerHTML = '';
      if (i < L.length - 1) addBtn({ t: '다음 ▶', cls: 'blue' }, next);
      else endBtns.forEach(function (b) { addBtn(b, function () { sfx('click'); done(b.v); }); });
    };
    const completeText = function () { stopType(); typing = false; txt.innerHTML = fullHtml; showButtons(); };
    function next() { if (typing) { completeText(); return; } sfx('click'); if (i < L.length - 1) { i++; render(); } }
    function render() {
      const line = L[i], sp = speaker(line, opt);
      char.portrait(face, sp.key); nameEl.textContent = sp.name || ''; roleEl.textContent = sp.role || '';
      dots.innerHTML = L.length > 1 ? L.map(function (_, k) { return '<i class="' + (k <= i ? 'on' : '') + '"></i>'; }).join('') : '';
      btns.innerHTML = ''; stopType(); typing = false;
      if (line.memo != null) { txt.innerHTML = '<div class="memo">' + fmt(line.memo) + '</div>'; showButtons(); }
      else if (line.board != null) { txt.innerHTML = '<div class="board">' + fmt(line.board) + '</div>'; showButtons(); }
      else if (line.sign != null) { txt.innerHTML = '<div class="sign">' + fmt(line.sign) + '</div>'; showButtons(); }
      else if (line.steps) { txt.innerHTML = (line.t ? fmt(line.t) : '') + '<ol class="steps">' + line.steps.map(function (s) { return '<li>' + fmt(s) + '</li>'; }).join('') + '</ol>'; showButtons(); }
      else if (line.card != null) { txt.innerHTML = '<div class="mcard">' + cardHtml(line.card, line.side || 'front', 'mini') + '<div>' + fmt(line.t || (line.side === 'back' ? '카드 뒷면에 과학 한 줄이 나타났어요.' : '합격 카드 ' + line.card + '번의 수수께끼예요.')) + '</div></div>'; showButtons(); }
      else {
        const full = plain(line.t); fullHtml = fmt(line.t);
        if (ui.instant || opt.instant || full.length < 2) completeText();
        else {
          typing = true; txt.textContent = ''; let k = 0;
          if (i < L.length - 1) showButtons();
          (function tick() { k += 2; txt.textContent = full.slice(0, k); if (k < full.length) timer = setTimeout(tick, 24); else completeText(); })();
        }
      }
    }
    txt.onclick = function () { if (typing) completeText(); else if (i < L.length - 1) next(); };
    dlgState = {
      primary: function () { if (typing) { completeText(); return; } const b = btns.querySelector('.hbtn'); if (b) b.click(); },
      esc: function () { if (typing) { completeText(); return; } const b = btns.querySelector('.hbtn.ghost,.hbtn.grey,[data-v="later"],[data-v="cancel"],[data-v="close"],[data-v="no"]'); if (b) b.click(); },
      /* 시험용: v 값(또는 순번)의 버튼을 누른다. 아직 마지막 줄이 아니면 끝까지 넘긴다 */
      choose: function (v) { let guard = 0; while ((typing || i < L.length - 1) && guard++ < 200) { if (typing) completeText(); else { i++; render(); } } if (typing) completeText();
        const all = btns.querySelectorAll('.hbtn'); let b = null; all.forEach(function (x, k) { if (b) return; if (x.getAttribute('data-v') === String(v) || k === v) b = x; }); if (!b && v == null) b = all[0]; if (b) b.click(); return !!b; }
    };
    dlg.classList.add('show'); document.body.classList.add('dlg'); player.stop(); render();
  });
}
/* 지금 떠 있는 대화창을 코드로 넘긴다(시험·자동 진행). v 를 주면 그 값의 버튼, 없으면 첫 버튼 */
ui.choose = function (v) { return dlgState ? dlgState.choose(v) : false; };
ui.keydown = function (c) {
  const ok = c === 'Enter' || c === 'Space' || c === 'NumpadEnter', esc_ = c === 'Escape';
  if (!ok && !esc_) return false;
  if (cardState) { cardState.close(); return true; }
  if (dlgState) { if (ok) dlgState.primary(); else dlgState.esc(); return true; }
  if (walletOpen) { ui.closeWallet(); return true; }
  if (endingRes && esc_) { ui.closeEnding(); return true; }
  return false;
};
/* 화면 아래 토스트. opt:{icon:'🎉', ms:2600, cls:'gold'} */
ui.toast = function (text, opt) {
  opt = opt || NOOPT; const box = $('#toasts'); if (!box) return;
  const d = document.createElement('div'); d.className = 'toast' + (opt.cls ? ' ' + opt.cls : '');
  d.innerHTML = (opt.icon ? '<i>' + esc(opt.icon) + '</i>' : '') + '<span>' + fmt(text) + '</span>';
  box.appendChild(d); while (box.children.length > 3) box.removeChild(box.firstChild);
  setTimeout(function () { d.classList.add('out'); setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 320); }, opt.ms || 2600);
  return d;
};
/* 역량 배지 획득 토스트 + HUD 배지 칸 반짝 */
ui.badge = function (n) {
  sfx('badge');
  ui.toast(ST('common.badge', '역량 배지') + ' 「' + badgeName(n) + '」 획득!', { icon: BADGE_ICON[n] || '🏅', cls: 'gold', ms: 3400 });
  const el = document.querySelector('#badges .bd[data-n="' + n + '"]'); if (el) { el.classList.add('pop'); setTimeout(function () { el.classList.remove('pop'); }, 900); }
};
/* 합격 카드 팝업. side: 'front'(앞면 수수께끼) | 'flip'(앞면에서 뒷면으로 뒤집는 연출) | 'back'(뒷면). 닫으면 풀리는 Promise */
ui.card = function (n, side) {
  side = side || 'front';
  return new Promise(function (res) {
    const pop = $('#cardPop'), big = $('#cardBig'), btn = $('#cardBtn'); let timer = null;
    $('#cardFrontHd').textContent = ST('common.card', '합격 카드'); $('#cardNumF').textContent = n; $('#cardNumB').textContent = n;
    $('#cardFrontTx').innerHTML = fmt(cardText(n, 'front')); $('#cardBackTx').innerHTML = fmt(cardText(n, 'back'));
    big.classList.toggle('flipped', side === 'back');
    $('#cardCap').textContent = side === 'front' ? '🎉 합격 카드 ' + n + '번을 받았어요!' : side === 'flip' ? '🚪 문이 열렸어요! 카드를 뒤집어 볼까요?' : '합격 카드 ' + n + '번 · 과학 한 줄';
    btn.textContent = side === 'front' ? '🃏 카드 지갑에 넣기' : '확인';
    const canFlip = side !== 'front' || state.forkSolved(n);
    big.onclick = function () { if (canFlip) { big.classList.toggle('flipped'); sfx('pop'); } };
    const close = function () { if (timer) clearTimeout(timer); pop.classList.remove('show'); cardState = null; btn.onclick = null; big.onclick = null; useCooldown = performance.now() + 350; sfx('click'); res(); };
    btn.onclick = close; cardState = { close: close, n: n };
    pop.classList.add('show'); sfx('card'); player.stop();
    if (side === 'flip') timer = setTimeout(function () { big.classList.add('flipped'); sfx('ok'); }, ui.instant ? 30 : 750);
  });
};
/* 카드 지갑(받은 카드 앞면, 갈림길을 맞힌 카드는 뒷면). 카드를 누르면 크게 본다 */
ui.wallet = function (album) {
  const S = HNR.S; if (!S) return;
  let h = '';
  for (let n = 1; n <= 5; n++) h += state.hasCard(n) ? cardHtml(n, state.forkSolved(n) ? 'back' : 'front', 'mini') : '<div class="pcard mini locked" data-n="' + n + '"><div class="inner"><div class="face front"><div class="hd"><span>관문 ' + n + '</span><span class="num">?</span></div><div class="tx">' + esc(gateName(n)) + '<br>통과하면 받아요</div></div></div></div>';
  $('#walletGrid').innerHTML = h;
  $('#walletTitle').textContent = album ? '📚 ' + ST('common.album', '합격 자료집') : '🃏 카드 지갑 (' + S.cards.length + '/5)';
  $('#wallet').classList.add('show'); walletOpen = true; player.stop(); sfx('click');
};
ui.closeWallet = function () { $('#wallet').classList.remove('show'); walletOpen = false; };
/* 화면 페이드. fade(ms) = 까맣게 됐을 때 풀리고 곧 저절로 밝아진다(순간 이동 연출용).
   fade(ms,'out') = 까맣게 유지, fade(ms,'in') = 다시 밝게 */
ui.fade = function (ms, dir) {
  ms = ms == null ? 400 : ms; const el = $('#fade');
  return new Promise(function (res) {
    el.style.transitionDuration = ms + 'ms';
    if (dir === 'in') { el.style.opacity = '0'; setTimeout(function () { el.classList.remove('on'); fading = false; res(); }, ms + 20); return; }
    fading = true; el.classList.add('on'); void el.offsetWidth; el.style.opacity = '1';
    setTimeout(function () { res(); if (dir !== 'out') setTimeout(function () { ui.fade(ms, 'in'); }, 140); }, ms + 20);
  });
};

/* 사원증 그리기(캔버스) */
function drawAvatar(g, cx, by, k, pants) {
  const u = 16 * k, yl = by - 2 * u, yt = yl - 2 * u, yh = yt - 1.2 * u;
  g.lineJoin = 'round'; g.lineWidth = Math.max(3, k * 1.6); g.strokeStyle = '#1b1d21';
  const r = function (x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); g.strokeRect(x, y, w, h); };
  r(cx - u, yl, u, 2 * u, pants); r(cx, yl, u, 2 * u, pants);
  r(cx - 2 * u, yt, u, 1.4 * u, '#f2f3f3'); r(cx - 2 * u, yt + 1.4 * u, u, 0.6 * u, '#f5cd30'); r(cx + u, yt, u, 1.4 * u, '#f2f3f3'); r(cx + u, yt + 1.4 * u, u, 0.6 * u, '#f5cd30');
  r(cx - u, yt, 2 * u, 2 * u, '#f2f3f3');
  g.fillStyle = '#0d69ac'; g.fillRect(cx - 0.16 * u, yt + 0.1 * u, 0.32 * u, 1.2 * u); g.fillStyle = pants; g.fillRect(cx - 0.8 * u, yt + 0.3 * u, 0.42 * u, 0.5 * u);
  r(cx - 0.6 * u, yh, 1.2 * u, 1.2 * u, '#f5cd30');
  drawFace(g, 'smile', cx - 0.6 * u, yh, 1.2 * u);
}
function drawIdCard(cv) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, S = HNR.S || { name: '지원자', avatar: AVS[0][0], no: 1, passed: [] };
  g.clearRect(0, 0, W, H); g.save(); roundRect(g, 0, 0, W, H, 40); g.clip();
  g.fillStyle = '#fbfcfe'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#0d69ac'; g.fillRect(0, 0, W, 128); g.fillStyle = '#084a7a'; g.fillRect(0, 122, W, 10);
  g.fillStyle = 'rgba(255,255,255,.1)'; for (let x = 20; x < W; x += 44) for (let y = 20; y < 120; y += 44) { g.beginPath(); g.arc(x, y, 13, 0, TAU); g.fill(); }
  g.fillStyle = '#fff'; roundRect(g, 38, 26, 76, 76, 18); g.fill();
  g.fillStyle = '#0d69ac'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 56px ' + FONT; g.fillText('H', 76, 67);
  g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = '900 46px ' + FONT; g.fillText(ST('ending.idCard.company', 'HNR Tech Inc.'), 134, 54);
  g.font = '700 22px ' + FONT; g.fillText('사원증 · 3D 연구소', 136, 96);
  g.fillStyle = 'rgba(0,0,0,.25)'; roundRect(g, W - 190, 46, 130, 30, 15); g.fill();
  // 사진
  const px = 46, py = 160, pw = 252, ph = 286;
  g.fillStyle = '#cfe9fb'; roundRect(g, px, py, pw, ph, 24); g.fill(); g.lineWidth = 6; g.strokeStyle = '#1b1d21'; g.stroke();
  g.save(); roundRect(g, px, py, pw, ph, 24); g.clip(); g.fillStyle = '#4b974b'; g.fillRect(px, py + ph - 34, pw, 34); drawAvatar(g, px + pw / 2, py + ph - 22, 2.75, S.avatar); g.restore();
  // 글
  const tx = 334;
  g.fillStyle = '#0d69ac'; roundRect(g, tx, 164, 132, 46, 14); g.fill();
  g.fillStyle = '#fff'; g.font = '900 28px ' + FONT; g.textAlign = 'center'; g.fillText(ST('ending.idCard.title', '연구원'), tx + 66, 188);
  g.textAlign = 'left'; g.fillStyle = '#1b1d21'; fitFont(g, S.name, '900', 78, W - tx - 50, 30); g.fillText(S.name, tx, 262);
  g.font = '700 26px ' + FONT; g.fillStyle = '#5b6068';
  const d = new Date(), ds = d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + '.';
  g.fillText('사번', tx, 330); g.fillText('입사일', tx, 372); g.fillText('소속', tx, 414);
  g.fillStyle = '#1b1d21'; g.font = '800 26px ' + FONT;
  g.fillText('HNR-' + d.getFullYear() + '-' + ('00' + S.no).slice(-3), tx + 96, 330); g.fillText(ds, tx + 96, 372); g.fillText('반도체 기억 연구실', tx + 96, 414);
  // 줄무늬(바코드 느낌)
  g.fillStyle = '#1b1d21'; const br = mulberry(S.no * 7 + 3); let bx = W - 250; while (bx < W - 50) { const w = 2 + Math.floor(br() * 5); g.fillRect(bx, 314, w, 52); bx += w + 2 + Math.floor(br() * 4); }
  // 배지
  g.fillStyle = '#eef2f7'; g.fillRect(0, 470, W, 130);
  g.fillStyle = '#5b6068'; g.font = '800 18px ' + FONT; g.textAlign = 'left'; g.fillText(ST('common.badge', '역량 배지'), 46, 492);
  for (let n = 1; n <= 6; n++) {
    const cx = 100 + (n - 1) * 152, cy = 536, got = S.passed.indexOf(n) >= 0;
    g.beginPath(); g.arc(cx, cy, 30, 0, TAU); g.fillStyle = got ? '#ffd84a' : '#d5d9e0'; g.fill(); g.lineWidth = 4; g.strokeStyle = got ? '#1b1d21' : '#a9aeb8'; g.stroke();
    g.textAlign = 'center'; g.fillStyle = got ? '#1b1d21' : '#8a8d93'; g.font = (got ? '32px ' : '800 24px ') + (got ? '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",' : '') + FONT; g.fillText(got ? BADGE_ICON[n] : String(n), cx, cy + 2);
    g.font = '800 17px ' + FONT; g.fillStyle = got ? '#1b1d21' : '#8a8d93'; g.textAlign = 'left'; g.fillText(badgeName(n), cx + 36, cy + 1);
  }
  g.restore();
  g.lineWidth = 8; g.strokeStyle = '#1b1d21'; roundRect(g, 4, 4, W - 8, H - 8, 38); g.stroke();
}
ui.drawIdCard = drawIdCard;
/* 엔딩: 사원증 발급 오버레이. 닫으면 풀리는 Promise */
ui.ending = function () {
  if (endingRes) return Promise.resolve();
  const cv = $('#idCanvas'); drawIdCard(cv);
  const lines = ST('ending.lines', ['{name} 연구원님, 합격을 축하해요!']).map(function (l) { return fmt(typeof l === 'string' ? l : l.t); });
  const rf = ST('ending.refresh', ''); $('#endLines').innerHTML = lines.join(' ') + (rf ? '<br><b>🤖 ' + fmt(rf) + '</b>' : '');
  const cf = $('#confetti'); if (cf && !cf.children.length) { const r = mulberry(5), cols = ['#f5cd30', '#c4281c', '#0d69ac', '#4b974b', '#da8541', '#e8adc8', '#4ac7e3']; let h = ''; for (let i = 0; i < 26; i++) h += '<i style="left:' + (r() * 100).toFixed(1) + '%;background:' + cols[i % cols.length] + ';animation-duration:' + (3.2 + r() * 3.5).toFixed(2) + 's;animation-delay:-' + (r() * 6).toFixed(2) + 's"></i>'; cf.innerHTML = h; }
  $('#ending').classList.add('show'); player.stop(); sfx('badge');
  if (HNR.S) { HNR.S.seen.ending = true; state.save(); }
  HNR.emit('ending');
  return new Promise(function (res) { endingRes = res; });
};
ui.closeEnding = function () { $('#ending').classList.remove('show'); const r = endingRes; endingRes = null; if (r) r(); };
ui.saveIdCard = function () {
  try { const cv = $('#idCanvas'), a = document.createElement('a'); a.download = 'HNR_사원증_' + ((HNR.S && HNR.S.name) || '연구원') + '.png'; a.href = cv.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove(); ui.toast('사원증 사진을 저장했어요!', { icon: '📸' }); return true; }
  catch (e) { ui.toast('이 기기에서는 저장이 안 돼요. 화면을 캡처해 보아요.', { icon: '📸' }); return false; }
};
/* 예/아니오 확인 창 → Promise<bool> */
ui.confirm = function (text, yes, no) { return ui.say([{ who: 'sys', t: text }], { instant: true, buttons: [{ t: no || '아니요', v: 'no', cls: 'ghost' }, { t: yes || '네', v: 'yes', cls: 'red' }] }).then(function (v) { return v === 'yes'; }); };

function initUI() {
  hud.guideEl = $('#guide'); hud.guideArrow = $('#guideArrow'); hud.guideLbl = $('#guideLbl');
  const on = function (sel, evt, fn) { const el = $(sel); if (el) el.addEventListener(evt, function (e) { sfxUnlock(); fn(e); }); };
  on('#talkBtn', 'click', function () { world.use(); });
  on('#btnJump', 'pointerdown', function (e) { e.preventDefault(); player.jump(); });
  on('#btnView', 'click', function () { if (!player.locked) cycleView(); });
  on('#btnWallet', 'click', function () { if (!ui.isOpen()) ui.wallet(); });
  on('#btnMute', 'click', function () { sfx.toggle(); });
  const askTeam = function () { ui.confirm('이 태블릿의 진행 기록을 지우고 다음 팀을 받을까요?', '지우고 새로 시작', '취소').then(function (ok) { if (ok) state.reset(); }); };
  on('#btnTeam', 'click', function () { if (!ui.isOpen()) askTeam(); });
  on('#walletClose', 'click', function () { ui.closeWallet(); });
  on('#wallet', 'click', function (e) { if (e.target.id === 'wallet') ui.closeWallet(); });
  on('#walletGrid', 'click', function (e) { const c = e.target.closest ? e.target.closest('.pcard') : null; if (!c) return; const n = +c.getAttribute('data-n'); if (state.hasCard(n)) ui.card(n, state.forkSolved(n) ? 'back' : 'front'); });
  on('#endSave', 'click', function () { ui.saveIdCard(); });
  on('#endBook', 'click', function () { ui.wallet(true); });
  on('#endClose', 'click', function () { ui.closeEnding(); });
  on('#endTeam', 'click', function () { ui.closeEnding(); askTeam(); });
  sfx.mute(muted);
  try { const c = makeCanvas(64, 64), g = c.getContext('2d'); g.fillStyle = '#0d69ac'; roundRect(g, 2, 2, 60, 60, 14); g.fill(); g.fillStyle = '#fff'; g.font = '900 44px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', 32, 35); const l = document.createElement('link'); l.rel = 'icon'; l.href = c.toDataURL('image/png'); document.head.appendChild(l); } catch (e) {}
}
/* 입장 카드(채용 공고 + 이름 + 바지 색) */
function initEntry(start) {
  const nt = ST('notice.title', null); if (nt) $('#noticeTitle').textContent = nt;
  const nl = ST('notice.lines', null); if (nl && nl.length) $('#noticeLines').innerHTML = nl.map(function (l) { return '<li>' + fmt(l) + '</li>'; }).join('');
  const prev = loadS();
  if (prev) {
    $('#enterForm').hidden = true; $('#enterBack').hidden = false;
    $('#backTitle').textContent = prev.name + ' 지원자님, 다시 오셨군요!';
    $('#backSub').textContent = '통과한 관문 ' + prev.passed.length + '개 · 합격 카드 ' + prev.cards.length + '장. 이어서 해 볼까요?';
    $('#contBtn').onclick = function () { sfxUnlock(); HNR.S = prev; start(false); };
    $('#newBtn').onclick = function () { sfxUnlock(); state.reset({ reload: false }); $('#enterBack').hidden = true; $('#enterForm').hidden = false; $('#nameIn').focus(); };
  }
  let picked = AVS[0][0]; const g = $('#avs'), inp = $('#nameIn'), go = $('#goBtn');
  g.innerHTML = AVS.map(function (a, i) { return '<button type="button" data-a="' + a[0] + '" class="' + (i === 0 ? 'on' : '') + '" aria-label="' + a[1] + '"><i style="background:' + a[0] + '"></i></button>'; }).join('');
  g.addEventListener('click', function (e) { const b = e.target.closest ? e.target.closest('button') : null; if (!b) return; picked = b.getAttribute('data-a'); g.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); sfxUnlock(); sfx('pop'); });
  const chk = function () { go.disabled = inp.value.trim().length === 0; };
  inp.addEventListener('input', chk); inp.addEventListener('compositionend', chk);
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing && !go.disabled) go.click(); });
  go.onclick = function () { const name = inp.value.trim(); if (!name) return; sfxUnlock(); sfx('ok'); inp.blur(); HNR.S = newS(name, picked); state.save(); start(true); };
}

/* ═══════════ 진행 도우미(선택): 관문 대화 · 갈림길 문 ═══════════ */
const flow = HNR.flow = {};
function simReady(id) { return !!(HNR.sim && typeof HNR.sim.open === 'function'); }
function simsOf(n) { return ST('gates.' + n + '.sims', FB.gateSims[n] || []); }
function simsDone(n) { const ids = simsOf(n); if (!HNR.sim || typeof HNR.sim.tasksDone !== 'function' || !ids.length) return false; for (let i = 0; i < ids.length; i++) if (!HNR.sim.tasksDone(ids[i])) return false; return true; }
function openSim(id) { return new Promise(function (res) { if (!simReady(id)) { res(false); return; } HNR.once('sim:exit', function () { res(true); }); try { const p = HNR.sim.open(id); if (p && p.catch) p.catch(function (e) { console.error('[HNR] sim.open 오류', e); res(false); }); } catch (e) { console.error('[HNR] sim.open 오류', e); res(false); } }); }
/* 관문 n 통과 연출 한 벌: passGate(배지·카드) → 통과 대사 → 비트 개그 → (6이면) 엔딩 */
flow.pass = async function (n) {
  const first = await state.passGate(n); if (!first) return false;
  const npc = ST('gates.' + n + '.npc', FB.gateNpc[n]);
  const pass = ST('gates.' + n + '.pass', null); if (pass) await ui.say(pass, { who: npc });
  const gag = ST('gates.' + n + '.gag', null); if (gag && n < 6) await ui.say([{ who: 'bit', t: gag }]);
  if (n === 6) await ui.ending();
  return true;
};
/* 시험관에게 말 걸었을 때의 표준 흐름. 돌려주는 값: 'passed' | 'sim' | 'later' | 'done' */
flow.gate = async function (n) {
  const G = ST('gates.' + n, {}), npc = G.npc || FB.gateNpc[n], ids = simsOf(n), title = function (id) { return ST('sims.' + id + '.title', id); };
  const simBtns = function () { if (!simReady()) return []; return ids.length > 1 ? ids.map(function (id) { return { t: '🔬 ' + title(id), v: 'sim:' + id, cls: 'blue' }; }) : (ids.length ? [{ t: '🔬 가상 실험 하기', v: 'sim:' + ids[0], cls: 'blue' }] : []); };
  if (state.gatePassed(n)) {
    const v = await ui.say(G.done || [{ who: npc, t: '이미 통과한 관문이에요. 실험은 언제든 다시 해 볼 수 있어요.' }], { who: npc, buttons: simBtns().concat([{ t: '닫기', v: 'close', cls: 'ghost' }]) });
    if (v && String(v).indexOf('sim:') === 0) { await openSim(v.slice(4)); return 'sim'; }
    return 'done';
  }
  if (simsDone(n)) { await flow.pass(n); return 'passed'; }
  const v = await ui.say(G.intro || [{ who: npc, t: gateName(n) + '에 온 걸 환영해요. 실험을 해 보아요!' }], { who: npc, buttons: simBtns().concat([{ t: '✅ 실물로 해 봤어요', v: 'real', cls: 'green' }, { t: '나중에', v: 'later', cls: 'ghost' }]) });
  if (v && String(v).indexOf('sim:') === 0) {
    await openSim(v.slice(4));
    if (!state.gatePassed(n) && simsDone(n)) { await flow.pass(n); return 'passed'; }
    return 'sim';
  }
  if (v === 'real') {
    const lines = [];
    if (G.real && G.real.length) lines.push({ steps: G.real, title: '실물 실험 순서', t: '부스에서 이렇게 해 보았나요?' });
    if (G.safety) lines.push({ sign: '⚠ ' + G.safety });
    lines.push({ who: 'bit', t: '실물 실험을 다 해 보았나요?' });
    const ok = await ui.say(lines, { who: 'bit', buttons: [{ t: '아직이에요', v: 'no', cls: 'ghost' }, { t: '✅ 다 해 봤어요!', v: 'yes', cls: 'green' }] });
    if (ok === 'yes') { await flow.pass(n); return 'passed'; }
  }
  return 'later';
};
/* 갈림길 n 의 문(side 'L'|'R')을 눌렀을 때의 표준 흐름. 'ok' | 'wrong' | 'nocard' | 'cancel' | 'open'
   opt:{onOpen: async()=>문 여는 연출, think:{x,z,yaw}(다시 생각하는 방), back:{x,z,yaw}(돌아올 자리, 없으면 원래 자리)} */
flow.fork = async function (n, side, opt) {
  opt = opt || NOOPT;
  if (state.forkSolved(n)) return 'open';
  if (!state.hasCard(n)) { sfx('no'); await ui.say([{ who: 'bit', t: ST('common.needCard', '앞 관문 합격 카드가 필요해요') + '.' }]); return 'nocard'; }
  const F = ST('gates.' + n + '.fork', {}), right = state.forkCorrect(n) === side, label = right ? F.ok : F.no;
  const v = await ui.say([{ card: n, side: 'front', t: (label ? '「' + label + '」 앞이에요. ' : '') + '카드 수수께끼를 떠올려 보아요. 이 문으로 갈까요?' }], { who: 'bit', buttons: [{ t: '다시 볼래요', v: 'no', cls: 'ghost' }, { t: '🚪 이 문으로 갈래요', v: 'go', cls: 'blue' }] });
  if (v !== 'go') return 'cancel';
  if (right) {
    sfx('open'); if (opt.onOpen) { try { await opt.onOpen(); } catch (e) { console.error(e); } }
    await ui.card(n, 'flip'); state.solveFork(n);
    if (F.okLine) await ui.say(F.okLine, { who: 'bit' });
    return 'ok';
  }
  sfx('no');
  if (F.noLine) await ui.say(F.noLine, { who: 'bit' });
  if (F.rival) await ui.say([{ who: 'daechung', t: F.rival }]);
  const home = opt.back || { x: player.x, z: player.z, yaw: player.yaw };
  if (opt.think) { await ui.fade(420, 'out'); player.teleport(opt.think.x, opt.think.z, opt.think.yaw); HNR.tick(0.05); await ui.fade(420, 'in'); }
  await ui.say(ST('think.lines', [{ who: 'bit', t: '괜찮아요. 연구는 원래 틀리면서 하는 거예요.' }]).concat([{ card: n, side: 'front', t: '카드를 다시 읽어 드릴게요.' }, { who: 'bit', t: ST('think.back', '자, 문 밖으로 나가서 다시 골라 볼까요?') }]), { who: 'bit' });
  if (opt.think) { await ui.fade(420, 'out'); player.teleport(home.x, home.z, home.yaw); HNR.tick(0.05); await ui.fade(420, 'in'); }
  return 'wrong';
};

/* ═══════════ 통계(성능 예산 확인용) ═══════════ */
HNR.stats = function () {
  let meshes = 0, lines = 0, sprites = 0;
  if (scene) scene.traverse(function (o) { if (o.isMesh) meshes++; else if (o.isLine) lines++; else if (o.isSprite) sprites++; });
  const r = renderer ? renderer.info : { render: {}, memory: {} };
  return { meshes: meshes, lines: lines, sprites: sprites, calls: r.render.calls || 0, triangles: r.render.triangles || 0, geometries: r.memory.geometries || 0, textures: r.memory.textures || 0, walks: world.walks.length, blocks: world.blocks.length, interacts: world.interacts.length };
};

/* ═══════════ 시험 마당(HNR.map 이 없을 때 대신 만드는 평평한 월드) ═══════════ */
function buildYard() {
  const W = 1600, H = 1400, stat = P.group(0, 0, 0);
  P.with(stat, function () {
    P.stud(W + 3600, H + 3600, BRICK.grass, W / 2, H / 2, 0);
    P.stud(W, H, BRICK.floor, W / 2, H / 2, 2);
    P.wall(-11, -11, W + 11, -11); P.wall(-11, H + 11, W + 11, H + 11); P.wall(-11, -11, -11, H + 11); P.wall(W + 11, -11, W + 11, H + 11);
    props.checkpoint(800, 1240, { label: '출발' });
    props.checkpoint(1380, 240, { color: BRICK.green, label: '도착' });
    props.desk(260, 190); props.monitor(250, 186); props.chair(260, 232, { ry: Math.PI });
    props.cabinet(380, 170); props.crate(470, 190, { n: 2 }); props.plant(550, 180); props.cone(610, 220); props.extinguisher(660, 180); props.bin(700, 180);
    props.bench(860, 180); props.whiteboard(1040, 6, { title: 'HNR', sub: 'Tech Inc.' }); props.lampPost(1200, 150); props.signPost(1300, 420, '도착은 저쪽이에요');
    props.tapeLine(800, 1090, 700, 'x'); props.hazardStripe(800, 1120, 700, 'x'); props.cable(260, 190, 470, 330);
    P.poster('시험 마당', '지도 없이 여는 화면', { x: 180, z: 1.2, bg: '#0d69ac', fg: '#ffffff', w: 70 });
    [[-140, 200], [-160, 700], [-140, 1200], [W + 140, 300], [W + 160, 800], [W + 140, 1300], [400, -160], [1200, -160]].forEach(function (a) { props.tree(a[0], a[1]); });
    props.building(-520, 500, 360, 420, 300, { color: 0x8d6a4f }); props.building(W + 560, 700, 380, 520, 320, { color: 0x4d5b74 }); props.building(800, -620, 700, 460, 280, { color: 0x5c6b6b });
    props.road(800, H + 240, 3200, 'x'); props.fence(-11, H + 120, 600, H + 120); props.fence(1000, H + 120, W + 11, H + 120);
    P.part(120, 60, 120, BRICK.copper, 1380, 30, 900); P.part(120, 120, 60, BRICK.acrylic, 1380, 60, 1040, { opacity: 0.4 }); P.part(40, 40, 40, BRICK.gold, 1260, 20, 900);
  });
  P.bake(stat);
  props.lightBar(800, 700, 300, 'x');
  world.addWalk('yard', { x1: 30, x2: W - 30, z1: 30, z2: H - 30 });
  [[215, 305, 167, 213], [360, 400, 155, 185], [453, 490, 173, 207], [1320, 1440, 840, 960], [1320, 1440, 1010, 1070], [1240, 1280, 880, 920]].forEach(function (b) { world.addBlock({ x1: b[0], x2: b[1], z1: b[2], z2: b[3] }); });
  char.keys.forEach(function (k, i) { world.addNpc(k, 436 + i * 104, 780, { ry: 0 }); });
  world.addInteract({ id: 'yard-bit', x: 436, z: 780, r: 130, mesh: world.npcs.bit, label: '💬 비트에게 말 걸기', onUse: function () { return ui.say([{ who: 'bit', t: '여기는 시험 마당이에요, {name} 지원자님. 지도(map.js)가 아직 없어서 제가 대신 서 있어요.' }, { who: 'bit', t: '조이스틱으로 걷고, 화면을 밀어 둘러보아요.' }]); } });
  const door = props.door(800, 420, { label: '시험 문', w: 150 }); scene.add(door);
  world.addBlock({ x1: 711, x2: 889, z1: 408, z2: 432 }, function () { return !door.userData.isOpen(); });
  world.addInteract({ id: 'yard-door', x: 800, z: 470, r: 110, label: function () { return door.userData.isOpen() ? '🚪 문 닫기' : '🚪 문 열기'; }, onUse: function () { sfx('open'); door.userData.setOpen(!door.userData.isOpen()); } });
  world.addZone({ id: 'yard', rect: { x1: 0, x2: W, z1: 0, z2: H }, name: '시험 마당' });
  world.addZone({ id: 'yard-dark', rect: { x1: 1180, x2: W, z1: 780, z2: 1140 }, name: '어두운 구역(시험)', exposure: 0.4 });
  guide.set(function () { return { x: 1380, z: 240, label: '도착 지점' }; });
  HNR.yard = { door: door, W: W, H: H };
  return { x: 800, z: 1240, yaw: 0 };
}

/* ═══════════ boot · tick · 루프 ═══════════ */
let booted = false, started = false, lastNow = 0, qAcc = 0, qN = 0, qWarm = 0;
HNR.frame = 0; HNR.time = 0; HNR.paused = false;
/* lab.html 맨 끝에서 한 번 부른다 */
HNR.boot = function () {
  if (booted) return; booted = true;
  initUI();
  if (Q.fresh === '1') state.reset({ reload: false });
  if (AUTO) { HNR.S = loadS() || newS(Q.name || '테스트', AVS[0][0]); state.save(); start(false); return; }
  initEntry(start);
};
function start(first) {
  if (started) return; started = true;
  const S = HNR.S;
  if (Q.pass != null && Q.pass !== '') state.setPassed(parseInt(Q.pass, 10) || 0);
  try { initRenderer(); } catch (e) { console.error('[HNR] 렌더러를 만들지 못했어요', e); return; }
  buildBeacon();
  let spawn = null; const map = HNR.map;
  if (map && typeof map.build === 'function') {
    try { map.build(); } catch (e) { console.error('[HNR] map.build 오류', e); }
    try { spawn = (typeof map.spawnFor === 'function' && map.spawnFor(S)) || map.spawn || null; } catch (e) { console.error('[HNR] map.spawnFor 오류', e); }
  } else spawn = buildYard();
  if (HNR.sim && typeof HNR.sim.mountAll === 'function') { try { HNR.sim.mountAll(); } catch (e) { console.error('[HNR] sim.mountAll 오류', e); } }
  playerChar = char.make({ name: S.name, pants: S.avatar, coat: true }); playerChar.name = 'player'; scene.add(playerChar);
  spawn = spawn || { x: 0, z: 0, yaw: 0 };
  player.teleport(spawn.x, spawn.z, spawn.yaw || 0);
  if (Q.at) { const a = Q.at.split(',').map(Number); if (isFinite(a[0]) && isFinite(a[1])) { player.x = a[0]; player.z = a[1]; if (isFinite(a[2])) { player.yaw = a[2] * Math.PI / 180; faceAngle = faceTarget = player.yaw + Math.PI; } cam.snap = true; } }
  setView(VIEWS.indexOf(Q.view) >= 0 ? Q.view : S.view, true);
  initInput();
  hud.refresh();
  entryOpen = false; $('#enter').classList.add('gone'); document.body.classList.remove('pre');
  if (AUTO) hud.hideHint(); else setTimeout(hud.hideHint, 12000);
  HNR.tick(0);
  lastNow = performance.now(); requestAnimationFrame(loop);
  HNR.emit('start', { first: !!first });
  if (first && !AUTO) {
    const w = ST('welcome', null);
    if (w && !S.seen.welcome) { S.seen.welcome = true; state.save(); setTimeout(function () { ui.say(w, { who: 'bit', buttons: [{ t: '가 볼게요!', v: 'ok', cls: 'green' }] }).then(function () { HNR.emit('welcomed'); }); }, 450); }
  }
  const openSimParam = function () { if (Q.sim && HNR.sim && typeof HNR.sim.open === 'function') { try { const p = HNR.sim.open(Q.sim); if (p && p.catch) p.catch(function (e) { console.error('[HNR] sim.open 오류', e); }); } catch (e) { console.error('[HNR] sim.open 오류', e); } return true; } return false; };
  if (AUTO) {
    const fin = function () { for (let i = 0; i < 30; i++) HNR.tick(1 / 30, i < 29); document.title = 'READY'; if (Q.selftest === '1') HNR.selftest(); };
    if (openSimParam()) setTimeout(function () { for (let i = 0; i < 50; i++) HNR.tick(1 / 30, true); fin(); }, 80); else fin();
  } else openSimParam();
}
/* 한 프레임 진행: 트윈 → 입력·이동 → 월드 → 카메라 → 가이드 → 'tick' 이벤트 → 렌더.
   rAF 루프도 이 함수를 쓴다. 헤드리스 시험에서는 직접 여러 번 부른다. noRender=true 면 그리기만 건너뜀 */
HNR.tick = function (dt, noRender) {
  if (!started || !renderer) return;
  dt = clamp(+dt || 0, 0, 0.1); T += dt; HNR.time = T;
  updateTweens(dt);
  stepPlayer(dt);
  worldUpdate(dt);
  updateCamera(dt);
  guideUpdate(dt);
  HNR.emit('tick', dt, T);
  const target = fx.override != null ? fx.override : (fx.zone != null ? fx.zone : BASE_EXPOSURE), cur = renderer.toneMappingExposure;
  if (Math.abs(target - cur) >= 0.002) {
    const ex = cur + (target - cur) * (1 - Math.exp(-dt * 5)); renderer.toneMappingExposure = ex;
    const f = clamp(ex / BASE_EXPOSURE, 0.04, 1) ** 2;   // 어두운 구역에서는 하늘·안개도 같이 어두워진다
    skyDome.material.color.setScalar(f); scene.fog.color.set(SKY_HORIZON).convertSRGBToLinear().multiplyScalar(f).convertLinearToSRGB();
  }
  if (!noRender) { renderer.render(scene, camera); HNR.frame++; }
};
function loop(now) {
  requestAnimationFrame(loop);
  let dt = (now - lastNow) / 1000; lastNow = now;
  if (!(dt > 0)) return; if (dt > 0.1) dt = 0.1;
  if (!HNR.paused) HNR.tick(dt);
  // 느린 기기: 해상도 → 그림자 순으로 낮춘다
  if (AUTO || fx.quality <= 0) return;
  qWarm += dt; if (qWarm < 4) return;
  qAcc += dt; qN++;
  if (qAcc >= 3) {
    const fps = qN / qAcc; qAcc = 0; qN = 0;
    if (fps < 24) {
      fx.quality--;
      if (fx.quality === 1) { fx.pixelRatio = Math.max(1, fx.pixelRatio * 0.75); renderer.setPixelRatio(fx.pixelRatio); renderer.setSize(viewW, viewH); }
      else { sun.castShadow = false; if (fx.pixelRatio > 1) { fx.pixelRatio = 1; renderer.setPixelRatio(1); renderer.setSize(viewW, viewH); } }
    }
  }
}

/* ═══════════ 스모크 시험 ═══════════ */
HNR.selftest = async function () {
  const R = { ok: true, pass: 0, fail: [], checks: {}, stats: null };
  const chk = function (name, ok, info) { R.checks[name] = { ok: !!ok, info: info == null ? '' : String(info) }; if (ok) R.pass++; else { R.ok = false; R.fail.push(name); } };
  const step = function (n, render) { for (let i = 0; i < n; i++) HNR.tick(1 / 30, !(render && i === n - 1)); };
  const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  const drive = async function (p, picks) {   // 떠 있는 대화·카드를 자동으로 넘기며 p 가 끝나기를 기다린다
    let done = false, val; p.then(function (v) { done = true; val = v; }, function (e) { done = true; val = 'ERR:' + e; }); let pi = 0;
    for (let i = 0; i < 400 && !done; i++) { await sleep(25); if (cardState) { cardState.close(); continue; } if (dlgState) dlgState.choose(picks && pi < picks.length ? picks[pi++] : undefined); }
    return done ? val : 'TIMEOUT';
  };
  const keep = JSON.stringify(HNR.S), home = { x: player.x, z: player.z, yaw: player.yaw, view: VIEW }, prevGuide = guideFn, prevInstant = ui.instant;
  const dist = function (a) { return Math.hypot(player.x - a.x, player.z - a.z); };
  try {
    ui.instant = true;
    chk('boot', !!(scene && camera && renderer && renderer.domElement.width > 0 && HNR.S), renderer.domElement.width + 'x' + renderer.domElement.height);
    setView('fps', true);
    // 이동: 키보드
    let moved = 0, okYaw = home.yaw;
    for (let a = 0; a < 8 && moved < 60; a++) { player.teleport(home.x, home.z, home.yaw + a * Math.PI / 4); keys.KeyW = true; step(20); keys.KeyW = false; moved = dist(home); okYaw = home.yaw + a * Math.PI / 4; }
    chk('move.keys', moved > 60, 'd=' + moved.toFixed(0));
    // 이동: 조이스틱
    player.teleport(home.x, home.z, okYaw); input.setJoy(0, -1); step(20); input.setJoy(0, 0);
    chk('move.joystick', dist(home) > 60, 'd=' + dist(home).toFixed(0));
    // 벽: 여덟 방향으로 5초씩 밀어도 걷기 영역 밖으로 안 나간다
    let out = 0, n = 0, far = 0;
    for (let a = 0; a < 8; a++) { player.teleport(home.x, home.z, a * Math.PI / 4); keys.KeyW = true; for (let i = 0; i < 150; i++) { HNR.tick(1 / 30, true); n++; if (!world.allowed(player.x, player.z)) out++; } keys.KeyW = false; far = Math.max(far, dist(home)); }
    chk('walls', out === 0 && !world.allowed(-99999, -99999) && far < 20000, 'out=' + out + '/' + n + ' far=' + far.toFixed(0));
    // 길 찾아 걷기
    player.teleport(home.x, home.z, okYaw); let tgt = null;
    for (let a = 0; a < 16 && !tgt; a++) { const x = home.x + Math.sin(a * Math.PI / 8) * 180, z = home.z + Math.cos(a * Math.PI / 8) * 180; if (world.allowed(x, z) && world.clear(home.x, home.z, x, z)) tgt = { x: x, z: z }; }
    if (tgt) { let arrived = null; player.walkTo(tgt.x, tgt.z).then(function (v) { arrived = v; }); step(90); await sleep(0); chk('move.walkTo', arrived === true && dist(tgt) < 16, 'd=' + dist(tgt).toFixed(1)); }
    else chk('move.walkTo', false, '주변에 걸어갈 빈 곳이 없음');
    // 화면 탭 → 걸어가기(실제 포인터 이벤트)
    if (tgt) {
      player.teleport(home.x, home.z, 0); player.face(tgt.x, tgt.z); step(2, true);
      const el = renderer.domElement, r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * 0.8;
      el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 71, clientX: cx, clientY: cy, bubbles: true })); el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 71, clientX: cx, clientY: cy, bubbles: true }));
      const q = walkQueue.length; step(45); chk('move.tap', q > 0 && dist(home) > 40, 'queue=' + q + ' d=' + dist(home).toFixed(0));
    }
    // 시점
    player.teleport(home.x, home.z, okYaw);
    setView('tps', true); step(3, true); const y1 = camera.position.y; setView('top', true); step(3, true); const y2 = camera.position.y; setView('fps', true); step(3, true); const y3 = camera.position.y;
    chk('view', y2 > y1 && y1 > y3 && Math.abs(y3 - PCFG.eye) < 8, 'fps=' + y3.toFixed(0) + ' tps=' + y1.toFixed(0) + ' top=' + y2.toFixed(0));
    // 상호작용
    let used = 0; world.addInteract({ id: '__t', x: player.x, z: player.z, r: 60, label: '시험 말 걸기', onUse: function () { used++; } });
    const saveI = world.interacts; world.interacts = saveI.filter(function (i) { return i.id === '__t'; }); step(12);
    const shown = $('#talk').classList.contains('show') && $('#talkBtn').textContent === '시험 말 걸기'; $('#talkBtn').click();
    world.interacts = saveI; world.removeInteract('__t'); step(12);
    chk('interact', shown && used === 1, 'shown=' + shown + ' used=' + used);
    // 트리거 · 구역 밝기
    let trig = 0; const rc = { x1: player.x - 60, x2: player.x + 60, z1: player.z - 60, z2: player.z + 60 };
    world.addTrigger({ id: '__t', rect: rc, once: true, onEnter: function () { trig++; } }); world.addZone({ id: '__z', rect: rc, name: '시험 구역', exposure: 0.5 }); step(50);
    chk('trigger', trig === 1 && world.triggers.every(function (t) { return t.id !== '__t'; }), 'n=' + trig);
    chk('zone', Math.abs(renderer.toneMappingExposure - 0.5) < 0.02 && $('#zone').textContent.indexOf('시험 구역') >= 0, 'exp=' + renderer.toneMappingExposure.toFixed(3));
    world.removeZone('__z'); fx.setExposure(0.8); step(50); const e8 = renderer.toneMappingExposure; fx.setExposure(null); step(50);
    chk('fx.setExposure', Math.abs(e8 - 0.8) < 0.02, 'exp=' + e8.toFixed(3));
    // 가이드
    guide.set(function () { return { x: home.x + 300, z: home.z, label: '시험 목표' }; }); step(10, true);
    chk('guide', beacon.visible && Math.abs(beacon.position.x - (home.x + 300)) < 1 && $('#guide').classList.contains('show') && $('#guideLbl').textContent.indexOf('시험 목표') >= 0, 'beacon=' + beacon.visible);
    guideFn = prevGuide; guideT = 9; step(8);
    // 대화창
    const sp = ui.say(['첫 줄이에요, {name}!', { who: 'gatebot', t: '둘째 줄.' }], { buttons: [{ t: '가', v: 'a' }, { t: '나', v: 'b' }] });
    await sleep(40); const dOpen = $('#dlg').classList.contains('show'), nm1 = $('#dlgName').textContent, tx1 = $('#dlgTxt').textContent;
    $('#dlgBtns .hbtn').click(); await sleep(20); const nm2 = $('#dlgName').textContent; const bb = $('#dlgBtns [data-v="b"]'); if (bb) bb.click(); const sv = await sp;
    chk('ui.say', dOpen && sv === 'b' && nm1 !== nm2 && tx1.indexOf(HNR.S.name) >= 0 && !$('#dlg').classList.contains('show'), nm1 + '→' + nm2 + ' v=' + sv);
    // 관문 통과 → 배지 · 카드
    state.setPassed(0); const pg = state.passGate(1); await sleep(40);
    const cOpen = $('#cardPop').classList.contains('show'), bGot = !!document.querySelector('#badges .bd.got[data-n="1"]'), tN = $('#toasts').children.length, rate = $('#rateN').textContent; $('#cardBtn').click(); const first = await pg;
    chk('state.passGate', first === true && state.gatePassed(1) && state.hasCard(1) && cOpen && bGot && tN > 0 && rate === '17%', 'card=' + cOpen + ' badge=' + bGot + ' toast=' + tN + ' rate=' + rate);
    const cf = ui.card(1, 'flip'); await sleep(160); const flipped = $('#cardBig').classList.contains('flipped'); $('#cardBtn').click(); await cf; state.solveFork(1);
    chk('state.solveFork', flipped && state.forkSolved(1) && /^[LR]$/.test(state.forkCorrect(1)), 'flip=' + flipped);
    ui.wallet(); const wn = document.querySelectorAll('#walletGrid .pcard').length, wb = document.querySelectorAll('#walletGrid .pcard.flipped').length; ui.closeWallet();
    chk('ui.wallet', wn === 5 && wb === 1, 'cards=' + wn + ' back=' + wb);
    // 진행 도우미(관문 대화 · 갈림길)
    state.setPassed(0);
    chk('flow.fork.nocard', await drive(flow.fork(1, 'L')) === 'nocard');
    chk('flow.gate.real', await drive(flow.gate(1), ['real', 'yes']) === 'passed' && state.gatePassed(1) && state.hasCard(1));
    const right = state.forkCorrect(1), wrong = right === 'L' ? 'R' : 'L'; let opened = 0;
    chk('flow.fork.wrong', await drive(flow.fork(1, wrong, { think: { x: home.x, z: home.z, yaw: 0 } }), ['go']) === 'wrong' && !state.forkSolved(1) && !fading);
    chk('flow.fork.ok', await drive(flow.fork(1, right, { onOpen: function () { opened++; } }), ['go']) === 'ok' && state.forkSolved(1) && opened === 1);
    // 페이드
    const fp = ui.fade(120); await fp; const op1 = $('#fade').style.opacity; await sleep(520); const op0 = $('#fade').style.opacity;
    chk('ui.fade', op1 === '1' && op0 === '0' && !fading, op1 + '→' + op0);
    // 엔딩(사원증)
    state.setPassed(6); const pe = ui.ending(); await sleep(40); const eo = $('#ending').classList.contains('show'), png = $('#idCanvas').toDataURL('image/png').length; ui.closeEnding(); await pe;
    chk('ui.ending', eo && png > 20000 && !$('#ending').classList.contains('show'), 'png=' + png);
    // 시뮬 모드 훅
    player.teleport(home.x, home.z, okYaw); step(2);
    cam.override({ pos: [home.x + 500, 300, home.z], look: [home.x + 500, 0, home.z - 100] }); step(60, true); const od = camera.position.distanceTo(new V3(home.x + 500, 300, home.z)), hidden = playerChar.visible === false;
    cam.override(null); step(60, true); const bd = Math.hypot(camera.position.x - player.x, camera.position.z - player.z);
    chk('cam.override', od < 2 && bd < 2 && hidden, 'to=' + od.toFixed(2) + ' back=' + bd.toFixed(2));
    cam.inset({ right: 340 }); step(40, true); const vo = camera.view && camera.view.enabled ? camera.view.offsetX : 0; cam.inset(null); step(40, true);
    chk('cam.inset', Math.abs(vo - 170) < 2 && !(camera.view && camera.view.enabled), 'offsetX=' + vo);
    player.lock(true); const l0 = { x: player.x, z: player.z }; keys.KeyW = true; step(10); keys.KeyW = false; const lm = dist(l0); player.lock(false);
    chk('player.lock', lm < 0.001, 'd=' + lm);
    hud.hide(true); const h1 = document.body.classList.contains('hud-off'); hud.hide(false); hud.sim(true); const h2 = getComputedStyle($('#simPanel')).display !== 'none'; hud.sim(false);
    chk('hud.hide', h1 && !document.body.classList.contains('hud-off') && h2 && getComputedStyle($('#simPanel')).display === 'none');
    let cap = null; input.capture({ down: function (e) { cap = { x: e.ndc.x, y: e.ndc.y, len: e.ray.direction.length(), oy: e.ray.origin.y }; } });
    const el2 = renderer.domElement, r2 = el2.getBoundingClientRect(); step(1, true);
    el2.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 72, clientX: r2.left + r2.width / 2, clientY: r2.top + r2.height / 2, bubbles: true })); el2.dispatchEvent(new PointerEvent('pointerup', { pointerId: 72, clientX: r2.left + r2.width / 2, clientY: r2.top + r2.height / 2, bubbles: true }));
    input.capture(null);
    chk('input.capture', !!cap && Math.abs(cap.x) < 0.01 && Math.abs(cap.y) < 0.01 && Math.abs(cap.len - 1) < 0.01, cap ? JSON.stringify(cap) : 'no event');
    // 파츠 · 소품 · NPC
    const tg = P.group(0, -6000, 0); P.with(tg, function () { for (let i = 0; i < 12; i++) P.part(20, 20, 20, i % 2 ? BRICK.red : BRICK.blue, i * 30, 10, 0); });
    const bk = P.bake(tg); scene.remove(tg); chk('P.bake', bk.before === 12 && bk.after === 3, bk.before + '→' + bk.after);
    const pgp = P.group(0, -6000, 0); let pc = 0;
    P.with(pgp, function () {
      ['desk', 'monitor', 'chair', 'cabinet', 'crate', 'plant', 'cone', 'extinguisher', 'bin', 'bench', 'lampPost', 'tree', 'checkpoint', 'whiteboard', 'door'].forEach(function (k) { if (props[k](pc * 60, 0).isGroup) pc++; });
      if (props.cable(0, 0, 100, 100).isGroup) pc++; if (props.fence(0, 0, 200, 0).isGroup) pc++; if (props.tapeLine(0, 0, 100, 'x').isGroup) pc++; if (props.hazardStripe(0, 0, 100, 'z').isGroup) pc++;
      if (props.lightBar(0, 0, 100, 'x').isGroup) pc++; if (props.building(0, 0, 200, 200, 200).isGroup) pc++; if (props.road(0, 0, 300, 'x').isGroup) pc++; if (props.cloud(0, 0, 0).isGroup) pc++; if (props.signPost(0, 0, '시험').isGroup) pc++;
      P.cyl(5, 5, 10, BRICK.copper, 0, 0, 0); P.ball(5, BRICK.gold, 0, 0, 0); P.torus(10, 2, BRICK.red, 0, 0, 0); P.plane(10, 10, BRICK.blue, 0, 0); P.stud(64, 64, BRICK.green, 0, 0); P.wall(0, 0, 100, 0); P.text('글자'); P.poster('제목', '설명'); P.box(1, 1, 1, BRICK.acrylic, 0, 0, 0, { opacity: 0.4 });
    });
    scene.remove(pgp); chk('props', pc === 24, pc + '/24');
    const npcOk = char.keys.length === 8 && char.keys.every(function (k) { const g = char.npc(k); char.animate(g, 1, false); char.portrait($('#dlgFace'), k); return g.isGroup && g.children.length > 2 && !!g.userData.tag; });
    chk('char.npc', npcOk, char.keys.join(','));
    let tk = 0; const tp = HNR.tween(0.2, function (k) { tk = k; }); step(10); await tp; chk('tween', tk === 1);
    // 성능 예산
    player.teleport(home.x, home.z, home.yaw); step(3, true); const st = HNR.stats(); R.stats = st;
    chk('perf.budget', st.meshes <= 1800 && st.calls <= 700, 'meshes=' + st.meshes + ' calls=' + st.calls + ' tris=' + st.triangles);
    chk('errors', HNR._errors.length === 0, HNR._errors.join(' / '));
  } catch (e) { chk('exception', false, String((e && e.stack) || e)); }
  // 원래대로
  try {
    ui.instant = prevInstant; for (const k in keys) keys[k] = false; input.setJoy(0, 0); input.capture(null); player.lock(false); fx.setExposure(null); cam.override(null, { instant: true }); cam.inset(null);
    if (cardState) cardState.close(); if (walletOpen) ui.closeWallet(); if (endingRes) ui.closeEnding();
    HNR.S = JSON.parse(keep); state.save(); HNR.emit('state', { type: 'restore' });
    guideFn = prevGuide; player.teleport(home.x, home.z, home.yaw); setView(home.view, true); const tb = $('#toasts'); if (tb) tb.innerHTML = ''; step(8, true);
  } catch (e) { chk('restore', false, String(e)); }
  const out = $('#test-out'); if (out) out.textContent = JSON.stringify(R, null, 1);
  document.title = 'TEST:' + JSON.stringify({ ok: R.ok, pass: R.pass, fail: R.fail });
  return R;
};
})();
