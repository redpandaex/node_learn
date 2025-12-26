import React from 'react';
import {
  TaskStatus,
  taskStatusTextMap,
  taskStatusMap,
} from '../../util/uploadQueue';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Download, FileText, Hash } from 'lucide-react';

interface UploadProgressProps {
  filename: string;
  progress: number;
  status: TaskStatus;
  fileUrl?: string;
  hashProgress?: number;
  isCalculatingHash?: boolean;
  hashStatus?: string;
}

const UploadProgress: React.FC<UploadProgressProps> = ({
  filename,
  progress,
  status,
  fileUrl,
  hashProgress = 0,
  isCalculatingHash = false,
  hashStatus,
}) => {
  // 根据状态选择 Badge 样式
  const getStatusBadgeVariant = (
    status: TaskStatus,
    isCalculatingHash: boolean,
  ) => {
    if (isCalculatingHash) return 'secondary';
    switch (status) {
      case taskStatusMap.ERROR:
        return 'destructive';
      case taskStatusMap.PAUSED:
        return 'outline';
      case taskStatusMap.COMPLETED:
        return 'default';
      default:
        return 'secondary';
    }
  };

  const handleDownload = () => {
    if (fileUrl) {
      const downloadLink = document.createElement('a');
      const fullUrl = `${process.env.SERVER_HOST}/api${fileUrl}`;
      downloadLink.href = fullUrl;
      downloadLink.download = filename;
      downloadLink.rel = 'noopener noreferrer';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  // 确定当前显示的进度和状态
  const displayProgress = isCalculatingHash ? hashProgress : progress;
  const displayStatus = isCalculatingHash
    ? hashStatus || '计算文件hash中...'
    : taskStatusTextMap[status];

  // 获取进度条的颜色类
  const getProgressClass = () => {
    if (isCalculatingHash) return 'bg-purple-500';
    switch (status) {
      case taskStatusMap.ERROR:
        return 'bg-red-500';
      case taskStatusMap.PAUSED:
        return 'bg-orange-500';
      case taskStatusMap.COMPLETED:
        return 'bg-green-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* 文件名和状态行 */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <span className="font-medium text-sm truncate" title={filename}>
                {filename}
              </span>
              {isCalculatingHash && (
                <Hash className="h-4 w-4 text-purple-500 animate-spin" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(status, isCalculatingHash)}>
                {displayStatus}
              </Badge>
              {fileUrl && status === taskStatusMap.COMPLETED && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="h-8 px-3"
                >
                  <Download className="h-3 w-3 mr-1" />
                  查看
                </Button>
              )}
            </div>
          </div>

          {/* 进度条 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">
                {isCalculatingHash ? 'Hash 计算进度' : '上传进度'}
              </span>
              <span className="font-medium text-slate-700">
                {Math.round(displayProgress)}%
              </span>
            </div>
            <div className="relative">
              <Progress value={displayProgress} className="h-2" />
              <div
                className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-300 ${getProgressClass()}`}
                style={{ width: `${displayProgress}%` }}
              />
            </div>
          </div>

          {/* Hash 计算时的额外信息 */}
          {isCalculatingHash && (
            <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded-md border border-purple-200">
              <div className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                <span>正在计算文件指纹，确保文件完整性...</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadProgress;
