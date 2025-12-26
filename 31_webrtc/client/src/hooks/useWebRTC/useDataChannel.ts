import { useRef, useCallback } from 'react';
import {
  FileInfoMessage,
  FileChunkMessage,
  FileTransfer,
  IceCandidateMessage,
} from '../../types/webRTC';
import { FileStorageService } from '../../services/fileStorageService';

export interface UseDataChannelOptions {
  onTransferUpdate: (transfers: FileTransfer[]) => void;
  chunkSize: number;
}

export interface UseDataChannelReturn {
  dataChannelRef: React.RefObject<RTCDataChannel | null>;
  dataChannelsRef: React.RefObject<RTCDataChannel[]>;
  currentTransferRef: React.RefObject<Partial<FileTransfer> | null>;
  setupDataChannel: (channel: RTCDataChannel) => void;
  transferFile: (file: File) => Promise<void>;
  setupPeerConnectionForDataChannel: (
    peerConnection: RTCPeerConnection,
    clientId: string,
    wsRef: React.RefObject<WebSocket | null>,
    currentTargetIdRef: React.RefObject<string>,
  ) => void;
}

export const useDataChannel = (
  options: UseDataChannelOptions,
): UseDataChannelReturn => {
  // Refs
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const dataChannelsRef = useRef<RTCDataChannel[]>([]);
  const currentTransferRef = useRef<Partial<FileTransfer> | null>(null);

  // 文件存储服务
  const fileStorage = useRef<FileStorageService>(
    FileStorageService.getInstance(),
  );

  // 处理数据通道消息 - 优化版本（使用 IndexedDB）
  const handleDataChannelMessage = useCallback(
    async (data: string | ArrayBuffer) => {
      if (typeof data === 'string') {
        try {
          const message = JSON.parse(data) as
            | FileInfoMessage
            | FileChunkMessage;

          if (message.type === 'file-info') {
            const now = Date.now();
            const transfer: FileTransfer = {
              id: now.toString(),
              fileName: message.fileName,
              fileSize: message.fileSize,
              fileType: message.fileType,
              receivedChunks: 0,
              totalChunks: message.totalChunks,
              progress: 0,
              status: 'transferring',
              direction: 'receive',
              timestamp: now,
              startTime: now,
              lastUpdateTime: now,
              transferredBytes: 0,
              speed: 0,
              avgSpeed: 0,
              estimatedTimeRemaining: undefined,
              useOptimizedStorage: true,
            };

            currentTransferRef.current = transfer;
            options.onTransferUpdate([transfer]); // 这里需要改进，应该传递完整的transfers数组
          }
        } catch (error) {
          console.error('Error parsing data channel message:', error);
        }
      } else if (data instanceof ArrayBuffer && currentTransferRef.current) {
        // 处理合并的消息头和文件块数据
        const transfer = currentTransferRef.current as FileTransfer;

        try {
          // 查找换行符分隔头部和数据
          const dataView = new Uint8Array(data);
          let headerEnd = -1;
          for (let i = 0; i < Math.min(dataView.length, 1000); i++) {
            if (dataView[i] === 10) {
              // '\n' 的ASCII码
              headerEnd = i;
              break;
            }
          }

          if (headerEnd === -1) {
            console.error('无法找到消息头分隔符');
            return;
          }

          // 解析头部信息
          const headerBuffer = data.slice(0, headerEnd);
          const headerText = new TextDecoder().decode(headerBuffer);
          const chunkInfo = JSON.parse(headerText) as FileChunkMessage;

          // 提取实际文件数据
          const fileData = data.slice(headerEnd + 1);

          // 使用 IndexedDB 存储块数据，而不是内存
          await fileStorage.current.storeChunk(
            transfer.id,
            chunkInfo.chunkIndex,
            fileData,
          );
          transfer.receivedChunks++;

          // 计算传输速度
          const now = Date.now();
          const chunkSize = fileData.byteLength;
          transfer.transferredBytes += chunkSize;

          // 计算当前速度（每秒字节数）
          const timeDiff =
            (now - (transfer.lastUpdateTime || transfer.startTime || now)) /
            1000;
          if (timeDiff > 0) {
            transfer.speed = chunkSize / timeDiff;
          }

          // 计算平均速度
          const totalTimeDiff = (now - (transfer.startTime || now)) / 1000;
          if (totalTimeDiff > 0) {
            transfer.avgSpeed = transfer.transferredBytes / totalTimeDiff;
          }

          // 计算预估剩余时间
          const remainingBytes = transfer.fileSize - transfer.transferredBytes;
          if (transfer.avgSpeed > 0 && remainingBytes > 0) {
            transfer.estimatedTimeRemaining =
              remainingBytes / transfer.avgSpeed;
          }

          transfer.lastUpdateTime = now;

          // 批量更新进度，减少重渲染
          const progress =
            (transfer.receivedChunks / transfer.totalChunks) * 100;

          // 使用 requestAnimationFrame 优化UI更新
          requestAnimationFrame(() => {
            const updatedTransfer = {
              ...transfer,
              progress,
              transferredBytes: transfer.transferredBytes,
              speed: transfer.speed,
              avgSpeed: transfer.avgSpeed,
              estimatedTimeRemaining: transfer.estimatedTimeRemaining,
              lastUpdateTime: transfer.lastUpdateTime,
            };
            options.onTransferUpdate([updatedTransfer]);
          });

          // 检查是否接收完成
          if (transfer.receivedChunks === transfer.totalChunks) {
            transfer.status = 'completed';
            const completedTransfer = {
              ...transfer,
              status: 'completed' as const,
              progress: 100,
            };
            options.onTransferUpdate([completedTransfer]);
            currentTransferRef.current = null;
          }
        } catch (error) {
          console.error('Error processing file chunk:', error);
          // 如果存储失败，将传输标记为失败
          if (currentTransferRef.current) {
            const transfer = currentTransferRef.current as FileTransfer;
            const failedTransfer = { ...transfer, status: 'failed' as const };
            options.onTransferUpdate([failedTransfer]);
          }
        }
      }
    },
    [options],
  );

  // 设置数据通道
  const setupDataChannel = useCallback(
    (channel: RTCDataChannel) => {
      channel.binaryType = 'arraybuffer';

      channel.onmessage = (event) => {
        handleDataChannelMessage(event.data);
      };

      channel.onopen = () => {
        console.log('Data channel opened');
      };

      channel.onclose = () => {
        console.log('Data channel closed');
      };

      channel.onerror = (error) => {
        console.error('Data channel error:', error);
      };
    },
    [handleDataChannelMessage],
  );

  // 设置PeerConnection的数据通道和ICE处理
  const setupPeerConnectionForDataChannel = useCallback(
    (
      peerConnection: RTCPeerConnection,
      clientId: string,
      wsRef: React.RefObject<WebSocket | null>,
      currentTargetIdRef: React.RefObject<string>,
    ) => {
      peerConnection.onicecandidate = (event) => {
        if (
          event.candidate &&
          wsRef.current &&
          clientId &&
          currentTargetIdRef.current
        ) {
          const message: IceCandidateMessage = {
            type: 'ice-candidate',
            candidate: event.candidate,
            fromId: clientId,
            targetId: currentTargetIdRef.current,
          };
          console.log(
            `[Client] Sending ICE candidate to ${currentTargetIdRef.current}`,
            message,
          );
          wsRef.current.send(JSON.stringify(message));
        }
      };

      peerConnection.ondatachannel = (event) => {
        setupDataChannel(event.channel);
      };
    },
    [setupDataChannel],
  );

  // 传输文件 - 优化版本
  const transferFile = useCallback(
    async (file: File): Promise<void> => {
      if (!dataChannelRef.current) {
        throw new Error('Data channel not available');
      }

      const channel = dataChannelRef.current;

      // 检查数据通道状态
      if (channel.readyState !== 'open') {
        throw new Error(
          `Data channel is not open. Current state: ${channel.readyState}`,
        );
      }

      const totalChunks = Math.ceil(file.size / options.chunkSize);
      const transferId = Date.now().toString();

      // 添加发送记录
      const now = Date.now();
      const transfer: FileTransfer = {
        id: transferId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        receivedChunks: 0,
        totalChunks: totalChunks,
        progress: 0,
        status: 'transferring',
        direction: 'send',
        timestamp: now,
        startTime: now,
        lastUpdateTime: now,
        transferredBytes: 0,
        speed: 0,
        avgSpeed: 0,
        estimatedTimeRemaining: undefined,
        useOptimizedStorage: true,
      };

      options.onTransferUpdate([transfer]);

      // 发送文件元信息
      const fileInfo: FileInfoMessage = {
        type: 'file-info',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        totalChunks: totalChunks,
      };

      channel.send(JSON.stringify(fileInfo));

      // 优化的分块发送 - 使用并发控制和缓冲区管理
      const MAX_BUFFER_SIZE = 1 * 1024 * 1024; // 1MB 缓冲区限制，更保守的设置
      let currentChunk = 0;
      let lastProgressUpdate = 0;
      let transferredBytes = 0;
      let lastSpeedUpdate = now;

      const sendNextChunk = async (): Promise<void> => {
        return new Promise((resolve, reject) => {
          const processChunk = async () => {
            if (currentChunk >= totalChunks) {
              resolve();
              return;
            }

            // 检查缓冲区大小，避免内存溢出
            if (channel.bufferedAmount > MAX_BUFFER_SIZE) {
              // 等待缓冲区清空
              setTimeout(processChunk, 10);
              return;
            }

            try {
              const i = currentChunk++;
              const start = i * options.chunkSize;
              const end = Math.min(start + options.chunkSize, file.size);
              const chunk = file.slice(start, end);
              const buffer = await chunk.arrayBuffer();

              // 计算传输速度
              const currentTime = Date.now();
              const chunkSize = buffer.byteLength;
              transferredBytes += chunkSize;

              // 计算当前速度（每秒字节数）
              const timeDiff = (currentTime - lastSpeedUpdate) / 1000;
              let currentSpeed = 0;
              if (timeDiff > 0) {
                currentSpeed = chunkSize / timeDiff;
              }

              // 计算平均速度
              const totalTimeDiff = (currentTime - now) / 1000;
              let avgSpeed = 0;
              if (totalTimeDiff > 0) {
                avgSpeed = transferredBytes / totalTimeDiff;
              }

              // 计算预估剩余时间
              const remainingBytes = file.size - transferredBytes;
              let estimatedTimeRemaining: number | undefined;
              if (avgSpeed > 0 && remainingBytes > 0) {
                estimatedTimeRemaining = remainingBytes / avgSpeed;
              }

              // 合并消息头和数据，减少发送次数
              const chunkInfo = JSON.stringify({
                type: 'file-chunk',
                chunkIndex: i,
                totalChunks: totalChunks,
              });

              // 创建一个包含头信息和数据的单一消息
              const headerBuffer = new TextEncoder().encode(chunkInfo + '\n');
              const combinedBuffer = new ArrayBuffer(
                headerBuffer.byteLength + buffer.byteLength,
              );
              const combinedView = new Uint8Array(combinedBuffer);
              combinedView.set(new Uint8Array(headerBuffer), 0);
              combinedView.set(new Uint8Array(buffer), headerBuffer.byteLength);

              channel.send(combinedBuffer);

              // 优化的进度更新 - 减少频率和使用requestAnimationFrame
              if (
                currentTime - lastProgressUpdate > 100 ||
                i === totalChunks - 1
              ) {
                lastProgressUpdate = currentTime;
                lastSpeedUpdate = currentTime;
                requestAnimationFrame(() => {
                  const progress = ((i + 1) / totalChunks) * 100;
                  const updatedTransfer = {
                    ...transfer,
                    progress,
                    transferredBytes,
                    speed: currentSpeed,
                    avgSpeed,
                    estimatedTimeRemaining,
                    lastUpdateTime: currentTime,
                  };
                  options.onTransferUpdate([updatedTransfer]);
                });
              }

              // 继续处理下一个块
              if (currentChunk < totalChunks) {
                // 使用 setTimeout 避免调用栈溢出
                setTimeout(processChunk, 0);
              } else {
                resolve();
              }
            } catch (error) {
              reject(error);
            }
          };

          processChunk();
        });
      };

      await sendNextChunk();

      // 标记完成
      const completedTransfer = {
        ...transfer,
        status: 'completed' as const,
        progress: 100,
      };
      options.onTransferUpdate([completedTransfer]);
    },
    [options],
  );

  return {
    dataChannelRef,
    dataChannelsRef,
    currentTransferRef,
    setupDataChannel,
    transferFile,
    setupPeerConnectionForDataChannel,
  };
};
