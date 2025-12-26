import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Download, Trash2, Pause, Play, X } from 'lucide-react';
import { FileTransfer } from '@/types/webRTC';
import {
  formatFileSize,
  formatTimestamp,
  formatSpeed,
  formatTime,
} from '@/lib/formatters';

interface TransferItemProps {
  transfer: FileTransfer;
  onDownload: (transferId: string) => void;
  onRemove: (transferId: string) => void;
  onPause?: (transferId: string) => void;
  onResume?: (transferId: string) => void;
  onCancel?: (transferId: string) => void;
  isMobile?: boolean;
}

export function TransferItem({
  transfer,
  onDownload,
  onRemove,
  onPause,
  onResume,
  onCancel,
  isMobile = false,
}: TransferItemProps) {
  const getStatusVariant = (
    status: FileTransfer['status'],
  ): 'default' | 'secondary' | 'destructive' => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'transferring':
      case 'assembling':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: FileTransfer['status']): string => {
    switch (status) {
      case 'completed':
        return '完成';
      case 'transferring':
        return '传输中';
      case 'assembling':
        return '组装中';
      case 'failed':
        return '失败';
      case 'pending':
        return '等待';
      default:
        return '未知';
    }
  };

  // 根据状态决定显示什么进度和信息
  const getProgressInfo = () => {
    if (transfer.status === 'assembling') {
      return {
        progress: transfer.assemblingProgress || 0,
        showSpeed: false,
        extraInfo: `正在组装文件块: ${transfer.assemblingProgress?.toFixed(1) || 0}%`,
      };
    } else {
      return {
        progress: transfer.progress,
        showSpeed: transfer.status === 'transferring',
        extraInfo: null,
      };
    }
  };

  const progressInfo = getProgressInfo();

  if (isMobile) {
    return (
      <div className="p-3 rounded-lg border bg-card">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium truncate flex-1">
              {transfer.fileName}
            </span>
            <div className="flex gap-1 ml-2">
              <Badge
                variant={
                  transfer.direction === 'send' ? 'default' : 'secondary'
                }
              >
                {transfer.direction === 'send' ? '发送' : '接收'}
              </Badge>
              <Badge variant={getStatusVariant(transfer.status)}>
                {getStatusText(transfer.status)}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(transfer.fileSize)} |{' '}
            {formatTimestamp(transfer.timestamp)}
          </p>
          {progressInfo.showSpeed && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>速度: {formatSpeed(transfer.speed)}</span>
                <span>平均: {formatSpeed(transfer.avgSpeed)}</span>
              </div>
              {transfer.estimatedTimeRemaining && (
                <div>
                  剩余时间: {formatTime(transfer.estimatedTimeRemaining)}
                </div>
              )}
            </div>
          )}
          {progressInfo.extraInfo && (
            <div className="text-xs text-muted-foreground">
              {progressInfo.extraInfo}
            </div>
          )}
          <Progress value={progressInfo.progress} className="h-2" />
          <div className="flex gap-2">
            {/* 传输中或暂停时显示暂停/恢复按钮 */}
            {(transfer.status === 'transferring' ||
              transfer.status === 'paused') && (
              <>
                {transfer.status === 'transferring' && onPause && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPause(transfer.id)}
                    className="flex-1"
                  >
                    <Pause className="w-4 h-4 mr-1" />
                    暂停
                  </Button>
                )}
                {transfer.status === 'paused' && onResume && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResume(transfer.id)}
                    className="flex-1"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    恢复
                  </Button>
                )}
                {onCancel && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onCancel(transfer.id)}
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-1" />
                    取消
                  </Button>
                )}
              </>
            )}

            {/* 完成状态下显示下载按钮 */}
            {transfer.direction === 'receive' &&
              transfer.status === 'completed' && (
                <Button
                  size="sm"
                  onClick={() => onDownload(transfer.id)}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-1" />
                  下载
                </Button>
              )}

            {/* 删除按钮 - 只在非传输状态下显示 */}
            {!(
              transfer.status === 'transferring' || transfer.status === 'paused'
            ) && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onRemove(transfer.id)}
                className={
                  transfer.direction === 'receive' &&
                  transfer.status === 'completed'
                    ? ''
                    : 'flex-1'
                }
              >
                <Trash2 className="w-4 h-4 mr-1" />
                删除
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">{transfer.fileName}</span>
            <Badge
              variant={transfer.direction === 'send' ? 'default' : 'secondary'}
            >
              {transfer.direction === 'send' ? '发送' : '接收'}
            </Badge>
            <Badge variant={getStatusVariant(transfer.status)}>
              {getStatusText(transfer.status)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            大小: {formatFileSize(transfer.fileSize)} | 时间:{' '}
            {formatTimestamp(transfer.timestamp)}
          </p>
          {progressInfo.showSpeed && (
            <div className="text-sm text-muted-foreground flex items-center gap-4">
              <span>速度: {formatSpeed(transfer.speed)}</span>
              <span>平均: {formatSpeed(transfer.avgSpeed)}</span>
              {transfer.estimatedTimeRemaining && (
                <span>剩余: {formatTime(transfer.estimatedTimeRemaining)}</span>
              )}
            </div>
          )}
          {progressInfo.extraInfo && (
            <div className="text-sm text-muted-foreground">
              {progressInfo.extraInfo}
            </div>
          )}
          <Progress value={progressInfo.progress} className="h-2" />
        </div>
        <div className="flex gap-2 ml-4">
          {/* 传输中或暂停时显示暂停/恢复按钮 */}
          {(transfer.status === 'transferring' ||
            transfer.status === 'paused') && (
            <>
              {transfer.status === 'transferring' && onPause && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onPause(transfer.id)}
                    >
                      <Pause className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>暂停传输</TooltipContent>
                </Tooltip>
              )}
              {transfer.status === 'paused' && onResume && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onResume(transfer.id)}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>恢复传输</TooltipContent>
                </Tooltip>
              )}
              {onCancel && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onCancel(transfer.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>取消传输</TooltipContent>
                </Tooltip>
              )}
            </>
          )}

          {/* 完成状态下显示下载按钮 */}
          {transfer.direction === 'receive' &&
            transfer.status === 'completed' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" onClick={() => onDownload(transfer.id)}>
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>下载文件</TooltipContent>
              </Tooltip>
            )}

          {/* 删除按钮 - 只在非传输状态下显示 */}
          {!(
            transfer.status === 'transferring' || transfer.status === 'paused'
          ) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onRemove(transfer.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>删除记录</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
