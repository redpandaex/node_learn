import { WebSocket } from 'ws';
import { ClientManager } from './clientManager';
import type { SignalingMessage } from '../types/client';

/**
 * 信令管理器
 * 负责处理WebRTC信令消息的转发和广播
 */
export class SignalingManager {
  constructor(private clientManager: ClientManager) {}

  /**
   * 处理客户端注册
   */
  handleRegister(
    ws: WebSocket,
    name: string | undefined,
    ip: string,
    userAgent?: string,
    roomId?: string,
  ): { clientId: string; name: string; ip: string; roomId: string } {
    const client = this.clientManager.registerClient(ws, name, ip, userAgent, roomId);

    // 只向同房间客户端广播列表更新
    this.broadcastClientListToRoom(client.roomId!);

    return {
      clientId: client.id,
      name: client.name,
      ip: client.ip,
      roomId: client.roomId!,
    };
  }

  /**
   * 处理信令消息转发 (offer, answer, ice-candidate)
   */
  handleSignalingMessage(message: SignalingMessage): boolean {
    console.log(`[SignalingManager] Handling ${message.type} message from ${message.fromId} to ${message.targetId}`);

    const sourceClient = this.clientManager.getClient(message.fromId);
    const targetClient = this.clientManager.getClient(message.targetId);

    if (!sourceClient) {
      console.error(`[SignalingManager] Source client ${message.fromId} not found`);
      return false;
    }

    if (!targetClient) {
      console.error(`[SignalingManager] Target client ${message.targetId} not found`);
      return false;
    }

    // 添加详细的调试信息
    console.log(
      `[SignalingManager] Source client room: "${sourceClient.roomId}", Target client room: "${targetClient.roomId}"`,
    );
    console.log(
      `[SignalingManager] Room comparison: ${sourceClient.roomId} === ${targetClient.roomId} = ${
        sourceClient.roomId === targetClient.roomId
      }`,
    );

    // 验证发送方和接收方是否在同一个房间
    if (sourceClient.roomId !== targetClient.roomId) {
      console.error(
        `[SignalingManager] Room mismatch: source client in room ${sourceClient.roomId}, target client in room ${targetClient.roomId}`,
      );
      return false;
    }

    if (targetClient.ws.readyState === WebSocket.OPEN) {
      targetClient.ws.send(
        JSON.stringify({
          ...message,
          fromId: message.fromId,
        }),
      );
      console.log(
        `[SignalingManager] Successfully forwarded ${message.type} message from ${message.fromId} to ${message.targetId}`,
      );
      return true;
    }

    console.error(
      `[SignalingManager] Target client ${message.targetId} WebSocket not open, state: ${targetClient.ws.readyState}`,
    );
    return false;
  }

  /**
   * 处理客户端断开连接
   */
  handleDisconnect(clientId: string): boolean {
    const client = this.clientManager.getClient(clientId);
    const roomId = client?.roomId;

    const removed = this.clientManager.removeClient(clientId);
    if (removed && roomId) {
      // 只向该客户端所在的房间广播更新
      this.broadcastClientListToRoom(roomId);
    }
    return removed;
  }

  /**
   * 处理WebSocket连接关闭
   */
  handleWebSocketClose(ws: WebSocket): void {
    // 先获取客户端信息（包括房间ID）再删除
    let roomId: string | undefined;
    for (const client of this.clientManager.getAllClients()) {
      if (client.ws === ws) {
        roomId = client.roomId;
        break;
      }
    }

    const clientId = this.clientManager.removeClientByWs(ws);
    if (clientId && roomId) {
      // 只向该客户端所在的房间广播更新
      this.broadcastClientListToRoom(roomId);
    }
  }

  /**
   * 广播客户端列表给所有连接的客户端
   */
  broadcastClientList(): void {
    const roomIds = this.clientManager.getAllRoomIds();

    // 为每个房间单独广播客户端列表
    for (const roomId of roomIds) {
      this.broadcastClientListToRoom(roomId);
    }
  }

  /**
   * 广播客户端列表给指定房间的客户端
   */
  broadcastClientListToRoom(roomId: string): void {
    const roomClients = this.clientManager.getClientsByRoom(roomId);
    const clientList = roomClients.map((client) => ({
      id: client.id,
      name: client.name,
      ip: client.ip,
    }));

    const message = JSON.stringify({
      type: 'client-list',
      clients: clientList,
    });

    for (const client of roomClients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(message);
        } catch (error) {
          console.error(`Failed to send client list to ${client.id}:`, error);
        }
      }
    }
  }

  /**
   * 向特定客户端发送消息
   */
  sendToClient(clientId: string, message: object): boolean {
    const client = this.clientManager.getClient(clientId);

    if (!client) {
      return false;
    }

    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error(`Failed to send message to client ${clientId}:`, error);
      }
    }

    return false;
  }

  /**
   * 广播消息给所有客户端
   */
  broadcast(message: object): void {
    const messageStr = JSON.stringify(message);
    const allClients = this.clientManager.getAllClients();

    for (const client of allClients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(messageStr);
        } catch (error) {
          console.error(`Failed to broadcast to client ${client.id}:`, error);
        }
      }
    }
  }
}
