import { useRef, useCallback } from 'react';
import {
  OfferMessage,
  AnswerMessage,
  IceCandidateMessage,
} from '../../types/webRTC';

export interface UsePeerConnectionOptions {
  iceServers: RTCIceServer[];
  serverUrl: string;
  autoFetchICEServers?: boolean;
}

export interface UsePeerConnectionReturn {
  peerConnectionRef: React.RefObject<RTCPeerConnection | null>;
  currentTargetIdRef: React.RefObject<string>;
  initializePeerConnection: () => Promise<void>;
  handleOffer: (
    data: OfferMessage,
    clientId: string,
    wsRef: React.RefObject<WebSocket | null>,
  ) => Promise<void>;
  handleAnswer: (data: AnswerMessage) => Promise<void>;
  handleIceCandidate: (data: IceCandidateMessage) => Promise<void>;
}

export const usePeerConnection = (
  options: UsePeerConnectionOptions,
): UsePeerConnectionReturn => {
  // Refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const currentTargetIdRef = useRef<string>('');

  // 从服务器获取 ICE 服务器配置
  const fetchICEServers = useCallback(async (): Promise<RTCIceServer[]> => {
    if (!options.autoFetchICEServers) {
      return options.iceServers;
    }

    try {
      const serverBaseUrl = options.serverUrl
        .replace('ws://', 'http://')
        .replace('wss://', 'https://')
        .replace('/ws', '');
      const response = await fetch(`${serverBaseUrl}/api/webrtc-config`);

      if (!response.ok) {
        console.warn(
          'Failed to fetch ICE servers from server, using default config',
        );
        return options.iceServers;
      }

      const data = await response.json();
      console.log('Fetched ICE servers from server:', data.iceServers);

      return data.iceServers || options.iceServers;
    } catch (error) {
      console.warn('Error fetching ICE servers from server:', error);
      return options.iceServers;
    }
  }, [options.autoFetchICEServers, options.iceServers, options.serverUrl]);

  // 初始化PeerConnection
  const initializePeerConnection = useCallback(async () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // 获取最新的 ICE 服务器配置
    const iceServers = await fetchICEServers();

    peerConnectionRef.current = new RTCPeerConnection({
      iceServers: iceServers,
    });

    peerConnectionRef.current.onconnectionstatechange = () => {
      console.log(
        'Connection state:',
        peerConnectionRef.current?.connectionState,
      );
    };
  }, [fetchICEServers]);

  // 处理Offer
  const handleOffer = useCallback(
    async (
      data: OfferMessage,
      clientId: string,
      wsRef: React.RefObject<WebSocket | null>,
    ) => {
      if (!peerConnectionRef.current) return;

      if (!clientId) {
        console.error(
          '[Client] Cannot handle offer: clientId is not available',
        );
        return;
      }

      try {
        currentTargetIdRef.current = data.fromId; // 设置当前目标ID

        await peerConnectionRef.current.setRemoteDescription(data.offer);
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);

        const message: AnswerMessage = {
          type: 'answer',
          answer: answer,
          fromId: clientId,
          targetId: data.fromId,
        };

        console.log(`[Client] Sending answer to ${data.fromId}`, message);
        console.log(`[Client] My clientId: "${clientId}"`);
        wsRef.current?.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    },
    [],
  );

  // 处理Answer
  const handleAnswer = useCallback(async (data: AnswerMessage) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.setRemoteDescription(data.answer);
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }, []);

  // 处理ICE候选
  const handleIceCandidate = useCallback(async (data: IceCandidateMessage) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.addIceCandidate(data.candidate);
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }, []);

  return {
    peerConnectionRef,
    currentTargetIdRef,
    initializePeerConnection,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
  };
};
