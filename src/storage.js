import { parseBackup, exportBackup, DEFAULT_SETTINGS } from './core.js';
import { mathCards, MATH_CONTENT_VERSION } from './math-content.js';

export const STORAGE_KEY = 'shiyi-recall-v1';
let lastRaw;
const emptyData = () => ({ cards: [], logs: [], settings: { ...DEFAULT_SETTINGS } });
function readRaw() {
  try { return localStorage.getItem(STORAGE_KEY); }
  catch { throw new Error('浏览器不允许读取本地资料。请检查存储权限，或换用普通浏览窗口。'); }
}
function writeRaw(raw) {
  try { localStorage.setItem(STORAGE_KEY, raw); }
  catch { throw new Error('浏览器保存失败，可能空间不足。请先导出备份，并检查浏览器存储权限。'); }
  lastRaw = raw;
}
export function loadData() {
  let raw;
  try { raw = readRaw(); }
  catch (error) {
    lastRaw = undefined;
    return { data: emptyData(), error: error.message, raw: null, firstRun: false };
  }
  lastRaw = raw;
  if (raw === null) return { data: { cards: mathCards(), logs: [], settings: { ...DEFAULT_SETTINGS, mathLibraryVersion: MATH_CONTENT_VERSION } }, firstRun: true };
  try { return { data: parseBackup(raw), firstRun: false }; }
  catch (error) { return { data: emptyData(), error: error.message, raw, firstRun: false }; }
}
export function saveData(data) {
  const live = readRaw();
  if (live !== lastRaw) throw new Error('另一个标签页更新了资料。请刷新后继续，避免覆盖新进度。');
  const raw = exportBackup(data);
  writeRaw(raw);
}
export function recoverData(data, expectedRaw) {
  if (typeof expectedRaw !== 'string') throw new Error('没有可恢复的原始资料，或浏览器尚未允许读取存储。');
  const live = readRaw();
  if (live !== expectedRaw || live !== lastRaw) throw new Error('原始资料已被其他标签页更新。请刷新后重新检查，避免覆盖新进度。');
  let corrupt = false;
  try { parseBackup(expectedRaw); } catch { corrupt = true; }
  if (!corrupt) throw new Error('当前资料可以正常读取，不需要覆盖恢复。');
  const raw = exportBackup(data);
  writeRaw(raw);
}
