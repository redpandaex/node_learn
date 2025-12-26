# WebRTC 局域网文件传输系统

一个基于 WebRTC 技术的局域网文件传输解决方案，支持多设备间的实时文件传输。


## webRTC调试

浏览器 WebRTC 内部工具
Chrome: chrome://webrtc-internals/
Firefox: about:webrtc
可以看到 DataChannel 状态、传输统计、连接质量等

## 🚀 快速开始

### 1. 启动服务器
```bash
cd server
npm install
npm run dev
```
服务器将在 http://localhost:3000 启动

### 2. 启动客户端
```bash
cd client
npm install
npm run dev
```
客户端将在 http://localhost:8080 启动

## 📋 功能特性

- ✅ **实时设备发现**：自动发现局域网内的其他设备
- ✅ **P2P 文件传输**：使用 WebRTC 技术实现点对点传输
- ✅ **多设备支持**：支持多个设备同时在线
- ✅ **本设备标识**：清晰标记本设备，防止误操作
- ✅ **传输进度显示**：实时显示文件传输进度
- ✅ **移动端适配**：完整的移动端支持
- ✅ **文件下载管理**：支持接收文件的下载和管理

## 🔄 WebRTC 通信流程详解

### 整体架构

```
┌─────────────────┐    WebSocket     ┌─────────────────┐    WebSocket     ┌─────────────────┐
│    客户端 A     │◄────────────────►│   信令服务器    │◄────────────────►│    客户端 B     │
│  (发送方)      │                  │  (WebSocket)    │                  │  (接收方)      │
└─────────────────┘                  └─────────────────┘                  └─────────────────┘
         ▲                                                                          ▲
         │                              WebRTC P2P                                  │
         │                         ◄─────────────────────►                         │
         └──────────────────────────────────────────────────────────────────────────┘
```

### 1. 连接建立阶段

#### 1.1 客户端注册 (Registration)
```typescript
// 客户端发送注册消息
const registerMessage: RegisterMessage = {
  type: 'register',
  name: clientName  // 用户输入的设备名称
};
websocket.send(JSON.stringify(registerMessage));
```

**调用的关键 API：**
- `new WebSocket(serverUrl)` - 创建 WebSocket 连接
- `websocket.send()` - 发送注册信息

#### 1.2 服务器响应注册 (Registration Response)
```typescript
// 服务器返回注册成功消息
const registeredMessage: RegisteredMessage = {
  type: 'registered',
  clientId: 'unique-client-id',
  name: clientName
};
```

#### 1.3 客户端列表同步 (Client List Sync)
```typescript
// 服务器广播更新的客户端列表
const clientListMessage: ClientListMessage = {
  type: 'client-list',
  clients: [
    { id: 'client-1', name: 'Device A' },
    { id: 'client-2', name: 'Device B' }
  ]
};
```

### 2. WebRTC 对等连接建立

#### 2.1 初始化 RTCPeerConnection
```typescript
peerConnection = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});
```

**调用的关键 API：**
- `new RTCPeerConnection()` - 创建对等连接
- `peerConnection.createDataChannel()` - 创建数据通道
- `peerConnection.createOffer()` - 创建 SDP Offer

#### 2.2 创建数据通道 (Data Channel)
```typescript
// 发送方创建数据通道
dataChannel = peerConnection.createDataChannel('fileTransfer', {
  ordered: true  // 保证数据顺序
});
```

#### 2.3 SDP 协商过程 (SDP Negotiation)

**发送方：**
```typescript
// 1. 创建 Offer
const offer = await peerConnection.createOffer();
await peerConnection.setLocalDescription(offer);

// 2. 通过 WebSocket 发送 Offer
const offerMessage: OfferMessage = {
  type: 'offer',
  offer: offer,
  fromId: senderId,
  targetId: receiverId
};
websocket.send(JSON.stringify(offerMessage));
```

**接收方：**
```typescript
// 1. 接收并设置远程描述
await peerConnection.setRemoteDescription(offer);

// 2. 创建 Answer
const answer = await peerConnection.createAnswer();
await peerConnection.setLocalDescription(answer);

// 3. 发送 Answer
const answerMessage: AnswerMessage = {
  type: 'answer',
  answer: answer,
  fromId: receiverId,
  targetId: senderId
};
websocket.send(JSON.stringify(answerMessage));
```

**调用的关键 API：**
- `peerConnection.setLocalDescription()` - 设置本地 SDP
- `peerConnection.setRemoteDescription()` - 设置远程 SDP
- `peerConnection.createOffer()` - 创建 SDP Offer
- `peerConnection.createAnswer()` - 创建 SDP Answer

#### 2.4 ICE 候选交换 (ICE Candidate Exchange)
```typescript
// ICE 候选事件监听
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    const candidateMessage: IceCandidateMessage = {
      type: 'ice-candidate',
      candidate: event.candidate,
      fromId: localId,
      targetId: remoteId
    };
    websocket.send(JSON.stringify(candidateMessage));
  }
};

// 接收并添加 ICE 候选
await peerConnection.addIceCandidate(candidate);
```

**调用的关键 API：**
- `peerConnection.addIceCandidate()` - 添加 ICE 候选

### 3. 文件传输阶段

#### 3.1 文件信息发送 (File Metadata)
```typescript
// 发送文件元数据
const fileInfo: FileInfoMessage = {
  type: 'file-info',
  fileName: file.name,
  fileSize: file.size,
  fileType: file.type,
  totalChunks: Math.ceil(file.size / chunkSize)
};
dataChannel.send(JSON.stringify(fileInfo));
```

#### 3.2 文件分块传输 (Chunked Transfer)
```typescript
// 文件分块处理
const chunkSize = 128*1024; // 64KB
const totalChunks = Math.ceil(file.size / chunkSize);

for (let i = 0; i < totalChunks; i++) {
  const start = i * chunkSize;
  const end = Math.min(start + chunkSize, file.size);
  const chunk = file.slice(start, end);
  const buffer = await chunk.arrayBuffer();
  
  // 创建合并的消息（头信息 + 数据）
  const chunkInfo = JSON.stringify({
    type: 'file-chunk',
    chunkIndex: i,
    totalChunks: totalChunks
  });
  
  const headerBuffer = new TextEncoder().encode(chunkInfo + '\n');
  const combinedBuffer = new ArrayBuffer(headerBuffer.byteLength + buffer.byteLength);
  const combinedView = new Uint8Array(combinedBuffer);
  combinedView.set(new Uint8Array(headerBuffer), 0);
  combinedView.set(new Uint8Array(buffer), headerBuffer.byteLength);
  
  dataChannel.send(combinedBuffer);
}
```

**调用的关键 API：**
- `dataChannel.send()` - 发送数据
- `file.slice()` - 文件分片
- `chunk.arrayBuffer()` - 转换为二进制数据

#### 3.3 接收端处理 (Receiver Processing)
```typescript
dataChannel.onmessage = (event) => {
  if (typeof event.data === 'string') {
    // 处理文件元数据
    const fileInfo = JSON.parse(event.data);
    // 初始化接收缓冲区
  } else if (event.data instanceof ArrayBuffer) {
    // 处理文件块数据
    // 解析头信息和文件数据
    // 存储到对应的块位置
    // 更新传输进度
  }
};
```

### 4. 状态管理和错误处理

#### 4.1 连接状态监控
```typescript
// WebSocket 连接状态
websocket.onopen = () => { /* 连接建立 */ };
websocket.onclose = () => { /* 连接断开 */ };
websocket.onerror = (error) => { /* 连接错误 */ };

// WebRTC 连接状态
peerConnection.onconnectionstatechange = () => {
  console.log('Connection state:', peerConnection.connectionState);
};

// 数据通道状态
dataChannel.onopen = () => { /* 通道打开 */ };
dataChannel.onclose = () => { /* 通道关闭 */ };
dataChannel.onerror = (error) => { /* 通道错误 */ };
```

#### 4.2 缓冲区管理
```typescript
// 避免发送缓冲区溢出
const MAX_BUFFER_SIZE = 1 * 1024 * 1024; // 1MB
if (dataChannel.bufferedAmount > MAX_BUFFER_SIZE) {
  // 等待缓冲区清空
  setTimeout(sendNextChunk, 10);
}
```

## 🔧 关键技术实现

### 信令服务器 (WebSocket)
- **作用**：设备发现、SDP 交换、ICE 候选中继
- **协议**：WebSocket
- **消息类型**：register, registered, client-list, offer, answer, ice-candidate

### WebRTC 数据通道
- **作用**：点对点文件传输
- **特性**：有序传输、二进制数据支持
- **优化**：分块传输、缓冲区管理、进度追踪

### 文件处理
- **分块策略**：64KB 块大小平衡性能和内存使用
- **数据格式**：JSON 头信息 + 二进制数据
- **重组算法**：按序号重组文件块

## 📱 设备标识和管理

### 本设备标识
- 在设备列表顶部显示本设备
- 蓝色"本设备"标签标识
- 禁用向本设备发送文件的按钮
- 提供友好的提示信息

### 设备状态管理
```typescript
const displayClients = useMemo(() => {
  const allClients = [...clients];
  if (connectionState.isConnected && connectionState.clientId) {
    allClients.unshift({
      id: connectionState.clientId,
      name: connectionState.clientName,
      isCurrentDevice: true
    });
  }
  return allClients;
}, [clients, connectionState]);
```

## 🔍 性能优化

### 前端优化
- **组件缓存**：使用 `useMemo` 缓存组件内容
- **事件处理器**：使用 `useCallback` 稳定引用
- **样式对象**：缓存样式对象避免重复创建
- **进度更新**：使用 `requestAnimationFrame` 优化 UI 更新

### 传输优化
- **并发控制**：避免同时发送过多数据块
- **缓冲区管理**：监控发送缓冲区大小
- **错误重试**：实现传输失败重试机制

## 🚨 常见问题和解决方案

### 1. 输入框失焦问题
**原因**：组件过度重渲染导致 Input 组件重新挂载  
**解决**：使用 `useMemo` 缓存 JSX 内容，避免组件重新创建

### 2. 文件传输失败
**原因**：网络不稳定或缓冲区溢出  
**解决**：实现重试机制和缓冲区管理

### 3. 移动端兼容性
**原因**：iOS Safari 的特殊限制  
**解决**：针对性的移动端优化和适配

## 📊 项目结构

```
├── client/                 # 前端应用
│   ├── src/
│   │   ├── hooks/         # React Hooks
│   │   │   ├── useWebRTC.ts    # WebRTC 核心逻辑
│   │   │   └── useMobile.ts    # 移动端适配
│   │   ├── types/         # TypeScript 类型定义
│   │   │   └── webRTC.ts       # WebRTC 相关类型
│   │   ├── App.tsx        # 主应用组件
│   │   └── ...
│   └── package.json
├── server/                # 后端信令服务器
│   ├── src/
│   │   └── index.ts       # WebSocket 服务器
│   └── package.json
└── README.md
```

## 🎯 未来改进方向

- [ ] 支持文件夹传输
- [ ] 添加传输加密
- [ ] 实现断点续传
- [ ] 支持多文件批量传输
- [ ] 添加传输速度限制
- [ ] 实现文件预览功能