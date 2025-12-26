//! WebSocket服务和http服务共用一个端口,即建立连接时监听http的upgrade事件
//! https://nodejs.org/docs/latest/api/http.html#event-upgrade

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { createServer, Server } from 'http';

// 定义消息类型
interface WSMessage {
  type: 'chat' | 'broadcast' | 'heartbeat' | 'system';
  id?: string;
  data: any;
  timestamp: number;
  from?: string;
}

// 客户端连接管理
interface Client {
  id: string;
  ws: WebSocket;
  isAlive: boolean;
  userInfo?: {
    name: string;
    joinTime: number;
  };
}

class WSServer {
  private clients = new Map<string, Client>();
  private wss: WebSocketServer;

  constructor(httpServer: Server) {
    // 创建WebSocket服务器
    // 1. ws服务器端口和http分离
    // this.wss = new WebSocketServer({
    //   port: 8899,
    //   perMessageDeflate: false,
    // });

    //2. ws服务器和http服务器合并,ws会使用http的upgrade事件
    this.wss = new WebSocketServer({
      server: httpServer,
      perMessageDeflate: false,
    });

    this.setupWebSocket();
    this.setupHeartbeat();

    // console.log('WebSocket服务器启动在端口 8080');
    console.log('WebSocket服务器已附加到HTTP服务器');
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = uuidv4();
      const client: Client = {
        id: clientId,
        ws,
        isAlive: true,
      };

      this.clients.set(clientId, client);
      console.log(`客户端连接: ${clientId}, 当前连接数: ${this.clients.size}`);

      // 发送欢迎消息
      this.sendToClient(clientId, {
        type: 'system',
        data: { message: '连接成功', clientId },
        timestamp: Date.now(),
      });

      // 广播新用户加入
      this.broadcast(
        {
          type: 'system',
          data: { message: `用户 ${clientId} 加入聊天室`, onlineCount: this.clients.size },
          timestamp: Date.now(),
        },
        clientId,
      );

      // 处理消息
      ws.on('message', (data) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          console.error('解析消息失败:', error);
        }
      });

      // 处理心跳
      ws.on('pong', () => {
        if (this.clients.has(clientId)) {
          this.clients.get(clientId)!.isAlive = true;
        }
      });

      // 处理断开连接
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`客户端断开: ${clientId}, 当前连接数: ${this.clients.size}`);

        // 广播用户离开
        this.broadcast({
          type: 'system',
          data: { message: `用户 ${clientId} 离开聊天室`, onlineCount: this.clients.size },
          timestamp: Date.now(),
        });
      });

      ws.on('error', (error) => {
        console.error(`WebSocket错误 ${clientId}:`, error);
        this.clients.delete(clientId);
      });
    });
  }

  private handleMessage(clientId: string, message: WSMessage) {
    message.from = clientId;
    message.timestamp = Date.now();

    switch (message.type) {
      case 'chat':
        // 聊天消息广播给所有客户端
        this.broadcast(message);
        break;

      case 'heartbeat':
        // 心跳响应
        this.sendToClient(clientId, {
          type: 'heartbeat',
          data: { pong: true },
          timestamp: Date.now(),
        });
        break;

      default:
        console.log(`收到来自 ${clientId} 的消息:`, message);
      // 可以在这里处理其他类型的消息
    }
  }

  // 发送消息给特定客户端
  private sendToClient(clientId: string, message: WSMessage) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  // 广播消息给所有客户端（可选择排除某个客户端）
  private broadcast(message: WSMessage, excludeClientId?: string) {
    this.clients.forEach((client, id) => {
      if (id !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  // 主动推送消息的方法（服务器可以调用）
  public pushMessage(message: Omit<WSMessage, 'timestamp'>) {
    const fullMessage: WSMessage = {
      ...message,
      timestamp: Date.now(),
    };
    this.broadcast(fullMessage);
  }

  // 获取在线用户列表
  public getOnlineClients() {
    return Array.from(this.clients.keys());
  }

  // 设置心跳检测
  private setupHeartbeat() {
    setInterval(() => {
      this.clients.forEach((client, id) => {
        if (!client.isAlive) {
          console.log(`心跳检测失败，断开客户端: ${id}`);
          client.ws.terminate();
          this.clients.delete(id);
          return;
        }

        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000); // 30秒心跳检测
  }
}

// 创建Hono应用
const app = new Hono();

// 创建HTTP服务器
const server = createServer();

// 启动HTTP服务器
serve(
  {
    fetch: app.fetch,
    port: 3000,
    createServer: () => server, // 返回我们创建的服务器实例
  },
  (info) => {
    console.log(`HTTP服务器运行在 http://localhost:${info.port}`);

    // 在HTTP服务器启动后创建WebSocket服务器
    const wsServer = new WSServer(server);

    // HTTP路由需要访问wsServer，所以在这里添加
    app.get('/api/online', (c) => {
      return c.json({
        count: wsServer.getOnlineClients().length,
        clients: wsServer.getOnlineClients(),
      });
    });

    app.post('/api/push', async (c) => {
      const body = await c.req.json();
      wsServer.pushMessage({
        type: 'system',
        data: body,
      });
      return c.json({ success: true, message: '消息已推送' });
    });
  },
);

// 基础路由
app.get('/', (c) => {
  return c.text('HTTP和WebSocket服务器运行在同一端口 3000');
});
