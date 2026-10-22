import test from 'node:test';
import assert from 'node:assert/strict';
import { createCard, updateCard, parseCloze, previewRatings, reviewCard, getQueue, getStats, exportBackup, parseBackup, mergeBackup } from '../src/core.js';
import { seedCards, SEED_COUNT } from '../src/seed.js';
const now = new Date('2026-10-20T12:00:00Z');
const make = (input={}) => createCard({ subject:'math',front:'问题',back:'答案',...input }, now);

test('FSRS schedules real ratings and preserves serialized dates', () => {
  const c = make();
  const previews = previewRatings(c, now);
  assert.equal(previews.length, 4);
  assert.ok(previews.every(p => p.intervalMs > 0 && Number.isFinite(Date.parse(p.due))));
  const {card,log} = reviewCard(c,3,now);
  assert.equal(card.schedule.reps,1);
  assert.equal(c.schedule.reps,0);
  assert.equal(card.schedule.due,previews[2].due);
  assert.equal(log.cardId,c.id);
  assert.equal(log.rating,3);
  assert.equal(previewRatings(JSON.parse(JSON.stringify(card)),new Date(Date.parse(card.schedule.due)+1000)).length,4);
});
test('due queue puts reviews first and enforces actual remaining daily new cap', () => {
  const fresh = [make(),make(),make()];
  const reviewed = reviewCard(make(),1,now);
  const later = new Date(+now+11*60*1000);
  const queue = getQueue([...fresh,reviewed.card],{ now:later,newLimit:2,logs:[reviewed.log] });
  assert.equal(queue[0].id,reviewed.card.id);
  assert.equal(queue.length,2);
  assert.equal(getQueue([reviewCard(make(),4,now).card],{now}).length,0);
  assert.equal(getQueue(fresh,{subject:'english',now}).length,0);
});
test('cloze masks every marked answer, supports hints and reveals plain content', () => {
  const c = parseCloze('Use {{c1::into}} account; {{c2::mass::名词}}.');
  assert.equal(c.question,'Use ［…］ account; ［名词］.');
  assert.equal(c.answer,'Use into account; mass.');
  assert.deepEqual(c.answers,['into','mass']);
  assert.throws(()=>make({kind:'cloze'}),/填空/);
});
test('editing a reviewed card preserves its learning schedule', () => {
  const c = reviewCard(make(),3,now).card;
  const edited = updateCard(c,{front:'新的问题'},new Date(+now+10000));
  assert.equal(edited.id,c.id); assert.deepEqual(edited.schedule,c.schedule);
  assert.equal(edited.front,'新的问题');
});
test('backup roundtrip keeps cards, notes, ratings and local settings', () => {
  const r = reviewCard(make({notes:'<script>plain text only</script>'}),3,now);
  const data = {cards:[r.card],logs:[r.log],settings:{dailyNewLimit:10,mathLibraryVersion:0,englishDirection:'en-zh'}};
  const parsed = parseBackup(exportBackup(data,now));
  assert.deepEqual(parsed,data);
});
test('merge preserves more recent progress even if an unreviewed backup was edited later', () => {
  const first = make();
  const reviewed = reviewCard(first,3,now);
  const edited = updateCard(first,{front:'更新的题目'},new Date(+now+60000));
  const current = {cards:[reviewed.card],logs:[reviewed.log],settings:{dailyNewLimit:10,mathLibraryVersion:0,englishDirection:'en-zh'}};
  const incoming = {cards:[edited],logs:[reviewed.log],settings:{dailyNewLimit:20}};
  const merged = mergeBackup(current,incoming);
  assert.equal(merged.cards[0].front,'更新的题目');
  assert.equal(merged.cards[0].schedule.reps,1);
  assert.equal(merged.logs.length,1);
  assert.equal(merged.settings.dailyNewLimit,10);
});
test('invalid backup is rejected before any merge including duplicates and corrupted schedules', () => {
  const data = JSON.parse(exportBackup({cards:[make()],logs:[],settings:{}},now));
  assert.throws(()=>parseBackup('not JSON'),/JSON/);
  assert.throws(()=>parseBackup(JSON.stringify({...data,version:999})),/版本/);
  assert.throws(()=>parseBackup(JSON.stringify({...data,cards:[data.cards[0],data.cards[0]]})),/重复/);
  const missingReview = structuredClone(data);
  missingReview.cards[0].schedule.reps=1; missingReview.cards[0].schedule.state=2;
  assert.throws(()=>parseBackup(JSON.stringify(missingReview)),/进度/);
  data.cards[0].schedule.due='invalid';
  assert.throws(()=>parseBackup(JSON.stringify(data)),/时间/);
});
test('stats count learned cards, today reviews and streak without labelling new cards due', () => {
  const r = reviewCard(make(),3,now);
  const stats = getStats([r.card,make()],[r.log],now);
  assert.deepEqual(stats,{total:2,due:0,new:1,learned:1,reviewsToday:1,streak:1});
});
test('seed examples are valid backup cards and span all requested subjects', () => {
  const cards = seedCards(now);
  assert.equal(cards.length,SEED_COUNT);
  assert.equal(cards.length,21);
  assert.deepEqual([...new Set(cards.map(c=>c.subject))].sort(),['english','math','physics']);
  assert.equal(parseBackup(exportBackup({cards,logs:[]},now)).cards.length,21);
  assert.equal(cards.filter(c=>c.kind==='cloze').length,3);
});

test('cloze preserves LaTeX fraction grouping braces and hides the complete expression', () => {
  const source = String.raw`结果为 {{c1::$\frac{a}{b}$}}；再写 {{c2::\frac{x+1}{y}}}。`;
  const parsed = parseCloze(source);
  assert.equal(parsed.question, '结果为 ［…］；再写 ［…］。');
  assert.equal(parsed.answer, String.raw`结果为 $\frac{a}{b}$；再写 \frac{x+1}{y}。`);
  assert.deepEqual(parsed.answers, [String.raw`$\frac{a}{b}$`, String.raw`\frac{x+1}{y}`]);
  assert.equal(make({kind:'cloze',front:source,back:''}).kind, 'cloze');
});
test('cloze supports multiline answers, math grouping inside hints and escaped braces', () => {
  const source = String.raw`{{c1::first
second::$\frac{1}{2}$}} and {{c2::$\{x\}$::集合}}`;
  const parsed = parseCloze(source);
  assert.equal(parsed.question, String.raw`［$\frac{1}{2}$］ and ［集合］`);
  assert.equal(parsed.answer, 'first\nsecond and $\\{x\\}$');
  assert.deepEqual(parsed.answers, ['first\nsecond', String.raw`$\{x\}$`]);
});
test('unclosed or unbalanced cloze markers remain plain text without losing subsequent content', () => {
  for (const source of [String.raw`prefix {{c1::$\frac{a}{b}$`, String.raw`{{c1::\frac{a}{b}`, '{{c1::}}', 'ordinary {text}']) {
    assert.deepEqual(parseCloze(source), {question:source,answer:source,answers:[]});
  }
  const parsed = parseCloze('broken {{c1::oops then valid {{c2::yes}}');
  assert.equal(parsed.question,'broken {{c1::oops then valid ［…］');
  assert.equal(parsed.answer,'broken {{c1::oops then valid yes');
  assert.deepEqual(parsed.answers,['yes']);
});
