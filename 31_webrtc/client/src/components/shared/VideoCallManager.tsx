import React, { useCallback, useEffect, useState } from 'react';
import { UseVideoCallReturn, VideoCallInviteMessage } from '../../types/webRTC';
import { IncomingCallDialog } from './IncomingCallDialog';
import { VideoCallWindow } from './VideoCallWindow';
import { toast } from '../../lib/toast';

interface VideoCallManagerProps {
  videoCall: UseVideoCallReturn;
  onIncomingCall?: (invite: VideoCallInviteMessage) => void;
  onCallStart?: (targetId: string, targetName: string) => Promise<void>;
}

export interface VideoCallManagerRef {
  handleIncomingCall: (invite: VideoCallInviteMessage) => void;
  startCall: (targetId: string, targetName: string) => Promise<void>;
}

export const VideoCallManager = React.forwardRef<
  VideoCallManagerRef,
  VideoCallManagerProps
>(({ videoCall, onIncomingCall }, ref) => {
  const [incomingCall, setIncomingCall] =
    useState<VideoCallInviteMessage | null>(null);
  const {
    callState,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    minimizeWindow,
    normalizeWindow,
    maximizeWindow,
    switchCamera,
    setVideoQuality,
    getVideoRefs,
  } = videoCall;

  // 获取video元素的refs
  const { localVideoRef, remoteVideoRef } = getVideoRefs();

  // 处理来电邀请 - 暴露给父组件使用
  const handleIncomingCall = useCallback(
    (invite: VideoCallInviteMessage) => {
      console.log('Incoming call from:', invite.fromName);
      setIncomingCall(invite);

      // 调用父组件的回调函数
      onIncomingCall?.(invite);

      // 显示系统通知
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`视频通话邀请`, {
          body: `${invite.fromName} 邀请您进行视频通话`,
          icon: '/favicon.ico',
          tag: 'video-call',
        });
      }

      // 播放铃声 (可选)
      // const audio = new Audio('/ringtone.mp3');
      // audio.loop = true;
      // audio.play().catch(console.error);
    },
    [onIncomingCall],
  );

  // 处理接受通话
  const handleAcceptCall = useCallback(async () => {
    try {
      await acceptCall();
      setIncomingCall(null);
      toast.success('通话已接通');
    } catch (error) {
      console.error('Failed to accept call:', error);
      toast.error('接受通话失败: ' + (error as Error).message);
      setIncomingCall(null);
    }
  }, [acceptCall]);

  // 处理拒绝通话
  const handleRejectCall = useCallback(() => {
    if (incomingCall) {
      rejectCall('用户拒绝');
      setIncomingCall(null);
      toast.info('已拒绝通话');
    }
  }, [incomingCall, rejectCall]);

  // 处理挂断通话
  const handleEndCall = useCallback(() => {
    endCall();
    toast.info('通话已结束');
  }, [endCall]);

  // 处理媒体控制
  const handleToggleMute = useCallback(() => {
    toggleMute();
    toast.info(callState.isMuted ? '已取消静音' : '已静音');
  }, [toggleMute, callState.isMuted]);

  const handleToggleVideo = useCallback(() => {
    toggleVideo();
    toast.info(callState.isVideoEnabled ? '已关闭视频' : '已开启视频');
  }, [toggleVideo, callState.isVideoEnabled]);

  const handleSwitchCamera = useCallback(async () => {
    try {
      await switchCamera();
      toast.success('摄像头已切换');
    } catch (error) {
      console.error('Failed to switch camera:', error);
      toast.error('切换摄像头失败');
    }
  }, [switchCamera]);

  const handleSetVideoQuality = useCallback(
    async (quality: 'low' | 'medium' | 'high') => {
      try {
        await setVideoQuality(quality);
        const qualityText = {
          low: '低质量',
          medium: '中等质量',
          high: '高质量',
        }[quality];
        toast.success(`视频质量已设置为${qualityText}`);
      } catch (error) {
        console.error('Failed to set video quality:', error);
        toast.error('设置视频质量失败');
      }
    },
    [setVideoQuality],
  );

  // 监听WebSocket消息处理视频通话相关消息
  // 注意：这里我们需要在useWebRTC中集成信令处理，现在先用这种方式演示
  useEffect(() => {
    // 这里应该通过WebSocket监听视频通话消息
    // 由于架构限制，我们现在在useVideoCall中处理
    // 这个useEffect主要用于请求通知权限等初始化工作

    // 请求通知权限
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      });
    }
  }, []);

  // 处理键盘快捷键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 只在通话中处理快捷键
      if (!callState.isInCall) return;

      switch (event.code) {
        case 'KeyM':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleToggleMute();
          }
          break;
        case 'KeyV':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleToggleVideo();
          }
          break;
        case 'Escape':
          if (callState.windowState === 'maximized') {
            normalizeWindow();
          }
          break;
        case 'F11':
          event.preventDefault();
          if (callState.windowState === 'maximized') {
            normalizeWindow();
          } else {
            maximizeWindow();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    callState.isInCall,
    callState.windowState,
    handleToggleMute,
    handleToggleVideo,
    normalizeWindow,
    maximizeWindow,
  ]);

  // 处理页面卸载时的清理
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (callState.isInCall || callState.isIncoming) {
        event.preventDefault();
        event.returnValue = '您正在进行视频通话，确定要离开吗？';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [callState.isInCall, callState.isIncoming]);

  // 暴露initiate call方法给外部组件使用
  const startCall = useCallback(
    async (targetId: string, targetName: string) => {
      try {
        await initiateCall(targetId, targetName);
        toast.success(`正在呼叫 ${targetName}...`);
      } catch (error) {
        console.error('Failed to start call:', error);
        toast.error('发起通话失败: ' + (error as Error).message);
      }
    },
    [initiateCall],
  );

  // 使用 useImperativeHandle 暴露函数给父组件
  React.useImperativeHandle(
    ref,
    () => ({
      handleIncomingCall,
      startCall,
    }),
    [handleIncomingCall, startCall],
  );

  return (
    <>
      {/* 来电弹窗 */}
      <IncomingCallDialog
        isOpen={!!incomingCall}
        callerName={incomingCall?.fromName || ''}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />

      {/* 视频通话窗口 */}
      <VideoCallWindow
        callState={callState}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        onToggleMute={handleToggleMute}
        onToggleVideo={handleToggleVideo}
        onEndCall={handleEndCall}
        onMinimize={minimizeWindow}
        onMaximize={maximizeWindow}
        onNormalize={normalizeWindow}
        onSwitchCamera={handleSwitchCamera}
        onSetVideoQuality={handleSetVideoQuality}
      />
    </>
  );
});

export default VideoCallManager;
