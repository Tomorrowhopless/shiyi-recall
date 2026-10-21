import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, unzipSync } from 'fflate';
import { parseReadingLabImport, parseReadingLabZip } from '../src/readinglab-import.js';
import { exportBackup, parseBackup, reviewCard, mergeBackup } from '../src/core.js';

const now = new Date('2026-10-20T15:00:00Z');
const enc = new TextEncoder();
const sha = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256',value))].map(n=>n.toString(16).padStart(2,'0')).join('');
function fixture() {
  return {schemaVersion:1,sources:[{id:'s1',title:'Synthetic Reading 1'},{id:'s2',title:'Synthetic Reading 2'}],entries:[
    {id:'w1',kind:'word',term:'retain',meaning:'保留；记住',sourceIds:['s1'],partOfSpeech:'v.',pronunciation:'/rɪˈteɪn/',explanation:'Keep information in memory.',example:'We retain information.',translation:'我们记住所学信息。',structure:'retain + object',notes:['Synthetic note'],tags:['记忆']},
    {id:'p1',kind:'phrase',term:'account for',meaning:'解释；占比',sourceIds:['s1']},
    {id:'s1-entry',kind:'sentence',term:'This is an example.',meaning:'这是例句。',sourceIds:['s1']},
    {id:'g1',kind:'grammar',term:'Passive voice',meaning:'被动语态',sourceIds:['s1']},
  ]};
}
async function zipFixture({library=fixture(),state,extra={},tamperHash=false,level=0}={}) {
  const files={'data/library.json':enc.encode(JSON.stringify(library)),...extra};
  if(state)files['progress.json']=enc.encode(JSON.stringify(state));
  const metadata=[];
  for(const [path,bytes] of Object.entries(files))metadata.push({path,size:bytes.length,sha256:tamperHash?'0'.repeat(64):await sha(bytes)});
  files['package.json']=enc.encode(JSON.stringify({schemaVersion:1,type:'reading-lab-local-package',files:metadata}));
  return zipSync(files,{level});
}
test('Reading Lab import selects only words and phrases and starts real fresh FSRS cards',async()=>{
  const result=await parseReadingLabImport(JSON.stringify(fixture()),now);
  assert.equal(result.cards.length,2);
  assert.deepEqual(result.importInfo,{type:'readinglab',words:1,phrases:1,skipped:2,duplicates:0,originalEntries:4,sources:2});
  assert.equal(result.cards[0].front,'retain');
  assert.equal(result.cards[0].back,'v. 保留；记住');
  assert.equal(result.cards[0].subject,'english');
  assert.equal(result.cards[0].schedule.reps,0);
  assert.equal(result.logs.length,0);
  assert.deepEqual(parseBackup(exportBackup(result)).cards,result.cards);
});
test('entry context, source, personal notes and original progress survive without inventing FSRS reviews',async()=>{
  const result=await parseReadingLabImport(JSON.stringify({schemaVersion:1,type:'reading-lab-backup',localLibrary:fixture(),state:{w1:{note:'My local note',favorite:true,status:'mastered',review:{reviewedAt:+now-86400000,dueAt:+now+86400000}}}}),now);
  const card=result.cards[0];
  for(const text of ['/rɪˈteɪn/','Keep information','We retain','我们记住','retain + object','Synthetic note','Synthetic Reading 1','My local note','原站掌握状态：已掌握','原站最近复习'])assert.ok(card.notes.includes(text),text);
  assert.ok(card.tags.includes('原站收藏'));
  assert.equal(card.schedule.reps,0);
  assert.equal(card.schedule.last_review,undefined);
});
test('normalized same-kind terms merge meanings, context and sources with stable repeated-import IDs',async()=>{
  const library=fixture();
  library.entries.push({id:'w2',kind:'word',term:'  ＲＥＴＡＩＮ. ',meaning:'保持',sourceIds:['s2'],notes:['Second context']});
  const first=await parseReadingLabImport(JSON.stringify(library),now);
  const second=await parseReadingLabImport(JSON.stringify(library),new Date(+now+60000));
  assert.equal(first.cards.length,2);
  assert.equal(first.importInfo.duplicates,1);
  assert.ok(first.cards[0].back.includes('保持'));
  assert.ok(first.cards[0].notes.includes('Synthetic Reading 2'));
  assert.ok(first.cards[0].notes.includes('Second context'));
  assert.equal(first.cards[0].id,second.cards[0].id);
  const graded=reviewCard(first.cards[0],3,now).card;
  const merged=mergeBackup({...first,cards:[graded,first.cards[1]]},second);
  assert.equal(merged.cards.length,2);
  assert.equal(merged.cards[0].schedule.reps,1);
});
test('word and phrase with the same spelling remain distinct and unsafe HTML stays inert plain text',async()=>{
  const library=fixture();
  library.entries[0].term='<img src=x onerror=alert(1)>';
  library.entries.push({id:'other',kind:'phrase',term:'<img src=x onerror=alert(1)>',meaning:'synthetic',sourceIds:['s1']});
  const result=await parseReadingLabImport(JSON.stringify(library),now);
  assert.notEqual(result.cards[0].id,result.cards[2].id);
  assert.equal(result.cards[0].front,'<img src=x onerror=alert(1)>');
});
test('invalid source, duplicate ID, missing meaning and invalid progress are rejected before import',async()=>{
  for(const mutate of [l=>l.entries[0].sourceIds=['missing'],l=>l.entries[1].id='w1',l=>l.entries[0].meaning='',l=>l.entries[0].tags=[2]]){
    const library=fixture();mutate(library);
    await assert.rejects(parseReadingLabImport(JSON.stringify(library),now));
  }
  await assert.rejects(parseReadingLabImport('{bad',now),/JSON/);
  await assert.rejects(parseReadingLabImport(JSON.stringify({schemaVersion:1,sources:[],entries:[]}),now),/没有可导入/);
  await assert.rejects(parseReadingLabImport(JSON.stringify({schemaVersion:1,type:'reading-lab-backup',localLibrary:fixture(),state:{w1:{status:'constructor'}}}),now),/掌握状态/);
});
test('oversized card text fails instead of silently truncating context',async()=>{
  const library=fixture();library.entries[0].notes=['x'.repeat(16001)];
  await assert.rejects(parseReadingLabImport(JSON.stringify(library),now),/无法完整导入/);
});
test('ZIP import verifies selected JSON and transfers no audio assets',async()=>{
  const bytes=await zipFixture({state:{w1:{note:'ZIP note'}},extra:{'audio/example.mp3':enc.encode('Synthetic audio bytes, deliberately not media')}});
  const result=await parseReadingLabZip(bytes,now);
  assert.equal(result.cards.length,2);
  assert.ok(result.cards[0].notes.includes('ZIP note'));
  assert.equal(result.assets,undefined);
  assert.equal(result.importInfo.skipped,2);
});
test('ZIP validation rejects bad selected hashes and disallowed paths',async()=>{
  await assert.rejects(parseReadingLabZip(await zipFixture({tamperHash:true}),now),/校验失败/);
  await assert.rejects(parseReadingLabZip(await zipFixture({extra:{'../unsafe.json':enc.encode('{}')}}),now),/不允许的路径/);
  await assert.rejects(parseReadingLabZip(new Uint8Array(30),now),/单文件/);
});
test('ZIP extraction never inflates ignored audio even when its compressed stream is invalid',async()=>{
  const bytes=await zipFixture({extra:{'audio/example.mp3':enc.encode('Synthetic audio bytes '.repeat(30))},level:6});
  const copy=bytes.slice(),view=new DataView(copy.buffer),dec=new TextDecoder();
  for(let i=0;i<copy.length-46;i++){
    if(view.getUint32(i,true)!==0x02014b50)continue;
    const n=view.getUint16(i+28,true),name=dec.decode(copy.subarray(i+46,i+46+n));
    if(name!=='audio/example.mp3')continue;
    assert.equal(view.getUint16(i+10,true),8);
    const local=view.getUint32(i+42,true),start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
    copy[start]=7;break;
  }
  assert.throws(()=>unzipSync(copy));
  const result=await parseReadingLabZip(copy,now);
  assert.equal(result.cards.length,2);
});
test('ZIP preflight rejects oversized declared inflation before any decompression',async()=>{
  const bytes=await zipFixture();const copy=bytes.slice(),view=new DataView(copy.buffer);
  for(let i=0;i<copy.length-46;i++)if(view.getUint32(i,true)===0x02014b50){view.setUint32(i+24,21*1024*1024,true);break;}
  await assert.rejects(parseReadingLabZip(copy,now),/大小/);
});
