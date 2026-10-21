import { exportBackup, parseBackup, mergeBackup } from './core.js';
import { seedCards } from './seed.js';

const examples = new Map(seedCards(new Date(0)).map(card => [card.id, card]));
const contentFields = ['front', 'back', 'notes', 'kind', 'subject'];

/** Only exact, unreviewed built-in examples can be removed by an import. */
export function removableExamples(cards, logs = []) {
  const logged = new Set(logs.map(log => log.cardId));
  return cards.filter(card => {
    const original = examples.get(card.id);
    return original && card.schedule?.reps === 0 && !logged.has(card.id)
      && contentFields.every(field => card[field] === original[field])
      && JSON.stringify(card.tags) === JSON.stringify(original.tags);
  });
}

/** Prepare an atomic result; callers retain the current data until persistence succeeds. */
export function prepareImport(current, incoming, { removeExamples = false } = {}) {
  // Validate both complete datasets before considering cleanup, without changing the inputs.
  const cleanCurrent = parseBackup(exportBackup(current));
  const cleanIncoming = parseBackup(exportBackup(incoming));
  const readingLab = incoming.importInfo?.type === 'readinglab';
  if (readingLab && cleanIncoming.logs.length) throw new Error('Reading Lab 转换数据不应包含拾忆复习记录，请重新选择原始资料。');
  const existingIds = new Set(cleanCurrent.cards.map(card => card.id));
  const existing = cleanIncoming.cards.filter(card => existingIds.has(card.id)).length;
  const added = cleanIncoming.cards.length - existing;
  const forMerge = readingLab ? {
    ...cleanIncoming,
    cards: cleanIncoming.cards.filter(card => !existingIds.has(card.id)),
  } : cleanIncoming;
  let data = mergeBackup(cleanCurrent, forMerge);
  let removed = [];
  if (readingLab && removeExamples) {
    removed = removableExamples(cleanCurrent.cards, cleanCurrent.logs);
    const removable = new Set(removed.map(card => card.id));
    data = { ...data, cards: data.cards.filter(card => !removable.has(card.id)) };
  }
  // Validate capacity, schedules, and the final serializable backup before a caller can save.
  data = parseBackup(exportBackup(data));
  return { data, removed, added, existing };
}
