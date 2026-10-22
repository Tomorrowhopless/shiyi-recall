import test from 'node:test';
import assert from 'node:assert/strict';
import { getEnglishSequence } from '../src/english-sequence.js';
import { getStudyContent } from '../src/english-study.js';
import { createCard, reviewCard } from '../src/core.js';

const now = new Date('2026-10-22T12:00:00Z');
const make = (front, back, tags = []) => createCard({ subject: 'english', front, back, tags }, now);

test('all English entries retain stored order despite dates, review state or other subjects', () => {
  const first = reviewCard(make('retain', '保留'), 4, now).card;
  const second = make('take into account', '考虑到', ['词组']);
  second.createdAt = '2020-01-01T00:00:00Z';
  const third = make('criteria', '标准', ['单词']);
  const math = createCard({ subject: 'math', front: '导数', back: '公式' }, now);
  const cards = [first, math, second, third];
  const before = structuredClone(cards);
  assert.deepEqual(getEnglishSequence(cards), [first, second, third]);
  assert.equal(getEnglishSequence(cards)[0], first);
  assert.deepEqual(cards, before);
});

test('both directions expose the same complete word and phrase pairs at every position', () => {
  const entries = [make('retain', '保留', ['单词']), make('in advance', '提前', ['词组'])];
  const sequence = getEnglishSequence(entries);
  for (const [index, card] of sequence.entries()) {
    const forward = getStudyContent(card, 'en-zh', true);
    const reverse = getStudyContent(sequence[index], 'zh-en', true);
    assert.equal(forward.question, reverse.answer);
    assert.equal(forward.answer, reverse.question);
  }
  assert.equal(sequence.length, entries.length);
});

test('repeated ratings do not reorder or remove entries and empty libraries stay empty', () => {
  const entries = [make('first', '第一'), make('second', '第二')];
  const ids = getEnglishSequence(entries).map(card => card.id);
  entries[0] = reviewCard(entries[0], 3, now).card;
  entries[1] = reviewCard(entries[1], 1, now).card;
  assert.deepEqual(getEnglishSequence(entries).map(card => card.id), ids);
  assert.deepEqual(getEnglishSequence([]), []);
});
