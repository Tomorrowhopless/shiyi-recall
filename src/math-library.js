import { mathCards, MATH_CONTENT_VERSION } from './math-content.js';

// Physics remains readable in old backups but is outside the active learning space.
export const activeCards = cards => cards.filter(card => ['math', 'english'].includes(card.subject));
export function scopeCards(cards, { subject = 'all', mathCourse = 'all', contentType = 'all' } = {}) {
  return activeCards(cards).filter(card => (subject === 'all' || card.subject === subject)
    && (subject !== 'math' || mathCourse === 'all' || card.mathCourse === mathCourse)
    && (subject !== 'math' || contentType === 'all' || card.contentType === contentType));
}
export function upgradeMathLibrary(current, now = new Date()) {
  if ((current.settings.mathLibraryVersion ?? 0) >= MATH_CONTENT_VERSION) return { data: current, added: 0, changed: false };
  const ids = new Set(current.cards.map(card => card.id));
  const added = mathCards(now).filter(card => !ids.has(card.id));
  return { data: { ...current, cards: [...current.cards, ...added], settings: { ...current.settings, mathLibraryVersion: MATH_CONTENT_VERSION } }, added: added.length, changed: true };
}
