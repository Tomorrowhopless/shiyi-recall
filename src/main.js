import './style.css';
import 'katex/dist/katex.min.css';
import renderMathInElement from 'katex/contrib/auto-render';
import { createCard, updateCard, reviewCard, previewRatings, getQueue, getStats, parseCloze, parseBackup, exportBackup } from './core.js';
import { MATH_COURSES, MATH_CONTENT_TYPES, MATH_SOURCES } from './math-content.js';
import { activeCards, scopeCards, upgradeMathLibrary } from './math-library.js';
import { removableExamples, prepareImport } from './import-workflow.js';
import { loadData, saveData, recoverData, STORAGE_KEY } from './storage.js';

const app = document.querySelector('#app');
const editor = document.querySelector('#editor');
const confirmation = document.querySelector('#confirmation');
const loaded = loadData();
let data = loaded.data;
let storageError = loaded.error || '';
let page = 'study';
let subject = 'all';
let mathCourse = 'all';
let mathContentFilter = 'all';
let search = '';
let statusFilter = 'all';
let vocabularyFilter = 'all';
let libraryPage = 1;
const LIBRARY_PAGE_SIZE = 30;
let session = null;
let revealed = false;
let lastReview = null;
let pendingImport = null;
let importLoading = false;
let importRun = 0;
let importRemoveExamples = true;
let lastImportUndo = null;
let recoveryExported = false;
let backupTextSnapshot = '';
let toastTimer;
let editingId = null;
let returnFocus = null;
if(!storageError&&!loaded.firstRun){
  const upgrade=upgradeMathLibrary(data);
  if(upgrade.changed){try{saveData(upgrade.data);data=upgrade.data;}catch(error){storageError=error.message;}}
}
const subjects = { math: { name: '数学', symbol: '∫', detail: '公式与解题方法', color: 'math' }, english: { name: '英语', symbol: 'Aa', detail: '从单词到表达', color: 'english' } };
const ratingNames = ['', '忘记了', '有点难', '记住了', '很轻松'];
const icons = {
  leaf:'<path d="M5 17V5h7a9 9 0 0 1 9 9v5h-7a9 9 0 0 1-9-9"/><path d="m8 8 12 12"/>',
  today:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-12 5 2 2 4-4"/>',
  cards:'<rect x="4" y="5" width="14" height="16" rx="2"/><path d="M8 2h11a2 2 0 0 1 2 2v13M8 10h6m-6 4h4"/>',
  chart:'<path d="M4 3v17h17M8 15v-4m5 4V7m5 8v-6"/>',
  backup:'<path d="M12 3v12m-4-4 4 4 4-4M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14v6Z"/>',
  undo:'<path d="m9 4-6 6 6 6M3 10h10a7 7 0 0 1 7 7v3"/>',
  book:'<path d="M12 5v16M3 3h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v16h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3V3Z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
  shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  speaker:'<path d="m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.book}</svg>`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localDay = value => { const d = new Date(value); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const dateText = value => new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(new Date(value));
const timeText = value => new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit'}).format(new Date(value));
const selectedCards = () => scopeCards(data.cards, {subject,mathCourse,contentType:mathContentFilter});
const queue = () => getQueue(selectedCards(), { subject:'all', newLimit: data.settings.dailyNewLimit, logs: data.logs });
function relative(ms) {
  if (ms < 60000) return '不到 1 分钟';
  if (ms < 3600000) return `${Math.round(ms/60000)} 分钟`;
  if (ms < 86400000) return `${Math.round(ms/3600000)} 小时`;
  const days = Math.round(ms/86400000);
  return days < 30 ? `${days} 天` : days < 365 ? `${Math.round(days/30)} 个月` : `${(days/365).toFixed(1)} 年`;
}
function dueText(card) {
  if (card.schedule.reps === 0) return '尚未学习';
  const diff = Date.parse(card.schedule.due) - Date.now();
  return diff <= 0 ? '现在复习' : `${relative(diff)}后复习`;
}
function notify(message, undo = false) {
  const el = document.querySelector('#toast');
  el.innerHTML = `<span>${esc(message)}</span>${undo ? '<button data-action="undo">撤销</button>' : ''}`;
  el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), undo ? 12000 : 6500);
}
function persist(next) {
  if (storageError) { notify('请先在“数据与备份”中处理浏览器保存问题。'); return false; }
  try { saveData(next); data = next; return true; }
  catch (error) { notify(error.message); return false; }
}
function math(root = app) {
  renderMathInElement(root, { delimiters: [{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},{left:'\\(',right:'\\)',display:false},{left:'\\[',right:'\\]',display:true}], throwOnError:false, trust:false, strict:'warn', maxExpand:1000, maxSize:20 });
}
function subjectMark(key) { return `<span class="subject-mark ${key}" aria-hidden="true">${subjects[key].symbol}</span>`; }
function shell(content) {
  const stats = getStats(activeCards(data.cards),data.logs);
  const titles = {study:'今日学习',library:'我的卡片',history:'学习记录',backup:'数据与备份'};
  return `<aside class="sidebar"><a href="#study" class="brand" data-page="study"><span class="brand-mark">${icon('leaf')}</span><span>拾忆<small>每一次回想，都算数</small></span></a>
    <nav aria-label="主导航" class="nav-main">${[['study','today','今日学习'],['library','cards','我的卡片'],['history','chart','学习记录']].map(([key,i,label])=>`<a href="#${key}" data-page="${key}" class="nav-item ${page===key?'active':''}" ${page===key?'aria-current="page"':''}>${icon(i)}<span>${label}</span>${key==='study'&&stats.due?`<span class="nav-count">${stats.due}</span>`:''}</a>`).join('')}</nav>
    <div class="nav-divider"></div><div class="sidebar-label">数学</div><nav aria-label="数学分类" class="nav-math">${Object.entries(MATH_COURSES).map(([key,c])=>{const cards=data.cards.filter(card=>card.subject==='math'&&card.mathCourse===key);return `<div class="math-nav-group ${subject==='math'&&mathCourse===key?'current-course':''}"><button class="math-course-nav" data-course="${key}" aria-pressed="${subject==='math'&&mathCourse===key}"><span>${c.name}</span><small>${cards.length}</small></button><div class="math-type-nav">${Object.entries(MATH_CONTENT_TYPES).map(([type,label])=>`<button data-course="${key}" data-math-type="${type}" class="${subject==='math'&&mathCourse===key&&mathContentFilter===type?'selected':''}" aria-label="${c.name}${label}">${label}<small>${cards.filter(card=>card.contentType===type).length}</small></button>`).join('')}</div></div>`;}).join('')}</nav><nav aria-label="学习范围" class="nav-subjects"><button data-subject="english" class="subject-nav ${subject==='english'?'selected':''}">${subjectMark('english')}<span>英语</span><small>${data.cards.filter(c=>c.subject==='english').length}</small></button><button data-subject="all" class="subject-nav ${subject==='all'?'selected':''}">${icon('book')}<span>全部内容</span><small>${activeCards(data.cards).length}</small></button></nav>
    <button class="add-sidebar" data-action="add">${icon('plus')} 添加卡片</button>
    <div class="sidebar-bottom"><div class="local-note">${icon('shield')}<p>资料属于你<small>保存在当前浏览器</small></p></div><a href="#backup" data-page="backup" aria-label="数据与备份" class="nav-item ${page==='backup'?'active':''}">${icon('backup')}<span>数据与备份</span></a><div class="sidebar-version">拾忆 v1.2.2 <span>温故，而知新</span></div></div></aside>
    <div class="workspace"><header class="topbar"><span class="breadcrumb">学习工作台 <span>/</span> <strong>${titles[page]}</strong></span><span class="save-status ${storageError?'error':''}"><i></i>${storageError?'保存需要处理':'本地保存'}</span></header><main id="main" tabindex="-1">${storageError?`<div class="error-banner">浏览器中的资料无法读取，原始内容仍保留。请前往 <button data-page="backup">数据与备份</button> 导出原始资料。</div>`:''}${content}</main><footer>回想一次，离牢牢记住更近一点。<span>免登录 · 浏览器本地保存</span></footer></div>`;
}
function heading(title, subtitle, action = '') { return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`; }
function scopeName() {
  if(subject==='math')return `${mathCourse==='all'?'数学':MATH_COURSES[mathCourse].name} · ${mathContentFilter==='all'?'公式与题型':MATH_CONTENT_TYPES[mathContentFilter]}`;
  return subject==='english'?'英语':'全部内容';
}
function scopeControls() {
  const courseButtons=Object.entries(MATH_COURSES).map(([key,c])=>`<button data-course="${key}" aria-pressed="${subject==='math'&&mathCourse===key}" class="scope-button ${subject==='math'&&mathCourse===key?'selected':''}">${c.name}</button>`).join('');
  const countBase=scopeCards(data.cards,{subject:'math',mathCourse});
  return `<div class="scope-controls"><nav class="scope-courses" aria-label="选择学习部分"><button data-subject="all" aria-pressed="${subject==='all'}" class="scope-button ${subject==='all'?'selected':''}">全部 <small>${activeCards(data.cards).length}</small></button><button data-subject="english" aria-pressed="${subject==='english'}" class="scope-button ${subject==='english'?'selected':''}">英语 <small>${data.cards.filter(c=>c.subject==='english').length}</small></button>${courseButtons}</nav>${subject==='math'?`<div class="scope-types" role="group" aria-label="数学内容分类"><button data-content-type="all" aria-pressed="${mathContentFilter==='all'}" class="${mathContentFilter==='all'?'selected':''}">全部 <small>${countBase.length}</small></button>${Object.entries(MATH_CONTENT_TYPES).map(([key,label])=>`<button data-content-type="${key}" aria-pressed="${mathContentFilter===key}" class="${mathContentFilter===key?'selected':''}">${label}<small>${countBase.filter(c=>c.contentType===key).length}</small></button>`).join('')}</div>`:''}</div>`;
}
function changeScope(nextSubject,nextCourse='all',nextType='all') {
  subject=nextSubject;mathCourse=nextCourse;mathContentFilter=nextType;libraryPage=1;vocabularyFilter='all';search='';session=null;revealed=false;
  if(page!=='study'&&page!=='library')page='library';render();
}
function studyView() {
  const stats = getStats(selectedCards(),data.logs);
  const q = queue();
  const todayLogs = data.logs.filter(l=>localDay(l.reviewedAt)===localDay(new Date()));
  const todayUnique = new Set(todayLogs.map(l=>l.cardId)).size;
  const card = session?.ids.length ? data.cards.find(c=>c.id===session.ids[0]) : null;
  const welcome = heading(session ? '专注于这一次回想。' : scopeName(), `${dateText(new Date())} · 先回想，再看答案`, `<button class="button secondary heading-add" data-action="add">${icon('plus')} 添加卡片</button>`);
  const plan = `<div class="plan-strip"><div><span class="plan-dot rust"></span>到期复习 <strong>${stats.due}</strong></div><div><span class="plan-dot green"></span>今日可学新卡 <strong>${q.filter(c=>c.schedule.reps===0).length}</strong></div><div><span class="plan-dot muted"></span>今日已回想 <strong>${todayUnique}</strong><span class="plan-unit">张</span></div><span class="plan-limit">每日新卡上限 ${data.settings.dailyNewLimit} 张</span></div>`;
  const subjectPanel = `<aside class="study-aside"><section class="subject-summary"><h2>数学学习地图</h2>${Object.entries(MATH_COURSES).map(([key,c])=>{const cards=scopeCards(data.cards,{subject:'math',mathCourse:key});return `<button data-course="${key}" class="subject-summary-row"><span class="subject-mark math" aria-hidden="true">${c.symbol}</span><span><strong>${c.name}</strong><small>公式 ${cards.filter(card=>card.contentType==='formula').length} · 题型 ${cards.filter(card=>card.contentType==='problem').length}</small></span><span class="subject-summary-count">${cards.filter(card=>card.schedule.reps>0).length}<small>/ ${cards.length} 张已学</small></span></button>`;}).join('')}</section><section class="recall-note"><span class="note-glyph" aria-hidden="true">“</span><h2>${subject==='math'&&mathContentFilter==='problem'?'记方法，也记为什么。':'先回想，再看答案。'}</h2><p>${subject==='math'?'公式卡记住表达式与适用条件；题型卡先识别特征，再复述方法，最后核对例题步骤。':'不急着翻面。先试着说出词义，再结合例句检查自己的理解。'}</p><a href="#library" data-page="library">查看当前卡片 ${icon('arrow')}</a></section><div class="example-note">${icon('book')}数学基础库包含照片中的泰勒展开、积分公式，以及三部分的常见题型。可继续添加自己的课堂与练习笔记。</div></aside>`;
  let body;
  if (session && card) body = reviewView(card);
  else if (session) body = `<section class="study-card completion"><div class="completion-mark">${icon('check')}</div><h2>这一轮，记忆又深了一点。</h2><p>完成了 <strong>${session.completed}</strong> 次回想。已经为你安排好下一次复习。</p>${nextDue()}<div class="completion-actions"><button class="button primary" data-action="end">返回今日学习 ${icon('arrow')}</button><button class="button text" data-page="history">查看学习记录</button></div></section>`;
  else if (!selectedCards().length) body = `<section class="study-card welcome-card"><div class="ready-meta">你的知识库，从这里开始</div><h2>把值得记住的，<br>留在这里。</h2><p>写下一个问题和它的答案，开始第一次主动回忆。</p><button class="button primary" data-action="add">${icon('plus')} 创建第一张卡片</button></section>`;
  else if (!q.length) body = `<section class="study-card completion"><div class="completion-mark">${icon('check')}</div><h2>此刻的复习，完成了。</h2><p>给记忆一点沉淀的时间，到期后再来回想。</p>${nextDue()}<button class="button secondary" data-page="library">整理我的卡片 ${icon('arrow')}</button></section>`;
  else {const first=q[0];body=`<section class="study-card welcome-card"><h2>学过的知识，<br>值得再想起一次。</h2><p>当前范围共 <strong>${selectedCards().length}</strong> 张卡片，今天安排 <strong>${q.length}</strong> 张。<br>新卡按每日上限安排，其余卡片可在“我的卡片”查看。</p><div class="question-peek"><span>${subjects[first.subject].name} · ${first.subject==='math'?`${MATH_COURSES[first.mathCourse].name} · ${MATH_CONTENT_TYPES[first.contentType]}`:first.tags?.[0]?esc(first.tags[0]):'回想问题'}</span><div class="math-content">${esc(first.kind==='cloze'?parseCloze(first.front).question:first.front)}</div></div><button class="button primary start-button" data-action="start">开始今日学习 ${icon('arrow')}</button><small class="keyboard-hint">先回想，再翻面，最后评价记忆</small></section>`;}
  const progress = session ? `<div class="session-progress"><span>本轮进度 <strong>${session.completed} / ${session.total}</strong></span><div class="progress-track"><div style="width:${Math.min(100,session.completed/session.total*100)}%"></div></div><button class="button text" data-action="end">稍后继续</button></div>` : '';
  return `${welcome}${scopeControls()}${plan}<div class="study-layout"><div class="study-main">${progress}${body}${session&&card?'<p class="shortcut-note"><kbd>空格</kbd> 显示答案 <span>·</span> <kbd>1</kbd>–<kbd>4</kbd> 评分 <span>·</span> <kbd>Z</kbd> 撤销</p>':'<div class="study-footnote">'+icon('clock')+'到期卡片优先，新卡按每日上限加入。每次评分后立即保存。</div>'}</div>${subjectPanel}</div>`;
}
function nextDue() {
  const future=selectedCards().filter(c=>c.schedule.reps>0&&Date.parse(c.schedule.due)>Date.now()).sort((a,b)=>Date.parse(a.schedule.due)-Date.parse(b.schedule.due));
  return future.length?`<p class="next-due">${icon('clock')} 最近一次复习在 ${relative(Date.parse(future[0].schedule.due)-Date.now())}后</p>`:'';
}
function reviewView(card) {
  const cloze = card.kind==='cloze'?parseCloze(card.front):null;
  const previews = revealed?previewRatings(card):[];
  return `<section class="study-card review-card"><div class="review-meta"><span class="subject-label ${card.subject}">${card.subject==='math'?MATH_COURSES[card.mathCourse].name:subjects[card.subject].name}</span>${card.subject==='math'?`<span class="math-content-label">${MATH_CONTENT_TYPES[card.contentType]}</span>`:''}<span>${card.kind==='cloze'?'填空回忆':'问答回忆'} · ${card.schedule.reps?'复习':'新卡'}</span><button class="icon-button" data-action="edit" data-id="${esc(card.id)}" aria-label="编辑当前卡片">${icon('edit')}</button></div><div class="question-area"><p class="question-instruction">${cloze?'在心里补全空缺的内容':'试着在心里说出答案'}</p><h2 class="question math-content">${esc(cloze?cloze.question:card.front)}</h2>${card.subject==='english'?`<button class="button text speak" data-action="speak" data-id="${esc(card.id)}">${icon('speaker')} 朗读</button>`:''}</div>${revealed?`<div class="answer-area"><div class="answer-label">参考答案</div><div class="answer math-content">${esc(cloze?cloze.answer:card.back)}</div>${cloze&&card.back?`<div class="answer-explanation math-content">${esc(card.back)}</div>`:''}${card.notes?`<div class="card-notes math-content"><strong>理解与提示</strong><p>${esc(card.notes)}</p></div>`:''}</div><div class="rating-area"><p>这次，你记得怎么样？<span>按真实感受选择</span></p><div class="rating-buttons">${previews.map(p=>`<button class="rating rating-${p.rating}" data-rating="${p.rating}"><span><kbd>${p.rating}</kbd>${ratingNames[p.rating]}</span><small>${relative(p.intervalMs)}后</small></button>`).join('')}</div></div>`:`<div class="reveal-area"><p>想不起来也没关系，先尝试，再揭晓。</p><button class="button primary reveal-button" data-action="reveal">显示答案 <span class="key-on-dark">空格</span></button></div>`}</section>`;
}
function filteredLibraryCards() {
  return selectedCards().filter(c=>vocabularyFilter==='all'||c.subject==='english'&&c.tags.includes(vocabularyFilter==='word'?'单词':'词组'))
    .filter(c=>`${c.front} ${c.back} ${c.notes} ${c.tags.join(' ')}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
    .filter(c=>statusFilter==='all'||statusFilter==='new'&&c.schedule.reps===0||statusFilter==='due'&&c.schedule.reps>0&&Date.parse(c.schedule.due)<=Date.now()||statusFilter==='learned'&&c.schedule.reps>0);
}
function libraryResults(cards) {
  const pages=Math.max(1,Math.ceil(cards.length/LIBRARY_PAGE_SIZE));
  libraryPage=Math.min(pages,Math.max(1,libraryPage));
  const visible=cards.slice((libraryPage-1)*LIBRARY_PAGE_SIZE,libraryPage*LIBRARY_PAGE_SIZE);
  const pagination=position=>cards.length>LIBRARY_PAGE_SIZE?`<nav class="library-pagination" aria-label="${position}卡片分页"><button class="button secondary" data-action="previous-page" ${libraryPage===1?'disabled':''}>上一页</button><span>第 ${libraryPage} / ${pages} 页 · 每页 ${LIBRARY_PAGE_SIZE} 张</span><button class="button secondary" data-action="next-page" ${libraryPage===pages?'disabled':''}>下一页</button></nav>`:'';
  return pagination('顶部')+libraryRows(visible)+pagination('底部');
}
function libraryView() {
  const filtered=filteredLibraryCards();
  const imported=data.cards.filter(c=>c.id.startsWith('readinglab-v1-'));
  const words=imported.filter(c=>c.tags.includes('单词')).length;
  const phrases=imported.filter(c=>c.tags.includes('词组')).length;
  return `${heading(subject==='math'?scopeName():subject==='english'?'英语 · 单词与词组':'全部卡片',subject==='math'?'公式记表达与条件，题型记识别、方法与例题。':imported.length?`Reading Lab：${words} 个单词 · ${phrases} 个词组。支持按类型筛选与全文搜索。`:'每张卡片只问一件事，让每次回想更专注。',`<button class="button primary" data-action="add">${icon('plus')} 添加卡片</button>`)}${scopeControls()}<div class="library-toolbar"><label class="search-field">${icon('search')}<input id="search" type="search" aria-label="搜索卡片" placeholder="搜索问题、答案或标签" value="${esc(search)}"></label>${subject!=='math'?`<label class="filter-label">英语内容<select id="vocabulary-filter" aria-label="英语内容"><option value="all" ${vocabularyFilter==='all'?'selected':''}>全部内容</option><option value="word" ${vocabularyFilter==='word'?'selected':''}>单词${words?`（${words}）`:''}</option><option value="phrase" ${vocabularyFilter==='phrase'?'selected':''}>词组${phrases?`（${phrases}）`:''}</option></select></label>`:''}<label class="filter-label">学习状态<select id="status-filter"><option value="all" ${statusFilter==='all'?'selected':''}>全部状态</option><option value="new" ${statusFilter==='new'?'selected':''}>尚未学习</option><option value="due" ${statusFilter==='due'?'selected':''}>现在到期</option><option value="learned" ${statusFilter==='learned'?'selected':''}>已经学习</option></select></label><span class="result-count" aria-live="polite">共 ${filtered.length} 张卡片${subject!=='all'?` · ${scopeName()}`:''}</span></div><div id="library-results">${libraryResults(filtered)}</div>`;
}
function libraryRows(cards) {
  return cards.length?`<div class="library-list"><div class="library-table-head"><span>问题与答案</span><span>复习安排</span><span>操作</span></div>${cards.map(c=>`<article class="library-row"><div class="library-content"><div class="library-card-meta"><span class="subject-label ${c.subject}">${c.subject==='math'?MATH_COURSES[c.mathCourse].name:subjects[c.subject].name}</span>${c.subject==='math'?`<span class="math-content-label">${MATH_CONTENT_TYPES[c.contentType]}</span>`:''}<span>${c.kind==='cloze'?'填空卡':'问答卡'}</span>${c.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div><h2 class="math-content">${esc(c.kind==='cloze'?parseCloze(c.front).question:c.front)}</h2><details><summary>查看答案</summary><div class="math-content library-answer">${esc(c.kind==='cloze'?parseCloze(c.front).answer:c.back)}</div>${c.notes?`<p class="math-content">${esc(c.notes)}</p>`:''}</details></div><span class="due-label ${c.schedule.reps&&Date.parse(c.schedule.due)<=Date.now()?'is-due':''}">${dueText(c)}</span><div class="row-actions"><button class="icon-button" data-action="edit" data-id="${esc(c.id)}" aria-label="编辑卡片">${icon('edit')}</button><button class="icon-button delete-button" data-action="delete" data-id="${esc(c.id)}" aria-label="删除卡片">${icon('close')}</button></div></article>`).join('')}</div>`:`<div class="empty-state">${icon('cards')}<h2>${data.cards.length?'没有找到匹配的卡片':'这里还没有卡片'}</h2><p>${data.cards.length?'试试其他关键词、学科或学习状态。':'从一个熟悉的问题开始，添加你的第一张卡片。'}</p><button class="button secondary" data-action="${data.cards.length?'clear-filters':'add'}">${data.cards.length?'清除筛选':'添加卡片'}</button></div>`;
}
function historyView() {
  const stats=getStats(data.cards,data.logs);
  const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return {date:d,count:data.logs.filter(l=>localDay(l.reviewedAt)===localDay(d)).length};});
  const max=Math.max(5,...days.map(d=>d.count));
  const rows=data.logs.slice().reverse().slice(0,50);
  return `${heading('看见每一次积累。','这里记录真实的回想，而不是停留的时长。')}<div class="history-summary"><div><span>今日回想</span><strong>${stats.reviewsToday}<small>次</small></strong></div><div><span>已学卡片</span><strong>${stats.learned}<small>/ ${stats.total} 张</small></strong></div><div><span>连续学习</span><strong>${stats.streak}<small>天</small></strong></div></div><section class="history-chart"><div class="section-title"><h2>最近七天</h2><span>回想次数 · 同一张卡可多次复习</span></div><div class="bars" aria-label="最近七天回想次数">${days.map(d=>`<div class="bar-group"><span>${d.count}</span><div class="bar-column"><div class="bar ${localDay(d.date)===localDay(new Date())?'today':''}" style="height:${d.count/max*100}%"></div></div><span>${d.date.getMonth()+1}/${d.date.getDate()}</span></div>`).join('')}</div>${data.logs.length?'':'<p class="chart-empty">完成第一次回想后，你的积累会出现在这里。</p>'}</section><section class="review-history"><div class="section-title"><h2>最近的回想</h2><span>显示最近 50 条</span></div>${rows.length?`<ol class="history-list">${rows.map(l=>{const c=data.cards.find(c=>c.id===l.cardId);return `<li><span class="history-dot rating-dot-${l.rating}"></span><div><strong>${esc(c?(c.kind==='cloze'?parseCloze(c.front).question:c.front).slice(0,100):'已删除的卡片')}</strong><span>${dateText(l.reviewedAt)} ${timeText(l.reviewedAt)}</span></div><span class="history-rating">${ratingNames[l.rating]}</span><time>下次 ${new Intl.DateTimeFormat('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(l.dueAfter))}</time></li>`;}).join('')}</ol>`:`<div class="empty-state compact"><h3>每段积累，都有一个开始。</h3><p>去完成一张卡片的回想，留下今天的第一条记录。</p><button class="button secondary" data-page="study">前往今日学习 ${icon('arrow')}</button></div>`}</section>`;
}
function importPreview() {
  if(!pendingImport)return '';
  const reading=pendingImport.importInfo?.type==='readinglab';
  const added=pendingImport.cards.filter(c=>!data.cards.some(x=>x.id===c.id)).length;
  const removable=removableExamples(data.cards,data.logs).length;
  const info=pendingImport.importInfo;
  return `<div class="import-preview" role="status"><h3>${reading?'Reading Lab 资料已检查':'备份已检查'}</h3><p>${reading?`${info.words} 个单词、${info.phrases} 个词组；跳过 ${info.skipped} 条其他知识，合并 ${info.duplicates} 条文件内重复词条。音标、例句、解析与来源一并保留。`:`${pendingImport.cards.length} 张卡片，${pendingImport.logs.length} 条复习记录。`}</p><p>新增 ${added} 张，已有 ${pendingImport.cards.length-added} 张。${reading?'已有词条保留当前内容与复习进度；新词从新卡开始安排。':'当前每日新卡设置将保留。'}</p>${reading&&removable?`<label class="cleanup-option"><input id="remove-examples" type="checkbox" ${importRemoveExamples?'checked':''}><span>导入成功后，移除 ${removable} 张未修改且未学习的内置示例。清理前自动下载一份拾忆备份。</span></label>`:''}<button class="button primary" data-action="import-confirm">${storageError?'从此备份恢复':reading?'导入单词与词组':'确认合并'}</button><button class="button text" data-action="import-cancel">取消</button></div>`;
}
function backupView() {
  return `${heading('知识留在这里，也握在手里。','定期导出一份备份，让卡片和进度安心保存。')}<div class="backup-layout"><div><section class="settings-section"><h2>学习节奏</h2><form id="settings-form"><label class="setting-row"><span><strong>每天最多学习多少张新卡？</strong><small>到期复习始终优先，不占新卡额度。</small></span><input name="dailyNewLimit" type="number" min="1" max="200" required value="${data.settings.dailyNewLimit}" aria-label="每日新卡上限"></label><button class="button secondary" type="submit">保存学习设置</button></form></section><section class="settings-section"><h2>导出与导入</h2><div class="backup-action"><div><h3>完整备份</h3><p>包含全部 ${data.cards.length} 张卡片、${data.logs.length} 条复习记录和学习设置。</p></div><button class="button primary" data-action="export">${icon('backup')} 导出备份</button><button class="button text" data-action="copy-backup">复制备份</button></div>${backupTextSnapshot?`<div class="backup-text"><p>这是点击“复制备份”时的完整快照，包含全部卡片、复习进度和设置。也可在下方文本框中全选复制。</p><label for="backup-text">完整备份 JSON</label><textarea id="backup-text" class="editor-preview" aria-label="完整备份 JSON" rows="6" readonly spellcheck="false" style="width:100%;box-sizing:border-box">${esc(backupTextSnapshot)}</textarea><button class="button text" data-action="close-backup-text">收起备份文本</button></div>`:''}<div class="backup-action"><div><h3>导入 Reading Lab 或拾忆资料</h3><p>支持 Reading Lab 本地 ZIP、知识 JSON、个人备份，以及拾忆备份。Reading Lab 仅提取单词与词组；文件在本机处理。</p></div><label class="button secondary file-button">选择本地资料<input id="import-file" type="file" accept=".json,.zip,application/json,application/zip" aria-label="选择 Reading Lab 或拾忆资料"></label></div>${importLoading?'<p class="import-loading" role="status">正在本地检查资料，只提取单词与词组…</p>':''}${importPreview()}${loaded.raw!=null&&storageError?'<p class="recovery-note">恢复前，请先导出原始资料，再选择一份有效备份。原始内容不会自动覆盖。</p><button class="button secondary" data-action="export-raw">导出无法读取的原始资料</button>':''}${lastImportUndo?'<p class="import-undo-note">上次导入已保存。<button class="button text" data-action="undo-import">撤销上次导入</button></p>':''}</section><section class="settings-section about-section"><h2>关于这间学习室</h2><details><summary>为什么每张卡的复习间隔不一样？</summary><p>拾忆使用 FSRS 间隔复习算法，根据你的回忆评分更新卡片的难度和记忆稳定性，安排下一次复习。它是一项辅助安排，不保证记忆效果。请按真实感受评分。</p><a href="https://github.com/open-spaced-repetition/ts-fsrs" target="_blank" rel="noopener noreferrer">查看 ts-fsrs 开源项目</a></details><details><summary>如何写公式和填空卡？</summary><p>公式用 $...$ 包裹，例如 $E=mc^2$；独立一行用 $$...$$。填空用 {{c1::要记住的内容}}，同卡的所有空缺一起隐藏、一起揭晓。不执行卡片中的 HTML。</p></details><details><summary>如何换电脑或换浏览器？</summary><p>在原浏览器导出 JSON 备份，再到新浏览器选择备份并确认合并。不同浏览器、网址和设备分别保存资料，不会自动同步。</p></details><details><summary>数学基础库的内容依据</summary><p>高数整理了所提供照片中的泰勒展开与积分，并补充常见题型；概率论和线性代数补充基础公式与代表题型。这是起步资料，可按课程继续增加。</p>${MATH_SOURCES.map(source=>`<p><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a></p>`).join('')}</details><div class="open-source"><a href="https://github.com/open-spaced-repetition/ts-fsrs" target="_blank" rel="noopener noreferrer">ts-fsrs · MIT</a><a href="https://github.com/KaTeX/KaTeX" target="_blank" rel="noopener noreferrer">KaTeX · MIT</a></div></section></div><aside class="backup-aside">${icon('shield')}<h2>资料属于你。</h2><p>卡片、笔记和学习进度保存在当前浏览器。网站不需要账号，也不上传这些资料。</p><p>清除浏览器数据、使用隐私窗口，或更换网站地址后，本地资料可能无法保留。建议每周导出一份备份。</p><p>Reading Lab 资料只在本机提取。再次导入会跳过已有词条，保留你在拾忆中的修改和复习进度。</p></aside></div>`;
}
function render() {
  app.innerHTML=shell(({study:studyView,library:libraryView,history:historyView,backup:backupView})[page]());
  math();
}
function navigate(next) {
  if (!['study','library','history','backup'].includes(next)) return;
  page=next; history.replaceState(null,'',`#${next}`); render();
  document.querySelector('#main').focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'});
}
function openEditor(id) {
  editingId=id || null;
  const c=data.cards.find(c=>c.id===id);
  returnFocus=document.activeElement;
  editor.innerHTML=`<form id="card-form"><div class="dialog-header"><div><h2 id="editor-title">${c?'编辑卡片':'添加一张卡片'}</h2><p>一个清晰的问题，就是一次好的回想。</p></div><button class="icon-button" type="button" data-action="close-editor" aria-label="关闭编辑器">${icon('close')}</button></div><div class="editor-scroll"><div class="form-two"><label>学科<select name="subject">${Object.entries(subjects).map(([k,s])=>`<option value="${k}" ${(c?.subject || (subject==='all'?'math':subject))===k?'selected':''}>${s.name}</option>`).join('')}</select></label><label>卡片类型<select name="kind"><option value="basic" ${c?.kind!=='cloze'?'selected':''}>问答卡</option><option value="cloze" ${c?.kind==='cloze'?'selected':''}>填空卡</option></select></label></div><div id="math-editor-fields" class="form-two"><label>数学部分<select name="mathCourse">${Object.entries(MATH_COURSES).map(([k,course])=>`<option value="${k}" ${(c?.mathCourse || (mathCourse==='all'?'calculus':mathCourse))===k?'selected':''}>${course.name}</option>`).join('')}</select></label><label>内容分类<select name="contentType">${Object.entries(MATH_CONTENT_TYPES).map(([k,label])=>`<option value="${k}" ${(c?.contentType || (mathContentFilter==='all'?'formula':mathContentFilter))===k?'selected':''}>${label}</option>`).join('')}</select></label></div><label><span id="front-label">问题 / 填空原文</span><textarea name="front" rows="3" required maxlength="12000" placeholder="例如：写出分部积分公式，或说明如何识别换元积分题。">${esc(c?.front || '')}</textarea></label><p class="field-hint">公式：$\\int u\\,dv$ · 填空：连续不一定 {{c1::可导}}。所有空缺同时隐藏。</p><label>答案 / 补充解释<textarea name="back" rows="3" maxlength="16000" placeholder="问答卡填写答案；填空卡可选填解释。">${esc(c?.back || '')}</textarea></label><label>理解与提示（选填）<textarea name="notes" rows="2" maxlength="16000" placeholder="适用条件、易错点，或一个帮助理解的例子。">${esc(c?.notes || '')}</textarea></label><label>标签（选填，用逗号分隔）<input name="tags" maxlength="600" value="${esc(c?.tags?.join('，') || '')}" placeholder="例如：泰勒展开，积分"></label><details class="preview-details" open><summary>实时预览</summary><div id="editor-preview" class="editor-preview"></div></details><p id="form-error" class="form-error" role="alert"></p></div><div class="dialog-footer"><button type="button" class="button text" data-action="close-editor">取消</button><button type="submit" class="button primary">${c?'保存修改':'保存卡片'}</button></div></form>`;
  updatePreview(); editor.showModal();
}
function updatePreview() {
  const form=editor.querySelector('form');if(!form)return;
  const subjectValue=form.querySelector('[name="subject"]').value;const mathFields=form.querySelector('#math-editor-fields');mathFields.hidden=subjectValue!=='math';mathFields.querySelectorAll('select').forEach(el=>el.disabled=subjectValue!=='math');
  const values=new FormData(form);const front=String(values.get('front')||'');const back=String(values.get('back')||'');const cloze=values.get('kind')==='cloze'?parseCloze(front):null;
  editor.querySelector('[name="back"]').required=!cloze;
  editor.querySelector('#editor-preview').innerHTML=`<small>问题</small><div>${esc(cloze?cloze.question:front)||'输入问题后，这里会显示预览。'}</div><small>答案</small><div>${esc(cloze?cloze.answer:back)||'输入答案后，这里会显示预览。'}</div>`;
  math(editor.querySelector('#editor-preview'));
}
function closeEditor() { editor.close(); returnFocus?.isConnected&&returnFocus.focus(); }
function confirmAction(title, body, callback, label='确认删除') {
  confirmation.innerHTML=`<div class="dialog-header"><h2 id="confirmation-title">${esc(title)}</h2><button class="icon-button" data-action="close-confirmation" aria-label="取消">${icon('close')}</button></div><p class="confirmation-body">${esc(body)}</p><div class="dialog-footer"><button class="button text" data-action="close-confirmation">取消</button><button class="button danger" id="confirm-action">${esc(label)}</button></div>`;
  confirmation.querySelector('#confirm-action').addEventListener('click',()=>{callback();confirmation.close();},{once:true});confirmation.showModal();
}
function download(name,text) { const blob=new Blob([text],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000); }
function undoReview() {
  if(!lastReview)return notify('目前没有可撤销的评分。');
  const current=data.cards.find(c=>c.id===lastReview.before.id);
  if(!current||current.updatedAt!==lastReview.after.updatedAt)return notify('这张卡片已修改，无法撤销这次评分。');
  if(persist({...data,cards:data.cards.map(c=>c.id===current.id?lastReview.before:c),logs:data.logs.filter(l=>l.id!==lastReview.log.id)})){
    session=structuredClone(lastReview.session);revealed=true;lastReview=null;page='study';render();notify('已撤销评分，回到刚才的卡片。');
  }
}
function rate(rating) {
  if(!revealed||!session?.ids.length)return;
  const before=data.cards.find(c=>c.id===session.ids[0]);if(!before)return;
  const result=reviewCard(before,Number(rating));
  if(persist({...data,cards:data.cards.map(c=>c.id===before.id?result.card:c),logs:[...data.logs,result.log]})){
    lastReview={before,after:result.card,log:result.log,session:structuredClone(session)};session.ids.shift();session.completed++;revealed=false;render();notify(`已保存，下次在${relative(Date.parse(result.card.schedule.due)-Date.now())}后复习。`,true);
    document.querySelector('.reveal-button, .completion .button')?.focus({preventScroll:true});
  }
}
function speak(id) {
  if(!('speechSynthesis' in window))return notify('当前浏览器不支持朗读，请在支持语音的浏览器中使用。');
  const card=data.cards.find(c=>c.id===id);if(!card)return;
  const utterance=new SpeechSynthesisUtterance((card.kind==='cloze'?(revealed?parseCloze(card.front).answer:parseCloze(card.front).question):card.front).replace(/\$[^$]*\$/g,''));
  utterance.lang='en-US';utterance.rate=.85;speechSynthesis.cancel();speechSynthesis.speak(utterance);
}
document.addEventListener('click',async event=>{
  const el=event.target.closest('button,a,label');if(!el)return;
  if(el.dataset.page){event.preventDefault();navigate(el.dataset.page);return;}
  if(el.dataset.course){changeScope('math',el.dataset.course,el.dataset.mathType||'all');return;}
  if(el.dataset.contentType){changeScope('math',mathCourse,el.dataset.contentType);return;}
  if(el.dataset.subject){changeScope(el.dataset.subject);return;}
  if(el.dataset.rating){rate(el.dataset.rating);return;}
  const id=el.dataset.id;
  switch(el.dataset.action){
    case 'add':openEditor();break;
    case 'edit':openEditor(id);break;
    case 'close-editor':closeEditor();break;
    case 'close-confirmation':confirmation.close();break;
    case 'delete':confirmAction('删除这张卡片？','卡片将从知识库移除，已有复习记录会保留。建议先导出备份。',()=>{if(persist({...data,cards:data.cards.filter(c=>c.id!==id)})){if(session)session.ids=session.ids.filter(x=>x!==id);render();notify('卡片已删除。');}});break;
    case 'start':{const ids=queue().map(c=>c.id);if(ids.length){session={ids,total:ids.length,completed:0};revealed=false;render();document.querySelector('.reveal-button')?.focus({preventScroll:true});}break;}
    case 'reveal':revealed=true;render();document.querySelector('.rating-3')?.focus({preventScroll:true});break;
    case 'end':session=null;revealed=false;render();break;
    case 'undo':undoReview();break;
    case 'speak':speak(id);break;
    case 'clear-filters':search='';statusFilter='all';vocabularyFilter='all';libraryPage=1;render();break;
    case 'export':try{download(`拾忆备份-${new Date().toISOString().slice(0,10)}.json`,exportBackup(data));notify('备份已下载，包含全部卡片和复习进度。');}catch(error){notify(error.message);}break;
    case 'copy-backup':{
      let backup;
      try{backup=exportBackup(data);}catch(error){notify(error.message);break;}
      backupTextSnapshot=backup;
      render();
      try{
        if(!navigator.clipboard?.writeText)throw new Error('clipboard-unavailable');
        await navigator.clipboard.writeText(backup);
        notify('完整备份已复制，包含全部卡片、复习进度和学习设置；下方也可手动全选复制。');
      }catch{notify('浏览器未允许写入剪贴板，或当前页面不支持。请在下方“完整备份 JSON”文本框中全选复制，也可点击“导出备份”下载。');}
      break;
    }
    case 'close-backup-text':backupTextSnapshot='';render();break;
    case 'export-raw':download('拾忆原始资料.json',loaded.raw);recoveryExported=true;notify('原始资料已下载，可选择有效备份来恢复。');break;
    case 'import-cancel':pendingImport=null;importRun++;importLoading=false;render();break;
    case 'import-confirm':{
      if(!pendingImport)break;
      if(storageError){
        if(loaded.raw==null){notify('浏览器仍禁止读取本地资料，请先恢复存储权限再刷新。');break;}
        if(!recoveryExported){notify('恢复前，请先导出无法读取的原始资料。');break;}
        confirmAction('用这份备份恢复学习资料？','已下载的原始资料仍可保留。当前浏览器中无法读取的内容将由这份已检查的备份替换。',()=>{try{recoverData(pendingImport,loaded.raw);data=pendingImport;pendingImport=null;storageError='';render();notify('资料已从备份恢复，可以继续学习。');}catch(error){notify(error.message);}},'确认恢复');
      }else{try{
        const reading=pendingImport.importInfo?.type==='readinglab';
        const result=prepareImport(data,pendingImport,{removeExamples:reading&&importRemoveExamples});
        const before=data;
        if(result.removed.length)download(`拾忆导入前备份-${new Date().toISOString().replace(/[:.]/g,'-')}.json`,exportBackup(before));
        if(persist(result.data)){
          lastImportUndo={before,after:data};pendingImport=null;session=null;revealed=false;libraryPage=1;search='';statusFilter='all';vocabularyFilter='all';
          if(reading){subject='english';mathCourse='all';mathContentFilter='all';page='library';history.replaceState(null,'','#library');}
          render();notify(`已新增 ${result.added} 张，保留已有 ${result.existing} 张${result.removed.length?`，清理 ${result.removed.length} 张示例`:''}。`);
        }
      }catch(error){notify(error.message);}}
      break;
    }
    case 'undo-import':{
      if(!lastImportUndo)return;
      if(data!==lastImportUndo.after){notify('导入后已有其他修改，可导入下载的备份找回原有卡片；新增词条会保留。');break;}
      if(persist(lastImportUndo.before)){lastImportUndo=null;render();notify('已撤销上次导入，原有卡片恢复。');}break;
    }
    case 'previous-page':libraryPage--;render();document.querySelector('.library-toolbar')?.scrollIntoView({block:'start'});break;
    case 'next-page':libraryPage++;render();document.querySelector('.library-toolbar')?.scrollIntoView({block:'start'});break;

  }
});
document.addEventListener('submit',event=>{
  if(event.target.id==='card-form'){
    event.preventDefault();const values=Object.fromEntries(new FormData(event.target));values.tags=values.tags.split(/[,，]/).map(t=>t.trim()).filter(Boolean);
    try{const old=data.cards.find(c=>c.id===editingId);const card=old?updateCard(old,values):createCard(values);if(persist({...data,cards:old?data.cards.map(c=>c.id===old.id?card:c):[...data.cards,card]})){closeEditor();render();notify(old?'卡片已更新，复习进度已保留。':'新卡片已保存，已加入学习安排。');}}
    catch(error){editor.querySelector('#form-error').textContent=error.message;}
  }
  if(event.target.id==='settings-form'){
    event.preventDefault();const n=Number(new FormData(event.target).get('dailyNewLimit'));if(!Number.isInteger(n)||n<1||n>200)return notify('每日新卡数量应为 1 到 200 的整数。');
    if(persist({...data,settings:{...data.settings,dailyNewLimit:n}})){render();notify('学习设置已保存。');}
  }
});
document.addEventListener('input',event=>{
  if(event.target.closest('#card-form'))updatePreview();
  if(event.target.id==='search'){
    search=event.target.value;
    libraryPage=1;const cards=filteredLibraryCards();
    document.querySelector('#library-results').innerHTML=libraryResults(cards);document.querySelector('.result-count').textContent=`共 ${cards.length} 张卡片${subject!=='all'?` · ${scopeName()}`:''}`;math(document.querySelector('#library-results'));
  }
});
document.addEventListener('change',async event=>{
  if(event.target.id==='status-filter'){statusFilter=event.target.value;libraryPage=1;render();}
  if(event.target.id==='vocabulary-filter'){vocabularyFilter=event.target.value;libraryPage=1;if(vocabularyFilter!=='all'){subject='english';mathCourse='all';mathContentFilter='all';}render();}
  if(event.target.id==='remove-examples')importRemoveExamples=event.target.checked;
  if(event.target.id==='import-file'){
    const file=event.target.files[0];if(!file)return;
    const zipped=/\.zip$/i.test(file.name);const limit=(zipped?140:20)*1024*1024;
    if(file.size>limit)return notify(zipped?'ZIP 资料包不能超过 140 MB。':'JSON 资料不能超过 20 MB。');
    const run=++importRun;pendingImport=null;importLoading=true;render();
    try{
      let incoming;
      if(zipped){const {parseReadingLabZip}=await import('./readinglab-import.js');incoming=await parseReadingLabZip(new Uint8Array(await file.arrayBuffer()));}
      else{const text=await file.text();let header;try{header=JSON.parse(text);}catch{throw new Error('文件不是有效的 JSON。');}
        if(header?.app==='recall-garden')incoming=parseBackup(text);
        else{const {parseReadingLabImport}=await import('./readinglab-import.js');incoming=await parseReadingLabImport(text);}
      }
      if(run!==importRun)return;
      pendingImport=incoming;importLoading=false;importRemoveExamples=true;render();notify('资料已检查，请查看导入预览。');
    }catch(error){if(run===importRun){pendingImport=null;importLoading=false;render();notify(error.message);}}

  }
  if(event.target.closest('#card-form'))updatePreview();
});
document.addEventListener('keydown',event=>{
  if(editor.open||confirmation.open||event.ctrlKey||event.metaKey||event.altKey||['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return;
  if(page==='study'&&session?.ids.length){
    if(event.code==='Space'&&!revealed){event.preventDefault();revealed=true;render();document.querySelector('.rating-3')?.focus({preventScroll:true});}
    else if(/^[1-4]$/.test(event.key)&&revealed){event.preventDefault();rate(event.key);}
  }
  if(event.key.toLowerCase()==='z'&&page==='study'){event.preventDefault();undoReview();}
});
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY){notify('另一个标签页更新了资料。请刷新后继续，以读取最新进度。');}});
window.addEventListener('hashchange',()=>{const next=location.hash.slice(1);if(['study','library','history','backup'].includes(next)){page=next;render();}});
setInterval(()=>{if(page==='study'&&!session&&!editor.open&&!confirmation.open)render();},60000);
const initial=location.hash.slice(1);if(['study','library','history','backup'].includes(initial))page=initial;
if(loaded.firstRun){try{saveData(data);}catch(error){storageError=error.message;}}
render();
