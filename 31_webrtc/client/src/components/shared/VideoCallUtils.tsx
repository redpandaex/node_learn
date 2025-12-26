import React, { useCallback } from 'react';
import { UseVideoCallReturn } from '../../types/webRTC';
import { toast } from '../../lib/toast';

// 导出用于外部调用的接口
export interface VideoCallControls {
  startCall: (targetId: string, targetName: string) => Promise<void>;
  endCall: () => void;
  isInCall: boolean;
}

// 高阶组件：为其他组件提供视频通话功能
export const withVideoCall = <P extends object>(
  Component: React.ComponentType<P & VideoCallControls>,
) => {
  return React.forwardRef<HTMLElement, P & { videoCall: UseVideoCallReturn }>(
    (props, ref) => {
      const { videoCall, ...otherProps } = props;

      const startCall = useCallback(
        async (targetId: string, targetName: string) => {
          try {
            await videoCall.initiateCall(targetId, targetName);
            toast.success(`正在呼叫 ${targetName}...`);
          } catch (error) {
            console.error('Failed to start call:', error);
            toast.error('发起通话失败: ' + (error as Error).message);
          }
        },
        [videoCall],
      );

      const videoCallControls: VideoCallControls = {
        startCall,
        endCall: videoCall.endCall,
        isInCall:
          videoCall.callState.isInCall || videoCall.callState.isIncoming,
      };

      return (
        <Component ref={ref} {...(otherProps as P)} {...videoCallControls} />
      );
    },
  );
};
