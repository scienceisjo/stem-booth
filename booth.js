/* 어쩌다 반도체 연구원! 가상실험실 — 공통 로직
   세션(출근 카드)·진행률·스토리 팝업·스탬프·실험 과정 패널을 모든 페이지에 붙인다.
   미션 페이지: <body data-mission="N"> + 이 스크립트만 넣으면 나머지는 자동. */
(function () {
  'use strict';
  const KEY = 'hnr.session.v1';

  // ─────────────────────────────────────────── 문구 (부스 진행자 말투)
  const MISSIONS = {
    1: { title: '손잡고 불 켜라', stamp: '연결', time: '1분', place: '천막 앞',
      one: '동료와 손을 잡아 에너지스틱을 켜 보아요',
      intro: ['첫 출근을 환영해요, {name} 연구원!', 'HNR Tech에서는 혼자 하는 일이 없어요. 옆 사람과 손을 잡아 볼까요?', '손이 이어지면 에너지스틱에 불이 켜질 거예요. 그게 바로 입사 신호입니다!'],
      steps: ['진행자에게서 에너지스틱을 받아요.', '팀원과 둥글게 서서 손을 잡아요. 양 끝 사람이 에너지스틱의 금속 부분을 잡습니다.', '불빛과 소리가 나면 성공! 이제 한 명이 손을 놓아 보아요. 어떻게 될까요?', '태블릿에서 어디가 끊겼는지 눈으로 확인해 보아요.'],
      ask: '한 명만 손을 놓으면 어떻게 될까요? 두 명이 동시에 놓으면?',
      clear: ['불이 켜졌네요! 회로가 한 바퀴 이어졌어요.', '우리 몸을 통해 아주 작은 전류가 흐르는 길이 연결된 거예요. 몸이 전기를 만든 건 아니고요!', '입사 완료! 첫 스탬프 「연결」을 받으세요.'] },
    2: { title: '캔을 움직여라', stamp: '끌림', time: '3분', place: '좌측 책상',
      one: '문지른 빨대로 손대지 않고 캔을 굴려 보아요',
      intro: ['캔 코스에 오신 걸 환영해요.', '손을 대지 않고 이 캔을 골인선까지 굴려야 해요. 무기는 빨대 하나!', '먼저 문지르지 말고 그냥 가져가 보세요. 그다음 문지르고 다시. 뭐가 다를까요?'],
      steps: ['문지르지 않은 빨대를 캔 가까이 가져가요. 캔이 움직이나요?', '빨대를 털가죽이나 휴지에 열 번쯤 문질러요.', '다시 캔 가까이! 닿지 않게 살살 이끌어 골인선까지 굴려요.', '태블릿에서 캔 속 전하가 어떻게 자리를 바꾸는지 보아요.'],
      ask: '빨대를 문지르지 않으면 캔은 움직일까요? 캔은 원래 +일까요, −일까요?',
      clear: ['골인! 손도 안 댔는데 캔이 따라왔죠?', '캔은 원래 중성이에요. 대전된 빨대가 다가오자 캔 속 전하가 자리를 바꿔 끌린 거예요.', '스탬프 「끌림」 획득!'] },
    3: { title: '불빛을 깨워라', stamp: '빛', time: '2분', place: '뒷벽 좌측',
      one: '암실 상자에서 전선 없이 형광등을 켜 보아요',
      intro: ['여기는 암실 상자. 안이 어두워야 잘 보여요.', '전선도 없는 형광등을 플라즈마볼에 가까이 가져가 볼까요?', '어디까지 가야 불이 켜질지, 그 거리를 찾는 게 미션이에요.'],
      steps: ['형광등을 든 손을 암실 상자 안으로 넣어요.', '멀리서부터 천천히 플라즈마볼 쪽으로 가져가요.', '불이 켜지기 시작하는 거리를 기억해요. 세로로 들 때와 가로로 들 때 다를까요?', '태블릿에서 켜지는 범위를 찾아 보고 실물과 비교해요.'],
      ask: '볼에서 몇 cm까지 켜질까요? 형광등을 세로로 들 때와 가로로 들 때 다를까요?',
      clear: ['불빛이 깨어났어요!', '플라즈마볼 주변의 빠르게 변하는 전기장이 형광등 속 기체를 자극한 거예요. 멀어지면 자극이 약해져 꺼지죠.', '스탬프 「빛」 획득!'] },
    4: { title: '내 몸을 돌려라', stamp: '회전', time: '3분', place: '중앙 매트',
      one: '회전의자에 앉아 자이로스코프의 축을 기울여 보아요',
      intro: ['회전의자에 앉아 볼까요? 발은 바닥에서 떼고요.', '진행자가 바퀴를 돌려서 건네 드릴 거예요. 두 손으로 꼭 잡으세요.', '바퀴 축을 천천히 기울여 보세요. 가만히 있는데 뭐가 움직이나요?'],
      steps: ['회전의자에 앉아 발을 바닥에서 떼요. 옆에 선생님이 함께 있어요.', '돌고 있는 바퀴를 두 손으로 받아요. 바퀴 살에 손가락을 넣지 않아요!', '축을 세로에서 가로로 천천히 기울여요. 의자가 돌기 시작해요.', '반대로 기울이면? 완전히 뒤집으면? 태블릿으로 먼저 예상하고 해 보아요.'],
      ask: '바퀴를 완전히 뒤집으면(180°) 더 빨리 돌까요, 반대로 돌까요?',
      clear: ['돌았죠? 아무도 밀지 않았는데요!', '돌고 있는 바퀴의 회전량을 기울이면, 줄어든 만큼 내 몸이 대신 돌아요. 전체 회전량은 그대로랍니다.', '물리학자들은 자석의 성질도 전자의 회전 같은 성질로 설명해요. 오늘은 그 이야기를 몸으로 느껴 본 거예요.', '스탬프 「회전」 획득!'] },
    5: { title: '건전지야 달려!', stamp: '달림', time: '2분', place: '뒷벽 우측',
      one: '자석을 붙인 건전지를 구리 코일에 넣어 보아요',
      intro: ['구리 코일 열차역에 도착!', '자석을 붙인 건전지를 코일 입구에 살짝 넣어 보세요.', '출발하면 성공. 그런데 자석 방향을 바꾸면 어떻게 될까요? 예상 먼저!'],
      steps: ['진행자에게서 자석 붙은 건전지를 받아요. 자석은 진행자만 만져요.', '코일 입구에 건전지를 넣어요. 손을 떼면 출발!', '한 바퀴 달리면 바로 꺼내요. 건전지가 뜨거워져요.', '태블릿에서 자석과 건전지를 뒤집어 보고, 실물로도 확인해 보아요.'],
      ask: '자석 하나를 거꾸로 붙이면 건전지는 어느 쪽으로 달릴까요?',
      clear: ['출발했어요! 전기와 자석이 만나면 힘이 생겨요.', '자석과 닿은 코일 구간에만 전류가 흐르고, 그 구간이 전자석이 되어 자석을 밀어요.', '스탬프 「달림」 획득!'] },
    6: { title: '기억을 만들어라', stamp: '기억', time: '8분', place: '제작대',
      one: '1비트 기억 회로를 만들어 쓰고 읽어 보아요',
      intro: ['드디어 마지막 미션, 제작실이에요.', '지금까지 전기로 움직이고, 불을 켜고, 돌렸죠? 이번엔 전기로 기억을 만들어요.', '카드보드 위에 회로를 만들고, 1을 저장했다가 다시 꺼내 볼 거예요.'],
      steps: ['카드보드 설계도의 정해진 자리에 구리 테이프를 붙여요.', '전지, 스위치 2개, 축전기, 저항, LED를 자리에 놓아요. 전지·축전기·LED는 방향(+, −)이 있어요!', '부품 다리 위에 테이프를 한 번 더 붙여 고정해요.', '쓰기 스위치를 살짝 누르고 → 손을 떼고 3초 기다리고 → 읽기 스위치를 눌러요. LED가 켜지나요?', '바로 다시 읽기를 눌러 보아요. 이번엔 어떤가요?'],
      ask: '쓰기를 하고 30초 기다렸다가 읽으면 LED는 더 밝을까요, 어두울까요?',
      clear: ['1비트를 저장하고 다시 꺼냈어요!', '전하가 있으면 1, 없으면 0. 전하를 가두면 정보가 됩니다.', '컴퓨터 메모리(디램)도 수십억 개의 작은 축전기로 똑같이 기억해요. 읽으면 사라지고, 가만히 두면 새어 나가서 계속 다시 써 주죠.', '마지막 스탬프 「기억」 획득! 정식 연구원 임명을 축하해요!'] }
  };
  const STORY = {
    welcome: ['{name} 연구원, 출근 카드가 발급됐어요.', '이 태블릿을 들고 스테이션을 돌아요. 미션을 깰 때마다 스탬프가 찍혀요.', '실제 체험하기 전에 태블릿으로 원리를 먼저 보면 훨씬 쉬워요. 어떤 미션이 가장 설레나요?'],
    guest: ['둘러보기 모드예요. 미션 6개를 자유롭게 구경해 보아요.', '입사하면 스탬프를 모을 수 있어요!'],
    complete: ['스탬프 6개를 모두 모았어요!', '{name} 연구원을 HNR Tech Inc. 정식 연구원으로 임명합니다.', '완성한 기억 회로를 들고 포토존으로 가요!']
  };

  // ─────────────────────────────────────────── 세션
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function start(name, startISO, guest) {
    const s = { name: (name || '').trim() || '신입', start: startISO || new Date().toISOString(), guest: !!guest, cleared: [], seen: {} };
    save(s); return s;
  }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} }
  function fill(t, s) { return t.replace(/\{name\}/g, s && s.name ? s.name : '신입'); }
  function minutes(s) { return Math.max(0, Math.round((Date.now() - new Date(s.start).getTime()) / 60000)); }
  function pct(s) { return Math.round((s.cleared.length / 6) * 100); }

  // ─────────────────────────────────────────── 스토리 팝업
  function story(lines, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      const s = load();
      const wrap = document.createElement('div');
      wrap.className = 'hnr-modal';
      wrap.innerHTML =
        '<div class="hnr-card" role="dialog" aria-modal="true">' +
          '<div class="hnr-head"><img src="img/badge.png" alt="" width="28" height="28"><span>' + (opts.label || 'HNR Tech 안내') + '</span></div>' +
          (opts.stamp ? '<div class="hnr-stampwrap"><div class="hnr-stamp"><span>' + opts.stamp + '</span></div></div>' : '') +
          '<div class="hnr-lines"></div>' +
          '<div class="hnr-actions"><button class="hnr-btn" type="button">다음</button></div>' +
        '</div>';
      document.body.appendChild(wrap);
      const box = wrap.querySelector('.hnr-lines'), btn = wrap.querySelector('.hnr-btn');
      let i = 0;
      function show() {
        const p = document.createElement('p');
        p.textContent = fill(lines[i], s);
        box.appendChild(p);
        requestAnimationFrame(function () { p.classList.add('in'); });
        i++;
        if (i >= lines.length) btn.textContent = opts.last || '확인';
      }
      show();
      btn.addEventListener('click', function () {
        if (i < lines.length) { show(); return; }
        wrap.classList.add('out');
        setTimeout(function () { wrap.remove(); resolve(); }, 220);
      });
    });
  }

  // ─────────────────────────────────────────── 진행 띠
  function strip(s, cur) {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    const el = document.createElement('div');
    el.className = 'hnr-strip';
    let dots = '';
    for (let n = 1; n <= 6; n++) {
      const done = s.cleared.indexOf(n) >= 0;
      dots += '<a class="d' + (done ? ' on' : '') + (n === cur ? ' cur' : '') + '" href="m' + n + '.html" title="' + MISSIONS[n].title + '">' + (done ? '✓' : n) + '</a>';
    }
    el.innerHTML =
      '<a class="who" href="index.html"><img src="img/badge.png" alt="" width="22" height="22"><b>' + s.name + '</b> 연구원' + (s.guest ? ' <em>둘러보기</em>' : '') + '</a>' +
      '<div class="bar"><i style="width:' + pct(s) + '%"></i></div>' +
      '<span class="pct">' + s.cleared.length + '/6 · ' + pct(s) + '%</span>' +
      '<span class="dots">' + dots + '</span>';
    nav.insertAdjacentElement('afterend', el);
  }

  // ─────────────────────────────────────────── 미션 페이지 부착물
  function procedurePanel(m, n) {
    const panel = document.querySelector('.panel');
    if (!panel) return;
    const card = document.createElement('div');
    card.className = 'steps hnr-proc';
    card.innerHTML =
      '<h3>실물에서 이렇게 해 보아요 <small>' + m.place + ' · 약 ' + m.time + '</small></h3>' +
      '<div class="proc-art" id="procArt"></div>' +
      m.steps.map(function (t, i) { return '<div class="step"><div class="n">' + (i + 1) + '</div><div class="t">' + t + '</div></div>'; }).join('');
    const ask = panel.querySelector('.ask');
    if (ask) ask.insertAdjacentElement('beforebegin', card); else panel.appendChild(card);
  }
  function completeButton(m, n, s) {
    const panel = document.querySelector('.panel');
    if (!panel) return;
    const done = s.cleared.indexOf(n) >= 0;
    const box = document.createElement('div');
    box.className = 'hnr-complete' + (done ? ' done' : '');
    box.innerHTML = done
      ? '<div class="ok">스탬프 「' + m.stamp + '」 획득 완료</div><a class="hnr-btn ghost" href="' + (n < 6 ? 'm' + (n + 1) + '.html' : 'index.html') + '">' + (n < 6 ? '다음 미션으로 →' : '대시보드로 →') + '</a>'
      : '<button class="hnr-btn big" type="button">미션 완료! 스탬프 받기</button><small>' + (s.guest ? '둘러보기 중이라 스탬프는 저장되지 않아요' : '실물 체험을 마쳤으면 눌러요') + '</small>';
    panel.appendChild(box);
    const btn = box.querySelector('button');
    if (!btn) return;
    btn.addEventListener('click', function () {
      const cur = load() || s;
      if (!cur.guest && cur.cleared.indexOf(n) < 0) { cur.cleared.push(n); cur.cleared.sort(); save(cur); }
      story(m.clear, { label: '미션 ' + n + ' 완료', stamp: m.stamp, last: n < 6 ? '다음 미션으로' : '대시보드로' }).then(function () {
        location.href = n < 6 ? 'm' + (n + 1) + '.html' : 'index.html';
      });
    });
  }
  function markStamp(n, s) {
    const st = document.querySelector('.subnav .stamp');
    if (st && s.cleared.indexOf(n) >= 0) st.classList.add('got');
    const right = document.querySelector('.subnav .right > span');
    if (right) right.textContent = s.cleared.indexOf(n) >= 0 ? '스탬프 획득!' : '깨면 스탬프';
  }

  // ─────────────────────────────────────────── 진입점
  function initMission(n) {
    let s = load();
    if (!s) { location.replace('index.html?next=m' + n); return; }
    const m = MISSIONS[n];
    strip(s, n);
    markStamp(n, s);
    procedurePanel(m, n);
    completeButton(m, n, s);
    if (!s.seen['intro' + n]) {
      s.seen['intro' + n] = true; save(s);
      story(m.intro, { label: '미션 ' + n + ' · ' + m.title, last: '시작해 볼까요?' });
    }
  }

  window.HNR = { MISSIONS: MISSIONS, STORY: STORY, load: load, save: save, start: start, reset: reset, story: story, strip: strip, fill: fill, minutes: minutes, pct: pct };

  document.addEventListener('DOMContentLoaded', function () {
    const n = parseInt(document.body.getAttribute('data-mission'), 10);
    if (n >= 1 && n <= 6) initMission(n);
  });
})();
