import { useState, useEffect, useCallback, useMemo } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';
import { toast } from '@/lib/toast';
import { useWebRTC } from './hooks/useWebRTC';
import { useMobile, mobileUtils } from './hooks/useMobile';
import { ExtendedClient } from './types/webRTC';
import { MobileLayout } from './components/mobile/MobileLayout';
import { DesktopLayout } from './components/desktop/DesktopLayout';
import { VideoCallManager } from './components/shared/VideoCallManager';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const mobileInfo = useMobile();
  const { isMobile, isIOS } = mobileInfo;

  // 移动端优化初始化
  useEffect(() => {
    if (isMobile) {
      // 应用移动端性能优化
      mobileUtils.optimizePerformance();

      // iOS Safari特殊处理
      if (isIOS) {
        mobileUtils.hideAddressBar();
      }

      // 防止页面缩放
      document.addEventListener('gesturestart', (e) => e.preventDefault());
      document.addEventListener('gesturechange', (e) => e.preventDefault());
      document.addEventListener('gestureend', (e) => e.preventDefault());
    }
  }, [isMobile, isIOS]);

  const {
    connectionState,
    clients,
    transfers,
    connect,
    disconnect,
    sendFile,
    downloadFile,
    pauseTransfer,
    resumeTransfer,
    cancelTransfer,
    clearTransfers,
    removeTransfer,
    videoCall,
  } = useWebRTC({
    serverUrl: process.env.WS_HOST,
  });

  // 处理连接
  const handleConnect = useCallback(
    async (clientName: string) => {
      try {
        // 从URL参数获取房间ID
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('room');

        await connect(clientName, roomId || undefined);
        toast.success(`连接成功${roomId ? ` - 房间: ${roomId}` : ''}`);
      } catch (error) {
        toast.error('连接失败');
        throw error;
      }
    },
    [connect],
  );

  // 处理断开连接
  const handleDisconnect = useCallback(() => {
    disconnect();
    toast.info('已断开连接');
  }, [disconnect]);

  // 处理文件选择
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);

  // 处理文件清除
  const handleFileClear = useCallback(() => {
    setSelectedFile(null);
  }, []);

  // 处理发送文件
  const handleSendFile = useCallback(
    async (targetId: string) => {
      if (!selectedFile) {
        toast.error('请先选择文件');
        return;
      }

      try {
        await sendFile(targetId, selectedFile);
        toast.success('文件发送完成');
        // 发送完成后自动清除文件选择，释放引用
        setSelectedFile(null);
      } catch (error) {
        toast.error('文件发送失败');
        console.error(error);
      }
    },
    [selectedFile, sendFile],
  );

  // 生成显示用的客户端列表，包含本设备
  const displayClients = useMemo((): ExtendedClient[] => {
    if (!connectionState.isConnected || !connectionState.clientId) {
      return [];
    }

    // 过滤掉服务器返回的本地设备，避免重复显示
    const otherClients: ExtendedClient[] = clients.filter(
      (client) => client.id !== connectionState.clientId,
    );

    // 添加本设备到列表顶部
    const allClients: ExtendedClient[] = [
      {
        id: connectionState.clientId,
        name: connectionState.clientName,
        ip: connectionState.clientIP,
        isCurrentDevice: true,
      },
      ...otherClients,
    ];

    return allClients;
  }, [
    clients,
    connectionState.isConnected,
    connectionState.clientId,
    connectionState.clientName,
    connectionState.clientIP,
  ]);

  // 视频通话处理
  const handleVideoCall = useCallback(
    async (targetId: string, targetName: string) => {
      try {
        await videoCall.initiateCall(targetId, targetName);
        toast.success(`正在呼叫 ${targetName}...`);
      } catch (error) {
        toast.error('发起通话失败: ' + (error as Error).message);
        throw error;
      }
    },
    [videoCall],
  );

  const commonProps = {
    connectionState,
    displayClients,
    selectedFile,
    transfers,
    onFileSelect: handleFileSelect,
    onFileClear: handleFileClear,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onSendFile: handleSendFile,
    onVideoCall: handleVideoCall,
    onDownloadFile: downloadFile,
    onRemoveTransfer: removeTransfer,
    onPauseTransfer: pauseTransfer,
    onResumeTransfer: resumeTransfer,
    onCancelTransfer: cancelTransfer,
    onClearTransfers: clearTransfers,
    isInCall: videoCall.callState.isInCall || videoCall.callState.isIncoming,
  };

  return (
    <TooltipProvider>
      {isMobile ? (
        <MobileLayout {...commonProps} />
      ) : (
        <DesktopLayout {...commonProps} />
      )}

      {/* 视频通话管理器 - 全局层级 */}
      <VideoCallManager videoCall={videoCall} />

      <Toaster />
    </TooltipProvider>
  );
}

export default App;
