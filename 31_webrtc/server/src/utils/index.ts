import { type Context } from 'hono';
import { WebSocket } from 'ws';

/**
 * 从WebSocket连接获取客户端IP地址
 */
export function getWebSocketClientIP(ws: WebSocket): string {
  try {
    // WebSocket有一个内部的socket属性，我们需要安全地访问它
    const socket = (ws as WebSocket & { _socket?: { remoteAddress?: string } })._socket;

    if (socket?.remoteAddress) {
      const remoteAddress = socket.remoteAddress;
      // 处理IPv6映射的IPv4地址
      if (remoteAddress.startsWith('::ffff:')) {
        return remoteAddress.substring(7);
      }
      return remoteAddress;
    }

    return 'unknown';
  } catch (error) {
    console.error('Failed to get WebSocket client IP:', error);
    return 'unknown';
  }
}

/**
 * 生成客户端显示名称
 */
export function generateClientName(clientId: string, providedName?: string): string {
  return providedName || `Client-${clientId.substring(0, 8)}`;
}
