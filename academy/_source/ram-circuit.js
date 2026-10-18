
/* HNR RAM: fixed educational circuit scenes; no timers, storage or dependencies. */
(function (global) {
  'use strict';
  if (global.HNRRamCircuit) return;
  const parts = {
    battery: ['전지', '축전기를 충전할 에너지를 공급해요. 쓰기 스위치를 놓으면 전지의 +쪽과 DATA의 연결이 끊겨요.'],
    capacitor: ['축전기', '전하를 저장하는 기억 부품이에요. 이 도안은 1mF(1000μF) 축전기를 써요. +는 DATA, −는 GND에 연결해요. 두 판 사이의 틈은 절연되어 있어요.'],
    write: ['S1 · 쓰기 스위치', '누르면 전지와 DATA를 연결해 축전기를 충전해요. 읽기 전에 반드시 손을 떼어야 저장했던 에너지로 켜지는지 볼 수 있어요.'],
    read: ['S2 · 읽기 스위치', '누르면 DATA와 저항·LED를 연결해요. 충전된 축전기가 이 길로 방전하면서 LED에 전류가 흘러요.'],
    resistor: ['220Ω 저항', 'LED와 직렬로 연결해 전류를 제한해요. 과도한 전류로 LED가 손상되는 것을 막는 역할이며, 기억을 저장하는 부품은 아니에요.'],
    led: ['LED', '전류가 흐를 때 빛을 내어 저장 상태를 보여 줘요. +쪽을 저항 쪽으로 연결해요. 꺼졌다는 사실만으로 축전기 전압이 0V라고 말할 수는 없어요.'],
    tape: ['구리테이프', '회로도의 선처럼 부품들을 연결해요. 테이프가 끊기거나 접촉이 약하면 전류가 흐르지 않을 수 있어요.'],
    nodes: ['DATA · GND', 'DATA는 축전기의 저장 전압을 확인하는 지점이에요. GND는 전지 −쪽과 연결된 기준선이에요. 여기서는 실제 땅에 꽂는다는 뜻이 아니에요.']
  };
  const scenes = {
    write: {
      title: '① 쓰기 — S1만 누르기',
      text: '전지가 축전기를 충전해요. 읽기 스위치 S2는 열려 있어 LED로 가는 길이 끊겨 있으므로 LED는 꺼져 있어요.',
      path: '전지 + → S1 → DATA → 축전기 +쪽',
      detail: '축전기 −쪽도 GND를 통해 전지 −쪽과 연결돼요. 그림의 파란 선은 충전 중인 연결 경로예요.',
      s1: '닫힘', s2: '열림', led: '꺼짐', charge: '충전 중',
      alt: '쓰기 장면. S1은 닫히고 S2는 열림. 전지와 축전기가 연결되고 LED 경로는 끊김.'
    },
    hold: {
      title: '② 저장 — 두 스위치 모두 놓기',
      text: '전지 +쪽과 LED 쪽의 길이 모두 끊겨요. 축전기에는 전하가 남아 있지만 LED는 꺼져 있어요. 실제 부품에서는 전하가 조금씩 새어 나가요.',
      path: '전지 쪽도, LED 쪽도 열린 상태',
      detail: 'LED가 꺼져 있어도 저장한 전하가 남을 수 있어요. 저장 상태를 확인하려면 다음 단계에서 S2만 눌러 봐요.',
      s1: '열림', s2: '열림', led: '꺼짐', charge: '전하 남음',
      alt: '저장 장면. S1과 S2가 모두 열림. 축전기에 전하가 남아 있고 LED는 꺼짐.'
    },
    read: {
      title: '③ 읽기 — S2만 누르기',
      text: '충전된 축전기가 저항과 LED 쪽으로 방전해요. LED가 켜져 저장 상태를 보여 주지만, 계속 읽으면 저장한 에너지가 줄어 불빛이 약해지거나 꺼져요.',
      path: '축전기 + → DATA → S2 → 저항 → LED → GND → 축전기 −',
      detail: '그림은 충분히 충전한 뒤 읽기 시작할 때의 장면이에요. S1은 열려 있으므로 전지가 LED에 계속 에너지를 공급하지 않아요.',
      s1: '열림', s2: '닫힘', led: '초기 켜짐', charge: '방전 중',
      alt: '읽기 시작 장면. S1은 열리고 S2는 닫힘. 충전된 축전기가 저항과 LED를 통해 방전해 LED가 켜짐.'
    }
  };
  function wire(d, circuit) { return '<path class="ramc-wire' + (circuit ? ' ramc-path-' + circuit : '') + '" d="' + d + '"/>'; }
  function dot(x, y) { return '<circle class="ramc-junction" cx="' + x + '" cy="' + y + '" r="5"/>'; }
  function switchSymbol(x, y, kind) {
    return '<g class="ramc-component" data-ramc-mark="' + kind + '"><circle cx="' + x + '" cy="' + y + '" r="5"/><circle cx="' + (x + 60) + '" cy="' + y + '" r="5"/><path class="ramc-switch-' + kind + '" data-ramc-switch="' + kind + '" data-ramc-closed="M' + x + ' ' + y + 'h60" data-ramc-open="M' + x + ' ' + y + 'l60 -28" d="M' + x + ' ' + y + 'l60 -28"/><text x="' + (x + 30) + '" y="' + (y - 48) + '" text-anchor="middle">' + (kind === 'write' ? 'S1 쓰기' : 'S2 읽기') + '</text><text class="ramc-state" data-ramc-switch-label="' + kind + '" x="' + (x + 30) + '" y="' + (y + 34) + '" text-anchor="middle">열림</text></g>';
  }
  function capacitor(x, top, bottom, labelX, labelY) {
    return '<g class="ramc-component" data-ramc-mark="capacitor"><path d="M' + (x - 30) + ' ' + top + 'h60 M' + (x - 30) + ' ' + bottom + 'h60"/><text x="' + (x - 48) + '" y="' + (top + 7) + '">+</text><text x="' + (x - 48) + '" y="' + (bottom + 7) + '">−</text><text x="' + labelX + '" y="' + labelY + '">축전기</text><text class="ramc-unit" x="' + labelX + '" y="' + (labelY + 32) + '">1mF</text></g>';
  }
  function resistor(x, y, labelX, labelY) {
    return '<g class="ramc-component" data-ramc-mark="resistor"><path d="M' + x + ' ' + y + 'l-10 7 20 12-20 12 20 12-20 12 10 7"/><text x="' + labelX + '" y="' + labelY + '">저항</text><text class="ramc-unit" x="' + labelX + '" y="' + (labelY + 32) + '">220Ω</text></g>';
  }
  function led(x, y, labelX, labelY) {
    return '<g class="ramc-component" data-ramc-mark="led"><circle class="ramc-led-glow" cx="' + x + '" cy="' + (y + 14) + '" r="29"/><path class="ramc-led-symbol" d="M' + (x - 16) + ' ' + y + 'h32l-16 28z M' + (x - 20) + ' ' + (y + 29) + 'h40"/><path class="ramc-light-rays" d="M' + (x + 24) + ' ' + (y + 6) + 'l18 -18m-9 0h9v9 M' + (x + 30) + ' ' + (y + 25) + 'l18 -18m-9 0h9v9"/><text x="' + labelX + '" y="' + labelY + '">LED</text><text class="ramc-state" data-ramc-led-label x="' + labelX + '" y="' + (labelY + 32) + '">꺼짐</text></g>';
  }
  function svg(mobile) {
    let body;
    if (!mobile) {
      body = '<g data-ramc-mark="tape">' + wire('M80 230V150H180', 'write') + wire('M240 150H350', 'write') + wire('M350 410H80V250', 'write') + wire('M350 150H460', 'read') + wire('M520 150H610V210', 'read') + wire('M610 272V310', 'read') + wire('M610 339V410H350', 'read') + wire('M350 245V150M350 275V410', 'shared') + '</g>';
      body += '<g class="ramc-component" data-ramc-mark="battery"><path d="M50 230h60M63 250h34"/><text x="28" y="292">전지</text><text x="118" y="237">+</text><text x="110" y="265">−</text></g>';
      body += switchSymbol(180, 150, 'write') + switchSymbol(460, 150, 'read') + capacitor(350, 245, 275, 390, 254) + resistor(610, 210, 650, 228) + led(610, 310, 665, 328);
      body += '<g class="ramc-nodes" data-ramc-mark="nodes">' + dot(350, 150) + dot(350, 410) + '<text x="350" y="109" text-anchor="middle">DATA</text><text x="350" y="448" text-anchor="middle">GND · 전지 − 연결선</text></g>';
      body += '<text class="ramc-charge" data-ramc-charge-label x="270" y="330" text-anchor="middle">충전 중</text>';
    } else {
      body = '<g data-ramc-mark="tape">' + wire('M54 261V112H105', 'write') + wire('M165 112H185', 'write') + wire('M185 505H54V281', 'write') + wire('M185 112H220V205H225', 'read') + wire('M285 205H300V270', 'read') + wire('M300 332V387', 'read') + wire('M300 416V505H185', 'read') + wire('M185 304V112M185 334V505', 'shared') + '</g>';
      body += '<g class="ramc-component" data-ramc-mark="battery"><path d="M26 261h56M38 281h32"/><text x="3" y="326">전지</text><text x="84" y="267">+</text><text x="77" y="292">−</text></g>';
      body += switchSymbol(105, 112, 'write') + switchSymbol(225, 205, 'read') + capacitor(185, 304, 334, 104, 385) + resistor(300, 270, 223, 291) + led(300, 387, 245, 455);
      body += '<g class="ramc-nodes" data-ramc-mark="nodes">' + dot(185, 112) + dot(185, 505) + '<text x="230" y="72" text-anchor="middle">DATA</text><path class="ramc-label-guide" d="M225 79L189 108"/><text x="180" y="548" text-anchor="middle">GND · 전지 − 연결선</text></g>';
      body += '<text class="ramc-charge" data-ramc-charge-label x="133" y="463" text-anchor="middle">충전 중</text>';
    }
    return '<svg class="ramc-svg ramc-svg-' + (mobile ? 'mobile' : 'wide') + '" viewBox="0 0 ' + (mobile ? '360 570' : '760 470') + '" width="' + (mobile ? '360' : '760') + '" height="' + (mobile ? '570' : '470') + '" role="img" aria-label="' + scenes.write.alt + '">' + body + '</svg>';
  }
  function render() {
    return '<section class="section ramc-module" data-ramc-root data-ramc-scene="write" aria-labelledby="ramc-heading">' +
      '<div class="section-head"><div><span class="eyebrow">FOLLOW THE CIRCUIT</span><h2 id="ramc-heading">전하는 어디에 머물고, 어느 길로 나갈까?</h2><p>먼저 예상해 봐요. 충전한 뒤 두 스위치를 모두 놓으면, LED와 축전기는 각각 어떻게 될까요?</p></div></div>' +
      '<div class="ramc-stages" role="group" aria-label="회로의 과정 선택"><button type="button" data-ramc-stage="write" aria-pressed="true">① 쓰기</button><button type="button" data-ramc-stage="hold" aria-pressed="false">② 저장</button><button type="button" data-ramc-stage="read" aria-pressed="false">③ 읽기</button></div>' +
      '<div class="ramc-layout"><figure class="ramc-figure">' + svg(false) + svg(true) + '<figcaption><span class="ramc-key"></span>파란 선: 이 단계에서 충전·방전에 연결되는 경로<br>선은 구리테이프 연결을 간단히 나타냈어요. 축전기의 두 판 사이에는 전류가 통과하지 않아요.</figcaption></figure>' +
      '<div class="ramc-explain"><div class="ramc-scene-copy" aria-live="polite" aria-atomic="true"><h3 data-ramc-title>' + scenes.write.title + '</h3><p data-ramc-text>' + scenes.write.text + '</p><p class="ramc-path-copy" data-ramc-path>' + scenes.write.path + '</p><p class="ramc-detail" data-ramc-detail>' + scenes.write.detail + '</p></div>' +
      '<aside class="ramc-resistor-note"><h3>저항은 왜 필요할까?</h3><p><strong>LED와 저항을 한 줄로, 직렬 연결</strong>해요. 같은 전류가 둘을 지나므로 저항이 LED의 전류를 제한해요.</p><p>저항을 빼면 과도한 전류로 LED가 손상될 수 있어요. 이 도안의 저항은 <strong>읽기 경로</strong>에 있어요. 충전 전류까지 제한하지는 않아요.</p><p>기억을 저장하는 부품은 <strong>축전기</strong>예요.</p></aside></div></div>' +
      '<p class="ramc-model-note">이 모식도는 각 단계의 <strong>고정 장면</strong>이에요. 실제 전류의 크기나 불이 켜지는 시간을 계산한 시뮬레이션은 아니에요. 쓰기와 읽기를 함께 누르면 전지가 LED에 에너지를 공급할 수 있어, 저장했던 에너지인지 구분하기 어려워요.</p>' +
      '<div class="ramc-part-picker"><h3>모식도에서 위치 찾기</h3><p>부품을 골라 위 회로도에서 위치와 역할을 연결해 봐요. 선택한 부품은 주황색으로 표시돼요.</p><div class="ramc-parts" role="group" aria-label="모식도 부품 선택">' + Object.keys(parts).map(function (key) { return '<button type="button" data-ramc-part="' + key + '" aria-pressed="false">' + parts[key][0] + '</button>'; }).join('') + '</div><div class="ramc-part-copy" aria-live="polite" aria-atomic="true"><strong data-ramc-part-title>부품을 선택해 보세요.</strong><p data-ramc-part-text>축전기에서 시작해 쓰기 길과 읽기 길을 각각 짚어 보세요.</p></div></div>' +
      '<details class="ramc-question"><summary>확인해 보기 · 두 스위치를 놓았더니 LED가 꺼졌어요. 기억도 사라졌을까요?</summary><p><strong>그렇게 판단할 수 없어요.</strong> 읽기 스위치가 열려 있어 LED에 전류가 흐르지 않는 상태일 수 있어요. 축전기에 전하가 남아 있다면, S1을 놓은 채 S2만 눌렀을 때 LED가 켜질 수 있어요. 읽는 중 꺼져도 전압이 정확히 0V라는 뜻은 아니에요.</p></details></section>';
  }
  function setScene(root, key) {
    const scene = scenes[key];
    if (!scene) return;
    root.dataset.ramcScene = key;
    root.querySelectorAll('[data-ramc-stage]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.ramcStage === key)); });
    ['title', 'text', 'path', 'detail'].forEach(function (name) { root.querySelector('[data-ramc-' + name + ']').textContent = scene[name]; });
    root.querySelectorAll('[data-ramc-switch-label]').forEach(function (t) { t.textContent = t.dataset.ramcSwitchLabel === 'write' ? scene.s1 : scene.s2; });
    root.querySelectorAll('[data-ramc-switch]').forEach(function (p) { p.setAttribute('d', ((p.dataset.ramcSwitch === 'write' && key === 'write') || (p.dataset.ramcSwitch === 'read' && key === 'read')) ? p.dataset.ramcClosed : p.dataset.ramcOpen); });
    root.querySelectorAll('[data-ramc-led-label]').forEach(function (t) { t.textContent = scene.led; });
    root.querySelectorAll('[data-ramc-charge-label]').forEach(function (t) { t.textContent = scene.charge; });
    root.querySelectorAll('.ramc-svg').forEach(function (el) { el.setAttribute('aria-label', scene.alt); });
  }
  function setPart(root, key) {
    if (!parts[key]) return;
    root.querySelectorAll('[data-ramc-part]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.ramcPart === key)); });
    root.querySelectorAll('[data-ramc-mark]').forEach(function (el) { el.classList.toggle('ramc-selected', el.dataset.ramcMark === key); });
    root.querySelector('[data-ramc-part-title]').textContent = parts[key][0];
    root.querySelector('[data-ramc-part-text]').textContent = parts[key][1];
  }
  function mount() {
    document.querySelectorAll('[data-ramc-root]').forEach(function (root) {
      setScene(root, scenes[root.dataset.ramcScene] ? root.dataset.ramcScene : 'write');
    });
  }
  document.addEventListener('click', function (event) {
    const target = event.target instanceof Element ? event.target.closest('[data-ramc-stage], [data-ramc-part]') : null;
    if (!target) return;
    const root = target.closest('[data-ramc-root]');
    if (!root) return;
    if (target.dataset.ramcStage) setScene(root, target.dataset.ramcStage);
    else setPart(root, target.dataset.ramcPart);
  });
  global.HNRRamCircuit = { render: render, mount: mount };
})(window);


