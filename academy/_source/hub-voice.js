/* Optional local voice practice. Depends only on window.HNRAudio. */
(function (global) {
  'use strict';
  const experiments = [
    ['energy', '에너지스틱'], ['static', '정전기 캔'], ['plasma', '플라즈마볼과 형광등'],
    ['train', '코일 열차'], ['eddy', '구리관 전자기 브레이크'], ['dram', 'DRAM 1비트·8421']
  ];
  const prompts = {
    energy: '손을 연결했을 때와 놓았을 때 무엇이 다른지 관찰하게 하고, 전류가 흐르는 길을 설명해 보세요.',
    static: "같은 조건에서 빨대 굵기에 따른 캔의 최초 이동 거리를 비교하도록 안내하세요. 굵은 빨대가 반드시 유리하다고 단정하지 마세요.",
    plasma: '에너지스틱 점등을 단서로 형광등을 가까이 가져가 켜는 순서와, 빠르게 변하는 전기장의 역할을 설명해 보세요.',
    train: '전지·자석·코일의 역할을 짚고, 코일 속에서 열차가 움직이는 까닭을 설명해 보세요.',
    eddy: "닫힌 구리관 관찰 → 원리 설명 → 절개 관 예상 → 관·구리판 구간 비교 순서로 안내하세요. 모든 유도 전류가 사라진다고 말하지 마세요.",
    dram: "S1만 → 모두 놓기 → S2만 순서와, 네 회로를 잇지 않고 8·4·2·1로 비밀 숫자 11을 1011로 저장하고 읽는 순서를 설명하세요."
  };
  const KEY = 'hnr-academy-hub-voice-choice-v1';
  let selected = 'plasma', host = null, bannerHost = null, playerURL = null, renderVersion = 0;
  let phase = 'idle', activeId = null, elapsed = 0, serial = 0, uploadBusy = false;
  let clips = [], available = true, message = '', messageKind = '', bannerMessage = '';
  try { const saved = localStorage.getItem(KEY); if (experiments.some(x => x[0] === saved)) selected = saved; } catch (_) {}
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const title = id => (experiments.find(x => x[0] === id) || ['', '설명 연습'])[1];
  const slot = id => 'hub-' + id;
  const busy = () => phase !== 'idle' || uploadBusy;
  const clock = seconds => { const n = Math.max(0, Math.floor(seconds || 0)); return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0'); };
  function setMessage(text, kind, showBanner) {
    message = text; messageKind = kind || '';
    if (showBanner) bannerMessage = text;
    const output = host && host.querySelector('[data-voice-status]');
    if (output) { output.textContent = message; output.className = 'notice voice-notice ' + messageKind; output.hidden = !message; }
    drawBanner();
  }
  function releasePlayer() {
    if (host) host.querySelectorAll('[data-voice-player] audio').forEach(audio => { audio.pause(); audio.removeAttribute('src'); audio.load(); });
    if (playerURL) { URL.revokeObjectURL(playerURL); playerURL = null; }
  }
  function attachBanner(container) {
    const next = container || document.getElementById('voiceBanner');
    if (next && next !== bannerHost) {
      if (bannerHost) bannerHost.removeEventListener('click', handleClick);
      bannerHost = next; bannerHost.addEventListener('click', handleClick);
    }
  }
  function drawBanner() {
    if (!bannerHost || !bannerHost.isConnected) attachBanner();
    if (!bannerHost) return;
    bannerHost.hidden = phase === 'idle' && !bannerMessage;
    if (bannerHost.hidden) { bannerHost.replaceChildren(); return; }
    if (phase === 'idle') {
      bannerHost.innerHTML = '<div class="voice-banner-inner"><p role="status">' + esc(bannerMessage) + '</p><button type="button" class="button secondary" data-voice-action="dismiss-banner">닫기</button></div>';
      return;
    }
    const label = phase === 'requesting' ? '마이크 허용을 기다리는 중' : phase === 'saving' ? '음성 저장 중' : '설명 녹음 중';
    bannerHost.innerHTML = '<div class="voice-banner-inner"><div><strong>' + label + '</strong><p>' + esc(title(activeId)) + ' · <span data-voice-timer>' + clock(elapsed) + '</span></p></div><div class="actions"><button type="button" class="button" data-voice-action="stop" ' + (phase !== 'recording' ? 'disabled' : '') + '>녹음 끝내기</button><button type="button" class="button secondary" data-voice-action="cancel" ' + (phase === 'saving' ? 'disabled' : '') + '>취소</button></div></div>';
  }
  async function loadPlayer(version, id) {
    try {
      const clip = await global.HNRAudio.get(slot(id));
      if (!host || renderVersion !== version || selected !== id || !clip) return;
      const target = host.querySelector('[data-voice-player]');
      if (!target) return;
      releasePlayer(); playerURL = URL.createObjectURL(clip.blob);
      const audio = document.createElement('audio'); audio.controls = true; audio.preload = 'metadata'; audio.src = playerURL;
      audio.setAttribute('aria-label', title(id) + ' 설명 녹음');
      audio.addEventListener('error', () => { if (renderVersion === version) setMessage('저장된 음성을 이 브라우저에서 재생하지 못했어요. 음성을 내려받아 다른 재생 앱에서 확인하거나 다시 녹음해 주세요.', 'voice-error'); });
      target.replaceChildren(audio);
    } catch (e) { if (renderVersion === version) setMessage(e.message || '저장된 음성을 불러오지 못했어요.', 'voice-error'); }
  }
  function render() {
    drawBanner();
    if (!host) return;
    const version = ++renderVersion; releasePlayer();
    const clip = clips.find(c => c.slot === slot(selected));
    const isCurrent = activeId === selected && phase !== 'idle';
    host.innerHTML = '<section class="panel voice-panel" aria-label="선택형 말하기 연습">' +
      '<div class="voice-heading"><div><span class="voice-eyebrow">선택해서 연습하기</span><h3>내 설명을 녹음해 들어 보기</h3></div><span class="voice-badge">45–90초 권장</span></div>' +
      '<p>짝이 방문객이라고 생각하고, <strong>안전 안내 → 실험별 진행 → 관찰과 원리</strong> 순서로 말해 보세요. 필요할 때 사용하는 연습 도구예요.</p>' +
      '<label class="field"><span>어떤 실험을 설명할까요?</span><select data-voice-select ' + (busy() ? 'disabled' : '') + '>' + experiments.map(x => '<option value="' + x[0] + '" ' + (selected === x[0] ? 'selected' : '') + '>' + esc(x[1]) + '</option>').join('') + '</select></label>' +
      '<p class="note voice-prompt">' + esc(prompts[selected]) + '</p>' +
      '<div class="actions voice-controls"><button type="button" class="button" data-voice-action="record" ' + (busy() || !available ? 'disabled' : '') + '>' + (clip ? '다시 녹음' : '녹음 시작') + '</button>' +
      '<button type="button" class="button secondary" data-voice-action="stop" ' + (!isCurrent || phase !== 'recording' ? 'disabled' : '') + '>녹음 끝내기</button>' +
      '<button type="button" class="button secondary" data-voice-action="cancel" ' + (!isCurrent || phase === 'saving' ? 'disabled' : '') + '>취소</button>' +
      '<span class="voice-timer" data-voice-timer>' + clock(isCurrent ? elapsed : 0) + '</span></div>' +
      '<p class="voice-state" aria-live="polite">' + (isCurrent ? (phase === 'requesting' ? '마이크 허용 여부를 선택해 주세요. 기다리지 않으려면 취소할 수 있어요.' : phase === 'saving' ? '음성을 이 브라우저에 저장하고 있어요.' : '녹음 중입니다. 최대 2분 후 자동으로 마쳐요.') : clip ? '저장된 음성 · ' + Math.round(clip.duration || 0) + '초 · ' + Math.round(clip.bytes / 1024) + 'KB' : '이 실험의 녹음이 아직 없어요.') + '</p>' +
      '<div class="voice-player" data-voice-player></div>' +
      '<div class="actions voice-files"><label class="button secondary voice-file-label ' + (busy() || !available ? 'voice-disabled' : '') + '">음성 파일 첨부<input type="file" data-voice-upload accept="audio/*,.webm,.ogg,.mp3,.m4a,.mp4,.wav" ' + (busy() || !available ? 'disabled' : '') + '></label>' +
      '<button type="button" class="button secondary" data-voice-action="download" ' + (!clip || busy() ? 'disabled' : '') + '>음성 내려받기</button>' +
      '<button type="button" class="button secondary voice-delete" data-voice-action="delete" ' + (!clip || busy() ? 'disabled' : '') + '>이 음성 지우기</button></div>' +
      '<p class="voice-small">WebM·OGG·MP3·M4A·MP4·WAV · 파일당 10MB 이하 · 최대 2분<br>실험마다 음성 1개를 보관합니다. 다시 녹음한 음성은 저장 성공 후 이전 음성을 바꿉니다.</p>' +
      '<p class="notice voice-notice ' + messageKind + '" data-voice-status role="status" ' + (!message ? 'hidden' : '') + '>' + esc(message) + '</p>' +
      '<p class="note voice-storage">녹음은 <strong>이 브라우저에 저장</strong>됩니다. 교사에게 전달하려면 음성을 내려받아 직접 전달하세요. 브라우저 저장 공간을 지우거나 기기를 바꾸기 전에는 필요한 음성을 내려받아 두세요.</p></section>';
    if (clip) loadPlayer(version, selected);
  }
  async function refresh() { clips = (await global.HNRAudio.list()).filter(c => c.slot.startsWith('hub-')); }
  async function startRecording() {
    if (busy()) return;
    const id = selected, token = ++serial; activeId = id; phase = 'requesting'; elapsed = 0; bannerMessage = ''; message = ''; render();
    try {
      await global.HNRAudio.start(slot(id), seconds => {
        if (token !== serial) return;
        elapsed = seconds;
        if (host) host.querySelectorAll('[data-voice-timer]').forEach(el => { el.textContent = clock(seconds); });
        if (bannerHost) bannerHost.querySelectorAll('[data-voice-timer]').forEach(el => { el.textContent = clock(seconds); });
      }, async (meta, error) => {
        if (token !== serial) return;
        phase = 'idle'; activeId = null;
        try {
          if (meta) await refresh();
          setMessage(error ? error.message : title(id) + ' 설명을 저장했어요. 다시 들으며 고칠 부분을 찾아보세요.', error ? 'voice-error' : 'voice-success', true);
        } catch (_) { setMessage('음성 목록을 확인하지 못했어요. 새로고침 후 저장된 음성을 확인해 주세요.', 'voice-error', true); }
        if (token === serial) render();
      });
      if (token === serial && activeId) { phase = 'recording'; render(); }
    } catch (e) {
      if (token !== serial) return;
      phase = 'idle'; activeId = null; setMessage(e.message || '녹음을 시작하지 못했어요. 음성 파일을 첨부할 수도 있어요.', 'voice-error', true); render();
    }
  }
  async function stopRecording() {
    if (phase !== 'recording') return;
    phase = 'saving'; render();
    try { await global.HNRAudio.stop(); } catch (e) { phase = 'idle'; activeId = null; setMessage(e.message || '녹음을 저장하지 못했어요.', 'voice-error', true); render(); }
  }
  function cancelRecording() {
    if (phase === 'idle' || phase === 'saving') return;
    // Invalidate the callback before cancel() synchronously notifies it.
    const previousSerial = serial; serial++;
    if (global.HNRAudio.cancel()) {
      activeId = null; phase = 'idle'; elapsed = 0;
      setMessage('녹음을 취소했어요. 이전에 저장한 음성은 그대로 남아 있어요.', '', true); render();
    } else { serial = previousSerial; phase = 'saving'; setMessage('음성 저장이 끝날 때까지 잠시 기다려 주세요.'); render(); }
  }
  function durationOf(blob) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(), url = URL.createObjectURL(blob); let settled = false;
      const finish = (failure, duration) => {
        if (settled) return; settled = true; clearTimeout(timeout);
        audio.onloadedmetadata = audio.ontimeupdate = audio.onerror = null;
        audio.removeAttribute('src'); audio.load(); URL.revokeObjectURL(url);
        if (failure) reject(failure); else resolve(duration);
      };
      const timeout = setTimeout(() => finish(new Error('음성 길이를 확인하지 못했어요. MP3·M4A·WAV로 저장하거나 직접 녹음해 주세요.')), 10000);
      audio.onerror = () => finish(new Error('재생할 수 없는 음성 파일이에요. 다른 파일을 선택해 주세요.'));
      audio.onloadedmetadata = () => { if (Number.isFinite(audio.duration) && audio.duration > 0) finish(null, audio.duration); else audio.currentTime = 1e9; };
      audio.ontimeupdate = () => { if (Number.isFinite(audio.duration) && audio.duration > 0) finish(null, audio.duration); };
      audio.preload = 'metadata'; audio.src = url;
    });
  }
  async function upload(file) {
    if (!file || busy()) return;
    if (!file.size || file.size > 10 * 1024 * 1024) { setMessage('빈 파일은 첨부할 수 없어요. 10MB 이하의 음성 파일을 선택해 주세요.', 'voice-error'); return; }
    const id = selected; uploadBusy = true; message = '음성 파일을 확인하고 있어요.'; render();
    try {
      const duration = await durationOf(file);
      if (duration > 120) throw new Error('2분 이하의 설명 음성을 첨부해 주세요.');
      await global.HNRAudio.put(slot(id), file, { duration }); await refresh();
      setMessage(title(id) + ' 음성을 저장했어요. 재생해 확인해 보세요.', 'voice-success');
    } catch (e) { setMessage(e.message || '파일을 저장하지 못했어요.', 'voice-error'); }
    finally { uploadBusy = false; render(); }
  }
  async function downloadClip() {
    const clip = await global.HNRAudio.get(slot(selected));
    if (!clip) throw new Error('내려받을 음성이 없어요.');
    const extension = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' }[clip.mime] || 'webm';
    const url = URL.createObjectURL(clip.blob), a = document.createElement('a');
    a.href = url; a.download = 'HNR-' + selected + '-설명.' + extension;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
    setMessage('음성 내려받기를 요청했어요. 다운로드한 파일을 확인한 뒤 원하는 곳에 직접 전달하세요.');
  }
  async function handleClick(event) {
    const button = event.target.closest('[data-voice-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.voiceAction;
    try {
      if (action === 'record') await startRecording();
      else if (action === 'stop') await stopRecording();
      else if (action === 'cancel') cancelRecording();
      else if (action === 'dismiss-banner') { bannerMessage = ''; drawBanner(); }
      else if (action === 'download' && !busy()) await downloadClip();
      else if (action === 'delete' && !busy()) {
        if (!global.confirm(title(selected) + '의 저장된 음성을 지울까요?')) return;
        await global.HNRAudio.remove(slot(selected)); await refresh(); setMessage('선택한 실험의 음성을 지웠어요.'); render();
      }
    } catch (e) { setMessage(e.message || '작업을 마치지 못했어요. 다시 시도해 주세요.', 'voice-error'); }
  }
  function handleChange(event) {
    if (event.target.matches('[data-voice-select]') && !busy()) {
      const next = event.target.value; if (!experiments.some(x => x[0] === next)) return;
      selected = next; message = ''; try { localStorage.setItem(KEY, selected); } catch (_) {} render();
    }
    if (event.target.matches('[data-voice-upload]')) {
      const file = event.target.files[0]; event.target.value = ''; upload(file);
    }
  }
  function unmount() {
    renderVersion++; releasePlayer();
    if (host) { host.removeEventListener('click', handleClick); host.removeEventListener('change', handleChange); }
    host = null; drawBanner();
  }
  async function mount(container) {
    unmount();
    if (!container || typeof container.addEventListener !== 'function') throw new Error('녹음 도구를 표시할 영역이 없어요.');
    host = container; host.addEventListener('click', handleClick); host.addEventListener('change', handleChange);
    attachBanner();
    try {
      if (!global.HNRAudio) throw new Error('녹음 도구를 불러오지 못했어요. 페이지를 새로 열어 주세요.');
      await global.HNRAudio.init(); await refresh(); available = true;
    } catch (e) { available = false; setMessage(e.message || '브라우저 음성 저장 공간을 사용할 수 없어요.', 'voice-error'); }
    render();
  }
  function banner(container) { attachBanner(container); drawBanner(); }
  global.addEventListener('beforeunload', event => { if (phase !== 'idle' || uploadBusy) { event.preventDefault(); event.returnValue = ''; } });
  global.HNRVoice = Object.freeze({ mount, unmount, banner });
})(window);
