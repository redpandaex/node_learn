import { useState, useRef, useCallback } from 'react';
import {
  ConnectionState,
  Client,
  SignalingMessage,
  RegisterMessage,
  RegisteredMessage,
  ClientListMessage,
} from '../../types/webRTC';

export interface UseConnectionOptions {
  serverUrl: string;
  onMessage?: (event: MessageEvent) => void;
}

export interface UseConnectionReturn {
  connectionState: ConnectionState;
  clients: Client[];
  wsRef: React.RefObject<WebSocket | null>;
  clientIdRef: React.RefObject<string>;
  clientNameRef: React.RefObject<string>;
  connect: (name: string, roomId?: string) => Promise<void>;
  disconnect: () => void;
}

export const useConnection = (
  options: UseConnectionOptions,
): UseConnectionReturn => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    clientId: '',
    clientName: '',
    clientIP: '',
    error: null,
  });

  const [clients, setClients] = useState<Client[]>([]);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string>('');
  const clientNameRef = useRef<string>('');

  // WebSocket消息处理
  const handleWebSocketMessage = useCallback(
    async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as SignalingMessage;

        switch (data.type) {
          case 'registered': {
            const msg = data as RegisteredMessage;
            console.log('Client registered successfully:', {
              clientId: msg.clientId,
              name: msg.name,
              ip: msg.ip,
              roomId: msg.roomId,
            });

            // 保存到 ref 中，确保立即可用
            clientIdRef.current = msg.clientId;
            clientNameRef.current = msg.name;

            setConnectionState((prev) => ({
              ...prev,
              isConnected: true,
              clientId: msg.clientId,
              clientName: msg.name,
              clientIP: msg.ip,
              error: null,
            }));

            // 如果需要，可以将房间ID更新到URL中
            if (msg.roomId && msg.roomId !== 'default') {
              const url = new URL(window.location.href);
              url.searchParams.set('room', msg.roomId);
              window.history.replaceState({}, '', url.toString());
            }
            break;
          }

          case 'client-list': {
            const msg = data as ClientListMessage;
            setClients(
              msg.clients.filter((c) => c.id !== connectionState.clientId),
            );
            break;
          }

          default:
            // 其他消息类型交给外部处理
            if (options.onMessage) {
              options.onMessage(event);
            }
            break;
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    },
    [connectionState.clientId, options],
  );

  // 连接到服务器
  const connect = useCallback(
    async (name: string, roomId?: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        try {
          // 创建一个标志来跟踪这次连接尝试
          let connectionResolved = false;

          wsRef.current = new WebSocket(options.serverUrl);

          wsRef.current.onopen = () => {
            const message: RegisterMessage = {
              type: 'register',
              name: name,
              roomId: roomId || 'default',
            };
            wsRef.current!.send(JSON.stringify(message));
          };

          // 修改消息处理逻辑，直接监听 registered 消息
          wsRef.current.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data) as SignalingMessage;

              // 如果收到注册成功消息且还没有解析，则解析 Promise
              if (data.type === 'registered' && !connectionResolved) {
                connectionResolved = true;
                resolve();
              }

              // 继续处理其他消息
              handleWebSocketMessage(event);
            } catch (error) {
              console.error(
                'Error handling WebSocket message in connect:',
                error,
              );
            }
          };

          wsRef.current.onerror = (error) => {
            if (!connectionResolved) {
              connectionResolved = true;
              setConnectionState((prev) => ({
                ...prev,
                error: 'WebSocket连接错误',
              }));
              reject(error);
            }
          };

          wsRef.current.onclose = () => {
            if (!connectionResolved) {
              connectionResolved = true;
              reject(new Error('WebSocket连接关闭'));
            }
            setConnectionState((prev) => ({
              ...prev,
              isConnected: false,
              error: '连接已断开',
            }));
          };

          // 设置超时
          setTimeout(() => {
            if (!connectionResolved) {
              connectionResolved = true;
              reject(new Error('连接超时'));
            }
          }, 10000); // 10秒超时
        } catch (error) {
          reject(error);
        }
      });
    },
    [options.serverUrl, handleWebSocketMessage],
  );

  // 断开连接
  const disconnect = useCallback(() => {
    // 立即设置断开状态，避免UI卡顿
    setConnectionState((prev) => ({
      ...prev,
      isConnected: false,
      error: null,
    }));

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // 清理其他状态
    setTimeout(() => {
      setConnectionState({
        isConnected: false,
        clientId: '',
        clientName: '',
        clientIP: '',
        error: null,
      });
      setClients([]);
      clientIdRef.current = '';
    }, 0);
  }, []);

  return {
    connectionState,
    clients,
    wsRef,
    clientIdRef,
    clientNameRef,
    connect,
    disconnect,
  };
};
