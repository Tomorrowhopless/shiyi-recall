import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createEnglishSpeech } from '../src/english-speech.js';
const players = [];
afterEach(() => { for (const player of players.splice(0)) player.cancel(); });
function fixture(initial=[{lang:'en-US',localService:true}]) {
  const states=[];const spoken=[];const listeners=new Set();let voices=initial;let cancels=0;
  const synthesis={getVoices:()=>voices,speak:u=>spoken.push(u),cancel:()=>cancels++,addEventListener:(event,fn)=>listeners.add(fn),removeEventListener:(event,fn)=>listeners.delete(fn)};
  class Utterance {constructor(text){this.text=text;}}
  const player=createEnglishSpeech({synthesis,Utterance,onState:s=>states.push(s)});
  players.push(player);
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
test('voice discovery has a bounded explicit-voice requirement and cancellation recycles listener and timer',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const f=fixture([]);f.player.speak('test');t.mock.timers.tick(1499);assert.equal(f.spoken.length,0);
  t.mock.timers.tick(1);assert.equal(f.spoken.length,0);assert.equal(f.states.at(-1).status,'error');assert.match(f.states.at(-1).message,/英语语音/);assert.equal(f.listeners.size,0);
  const canceled=fixture([]);canceled.player.speak('test');canceled.player.cancel();t.mock.timers.tick(1500);
  assert.equal(canceled.spoken.length,0);assert.equal(canceled.listeners.size,0);assert.equal(canceled.states.at(-1).status,'idle');
});
test('unsupported APIs and empty text fail safely without starting audio',()=>{
  const states=[];const p=createEnglishSpeech({synthesis:null,Utterance:null,onState:s=>states.push(s)});
  p.speak('test');assert.equal(states.at(-1).status,'error');assert.match(states.at(-1).message,/不支持/);
  const f=fixture();f.player.speak('   ');assert.equal(f.spoken.length,0);assert.equal(f.states.at(-1).status,'idle');
});
test('speech engine receives only sanitized English and never receives Chinese-only text',()=>{
  const f=fixture();f.player.speak('retain /rɪˈteɪn/ 的意思是保留');
  assert.equal(f.spoken[0].text,'retain');assert.doesNotMatch(f.spoken[0].text,/\p{Script=Han}/u);
  f.player.speak('只有中文意思');assert.equal(f.spoken.length,1);assert.equal(f.states.at(-1).status,'idle');
});
test('US natural voice outranks ordinary local voice and failed engines only fall back to explicit English',()=>{
  const voices=[{name:'Chinese',lang:'zh-CN',default:true,localService:true},{name:'Basic',lang:'en-US',localService:true},{name:'Microsoft US Natural',lang:'en-US',localService:false}];
  const f=fixture(voices);f.player.speak('test');assert.equal(f.spoken[0].voice,voices[2]);
  f.spoken[0].onerror({error:'voice-unavailable'});assert.equal(f.spoken.length,2);assert.equal(f.spoken[1].voice,voices[1]);assert.equal(f.states.at(-1).status,'loading');
});
test('selected voice metadata accompanies real loading, start and completion states',()=>{
  const voice={name:'English Enhanced',lang:'en-US',localService:true};const f=fixture([voice]);
  f.player.speak('test');assert.deepEqual(f.states.at(-1).voice,voice);
  f.spoken[0].onstart();assert.deepEqual(f.states.at(-1).voice,voice);
  f.spoken[0].onend();assert.deepEqual(f.states.at(-1).voice,voice);
});
test('a synchronous cancellation during selected-voice loading cannot start a stale utterance',()=>{
  let player;let count=0;
  const synthesis={getVoices:()=>[{name:'English',lang:'en-US',localService:true}],cancel:()=>{},speak:()=>count++};
  player=createEnglishSpeech({synthesis,Utterance:class {},onState:state=>{if(state.status==='loading'&&state.voice)player.cancel();}});
  player.speak('test');assert.equal(count,0);
});
test('novelty-only English list produces an actionable error without dispatching audio',()=>{
  const f=fixture([{name:'Albert',lang:'en-US',localService:true},{name:'Boing',lang:'en-US',localService:true}]);
  f.player.speak('retain');assert.equal(f.spoken.length,0);assert.equal(f.states.at(-1).status,'error');
  assert.match(f.states.at(-1).message,/英语语音/);
});
const fallbackVoices = () => [
  {name:'Microsoft Aria Online (Natural)',lang:'en-US',localService:false},
  {name:'Samantha',lang:'en-US',localService:true},
  {name:'Alex',lang:'en-US',localService:true},
  {name:'Daniel',lang:'en-GB',localService:true},
  {name:'Chinese Natural',lang:'zh-CN',localService:true},
];
test('cloud voice ending without start retries standard local English once and reports only its real events',()=>{
  const voices=fallbackVoices();const f=fixture(voices);f.player.speak('retain');const cloud=f.spoken[0];
  cloud.onend();assert.equal(f.spoken.length,2);assert.equal(f.spoken[1].voice,voices[1]);
  assert.ok(!f.states.some(s=>s.status==='ended'));
  cloud.onstart();cloud.onerror({error:'network'});assert.equal(f.spoken.length,2);
  const local=f.spoken[1];local.onstart();assert.equal(f.states.at(-1).voice.name,'Samantha');
  local.onend();assert.equal(f.states.at(-1).status,'ended');assert.equal(f.states.at(-1).voice.name,'Samantha');
});
test('network and unavailable cloud voices each allow at most one local fallback, whose failed start is an error',()=>{
  for(const error of ['network','voice-unavailable']) {
    const f=fixture(fallbackVoices());f.player.speak('test');f.spoken[0].onerror({error});
    assert.equal(f.spoken.length,2);f.spoken[1].onend();
    assert.equal(f.spoken.length,2);assert.equal(f.states.at(-1).status,'error');
    assert.ok(!f.states.some(s=>s.status==='ended'));
  }
});
test('not-allowed never retries another voice and cancel suppresses pending fallback callbacks',()=>{
  const f=fixture(fallbackVoices());f.player.speak('test');f.spoken[0].onerror({error:'not-allowed'});
  assert.equal(f.spoken.length,1);assert.equal(f.states.at(-1).status,'error');
  f.player.speak('retry');const cloud=f.spoken[1];f.player.cancel();cloud.onend();cloud.onerror({error:'network'});
  assert.equal(f.spoken.length,2);assert.equal(f.states.at(-1).status,'idle');
});
test('silent end with no suitable local English voice reports failure instead of completion or Chinese fallback',()=>{
  const f=fixture([fallbackVoices()[0],{name:'Albert',lang:'en-US',localService:true},fallbackVoices()[4]]);
  f.player.speak('retain');f.spoken[0].onend();assert.equal(f.spoken.length,1);
  assert.equal(f.states.at(-1).status,'error');assert.match(f.states.at(-1).message,/未实际开始/);
});
test('silent cloud engine falls back after eight seconds and silent local engine errors after eight more',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const f=fixture(fallbackVoices());f.player.speak('retain');
  t.mock.timers.tick(7999);assert.equal(f.spoken.length,1);
  t.mock.timers.tick(1);assert.equal(f.spoken.length,2);assert.equal(f.spoken[1].voice.name,'Samantha');
  t.mock.timers.tick(8000);assert.equal(f.spoken.length,2);assert.equal(f.states.at(-1).status,'error');
  assert.ok(!f.states.some(s=>s.status==='ended'));assert.ok(f.cancels>=3);
});
test('native start clears its watchdog and cancellation prevents any delayed fallback',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const f=fixture(fallbackVoices());f.player.speak('test');f.spoken[0].onstart();
  t.mock.timers.tick(16000);assert.equal(f.spoken.length,1);assert.equal(f.states.at(-1).status,'speaking');
  f.player.speak('next');f.player.cancel();t.mock.timers.tick(16000);
  assert.equal(f.spoken.length,2);assert.equal(f.states.at(-1).status,'idle');
});
test('replacement clears old watchdog and old end cannot cancel a newer card timer',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const f=fixture(fallbackVoices());f.player.speak('first');const old=f.spoken[0];
  t.mock.timers.tick(4000);f.player.speak('second');old.onend();
  t.mock.timers.tick(4000);assert.equal(f.spoken.length,2);
  t.mock.timers.tick(4000);assert.equal(f.spoken.length,3);assert.equal(f.spoken[2].text,'second');
  f.spoken[2].onstart();t.mock.timers.tick(8000);assert.equal(f.states.at(-1).status,'speaking');
});
test('a timed-out utterance cannot later start or finish and replace local fallback state',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const f=fixture(fallbackVoices());f.player.speak('test');const stale=f.spoken[0];
  t.mock.timers.tick(8000);stale.onstart();stale.onend();
  assert.equal(f.states.at(-1).status,'loading');assert.equal(f.states.at(-1).voice.name,'Samantha');
  f.spoken[1].onstart();f.spoken[1].onend();assert.equal(f.states.at(-1).status,'ended');
});
