/** Both recall directions traverse the same stored entries, including already learned ones. */
export function getEnglishSequence(cards) {
  return cards.filter(card => card.subject === 'english');
}
