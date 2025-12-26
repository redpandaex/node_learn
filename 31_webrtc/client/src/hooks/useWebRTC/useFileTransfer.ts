import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from '../../lib/toast';
import { FileStorageService } from '../../services/fileStorageService';
import { FileTransfer } from '../../types/webRTC';

export interface UseFileTransferReturn {
  transfers: FileTransfer[];
  pausedTransfersRef: React.RefObject<
    Map<string, { resolve: () => void; reject: (error: Error) => void }>
  >;
  addTransfer: (transfer: FileTransfer) => void;
  updateTransfer: (transferId: string, updates: Partial<FileTransfer>) => void;
  updateTransfers: (updatedTransfers: FileTransfer[]) => void;
  downloadFile: (transferId: string) => Promise<void>;
  pauseTransfer: (transferId: string) => void;
  resumeTransfer: (transferId: string) => void;
  cancelTransfer: (transferId: string) => void;
  clearTransfers: () => void;
  removeTransfer: (transferId: string) => Promise<void>;
}

export const useFileTransfer = (): UseFileTransferReturn => {
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const pausedTransfersRef = useRef<
    Map<string, { resolve: () => void; reject: (error: Error) => void }>
  >(new Map());

  // 文件存储服务
  const fileStorage = useRef<FileStorageService>(
    FileStorageService.getInstance(),
  );

  // 初始化文件存储服务
  useEffect(() => {
    fileStorage.current.initialize().catch(console.error);
  }, []);

  // 添加传输
  const addTransfer = useCallback((transfer: FileTransfer) => {
    setTransfers((prev) => [...prev, transfer]);
  }, []);

  // 更新单个传输
  const updateTransfer = useCallback(
    (transferId: string, updates: Partial<FileTransfer>) => {
      setTransfers((prev) =>
        prev.map((t) => (t.id === transferId ? { ...t, ...updates } : t)),
      );
    },
    [],
  );

  // 批量更新传输（用于数据通道回调）
  const updateTransfers = useCallback((updatedTransfers: FileTransfer[]) => {
    setTransfers((prev) => {
      const newTransfers = [...prev];

      updatedTransfers.forEach((updatedTransfer) => {
        const index = newTransfers.findIndex(
          (t) => t.id === updatedTransfer.id,
        );
        if (index >= 0) {
          newTransfers[index] = updatedTransfer;
        } else {
          newTransfers.push(updatedTransfer);
        }
      });

      return newTransfers;
    });
  }, []);

  // 下载文件 - 使用 IndexedDB（带进度面板）
  const downloadFile = useCallback(
    async (transferId: string) => {
      const transfer = transfers.find((t) => t.id === transferId);
      if (
        !transfer ||
        transfer.direction !== 'receive' ||
        transfer.status !== 'completed'
      ) {
        return;
      }

      try {
        // 设置组装状态
        updateTransfer(transferId, {
          status: 'assembling',
          assemblingProgress: 0,
        });

        // 从 IndexedDB 组装文件（带进度回调）
        const blob = await fileStorage.current.assembleFileWithProgress(
          transferId,
          transfer.totalChunks,
          transfer.fileType,
          (progress: number) => {
            // 更新组装进度
            updateTransfer(transferId, { assemblingProgress: progress });
          },
        );

        // 组装完成，恢复完成状态
        updateTransfer(transferId, {
          status: 'completed',
          assemblingProgress: 100,
        });

        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = transfer.fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // 延迟释放 URL 对象，确保下载开始
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);

        toast.success(`文件下载开始: ${transfer.fileName}`);
      } catch (error) {
        console.error('Error downloading file:', error);

        // 出错时恢复完成状态
        updateTransfer(transferId, {
          status: 'completed',
          assemblingProgress: undefined,
        });

        toast.error(
          `文件下载失败: ${error instanceof Error ? error.message : '未知错误'}`,
        );
      }
    },
    [transfers, updateTransfer],
  );

  // 暂停传输
  const pauseTransfer = useCallback(
    (transferId: string) => {
      updateTransfer(transferId, {
        status: 'paused',
        isPaused: true,
        pausedAt: Date.now(),
      });
      toast.info('传输已暂停');
    },
    [updateTransfer],
  );

  // 恢复传输
  const resumeTransfer = useCallback(
    (transferId: string) => {
      updateTransfer(transferId, {
        status: 'transferring',
        isPaused: false,
        resumedAt: Date.now(),
      });

      // 通知传输恢复
      const pausedPromise = pausedTransfersRef.current.get(transferId);
      if (pausedPromise) {
        pausedPromise.resolve();
        pausedTransfersRef.current.delete(transferId);
      }

      toast.info('传输已恢复');
    },
    [updateTransfer],
  );

  // 取消传输
  const cancelTransfer = useCallback((transferId: string) => {
    setTransfers((prev) => prev.filter((t) => t.id !== transferId));

    // 如果有暂停的Promise，拒绝它
    const pausedPromise = pausedTransfersRef.current.get(transferId);
    if (pausedPromise) {
      pausedPromise.reject(new Error('Transfer cancelled'));
      pausedTransfersRef.current.delete(transferId);
    }

    toast.info('传输已取消');
  }, []);

  // 清除所有传输记录
  const clearTransfers = useCallback(() => {
    setTransfers([]);
  }, []);

  // 移除单个传输记录
  const removeTransfer = useCallback(async (transferId: string) => {
    // 从 IndexedDB 删除相关数据
    try {
      await fileStorage.current.deleteTransfer(transferId);
    } catch (error) {
      console.error('Error deleting transfer from storage:', error);
    }

    setTransfers((prev) => {
      return prev.filter((t) => t.id !== transferId);
    });
  }, []);

  return {
    transfers,
    pausedTransfersRef,
    addTransfer,
    updateTransfer,
    updateTransfers,
    downloadFile,
    pauseTransfer,
    resumeTransfer,
    cancelTransfer,
    clearTransfers,
    removeTransfer,
  };
};
