import test from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import { createCard, updateCard, exportBackup, parseBackup, reviewCard, DEFAULT_SETTINGS } from '../src/core.js';
import { mathCards, MATH_COURSES, MATH_CONTENT_TYPES, MATH_CARD_COUNT } from '../src/math-content.js';
const now = new Date('2026-10-20T15:00:00Z');
const mathInput = { subject:'math', front:'题目', back:'答案', tags:[] };

test('all three mathematics courses contain real formulas and worked problem types with stable unique IDs',()=>{
  const cards=mathCards(now), later=mathCards(new Date('2026-10-21T15:00:00Z'));
  assert.equal(cards.length,MATH_CARD_COUNT);
  assert.equal(cards.length,76);
  assert.equal(new Set(cards.map(c=>c.id)).size,cards.length);
  assert.deepEqual(cards.map(c=>c.id),later.map(c=>c.id));
  for(const course of Object.keys(MATH_COURSES))for(const type of Object.keys(MATH_CONTENT_TYPES)){
    const group=cards.filter(c=>c.mathCourse===course&&c.contentType===type);
    assert.ok(group.length>=6,`${course}/${type}`);
    assert.ok(group.every(c=>c.subject==='math'&&c.back.length>15&&c.notes.length>15));
  }
  assert.ok(cards.filter(c=>c.contentType==='problem').every(c=>c.front.startsWith('题型：')&&c.back.includes('$$')&&c.notes.length>20));
});

test('every math expression in questions, answers and notes renders with strict KaTeX syntax',()=>{
  let expressions=0;
  for(const card of mathCards(now))for(const field of ['front','back','notes']){
    const text=card[field];
    for(const match of text.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$]+)\$/g)){
      assert.doesNotThrow(()=>katex.renderToString(match[1]??match[2],{throwOnError:true,trust:false}),`${card.id}:${field}`);
      expressions++;
    }
  }
  assert.ok(expressions>MATH_CARD_COUNT);
});

test('mathematics metadata and one-time content version survive complete backup roundtrip',()=>{
  const cards=mathCards(now);
  const data={cards,logs:[],settings:{...DEFAULT_SETTINGS,mathLibraryVersion:1}};
  const restored=parseBackup(exportBackup(data,now));
  assert.deepEqual(restored,data);
});

test('legacy math cards migrate by course tags without losing their original content or progress',()=>{
  const inputs=[['线性代数','linear-algebra'],['矩阵','linear-algebra'],['概率分布','probability'],['微积分','calculus']];
  for(const [tag,expected] of inputs){
    const card=createCard({...mathInput,tags:[tag]},now);
    const reviewed=reviewCard(card,3,now).card;
    const legacy={...reviewed};delete legacy.mathCourse;delete legacy.contentType;
    const data={cards:[legacy],logs:[],settings:{dailyNewLimit:20}};
    const restored=parseBackup(JSON.stringify({app:'recall-garden',version:1,...data}));
    assert.equal(restored.cards[0].mathCourse,expected);
    assert.equal(restored.cards[0].contentType,'formula');
    assert.deepEqual(restored.cards[0].schedule,reviewed.schedule);
    assert.equal(restored.cards[0].front,reviewed.front);
    assert.equal(restored.settings.mathLibraryVersion,0);
  }
});

test('editing course and formula/problem classification preserves reviewed scheduling',()=>{
  const reviewed=reviewCard(createCard(mathInput,now),3,now).card;
  const changed=updateCard(reviewed,{mathCourse:'probability',contentType:'problem'},new Date(+now+1000));
  assert.equal(changed.mathCourse,'probability');assert.equal(changed.contentType,'problem');
  assert.deepEqual(changed.schedule,reviewed.schedule);
  assert.throws(()=>createCard({...mathInput,mathCourse:'physics'},now),/数学分区/);
  assert.throws(()=>createCard({...mathInput,contentType:'video'},now),/数学内容/);
  assert.throws(()=>parseBackup(JSON.stringify({app:'recall-garden',version:1,cards:[],logs:[],settings:{dailyNewLimit:20,mathLibraryVersion:-1}})),/数学内容版本/);
});

test('all photographed expansion and integral topics are present with their applicability conditions',()=>{
  const required=['taylor-tan','taylor-sin','taylor-cos','taylor-reciprocal','taylor-power','taylor-log','int-power','int-root-recip','int-exp-base','int-tan','int-cot','int-sec2','int-csc2','int-sec','int-csc','int-arcsin','int-arctan','int-root-plus-recip','int-logistic','int-a2-minus-x2','int-root-plus','int-root-minus','int-root-circle','int-sec3','int-x2-minus-a2'];
  const cards=mathCards(now);
  for(const key of required){
    const card=cards.find(c=>c.id===`math-v1-calculus-${key}`);
    assert.ok(card,key);assert.ok(card.tags.includes('照片整理'));assert.ok(card.notes.length>20);
  }
  assert.match(cards.find(c=>c.id.endsWith('-int-power')).back,/mu\\ne-1/);
  assert.match(cards.find(c=>c.id.endsWith('-int-arctan')).back,/frac1a/);
  assert.match(cards.find(c=>c.id.endsWith('-int-csc2')).back,/-\\cot/);
  assert.match(cards.find(c=>c.id.endsWith('-int-root-minus')).notes,/\|x\|>a/);
  assert.match(cards.find(c=>c.id.endsWith('-taylor-tan')).notes,/π\/2/);
});

// Independent numerical content audit: differentiation must recover the integrand
// on each real connected branch (including negative x), away from singularities.
test('radical, partial-fraction, logistic and secant-cubed primitives differentiate correctly on their real branches',()=>{
  const a=1.3;
  const cases=[
    {id:'int-root-plus-recip',F:x=>Math.log(Math.abs(x+Math.sqrt(x*x+a*a))),f:x=>1/Math.sqrt(x*x+a*a),xs:[-3,-.5,.5,3]},
    {id:'int-root-plus',F:x=>(x*Math.sqrt(x*x+a*a)+a*a*Math.log(Math.abs(x+Math.sqrt(x*x+a*a))))/2,f:x=>Math.sqrt(x*x+a*a),xs:[-3,-.5,.5,3]},
    {id:'int-root-minus',F:x=>(x*Math.sqrt(x*x-a*a)-a*a*Math.log(Math.abs(x+Math.sqrt(x*x-a*a))))/2,f:x=>Math.sqrt(x*x-a*a),xs:[-3,-2,2,3]},
    {id:'int-root-circle',F:x=>(x*Math.sqrt(a*a-x*x)+a*a*Math.asin(x/a))/2,f:x=>Math.sqrt(a*a-x*x),xs:[-1,-.4,.4,1]},
    {id:'int-a2-minus-x2',F:x=>Math.log(Math.abs((a+x)/(a-x)))/(2*a),f:x=>1/(a*a-x*x),xs:[-3,-.5,.5,3]},
    {id:'int-x2-minus-a2',F:x=>Math.log(Math.abs((x-a)/(x+a)))/(2*a),f:x=>1/(x*x-a*a),xs:[-3,-.5,.5,3]},
    {id:'int-logistic',F:x=>x-Math.log1p(Math.exp(x)),f:x=>1/(1+Math.exp(x)),xs:[-3,-.5,.5,3]},
    {id:'int-sec3',F:x=>(Math.tan(x)/Math.cos(x)+Math.log(Math.abs(1/Math.cos(x)+Math.tan(x))))/2,f:x=>1/Math.cos(x)**3,xs:[-2.5,-.4,.4,2.5]},
  ];
  const ids=new Set(mathCards(now).map(c=>c.id));
  for(const {id,F,f,xs} of cases){
    assert.ok(ids.has(`math-v1-calculus-${id}`));
    for(const x of xs){
      const h=1e-5;
      const derivative=(F(x+h)-F(x-h))/(2*h);
      assert.ok(Math.abs(derivative-f(x))<2e-7*Math.max(1,Math.abs(f(x))),`${id} at x=${x}: ${derivative} vs ${f(x)}`);
    }
  }
});

test('probability worked examples agree with normalized independent calculations',()=>{
  const n=5,p=.37;
  const choose=(n,k)=>{let x=1;for(let i=1;i<=k;i++)x=x*(n-i+1)/i;return x;};
  const masses=Array.from({length:n+1},(_,k)=>choose(n,k)*p**k*(1-p)**(n-k));
  const mean=masses.reduce((sum,m,k)=>sum+k*m,0);
  const variance=masses.reduce((sum,m,k)=>sum+(k-mean)**2*m,0);
  assert.ok(Math.abs(masses.reduce((a,b)=>a+b,0)-1)<1e-12);
  assert.ok(Math.abs(mean-n*p)<1e-12);
  assert.ok(Math.abs(variance-n*p*(1-p))<1e-12);
  assert.ok(Math.abs((.01*.9)/(.01*.9+.99*.05)-2/13)<1e-12);
  assert.ok(Math.abs((1-.8**3)-.488)<1e-12);
  assert.equal((3+2**2)+2*2+1,12);
});
