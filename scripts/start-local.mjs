import { spawn } from 'node:child_process';
import { mkdir, open, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const address = 'http://127.0.0.1:4173/';
const expected = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');

async function inspect() {
  try {
    const response = await fetch(address, { signal: AbortSignal.timeout(1200), cache: 'no-store' });
    return (await response.text()) === expected ? 'ready' : 'occupied';
  } catch { return 'offline'; }
}

let state = await inspect();
if (state === 'occupied') {
  throw new Error('4173 端口正在运行其他网站。请先关闭占用该端口的服务，再启动拾忆。');
}
if (state === 'offline') {
  await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
  const log = await open(new URL('../artifacts/local-preview.log', import.meta.url), 'a');
  const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
    cwd: root, detached: true, stdio: ['ignore', log.fd, log.fd],
  });
  let spawnError;
  child.on('error', error => { spawnError = error; });
  child.unref();
  await log.close();
  for (let attempt = 0; attempt < 40; attempt++) {
    if (spawnError) throw spawnError;
    state = await inspect();
    if (state === 'ready') break;
    if (state === 'occupied') throw new Error('4173 端口已被其他网站占用，拾忆未启动。');
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  if (state !== 'ready') throw new Error('网站未能启动，请查看 artifacts/local-preview.log。');
}
console.log(`拾忆已启动：${address}`);
console.log('网站在后台运行，关闭此终端窗口不会停止服务。电脑重启后请再次双击“启动拾忆.command”。');
console.log('请继续使用原来的浏览器和这个固定地址，以读取已保存的资料。');
