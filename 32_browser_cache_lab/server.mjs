import http from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function createLabServer() {
  const sessions = new Map();
  const definitions = [
    { id: 'strong', title: 'max-age：有效期内直接使用', ttl: 15, cacheControl: 'public, max-age=15', validator: 'etag' },
    { id: 'expiry', title: '缓存过期：再去询问服务端', ttl: 5, cacheControl: 'public, max-age=5, must-revalidate', validator: 'etag' },
    { id: 'etag', title: 'no-cache + ETag：每次验证', ttl: 0, cacheControl: 'no-cache', validator: 'etag' },
    { id: 'modified', title: 'Last-Modified：按修改时间验证', ttl: 0, cacheControl: 'no-cache', validator: 'modified' },
    { id: 'no-store', title: 'no-store：不保存这份响应', ttl: 0, cacheControl: 'no-store', validator: null },
    { id: 'expires', title: 'Expires：绝对过期时间', ttl: 15, cacheControl: null, validator: null },
  ];
  const staticFiles = new Map([
    ['/', ['public/index.html', 'text/html; charset=utf-8']],
    ['/app.js', ['public/app.js', 'text/javascript; charset=utf-8']],
    ['/style.css', ['public/style.css', 'text/css; charset=utf-8']],
  ]);

  function snapshot(session) {
    return {
      id: session.id,
      scenarios: definitions.map((definition) => ({ ...definition, ...session.resources.get(definition.id) })),
      events: session.events,
    };
  }

  function json(response, status, data) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(data));
  }

  async function handle(request, response) {
    const url = new URL(request.url, 'http://localhost');
    const path = url.pathname;

    if (request.method === 'GET' && staticFiles.has(path)) {
      const [file, type] = staticFiles.get(path);
      const body = await readFile(new URL(file, import.meta.url));
      response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      response.end(body);
      return;
    }
    if (path === '/favicon.ico') {
      response.writeHead(204, { 'Cache-Control': 'no-store' });
      response.end();
      return;
    }
    if (request.method === 'POST' && path === '/api/sessions') {
      // 一轮实验一个 URL；同一轮的重复请求保持 URL 不变。
      if (sessions.size >= 100) sessions.delete(sessions.keys().next().value);
      const id = randomUUID();
      const modified = new Date(Math.floor(Date.now() / 1000) * 1000).toUTCString();
      const session = {
        id,
        resources: new Map(definitions.map(({ id: caseId }) => [caseId, { version: 1, modified }])),
        events: [],
        sequence: 0,
      };
      sessions.set(id, session);
      json(response, 201, snapshot(session));
      return;
    }

    const apiMatch = path.match(/^\/api\/sessions\/([a-f0-9-]+)(?:\/cases\/([a-z-]+)\/mutate)?$/);
    const resourceMatch = path.match(/^\/resources\/([a-f0-9-]+)\/([a-z-]+)\.json$/);
    const match = apiMatch || resourceMatch;
    const session = match && sessions.get(match[1]);
    if (!session) {
      json(response, 404, { error: '实验不存在，请点击“开始新一轮”。' });
      return;
    }
    if (apiMatch && !apiMatch[2] && request.method === 'GET') {
      json(response, 200, snapshot(session));
      return;
    }

    const caseId = match[2];
    const definition = definitions.find((item) => item.id === caseId);
    const resource = session.resources.get(caseId);
    if (!definition || !resource) {
      json(response, 404, { error: '没有这个实验场景。' });
      return;
    }
    if (apiMatch && request.method === 'POST') {
      // HTTP 日期精确到秒；先跨过上一修改时间，避免内容改了但时间头没变。
      if (definition.validator === 'modified') {
        const nextSecond = Date.parse(resource.modified) + 1000;
        const delay = nextSecond - Date.now();
        if (delay > 0) await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
      }
      resource.version += 1;
      resource.modified = new Date(Math.floor(Date.now() / 1000) * 1000).toUTCString();
      json(response, 200, snapshot(session));
      return;
    }
    if (!resourceMatch || !['GET', 'HEAD'].includes(request.method)) {
      json(response, 405, { error: '这个接口不支持该请求方法。' });
      return;
    }

    // 相同版本的 body 必须完全一致，不能夹带每次变化的请求时间或计数。
    const body = JSON.stringify({
      experiment: caseId,
      version: resource.version,
      message: `这是一份教材目录，服务端内容版本为 v${resource.version}。`,
    }, null, 2);
    const headers = { 'Content-Type': 'application/json; charset=utf-8', Date: new Date().toUTCString() };
    if (definition.cacheControl) headers['Cache-Control'] = definition.cacheControl;
    if (definition.validator === 'etag') {
      headers.ETag = `"${createHash('sha256').update(body).digest('hex').slice(0, 24)}"`;
    }
    if (definition.validator === 'modified') headers['Last-Modified'] = resource.modified;
    if (caseId === 'expires') {
      headers.Expires = new Date(Date.parse(headers.Date) + definition.ttl * 1000).toUTCString();
    }

    let notModified = false;
    const ifNoneMatch = request.headers['if-none-match'];
    const ifModifiedSince = request.headers['if-modified-since'];
    // 条件由浏览器自动发送。服务端先比 ETag，有该条件时不再回退到时间条件。
    if (definition.cacheControl !== 'no-store') {
      if (ifNoneMatch !== undefined) {
        notModified = ifNoneMatch.split(',').some((value) => {
          const candidate = value.trim().replace(/^W\//, '');
          return candidate === '*' || (headers.ETag && candidate === headers.ETag);
        });
      } else if (headers['Last-Modified'] && ifModifiedSince) {
        const since = Date.parse(ifModifiedSince);
        notModified = Number.isFinite(since) && Date.parse(resource.modified) <= since;
      }
    }
    const status = notModified ? 304 : 200;
    if (status === 200) headers['Content-Length'] = Buffer.byteLength(body);

    const event = {
      id: ++session.sequence,
      time: new Date().toISOString(),
      caseId,
      method: request.method,
      status,
      version: resource.version,
      bytes: status === 304 || request.method === 'HEAD' ? 0 : Buffer.byteLength(body),
      requestHeaders: {
        'if-none-match': ifNoneMatch ?? null,
        'if-modified-since': ifModifiedSince ?? null,
        'cache-control': request.headers['cache-control'] ?? null,
      },
      responseHeaders: headers,
    };
    session.events.push(event);
    if (session.events.length > 150) session.events.shift();
    response.writeHead(status, headers);
    response.end(status === 304 || request.method === 'HEAD' ? undefined : body);
  }

  return http.createServer((request, response) => {
    handle(request, response).catch((error) => {
      console.error(error);
      if (!response.headersSent) json(response, 500, { error: '服务出错，请查看启动终端。' });
      else response.end();
    });
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3320);
  const host = process.env.HOST || '127.0.0.1';
  const server = createLabServer();
  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已被占用，可改用 PORT=3321 npm start` : error);
    process.exitCode = 1;
  });
  server.listen(port, host, () => {
    console.log(`浏览器缓存实验：http://localhost:${port}`);
    console.log('打开开发者工具 → Network，取消勾选 Disable cache，再按页面步骤操作。');
  });
}
