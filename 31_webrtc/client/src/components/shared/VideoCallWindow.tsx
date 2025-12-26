import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Minimize2,
  Maximize2,
  RotateCcw,
  Settings,
  Users,
} from 'lucide-react';
import { Button } from '../ui/button';
import { VideoCallState } from '../../types/webRTC';

interface VideoCallWindowProps {
  callState: VideoCallState;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onNormalize: () => void;
  onSwitchCamera: () => Promise<void>;
  onSetVideoQuality: (quality: 'low' | 'medium' | 'high') => Promise<void>;
}

export const VideoCallWindow: React.FC<VideoCallWindowProps> = ({
  callState,
  localVideoRef,
  remoteVideoRef,
  onToggleMute,
  onToggleVideo,
  onEndCall,
  onMinimize,
  onMaximize,
  onNormalize,
  onSwitchCamera,
  onSetVideoQuality,
}) => {
  const [callDuration, setCallDuration] = useState<number>(0);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 计算通话时长
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState.isInCall && callState.callStartTime) {
      interval = setInterval(() => {
        setCallDuration(Date.now() - callState.callStartTime!);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState.isInCall, callState.callStartTime]);

  // 格式化通话时长
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  // 自动隐藏控制栏
  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // 根据窗口状态计算样式
  const getWindowStyles = () => {
    switch (callState.windowState) {
      case 'minimized':
        return {
          position: 'fixed' as const,
          bottom: '20px',
          right: '20px',
          width: '320px',
          height: '240px',
          zIndex: 9999,
        };
      case 'maximized':
        return {
          position: 'fixed' as const,
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
        };
      default: // normal
        return {
          position: 'fixed' as const,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '600px',
          zIndex: 9999,
        };
    }
  };

  if (!callState.isInCall && !callState.isIncoming) {
    return null;
  }

  return (
    <div
      style={getWindowStyles()}
      className="bg-gray-900 rounded-lg shadow-2xl overflow-hidden border border-gray-700"
      onMouseMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
    >
      {/* 头部信息栏 */}
      <div
        className={`bg-gray-800 px-4 py-2 flex justify-between items-center transition-opacity duration-300 ${
          showControls || callState.windowState === 'minimized'
            ? 'opacity-100'
            : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-3">
          <Users className="h-4 w-4 text-green-500" />
          <div>
            <div className="text-white font-medium text-sm">
              {callState.targetName || '未知用户'}
            </div>
            {callState.isInCall && (
              <div className="text-gray-300 text-xs">
                {formatDuration(callDuration)}
              </div>
            )}
            {!callState.isInCall && callState.isIncoming && (
              <div className="text-yellow-400 text-xs">来电中...</div>
            )}
            {!callState.isInCall && !callState.isIncoming && (
              <div className="text-blue-400 text-xs">呼叫中...</div>
            )}
          </div>
        </div>

        {/* 窗口控制按钮 */}
        <div className="flex items-center gap-1">
          {callState.windowState !== 'minimized' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onMinimize}
              className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-gray-700"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          )}

          {callState.windowState === 'minimized' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onNormalize}
              className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-gray-700"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}

          {callState.windowState === 'normal' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onMaximize}
              className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-gray-700"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}

          {callState.windowState === 'maximized' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onNormalize}
              className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-gray-700"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 视频区域 */}
      <div
        className="relative flex-1 bg-black"
        style={{
          height:
            callState.windowState === 'minimized'
              ? '160px'
              : callState.windowState === 'maximized'
                ? 'calc(100vh - 140px)'
                : '480px',
        }}
      >
        {/* 远程视频 (主画面) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted={false}
          className="w-full h-full object-cover"
          style={{
            transform: 'scaleX(-1)', // 镜像显示
            background: 'linear-gradient(45deg, #1a1a1a, #2d2d2d)',
          }}
        />

        {/* 远程视频占位符 */}
        {!callState.remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-500 mx-auto mb-2" />
              <div className="text-gray-400 text-sm">等待对方视频...</div>
            </div>
          </div>
        )}

        {/* 本地视频 (画中画) */}
        <div
          className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600"
          style={{
            width: callState.windowState === 'minimized' ? '80px' : '128px',
            height: callState.windowState === 'minimized' ? '60px' : '96px',
          }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted={true}
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }} // 镜像显示
          />

          {/* 本地视频占位符 */}
          {!callState.localStream && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
              <Video className="h-6 w-6 text-gray-400" />
            </div>
          )}

          {/* 本地视频状态指示器 */}
          {!callState.isVideoEnabled && (
            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
              <VideoOff className="h-4 w-4 text-white" />
            </div>
          )}
        </div>

        {/* 音频指示器 */}
        {callState.isMuted && (
          <div className="absolute top-4 left-4 bg-red-600 bg-opacity-90 px-2 py-1 rounded-full">
            <MicOff className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* 控制栏 */}
      <div
        className={`bg-gray-800 px-6 py-4 transition-opacity duration-300 ${
          showControls || callState.windowState === 'minimized'
            ? 'opacity-100'
            : 'opacity-0'
        }`}
      >
        <div className="flex justify-center items-center gap-4">
          {/* 静音按钮 */}
          <Button
            size={callState.windowState === 'minimized' ? 'sm' : 'default'}
            variant={callState.isMuted ? 'destructive' : 'secondary'}
            onClick={onToggleMute}
            className="flex items-center gap-2"
          >
            {callState.isMuted ? (
              <MicOff
                className={
                  callState.windowState === 'minimized' ? 'h-3 w-3' : 'h-4 w-4'
                }
              />
            ) : (
              <Mic
                className={
                  callState.windowState === 'minimized' ? 'h-3 w-3' : 'h-4 w-4'
                }
              />
            )}
            {callState.windowState !== 'minimized' && (
              <span>{callState.isMuted ? '取消静音' : '静音'}</span>
            )}
          </Button>

          {/* 视频按钮 */}
          <Button
            size={callState.windowState === 'minimized' ? 'sm' : 'default'}
            variant={callState.isVideoEnabled ? 'secondary' : 'destructive'}
            onClick={onToggleVideo}
            className="flex items-center gap-2"
          >
            {callState.isVideoEnabled ? (
              <Video
                className={
                  callState.windowState === 'minimized' ? 'h-3 w-3' : 'h-4 w-4'
                }
              />
            ) : (
              <VideoOff
                className={
                  callState.windowState === 'minimized' ? 'h-3 w-3' : 'h-4 w-4'
                }
              />
            )}
            {callState.windowState !== 'minimized' && (
              <span>{callState.isVideoEnabled ? '关闭视频' : '开启视频'}</span>
            )}
          </Button>

          {/* 切换摄像头按钮 - 仅在移动端或窗口较大时显示 */}
          {callState.windowState !== 'minimized' && (
            <Button
              size="default"
              variant="secondary"
              onClick={onSwitchCamera}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>切换</span>
            </Button>
          )}

          {/* 设置按钮 */}
          {callState.windowState !== 'minimized' && (
            <Button
              size="default"
              variant="secondary"
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              <span>设置</span>
            </Button>
          )}

          {/* 挂断按钮 */}
          <Button
            size={callState.windowState === 'minimized' ? 'sm' : 'default'}
            variant="destructive"
            onClick={onEndCall}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
          >
            <PhoneOff
              className={
                callState.windowState === 'minimized' ? 'h-3 w-3' : 'h-4 w-4'
              }
            />
            {callState.windowState !== 'minimized' && <span>挂断</span>}
          </Button>
        </div>

        {/* 设置面板 */}
        {showSettings && callState.windowState !== 'minimized' && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <div className="text-white text-sm font-medium mb-2">视频质量</div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSetVideoQuality('low')}
                className="text-xs"
              >
                低质量
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSetVideoQuality('medium')}
                className="text-xs"
              >
                中等质量
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSetVideoQuality('high')}
                className="text-xs"
              >
                高质量
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCallWindow;
