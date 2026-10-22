/** Prepare English-only speech without modifying the source card or its visible text. */
export function englishSpeechText(value) {
  if (typeof value !== 'string') return '';
  const text = value
    .replace(/\$\$[\s\S]*?\$\$|\$[^$]*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    // Pronunciation annotations are display aids, not words to synthesize.
    .replace(/(^|\s)\/[^/\n]+\/(?=$|\s|[^\p{Script=Latin}])/gu, '$1 ')
    .replace(/\[[^\]\n]*[\u0250-\u02ff\u1d00-\u1dbfˈˌ][^\]\n]*\]/gu, ' ')
    .replace(/[，、；：。！？]/g, character => ({'，':',','、':',','；':';','：':':','。':'.','！':'!','？':'?'}[character]) + ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\p{Script=Latin}\p{M}0-9\s.,!?;:'"()\-\/]/gu, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/^[\s.,!?;:'"()\-\/]+|[\s.,!?;:'"()\-\/]+$/g, '')
    .trim();
  return /[A-Za-z]/.test(text) ? text : '';
}

// These platform novelty/character voices do not model ordinary spoken pronunciation.
const NOVELTY_VOICE = /\b(?:albert|bad[ -]+news|bahh|bells|boing|bubbles|cellos|good[ -]+news|(?:pipe[ -]+)?organ|superstar|trinoids|whisper|wobble|zarvox|jester|junior|ralph|deranged|hysterical|princess|buzzer|novelty|singing|robot)\b/i;

/** Quality labels are platform naming hints; Web Speech exposes no quality rating. */
export function selectEnglishVoice(voices) {
  const candidates = voices.filter(voice => /^en(?:[-_]|$)/i.test(voice.lang || '') && !NOVELTY_VOICE.test(voice.name || ''));
  const quality = voice => /\b(?:natural|neural|premium|enhanced)\b/i.test(voice.name || '');
  const us = voice => /^en[-_]US(?:[-_]|$)/i.test(voice.lang || '');
  function score(voice) {
    const name = voice.name || '';
    let result = (us(voice) ? 1000 : 0) + (quality(voice) ? 100 : 0) + (voice.localService ? 5 : 0);
    // Prefer these standard US natural voices when the browser exposes them.
    if (us(voice) && quality(voice) && /\bmicrosoft\b.*\baria\b/i.test(name)) result += 40;
    else if (us(voice) && quality(voice) && /\bmicrosoft\b.*\bjenny\b/i.test(name)) result += 30;
    // Familiar ordinary local voices beat unspecified legacy local engines.
    if (us(voice) && voice.localService && /\b(?:samantha|alex)\b/i.test(name)) result += 20;
    return result;
  }
  return candidates.reduce((best, voice) => !best || score(voice) > score(best) ? voice : best, null);
}
