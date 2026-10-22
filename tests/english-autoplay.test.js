import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnglishAutoplay } from '../src/english-autoplay.js';
const card = {id:'word-1',subject:'english',kind:'basic',front:'retain',back:'记住'};
function fixture() {
  const spoken=[];let canceled=0;
  const autoplay=createEnglishAutoplay({speak:text=>spoken.push(text),cancel:()=>canceled++});
  return {autoplay,spoken,get canceled(){return canceled;}};
}
const state = extra => ({page:'study',card,...extra});

test('forward basic speaks once and revealing Chinese does not replay the unchanged English',()=>{
  const f=fixture();assert.equal(f.autoplay.sync(state()),true);
  assert.equal(f.autoplay.sync(state({revealed:true})),false);
  assert.equal(f.autoplay.sync(state()),false);assert.deepEqual(f.spoken,['retain']);
});
test('forward cloze reads blanks first then the complete sentence on reveal',()=>{
  const f=fixture();const cloze={...card,kind:'cloze',front:'Take {{c1::cost}} {{c2::into}} account.'};
  f.autoplay.sync(state({card:cloze}));f.autoplay.sync(state({card:cloze,revealed:true}));
  assert.deepEqual(f.spoken,['Take blank blank account.','Take cost into account.']);
  assert.equal(f.autoplay.sync(state({card:cloze,revealed:true})),false);
});
test('reverse remains silent until English is revealed and expands the whole cloze',()=>{
  const f=fixture();const cloze={...card,kind:'cloze',front:'{{c1::retain}} information'};
  assert.equal(f.autoplay.sync(state({card:cloze,direction:'zh-en'})),false);
  assert.equal(f.autoplay.sync(state({card:cloze,direction:'zh-en',revealed:true})),true);
  assert.deepEqual(f.spoken,['retain information']);
});
test('different card identity triggers playback even when its English text is identical',()=>{
  const f=fixture();f.autoplay.sync(state());f.autoplay.sync(state({card:{...card,id:'word-2'}}));
  assert.deepEqual(f.spoken,['retain','retain']);
});
test('math, other pages, blocked dialogs and missing active cards cancel once then allow returning playback',()=>{
  for(const next of [{card:{...card,subject:'math'}},{page:'library'},{blocked:true},{card:null},{direction:'zh-en'}]) {
    const f=fixture();f.autoplay.sync(state());assert.equal(f.autoplay.sync(state(next)),false);
    assert.equal(f.canceled,1);f.autoplay.sync(state(next));assert.equal(f.canceled,1);
    f.autoplay.sync(state());assert.deepEqual(f.spoken,['retain','retain']);
  }
});
test('manual stop or an error callback does not implicitly discard the automatic cue',()=>{
  const f=fixture();f.autoplay.sync(state());
  // UI handles stop/error directly on the speech player without calling reset().
  assert.equal(f.autoplay.sync(state()),false);assert.equal(f.autoplay.sync(state({revealed:true})),false);
  assert.deepEqual(f.spoken,['retain']);
});
test('reset cancels pending speech and allows an explicit fresh cue afterward',()=>{
  const f=fixture();f.autoplay.sync(state());f.autoplay.reset();assert.equal(f.canceled,1);
  assert.equal(f.autoplay.sync(state()),true);assert.deepEqual(f.spoken,['retain','retain']);
});
test('formula content is stripped consistently and formula-only prompts do not start audio',()=>{
  const f=fixture();f.autoplay.sync(state({card:{...card,front:'Energy $E=mc^2$'}}));
  assert.deepEqual(f.spoken,['Energy']);
  assert.equal(f.autoplay.sync(state({card:{...card,front:'$E=mc^2$'}})),false);assert.equal(f.canceled,1);
});
test('synchronous playback callback re-entry cannot duplicate the same cue',()=>{
  let attempts=0;let autoplay;
  autoplay=createEnglishAutoplay({speak:()=>{attempts++;assert.equal(autoplay.sync(state()),false);},cancel:()=>{}});
  assert.equal(autoplay.sync(state()),true);assert.equal(attempts,1);
});
test('synchronous cancellation callback re-entry sees the cleared key',()=>{
  let cancels=0;let autoplay;
  autoplay=createEnglishAutoplay({speak:()=>{},cancel:()=>{cancels++;autoplay.sync(state({blocked:true}));}});
  autoplay.sync(state());autoplay.sync(state({blocked:true}));assert.equal(cancels,1);
});
