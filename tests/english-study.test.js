import test from 'node:test';
import assert from 'node:assert/strict';
import { getStudyContent } from '../src/english-study.js';
import { createCard, reviewCard, previewRatings, parseBackup, exportBackup, mergeBackup, DEFAULT_SETTINGS } from '../src/core.js';
const now = new Date('2026-10-22T12:00:00Z');
const make = (extra = {}) => createCard({subject:'english',front:'take into account',back:'考虑到',...extra},now);

test('forward English keeps existing question and answer, and speaks the English in both phases',()=>{
  const card=make();
  for(const revealed of [false,true]) {
    const c=getStudyContent(card,'en-zh',revealed);
    assert.equal(c.question,'take into account');assert.equal(c.answer,'考虑到');
    assert.equal(c.speechText,'take into account');assert.equal(c.isReverse,false);
  }
});
test('reverse English uses Chinese prompt and cannot speak the English answer before reveal',()=>{
  const card=make();
  const hidden=getStudyContent(card,'zh-en',false);
  assert.equal(hidden.question,'考虑到');assert.equal(hidden.answer,'take into account');
  assert.equal(hidden.speechText,'');assert.equal(hidden.isReverse,true);assert.equal(hidden.answerLabel,'英文答案');
  assert.equal(getStudyContent(card,'zh-en',true).speechText,'take into account');
});
test('English cloze speech masks every answer before reveal and speaks the complete sentence afterward',()=>{
  const card=make({kind:'cloze',front:'Take {{c1::cost::因素}} {{c2::into}} account.',back:'把成本考虑在内。'});
  const hidden=getStudyContent(card,'en-zh',false);
  assert.equal(hidden.question,'Take ［因素］ ［…］ account.');
  assert.equal(hidden.speechText,'Take blank blank account.');
  assert.equal(hidden.explanation,'把成本考虑在内。');
  assert.equal(getStudyContent(card,'en-zh',true).speechText,'Take cost into account.');
  const reverse=getStudyContent(card,'zh-en',false);
  assert.equal(reverse.question,'把成本考虑在内。');assert.equal(reverse.speechText,'');
  assert.equal(reverse.answer,'Take cost into account.');
  assert.equal(getStudyContent(card,'zh-en',true).speechText,'Take cost into account.');
});
test('reverse supports empty-back historical cloze without leaking English through question or audio',()=>{
  const card=make({kind:'cloze',front:'{{c1::retain}} information',back:''});
  const hidden=getStudyContent(card,'zh-en',false);
  assert.ok(hidden.question);assert.ok(!hidden.question.includes('retain'));assert.equal(hidden.speechText,'');
});
test('math cards keep their ordinary or cloze presentation in either English direction',()=>{
  for(const extra of [{front:'导数公式？',back:"$(uv)'=u'v+uv'$"},{kind:'cloze',front:String.raw`结果 {{c1::$\frac{a}{b}$}}`,back:'说明'}]) {
    const card=make({...extra,subject:'math'});
    assert.deepEqual(getStudyContent(card,'zh-en',false),getStudyContent(card,'en-zh',false));
    assert.equal(getStudyContent(card,'zh-en',true).speechText,'');
  }
});
test('switching directions is pure and retains the card identity, notes and FSRS scheduling outcomes',()=>{
  const card=reviewCard(make({notes:'context'}),3,now).card;
  const snapshot=structuredClone(card);const schedule=card.schedule;const previews=previewRatings(card,now);
  Object.freeze(card.schedule);Object.freeze(card);
  for(const direction of ['en-zh','zh-en'])for(const revealed of [false,true])getStudyContent(card,direction,revealed);
  assert.deepEqual(card,snapshot);assert.equal(card.schedule,schedule);assert.deepEqual(previewRatings(card,now),previews);
});
test('old backups acquire default English direction without changing stored card progress',()=>{
  const reviewed=reviewCard(make(),3,now);
  const legacy={app:'recall-garden',version:1,cards:[reviewed.card],logs:[reviewed.log],settings:{dailyNewLimit:10,mathLibraryVersion:0}};
  const parsed=parseBackup(JSON.stringify(legacy));
  assert.equal(parsed.settings.englishDirection,'en-zh');assert.deepEqual(parsed.cards[0],reviewed.card);
});
test('new English setting roundtrips and merge retains the current chosen direction',()=>{
  const card=make();const current={cards:[card],logs:[],settings:{...DEFAULT_SETTINGS,englishDirection:'zh-en'}};
  const restored=parseBackup(exportBackup(current,now));assert.deepEqual(restored,current);
  const incoming={cards:[],logs:[],settings:{...DEFAULT_SETTINGS,englishDirection:'en-zh'}};
  assert.equal(mergeBackup(restored,incoming).settings.englishDirection,'zh-en');
  const invalid=JSON.parse(exportBackup(current,now));invalid.settings.englishDirection='both';
  assert.throws(()=>parseBackup(JSON.stringify(invalid)),/方向/);
  assert.throws(()=>exportBackup({...current,settings:{englishDirection:'invalid'}}),/方向/);
});
