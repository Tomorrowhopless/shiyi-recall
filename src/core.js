import { createEmptyCard, fsrs, Rating } from 'ts-fsrs';

const scheduler = fsrs({ enable_fuzz: false, request_retention: 0.9 });
export { Rating };
// Physics remains readable in historical backups; the current interface does not offer it.
export const SUBJECTS = ['math', 'physics', 'english'];
export const MATH_COURSE_KEYS = ['calculus', 'probability', 'linear-algebra'];
export const MATH_TYPE_KEYS = ['formula', 'problem'];
export const DEFAULT_SETTINGS = { dailyNewLimit: 20, mathLibraryVersion: 0, englishDirection: 'en-zh' };
export const BACKUP_VERSION = 1;
const MAX_CARDS = 20000;
const MAX_LOGS = 200000;
const MAX_BYTES = 20 * 1024 * 1024;
const uid = () => globalThis.crypto?.randomUUID?.() || `card-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const iso = (value) => new Date(value).toISOString();
const plain = (value) => JSON.parse(JSON.stringify(value));
const localDay = (value) => { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const dateValid = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const fail = (message) => { throw new Error(message); };
function textField(value, label, max = 12000, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(`${label}不能为空且不能超过 ${max} 个字符`);
  return value.trim();
}
function hydrate(schedule, now = new Date()) {
  const card = { ...createEmptyCard(now), ...schedule };
  card.due = new Date(card.due);
  if (card.last_review) card.last_review = new Date(card.last_review);
  return card;
}
function validateSchedule(value, now) {
  if (value == null) return plain(createEmptyCard(now));
  if (typeof value !== 'object' || Array.isArray(value) || !dateValid(value.due)) fail('卡片复习时间无效');
  const result = { due: iso(value.due) };
  for (const field of ['stability','difficulty','elapsed_days','scheduled_days','reps','lapses','learning_steps','state']) {
    const n = value[field] ?? 0;
    if (!Number.isFinite(n) || n < 0 || n > 100000000) fail('卡片复习参数无效');
    if (['reps','lapses','learning_steps','state'].includes(field) && !Number.isInteger(n)) fail('卡片复习计数无效');
    result[field] = n;
  }
  if (result.state > 3 || result.difficulty > 10) fail('卡片复习状态无效');
  if ((result.reps > 0 && (result.state === 0 || !value.last_review)) || (result.reps === 0 && result.state !== 0) || result.lapses > result.reps) fail('卡片复习进度不一致');
  if (value.last_review != null) {
    if (!dateValid(value.last_review)) fail('上次复习时间无效');
    result.last_review = iso(value.last_review);
  }
  return result;
}
export function parseCloze(text) {
  const source = String(text);
  const marker = /\{\{c\d+::/g;
  const answers = [];
  let question = '';
  let answer = '';
  let cursor = 0;
  let match;
  while ((match = marker.exec(source))) {
    let depth = 0;
    let end = -1;
    let separator = -1;
    const begin = marker.lastIndex;
    for (let i = begin; i < source.length; i++) {
      // Escaped braces are literal LaTeX characters, not grouping braces.
      if (source[i] === '\\') { i++; continue; }
      if (source[i] === '}' && depth === 0 && source[i + 1] === '}') { end = i; break; }
      if (source[i] === '{') depth++;
      else if (source[i] === '}') { if (depth === 0) break; depth--; }
      else if (source[i] === ':' && source[i + 1] === ':' && depth === 0 && separator < 0) { separator = i; i++; }
    }
    if (end < 0) { marker.lastIndex = begin; continue; }
    const content = source.slice(begin, separator < 0 ? end : separator);
    if (!content.length) { marker.lastIndex = end + 2; continue; }
    const hint = separator < 0 ? '' : source.slice(separator + 2, end);
    const prefix = source.slice(cursor, match.index);
    question += prefix + (hint ? `［${hint}］` : '［…］');
    answer += prefix + content;
    answers.push(content);
    cursor = end + 2;
    marker.lastIndex = cursor;
  }
  question += source.slice(cursor);
  answer += source.slice(cursor);
  return { question, answer, answers };
}

export function createCard(input, now = new Date()) {
  if (!input || typeof input !== 'object') fail('卡片格式无效');
  if (!SUBJECTS.includes(input.subject)) fail('请选择数学、物理或英语');
  const kind = input.kind || 'basic';
  if (!['basic','cloze'].includes(kind)) fail('卡片类型无效');
  const front = textField(input.front, '问题', 12000, true);
  const back = textField(input.back ?? '', '答案', 16000, kind === 'basic');
  if (kind === 'cloze' && !parseCloze(front).answers.length) fail('填空卡请使用 {{c1::答案}} 标记');
  const tags = input.tags ?? [];
  if (!Array.isArray(tags) || tags.length > 20 || tags.some(t => typeof t !== 'string' || t.length > 60)) fail('标签最多 20 个，每个不超过 60 字');
  let math = {};
  if (input.subject === 'math') {
    const mathCourse = input.mathCourse ?? (tags.some(t => /线性代数|矩阵|向量/.test(t)) ? 'linear-algebra' : tags.some(t => /概率|统计|随机/.test(t)) ? 'probability' : 'calculus');
    const contentType = input.contentType ?? 'formula';
    if (!MATH_COURSE_KEYS.includes(mathCourse)) fail('数学分区应为高数、概率论或线性代数');
    if (!MATH_TYPE_KEYS.includes(contentType)) fail('数学内容应为公式或题型');
    math = { mathCourse, contentType };
  }
  return { id: uid(), subject: input.subject, ...math, kind, front, back, notes: textField(input.notes ?? '', '笔记', 16000), tags: [...new Set(tags.map(t => t.trim()).filter(Boolean))], createdAt: iso(now), updatedAt: iso(now), schedule: plain(createEmptyCard(now)) };
}
export function updateCard(card, input, now = new Date()) {
  const content = createCard({ ...card, ...input }, now);
  return { ...content, id: card.id, createdAt: card.createdAt, schedule: plain(card.schedule), updatedAt: iso(now) };
}
export function previewRatings(card, now = new Date()) {
  const result = scheduler.repeat(hydrate(card.schedule, now), now);
  return [1,2,3,4].map(rating => ({ rating, due: iso(result[rating].card.due), intervalMs: new Date(result[rating].card.due).getTime() - new Date(now).getTime(), scheduledDays: result[rating].card.scheduled_days }));
}
export function reviewCard(card, rating, now = new Date()) {
  if (![1,2,3,4].includes(Number(rating))) fail('请选择一个有效的回忆评分');
  const previous = hydrate(card.schedule, now);
  const result = scheduler.next(previous, now, Number(rating));
  const next = { ...card, schedule: plain(result.card), updatedAt: iso(now) };
  return { card: next, log: { id: uid(), cardId: card.id, rating: Number(rating), reviewedAt: iso(now), dueBefore: iso(previous.due), dueAfter: iso(result.card.due), stateBefore: previous.state, stateAfter: result.card.state } };
}
export function getQueue(cards, { subject = 'all', now = new Date(), newLimit = 20, logs = [] } = {}) {
  const selected = cards.filter(c => subject === 'all' || c.subject === subject);
  const introduced = new Set(logs.filter(l => l.stateBefore === 0 && localDay(l.reviewedAt) === localDay(now)).map(l => l.cardId));
  const remaining = Math.max(0, Number(newLimit) - introduced.size);
  const due = selected.filter(c => c.schedule.reps > 0 && new Date(c.schedule.due) <= new Date(now)).sort((a,b) => Date.parse(a.schedule.due) - Date.parse(b.schedule.due));
  const fresh = selected.filter(c => c.schedule.reps === 0).sort((a,b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)).slice(0, remaining);
  return [...due, ...fresh];
}
export function getStats(cards, logs = [], now = new Date()) {
  const today = localDay(now);
  const days = new Set(logs.map(l => localDay(l.reviewedAt)));
  const cursor = new Date(now); cursor.setHours(12,0,0,0);
  if (!days.has(today)) cursor.setDate(cursor.getDate()-1);
  let streak = 0;
  while (days.has(localDay(cursor))) { streak++; cursor.setDate(cursor.getDate()-1); }
  return { total: cards.length, due: cards.filter(c => c.schedule.reps > 0 && Date.parse(c.schedule.due) <= +new Date(now)).length, new: cards.filter(c => c.schedule.reps === 0).length, learned: cards.filter(c => c.schedule.reps > 0).length, reviewsToday: logs.filter(l => localDay(l.reviewedAt) === today).length, streak };
}
function validateCard(value, now) {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !value.id.length || value.id.length > 100) fail('卡片 ID 无效');
  if (!dateValid(value.createdAt) || !dateValid(value.updatedAt)) fail('卡片创建或修改日期无效');
  const card = createCard(value, now);
  return { ...card, id: value.id, createdAt: iso(value.createdAt), updatedAt: iso(value.updatedAt), schedule: validateSchedule(value.schedule, now) };
}
function validateLog(value) {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !value.id.length || value.id.length > 100 || typeof value.cardId !== 'string' || !value.cardId.length || value.cardId.length > 100 || ![1,2,3,4].includes(value.rating) || !dateValid(value.reviewedAt) || !dateValid(value.dueBefore) || !dateValid(value.dueAfter) || ![0,1,2,3].includes(value.stateBefore) || ![0,1,2,3].includes(value.stateAfter)) fail('复习记录格式无效');
  return { id: value.id, cardId: value.cardId, rating: value.rating, reviewedAt: iso(value.reviewedAt), dueBefore: iso(value.dueBefore), dueAfter: iso(value.dueAfter), stateBefore: value.stateBefore, stateAfter: value.stateAfter };
}
export function parseBackup(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_BYTES) fail('备份文件不能超过 20 MB');
  let data; try { data = JSON.parse(text); } catch { fail('文件不是有效的 JSON 备份'); }
  if (!data || data.app !== 'recall-garden' || data.version !== BACKUP_VERSION || !Array.isArray(data.cards) || !Array.isArray(data.logs)) fail('这不是受支持的背诵网站备份（版本 1）');
  if (data.cards.length > MAX_CARDS || data.logs.length > MAX_LOGS) fail('备份超过卡片或复习记录数量限制');
  const cards = data.cards.map(c => validateCard(c, new Date()));
  const logs = data.logs.map(validateLog);
  if (new Set(cards.map(c=>c.id)).size !== cards.length || new Set(logs.map(l=>l.id)).size !== logs.length) fail('备份中存在重复 ID');
  const dailyNewLimit = data.settings?.dailyNewLimit ?? 20;
  if (!Number.isInteger(dailyNewLimit) || dailyNewLimit < 1 || dailyNewLimit > 200) fail('每日新卡数量应在 1 到 200 之间');
  const mathLibraryVersion = data.settings?.mathLibraryVersion ?? 0;
  if (!Number.isInteger(mathLibraryVersion) || mathLibraryVersion < 0 || mathLibraryVersion > 10000) fail('数学内容版本无效');
  const englishDirection = data.settings?.englishDirection ?? 'en-zh';
  if (!['en-zh', 'zh-en'].includes(englishDirection)) fail('英语背诵方向无效');
  return { cards, logs, settings: { dailyNewLimit, mathLibraryVersion, englishDirection } };
}
export function exportBackup(data, now = new Date()) {
  const payload = { app: 'recall-garden', version: BACKUP_VERSION, exportedAt: iso(now), cards: data.cards, logs: data.logs ?? [], settings: { ...DEFAULT_SETTINGS, ...data.settings } };
  parseBackup(JSON.stringify(payload));
  return JSON.stringify(payload, null, 2);
}
export function mergeBackup(current, incoming) {
  const cards = new Map(current.cards.map(c => [c.id, plain(c)]));
  for (const c of incoming.cards) {
    const old = cards.get(c.id);
    if (!old) { cards.set(c.id, plain(c)); continue; }
    const content = Date.parse(c.updatedAt) > Date.parse(old.updatedAt) ? c : old;
    const reviewTime = card => card.schedule.last_review ? Date.parse(card.schedule.last_review) : -1;
    const progress = reviewTime(c) > reviewTime(old) ? c : old;
    cards.set(c.id, { ...plain(content), schedule: plain(progress.schedule) });
  }
  const logs = new Map((current.logs ?? []).map(l => [l.id, l]));
  for (const l of incoming.logs) if (!logs.has(l.id)) logs.set(l.id, l);
  if (cards.size > MAX_CARDS || logs.size > MAX_LOGS) fail('合并后的数据超过数量限制，请先整理资料');
  return { cards: [...cards.values()], logs: [...logs.values()].sort((a,b) => Date.parse(a.reviewedAt) - Date.parse(b.reviewedAt)), settings: { ...DEFAULT_SETTINGS, ...current.settings } };
}
