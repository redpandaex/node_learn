import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { networkInterfaces } from 'os';

// 导入业务模块
import { WebSocketManager } from './services/webSocketManager';
import { createClientRoutes } from './routes/clientRoutes';
import { createWebRTCRoutes } from './routes/webrtcRoutes';
import { createBaseRoutes } from './routes/baseRoutes';

/**
 * 获取本机网络IP地址
 */
function getNetworkIPs(): string[] {
  const interfaces = networkInterfaces();
  const ips: string[] = [];

  for (const interfaceName in interfaces) {
    const networkInterface = interfaces[interfaceName];
    if (networkInterface) {
      for (const net of networkInterface) {
        // 跳过内部地址和IPv6地址
        if (net.family === 'IPv4' && !net.internal) {
          ips.push(net.address);
        }
      }
    }
  }

  return ips;
}

/**
 * 创建和配置Hono应用
 */
function createApp(): { app: Hono; webSocketManager: WebSocketManager } {
  const app = new Hono();

  // 启用CORS
  app.use(
    '/*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // 初始化WebSocket管理器
  const webSocketManager = new WebSocketManager(app);

  return { app, webSocketManager };
}

/**
 * 注册所有路由
 */
function registerRoutes(app: Hono, webSocketManager: WebSocketManager): void {
  const clientManager = webSocketManager.getClientManager();

  // WebSocket路由
  app.get('/ws', webSocketManager.createWebSocketHandler());

  // 注册各业务模块路由
  createBaseRoutes(app);
  createClientRoutes(app, clientManager);
  createWebRTCRoutes(app);
}

/**
 * 启动服务器
 */
function startServer(): void {
  const { app, webSocketManager } = createApp();

  // 注册路由
  registerRoutes(app, webSocketManager);

  const port = process.env.PORT || 3000;

  // 启动HTTP服务器
  const server = serve({
    fetch: app.fetch,
    port: Number(port),
    hostname: '0.0.0.0',
  });

  // 注入WebSocket支持
  webSocketManager.injectWebSocket(server);

  // 获取网络IP地址
  const networkIPs = getNetworkIPs();

  // 输出启动信息
  console.log(`🚀 Signaling server is running at:`);
  console.log(`   Loopback: http://localhost:${port}/`);

  if (networkIPs.length > 0) {
    networkIPs.forEach((ip) => {
      console.log(`   On Your Network (IPv4): http://${ip}:${port}/`);
    });
  }

  console.log(`🔌 WebSocket endpoints:`);
  console.log(`   Loopback: ws://localhost:${port}/ws`);

  if (networkIPs.length > 0) {
    networkIPs.forEach((ip) => {
      console.log(`   On Your Network (IPv4): ws://${ip}:${port}/ws`);
    });
  }

  console.log(`📡 Server accepting connections on all interfaces`);

  // 输出可用的API端点
  console.log('\n📋 Available endpoints:');
  console.log('  GET  /                    - Server status');
  console.log('  GET  /health              - Health check');
  console.log('  GET  /info                - Server information');
  console.log('  GET  /clients             - List all clients');
  console.log('  GET  /clients/:id         - Get client details');
  console.log('  GET  /api/webrtc-config   - WebRTC configuration');
  console.log('  GET  /api/ice-servers     - ICE servers list');
  console.log('  GET  /api/ice-config      - ICE configuration');
  console.log('  POST /api/ice-config      - Update ICE configuration');
  console.log('  WS   /ws                  - WebSocket connection\n');
}

/**
 * 处理进程退出信号
 */
function handleProcessExit(): void {
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down server...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down server...');
    process.exit(0);
  });
}

// 启动应用
if (import.meta.url === `file://${process.argv[1]}`) {
  handleProcessExit();
  startServer();
}
