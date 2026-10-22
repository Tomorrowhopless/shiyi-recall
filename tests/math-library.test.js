import test from 'node:test';
import assert from 'node:assert/strict';
import { createCard, reviewCard, getQueue, DEFAULT_SETTINGS, exportBackup, parseBackup } from '../src/core.js';
import { mathCards, MATH_CONTENT_VERSION } from '../src/math-content.js';
import { upgradeMathLibrary, scopeCards } from '../src/math-library.js';
const now = new Date('2026-10-20T18:00:00Z');
test('one-time math upgrade preserves every English field, review record and daily setting',()=>{
  const reviewed=reviewCard(createCard({subject:'english',front:'retain',back:'记住',notes:'自己的笔记'},now),3,now);
  const original={cards:[reviewed.card],logs:[reviewed.log],settings:{...DEFAULT_SETTINGS,dailyNewLimit:7,mathLibraryVersion:0}};
  const snapshot=structuredClone(original);const result=upgradeMathLibrary(original,now);
  assert.deepEqual(original,snapshot);assert.deepEqual(result.data.cards[0],original.cards[0]);assert.equal(result.data.logs,original.logs);
  assert.equal(result.data.settings.dailyNewLimit,7);assert.equal(result.data.settings.mathLibraryVersion,MATH_CONTENT_VERSION);
  assert.equal(result.added,mathCards(now).length);assert.deepEqual(parseBackup(exportBackup(result.data)),result.data);
});
test('a reviewed or edited built-in is preserved and a deleted card stays deleted after upgrade',()=>{
  const builtin=mathCards(now)[0];const edited={...builtin,notes:'我的补充'};
  const initial={cards:[edited],logs:[],settings:{...DEFAULT_SETTINGS}};
  const result=upgradeMathLibrary(initial,now);assert.equal(result.data.cards.find(c=>c.id===builtin.id).notes,'我的补充');
  const removed={...result.data,cards:result.data.cards.filter(c=>c.id!==builtin.id)};
  const repeated=upgradeMathLibrary(removed,now);assert.equal(repeated.changed,false);assert.equal(repeated.data,removed);
});
test('course/type filters and review queue never mix the three mathematics courses or legacy physics',()=>{
  const legacy=createCard({subject:'physics',front:'旧资料',back:'保留在备份中'},now);
  const cards=[...mathCards(now),legacy,createCard({subject:'english',front:'word',back:'词'},now)];
  for(const course of ['calculus','probability','linear-algebra'])for(const type of ['formula','problem']){
    const selected=scopeCards(cards,{subject:'math',mathCourse:course,contentType:type});assert.ok(selected.length>0);
    assert.ok(selected.every(c=>c.mathCourse===course&&c.contentType===type));
    const queue=getQueue(selected,{newLimit:200,now});assert.deepEqual(queue,selected);
  }
  assert.ok(scopeCards(cards).every(c=>c.subject!=='physics'));assert.equal(scopeCards(cards,{subject:'english'}).length,1);
});
