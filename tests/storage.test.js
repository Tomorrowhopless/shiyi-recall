import test from 'node:test';
import assert from 'node:assert/strict';
import { loadData, saveData, recoverData, STORAGE_KEY } from '../src/storage.js';
import { createCard, exportBackup, parseBackup, DEFAULT_SETTINGS } from '../src/core.js';
import { mathCards, MATH_CONTENT_VERSION } from '../src/math-content.js';
const sample = () => ({cards:[createCard({subject:'english',front:'retain',back:'保留；记住'})],logs:[],settings:{...DEFAULT_SETTINGS,dailyNewLimit:10}});
function storage(initial = null) {
  let raw = initial;
  const api = {
    denyRead: false, denyWrite: false,
    getItem(key) { assert.equal(key,STORAGE_KEY); if(this.denyRead) throw new Error('SecurityError'); return raw; },
    setItem(key,value) { assert.equal(key,STORAGE_KEY); if(this.denyWrite) throw new Error('QuotaExceededError'); raw=value; },
    value: () => raw,
    externalWrite: value => {raw=value;},
  };
  globalThis.localStorage=api;
  return api;
}

test('first run creates classified mathematics without physics, and reload preserves the library',()=>{
  const store=storage(); const loaded=loadData();
  assert.equal(loaded.firstRun,true);assert.ok(loaded.data.cards.every(c=>c.subject==='math'));assert.equal(loaded.data.settings.mathLibraryVersion,MATH_CONTENT_VERSION); assert.equal(loaded.data.cards.length,mathCards().length); assert.equal(store.value(),null);
  saveData(loaded.data);
  assert.equal(loadData().firstRun,false); assert.equal(loadData().data.cards.length,mathCards().length);
});
test('denied storage load returns usable error state without throwing or claiming first run',()=>{
  const store=storage();store.denyRead=true;
  const loaded=loadData();
  assert.deepEqual(loaded.data.cards,[]);assert.equal(loaded.raw,null);assert.equal(loaded.firstRun,false);
  assert.match(loaded.error,/不允许读取/);
  assert.throws(()=>recoverData(sample(),loaded.raw),/没有可恢复/);
  assert.throws(()=>saveData(sample()),/不允许读取/);
});
test('corrupt original remains unchanged until explicit successful recovery',()=>{
  const original='{bad JSON'; const store=storage(original);const loaded=loadData();
  assert.equal(loaded.raw,original); assert.equal(store.value(),original); assert.ok(loaded.error);
  const replacement=sample();recoverData(replacement,loaded.raw);
  assert.deepEqual(parseBackup(store.value()),replacement);
  saveData({...replacement,settings:{dailyNewLimit:15}});
  assert.equal(loadData().data.settings.dailyNewLimit,15);
});
test('empty stored string is corrupt raw rather than a new user database',()=>{
  const store=storage('');const loaded=loadData();
  assert.equal(loaded.firstRun,false);assert.equal(loaded.raw,'');assert.ok(loaded.error);assert.equal(store.value(),'');
});
test('quota failure keeps prior persisted data and permits a safe retry',()=>{
  const original=exportBackup(sample());const store=storage(original);loadData();
  store.denyWrite=true;
  assert.throws(()=>saveData(sample()),/保存失败/); assert.equal(store.value(),original);
  store.denyWrite=false; const next=sample();saveData(next);assert.deepEqual(parseBackup(store.value()),next);
});
test('quota failure during recovery preserves corrupt raw and permits explicit retry',()=>{
  const original='broken';const store=storage(original);loadData();store.denyWrite=true;
  assert.throws(()=>recoverData(sample(),original),/保存失败/);assert.equal(store.value(),original);
  store.denyWrite=false;recoverData(sample(),original);assert.equal(parseBackup(store.value()).cards.length,1);
});
test('second tab writes are rejected both for ordinary writes and corrupt recovery',()=>{
  const store=storage(exportBackup(sample()));loadData();const newer=exportBackup(sample());store.externalWrite(newer);
  assert.throws(()=>saveData(sample()),/另一个标签页/);assert.equal(store.value(),newer);
  store.externalWrite('broken');loadData();store.externalWrite(newer);
  assert.throws(()=>recoverData(sample(),'broken'),/其他标签页/);assert.equal(store.value(),newer);
});
test('recovery cannot overwrite readable data or accept changed expected raw',()=>{
  const original=exportBackup(sample());const store=storage(original);loadData();
  assert.throws(()=>recoverData(sample(),original),/正常读取/);assert.equal(store.value(),original);
  store.externalWrite('broken');loadData();
  assert.throws(()=>recoverData(sample(),'wrong'),/其他标签页/);assert.equal(store.value(),'broken');
});
test('English direction persists through normal guarded storage writes without changing cards or reviews',()=>{
  const initial=sample();const store=storage(exportBackup(initial));const loaded=loadData();
  const next={...loaded.data,settings:{...loaded.data.settings,englishDirection:'zh-en'}};
  saveData(next);const restored=loadData().data;
  assert.equal(restored.settings.englishDirection,'zh-en');
  assert.deepEqual(restored.cards,initial.cards);assert.deepEqual(restored.logs,initial.logs);
  const external=exportBackup({...restored,settings:{...restored.settings,englishDirection:'en-zh'}});
  store.externalWrite(external);
  assert.throws(()=>saveData(next),/另一个标签页/);assert.equal(store.value(),external);
});
