import { Hono } from 'hono';

/**
 * 基础路由
 */
export function createBaseRoutes(app: Hono): void {
  // 根路由
  app.get('/', (c) => {
    return c.text('WebRTC File Transfer Signaling Server is running!');
  });

  // 健康检查路由
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // 服务信息路由
  app.get('/info', (c) => {
    return c.json({
      name: 'WebRTC Signaling Server',
      version: '1.0.0',
      description: 'A signaling server for WebRTC peer-to-peer file transfer',
      endpoints: {
        websocket: '/ws',
        clients: '/clients',
        webrtcConfig: '/api/webrtc-config',
        iceServers: '/api/ice-servers',
      },
    });
  });
}
