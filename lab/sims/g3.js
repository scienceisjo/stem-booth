/* HNR · 암실의 빛 관찰: 가까이/멀리 비교 후 형광등 켜기.
 * Standalone g3 device; all coordinates are local to the existing map anchor.
 */
(function () {
  'use strict';
  const H = window.HNR, T = window.THREE;
  if (!H || !H.sim || !T || !H.models || !H.models.g3) return;
  const M = H.models.g3, PI = Math.PI;
  const INK = 0x15345c, BLUE = 0x0066cc, PALE = 0xe5f1ff;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TUBE_OFF = new T.Color(0x6382a3).convertSRGBToLinear();
  const TUBE_ON = new T.Color(0xffe25a).convertSRGBToLinear();

  function warmSpill() {
    // A soft pool of reflected light on the bench, not an electric-field drawing.
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const paint = canvas.getContext('2d'), gradient = paint.createRadialGradient(64, 64, 4, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,211,64,.9)');
    gradient.addColorStop(.38, 'rgba(255,192,38,.58)');
    gradient.addColorStop(1, 'rgba(255,177,22,0)');
    paint.fillStyle = gradient; paint.fillRect(0, 0, 128, 128);
    const material = new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,opacity:0,depthWrite:false,toneMapped:false});
    const mesh = new T.Mesh(new T.PlaneGeometry(354, 96), material);
    mesh.name = 'g3-warm-bench-spill'; mesh.rotation.x = -PI / 2; mesh.position.y = 88.15;
    mesh.raycast = function () {}; return mesh;
  }

  function syncRoom(ctx) {
    const lit=!!(H.S?.seen?.['g3-room-light']||H.S?.journey?.activities?.g3?.showObserved),zone=H.world.zones.find(z=>z.id==='room3');
    ctx.device.roomLit=lit;
    if(zone){zone.exposure=lit?1.05:.42;if(H.world.zone===zone)H.fx.zone=zone.exposure;}
    ctx.setExposure(lit?1.05:.42);
  }
  function lightRoom(ctx) {
    if(!H.S)return;
    H.S.seen=H.S.seen||{};
    if(!H.S.seen['g3-room-light']){H.S.seen['g3-room-light']=true;H.state.save();}
    syncRoom(ctx);
  }

  function showResult(ctx, record) {
    const d = ctx.device;
    if (record) {
      d.state = M.observe(d.state, d.distance);
      if (d.state.compared) ctx.task('compare');
      if (d.state.restored) ctx.task('light');
    }
    const value = M.evaluate(d.distance);
    d.tube.position.z = M.tubeZ(d.distance);
    d.brightness = value.brightness; d.lit = value.lit;
    const reveal = d.reveal || 0;
    d.light.material.emissiveIntensity = 0.02 + value.brightness * 1.8 + reveal * .5;
    d.light.material.color.copy(TUBE_OFF).lerp(TUBE_ON, Math.min(1, value.brightness * .4 + reveal * .6));
    d.glow.material.opacity = value.brightness * .3 + reveal * .1;
    d.outerGlow.material.opacity = value.brightness * .1 + reveal * .055;
    d.spill.material.opacity = value.brightness * .34 + reveal * .16;
    if (d.demoRunning && d.demoMomentLit !== value.lit) {
      d.demoMomentLit = value.lit;
      H.emit('device:moment', {id:'g3', phase:value.lit ? 'lit' : 'dim'});
    }
    d.statusNear.visible = value.position === 'near';
    d.statusFar.visible = value.position !== 'near';
    if(record&&value.lit)lightRoom(ctx);
    if (d.ui) {
      d.ui.reading.set(value.label);
      d.ui.position.set(value.position === 'near' ? '플라즈마볼 가까이' : value.position === 'far' ? '플라즈마볼 멀리' : '사이를 이동 중');
      d.ui.near.el.classList.toggle('green', value.position === 'near');
      d.ui.near.el.setAttribute('aria-pressed', String(value.position === 'near'));
      d.ui.far.el.classList.toggle('green', value.position === 'far');
      d.ui.far.el.setAttribute('aria-pressed', String(value.position === 'far'));
      d.ui.observed.textContent = '관찰 기록 · 가까이 ' + (d.state.nearSeen ? '✓' : '—') + ' / 멀리 ' + (d.state.farSeen ? '✓' : '—');
    }
  }
  function setDistance(ctx, distance, record) {
    ctx.device.distance = M.evaluate(distance).distance;
    showResult(ctx, record !== false);
  }
  function line(points, material, parent) {
    const geometry = new T.BufferGeometry().setFromPoints(points);
    const object = new T.Line(geometry, material);
    object.raycast = function () {};
    parent.add(object);
    return object;
  }

  H.sim.register('g3', {
    gate: 3,
    title: '형광등 켜기 · 플라즈마볼과 형광등',
    lead: '형광등을 가까이, 멀리 놓아 보고 전선 없이 불이 켜지는 자리를 찾아요.',
    size: { w: 600, d: 420, h: 280 },
    camera: { pos: [450, 400, 900], look: [0, 145, 0], fov: 48 },
    tasks: [
      { id: 'compare', text: '가까이와 멀리, 두 자리에서 빛 비교하기' },
      { id: 'light', text: '불이 켜지는 자리에 형광등 두기' }
    ],
    build: function (ctx) {
      const P = ctx.P;
      const d = ctx.device = { distance: 1, state: M.create(1), ui: null, streams: [], reveal: 0, brightness: 0, lit: false };
      ctx.root.userData.g3Equipment = 'upright globe / horizontal tube long side';

      // White laboratory bench. Device and rail remain inside the 640×440 reservation.
      P.box(540, 12, 380, 0xffffff, 0, 82, 0);
      P.box(540, 5, 18, BLUE, 0, 75, 181);
      [[-240, -160], [240, -160], [-240, 160], [240, 160]].forEach(function (p) {
        P.box(16, 74, 16, INK, p[0], 37, p[1]);
      });
      P.text('HNR Tech Inc. · LIGHT LAB', { x: 0, y: 52, z: 197, w: 240, bg: '#ffffff', color: '#15345c', stroke: '#0066cc' });

      // Plasma globe is upright on its own powered base. It never changes orientation.
      P.cyl(50, 58, 21, INK, -90, 99, -85, { seg: 32 });
      P.cyl(26, 34, 12, BLUE, -90, 115, -85, { seg: 24 });
      P.cyl(4, 4, 48, 0x394b77, -90, 143, -85, { seg: 12 });
      P.ball(11, 0xb56cff, -90, 170, -85, { seg: 20, emissive: 0xa44aff, emissiveIntensity: 0.75, shadow: false });
      const glass = P.ball(60, 0xa9b7ff, -90, 170, -85, { seg: 36, opacity: 0.26, depthWrite: false, shadow: false });
      glass.name = 'g3-plasma-globe';
      P.torus(29, 2.3, 0xadc6ef, -90, 119, -85, { rx: PI / 2, seg: 32, shadow: false });
      P.box(10, 4, 7, 0x55f2dd, -90, 106, -31, { emissive: 0x55f2dd, emissiveIntensity: 0.65, shadow: false });
      // A visible power lead supplies the globe, but no wire joins it to the tube.
      const wireMat = new T.LineBasicMaterial({ color: INK });
      line([new T.Vector3(-90, 92, -138), new T.Vector3(-90, 91, -166), new T.Vector3(-216, 91, -166)], wireMat, ctx.root);
      P.box(29, 9, 19, INK, -225, 93, -166);

      const streamMat = new T.LineBasicMaterial({ color: 0xf2b5ff, transparent: true, opacity: 0.9, depthWrite: false });
      const filamentMat = new T.MeshBasicMaterial({ color: 0xe58dff });
      for (let i = 0; i < 8; i++) {
        const a = i * PI * 2 / 8, elevation = (i % 3 - 1) * 0.43;
        const direction = new T.Vector3(Math.cos(a) * Math.cos(elevation), Math.sin(elevation), Math.sin(a) * Math.cos(elevation));
        const points = [];
        for (let j = 0; j <= 5; j++) {
          const p = new T.Vector3(-90, 170, -85).addScaledVector(direction, j * 11);
          if (j > 0 && j < 5) p.y += Math.sin(i * 2 + j * 1.6) * 4;
          points.push(p);
        }
        const filament = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), 14, 1.1, 5, false), filamentMat);
        filament.raycast = function () {};
        ctx.root.add(filament);
        d.streams.push({ line: line(points, streamMat, ctx.root), direction: direction, phase: i });
      }

      // Tube moves in depth with its long side parallel to the globe. Rails clarify the motion.
      [-150, 150].forEach(function (x) { P.box(8, 4, 175, PALE, x, 91, 58); });
      P.text('가까이', { x: 236, y: 103, z: -13, h: 23, bg: '#e5f1ff', color: '#15345c' });
      P.text('멀리', { x: 236, y: 103, z: 137, h: 23, bg: '#ffffff', color: '#15345c' });
      d.tube = new T.Group();
      d.tube.name = 'g3-tube-carriage';
      d.tube.userData.dynamic = true;
      ctx.root.add(d.tube);
      H.P.with(d.tube, function () {
        const Q = H.P;
        [-150, 150].forEach(function (x) {
          Q.box(28, 6, 26, BLUE, x, 95, 0);
          Q.box(5, 65, 5, 0x7c9dc2, x, 128, 0);
          Q.box(21, 7, 20, BLUE, x, 163, 0);
        });
        d.light = Q.cyl(6, 6, 300, 0xb6cedf, 0, 172, 0, { rz: PI / 2, seg: 24, unique: true, emissive: 0xffd943, emissiveIntensity: 0.02, shadow: false });
        d.light.name = 'g3-fluorescent-tube';
        d.glow = Q.cyl(12, 12, 298, 0xffdf4b, 0, 172, 0, { rz: PI / 2, seg: 24, unique: true, opacity: 0, basic: true, depthWrite: false, shadow: false });
        d.glow.name = 'g3-tube-inner-halo'; d.glow.material.toneMapped = false; d.glow.raycast = function () {};
        d.outerGlow = Q.cyl(23, 23, 296, 0xffc938, 0, 172, 0, { rz: PI / 2, seg: 24, unique: true, opacity: 0, basic: true, depthWrite: false, shadow: false });
        d.outerGlow.name = 'g3-tube-outer-halo'; d.outerGlow.material.toneMapped = false; d.outerGlow.raycast = function () {};
        d.spill = warmSpill(); d.tube.add(d.spill);
        [-154, 154].forEach(function (x) { Q.cyl(7, 7, 11, 0x7894b0, x, 172, 0, { rz: PI / 2, seg: 20 }); });
        d.statusNear = Q.text('형광등 · 불이 켜졌어요', { x: 0, y: 207, z: 0, h: 24, bg: '#ffffff', color: '#0056a6', stroke: '#0066cc' });
        d.statusFar = Q.text('형광등 · 거리를 바꿔 보아요', { x: 0, y: 207, z: 0, h: 24, bg: '#ffffff', color: '#15345c', stroke: '#0066cc' });
      });
      let dragOffset = 0;
      ctx.drag(d.light, {
        plane: 'xz', at: [0, 172, 0],
        onStart: function (p) { dragOffset = p ? d.tube.position.z - p.z : 0; },
        onMove: function (p) { setDistance(ctx, M.distanceAtZ(p.z + dragOffset)); },
        onEnd: function () { showResult(ctx, true); }
      });
      // Public device action supports accessibility controls and integration checks.
      d.moveTo = function (distance) { setDistance(ctx, distance); };
      d.demoDuration=12.4;d.demoView={pos:[450,400,900],look:[0,145,0],fov:48};
      d.demo=function(){
        if(d.demoRunning)return d.demoPromise;
        d.demoBefore={distance:d.distance,state:JSON.parse(JSON.stringify(d.state)),exposure:H.fx.override};
        d.demoTime=0;d.demoMomentLit=false;d.reveal=0;d.demoRunning=true;d.demoPromise=new Promise(resolve=>{d.demoResolve=resolve;});
        d.distance=1;d.state=M.observe(d.state,1);showResult(ctx,false);H.fx.setExposure(.28);
        return d.demoPromise;
      };
      d.finishDemo=function(ok){
        if(!d.demoRunning)return;
        d.demoRunning=false;
        if(ok){d.reveal=1;setDistance(ctx,0,true);H.emit('device:demo',{id:'g3',completed:true});}
        else{d.distance=d.demoBefore.distance;d.state=d.demoBefore.state;d.reveal=M.evaluate(d.distance).lit?1:0;showResult(ctx,false);}
        d.demoMomentLit=null;
        H.fx.setExposure(d.demoBefore.exposure);
        const resolve=d.demoResolve;d.demoResolve=null;if(resolve)resolve(!!ok);
      };
      d.stopDemo=function(){d.finishDemo(false);};
      H.on('state',()=>syncRoom(ctx));syncRoom(ctx);
      showResult(ctx, false);
    },
    enter: function (ctx) {
      const ui = ctx.ui, d = ctx.device;
      ui.note('<b>전선 없이 형광등 켜기</b><br>플라즈마볼은 켜져 있어요. 형광등을 놓을 자리를 찾아주세요.');
      ui.predict('형광등을 어디에 놓으면 불이 잘 켜질까요?', ['플라즈마볼 가까이', '플라즈마볼 멀리'], { key: 'distance-v1' });
      let near, far;
      ui.row(function () {
        near = ui.button('가까이 가져가기', function () { setDistance(ctx, 0); }, { cls: 'blue' });
        far = ui.button('멀리 가져가기', function () { setDistance(ctx, 1); }, { cls: 'blue' });
      });
      const position = ui.readout('형광등 위치', '');
      const reading = ui.readout('빛 관찰', '');
      const observed = ui.note('');
      d.ui = { near: near, far: far, position: position, reading: reading, observed: observed };
      ui.note('화면 속 형광등을 끌어도 움직여요. 관을 눕힌 채 긴 옆면과 볼 사이의 거리를 바꾸세요.');
      ui.about('이 장치는 <b>거리의 차이</b>를 알아보는 개념 모형이에요. 화면의 거리와 밝기는 실제 측정값이 아니에요. 실제로는 플라즈마볼과 형광등의 종류, 손으로 잡은 위치, 주변 물체에 따라서 빛의 밝기와 켜지는 구간이 달라져요. 여기서는 관의 방향과 손 위치를 같게 둔 것으로 생각해요.');
      showResult(ctx, false);
    },
    exit: function (ctx) { ctx.device.ui = null; },
    update: function (ctx, dt, time, active) {
      const d=ctx.device;
      if(d.demoRunning){
        d.demoTime+=Math.min(dt,.1);const t=d.demoTime,ease=u=>{u=Math.max(0,Math.min(1,u));return u*u*(3-2*u);};
        d.distance=t<1.2?1:t<4.2?1-ease((t-1.2)/3):t<6.2?0:t<8.2?ease((t-6.2)/2):t<9.2?1:t<11.2?1-ease((t-9.2)/2):0;
        const value=M.evaluate(d.distance),target=value.lit?1:0;
        d.reveal=reduced?target:d.reveal+(target-d.reveal)*(1-Math.exp(-Math.max(0,dt)*5));
        showResult(ctx,false);
        // The camera remains still; only the tube and room lighting reveal the result.
        H.fx.setExposure(.28+d.reveal*.84);
        if(t>=d.demoDuration)d.finishDemo(true);
      } else {
        const target=M.evaluate(d.distance).lit?1:0;
        if(Math.abs(d.reveal-target)>.001){d.reveal=reduced?target:d.reveal+(target-d.reveal)*(1-Math.exp(-Math.max(0,dt)*5));showResult(ctx,false);}
      }
      if (!active || reduced) return;
      // Slow shape drift only: no flashing or rapidly modulated lamp brightness.
      ctx.device.streams.forEach(function (stream) {
        const attr = stream.line.geometry.attributes.position;
        for (let j = 1; j < 5; j++) {
          const r = j * 11, bend = Math.sin(time * 0.7 + stream.phase + j * 1.3) * 3;
          attr.setXYZ(j, -90 + stream.direction.x * r + bend * stream.direction.z,
            170 + stream.direction.y * r + Math.cos(time * 0.5 + j + stream.phase) * 2,
            -85 + stream.direction.z * r - bend * stream.direction.x);
        }
        attr.needsUpdate = true;
      });
    }
  });
})();
