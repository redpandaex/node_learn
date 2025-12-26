import { createNodeWebSocket, type NodeWebSocket } from '@hono/node-ws';
import { Hono, type Context } from 'hono';
import { WebSocket } from 'ws';
import { ClientManager } from './clientManager';
import { SignalingManager } from './signalingManager';
import type { WebSocketMessage, RegisterMessage, SignalingMessage, DisconnectMessage } from '../types/client';
import { getWebSocketClientIP } from '../utils/index';
import { WSEvents } from 'hono/ws';

// 定义 Hono WebSocket 包装类型
interface HonoWebSocketWrapper {
  raw: WebSocket;
  send: (data: string | ArrayBuffer) => void;
  close: () => void;
}

/**
 * WebSocket连接管理器
 * 负责处理WebSocket连接和消息路由
 */
export class WebSocketManager {
  private clientManager: ClientManager;
  private signalingManager: SignalingManager;
  public injectWebSocket: NodeWebSocket['injectWebSocket'];
  public upgradeWebSocket: NodeWebSocket['upgradeWebSocket'];

  constructor(app: Hono) {
    this.clientManager = new ClientManager();
    this.signalingManager = new SignalingManager(this.clientManager);

    // 初始化WebSocket
    const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
    this.injectWebSocket = injectWebSocket;
    this.upgradeWebSocket = upgradeWebSocket;
  }

  /**
   * 获取客户端管理器实例
   */
  getClientManager(): ClientManager {
    return this.clientManager;
  }

  /**
   * 获取信令管理器实例
   */
  getSignalingManager(): SignalingManager {
    return this.signalingManager;
  }

  /**
   * 创建WebSocket路由处理器
   */
  createWebSocketHandler() {
    return this.upgradeWebSocket((c: Context) => {
      const userAgent = c.req.header('user-agent') || '';
      let clientIP = 'unknown';

      return {
        onOpen: (_evt, wsContext) => {
          if (wsContext.raw) {
            const webSocketIP = getWebSocketClientIP(wsContext.raw);
            clientIP = webSocketIP !== 'unknown' ? webSocketIP : 'unknown';
          }
          console.log(`Client connected from IP: ${clientIP}`);
        },

        onMessage: (messageEvent, wsContext) => {
          try {
            const data: WebSocketMessage = JSON.parse(messageEvent.data.toString());
            console.log('Received message:', data.type);

            const wsWrapper: HonoWebSocketWrapper = {
              raw: wsContext.raw as WebSocket,
              send: (data: string | ArrayBuffer) => wsContext.send(data),
              close: () => wsContext.close(),
            };

            this.handleMessage(data, wsWrapper, clientIP, userAgent);
          } catch (error) {
            console.error('Error parsing message:', error);
            wsContext.send(
              JSON.stringify({
                type: 'error',
                message: 'Invalid message format',
              }),
            );
          }
        },

        onClose: (_evt: CloseEvent, wsContext) => {
          if (wsContext.raw) {
            this.signalingManager.handleWebSocketClose(wsContext.raw as WebSocket);
          }
        },

        onError: (error, _wsContext) => {
          console.error('WebSocket error:', error);
        },
      } as WSEvents<WebSocket>;
    });
  }

  /**
   * 处理WebSocket消息
   */
  private handleMessage(data: WebSocketMessage, ws: HonoWebSocketWrapper, clientIP: string, userAgent: string): void {
    switch (data.type) {
      case 'register':
        this.handleRegisterMessage(data, ws, clientIP, userAgent);
        break;

      case 'offer':
      case 'answer':
      case 'ice-candidate':
      case 'call-invite':
      case 'call-accept':
      case 'call-reject':
      case 'call-end':
      case 'call-cancel':
        this.handleSignalingMessage(data as SignalingMessage, ws);
        break;

      case 'disconnect':
        this.handleDisconnectMessage(data as DisconnectMessage);
        break;

      default:
        // 使用类型断言解决 never 类型问题
        const unknownType = (data as { type: string }).type;
        console.warn('Unknown message type:', unknownType);
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Unknown message type',
          }),
        );
    }
  }

  /**
   * 处理注册消息
   */
  private handleRegisterMessage(
    data: RegisterMessage,
    ws: HonoWebSocketWrapper,
    clientIP: string,
    userAgent: string,
  ): void {
    if (!ws.raw) {
      console.error('WebSocket raw is undefined');
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'WebSocket connection invalid',
        }),
      );
      return;
    }

    console.log(`Client registering - IP: ${clientIP}, Room: ${data.roomId || 'default'}`);

    const result = this.signalingManager.handleRegister(ws.raw, data.name, clientIP, userAgent, data.roomId);

    ws.send(
      JSON.stringify({
        type: 'registered',
        ...result,
      }),
    );
  }

  /**
   * 处理信令消息
   */
  private handleSignalingMessage(data: SignalingMessage, ws: HonoWebSocketWrapper): void {
    const success = this.signalingManager.handleSignalingMessage(data);

    if (!success) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: `Target client ${data.targetId} not found or unavailable`,
        }),
      );
    }
  }

  /**
   * 处理断开连接消息
   */
  private handleDisconnectMessage(data: DisconnectMessage): void {
    this.signalingManager.handleDisconnect(data.clientId);
  }
}
