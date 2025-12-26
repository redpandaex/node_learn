import { Hono } from 'hono';
import type { ClientManager } from '../services/clientManager';

/**
 * 创建客户端相关的路由
 */
export function createClientRoutes(app: Hono, clientManager: ClientManager) {
  // 获取所有客户端列表
  app.get('/clients', (c) => {
    const roomId = c.req.query('room');

    if (roomId) {
      // 获取指定房间的客户端
      const clients = clientManager.getClientsByRoom(roomId).map((client) => ({
        id: client.id,
        name: client.name,
        ip: client.ip,
        connected: client.connected,
        lastSeen: new Date(client.lastSeen).toISOString(),
        userAgent: client.userAgent,
        roomId: client.roomId,
      }));

      return c.json({
        success: true,
        data: clients,
        count: clients.length,
        roomId: roomId,
      });
    } else {
      // 获取所有客户端
      const clients = clientManager.getClientInfoList();
      return c.json({
        success: true,
        data: clients,
        count: clients.length,
      });
    }
  });

  // 获取所有房间列表
  app.get('/rooms', (c) => {
    const roomIds = clientManager.getAllRoomIds();
    const rooms = roomIds.map((roomId) => {
      const clients = clientManager.getClientsByRoom(roomId);
      return {
        roomId,
        clientCount: clients.length,
        clients: clients.map((client) => ({
          id: client.id,
          name: client.name,
        })),
      };
    });

    return c.json({
      success: true,
      data: rooms,
      count: rooms.length,
    });
  });

  // 获取客户端详细信息
  app.get('/clients/:id', (c) => {
    const clientId = c.req.param('id');
    const client = clientManager.getClient(clientId);

    if (!client) {
      return c.json(
        {
          success: false,
          error: 'Client not found',
        },
        404,
      );
    }

    return c.json({
      success: true,
      data: {
        id: client.id,
        name: client.name,
        ip: client.ip,
        connected: client.connected,
        lastSeen: new Date(client.lastSeen).toISOString(),
        userAgent: client.userAgent,
      },
    });
  });
}
