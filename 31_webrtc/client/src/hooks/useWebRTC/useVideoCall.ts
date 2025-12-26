import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from '../../lib/toast';
import { getUserMediaWithDiagnostics } from '../../lib/mediaPermissions';
import {
  VideoCallState,
  VideoCallInviteMessage,
  VideoCallAcceptMessage,
  VideoCallRejectMessage,
  VideoCallEndMessage,
  UseVideoCallOptions,
  UseVideoCallReturn,
  MediaStreamOptions,
} from '../../types/webRTC';

const DEFAULT_VIDEO_CALL_STATE: VideoCallState = {
  isInCall: false,
  isIncoming: false,
  callId: null,
  targetId: null,
  targetName: null,
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isVideoEnabled: true,
  callStartTime: null,
  windowState: 'normal',
};

export interface UseVideoCallProps {
  wsRef: React.MutableRefObject<WebSocket | null>;
  clientIdRef: React.MutableRefObject<string>;
  clientNameRef: React.MutableRefObject<string>;
  peerConnectionRef: React.MutableRefObject<RTCPeerConnection | null>;
  options?: UseVideoCallOptions;
}

export const useVideoCall = ({
  wsRef,
  clientIdRef,
  clientNameRef,
  peerConnectionRef,
  options = {},
}: UseVideoCallProps): UseVideoCallReturn => {
  const [callState, setCallState] = useState<VideoCallState>(
    DEFAULT_VIDEO_CALL_STATE,
  );

  // 处理来电邀请（从WebSocket消息处理调用）
  const handleIncomingCall = useCallback((invite: VideoCallInviteMessage) => {
    console.log('Setting incoming call state:', invite);
    setCallState((prev) => ({
      ...prev,
      isIncoming: true,
      callId: invite.callId,
      targetId: invite.fromId,
      targetName: invite.fromName,
    }));
  }, []);

  // 处理通话被接受
  const handleCallAccepted = useCallback(() => {
    console.log('Call accepted, updating state');
    setCallState((prev) => ({
      ...prev,
      isInCall: true,
      isIncoming: false,
      callStartTime: Date.now(),
    }));
  }, []);

  // 媒体流相关refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const currentCameraFacingMode = useRef<'user' | 'environment'>('user');

  // 获取媒体质量配置
  const getMediaConstraints = useCallback(
    (quality: 'low' | 'medium' | 'high' = 'medium'): MediaStreamOptions => {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false as boolean | MediaTrackConstraints,
      };

      switch (quality) {
        case 'low':
          constraints.video = {
            width: { ideal: 320 },
            height: { ideal: 240 },
            frameRate: { ideal: 15 },
            facingMode: currentCameraFacingMode.current,
          };
          break;
        case 'medium':
          constraints.video = {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 },
            facingMode: currentCameraFacingMode.current,
          };
          break;
        case 'high':
          constraints.video = {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            facingMode: currentCameraFacingMode.current,
          };
          break;
      }

      return constraints;
    },
    [],
  );

  // 获取用户媒体流
  const getUserMedia = useCallback(
    async (constraints: MediaStreamOptions): Promise<MediaStream | void> => {
      const result = await getUserMediaWithDiagnostics(constraints);

      if (result.stream) {
        return result.stream;
      } else {
        console.error('Failed to get user media:', result.error);
        console.error('Diagnostics:', result.diagnostics);

        // 显示具体的错误信息
        toast.error(result.error || '无法获取摄像头和麦克风权限');

        // 在开发环境下显示更详细的诊断信息
        if (process.env.NODE_ENV === 'development' && result.diagnostics) {
          console.log('Media diagnostics:', result.diagnostics);
        }
      }
    },
    [],
  );

  // 停止媒体流
  const stopMediaStream = useCallback((stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    }
  }, []);

  // 生成通话ID
  const generateCallId = useCallback((): string => {
    return `call_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }, []);

  // 发送信令消息
  const sendSignalingMessage = useCallback(
    (
      message:
        | VideoCallInviteMessage
        | VideoCallAcceptMessage
        | VideoCallRejectMessage
        | VideoCallEndMessage,
    ) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify(message));
        } catch (error) {
          console.error('Failed to send signaling message:', error);
          toast.error('网络连接异常，消息发送失败');
        }
      } else {
        console.error(
          'WebSocket is not open, cannot send message, readyState:',
          wsRef.current?.readyState,
        );
        toast.error('网络连接断开，无法发送消息');
      }
    },
    [wsRef],
  );

  // 设置本地媒体流
  const setupLocalStream = useCallback(
    async (stream: MediaStream) => {
      setCallState((prev) => ({ ...prev, localStream: stream }));

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 添加媒体轨道到PeerConnection
      if (peerConnectionRef.current) {
        stream.getTracks().forEach((track) => {
          peerConnectionRef.current?.addTrack(track, stream);
        });
      }
    },
    [peerConnectionRef],
  );

  // 设置远程媒体流
  const setupRemoteStream = useCallback((stream: MediaStream) => {
    setCallState((prev) => ({ ...prev, remoteStream: stream }));

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    }
  }, []);

  // 初始化通话
  const initiateCall = useCallback(
    async (targetId: string, targetName: string): Promise<void> => {
      try {
        if (!targetId || !targetName) {
          toast.error('目标用户信息不完整，无法发起通话');
          return;
        }

        if (!clientIdRef.current || !clientNameRef.current) {
          toast.error('本地用户信息不完整，无法发起通话');
          return;
        }

        if (!peerConnectionRef.current) {
          toast.error('WebRTC连接未初始化，无法发起通话');
          return;
        }

        const callId = generateCallId();
        const constraints = getMediaConstraints('medium');
        const stream = await getUserMedia(constraints);
        if (!stream) {
          toast.error('拨打方无法获取摄像头和麦克风权限');
          return;
        }

        await setupLocalStream(stream);

        setCallState((prev) => ({
          ...prev,
          isInCall: false, // 还未真正建立通话
          isIncoming: false,
          callId,
          targetId,
          targetName,
          callStartTime: null,
        }));

        // 发送通话邀请
        const inviteMessage: VideoCallInviteMessage = {
          type: 'call-invite',
          fromId: clientIdRef.current,
          fromName: clientNameRef.current,
          targetId,
          callId,
        };

        sendSignalingMessage(inviteMessage);
        options.onCallInvite?.(inviteMessage);
      } catch (error) {
        console.error('Failed to initiate call:', error);
        toast.error('发起通话失败，请稍后重试');
        throw error;
      }
    },
    [
      generateCallId,
      getMediaConstraints,
      getUserMedia,
      setupLocalStream,
      clientIdRef,
      clientNameRef,
      peerConnectionRef,
      sendSignalingMessage,
      options,
    ],
  );

  // 接受通话
  const acceptCall = useCallback(async (): Promise<void> => {
    try {
      if (!callState.callId || !callState.targetId) {
        toast.error('没有待接听的来电');
        return;
      }

      if (!clientIdRef.current) {
        toast.error('本地用户信息缺失，无法接听通话');
        return;
      }

      if (!peerConnectionRef.current) {
        toast.error('WebRTC连接未初始化，无法接听通话');
        return;
      }

      const constraints = getMediaConstraints('medium');
      const stream = await getUserMedia(constraints);
      if (!stream) {
        toast.error('接收方无法获取摄像头和麦克风权限');
        return;
      }

      await setupLocalStream(stream);

      setCallState((prev) => ({
        ...prev,
        isInCall: true,
        isIncoming: false,
        callStartTime: Date.now(),
      }));

      // 发送接受消息
      const acceptMessage: VideoCallAcceptMessage = {
        type: 'call-accept',
        fromId: clientIdRef.current,
        targetId: callState.targetId,
        callId: callState.callId,
      };

      sendSignalingMessage(acceptMessage);
      options.onCallAccept?.(acceptMessage);
    } catch (error) {
      console.error('Failed to accept call:', error);
      toast.error('接听通话失败，请稍后重试');
      throw error;
    }
  }, [
    callState.callId,
    callState.targetId,
    getMediaConstraints,
    getUserMedia,
    setupLocalStream,
    clientIdRef,
    peerConnectionRef,
    sendSignalingMessage,
    options,
  ]);

  // 拒绝通话
  const rejectCall = useCallback(
    (reason?: string): void => {
      try {
        if (!callState.callId || !callState.targetId) {
          toast.error('没有待拒绝的通话');
          return;
        }

        if (!clientIdRef.current) {
          toast.error('本地用户信息缺失，无法拒绝通话');
          return;
        }

        const rejectMessage: VideoCallRejectMessage = {
          type: 'call-reject',
          fromId: clientIdRef.current,
          targetId: callState.targetId,
          callId: callState.callId,
          reason,
        };

        sendSignalingMessage(rejectMessage);
        options.onCallReject?.(rejectMessage);

        // 清理状态
        stopMediaStream(callState.localStream);
        setCallState(DEFAULT_VIDEO_CALL_STATE);
      } catch (error) {
        console.error('Failed to reject call:', error);
        toast.error('拒绝通话失败');
      }
    },
    [callState, clientIdRef, sendSignalingMessage, options, stopMediaStream],
  );

  // 结束通话
  const endCall = useCallback((): void => {
    try {
      if (!callState.callId) {
        console.log('No call to end');
        return;
      }

      // 发送结束通话消息
      if (callState.targetId && clientIdRef.current) {
        const endMessage: VideoCallEndMessage = {
          type: 'call-end',
          fromId: clientIdRef.current,
          targetId: callState.targetId,
          callId: callState.callId,
        };

        sendSignalingMessage(endMessage);
        options.onCallEnd?.(endMessage);
      }

      // 清理媒体流
      try {
        stopMediaStream(callState.localStream);
        stopMediaStream(callState.remoteStream);
      } catch (streamError) {
        console.error('Error stopping media streams:', streamError);
      }

      // 清理PeerConnection媒体轨道
      try {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.getSenders().forEach((sender) => {
            if (sender.track) {
              try {
                peerConnectionRef.current?.removeTrack(sender);
              } catch (trackError) {
                console.error('Error removing track:', trackError);
              }
            }
          });
        }
      } catch (peerError) {
        console.error('Error cleaning PeerConnection tracks:', peerError);
      }

      // 重置状态
      setCallState(DEFAULT_VIDEO_CALL_STATE);
    } catch (error) {
      console.error('Error ending call:', error);
      toast.error('结束通话时发生错误');
      // 即使出错也要重置状态，避免UI卡死
      setCallState(DEFAULT_VIDEO_CALL_STATE);
    }
  }, [
    callState,
    clientIdRef,
    sendSignalingMessage,
    options,
    stopMediaStream,
    peerConnectionRef,
  ]);

  // 切换静音
  const toggleMute = useCallback((): void => {
    try {
      if (!callState.localStream) {
        toast.error('当前没有可用的音频流');
        return;
      }

      const audioTracks = callState.localStream.getAudioTracks();
      if (audioTracks.length === 0) {
        toast.error('未找到可用的音频轨道');
        return;
      }

      audioTracks.forEach((track) => {
        track.enabled = callState.isMuted;
      });

      setCallState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      toast.error('切换静音状态失败');
    }
  }, [callState.localStream, callState.isMuted]);

  // 切换视频
  const toggleVideo = useCallback((): void => {
    try {
      if (!callState.localStream) {
        toast.error('当前没有可用的视频流');
        return;
      }

      const videoTracks = callState.localStream.getVideoTracks();
      if (videoTracks.length === 0) {
        toast.error('未找到可用的视频轨道');
        return;
      }

      videoTracks.forEach((track) => {
        track.enabled = callState.isVideoEnabled;
      });

      setCallState((prev) => ({
        ...prev,
        isVideoEnabled: !prev.isVideoEnabled,
      }));
    } catch (error) {
      console.error('Failed to toggle video:', error);
      toast.error('切换视频状态失败');
    }
  }, [callState.localStream, callState.isVideoEnabled]);

  // 窗口控制
  const minimizeWindow = useCallback((): void => {
    setCallState((prev) => ({ ...prev, windowState: 'minimized' }));
  }, []);

  const normalizeWindow = useCallback((): void => {
    setCallState((prev) => ({ ...prev, windowState: 'normal' }));
  }, []);

  const maximizeWindow = useCallback((): void => {
    setCallState((prev) => ({ ...prev, windowState: 'maximized' }));
  }, []);

  // 切换摄像头
  const switchCamera = useCallback(async (): Promise<void> => {
    if (!callState.localStream) {
      toast.error('当前没有可用的媒体流');
      return;
    }

    try {
      // 检查是否支持多个摄像头
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === 'videoinput',
      );

      if (videoDevices.length < 2) {
        toast.error('设备只有一个摄像头，无法切换');
        return;
      }

      // 切换摄像头方向
      currentCameraFacingMode.current =
        currentCameraFacingMode.current === 'user' ? 'environment' : 'user';

      // 停止当前视频轨道
      const videoTracks = callState.localStream.getVideoTracks();
      videoTracks.forEach((track) => track.stop());

      // 获取新的视频流
      const constraints = getMediaConstraints('medium');
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: constraints.video,
        audio: false, // 保持原有音频轨道
      });

      // 获取新的视频轨道
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) {
        throw new Error('无法获取新的视频轨道');
      }

      // 替换PeerConnection中的视频轨道
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        } else {
          toast.error('未找到视频发送器，无法替换摄像头');
          return;
        }
      }

      // 更新本地流
      const updatedStream = new MediaStream([
        ...callState.localStream.getAudioTracks(),
        newVideoTrack,
      ]);

      setCallState((prev) => ({ ...prev, localStream: updatedStream }));

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = updatedStream;
      }
    } catch (error) {
      console.error('Failed to switch camera:', error);
      if (error instanceof Error) {
        if (error.name === 'NotFoundError') {
          toast.error('未找到可用的摄像头设备');
        } else if (error.name === 'NotAllowedError') {
          toast.error('摄像头权限被拒绝');
        } else if (error.name === 'NotReadableError') {
          toast.error('摄像头被其他应用占用');
        } else {
          toast.error(`切换摄像头失败: ${error.message}`);
        }
      } else {
        toast.error('切换摄像头失败，请检查设备权限');
      }
    }
  }, [callState.localStream, getMediaConstraints, peerConnectionRef]);

  // 设置视频质量
  const setVideoQuality = useCallback(
    async (quality: 'low' | 'medium' | 'high'): Promise<void> => {
      if (!callState.localStream) {
        toast.error('当前没有可用的媒体流');
        return;
      }

      try {
        const constraints = getMediaConstraints(quality);
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: constraints.video,
          audio: false,
        });

        const newVideoTrack = newStream.getVideoTracks()[0];
        if (!newVideoTrack) {
          throw new Error('无法获取新的视频轨道');
        }

        // 替换视频轨道
        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current
            .getSenders()
            .find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            await sender.replaceTrack(newVideoTrack);
          } else {
            toast.error('未找到视频发送器，无法设置视频质量');
            return;
          }
        }

        // 停止旧的视频轨道
        callState.localStream.getVideoTracks().forEach((track) => track.stop());

        // 更新本地流
        const updatedStream = new MediaStream([
          ...callState.localStream.getAudioTracks(),
          newVideoTrack,
        ]);

        setCallState((prev) => ({ ...prev, localStream: updatedStream }));

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = updatedStream;
        }

        // 成功设置后的提示
        const qualityText =
          quality === 'low' ? '低' : quality === 'medium' ? '中' : '高';
        toast.success(`视频质量已设置为${qualityText}质量`);
      } catch (error) {
        console.error('Failed to set video quality:', error);
        if (error instanceof Error) {
          if (error.name === 'NotFoundError') {
            toast.error('未找到可用的摄像头设备');
          } else if (error.name === 'NotAllowedError') {
            toast.error('摄像头权限被拒绝');
          } else if (error.name === 'NotReadableError') {
            toast.error('摄像头被其他应用占用');
          } else if (error.name === 'OverconstrainedError') {
            toast.error('设备不支持所选的视频质量');
          } else {
            toast.error(`设置视频质量失败: ${error.message}`);
          }
        } else {
          toast.error('设置视频质量失败，请检查设备权限');
        }
      }
    },
    [callState.localStream, getMediaConstraints, peerConnectionRef],
  );

  // 获取video元素的refs
  const getVideoRefs = useCallback(() => {
    return {
      localVideoRef: localVideoRef as React.RefObject<HTMLVideoElement>,
      remoteVideoRef: remoteVideoRef as React.RefObject<HTMLVideoElement>,
    };
  }, []);

  // 处理远程流事件
  useEffect(() => {
    const peerConnection = peerConnectionRef.current;
    if (peerConnection) {
      const handleTrack = (event: RTCTrackEvent) => {
        console.log('Received remote track:', event.track.kind);
        if (event.streams && event.streams[0]) {
          setupRemoteStream(event.streams[0]);
        }
      };

      peerConnection.addEventListener('track', handleTrack);

      return () => {
        peerConnection.removeEventListener('track', handleTrack);
      };
    }
  }, [peerConnectionRef, setupRemoteStream]);

  return {
    // 通话状态
    callState,

    // 通话控制
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,

    // 媒体控制
    toggleMute,
    toggleVideo,

    // 窗口控制
    minimizeWindow,
    normalizeWindow,
    maximizeWindow,

    // 媒体流管理
    switchCamera,
    setVideoQuality,

    // Video refs
    getVideoRefs,

    // 内部处理函数
    handleIncomingCall,
    handleCallAccepted,
  };
};

export default useVideoCall;
