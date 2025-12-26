import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trash2, HardDrive, Database } from 'lucide-react';
import { FileStorageService } from '@/services/fileStorageService';
import { formatFileSize } from '@/lib/formatters';
import { toast } from '@/lib/toast';
import { StorageUsageItem } from '@/types/storage';

interface StorageManagerProps {
  onStorageChange?: () => void;
}

export function StorageManager({ onStorageChange }: StorageManagerProps) {
  const [storageUsage, setStorageUsage] = useState<StorageUsageItem[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedQuota, setEstimatedQuota] = useState<number | null>(null);

  const fileStorage = FileStorageService.getInstance();

  // 获取存储配额信息
  const getStorageQuota = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        setEstimatedQuota(estimate.quota || null);
      } catch (error) {
        console.error('Error getting storage estimate:', error);
      }
    }
  };

  // 加载存储使用情况
  const loadStorageUsage = async () => {
    setIsLoading(true);
    try {
      const usage = await fileStorage.getStorageUsage();
      setStorageUsage(usage);

      const total = usage.reduce((sum, item) => sum + item.size, 0);
      setTotalSize(total);

      onStorageChange?.();
    } catch (error) {
      console.error('Error loading storage usage:', error);
      toast.error('加载存储信息失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 删除单个传输的存储数据
  const deleteTransferStorage = async (transferId: string) => {
    try {
      await fileStorage.deleteTransfer(transferId);
      await loadStorageUsage();
      toast.success('存储数据已删除');
    } catch (error) {
      console.error('Error deleting transfer storage:', error);
      toast.error('删除存储数据失败');
    }
  };

  // 清理所有存储数据
  const clearAllStorage = async () => {
    if (!confirm('确定要清理所有存储数据吗？此操作不可恢复。')) {
      return;
    }

    try {
      await fileStorage.clearAll();
      await loadStorageUsage();
      toast.success('所有存储数据已清理');
    } catch (error) {
      console.error('Error clearing all storage:', error);
      toast.error('清理存储数据失败');
    }
  };

  useEffect(() => {
    loadStorageUsage();
    getStorageQuota();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            存储管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const usagePercentage = estimatedQuota
    ? (totalSize / estimatedQuota) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          存储管理
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 总体存储情况 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">存储使用量</span>
            <Badge variant="outline">
              {formatFileSize(totalSize)}
              {estimatedQuota && ` / ${formatFileSize(estimatedQuota)}`}
            </Badge>
          </div>
          {estimatedQuota && (
            <Progress value={Math.min(usagePercentage, 100)} className="h-2" />
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{storageUsage.length} 个传输记录</span>
            {estimatedQuota && (
              <span>{usagePercentage.toFixed(1)}% 已使用</span>
            )}
          </div>
        </div>

        {/* 存储详情 */}
        {storageUsage.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">存储详情</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {storageUsage.map((item) => (
                <div
                  key={item.transferId}
                  className="flex items-center justify-between p-2 rounded bg-muted/50"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-mono">
                      ID: {item.transferId.slice(-8)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.chunks} 个块 · {formatFileSize(item.size)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTransferStorage(item.transferId)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadStorageUsage}
            className="flex-1"
          >
            <HardDrive className="w-4 h-4 mr-1" />
            刷新
          </Button>
          {storageUsage.length > 0 && (
            <Button
              size="sm"
              variant="destructive"
              onClick={clearAllStorage}
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              清理全部
            </Button>
          )}
        </div>

        {/* 优化提示 */}
        {totalSize > 50 * 1024 * 1024 && ( // 50MB
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 mt-0.5 rounded-full bg-amber-400 flex-shrink-0" />
              <div className="text-xs text-amber-800">
                <p className="font-medium mb-1">存储优化建议</p>
                <p>
                  存储使用量较大，建议定期清理不需要的传输数据以释放空间。
                  文件传输完成后，数据会自动保留以支持重新下载。
                </p>
              </div>
            </div>
          </div>
        )}

        {storageUsage.length === 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            暂无存储数据
          </div>
        )}
      </CardContent>
    </Card>
  );
}
