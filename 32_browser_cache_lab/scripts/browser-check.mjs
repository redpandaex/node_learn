// 使用系统 Chrome 的 DevTools 协议检查真实 HTTP 缓存；不依赖 Playwright，也不拦截请求。
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createLabServer } from '../server.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const candidates = [process.env.CHROME_BIN, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
let executable;
for (const candidate of candidates) {
  try { await access(candidate); executable = candidate; break; } catch { /* 继续找下一个。 */ }
}
if (!executable) throw new Error('没有找到 Chrome/Chromium。设置 CHROME_BIN=/path/to/chrome 后重试；手动实验不需要运行此检查。');

class DevTools {
  constructor(socket) {
    this.socket = socket;
    this.sequence = 0;
    this.pending = new Map();
    this.errors = [];
    socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
        else pending.resolve(message.result);
      } else if (message.method === 'Runtime.exceptionThrown') {
        this.errors.push(message.params.exceptionDetails);
      }
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`DevTools 超时：${method}`));
      }, 20000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
}

const server = createLabServer();
const profile = await mkdtemp(join(tmpdir(), 'cache-lab-chrome-'));
let chrome;
let devtools;
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  chrome = spawn(executable, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let chromeError = '';
  chrome.stderr.on('data', (chunk) => { chromeError = (chromeError + chunk).slice(-2000); });
  chrome.on('error', (error) => { chromeError = error.message; });
  let debuggingPort;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      debuggingPort = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
      break;
    } catch { await sleep(100); }
  }
  assert.ok(debuggingPort, `Chrome 未启动：${chromeError}`);
  const targets = await (await fetch(`http://127.0.0.1:${debuggingPort}/json/list`)).json();
  const socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await once(socket, 'open');
  devtools = new DevTools(socket);
  await devtools.send('Page.enable');
  await devtools.send('Runtime.enable');
  await devtools.send('Network.enable');
  await devtools.send('Network.setCacheDisabled', { cacheDisabled: false });
  await devtools.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await devtools.send('Page.navigate', { url: origin });

  async function ready() {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (await devtools.evaluate(`Boolean(document.querySelector('#request') && !document.querySelector('#request').disabled)`)) return;
      await sleep(50);
    }
    throw new Error(`页面未就绪：${await devtools.evaluate("document.querySelector('#error')?.textContent")}`);
  }
  await ready();
  const id = await devtools.evaluate("sessionStorage.getItem('browser-cache-lab-session-v1')");
  async function events(caseId) {
    const state = await (await fetch(`${origin}/api/sessions/${id}`)).json();
    return state.events.filter((event) => event.caseId === caseId);
  }
  async function click(selector) {
    await devtools.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
    await ready();
    assert.equal(await devtools.evaluate("document.querySelector('#error').hidden"), true);
  }
  const choose = (caseId) => click(`[data-case="${caseId}"]`);
  const request = () => click('#request');
  const mutate = () => click('#mutate');
  const mode = (value) => devtools.evaluate(`document.querySelector('#cache-mode').value = ${JSON.stringify(value)}`);
  const version = () => devtools.evaluate("document.querySelector('#browser-version').textContent");
  const wireStatus = () => devtools.evaluate("document.querySelector('#wire-status').textContent");

  await request();
  await request();
  assert.equal((await events('strong')).length, 1, 'max-age 有效期内第二次请求不得访问服务端');
  assert.equal(await wireStatus(), '没有发出请求');
  await mode('no-cache');
  await request();
  assert.equal((await events('strong')).at(-1).status, 304, '主动验证应携带旧 ETag');
  assert.equal(await devtools.evaluate("document.querySelector('#js-status').textContent"), '200');
  await mode('default');
  await mutate();
  await request();
  assert.equal(await version(), '已读取 v1', '有效期内浏览器仍使用旧内容');
  assert.equal((await events('strong')).length, 2);
  await mode('no-cache');
  await request();
  assert.equal(await version(), '已读取 v2');
  assert.equal((await events('strong')).at(-1).status, 200);
  await mode('reload');
  await request();
  assert.equal((await events('strong')).at(-1).status, 200, 'reload 应重新下载');
  await mode('default');
  console.log('PASS max-age：直接复用、旧版本、主动验证 304、修改后 200、reload');

  await choose('expiry');
  await request();
  await request();
  assert.equal((await events('expiry')).length, 1);
  await sleep(5500);
  await request();
  assert.equal((await events('expiry')).at(-1).status, 304, 'max-age 过期后应协商验证');
  assert.ok((await events('expiry')).at(-1).requestHeaders['if-none-match']);
  console.log('PASS 过期：5 秒内直接复用，过期后真实返回 304');

  await choose('etag');
  await request();
  await request();
  assert.deepEqual((await events('etag')).map((event) => event.status), [200, 304]);
  await mutate();
  await request();
  assert.deepEqual((await events('etag')).map((event) => event.status), [200, 304, 200]);
  assert.equal(await version(), '已读取 v2');
  console.log('PASS no-cache + ETag：首次 200、重复 304、内容变化 200');

  await choose('modified');
  await request();
  await request();
  assert.deepEqual((await events('modified')).map((event) => event.status), [200, 304]);
  assert.ok((await events('modified')).at(-1).requestHeaders['if-modified-since']);
  await mutate();
  await request();
  assert.deepEqual((await events('modified')).map((event) => event.status), [200, 304, 200]);
  console.log('PASS Last-Modified：浏览器自动发送 If-Modified-Since');

  await choose('no-store');
  await request();
  await request();
  assert.deepEqual((await events('no-store')).map((event) => event.status), [200, 200]);
  await mutate();
  await request();
  assert.equal(await version(), '已读取 v2');
  assert.equal((await events('no-store')).length, 3);
  console.log('PASS no-store：每次真实下载完整响应');

  await choose('expires');
  await request();
  await request();
  assert.equal((await events('expires')).length, 1);
  await sleep(15500);
  await request();
  assert.deepEqual((await events('expires')).map((event) => event.status), [200, 200]);
  console.log('PASS Expires：过期前复用，没有验证器时过期后重新下载');

  await choose('strong');
  await request();
  await mutate();
  await request();
  async function screenshot(name) {
    if (!process.env.SCREENSHOT_DIR) return;
    await mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
    const { cssContentSize } = await devtools.send('Page.getLayoutMetrics');
    const { data } = await devtools.send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: cssContentSize.width, height: cssContentSize.height, scale: 1 },
    });
    await writeFile(join(process.env.SCREENSHOT_DIR, name), Buffer.from(data, 'base64'));
  }
  await screenshot('desktop.png');
  await devtools.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sleep(100);
  assert.equal(await devtools.evaluate('document.documentElement.scrollWidth <= innerWidth'), true, '手机视口不能出现整页横向溢出');
  await screenshot('mobile.png');
  assert.deepEqual(devtools.errors, [], '页面不应抛出未处理的 JavaScript 错误');
  console.log('PASS 页面交互与手机布局；没有未处理的 JavaScript 错误');
  if (process.env.SCREENSHOT_DIR) console.log(`截图：${process.env.SCREENSHOT_DIR}`);
} finally {
  devtools?.socket.close();
  if (chrome && chrome.exitCode === null) {
    const exited = once(chrome, 'exit');
    chrome.kill('SIGTERM');
    await exited;
  }
  await new Promise((resolve) => server.close(resolve));
  await rm(profile, { recursive: true, force: true });
}
