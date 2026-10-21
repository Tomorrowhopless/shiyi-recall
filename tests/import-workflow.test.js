import test from 'node:test';
import assert from 'node:assert/strict';
import { removableExamples, prepareImport } from '../src/import-workflow.js';
import { seedCards } from '../src/seed.js';
import { createCard, updateCard, reviewCard, exportBackup, parseBackup } from '../src/core.js';

const now = new Date('2026-10-20T15:00:00Z');
const base = () => ({ cards:seedCards(now), logs:[], settings:{dailyNewLimit:7} });
function vocabulary() {
  return {
    cards:[{...createCard({subject:'english',front:'synthetic vocabulary',back:'合成测试词'},now),id:'readinglab-v1-synthetic'}],
    logs:[],settings:{dailyNewLimit:20},importInfo:{type:'readinglab',words:1,phrases:0},
  };
}
test('Reading Lab import can remove all 21 untouched examples and preserves custom cards/settings',()=>{
  const current=base();
  const customMath=createCard({subject:'math',front:'A custom math question',back:'Answer'},now);
  const customPhysics=createCard({subject:'physics',front:'A custom physics question',back:'Answer'},now);
  current.cards.push(customMath,customPhysics);
  const before=JSON.stringify(current),incoming=vocabulary(),incomingBefore=JSON.stringify(incoming);
  const result=prepareImport(current,incoming,{removeExamples:true});
  assert.equal(result.removed.length,21);
  assert.equal(result.added,1);
  assert.equal(result.existing,0);
  assert.equal(result.data.cards.length,3);
  assert.ok(result.data.cards.some(c=>c.id===customMath.id));
  assert.ok(result.data.cards.some(c=>c.id===customPhysics.id));
  assert.equal(result.data.settings.dailyNewLimit,7);
  assert.deepEqual(parseBackup(exportBackup(result.data)),result.data);
  assert.equal(JSON.stringify(current),before);
  assert.equal(JSON.stringify(incoming),incomingBefore);
});
test('edited content, edited tags, reviewed examples and log-referenced examples remain protected',()=>{
  const current=base();
  current.cards[0]=updateCard(current.cards[0],{notes:'My own explanation'},new Date(+now+1));
  current.cards[1]=updateCard(current.cards[1],{tags:['我的标签']},new Date(+now+1));
  const result=reviewCard(current.cards[2],3,now);current.cards[2]=result.card;current.logs.push(result.log);
  const protectedLog=reviewCard(current.cards[3],1,now).log;current.logs.push(protectedLog);
  const removable=removableExamples(current.cards,current.logs);
  assert.equal(removable.length,17);
  const imported=prepareImport(current,vocabulary(),{removeExamples:true});
  assert.equal(imported.removed.length,17);
  for(const card of current.cards.slice(0,4))assert.ok(imported.data.cards.some(c=>c.id===card.id));
  assert.deepEqual(imported.data.logs,current.logs);
});
test('cleanup is opt-in and cannot run for ordinary backup imports',()=>{
  const current=base(),incoming=vocabulary();
  assert.equal(prepareImport(current,incoming).removed.length,0);
  assert.equal(prepareImport(current,incoming).data.cards.length,22);
  const normal={...incoming};delete normal.importInfo;
  const result=prepareImport(current,normal,{removeExamples:true});
  assert.equal(result.removed.length,0);
  assert.equal(result.data.cards.length,22);
});
test('repeated Reading Lab imports preserve all existing local edits, FSRS progress and logs',()=>{
  const initial=prepareImport(base(),vocabulary(),{removeExamples:true}).data;
  const reviewed=reviewCard(initial.cards[0],4,now);
  initial.cards[0]=updateCard(reviewed.card,{front:'My edited front',back:'My meaning',notes:'My durable note',tags:['custom']},new Date(+now+100));
  initial.logs.push(reviewed.log);
  const incoming=vocabulary();incoming.cards[0].updatedAt=new Date(+now+10000).toISOString();incoming.cards[0].notes='New source note';
  const result=prepareImport(initial,incoming,{removeExamples:true});
  assert.equal(result.added,0);
  assert.equal(result.existing,1);
  assert.equal(result.removed.length,0);
  assert.deepEqual(result.data,initial);
});
test('ordinary backup imports still merge newer content and preserve newer learning schedules',()=>{
  const current=vocabulary();delete current.importInfo;
  const reviewed=reviewCard(current.cards[0],3,now);current.cards[0]=reviewed.card;current.logs=[reviewed.log];
  const incoming=vocabulary();delete incoming.importInfo;
  incoming.cards[0].back='New source content';incoming.cards[0].updatedAt=new Date(+now+1000).toISOString();
  const result=prepareImport(current,incoming,{removeExamples:true});
  assert.equal(result.data.cards[0].back,'New source content');
  assert.equal(result.data.cards[0].schedule.reps,1);
  assert.deepEqual(result.data.logs,current.logs);
});
test('validation failures leave both datasets untouched and never perform example cleanup',()=>{
  const current=base(),before=JSON.stringify(current);
  const incoming=vocabulary();incoming.cards[0].back='';const badBefore=JSON.stringify(incoming);
  assert.throws(()=>prepareImport(current,incoming,{removeExamples:true}),/答案/);
  assert.equal(JSON.stringify(current),before);
  assert.equal(JSON.stringify(incoming),badBefore);
  assert.equal(removableExamples(current.cards,current.logs).length,21);
  const large=vocabulary();const sample=large.cards[0];large.cards=Array.from({length:20001},(_,i)=>({...sample,id:'oversize-'+i}));
  assert.throws(()=>prepareImport(current,large,{removeExamples:true}),/限制/);
  assert.equal(JSON.stringify(current),before);
});
test('Reading Lab conversion cannot smuggle FSRS review history into an existing card',()=>{
  const current=base(),incoming=vocabulary();incoming.logs=[reviewCard(incoming.cards[0],3,now).log];
  assert.throws(()=>prepareImport(current,incoming),/不应包含/);
});
