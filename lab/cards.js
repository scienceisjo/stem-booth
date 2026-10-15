/* HNR research cards. Artwork is an equipment concept, not a scientific diagram. */
(function () {
  'use strict';
  var H = window.HNR = window.HNR || {};
  var ROOT = new URL('cards/', document.currentScript.src).href;
  var DATA = {
    1: { place: '정문 보안 게이트', title: '전류가 흐르는 길', topic: '전류와 회로', alt: '에너지스틱 장비 콘셉트 이미지' },
    2: { place: '클린룸', title: '닿지 않아도 끌려와요', topic: '정전기와 전하', alt: '알루미늄 캔과 플라스틱 빨대 장비 콘셉트 이미지' },
    3: { place: '암실', title: '전기장이 깨우는 빛', topic: '전기장과 빛', alt: '세워진 플라즈마볼 옆에 수평으로 놓인 형광등 장비 콘셉트 이미지' },
    4: { place: '황금 나침반', title: '전류가 바늘을 돌려요', topic: '전류와 자기장', alt: '황금 나침반과 코일 장비 콘셉트 이미지' },
    5: { place: '자이로드롭 통로', title: '천천히 내려오는 자석', topic: '유도 전류와 제동', alt: '구리관과 투명관, 자석 장비 콘셉트 이미지' }
  };
  function esc(s) { return String(s).replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function code(n) { return String(n).padStart(2, '0'); }
  function ident(id, popup) { return popup ? ' id="' + id + '"' : ''; }
  function brand(n, side, popup) {
    return '<div class="research-brand"><span><img src="' + ROOT + 'hnr-mark.webp" width="32" height="32" alt="해누리 마크" draggable="false"><b>HNR Tech Inc.</b></span><span class="num"' + ident(side === 'front' ? 'cardNumF' : 'cardNumB', popup) + '>' + n + '</span></div>';
  }
  function face(n, side, html, popup) {
    var d = DATA[n], back = side === 'back';
    return '<div class="face ' + side + '">' + brand(n, side, popup) +
      '<div class="research-label"><span' + (back ? '' : ident('cardFrontHd', popup)) + '>' + (back ? '과학 한 줄' : '연구 카드') + '</span><span>SC–' + code(n) + '</span></div>' +
      (back ? '<figure class="card-art"><span class="card-art-fallback" aria-hidden="true">' + esc(d.topic) + '</span><img src="' + ROOT + 'science-card-' + code(n) + '.webp" width="960" height="640" alt="' + esc(d.alt) + '" decoding="async" draggable="false"></figure>' :
        '<div class="research-seal" aria-hidden="true"><span>GATE</span><b>' + code(n) + '</b><i>HNR RESEARCH</i></div>') +
      '<h3 class="research-title">' + esc(back ? d.title : d.place) + '</h3>' +
      '<div class="tx"' + ident(back ? 'cardBackTx' : 'cardFrontTx', popup) + '>' + html + '</div>' +
      '<div class="research-foot"><span>' + (back ? esc(d.topic) : '다음 장치 설정의 단서') + '</span><span class="card-open-hint">눌러서 크게 보기 ↗</span><span class="card-flip-hint">카드를 눌러 뒤집기 ↻</span></div>' +
      '<div class="research-credit">2026 서울STEM축제 - 해누리중학교</div></div>';
  }
  function faces(n, front, back, popup) { return '<div class="inner">' + face(n, 'front', front, popup) + face(n, 'back', back, popup) + '</div>'; }
  H.cards = {
    faces: faces,
    html: function(n, side, cls, front, back) {
      return '<div class="pcard research-card ' + (cls || '') + (side === 'back' ? ' flipped' : '') + '" data-n="' + n + '" aria-label="' + esc(DATA[n].place) + ' 카드 크게 보기">' + faces(n, front, back, false) + '</div>';
    },
    locked: function(n) {
      return '<div class="pcard research-card mini locked" data-n="' + n + '"><div class="inner"><div class="face front">' + brand(n, 'front', false) + '<div class="research-label"><span>연구 기록</span><span>SC–' + code(n) + '</span></div><div class="research-seal" aria-hidden="true"><span>GATE</span><b>' + code(n) + '</b><i>HNR RESEARCH</i></div><h3 class="research-title">' + esc(DATA[n].place) + '</h3><div class="tx">장치를 확인하면<br>카드를 받을 수 있어요.</div><div class="research-foot"><span>아직 확인하지 않은 장치</span></div></div></div></div>';
    }
  };
  document.addEventListener('error', function(e) {
    var img = e.target;
    if (img && img.matches && img.matches('.card-art img')) {
      img.hidden = true; img.parentNode.classList.add('art-missing');
    }
  }, true);
})();
