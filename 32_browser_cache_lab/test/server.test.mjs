import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createLabServer } from '../server.mjs';

let server;
let origin;

before(async () => {
  server = createLabServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function session() {
  const response = await fetch(`${origin}/api/sessions`, { method: 'POST' });
  assert.equal(response.status, 201, '应能创建独立实验，避免不同实验的缓存相互干扰');
  return response.json();
}

test('强缓存资源提供有效期，相同内容保持相同 ETag 与响应体', async () => {
  const { id } = await session();
  const url = `${origin}/resources/${id}/strong.json`;
  const first = await fetch(url);
  const second = await fetch(url);
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('cache-control'), 'public, max-age=15');
  assert.match(first.headers.get('etag'), /^"[a-f0-9]+"$/);
  assert.equal(second.headers.get('etag'), first.headers.get('etag'));
  assert.equal(await first.text(), await second.text());
});

test('ETag 命中返回无响应体的 304，内容修改后旧 ETag 得到 200', async () => {
  const { id } = await session();
  const url = `${origin}/resources/${id}/etag.json`;
  const first = await fetch(url);
  const etag = first.headers.get('etag');
  assert.equal(first.headers.get('cache-control'), 'no-cache');
  const matched = await fetch(url, { headers: { 'If-None-Match': `W/${etag}` } });
  assert.equal(matched.status, 304);
  assert.equal(await matched.text(), '');
  assert.equal(matched.headers.get('etag'), etag);
  const mutation = await fetch(`${origin}/api/sessions/${id}/cases/etag/mutate`, { method: 'POST' });
  assert.equal(mutation.status, 200);
  const changed = await fetch(url, { headers: { 'If-None-Match': etag } });
  assert.equal(changed.status, 200);
  assert.notEqual(changed.headers.get('etag'), etag);
  assert.equal((await changed.json()).version, 2);
});

test('Last-Modified 使用秒级时间验证；If-None-Match 存在时优先', async () => {
  const { id } = await session();
  const url = `${origin}/resources/${id}/modified.json`;
  const first = await fetch(url);
  const modified = first.headers.get('last-modified');
  assert.ok(modified);
  assert.equal(first.headers.get('etag'), null);
  const matched = await fetch(url, { headers: { 'If-Modified-Since': modified } });
  assert.equal(matched.status, 304);
  const precedence = await fetch(url, {
    headers: { 'If-None-Match': '"not-current"', 'If-Modified-Since': modified },
  });
  assert.equal(precedence.status, 200);
  await fetch(`${origin}/api/sessions/${id}/cases/modified/mutate`, { method: 'POST' });
  const changed = await fetch(url, { headers: { 'If-Modified-Since': modified } });
  assert.equal(changed.status, 200);
  assert.ok(Date.parse(changed.headers.get('last-modified')) > Date.parse(modified));
  assert.equal((await changed.json()).version, 2);
});

test('no-store 每次返回实体，Expires 场景只使用绝对过期时间', async () => {
  const { id } = await session();
  for (let index = 0; index < 2; index += 1) {
    const response = await fetch(`${origin}/resources/${id}/no-store.json`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('etag'), null);
    await response.text();
  }
  const expires = await fetch(`${origin}/resources/${id}/expires.json`);
  assert.equal(expires.headers.get('cache-control'), null);
  assert.equal(expires.headers.get('etag'), null);
  assert.equal(expires.headers.get('last-modified'), null);
  assert.equal(Date.parse(expires.headers.get('expires')) - Date.parse(expires.headers.get('date')), 15000);
});

test('请求日志只统计真实资源请求，控制接口禁止缓存', async () => {
  const { id } = await session();
  const stateUrl = `${origin}/api/sessions/${id}`;
  const initial = await fetch(stateUrl);
  assert.equal(initial.headers.get('cache-control'), 'no-store');
  assert.equal((await initial.json()).events.length, 0);
  await fetch(`${origin}/resources/${id}/etag.json`);
  const state = await (await fetch(stateUrl)).json();
  assert.equal(state.events.length, 1);
  assert.equal(state.events[0].status, 200);
  assert.equal(state.events[0].caseId, 'etag');
  assert.equal(state.events[0].requestHeaders['if-none-match'], null);
  assert.equal(state.scenarios.find((item) => item.id === 'etag').version, 1);
  const missing = await fetch(`${origin}/resources/${id}/unknown.json`);
  assert.equal(missing.status, 404);
});
