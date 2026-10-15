/* HNR · 빛 복구 실험. 거리/밝기는 측정값이 아닌 관찰용 개념 모형이다.
 * 형광등은 눕힌 채 관의 긴 옆면을 세워 둔 플라즈마볼에 가까이한다.
 * 실제 발광은 장치·관·손 위치·주변 물체에 따라 달라진다.
 */
(function () {
  'use strict';
  const H = window.HNR = window.HNR || {};
  const clamp = function (value) {
    value = Number(value);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
  };
  function evaluate(distance, powered) {
    const d = clamp(distance);
    // A smooth monotonic visual mapping, not an electric-field law or a lux scale.
    const brightness = powered === false ? 0 : Math.pow(1 - d, 2.2);
    return {
      distance: d,
      brightness: brightness,
      position: d <= 0.2 ? 'near' : d >= 0.8 ? 'far' : 'between',
      lit: brightness >= 0.55,
      label: brightness >= 0.55 ? '밝게 켜졌어요' : brightness > 0.08 ? '빛이 약해졌어요' : '거의 보이지 않아요'
    };
  }
  function create(distance) {
    return { distance: clamp(distance == null ? 1 : distance), nearSeen: false, farSeen: false };
  }
  // Observations are recorded only after a visitor moves the tube or chooses a position.
  function observe(state, distance) {
    const result = evaluate(distance);
    const next = {
      distance: result.distance,
      nearSeen: !!state.nearSeen || result.position === 'near',
      farSeen: !!state.farSeen || result.position === 'far'
    };
    next.compared = next.nearSeen && next.farSeen;
    next.restored = next.compared && result.lit;
    return next;
  }
  H.models = H.models || {};
  H.models.g3 = Object.freeze({
    version: 'distance-1',
    evaluate: evaluate,
    create: create,
    observe: observe,
    near: 0,
    far: 1,
    // Geometry units belong to the game, not centimetres of a real apparatus.
    tubeZ: function (distance) { return -13 + clamp(distance) * 150; },
    distanceAtZ: function (z) { return clamp((Number(z) + 13) / 150); }
  });
})();
