const $ = (id) => document.getElementById(id);
const notes = {
  strong: {
    name: 'max-age', subtitle: '15 秒内直接复用', kind: '强缓存',
    description: '服务端允许这份响应保持新鲜 15 秒。即使服务端内容已经改变，浏览器也可能继续使用有效期内的旧内容。',
    steps: ['连续点击两次“请求资源”：第一次 200，第二次服务端记录不增加。', '点击“修改服务端内容”，马上再请求：浏览器仍可能是 v1，服务端已是 v2。', '等新鲜度归零后再请求：内容改了返回 200；没改则通常协商返回 304。'],
  },
  expiry: {
    name: '过期后验证', subtitle: '5 秒有效期 + ETag', kind: '强缓存 → 协商缓存',
    description: '先缓存 5 秒，过期后再用 ETag 验证。缓存过期不代表本地响应被删除，也不一定要重新传输响应体。',
    steps: ['先请求两次：有效期内直接复用，服务端通常只有一条记录。', '等新鲜度归零，内容不变时再请求：服务端返回 304，响应体为 0 B。', '修改服务端内容，再等缓存过期后请求：旧 ETag 对不上，返回 200 和新内容。'],
  },
  etag: {
    name: 'no-cache + ETag', subtitle: '每次复用前都验证', kind: '协商缓存 · 内容标识',
    description: 'no-cache 允许保存响应，但每次复用前必须验证。浏览器自动把上次的 ETag 放进 If-None-Match 请求头。',
    steps: ['第一次请求：200，响应头里有 ETag，浏览器保存响应。', '马上再请求：携带 If-None-Match，服务端内容没变则返回 304。', '修改服务端内容再请求：ETag 变了，返回 200 和新版本。'],
  },
  modified: {
    name: 'Last-Modified', subtitle: '按修改时间验证', kind: '协商缓存 · 修改时间',
    description: '这个接口只返回 Last-Modified，不返回 ETag。浏览器自动发送 If-Modified-Since，服务端比较修改时间。',
    steps: ['第一次请求：200，观察响应头中的 Last-Modified。', '再次请求：观察 If-Modified-Since，未修改时返回 304。', '修改服务端内容再请求：修改时间更新，返回 200；时间头精确到秒，修改可能等待不足 1 秒。'],
  },
  'no-store': {
    name: 'no-store', subtitle: '每次都重新下载', kind: '不保存响应',
    description: '服务端要求不要把这份响应存入 HTTP 缓存。它不提供 ETag 或 Last-Modified，每次请求都返回完整内容。',
    steps: ['连续请求两次：两次都到服务端，两次都是 200。', '修改服务端内容，再请求：马上得到新版本。', '和 no-cache 对比：no-cache 能保存并通过 304 复用响应体，no-store 每次重新下载。'],
  },
  expires: {
    name: 'Expires', subtitle: '按绝对时间判断新鲜度', kind: '强缓存 · 绝对时间',
    description: '这个接口只使用 Expires 指定绝对过期时间，没有 Cache-Control 和验证器。max-age 与 Expires 都存在时，现代浏览器优先使用 max-age。',
    steps: ['第一次请求：200，查看 Date 和 Expires，两者相差 15 秒。', '过期前再次请求：直接复用，服务端记录不增加。', '过期后再次请求：这里没有验证器，因此重新下载并返回 200，而不是 304。'],
  },
};

let state;
let selected = Object.hasOwn(notes, location.hash.slice(1)) ? location.hash.slice(1) : 'strong';
let busy = false;
const results = new Map();
const storageKey = 'browser-cache-lab-session-v1';
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const resourceUrl = () => `/resources/${state.id}/${selected}.json`;
const scenario = () => state.scenarios.find((item) => item.id === selected);

async function api(path, method = 'GET') {
  const response = await fetch(path, { method, cache: 'no-store' });
  if (!response.ok) {
    const error = new Error((await response.json()).error || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function saveSession(id) {
  try { sessionStorage.setItem(storageKey, id); } catch { /* 存储不可用也不影响当前页面实验。 */ }
}

async function newSession() {
  state = await api('/api/sessions', 'POST');
  saveSession(state.id);
  results.clear();
}

function showError(error) {
  $('error').hidden = false;
  $('error').textContent = `${error.message} 请确认本地服务仍在运行；服务重启后点击“开始新一轮”。`;
}

async function action(fn) {
  if (busy) return;
  busy = true;
  $('error').hidden = true;
  setButtons();
  try { await fn(); } catch (error) { showError(error); }
  finally { busy = false; setButtons(); }
}

function setButtons() {
  $('workspace').setAttribute('aria-busy', String(busy));
  for (const id of ['request', 'mutate', 'reset']) $(id).disabled = busy || !state;
  for (const button of document.querySelectorAll('.experiment-choice')) button.disabled = busy;
  $('cache-mode').disabled = busy;
}

function drawNav() {
  $('experiments').innerHTML = Object.entries(notes).map(([id, note], index) => `<button class="experiment-choice" data-case="${id}" aria-current="${id === selected}"><span>${String(index + 1).padStart(2, '0')}</span><span>${note.name}<small>${note.subtitle}</small></span></button>`).join('');
  for (const button of $('experiments').querySelectorAll('button')) {
    button.addEventListener('click', () => {
      selected = button.dataset.case;
      history.replaceState(null, '', `#${selected}`);
      render();
    });
  }
}

function render() {
  drawNav();
  const item = scenario();
  const note = notes[selected];
  const result = results.get(selected);
  const events = state.events.filter((event) => event.caseId === selected);
  const lastEvent = events.at(-1);
  $('case-number').textContent = String(Object.keys(notes).indexOf(selected) + 1).padStart(2, '0');
  $('case-kind').textContent = note.kind;
  $('case-title').textContent = item.title;
  $('case-description').textContent = note.description;
  const policies = [];
  if (item.cacheControl) policies.push(`Cache-Control: ${item.cacheControl}`);
  if (item.validator === 'etag') policies.push('ETag: "内容标识"');
  if (item.validator === 'modified') policies.push('Last-Modified: 修改时间');
  if (selected === 'expires') policies.push('Expires: Date + 15 秒');
  $('policy').textContent = policies.join('  /  ');
  $('steps').innerHTML = note.steps.map((text) => `<li>${escape(text)}</li>`).join('');
  $('resource-url').textContent = `${location.origin}${resourceUrl()}`;
  $('server-version').textContent = `当前 v${item.version}`;
  $('request-count').textContent = events.length;
  $('browser-version').textContent = result ? `已读取 v${result.body.version}` : '尚未读取';
  $('browser-body').textContent = result ? JSON.stringify(result.body, null, 2) : '// 等待浏览器读取资源';
  $('browser-headers').textContent = result ? Object.entries(result.headers).map(([name, value]) => `${name}: ${value}`).join('\n') : '还没有响应';
  $('js-status').textContent = result ? result.jsStatus : '—';
  $('wire-status').textContent = result ? result.wireStatus === null ? '没有发出请求' : `${result.wireStatus} ${result.wireStatus === 304 ? 'Not Modified' : 'OK'}` : '—';
  $('request-headers').textContent = lastEvent ? Object.entries(lastEvent.requestHeaders).filter(([, value]) => value !== null).map(([name, value]) => `${name}: ${value}`).join('\n') || '（没有条件请求头）' : '还没有资源请求';
  $('server-explanation').textContent = result?.wireStatus === null ? '本次没有新增资源请求。上面仍显示最近一次真正到达服务端的请求头。' : '304 不携带响应体，浏览器复用本地内容；200 则传回完整的资源内容。';
  $('journal').innerHTML = events.length ? events.toReversed().map((event) => {
    const condition = event.requestHeaders['if-none-match'] ? 'If-None-Match' : event.requestHeaders['if-modified-since'] ? 'If-Modified-Since' : '无';
    return `<tr><td>#${event.id} · ${new Date(event.time).toLocaleTimeString('zh-CN', { hour12: false })}</td><td><span class="status-tag ${event.status === 304 ? 'is-304' : ''}">${event.status}</span></td><td><code>${condition}</code></td><td>v${event.version}</td><td>${event.bytes} B</td></tr>`;
  }).join('') : '<tr><td colspan="5" class="empty">还没有请求。命中强缓存时，这里不会新增记录。</td></tr>';

  let label = '等待第一次请求';
  let message = '先点击“请求资源”，再对照下方两边的变化。';
  let tone = 'neutral';
  if (result) {
    if (result.wireStatus === null) {
      label = '强缓存命中 · 没有询问服务端';
      message = '浏览器直接复用了本地响应，服务端没有新增资源请求。Network 通常显示 memory cache 或 disk cache。';
      tone = 'cached';
    } else if (result.wireStatus === 304) {
      label = '协商缓存命中 · 服务端返回 304';
      message = '请求到达了服务端，但没有重新传输响应体。浏览器把 304 与本地内容合并，所以 JavaScript 读到的 status 仍可能是 200。';
      tone = 'validated';
    } else {
      label = '下载完整响应 · 服务端返回 200';
      message = '请求到达了服务端，并传输了完整内容。第一次请求、内容变化、no-store 或主动跳过缓存，都可能出现这个结果。';
      tone = 'downloaded';
    }
    if (result.body.version !== item.version) message += ` 现在浏览器读到 v${result.body.version}，服务端已经是 v${item.version}。`;
  }
  $('outcome').className = `outcome ${tone}`;
  $('outcome-label').textContent = label;
  $('outcome-message').textContent = message;
  updateFreshness();
  setButtons();
}

function updateFreshness() {
  if (!state) return;
  const result = results.get(selected);
  const item = scenario();
  let label = '新鲜度：请求后开始观察';
  let proportion = 0;
  if (result) {
    if (selected === 'no-store') label = '不保存响应，每次都重新下载';
    else if (item.cacheControl?.includes('no-cache')) label = 'no-cache：每次复用前都要验证';
    else {
      const date = Date.parse(result.headers.date);
      const duration = selected === 'expires' ? Date.parse(result.headers.expires) - date : item.ttl * 1000;
      // 缓存响应中的 Date 不因再次读取而刷新；304 验证成功会更新相关头。
      const remaining = Math.max(0, date + duration - Date.now() - Number(result.headers.age || 0) * 1000);
      proportion = Math.min(1, remaining / duration);
      label = remaining > 0 ? `预计仍新鲜 ${Math.ceil(remaining / 1000)} 秒 · 再次读取不会重新计时` : '预计已过期 · 下次请求需要访问服务端';
    }
  }
  $('freshness-label').textContent = label;
  $('freshness-meter').style.width = `${proportion * 100}%`;
}

$('request').addEventListener('click', () => action(async () => {
  // 日志通过另一个 no-store 接口读取，不干预被观察资源的缓存行为。
  state = await api(`/api/sessions/${state.id}`);
  const previousId = state.events.at(-1)?.id ?? 0;
  const response = await fetch(resourceUrl(), { cache: $('cache-mode').value });
  if (!response.ok) throw new Error(`资源请求失败：${response.status}`);
  const body = await response.json();
  state = await api(`/api/sessions/${state.id}`);
  const event = state.events.findLast((item) => item.id > previousId && item.caseId === selected);
  results.set(selected, { body, headers: Object.fromEntries(response.headers), jsStatus: response.status, wireStatus: event?.status ?? null });
  render();
}));

$('mutate').addEventListener('click', () => action(async () => {
  state = await api(`/api/sessions/${state.id}/cases/${selected}/mutate`, 'POST');
  render();
}));

$('reset').addEventListener('click', () => action(async () => {
  await newSession();
  $('cache-mode').value = 'default';
  render();
}));

await action(async () => {
  let id;
  try { id = sessionStorage.getItem(storageKey); } catch { /* 私密模式可能禁止存储。 */ }
  if (id) {
    try { state = await api(`/api/sessions/${id}`); }
    catch (error) { if (error.status !== 404) throw error; }
  }
  if (!state) await newSession();
  render();
});
setInterval(updateFreshness, 250);
