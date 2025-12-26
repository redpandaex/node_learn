import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type { Client, ClientInfo } from '../types/client';
import { generateClientName } from '../utils/index';

/**
 * 客户端管理器
 * 负责管理所有连接的客户端
 */
export class ClientManager {
  private clients = new Map<string, Client>();

  /**
   * 注册新客户端
   */
  registerClient(ws: WebSocket, name: string | undefined, ip: string, userAgent?: string, roomId?: string): Client {
    const clientId = uuidv4();
    const client: Client = {
      id: clientId,
      name: generateClientName(clientId, name),
      ws,
      connected: true,
      lastSeen: Date.now(),
      ip,
      userAgent,
      roomId: roomId || 'default', // 默认房间
    };

    this.clients.set(clientId, client);
    console.log(`Client registered: ${client.name} (${clientId}) from IP: ${ip}, Room: ${client.roomId}`);

    return client;
  }

  /**
   * 移除客户端
   */
  removeClient(clientId: string): boolean {
    const removed = this.clients.delete(clientId);
    if (removed) {
      console.log(`Client ${clientId} removed`);
    }
    return removed;
  }

  /**
   * 通过WebSocket连接移除客户端
   */
  removeClientByWs(ws: WebSocket): string | null {
    for (const [id, client] of this.clients.entries()) {
      if (client.ws === ws) {
        this.clients.delete(id);
        console.log(`Client ${id} disconnected`);
        return id;
      }
    }
    return null;
  }

  /**
   * 获取客户端
   */
  getClient(clientId: string): Client | undefined {
    return this.clients.get(clientId);
  }

  /**
   * 获取所有客户端
   */
  getAllClients(): Client[] {
    return Array.from(this.clients.values());
  }

  /**
   * 获取指定房间的客户端
   */
  getClientsByRoom(roomId: string): Client[] {
    return Array.from(this.clients.values()).filter((client) => client.roomId === roomId);
  }

  /**
   * 获取所有房间ID
   */
  getAllRoomIds(): string[] {
    const roomIds = new Set<string>();
    for (const client of this.clients.values()) {
      if (client.roomId) {
        roomIds.add(client.roomId);
      }
    }
    return Array.from(roomIds);
  }

  /**
   * 获取客户端基本信息列表
   */
  getClientList(): Array<{ id: string; name: string }> {
    return Array.from(this.clients.values()).map((client) => ({
      id: client.id,
      name: client.name,
    }));
  }

  /**
   * 获取客户端详细信息列表
   */
  getClientInfoList(): ClientInfo[] {
    return Array.from(this.clients.values()).map((client) => ({
      id: client.id,
      name: client.name,
      ip: client.ip,
      connected: client.connected,
      lastSeen: new Date(client.lastSeen).toISOString(),
      userAgent: client.userAgent,
    }));
  }

  /**
   * 获取客户端数量
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * 更新客户端最后活跃时间
   */
  updateClientLastSeen(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastSeen = Date.now();
    }
  }
}
