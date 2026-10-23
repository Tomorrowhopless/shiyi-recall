import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnglishPlayback, LOCAL_SPEECH_CHANNEL, splitSpeechText } from '../src/english-playback.js';

function fixture(t, hook = () => {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const sent = [], states = [], listeners = new Set(), native = [];
  let next = 0, nativeState;
  const origin = 'https://shiyi-recall.pages.dev';
  const target = { location: { origin }, postMessage: (message, to) => sent.push({ ...message, to }),
    addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  const player = createEnglishPlayback({ target, origin, id: () => `request-${++next}`,
    onState: state => { states.push(state); hook(state); },
    createFallback: ({ onState }) => { nativeState = onState; return { speak: text => native.push(['speak', text]), cancel: () => native.push(['cancel']) }; } });
  const last = action => sent.findLast(message => message.action === action);
  function receive(message, extra = {}) {
    const event = { source: target, origin, data: { channel: LOCAL_SPEECH_CHANNEL, from: 'wordworkshop', clientId: sent[0]?.clientId, ...message }, ...extra };
    for (const fn of listeners) fn(event);
  }
  function ready() { receive({ action: 'ready', requestId: last('probe').requestId, ok: true, voice: 'Piper Cori', lang: 'en-GB' }); }
  function stage(stage, extra = {}) { receive({ action: 'state', requestId: last('speak').requestId, stage, ...extra }); }
  t.after(() => player.dispose());
  return { player, sent, states, native, target, origin, last, receive, ready, stage, listeners, nativeState: state => nativeState(state) };
}

test('installed local voice receives English only and completion requires real playing and ended states', t => {
  const f = fixture(t); f.player.speak('retain（保留） /rɪˈteɪn/');
  assert.equal(f.last('probe').text, undefined);
  f.ready(); assert.equal(f.last('speak').text, 'retain'); assert.deepEqual(f.native, []);
  assert.equal(f.last('speak').to, f.origin);
  f.receive({ action: 'result', requestId: f.last('speak').requestId, ok: true });
  assert.equal(f.states.at(-1).status, 'loading');
  f.stage('playing'); assert.equal(f.states.at(-1).status, 'speaking');
  f.stage('ended'); assert.equal(f.states.at(-1).status, 'ended');
  assert.deepEqual(f.states.at(-1).voice, { name: 'Piper Cori', lang: 'en-GB', localService: true });
});

test('foreign origins, frames, clients and request IDs cannot drive playback state', t => {
  const f = fixture(t); f.player.speak('criteria'); const requestId = f.last('probe').requestId;
  const ready = { action: 'ready', requestId, ok: true, voice: 'Piper Cori', lang: 'en-GB' };
  f.receive(ready, { origin: 'https://other.example' });
  f.receive(ready, { source: {} });
  f.receive({ ...ready, clientId: 'other-client' });
  f.receive({ ...ready, requestId: 'old-request' });
  assert.equal(f.last('speak'), undefined);
  f.ready(); const count = f.states.length;
  f.receive({ action: 'state', requestId: 'old-request', stage: 'playing' });
  f.receive({ action: 'state', requestId: f.last('speak').requestId, stage: 'ended' }, { origin: 'https://other.example' });
  assert.equal(f.states.length, count);
});

test('missing extension uses browser English after a bounded probe, without sending card text in probes', t => {
  const f = fixture(t); f.player.speak('criteria');
  t.mock.timers.tick(180); assert.equal(f.sent.filter(message => message.action === 'probe').length, 2);
  t.mock.timers.tick(470); assert.deepEqual(f.native, [['speak', 'criteria']]);
  assert.ok(f.sent.every(message => !('text' in message)));
  f.nativeState({ status: 'ended', message: 'native ended' }); assert.equal(f.states.at(-1).message, 'native ended');
  f.player.cancel(); assert.deepEqual(f.native.at(-1), ['cancel']);
});

test('cancelled discovery and late ready responses cannot play the old card or trigger fallback', t => {
  const f = fixture(t); f.player.speak('first'); const old = f.last('probe').requestId;
  f.player.cancel();
  f.receive({ action: 'ready', requestId: old, ok: true, voice: 'Piper Cori', lang: 'en-GB' });
  t.mock.timers.tick(1000); assert.deepEqual(f.native, []); assert.equal(f.last('speak'), undefined);
  f.player.speak('second'); f.ready(); assert.equal(f.last('speak').text, 'second');
});

test('replacement stops only its own active request and ignores all previous audio events', t => {
  const f = fixture(t); f.player.speak('first'); f.ready(); const old = f.last('speak');
  f.stage('playing'); f.player.speak('second');
  assert.equal(f.last('stop').requestId, old.requestId);
  f.ready(); const current = f.last('speak');
  assert.notEqual(current.requestId, old.requestId);
  f.receive({ action: 'state', requestId: old.requestId, stage: 'ended' });
  assert.equal(f.states.at(-1).status, 'loading');
  f.stage('playing'); f.stage('ended'); assert.equal(f.states.at(-1).status, 'ended');
  assert.deepEqual(f.native, []);
});

test('long English is played in order with bounded chunks and one final completion', t => {
  const f = fixture(t); const text = Array.from({ length: 90 }, (_, index) => `word${index}`).join(' ');
  f.player.speak(text); f.ready(); const chunks = [];
  while (f.states.at(-1).status !== 'ended') {
    chunks.push(f.last('speak').text);
    f.stage('playing'); f.stage('ended');
  }
  assert.ok(chunks.every(chunk => chunk.length <= 240));
  assert.equal(chunks.join(' '), text);
  assert.equal(f.states.filter(state => state.status === 'ended').length, 1);
  assert.deepEqual(splitSpeechText('x'.repeat(500)).map(chunk => chunk.length), [240, 240, 20]);
});

test('Chinese-only input, failed starts and stalled local audio never claim completion', t => {
  const f = fixture(t); f.player.speak('只读中文'); assert.equal(f.sent.length, 0);
  f.player.speak('criteria'); f.ready(); f.stage('ended');
  assert.equal(f.states.at(-1).status, 'error'); assert.ok(f.last('stop'));
  f.player.speak('retry'); f.ready(); t.mock.timers.tick(90000);
  assert.equal(f.states.at(-1).status, 'error'); assert.match(f.states.at(-1).message, /超时/);
  assert.equal(f.states.filter(state => state.status === 'ended').length, 0);
});

test('local error stays actionable and late browser callbacks cannot overwrite local state', t => {
  const f = fixture(t); f.player.speak('first'); t.mock.timers.tick(650);
  f.player.speak('second'); f.ready();
  f.nativeState({ status: 'ended', message: 'stale native callback' });
  assert.equal(f.states.at(-1).status, 'loading');
  f.receive({ action: 'result', requestId: f.last('speak').requestId, ok: false, error: '请重新加载插件' });
  assert.equal(f.states.at(-1).status, 'error'); assert.equal(f.states.at(-1).message, '请重新加载插件');
});

test('synchronous cancellation during local loading cannot issue a new speech request', t => {
  let player;
  const f = fixture(t, state => { if (state.voice?.name === 'Piper Cori') player.cancel(); });
  player = f.player; player.speak('criteria'); f.ready();
  assert.equal(f.last('speak'), undefined);
  t.mock.timers.tick(100000); assert.deepEqual(f.native, []);
});
