# 浏览器缓存实验室

用真实的 HTTP 响应头和浏览器缓存观察：强缓存什么时候直接复用，协商缓存什么时候返回 304，内容变了为什么返回 200。

## 启动

需要 Node.js 22 或以上版本。没有第三方依赖，不需要安装包。

```bash
cd ~/js/node_learn/32_browser_cache_lab
npm start
```

浏览器打开 <http://localhost:3320>。端口被占用时可以用 `PORT=3321 npm start`。

默认只监听本机 `127.0.0.1`。如果 Node 在 WSL 中运行，可以先在 Windows 浏览器访问同一个 localhost 地址。

## 先这样操作

1. 打开开发者工具的 **Network** 面板。
2. **取消勾选 Disable cache**。勾选会禁用被观察的浏览器缓存。
3. 筛选 `/resources/`，把页面、脚本和控制接口排除掉。
4. 页面里的请求模式先保持 **default**。
5. 点击页面的“请求资源”，不要用刷新页面代替这一步。普通刷新和强制刷新可能改变缓存行为。

页面左边选择实验，右边对照两份证据：浏览器读到了什么，以及服务端实际收到了什么。

## 第一轮：先看见强缓存

选择 `max-age`，服务端响应头包含：

```http
Cache-Control: public, max-age=15
ETag: "当前内容的标识"
```

1. 第一次点击“请求资源”：服务端记录一条 **200**，浏览器读到 **v1**。
2. 立即再点一次：服务端记录仍只有一条。浏览器直接复用响应，Network 通常显示 `(memory cache)` 或 `(disk cache)`。
3. 点击“修改服务端内容”：服务端版本变成 **v2**，资源 URL 保持不变。
4. 在 15 秒有效期内再请求：浏览器仍可能读到 **v1**。它没有先询问服务端，所以不知道内容已经变化。
5. 等页面显示“预计已过期”，再请求：服务端收到旧 ETag，发现内容变了，返回 **200 + v2**。

这就是缓存带来的新鲜度取舍：有效期内可以省掉一次网络请求，但服务端更新并不保证浏览器立即知道。`public` 允许共享缓存保存，这个本地实验没有部署 CDN 或代理。

页面的倒计时根据响应的 `Date`、`Age` 和有效期估算；它不是读取浏览器内部缓存计时器。再次读取缓存不会让有效期重新开始。

## 第二轮：看缓存过期后为什么能返回 304

选择“过期后验证”：

```http
Cache-Control: public, max-age=5, must-revalidate
ETag: "当前内容的标识"
```

1. 第一次请求：200；立即第二次请求：直接复用。
2. **不要修改内容**，等待 5 秒过期后再请求。
3. 浏览器自动发送 `If-None-Match`，服务端返回 **304**，日志里的响应体是 **0 B**。
4. 浏览器继续使用已保存的响应体，因此仍然读得到完整的 v1。

缓存过期表示不能直接当作新鲜响应使用，不代表本地内容必须立刻删除。`must-revalidate` 要求过期后成功验证再复用。

## 第三轮：对比 no-cache 和 no-store

| 场景 | 可以保存响应吗 | 正常重复请求时 | 内容没变时 |
| --- | --- | --- | --- |
| `max-age=15` | 可以 | 新鲜期内直接复用 | 没有资源网络请求 |
| `no-cache` + ETag | 可以 | 每次复用前验证 | 服务端返回 304，复用本地响应体 |
| `no-store` | 不保存这份响应 | 每次重新请求 | 本实验每次返回 200 和完整响应体 |

选择 `no-cache + ETag` 连续点击三次，预期记录为 **200、304、304**。修改内容后再次请求，变为 **200**。

再选择 `no-store` 连续点击三次，预期是 **200、200、200**。这里没有验证器，响应体也不会作为 HTTP 缓存留给下次复用。

## 第四轮：看两组协商字段怎么配对

| 响应头，由服务端发送 | 下次请求头，由浏览器发送 | 服务端怎么判断 |
| --- | --- | --- |
| `ETag` | `If-None-Match` | 当前标识是否匹配 |
| `Last-Modified` | `If-Modified-Since` | 资源是否在这个时间之后修改过 |

选择 `Last-Modified`，第一次 200，第二次 304。看右侧条件请求头，再修改内容、重新请求，观察 200 和新的修改时间。

这个场景不发送 ETag，便于单独观察时间验证。HTTP 日期精确到秒，点击修改时服务端可能等待不足 1 秒，确保修改时间确实变化。若同时收到两种条件，服务端优先处理 `If-None-Match`。

## 第五轮：看 Expires 的绝对时间

选择 `Expires`。这里没有 `Cache-Control`、ETag 或 Last-Modified，响应头示意：

```http
Date: Fri, 23 Oct 2026 06:00:00 GMT
Expires: Fri, 23 Oct 2026 06:00:15 GMT
```

过期前直接复用，过期后重新下载，返回 200。因为这个接口没有验证器，浏览器无法用前面两组字段来协商。

`max-age` 是相对时长，`Expires` 是绝对时间。两者同时存在时，`max-age` 优先。

## 为什么 fetch 的 status 是 200，服务端却显示 304？

服务端发出的 304 不包含响应体。浏览器拿它更新已保存的响应信息，然后把缓存体交给调用方。所以 JavaScript 的 `response.status` 通常仍是 **200**，读到的内容也是完整的。

因此页面把两个数分开：

- **JavaScript 读到的 status**：来自真实 `fetch` 的 Response。
- **本次真实网络响应**：来自服务端实际请求日志；没有新请求时明确显示“没有发出请求”。

在 Network 中选中资源，查看 General、Request Headers 和 Response Headers，再对照页面的日志。某些浏览器界面会合并或表现出不同的状态信息，服务端日志可以确认实际响应。

## 进阶：客户端也可以改变这次请求的缓存方式

页面展开“进阶”后有三个标准 `fetch` 选项：

```js
fetch(resourceUrl, { cache: 'default' });  // 正常查缓存；新鲜就复用，过期则尝试验证
fetch(resourceUrl, { cache: 'no-cache' }); // 已有缓存也先向服务端验证
fetch(resourceUrl, { cache: 'reload' });   // 跳过旧缓存，向服务端重新取，并按规则更新缓存
```

可以在 `max-age` 实验中对比：先缓存，手动修改服务端，再把模式改为 `no-cache`，就能提前获取变化的内容。未变化时主动验证可能得到 304。

这三个值控制本次请求；服务端响应头控制这份响应可以怎么保存和复用。两者不要混在一起背。页面不手动拼 `If-*` 条件头，条件由浏览器自己生成。

## URL 和实验状态

- 一轮实验使用固定资源 URL，重复请求没有随机参数，不会为了刷新内容偷偷加时间戳。
- “修改服务端内容”只改变该资源的内容及验证信息，**不改变 URL**，也不自动请求资源。
- “开始新一轮”创建新的实验 ID 和 URL，相当于访问一份从未请求过的新资源；它不清理浏览器全局缓存。
- 实验 ID 保存在 sessionStorage，资源内容由 HTTP 缓存管理。sessionStorage 没有保存资源正文。
- 服务端重启会清空内存状态。重新进入页面会自动创建一轮；停留在旧页面时点击“开始新一轮”即可。
- 服务端最多保留 100 轮实验，每轮保留最近 150 条资源日志。内容和日志都仅在内存中。
- 页面、JS、CSS 和 `/api/` 接口统一使用 `no-store`；只有 `/resources/` 是被观察的对象。测试 JSON 和测试图片、脚本遵循同样的 HTTP 缓存机制。

## 代码从哪里读

```text
server.mjs                 HTTP 服务、六种响应策略、条件请求判断、真实请求日志
public/index.html          实验页面
public/app.js              fetch、版本对照、日志展示和新鲜度估算
public/style.css           页面样式
test/server.test.mjs       HTTP 行为测试
scripts/browser-check.mjs  用真实 Chrome 验证缓存和页面交互，无须浏览器测试依赖
```

先读 `server.mjs` 中设置 `Cache-Control` / ETag / Last-Modified 的位置，再读 `notModified` 判断，最后看 `public/app.js` 中“请求资源”的事件处理，就能把两端连起来。

## 验证

```bash
npm test
npm run test:browser
```

第一条检查真实 HTTP 响应的缓存头、ETag、Last-Modified、304 空响应体、修改后返回 200，以及请求日志。

第二条另外需要本机安装 Chrome 或 Chromium。脚本会启动临时服务和独立浏览器配置，用页面按钮操作六种场景；保留浏览器 HTTP 缓存，不使用请求拦截。Linux 默认查找 `/usr/bin/google-chrome` 等路径，其他位置可用：

```bash
CHROME_BIN=/path/to/chrome npm run test:browser
```

检查后自动关闭临时服务和浏览器。这个命令和你手动操作的 3320 服务互相独立。需要保存桌面和手机截图时，可以额外设置 `SCREENSHOT_DIR=/tmp/cache-lab-review`。

## 参考

- [MDN：Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)
- [MDN：HTTP 缓存](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)
- [MDN：Request.cache](https://developer.mozilla.org/en-US/docs/Web/API/Request/cache)
- [Node.js：HTTP](https://nodejs.org/api/http.html)
