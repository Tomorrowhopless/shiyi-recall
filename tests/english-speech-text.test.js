import test from 'node:test';
import assert from 'node:assert/strict';
import { englishSpeechText, selectEnglishVoice } from '../src/english-speech-text.js';

test('mixed historical prompts retain English terms without Chinese or IPA annotations',()=>{
  assert.equal(englishSpeechText('account for 的两个常见意思是什么？'),'account for');
  assert.equal(englishSpeechText('retain /rɪˈteɪn/ 是什么意思？'),'retain');
  assert.equal(englishSpeechText('evaluate [ɪˈvæljueɪt] 的意思？'),'evaluate');
  assert.equal(englishSpeechText('中文take词组into解释account中文'),'take into account');
});
test('English words, contractions and complete sentences retain their pronunciation content',()=>{
  assert.equal(englishSpeechText("We shouldn't take the cost into account."),"We shouldn't take the cost into account");
  assert.equal(englishSpeechText('a well-known café'),'a well-known café');
  assert.equal(englishSpeechText('and/or'),'and/or');
  assert.equal(englishSpeechText('I’m ready，are you？'),"I'm ready, are you");
});
test('Chinese-only, non-English scripts, formulas and empty input never become a speech request',()=>{
  for(const text of ['这是中文，没有英文。','こんにちは','안녕하세요','Привет','12345','$$E=mc^2$$',null,undefined])assert.equal(englishSpeechText(text),'');
  assert.equal(englishSpeechText(String.raw`Energy $E=mc^2$，能量。`),'Energy');
  assert.equal(englishSpeechText(String.raw`A \(x+y\) value`),'A value');
});
test('standard US quality voices are preferred by language and naming hints with local quality tie-break',()=>{
  const voices=[{name:'Chinese Natural',lang:'zh-CN',localService:true},{name:'US Basic',lang:'en-US',localService:true},{name:'UK Premium',lang:'en-GB',localService:true},{name:'US Natural',lang:'en-US',localService:false},{name:'US Enhanced',lang:'en-US',localService:true}];
  assert.equal(selectEnglishVoice(voices),voices[4]);
  assert.equal(selectEnglishVoice(voices.slice(0,4)),voices[3]);
  assert.equal(selectEnglishVoice([voices[2],voices[1]]),voices[1]);
  assert.equal(selectEnglishVoice([voices[0]]),null);
});
test('clearly English fallback voices are accepted while names cannot override Chinese language tags',()=>{
  const english={name:'English UK',lang:'en-GB',localService:true};
  assert.equal(selectEnglishVoice([{name:'US English Natural',lang:'zh-CN'},english]),english);
  assert.equal(selectEnglishVoice([]),null);
});
test('Apple novelty, character and singing voices are excluded even if they claim US English',()=>{
  const names=['Albert','Bad News','Bahh','Bells','Boing','Bubbles','Cellos','Good News','Organ','Superstar','Trinoids','Whisper','Wobble','Zarvox','Jester','Junior','Ralph'];
  const voices=names.map(name=>({name,lang:'en-US',localService:true}));
  assert.equal(selectEnglishVoice(voices),null);
  const daniel={name:'Daniel',lang:'en-GB',localService:true};
  assert.equal(selectEnglishVoice([...voices,daniel]),daniel);
  const samantha={name:'Samantha',lang:'en-US',localService:true};
  assert.equal(selectEnglishVoice([...voices,samantha]),samantha);
});
test('standard Microsoft Aria or Jenny natural voices win over multilingual US natural and ordinary local voices',()=>{
  const ava={name:'Microsoft Ava Multilingual Online (Natural)',lang:'en-US',localService:false};
  const aria={name:'Microsoft Aria Online (Natural)',lang:'en-US',localService:false};
  const jenny={name:'Microsoft Jenny Online (Natural)',lang:'en-US',localService:false};
  const samantha={name:'Samantha',lang:'en-US',localService:true};
  assert.equal(selectEnglishVoice([ava,samantha,jenny,aria]),aria);
  assert.equal(selectEnglishVoice([ava,samantha,jenny]),jenny);
  assert.equal(selectEnglishVoice([samantha,ava]),ava);
});
test('Samantha or Alex are stable local fallback choices while unfamiliar English names remain valid',()=>{
  const unspecified={name:'Legacy English',lang:'en-US',localService:true};
  const alex={name:'Alex',lang:'en-US',localService:true};
  const samantha={name:'Samantha',lang:'en-US',localService:true};
  assert.equal(selectEnglishVoice([unspecified,alex]),alex);
  assert.equal(selectEnglishVoice([unspecified,samantha]),samantha);
  assert.equal(selectEnglishVoice([unspecified]),unspecified);
});
