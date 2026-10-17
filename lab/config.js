/* ═══════════════════════════════════════════════════════════════
   HNR Tech 3D 연구소 v4 — config.js
   부스에서 바꿀 값은 전부 여기 한 곳에 둔다. (core 담당)
   ═══════════════════════════════════════════════════════════════ */
(function (root) {
  var HNR = root.HNR = root.HNR || {};

  HNR.CONFIG = {
    version: '4.0.0',
    updated: '2026-10-05',

    /* 세션 저장 키(localStorage). 판이 바뀌면 숫자를 올린다. */
    sessionKey: 'hnr.lab.v4',

    /* 관문 4 갈림길(황금 나침반).
       리허설에서 실물 실험대 나침반 N극이 코일 "반대쪽"을 가리키면 true,
       코일 "쪽"을 가리키면 false 로 바꾼다. (스토리라인 6절) */
    compassPointsAway: true,

    /* 관문 6 · 1비트 기억 회로(원리 모형의 예시값, SI 단위) */
    g6: {
      leakOhm: 100e3,   // 누설을 나타내는 등가 저항(실물 측정값 아님) → τ = R·C = 100 s
      capF: 1e-3,       // 축전기 1 mF
      battV: 3.0,       // 건전지 3.0 V
      ledVf: 1.9,       // 단순화한 LED 순방향 전압(실물의 고정 경계 아님)
      readOhm: 220,     // 읽기 저항
      writeTau: 0.01    // 쓰기 시간 상수(s)
    },

    /* 플레이어 */
    player: { speed: 330, radius: 14, eye: 126 },
    view: 'fps',          // 처음 시점: 'fps' | 'tps' | 'top'

    /* 화면 */
    exposure: 1.05,       // 기본 톤매핑 노출
    units: { perMeter: 60 },   // 거리 표시용(가이드 화살표 "12 m")

    debug: false
  };
})(typeof window !== 'undefined' ? window : globalThis);
