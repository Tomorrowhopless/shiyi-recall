import { englishSpeechText, selectEnglishVoice } from './english-speech-text.js';

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
  let startTimer = null;
  function clearStartTimer() { clearTimeout(startTimer); startTimer = null; }
  const emit = (status, message = '', voice) => onState({ status, message, ...(voice ? { voice } : {}) });
  function clearPending() {
    pendingCleanup?.();
    pendingCleanup = null;
  }
  function stop() {
    token++;
    clearPending();
    clearStartTimer();
    current = null;
    try { synthesis?.cancel(); } catch { /* Cancellation must remain safe on a torn-down page. */ }
  }
  function cancel() { stop(); emit('idle'); }
  function speak(text) {
    stop();
    const request = token;
    const content = englishSpeechText(text);
    if (!content) { emit('idle', '当前没有可朗读的英文。'); return; }
    if (!synthesis || typeof synthesis.speak !== 'function' || typeof synthesis.getVoices !== 'function' || typeof Utterance !== 'function') {
      emit('error', '当前浏览器不支持朗读，请换用支持系统语音的浏览器。'); return;
    }
    emit('loading', '正在准备英语语音…');
    function launch(voices) {
      if (request !== token) return;
      clearPending();
      const selected = selectEnglishVoice(voices);
      if (!selected) {
        emit('error', '未找到英语语音，请在系统语音设置中添加英语语音后重试。'); return;
      }
      function attempt(selectedVoice, allowFallback, fallback = false) {
        if (request !== token) return;
        clearStartTimer();
        const voice = { name: selectedVoice.name || '', lang: selectedVoice.lang, localService: selectedVoice.localService === true };
        emit('loading', fallback ? '正在切换本地英语语音…' : '正在准备英语语音…', voice);
        if (request !== token) return;
        function tryLocalFallback() {
          if (!allowFallback || request !== token) return false;
          const local = voicesNow().filter(candidate => candidate.localService === true && candidate !== selectedVoice
            && !(candidate.name === selectedVoice.name && candidate.lang === selectedVoice.lang));
          const standard = ['Samantha', 'Alex', 'Daniel'].map(name => selectEnglishVoice(local.filter(candidate => new RegExp(`\\b${name}\\b`, 'i').test(candidate.name || '')))).find(Boolean)
            || selectEnglishVoice(local);
          if (!standard) return false;
          // Invalidate the previous utterance before cancel() can dispatch its callbacks.
          clearStartTimer();
          current = null;
          try { synthesis.cancel(); } catch { /* The explicit replacement may still work. */ }
          if (request !== token) return true;
          attempt(standard, false, true);
          return true;
        }
        try {
          const utterance = new Utterance(content);
          let started = false;
          current = utterance;
          utterance.lang = selectedVoice.lang;
          utterance.rate = 0.85;
          utterance.voice = selectedVoice;
          utterance.onstart = () => {
            if (request !== token || current !== utterance) return;
            started = true;
            clearStartTimer();
            emit('speaking', '正在朗读', voice);
          };
          utterance.onend = () => {
            if (request !== token || current !== utterance) return;
            clearStartTimer();
            current = null;
            if (!started) {
              if (tryLocalFallback()) return;
              emit('error', '英语语音未实际开始播放，请重新播放或检查系统英语语音。', voice);
              return;
            }
            emit('ended', '朗读完成', voice);
          };
          utterance.onerror = event => {
            if (request !== token || current !== utterance) return;
            clearStartTimer();
            current = null;
            // Native engines report these for normal stop/replacement, not a failed voice.
            if (event?.error === 'canceled' || event?.error === 'interrupted') { emit('idle'); return; }
            if (['network', 'voice-unavailable'].includes(event?.error) && tryLocalFallback()) return;
            emit('error', ERROR_MESSAGES[event?.error] || '朗读未能完成，请重新播放或检查系统英语语音。', voice);
          };
          // Some engines remain silent without dispatching any native event.
          startTimer = setTimeout(() => {
            if (request !== token || current !== utterance || started) return;
            clearStartTimer();
            current = null;
            if (tryLocalFallback()) return;
            try { synthesis.cancel(); } catch { /* Report failure even if cancellation fails. */ }
            if (request !== token) return;
            emit('error', '英语语音未能开始，请点击重播或检查系统声音与英语语音。', voice);
          }, 8000);
          synthesis.resume?.();
          if (request !== token || current !== utterance) return;
          synthesis.speak(utterance);
        } catch {
          if (request !== token) return;
          clearStartTimer();
          current = null;
          emit('error', '无法启动朗读，请重新点击播放或检查系统语音设置。', voice);
        }
      }
      attempt(selected, true);
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
