import { createCard, DEFAULT_SETTINGS } from './core.js';
import { unzipSync } from 'fflate';

const MAX_JSON = 20 * 1024 * 1024;
const MAX_ZIP = 140 * 1024 * 1024;
const SELECTED = new Set(['package.json', 'data/library.json', 'progress.json']);
const decoder = new TextDecoder('utf-8', { fatal: true });
const encoder = new TextEncoder();
const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw new Error(message); };
const normalize = value => value.normalize('NFKC').toLocaleLowerCase('en').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim().replace(/[.!?。！？]+$/, '');
const digest = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
const union = (...arrays) => [...new Set(arrays.flat().filter(Boolean))];
function parseJSON(text, label) {
  if (typeof text !== 'string' || encoder.encode(text).length > MAX_JSON) fail(`${label}不能超过 20 MB`);
  try { return JSON.parse(text); } catch { fail(`${label}不是有效的 JSON`); }
}
function optionalText(value, field) {
  if (value !== undefined && typeof value !== 'string') fail(`Reading Lab 的 ${field} 必须是文字`);
  return value || '';
}
function stringList(value, field) {
  if (value !== undefined && (!Array.isArray(value) || value.some(s => typeof s !== 'string'))) fail(`Reading Lab 的 ${field} 必须是文字列表`);
  return value || [];
}
function prepareLibrary(input) {
  if (!object(input) || input.schemaVersion !== 1) fail('请选择 Reading Lab 版本 1 的知识 JSON 或个人备份');
  const isBackup = input.type === 'reading-lab-backup';
  const library = isBackup ? input.localLibrary : input;
  const state = isBackup ? input.state : {};
  if (!object(library) || library.schemaVersion !== 1 || !Array.isArray(library.sources) || !Array.isArray(library.entries)) fail('备份中没有有效的 Reading Lab 知识库');
  if (!object(state)) fail('Reading Lab 的个人进度格式不正确');
  if (library.sources.length > 5000 || library.entries.length > 30000) fail('Reading Lab 知识库超过数量限制');
  const sources = new Map();
  for (const s of library.sources) {
    if (!object(s) || typeof s.id !== 'string' || !s.id || typeof s.title !== 'string' || sources.has(s.id)) fail('Reading Lab 阅读来源编号或标题不正确');
    sources.set(s.id, s.title);
  }
  const ids = new Set();
  for (const entry of library.entries) {
    if (!object(entry) || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id) || !['word','phrase','sentence','grammar'].includes(entry.kind)) fail('Reading Lab 条目编号或类型不正确');
    ids.add(entry.id);
  }
  return { library, sources, state };
}
function progressNotes(state) {
  if (state === undefined) return [];
  if (!object(state)) fail('Reading Lab 的词条个人进度格式不正确');
  const result = [];
  const note = optionalText(state.note, '个人笔记');
  if (note) result.push(`我的笔记（Reading Lab）\n${note}`);
  if (state.status !== undefined) {
    const labels = { new:'尚未学习', learning:'学习中', mastered:'已掌握' };
    if (!Object.hasOwn(labels, state.status)) fail('Reading Lab 的掌握状态不正确');
    const label = labels[state.status];
    result.push(`原站掌握状态：${label}（仅作参考；拾忆从新卡开始安排复习）`);
  }
  if (state.review !== undefined) {
    if (!object(state.review) || !Number.isFinite(state.review.reviewedAt) || !Number.isFinite(state.review.dueAt)) fail('Reading Lab 的复习时间格式不正确');
    const reviewed = new Date(state.review.reviewedAt), due = new Date(state.review.dueAt);
    if (!Number.isFinite(+reviewed) || !Number.isFinite(+due)) fail('Reading Lab 的复习时间无效');
    result.push(`原站最近复习：${reviewed.toISOString()}\n原站下次安排：${due.toISOString()}`);
  }
  return result;
}
/** Convert only vocabulary; source scheduling is reference information, never invented FSRS history. */
export async function parseReadingLabImport(text, now = new Date()) {
  const { library, sources, state } = prepareLibrary(parseJSON(text, 'Reading Lab 文件'));
  const byKey = new Map();
  let skipped = 0, duplicates = 0;
  for (const e of library.entries) {
    if (!['word','phrase'].includes(e.kind)) { skipped++; continue; }
    if (typeof e.term !== 'string' || !e.term.trim() || typeof e.meaning !== 'string' || !e.meaning.trim()) fail('Reading Lab 单词或词组缺少英文或释义');
    if (!Array.isArray(e.sourceIds) || !e.sourceIds.length || e.sourceIds.some(id => typeof id !== 'string' || !sources.has(id))) fail('Reading Lab 单词或词组缺少有效阅读来源');
    for (const field of ['pronunciation','partOfSpeech','explanation','example','translation','structure']) optionalText(e[field], field);
    const sourceTags = stringList(e.tags, '标签');
    const noteList = stringList(e.notes, '补充说明');
    const personal = Object.hasOwn(state, e.id) ? state[e.id] : undefined;
    const key = `${e.kind}:${normalize(e.term)}`;
    if (!normalize(e.term)) fail('Reading Lab 条目的英文内容无效');
    const sections = [
      e.pronunciation && `音标\n${e.pronunciation}`,
      e.explanation && `学习解析\n${e.explanation}`,
      e.example && `例句\n${e.example}`,
      e.translation && `参考翻译\n${e.translation}`,
      e.structure && `结构与搭配\n${e.structure}`,
      noteList.length && `补充说明\n${noteList.join('\n')}`,
      ...progressNotes(personal),
    ].filter(Boolean);
    const meaning = `${e.partOfSpeech ? e.partOfSpeech + ' ' : ''}${e.meaning}`;
    const prior = byKey.get(key);
    if (prior) {
      duplicates++;
      prior.meanings = union(prior.meanings, [meaning]);
      prior.sections = union(prior.sections, sections);
      prior.sourceIds = union(prior.sourceIds, e.sourceIds);
      prior.tags = union(prior.tags, sourceTags);
      prior.favorite ||= personal?.favorite === true;
    } else byKey.set(key, { key, term:e.term.trim(), kind:e.kind, meanings:[meaning], sections, sourceIds:[...new Set(e.sourceIds)], tags:sourceTags, favorite:personal?.favorite === true });
  }
  if (!byKey.size) fail('这份资料没有可导入的单词或词组');
  if (byKey.size > 20000) fail('转换后的单词与词组超过 20,000 张卡片，请拆分后导入');
  const cards = [];
  for (const e of byKey.values()) {
    const tags = union(['Reading Lab', e.kind === 'word' ? '单词' : '词组'], e.favorite ? ['原站收藏'] : [], e.tags.filter(t => t.trim() && t.length <= 60)).slice(0,20);
    const omittedTags = e.tags.filter(t => !tags.includes(t));
    const notes = [...e.sections, `阅读来源\n${e.sourceIds.map(id => sources.get(id)).join('\n')}`, omittedTags.length ? `原始标签\n${omittedTags.join('，')}` : ''].filter(Boolean).join('\n\n');
    let card;
    try { card = createCard({ subject:'english', kind:'basic', front:e.term, back:e.meanings.join('\n\n'), notes, tags }, now); }
    catch (error) { fail(`Reading Lab 中的一个${e.kind === 'word' ? '单词' : '词组'}无法完整导入：${error.message}。请先拆分该条目，原资料未修改。`); }
    card.id = 'readinglab-v1-' + (await digest(encoder.encode(e.key))).slice(0,32);
    cards.push(card);
  }
  const words = [...byKey.values()].filter(e => e.kind === 'word').length;
  return { cards, logs:[], settings:{...DEFAULT_SETTINGS}, importInfo:{ type:'readinglab', words, phrases:cards.length - words, skipped, duplicates, originalEntries:library.entries.length, sources:library.sources.length } };
}

const allowed = path => ['package.json','data/library.json','data/pronunciation.json','data/audio-manifest.json','progress.json'].includes(path) || /^audio\/[a-z0-9_.-]+\.(mp3|ogg|wav)$/.test(path);
function inspectZip(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 22 || bytes.byteLength > MAX_ZIP) fail('Reading Lab ZIP 格式不正确或超过 140 MB');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (view.getUint32(i,true) === 0x06054b50 && i + 22 + view.getUint16(i+20,true) === bytes.length) { end = i; break; }
  if (end < 0 || view.getUint16(end+4,true) || view.getUint16(end+6,true)) fail('请使用单文件 Reading Lab ZIP 资料包');
  const count = view.getUint16(end+10,true), offset = view.getUint32(end+16,true), size = view.getUint32(end+12,true);
  if (count !== view.getUint16(end+8,true) || count > 4096 || count === 65535 || offset + size !== end) fail('Reading Lab ZIP 目录损坏或超过容量限制');
  const entries = new Map(); let cursor = offset, total = 0;
  for (let i=0; i<count; i++) {
    if (cursor+46>end || view.getUint32(cursor,true)!==0x02014b50) fail('Reading Lab ZIP 目录损坏');
    const flags=view.getUint16(cursor+8,true), method=view.getUint16(cursor+10,true), compressed=view.getUint32(cursor+20,true), length=view.getUint32(cursor+24,true), n=view.getUint16(cursor+28,true), extra=view.getUint16(cursor+30,true), comment=view.getUint16(cursor+32,true), attrs=view.getUint32(cursor+38,true), local=view.getUint32(cursor+42,true);
    if (cursor+46+n+extra+comment>end) fail('Reading Lab ZIP 目录越界');
    const path=decoder.decode(bytes.subarray(cursor+46,cursor+46+n));
    if (!allowed(path) || entries.has(path) || flags&1 || ![0,8].includes(method) || length>MAX_JSON || compressed===0xffffffff || length===0xffffffff || ((attrs>>>16)&0xf000)===0xa000 || local+30>offset || view.getUint32(local,true)!==0x04034b50) fail('Reading Lab ZIP 包含不允许的路径、大小或特殊文件');
    const ln=view.getUint16(local+26,true), le=view.getUint16(local+28,true);
    if (local+30+ln+le+compressed>offset || decoder.decode(bytes.subarray(local+30,local+30+ln))!==path || view.getUint16(local+8,true)!==method) fail('Reading Lab ZIP 内容与目录不一致');
    total+=length; if (total>MAX_ZIP) fail('Reading Lab ZIP 解压后超过 140 MB');
    entries.set(path,length); cursor+=46+n+extra+comment;
  }
  if (cursor!==end || !entries.has('package.json') || !entries.has('data/library.json')) fail('Reading Lab ZIP 缺少知识库或资料包说明');
  return entries;
}
/** Only selected text files are decompressed. Audio never enters the destination app. */
export async function parseReadingLabZip(bytes, now = new Date()) {
  const entries = inspectZip(bytes);
  const files = unzipSync(bytes, { filter: file => SELECTED.has(file.name) });
  for (const [path, content] of Object.entries(files)) if (!SELECTED.has(path) || content.length !== entries.get(path)) fail('Reading Lab ZIP 解压结果不一致');
  const metadata = parseJSON(decoder.decode(files['package.json']), '资料包说明');
  if (!object(metadata) || metadata.schemaVersion!==1 || metadata.type!=='reading-lab-local-package' || !Array.isArray(metadata.files) || metadata.files.length!==entries.size-1) fail('这不是 Reading Lab 本地资料包');
  const checked = new Set();
  for (const f of metadata.files) {
    if (!object(f) || typeof f.path!=='string' || f.path==='package.json' || checked.has(f.path) || !entries.has(f.path) || f.size!==entries.get(f.path) || typeof f.sha256!=='string' || !/^[a-f0-9]{64}$/.test(f.sha256)) fail('Reading Lab 资料包文件清单无效');
    checked.add(f.path);
    if (SELECTED.has(f.path) && await digest(files[f.path])!==f.sha256) fail('Reading Lab 资料包校验失败，原有资料未修改');
  }
  const library = parseJSON(decoder.decode(files['data/library.json']), '知识库');
  const state = files['progress.json'] ? parseJSON(decoder.decode(files['progress.json']), '个人进度') : {};
  return parseReadingLabImport(JSON.stringify({schemaVersion:1,type:'reading-lab-backup',localLibrary:library,state}),now);
}
