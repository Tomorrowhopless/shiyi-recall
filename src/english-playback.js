import { createEnglishSpeech } from './english-speech.js';
import { englishSpeechText } from './english-speech-text.js';

export const LOCAL_SPEECH_CHANNEL = 'shiyi-wordworkshop-speech-v1';
const CORI = { name: 'Piper Cori', lang: 'en-GB', localService: true };
const makeId = () => globalThis.crypto?.randomUUID?.() || `shiyi-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Split only the spoken text; a card keeps its identity, content and review schedule. */
export function splitSpeechText(text, limit = 240) {
  const chunks = [];
  let rest = text.trim();
  while (rest.length > limit) {
    const space = rest.lastIndexOf(' ', limit);
    const end = space > 0 ? space : limit;
    chunks.push(rest.slice(0, end));
    rest = rest.slice(end).trimStart();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

/** Prefer the installed offline dictionary, with ordinary English speech for other visitors. */
export function createEnglishPlayback({
  onState = () => {},
  target = globalThis.window,
  origin = target?.location?.origin || '',
  id = makeId,
  createFallback = createEnglishSpeech,
  probeTimeout = 650,
  localTimeout = 90000,
} = {}) {
  const clientId = id();
  let serial = 0;
  let mode = '';
  let active = null;
  let probe = null;
  let probeTimer = null;
  let retryTimer = null;
  let localTimer = null;
  let disposed = false;
  const fallback = createFallback({ onState: state => { if (mode === 'browser' && !disposed) onState(state); } });
  const emit = (status, message, voice = CORI) => onState({ status, message, ...(voice ? { voice } : {}) });
  const post = (action, requestId, extra = {}) => {
    target.postMessage({ channel: LOCAL_SPEECH_CHANNEL, from: 'shiyi', action, clientId, requestId, ...extra }, origin);
  };
  function clearProbe() {
    clearTimeout(probeTimer); clearTimeout(retryTimer);
    probeTimer = retryTimer = null;
    probe = null;
  }
  function clearLocalTimer() { clearTimeout(localTimer); localTimer = null; }
  function stopActive() {
    clearProbe(); clearLocalTimer();
    const previous = active;
    active = null;
    if (mode === 'local' && previous) post('stop', previous.requestId);
    if (mode === 'browser') fallback.cancel();
    mode = '';
  }
  function cancel() {
    serial++;
    stopActive();
    if (!disposed) emit('idle', '', null);
  }
  function failLocal(message) {
    const previous = active;
    active = null;
    clearLocalTimer();
    if (previous) post('stop', previous.requestId);
    emit('error', message || '本地英语语音未能播放，请重新加载词典插件后重播。');
  }
  function armLocalTimer() {
    clearLocalTimer();
    const record = active;
    localTimer = setTimeout(() => {
      if (active === record && record) failLocal('本地英语语音响应超时，请重新加载词典插件后重播。');
    }, localTimeout);
  }
  function startChunk() {
    const record = active;
    if (!record || disposed) return;
    record.requestId = id();
    record.started = false;
    emit('loading', '正在生成本地英语读音…');
    // Status callbacks can synchronously cancel or replace this card.
    if (active !== record) return;
    armLocalTimer();
    post('speak', record.requestId, { text: record.chunks[record.index] });
  }
  function useBrowser(text, ticket) {
    if (ticket !== serial || disposed) return;
    clearProbe();
    mode = 'browser';
    fallback.speak(text);
  }
  function onMessage(event) {
    const message = event.data;
    if (disposed || event.source !== target || event.origin !== origin || !message ||
        message.channel !== LOCAL_SPEECH_CHANNEL || message.from !== 'wordworkshop' || message.clientId !== clientId) return;
    if (message.action === 'ready' && probe && message.requestId === probe.requestId) {
      const pending = probe;
      if (!message.ok || message.voice !== CORI.name || message.lang !== CORI.lang) {
        useBrowser(pending.text, pending.ticket); return;
      }
      clearProbe();
      if (pending.ticket !== serial) return;
      mode = 'local';
      active = { requestId: '', chunks: splitSpeechText(pending.text), index: 0, started: false };
      startChunk();
      return;
    }
    const record = active;
    if (mode !== 'local' || !record || message.requestId !== record.requestId) return;
    if (message.action === 'result') {
      if (message.ok === false) failLocal(typeof message.error === 'string' ? message.error : '本地英语语音未能启动，请重播。');
      return; // A successful request is not proof that audio played.
    }
    if (message.action !== 'state') return;
    if (message.stage === 'preparing') emit('loading', '正在生成本地英语读音…');
    else if (message.stage === 'playing') {
      record.started = true;
      armLocalTimer();
      emit('speaking', '正在朗读');
    } else if (message.stage === 'ended') {
      if (!record.started) { failLocal('本地语音未确认开始播放，请重播。'); return; }
      clearLocalTimer();
      record.index++;
      if (record.index < record.chunks.length) startChunk();
      else { active = null; emit('ended', '朗读完成'); }
    } else if (message.stage === 'stopped') {
      active = null; clearLocalTimer(); emit('idle', '朗读已停止', null);
    } else if (message.stage === 'error') {
      failLocal(typeof message.error === 'string' ? message.error : '本地英语语音未能播放，请重播。');
    }
  }
  target?.addEventListener?.('message', onMessage);
  function speak(value) {
    const ticket = ++serial;
    stopActive();
    const text = englishSpeechText(value);
    if (disposed || !text) { if (!disposed) emit('idle', '当前没有可朗读的英文。', null); return; }
    if (!target?.postMessage || !origin || origin === 'null') { useBrowser(text, ticket); return; }
    const requestId = id();
    probe = { requestId, text, ticket };
    emit('loading', '正在连接本地英语语音…', null);
    if (!probe || ticket !== serial) return;
    probeTimer = setTimeout(() => useBrowser(text, ticket), probeTimeout);
    retryTimer = setTimeout(() => { if (probe?.requestId === requestId) post('probe', requestId); }, Math.min(180, probeTimeout / 2));
    post('probe', requestId);
  }
  function dispose() {
    cancel();
    disposed = true;
    target?.removeEventListener?.('message', onMessage);
  }
  return { speak, cancel, dispose };
}
