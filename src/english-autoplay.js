import { getStudyContent } from './english-study.js';

/** Deduplicate automatic speech cues; manual replay/stop remain independent. */
export function createEnglishAutoplay({ speak, cancel }) {
  let previousKey = '';
  function sync({ page, card, direction = 'en-zh', revealed = false, blocked = false }) {
    const text = page === 'study' && card?.subject === 'english' && !blocked
      ? getStudyContent(card, direction, revealed).speechText.replace(/\$[^$]*\$/g, '').trim()
      : '';
    if (!text) {
      if (previousKey) {
        previousKey = '';
        cancel();
      }
      return false;
    }
    const key = JSON.stringify([card.id, direction, text]);
    if (key === previousKey) return false;
    // Speech callbacks may synchronously update the UI and re-enter sync().
    previousKey = key;
    speak(text);
    return true;
  }
  function reset() {
    previousKey = '';
    cancel();
  }
  return { sync, reset };
}
