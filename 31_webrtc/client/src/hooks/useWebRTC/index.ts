import { useCallback, useEffect, useRef } from 'react';
import { toast } from '../../lib/toast';
import {
  UseWebRTCOptions,
  UseWebRTCReturn,
  SignalingMessage,
  OfferMessage,
  AnswerMessage,
  IceCandidateMessage,
  VideoCallInviteMessage,
  VideoCallAcceptMessage,
  VideoCallRejectMessage,
  VideoCallEndMessage,
  VideoCallCancelMessage,
} from '../../types/webRTC';

// 导入拆分后的hooks
import { useConnection } from './useConnection';
import { usePeerConnection } from './usePeerConnection';
import { useDataChannel } from './useDataChannel';
import { useFileTransfer } from './useFileTransfer';
import { useVideoCall } from './useVideoCall';

const DEFAULT_OPTIONS: Required<UseWebRTCOptions> = {
  serverUrl: process.env.WS_HOST!,
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  chunkSize: 128 * 1024, // 64KB - 更稳定的块大小，避免缓冲区问题
  autoFetchICEServers: true, // 默认自动从服务器获取 ICE 服务器配置
  onCallInvite: () => {},
  onCallAccept: () => {},
  onCallReject: () => {},
  onCallEnd: () => {},
};

export const useWebRTC = (options: UseWebRTCOptions = {}): UseWebRTCReturn => {
  const config = { ...DEFAULT_OPTIONS, ...options };

  // 创建消息处理函数的引用
  const messageHandlerRef = useRef<(event: MessageEvent) => void>(() => {});

  // 使用文件传输管理
  const {
    transfers,
    updateTransfers,
    downloadFile,
    pauseTransfer,
    resumeTransfer,
    cancelTransfer,
    clearTransfers,
    removeTransfer,
  } = useFileTransfer();

  // 使用数据通道管理
  const {
    dataChannelRef,
    dataChannelsRef,
    currentTransferRef,
    setupDataChannel,
    transferFile,
    setupPeerConnectionForDataChannel,
  } = useDataChannel({
    onTransferUpdate: updateTransfers,
    chunkSize: config.chunkSize,
  });

  // 使用对等连接管理
  const {
    peerConnectionRef,
    currentTargetIdRef,
    initializePeerConnection,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
  } = usePeerConnection({
    iceServers: config.iceServers,
    serverUrl: config.serverUrl,
    autoFetchICEServers: config.autoFetchICEServers,
  });

  // 使用连接管理 - 使用引用中的处理函数
  const {
    connectionState,
    clients,
    wsRef,
    clientIdRef,
    clientNameRef,
    connect,
    disconnect: baseDisconnect,
  } = useConnection({
    serverUrl: config.serverUrl,
    onMessage: (event: MessageEvent) => messageHandlerRef.current(event),
  });

  // 使用视频通话管理
  const videoCallHook = useVideoCall({
    wsRef,
    clientIdRef,
    clientNameRef,
    peerConnectionRef,
    options: {
      onCallInvite: (invite) =>
        console.log('Incoming call from:', invite.fromName),
      onCallAccept: (accept) => console.log('Call accepted by:', accept.fromId),
      onCallReject: (reject) => console.log('Call rejected:', reject.reason),
      onCallEnd: (end) => console.log('Call ended by:', end.fromId),
    },
  });

  // WebSocket消息处理回调
  const handleWebSocketMessage = useCallback(
    async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as SignalingMessage;

        switch (data.type) {
          case 'offer': {
            const msg = data as OfferMessage;
            console.log(`[Client] Received offer from ${msg.fromId}`);
            await handleOffer(msg, clientIdRef.current, wsRef);
            break;
          }

          case 'answer': {
            const msg = data as AnswerMessage;
            console.log(`[Client] Received answer from ${msg.fromId}`);
            await handleAnswer(msg);
            break;
          }

          case 'ice-candidate': {
            const msg = data as IceCandidateMessage;
            console.log(`[Client] Received ICE candidate from ${msg.fromId}`);
            await handleIceCandidate(msg);
            break;
          }

          case 'call-invite': {
            const msg = data as VideoCallInviteMessage;
            console.log(
              `[Client] Received call invite from ${msg.fromId} (${msg.fromName})`,
            );

            // 首先更新video call状态
            videoCallHook.handleIncomingCall(msg);

            // 然后通过options回调通知UI组件
            if (options.onCallInvite) {
              options.onCallInvite(msg);
            } else {
              console.warn('No onCallInvite handler registered');
            }
            break;
          }

          case 'call-accept': {
            const msg = data as VideoCallAcceptMessage;
            console.log(`[Client] Call accepted by ${msg.fromId}`);

            // 首先更新video call状态
            videoCallHook.handleCallAccepted();

            // 然后通过options回调处理
            if (options.onCallAccept) {
              options.onCallAccept(msg);
            } else {
              console.warn('No onCallAccept handler registered');
            }
            break;
          }

          case 'call-reject': {
            const msg = data as VideoCallRejectMessage;
            console.log(
              `[Client] Call rejected by ${msg.fromId}, reason: ${msg.reason}`,
            );

            // 清理通话状态
            videoCallHook.endCall();
            toast.info(
              `${msg.fromId} 拒绝了通话${msg.reason ? `: ${msg.reason}` : ''}`,
            );

            options.onCallReject?.(msg);
            break;
          }

          case 'call-end': {
            const msg = data as VideoCallEndMessage;
            console.log(`[Client] Call ended by ${msg.fromId}`);

            // 清理通话状态
            videoCallHook.endCall();
            toast.info('对方已结束通话');

            options.onCallEnd?.(msg);
            break;
          }

          case 'call-cancel': {
            const msg = data as VideoCallCancelMessage;
            console.log(`[Client] Call cancelled by ${msg.fromId}`);

            // 清理通话状态
            videoCallHook.endCall();
            toast.info('对方已取消通话');
            break;
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message in useWebRTC:', error);
      }
    },
    [
      handleOffer,
      handleAnswer,
      handleIceCandidate,
      clientIdRef,
      wsRef,
      videoCallHook,
      options,
    ],
  );

  // 更新消息处理函数引用
  useEffect(() => {
    messageHandlerRef.current = handleWebSocketMessage;
  }, [handleWebSocketMessage]);

  // 设置PeerConnection初始化时的数据通道处理
  useEffect(() => {
    if (peerConnectionRef.current && clientIdRef.current) {
      setupPeerConnectionForDataChannel(
        peerConnectionRef.current,
        clientIdRef.current,
        wsRef,
        currentTargetIdRef,
      );
    }
  }, [
    peerConnectionRef,
    clientIdRef,
    wsRef,
    currentTargetIdRef,
    setupPeerConnectionForDataChannel,
  ]);

  // 扩展disconnect函数以清理所有资源
  const disconnect = useCallback(() => {
    // 清理数据通道
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    // 清理多个数据通道
    dataChannelsRef.current.forEach((channel) => {
      if (channel.readyState === 'open') {
        channel.close();
      }
    });
    dataChannelsRef.current = [];

    // 清理对等连接
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // 清理传输状态
    currentTransferRef.current = null;

    // 调用基础断开连接
    baseDisconnect();
  }, [
    baseDisconnect,
    dataChannelRef,
    dataChannelsRef,
    peerConnectionRef,
    currentTransferRef,
  ]);

  // 发送文件
  const sendFile = useCallback(
    async (targetId: string, file: File): Promise<void> => {
      console.log(`[Client] Sending file "${file.name}" to ${targetId}`);

      if (!peerConnectionRef.current) {
        throw new Error('PeerConnection not initialized');
      }

      currentTargetIdRef.current = targetId;

      // 创建数据通道
      console.log('[Client] Creating data channel...');
      dataChannelRef.current = peerConnectionRef.current.createDataChannel(
        'fileTransfer',
        {
          ordered: true,
        },
      );

      setupDataChannel(dataChannelRef.current);

      // 创建并发送offer
      console.log('[Client] Creating offer...');
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);

      const message: OfferMessage = {
        type: 'offer',
        offer: offer,
        fromId: clientIdRef.current,
        targetId: targetId,
      };

      console.log(`[Client] Sending offer to ${targetId}`, message);
      wsRef.current?.send(JSON.stringify(message));

      // 等待连接建立并传输文件
      return new Promise((resolve, reject) => {
        if (!dataChannelRef.current) {
          reject(new Error('Data channel not created'));
          return;
        }

        const channel = dataChannelRef.current;

        // 设置超时机制
        const timeout = setTimeout(() => {
          console.error('[Client] Data channel connection timeout');
          reject(new Error('Data channel connection timeout'));
        }, 30000); // 30秒超时

        channel.onopen = async () => {
          clearTimeout(timeout);
          console.log('[Client] Data channel opened, ready to transfer file');

          // 确保通道真正准备好
          if (channel.readyState === 'open') {
            try {
              // 稍微延迟一下确保连接稳定
              await new Promise((resolve) => setTimeout(resolve, 100));
              await transferFile(file);
              console.log('[Client] File transfer completed successfully');
              resolve();
            } catch (error) {
              console.error('[Client] File transfer error:', error);
              reject(error);
            }
          } else {
            reject(
              new Error(
                `Data channel state is ${channel.readyState}, expected 'open'`,
              ),
            );
          }
        };

        channel.onerror = (error) => {
          clearTimeout(timeout);
          console.error('[Client] Data channel error:', error);
          reject(error);
        };

        channel.onclose = () => {
          clearTimeout(timeout);
          console.error('[Client] Data channel closed unexpectedly');
          reject(new Error('Data channel closed unexpectedly'));
        };

        // 如果通道已经打开，直接传输
        if (channel.readyState === 'open') {
          clearTimeout(timeout);
          console.log(
            '[Client] Data channel already open, starting transfer immediately',
          );
          transferFile(file).then(resolve).catch(reject);
        }
      });
    },
    [
      setupDataChannel,
      transferFile,
      peerConnectionRef,
      currentTargetIdRef,
      clientIdRef,
      wsRef,
      dataChannelRef,
    ],
  );

  // 扩展connect函数以初始化PeerConnection
  const enhancedConnect = useCallback(
    async (name: string, roomId?: string): Promise<void> => {
      await connect(name, roomId);
      await initializePeerConnection();
    },
    [connect, initializePeerConnection],
  );

  // 清理副作用
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    clients,
    transfers,
    connect: enhancedConnect,
    disconnect,
    sendFile,
    downloadFile,
    pauseTransfer,
    resumeTransfer,
    cancelTransfer,
    clearTransfers,
    removeTransfer,
    videoCall: videoCallHook,
  };
};
