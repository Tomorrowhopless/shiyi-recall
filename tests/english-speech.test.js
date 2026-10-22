import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnglishSpeech } from '../src/english-speech.js';
function fixture(initial=[{lang:'en-US',localService:true}]) {
  const states=[];const spoken=[];const listeners=new Set();let voices=initial;let cancels=0;
  const synthesis={getVoices:()=>voices,speak:u=>spoken.push(u),cancel:()=>cancels++,addEventListener:(event,fn)=>listeners.add(fn),removeEventListener:(event,fn)=>listeners.delete(fn)};
  class Utterance {constructor(text){this.text=text;}}
  const player=createEnglishSpeech({synthesis,Utterance,onState:s=>states.push(s)});
  return {player,states,spoken,listeners,setVoices:v=>{voices=v;for(const fn of [...listeners])fn();},get cancels(){return cancels;}};
}
test('only native start announces speaking and native end announces completion',()=>{
  const f=fixture();f.player.speak('retain');assert.equal(f.states.at(-1).status,'loading');
  const u=f.spoken[0];assert.equal(u.text,'retain');assert.equal(u.rate,.85);assert.equal(u.lang,'en-US');
  u.onstart();assert.equal(f.states.at(-1).status,'speaking');u.onend();assert.equal(f.states.at(-1).status,'ended');
});
test('repeat playback ignores all callbacks from replaced requests',()=>{
  const f=fixture();f.player.speak('first');const old=f.spoken[0];f.player.speak('second');
  old.onstart();old.onerror({error:'audio-busy'});old.onend();assert.equal(f.states.at(-1).status,'loading');
  f.spoken[1].onstart();assert.equal(f.states.at(-1).status,'speaking');assert.equal(f.cancels,2);
});
test('manual cancellation returns idle and suppresses late engine errors',()=>{
  const f=fixture();f.player.speak('test');const u=f.spoken[0];f.player.cancel();const count=f.states.length;
  u.onerror({error:'not-allowed'});u.onend();u.onstart();assert.equal(f.states.length,count);assert.equal(f.states.at(-1).status,'idle');
});
test('local en-US wins over remote US, local UK and default Chinese voices',()=>{
  const voices=[{lang:'zh-CN',default:true,localService:true},{lang:'en-US',localService:false},{lang:'en-GB',localService:true},{lang:'en-US',localService:true}];
  const f=fixture(voices);f.player.speak('test');assert.equal(f.spoken[0].voice,voices[3]);
  const uk=fixture([voices[0],voices[2]]);uk.player.speak('test');assert.equal(uk.spoken[0].lang,'en-GB');
});
test('available Chinese-only voices do not silently read English using a Chinese voice',()=>{
  const f=fixture([{lang:'zh-CN',localService:true}]);f.player.speak('test');assert.equal(f.spoken.length,0);
  assert.equal(f.states.at(-1).status,'error');assert.match(f.states.at(-1).message,/英语语音/);
});
test('engine errors produce actionable Chinese messages and permit a new playback',()=>{
  for(const error of ['language-unavailable','audio-busy','not-allowed','network']) {
    const f=fixture();f.player.speak('test');f.spoken[0].onerror({error});
    assert.equal(f.states.at(-1).status,'error');assert.match(f.states.at(-1).message,/请/);
    f.player.speak('retry');f.spoken[1].onstart();assert.equal(f.states.at(-1).status,'speaking');
  }
});
test('voice discovery waits for voiceschanged and removes listeners when ready',()=>{
  const f=fixture([]);f.player.speak('test');assert.equal(f.spoken.length,0);assert.equal(f.listeners.size,1);
  f.setVoices([{lang:'en-US',localService:true}]);assert.equal(f.spoken.length,1);assert.equal(f.listeners.size,0);
});
test('voice discovery has a bounded fallback and cancellation recycles listener and timer',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const f=fixture([]);f.player.speak('test');t.mock.timers.tick(1499);assert.equal(f.spoken.length,0);
  t.mock.timers.tick(1);assert.equal(f.spoken.length,1);assert.equal(f.spoken[0].lang,'en-US');assert.equal(f.listeners.size,0);
  const canceled=fixture([]);canceled.player.speak('test');canceled.player.cancel();t.mock.timers.tick(1500);
  assert.equal(canceled.spoken.length,0);assert.equal(canceled.listeners.size,0);assert.equal(canceled.states.at(-1).status,'idle');
});
test('unsupported APIs and empty text fail safely without starting audio',()=>{
  const states=[];const p=createEnglishSpeech({synthesis:null,Utterance:null,onState:s=>states.push(s)});
  p.speak('test');assert.equal(states.at(-1).status,'error');assert.match(states.at(-1).message,/不支持/);
  const f=fixture();f.player.speak('   ');assert.equal(f.spoken.length,0);assert.equal(f.states.at(-1).status,'idle');
});
