const ERROR_MESSAGES = {
  'language-unavailable': '英语语音不可用，请在系统设置中添加英语语音后重试。',
  'voice-unavailable': '所选英语语音不可用，请重新播放或检查系统语音设置。',
  'audio-busy': '音频设备正忙，请稍后重新播放。',
  'audio-hardware': '音频设备不可用，请检查声音输出后重试。',
  'not-allowed': '浏览器未允许自动朗读，请点击重播按钮重试并检查声音权限。',
  'network': '语音服务连接失败，请检查网络或安装本地英语语音后重试。',
  'synthesis-unavailable': '系统朗读服务不可用，请检查系统语音设置后重试。',
  'text-too-long': '这段文字过长，请缩短后再播放。',
};

/** User-triggered speech with cancellation-safe callbacks and bounded voice discovery. */
export function createEnglishSpeech({
  onState = () => {},
  synthesis = globalThis.speechSynthesis,
  Utterance = globalThis.SpeechSynthesisUtterance,
} = {}) {
  let token = 0;
  let current = null; // Keep a strong reference for browsers that otherwise stop utterances early.
  let pendingCleanup = null;
  const emit = (status, message = '') => onState({ status, message });
  function clearPending() {
    pendingCleanup?.();
    pendingCleanup = null;
  }
  function stop() {
    token++;
    clearPending();
    current = null;
    try { synthesis?.cancel(); } catch { /* Cancellation must remain safe on a torn-down page. */ }
  }
  function cancel() { stop(); emit('idle'); }
  function speak(text) {
    stop();
    const request = token;
    const content = typeof text === 'string' ? text.trim() : '';
    if (!content) { emit('idle', '当前没有可朗读的英文。'); return; }
    if (!synthesis || typeof synthesis.speak !== 'function' || typeof synthesis.getVoices !== 'function' || typeof Utterance !== 'function') {
      emit('error', '当前浏览器不支持朗读，请换用支持系统语音的浏览器。'); return;
    }
    emit('loading', '正在准备英语语音…');
    function launch(voices) {
      if (request !== token) return;
      clearPending();
      const english = voices.filter(voice => /^en(?:[-_]|$)/i.test(voice.lang || ''));
      const selected = english.find(voice => voice.localService && /^en[-_]US$/i.test(voice.lang))
        || english.find(voice => voice.localService)
        || english.find(voice => /^en[-_]US$/i.test(voice.lang))
        || english[0];
      if (voices.length && !selected) {
        emit('error', '未找到英语语音，请在系统语音设置中添加英语语音后重试。'); return;
      }
      try {
        const utterance = new Utterance(content);
        current = utterance;
        utterance.lang = selected?.lang || 'en-US';
        utterance.rate = 0.85;
        if (selected) utterance.voice = selected;
        utterance.onstart = () => {
          if (request === token && current === utterance) emit('speaking', '正在朗读');
        };
        utterance.onend = () => {
          if (request !== token || current !== utterance) return;
          current = null;
          emit('ended', '朗读完成');
        };
        utterance.onerror = event => {
          if (request !== token || current !== utterance) return;
          current = null;
          // Native engines report these for normal stop/replacement, not a failed voice.
          if (event?.error === 'canceled' || event?.error === 'interrupted') { emit('idle'); return; }
          emit('error', ERROR_MESSAGES[event?.error] || '朗读未能完成，请重新播放或检查系统英语语音。');
        };
        synthesis.speak(utterance);
      } catch {
        if (request !== token) return;
        current = null;
        emit('error', '无法启动朗读，请重新点击播放或检查系统语音设置。');
      }
    }
    function voicesNow() {
      try { const voices = synthesis.getVoices(); return Array.isArray(voices) ? voices : []; }
      catch { return []; }
    }
    const initial = voicesNow();
    if (initial.length) { launch(initial); return; }
    let timer;
    const changed = () => {
      if (request !== token) return;
      const voices = voicesNow();
      if (voices.length) launch(voices);
    };
    pendingCleanup = () => {
      clearTimeout(timer);
      synthesis.removeEventListener?.('voiceschanged', changed);
    };
    synthesis.addEventListener?.('voiceschanged', changed);
    timer = setTimeout(() => launch(voicesNow()), 1500);
  }
  return { speak, cancel };
}
