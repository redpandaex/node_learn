# ICE 服务器管理功能

本项目已集成了完整的 ICE 服务器管理功能，支持动态配置 STUN/TURN 服务器。

## 功能特性

### 🚀 核心功能

- **动态配置管理**: 实时添加、删除、更新 STUN/TURN 服务器
- **自动配置获取**: 客户端自动从服务器获取最新的 ICE 配置
- **预设服务器**: 快速添加知名服务提供商的配置
- **服务器测试**: 测试 ICE 服务器的连通性
- **配置持久化**: 服务器重启后配置保持不变

### 🛡️ 默认配置

系统默认包含多个 Google 公共 STUN 服务器：
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`
- `stun:stun2.l.google.com:19302`
- `stun:stun3.l.google.com:19302`
- `stun:stun4.l.google.com:19302`

## API 接口

### 获取 ICE 服务器配置
```http
GET /api/ice-servers
```

### 获取详细配置
```http
GET /api/ice-config
```

### 更新配置
```http
POST /api/ice-config
Content-Type: application/json

{
  "type": "add|remove|update|reset",
  "serverType": "stun|turn",
  "server": {
    "urls": "stun:example.com:3478",
    "username": "optional-username",
    "credential": "optional-password"
  },
  "index": 0  // 用于 remove 和 update 操作
}
```

### 添加预设服务器
```http
POST /api/ice-servers/preset
Content-Type: application/json

{
  "preset": "coturn|twilio|xirsys"
}
```

### 测试服务器
```http
GET /api/ice-servers/test
```

### 客户端 WebRTC 配置
```http
GET /api/webrtc-config
```

## 使用示例

### 服务器端

#### 1. 启动服务器
```bash
cd server
npm run dev
```

#### 2. 添加自定义 STUN 服务器
```bash
curl -X POST http://localhost:3000/api/ice-config \
  -H "Content-Type: application/json" \
  -d '{
    "type": "add",
    "serverType": "stun",
    "server": {
      "urls": "stun:mystun.example.com:3478"
    }
  }'
```

#### 3. 添加 TURN 服务器
```bash
curl -X POST http://localhost:3000/api/ice-config \
  -H "Content-Type: application/json" \
  -d '{
    "type": "add",
    "serverType": "turn",
    "server": {
      "urls": ["turn:myturn.example.com:3478", "turns:myturn.example.com:5349"],
      "username": "myuser",
      "credential": "mypassword"
    }
  }'
```

### 客户端

#### 1. 自动获取配置（推荐）
```typescript
import { useWebRTC } from './hooks/useWebRTC';

// 默认会自动从服务器获取配置
const webRTC = useWebRTC({
  serverUrl: 'ws://localhost:3000/ws',
  autoFetchICEServers: true  // 默认为 true
});
```

#### 2. 使用自定义配置
```typescript
const webRTC = useWebRTC({
  serverUrl: 'ws://localhost:3000/ws',
  autoFetchICEServers: false,
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { 
      urls: 'turn:myturn.example.com:3478',
      username: 'myuser',
      credential: 'mypassword'
    }
  ]
});
```

#### 3. 管理界面组件
```typescript
import { ICEServerManager } from './components/shared/ICEServerManager';

function AdminPanel() {
  return (
    <div>
      <ICEServerManager serverUrl="http://localhost:3000" />
    </div>
  );
}
```

## 配置示例

### Coturn 服务器配置
```json
{
  "type": "add",
  "serverType": "turn",
  "server": {
    "urls": ["turn:your-server.com:3478", "turns:your-server.com:5349"],
    "username": "your-username",
    "credential": "your-password"
  }
}
```

### 多 URL 配置
```json
{
  "type": "add",
  "serverType": "stun",
  "server": {
    "urls": [
      "stun:stun1.example.com:3478",
      "stun:stun2.example.com:3478"
    ]
  }
}
```

## 安全注意事项

1. **TURN 服务器认证**: TURN 服务器必须配置用户名和密码
2. **HTTPS/WSS**: 生产环境建议使用 HTTPS 和 WSS
3. **访问控制**: 考虑对管理 API 添加身份验证
4. **密码保护**: 避免在日志中暴露 TURN 服务器密码

## 故障排除

### 常见问题

1. **无法连接到 STUN/TURN 服务器**
   - 检查服务器 URL 格式是否正确
   - 确认服务器端口是否开放
   - 验证网络防火墙设置

2. **TURN 服务器认证失败**
   - 检查用户名和密码是否正确
   - 确认 TURN 服务器是否启用了认证

3. **配置不生效**
   - 检查客户端是否启用了 `autoFetchICEServers`
   - 确认服务器 API 是否正常工作

### 调试命令

```bash
# 查看当前配置
curl http://localhost:3000/api/ice-config

# 测试服务器连通性
curl http://localhost:3000/api/ice-servers/test

# 重置配置
curl -X POST http://localhost:3000/api/ice-config \
  -H "Content-Type: application/json" \
  -d '{"type": "reset", "serverType": "stun"}'
```

## 架构说明

### 服务器端架构
```
server/src/
├── types/config.ts           # 类型定义
├── services/iceServerManager.ts  # ICE 服务器管理器
├── routes/iceConfig.ts       # API 路由处理器
└── index.ts                  # 主服务器文件
```

### 客户端架构
```
client/src/
├── types/webRTC.ts          # WebRTC 类型定义
├── hooks/useWebRTC.ts       # WebRTC Hook（已增强）
└── components/shared/ICEServerManager.tsx  # 管理界面组件
```

## 扩展功能

可以考虑添加以下功能：
- 配置导入/导出
- 服务器性能监控
- 负载均衡配置
- 地理位置优化
- 配置模板管理