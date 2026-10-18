/* HNR Tech Inc. — local voice practice. No microphone access until start(). */
(function (global) {
  'use strict';
  const DB_NAME = 'hnr-academy-audio-v1', STORE = 'clips';
  const MAX_BYTES = 10 * 1024 * 1024, MAX_TOTAL = 30 * 1024 * 1024;
  const MAX_SECONDS = 120, MAX_CLIPS = 32;
  const MIME = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']);
  // Some operating systems label voice-only .webm/.mp4 files by container rather than track type.
  const ALIASES = { 'audio/x-wav': 'audio/wav', 'audio/wave': 'audio/wav', 'audio/vnd.wave': 'audio/wav', 'audio/x-m4a': 'audio/mp4', 'audio/mp3': 'audio/mpeg', 'video/webm': 'audio/webm', 'video/mp4': 'audio/mp4', 'application/ogg': 'audio/ogg' };
  let dbPromise = null, session = null;

  function error(code, message, cause) {
    const e = new Error(message);
    e.code = code;
    if (cause) e.cause = cause;
    return e;
  }
  function storageError(e) {
    if (e && typeof e.code === 'string') return e;
    if (e && e.name === 'QuotaExceededError') return error('storage-full', '기기 저장 공간이 부족해 음성을 저장하지 못했어요. 결과 파일을 내려받고 공간을 확보한 뒤 다시 시도해 주세요.', e);
    return error('storage-unavailable', '이 브라우저에 음성을 저장하지 못했어요. 일반 브라우저 창에서 다시 열거나 브라우저의 사이트 저장 허용 여부를 확인해 주세요.', e);
  }
  function micError(e) {
    if (e && typeof e.code === 'string') return e;
    const name = e && e.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') return error('microphone-denied', '마이크 사용이 허용되지 않았어요. 주소창의 사이트 설정에서 마이크를 허용하거나, 기기의 녹음 앱으로 녹음한 파일을 첨부해 주세요.', e);
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return error('microphone-missing', '사용할 마이크를 찾지 못했어요. 마이크를 연결하거나 녹음한 음성 파일을 첨부해 주세요.', e);
    if (name === 'NotReadableError' || name === 'TrackStartError') return error('microphone-busy', '마이크를 켜지 못했어요. 다른 녹음·화상 통화 앱을 닫고 다시 시도하거나 음성 파일을 첨부해 주세요.', e);
    return error('recording-failed', '녹음을 완료하지 못했어요. 다시 녹음하거나 기기의 녹음 앱에서 만든 음성 파일을 첨부해 주세요.', e);
  }
  function checkSlot(slot) {
    if (typeof slot !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(slot)) throw error('invalid-slot', '음성 과제 번호가 올바르지 않아요. 페이지를 새로 열고 다시 시도해 주세요.');
    return slot;
  }
  function baseMime(value) {
    const base = typeof value === 'string' ? value.toLowerCase().split(';')[0].trim() : '';
    return ALIASES[base] || base;
  }
  function metadata(clip) {
    const result = { slot: clip.slot, mime: clip.mime, bytes: clip.bytes, duration: clip.duration, createdAt: clip.createdAt };
    if (clip.filename) result.filename = clip.filename;
    return result;
  }
  function filename(value) {
    return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_').slice(0, 100) : '';
  }
  function detectMime(bytes) {
    const ascii = (start, n) => String.fromCharCode(...bytes.slice(start, start + n));
    if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return 'audio/webm';
    if (bytes.length >= 4 && ascii(0, 4) === 'OggS') return 'audio/ogg';
    if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WAVE') return 'audio/wav';
    if (bytes.length >= 12 && ascii(4, 4) === 'ftyp') return 'audio/mp4';
    if (bytes.length >= 3 && ascii(0, 3) === 'ID3') return 'audio/mpeg';
    if (bytes.length >= 2 && bytes[0] === 255 && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 0x06) !== 0) return 'audio/mpeg';
    return '';
  }
  async function prepare(slot, blob, meta) {
    checkSlot(slot);
    if (!(blob instanceof Blob) || !blob.size) throw error('empty-audio', '음성 파일이 비어 있어요. 다시 녹음하거나 다른 파일을 선택해 주세요.');
    if (blob.size > MAX_BYTES) throw error('file-too-large', '음성 파일은 하나당 10MB까지 첨부할 수 있어요. 짧게 녹음한 파일을 선택해 주세요.');
    const detected = detectMime(new Uint8Array(await blob.slice(0, 32).arrayBuffer()));
    const declared = baseMime(blob.type || meta.mime);
    if (!detected || (declared && (!MIME.has(declared) || declared !== detected))) throw error('invalid-audio', 'WebM, OGG, M4A/MP4, MP3, WAV 형식의 음성 파일을 선택해 주세요. 파일의 형식 정보가 맞지 않으면 첨부할 수 없어요.');
    const rawDuration = meta.duration == null ? null : Number(meta.duration);
    if (rawDuration !== null && (!Number.isFinite(rawDuration) || rawDuration < 0 || rawDuration > 86400)) throw error('invalid-metadata', '음성 길이 정보가 올바르지 않아요. 파일을 다시 선택해 주세요.');
    const createdAt = meta.createdAt == null ? new Date().toISOString() : meta.createdAt;
    if (typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt)) || createdAt.length > 40) throw error('invalid-metadata', '음성 저장 날짜가 올바르지 않아요.');
    return { slot, blob: blob.type === detected ? blob : blob.slice(0, blob.size, detected), mime: detected, bytes: blob.size, duration: rawDuration, createdAt: new Date(createdAt).toISOString(), filename: filename(meta.filename || blob.name) };
  }
  async function database() {
    if (!global.indexedDB) throw storageError();
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        let req, settled = false;
        try { req = global.indexedDB.open(DB_NAME, 1); } catch (e) { reject(storageError(e)); return; }
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'slot' });
        };
        req.onerror = () => { settled = true; reject(storageError(req.error)); };
        req.onblocked = () => { settled = true; reject(error('storage-blocked', '이 학습 공간이 열린 다른 탭을 닫고 다시 시도해 주세요.')); };
        req.onsuccess = () => {
          const db = req.result;
          if (settled) { db.close(); return; }
          settled = true;
          db.onversionchange = () => { db.close(); dbPromise = null; };
          resolve(db);
        };
      });
      dbPromise.catch(() => { dbPromise = null; });
    }
    return dbPromise;
  }
  async function transaction(mode, work) {
    const db = await database();
    return new Promise((resolve, reject) => {
      let tx, result, failure;
      try { tx = db.transaction(STORE, mode); } catch (e) { reject(storageError(e)); return; }
      const fail = e => { failure = e; try { tx.abort(); } catch (_) { reject(storageError(e)); } };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => { failure = failure || tx.error; };
      tx.onabort = () => reject(storageError(failure || tx.error));
      try { work(tx.objectStore(STORE), value => { result = value; }, fail); } catch (e) { fail(e); }
    });
  }
  function checkCapacity(clips) {
    if (clips.length > MAX_CLIPS) throw error('too-many-clips', '저장 가능한 음성 개수를 초과했어요.');
    if (clips.reduce((sum, c) => sum + c.bytes, 0) > MAX_TOTAL) throw error('audio-total-too-large', '음성 파일 전체는 30MB까지 저장할 수 있어요. 기존 결과를 내려받고 불필요한 음성을 지우거나 더 작은 파일을 선택해 주세요.');
  }
  async function storeClips(clips, replace) {
    return transaction('readwrite', (store, result, fail) => {
      const request = store.getAll();
      request.onsuccess = () => {
        try {
          const map = new Map((replace ? [] : request.result).map(c => [c.slot, c]));
          for (const clip of clips) map.set(clip.slot, clip);
          checkCapacity([...map.values()]);
          if (replace) store.clear();
          for (const clip of clips) store.put(clip);
          result(clips.map(metadata));
        } catch (e) { fail(e); }
      };
    });
  }
  async function init() { await database(); return true; }
  async function put(slot, blob, meta = {}) {
    const clip = await prepare(slot, blob, meta);
    return (await storeClips([clip], false))[0];
  }
  async function get(slot) {
    checkSlot(slot);
    return transaction('readonly', (store, result) => {
      const request = store.get(slot);
      request.onsuccess = () => result(request.result ? { ...metadata(request.result), blob: request.result.blob } : null);
    });
  }
  async function list() {
    return transaction('readonly', (store, result) => {
      const request = store.getAll();
      request.onsuccess = () => result(request.result.map(metadata).sort((a, b) => a.slot.localeCompare(b.slot)));
    });
  }
  async function remove(slot) {
    checkSlot(slot);
    if (session && session.slot === slot) throw error('recording-active', '녹음을 끝낸 뒤 음성을 삭제해 주세요.');
    return transaction('readwrite', (store, result) => { store.delete(slot); result(true); });
  }
  function encodeBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return global.btoa(binary);
  }
  async function exportAll() {
    if (session) throw error('recording-active', '녹음과 저장이 끝난 뒤 결과를 내려받아 주세요.');
    const clips = await transaction('readonly', (store, result) => {
      const request = store.getAll(); request.onsuccess = () => result(request.result);
    });
    checkCapacity(clips);
    const output = [];
    for (const clip of clips) output.push({ ...metadata(clip), base64: encodeBase64(new Uint8Array(await clip.blob.arrayBuffer())) });
    return output;
  }
  async function importAll(items, options = {}) {
    if (session) throw error('recording-active', '녹음과 저장이 끝난 뒤 결과 파일을 불러와 주세요.');
    if (!Array.isArray(items) || items.length > MAX_CLIPS) throw error('invalid-import', '음성 기록의 형식이나 개수가 올바르지 않아요.');
    const seen = new Set(), clips = [];
    let total = 0;
    for (const item of items) {
      if (!item || typeof item !== 'object') throw error('invalid-import', '음성 기록의 형식이 올바르지 않아요.');
      checkSlot(item.slot);
      if (seen.has(item.slot)) throw error('invalid-import', '같은 과제의 음성이 중복되어 있어요.');
      seen.add(item.slot);
      if (!MIME.has(baseMime(item.mime)) || !Number.isInteger(item.bytes) || item.bytes <= 0 || item.bytes > MAX_BYTES) throw error('invalid-import', '음성 기록의 형식이나 파일 크기가 올바르지 않아요.');
      total += item.bytes;
      if (total > MAX_TOTAL) throw error('audio-total-too-large', '불러올 음성 파일 전체가 30MB를 초과해요.');
      const value = item.base64;
      const padding = item.bytes % 3 === 0 ? 0 : 3 - (item.bytes % 3);
      if (typeof value !== 'string' || value.length !== 4 * Math.ceil(item.bytes / 3) || /[^A-Za-z0-9+/]/.test(value.slice(0, value.length - padding)) || value.slice(value.length - padding) !== '='.repeat(padding)) throw error('invalid-import', '음성 파일 데이터가 손상되었어요. 원래 결과 파일을 다시 선택해 주세요.');
      let decoded;
      try { decoded = global.atob(value); } catch (e) { throw error('invalid-import', '음성 파일 데이터를 읽을 수 없어요.', e); }
      if (decoded.length !== item.bytes) throw error('invalid-import', '음성 파일의 크기 정보가 일치하지 않아요.');
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
      clips.push(await prepare(item.slot, new Blob([bytes], { type: baseMime(item.mime) }), item));
    }
    return storeClips(clips, options.replace === true);
  }
  function supported() {
    return global.isSecureContext !== false && !!(global.navigator && global.navigator.mediaDevices && typeof global.navigator.mediaDevices.getUserMedia === 'function' && global.MediaRecorder);
  }
  function notify(callback, ...args) {
    if (typeof callback === 'function') { try { callback(...args); } catch (_) { /* A UI callback cannot interrupt microphone cleanup or storage. */ } }
  }
  function cleanup(s) {
    clearInterval(s.tickTimer); clearTimeout(s.limitTimer); clearTimeout(s.stopTimer);
    if (s.stream) s.stream.getTracks().forEach(track => { try { track.stop(); } catch (_) {} });
  }
  function settle(s, result, failure) {
    if (s.settled) return;
    s.settled = true; cleanup(s);
    if (session === s) session = null;
    if (failure) s.reject(failure); else s.resolve(result);
    notify(s.onEnded, result || null, failure || null);
  }
  async function finish(s) {
    if (s.settled || s.finishing) return;
    s.finishing = true;
    cleanup(s);
    try {
      const mime = s.recorder.mimeType || (s.chunks[0] && s.chunks[0].type) || '';
      const blob = new Blob(s.chunks, { type: mime });
      const duration = Math.max(0, (s.endedAt || Date.now()) - s.startedAt) / 1000;
      const result = await put(s.slot, blob, { duration, createdAt: new Date(s.startedAt).toISOString() });
      settle(s, result, null);
    } catch (e) { settle(s, null, typeof e.code === 'string' ? e : storageError(e)); }
  }
  function stop() {
    const s = session;
    if (!s) return Promise.reject(error('not-recording', '현재 녹음 중인 음성이 없어요.'));
    if (!s.recorder) return Promise.reject(error('microphone-pending', '마이크 허용 여부를 먼저 선택해 주세요. 취소하려면 녹음 취소를 눌러 주세요.'));
    if (!s.stopping && !s.finishing) {
      s.stopping = true; s.endedAt = Date.now();
      clearInterval(s.tickTimer); clearTimeout(s.limitTimer);
      try {
        if (s.recorder.state !== 'inactive') s.recorder.stop();
        else finish(s);
        s.stream.getTracks().forEach(track => { try { track.stop(); } catch (_) {} });
        s.stopTimer = setTimeout(() => settle(s, null, error('recording-timeout', '녹음 종료가 지연되어 저장하지 못했어요. 다시 녹음하거나 음성 파일을 첨부해 주세요.')), 10000);
      } catch (e) { settle(s, null, micError(e)); }
    }
    return s.done;
  }
  async function start(slot, onTick, onEnded) {
    checkSlot(slot);
    if (session) throw error('recording-active', '진행 중인 녹음을 먼저 끝내 주세요.');
    if (global.isSecureContext === false) throw error('insecure-context', '직접 녹음은 HTTPS 주소 또는 localhost에서 가능해요. 선생님이 공유한 보안 주소로 열거나 음성 파일을 첨부해 주세요.');
    if (!supported()) throw error('recording-unsupported', '이 브라우저는 직접 녹음을 지원하지 않아요. Chrome·Edge·Safari의 최신 버전에서 열거나 음성 파일을 첨부해 주세요.');
    const s = { slot, onTick, onEnded, chunks: [], bytes: 0, stream: null, recorder: null, settled: false, finishing: false, stopping: false };
    s.done = new Promise((resolve, reject) => { s.resolve = resolve; s.reject = reject; });
    s.done.catch(() => {});
    session = s;
    try {
      await init();
      if (s.settled) throw error('recording-cancelled', '녹음을 취소했어요.');
      s.stream = await global.navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (s.settled) { cleanup(s); throw error('recording-cancelled', '녹음을 취소했어요.'); }
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
      const mimeType = candidates.find(type => typeof global.MediaRecorder.isTypeSupported === 'function' && global.MediaRecorder.isTypeSupported(type));
      s.recorder = new global.MediaRecorder(s.stream, mimeType ? { mimeType, audioBitsPerSecond: 64000 } : { audioBitsPerSecond: 64000 });
      s.recorder.ondataavailable = event => {
        if (s.settled || !event.data || !event.data.size) return;
        s.bytes += event.data.size;
        if (s.bytes > MAX_BYTES) {
          settle(s, null, error('file-too-large', '녹음이 10MB를 초과해 저장하지 못했어요. 더 짧게 녹음해 주세요.'));
          try { if (s.recorder.state !== 'inactive') s.recorder.stop(); } catch (_) {}
          return;
        }
        s.chunks.push(event.data);
      };
      s.recorder.onerror = event => { settle(s, null, micError(event.error)); try { if (s.recorder.state !== 'inactive') s.recorder.stop(); } catch (_) {} };
      s.recorder.onstop = () => finish(s);
      s.startedAt = Date.now();
      s.recorder.start(1000);
      notify(onTick, 0, MAX_SECONDS);
      s.tickTimer = setInterval(() => notify(onTick, Math.min(MAX_SECONDS, Math.floor((Date.now() - s.startedAt) / 1000)), MAX_SECONDS), 250);
      s.limitTimer = setTimeout(() => { if (session === s) stop().catch(() => {}); }, MAX_SECONDS * 1000);
      return { slot, maxSeconds: MAX_SECONDS };
    } catch (e) {
      cleanup(s);
      const failure = typeof e.code === 'string' ? e : micError(e);
      settle(s, null, failure);
      throw failure;
    }
  }
  function cancel() {
    const s = session;
    if (!s) return false;
    if (s.finishing) return false;
    settle(s, null, error('recording-cancelled', '녹음을 취소했어요. 이전에 저장한 음성은 그대로 남아 있어요.'));
    try { if (s.recorder && s.recorder.state !== 'inactive') s.recorder.stop(); } catch (_) {}
    return true;
  }
  global.addEventListener('pagehide', () => {
    if (session) {
      const s = session;
      cleanup(s);
      if (!s.finishing) cancel();
    }
  });
  global.HNRAudio = Object.freeze({ init, start, stop, cancel, put, get, list, remove, exportAll, importAll, supported, isRecording: () => !!session, limits: Object.freeze({ maxSeconds: MAX_SECONDS, maxFileBytes: MAX_BYTES, maxTotalBytes: MAX_TOTAL }) });
})(window);
