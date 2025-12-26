import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  globalUploadQueue,
  taskStatusMap,
  TaskStatus,
} from '../../util/uploadQueue';
import UploadProgress from '../UploadProgress';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FolderOpen,
  Trash2,
  Play,
  Pause,
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface FileInfo {
  file: File;
  progress: number;
  status: TaskStatus;
  fileUrl?: string;
  taskId?: string; // 新增：关联上传任务ID
  isPaused?: boolean; // 新增：是否暂停状态
  error?: unknown; //错误信息
  hashProgress?: number; // 新增：hash计算进度
  isCalculatingHash?: boolean; // 新增：是否正在计算hash
  hashStatus?: string; // 新增：hash计算状态描述
}

const FileUploader: React.FC = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkAllFilesUploaded = useCallback(() => {
    // 检查是否所有文件都已上传完成或失败
    const allDone = files.every(
      (file) =>
        file.progress === 100 ||
        file.status === taskStatusMap.ERROR ||
        file.status === taskStatusMap.COMPLETED,
    );

    if (allDone) {
      setUploading(false);
    }
  }, [files]);

  // 监听上传队列状态变化
  useEffect(() => {
    globalUploadQueue.setCallbacks({
      onProgress: (taskId, progress) => {
        // 更新对应文件的进度
        setFiles((prevFiles) => {
          return prevFiles.map((file) => {
            if (file.taskId === taskId) {
              return { ...file, progress };
            }
            return file;
          });
        });
      },
      onStatusChange: (taskId, status) => {
        // 更新对应文件的状态
        setFiles((prevFiles) => {
          return prevFiles.map((file) => {
            if (file.taskId === taskId) {
              let fileStatus: TaskStatus = taskStatusMap.PROCESSING;
              let isPaused = false;

              fileStatus = status;
              if (status === taskStatusMap.PAUSED) {
                isPaused = true;
              }

              return { ...file, status: fileStatus, isPaused };
            }
            return file;
          });
        });
      },
      onComplete: (taskId, url) => {
        // 更新对应文件为已完成状态
        setFiles((prevFiles) => {
          return prevFiles.map((file) => {
            if (file.taskId === taskId) {
              return {
                ...file,
                status: taskStatusMap.COMPLETED,
                progress: 100,
                fileUrl: url,
              };
            }
            return file;
          });
        });

        // 检查是否所有文件都上传完成
        checkAllFilesUploaded();
      },
      onError: (taskId, error) => {
        // 更新对应文件为失败状态
        setFiles((prevFiles) => {
          return prevFiles.map((file) => {
            if (file.taskId === taskId) {
              return {
                ...file,
                status: taskStatusMap.ERROR,
                error,
              };
            }
            return file;
          });
        });
      },
    });
  }, [checkAllFilesUploaded]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: FileInfo[] = Array.from(e.target.files).map((file) => ({
        file,
        progress: 0,
        status: taskStatusMap.PENDING,
      }));

      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 || uploading) {
      return;
    }

    setUploading(true);

    // 找出需要上传的文件（排除已完成的）
    const filesToUpload = files.filter(
      (file) => file.progress !== 100 && !file.isPaused,
    );
    console.log('[debug] files', files, filesToUpload);

    // 依次添加到上传队列
    for (const fileInfo of filesToUpload) {
      try {
        // 如果已经有任务ID，先检查状态
        if (fileInfo.taskId) {
          const status = globalUploadQueue.getTaskStatus(fileInfo.taskId);

          // 如果任务已暂停，恢复它
          if (status === taskStatusMap.PAUSED) {
            globalUploadQueue.resumeTask(fileInfo.taskId);
            continue;
          }

          // 如果任务已经完成或错误状态，跳过
          if (
            status === taskStatusMap.COMPLETED ||
            status === taskStatusMap.ERROR
          ) {
            continue;
          }
        }

        // 更新文件状态为正在计算hash
        setFiles((prevFiles) => {
          return prevFiles.map((file) => {
            if (file.file === fileInfo.file) {
              return {
                ...file,
                isCalculatingHash: true,
                hashProgress: 0,
                hashStatus: '准备计算文件hash...',
                status: taskStatusMap.PROCESSING,
              };
            }
            return file;
          });
        });

        // 创建/获取上传任务 (addTask内部会检查是否已存在相同哈希的任务)
        const taskId = await globalUploadQueue.addTask(
          fileInfo.file,
          undefined, // 使用默认chunkSize
          (progress, status) => {
            // hash计算进度回调
            setFiles((prevFiles) => {
              return prevFiles.map((file) => {
                if (file.file === fileInfo.file) {
                  return {
                    ...file,
                    hashProgress: progress,
                    hashStatus: status,
                  };
                }
                return file;
              });
            });
          },
        );

        // hash计算完成，更新文件状态
        setFiles((prevFiles) => {
          return prevFiles.map((file) => {
            if (file.file === fileInfo.file) {
              return {
                ...file,
                isCalculatingHash: false,
                hashProgress: 100,
                hashStatus: 'hash计算完成',
              };
            }
            return file;
          });
        });
        // 获取任务当前状态 (可能是新创建的任务或已存在的任务)
        const task = globalUploadQueue.getTask(taskId);

        // 更新文件信息，关联上传任务ID
        setFiles((prevFiles) => {
          return prevFiles.map((file) => {
            if (file.file === fileInfo.file) {
              return {
                ...file,
                taskId,
                status: task?.status || taskStatusMap.PROCESSING,
                progress: task?.progress || 0,
              };
            }
            return file;
          });
        });

        // 如果是已存在的暂停任务，恢复上传
        if (task?.status === taskStatusMap.PAUSED) {
          globalUploadQueue.resumeTask(taskId);
        }
      } catch (error) {
        console.error('添加上传任务失败:', error);

        // 更新文件状态为失败
        setFiles((prevFiles) => {
          return prevFiles.map((file) => {
            if (file.file === fileInfo.file && error instanceof AxiosError) {
              return {
                ...file,
                status: taskStatusMap.ERROR,
                error: error.message,
              };
            }
            return file;
          });
        });
      }
    }
  };

  // 暂停指定文件的上传
  const handlePauseFile = (index: number) => {
    const fileInfo = files[index];
    if (!fileInfo.taskId) return;

    // 调用上传队列的暂停方法
    globalUploadQueue.pauseTask(fileInfo.taskId);
  };

  // 恢复指定文件的上传
  const handleResumeFile = (index: number) => {
    const fileInfo = files[index];
    if (!fileInfo.taskId) return;

    // 调用上传队列的恢复方法
    globalUploadQueue.resumeTask(fileInfo.taskId);
  };

  // 开始单个文件的上传
  const handleStartSingleFile = async (index: number) => {
    const fileInfo = files[index];

    // 如果文件已经在上传中或已完成，则不处理
    if (
      fileInfo.status !== taskStatusMap.PENDING ||
      fileInfo.isCalculatingHash
    ) {
      return;
    }

    try {
      // 更新文件状态为正在计算hash
      setFiles((prevFiles) => {
        return prevFiles.map((file, i) => {
          if (i === index) {
            return {
              ...file,
              isCalculatingHash: true,
              hashProgress: 0,
              hashStatus: '准备计算文件hash...',
              status: taskStatusMap.PROCESSING,
            };
          }
          return file;
        });
      });

      // 创建上传任务
      const taskId = await globalUploadQueue.addTask(
        fileInfo.file,
        undefined, // 使用默认chunkSize
        (progress, status) => {
          // hash计算进度回调
          setFiles((prevFiles) => {
            return prevFiles.map((file, i) => {
              if (i === index) {
                return {
                  ...file,
                  hashProgress: progress,
                  hashStatus: status,
                };
              }
              return file;
            });
          });
        },
      );

      // hash计算完成，更新文件状态
      setFiles((prevFiles) => {
        return prevFiles.map((file, i) => {
          if (i === index) {
            return {
              ...file,
              isCalculatingHash: false,
              hashProgress: 100,
              hashStatus: 'hash计算完成',
              taskId,
              status: taskStatusMap.PROCESSING,
            };
          }
          return file;
        });
      });
    } catch (error) {
      console.error('启动单个文件上传失败:', error);

      // 更新文件状态为失败
      setFiles((prevFiles) => {
        return prevFiles.map((file, i) => {
          if (i === index) {
            return {
              ...file,
              status: taskStatusMap.ERROR,
              error: error instanceof Error ? error.message : '上传失败',
              isCalculatingHash: false,
            };
          }
          return file;
        });
      });
    }
  };

  const handleRemoveFile = (index: number) => {
    const fileInfo = files[index];

    // 如果有任务ID，先从队列中移除
    if (fileInfo.taskId) {
      globalUploadQueue.removeTask(fileInfo.taskId);
    }

    setFiles((prevFiles) => {
      const newFiles = [...prevFiles];
      newFiles.splice(index, 1);
      return newFiles;
    });

    // 如果没有文件了，设置上传状态为false
    if (files.length === 1) {
      setUploading(false);
    }
  };

  const handleClearAll = () => {
    // 从队列中移除所有任务
    files.forEach((fileInfo) => {
      if (fileInfo.taskId) {
        globalUploadQueue.removeTask(fileInfo.taskId);
      }
    });

    setFiles([]);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 处理拖拽事件
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles: FileInfo[] = Array.from(e.dataTransfer.files).map(
        (file) => ({
          file,
          progress: 0,
          status: taskStatusMap.PENDING,
        }),
      );
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 计算统计信息
  const getUploadStats = () => {
    const total = files.length;
    const completed = files.filter(
      (f) => f.status === taskStatusMap.COMPLETED,
    ).length;
    const processing = files.filter(
      (f) => f.status === taskStatusMap.PROCESSING || f.isCalculatingHash,
    ).length;
    const paused = files.filter(
      (f) => f.status === taskStatusMap.PAUSED,
    ).length;
    const error = files.filter((f) => f.status === taskStatusMap.ERROR).length;

    return { total, completed, processing, paused, error };
  };

  const stats = getUploadStats();

  return (
    <div className="space-y-6">
      {/* 上传区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            文件上传
          </CardTitle>
          <CardDescription>
            支持拖拽文件到下方区域，或点击选择文件按钮上传多个文件
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 拖拽上传区域 */}
            <div
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                    : 'border-slate-300 hover:border-slate-400 dark:border-slate-600'
                }
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="space-y-3">
                <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  <FolderOpen className="h-6 w-6 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    拖拽文件到此处，或点击选择文件
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    支持多文件上传，自动分片处理大文件
                  </p>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex items-center gap-2 cursor-pointer"
              >
                <FolderOpen className="h-4 w-4" />
                选择文件
              </Button>
              <Button
                onClick={handleUpload}
                disabled={files.length === 0 || uploading}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                {uploading ? '上传中...' : '开始上传'}
              </Button>
              <Button
                onClick={handleClearAll}
                disabled={files.length === 0}
                variant="destructive"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                清空列表
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计信息 */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="font-medium">总计: {stats.total}</span>
              </div>
              {stats.completed > 0 && (
                <Badge
                  variant="default"
                  className="bg-green-100 text-green-800 hover:bg-green-100"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  完成: {stats.completed}
                </Badge>
              )}
              {stats.processing > 0 && (
                <Badge variant="secondary">
                  <Upload className="h-3 w-3 mr-1" />
                  处理中: {stats.processing}
                </Badge>
              )}
              {stats.paused > 0 && (
                <Badge variant="outline">
                  <Pause className="h-3 w-3 mr-1" />
                  暂停: {stats.paused}
                </Badge>
              )}
              {stats.error > 0 && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  失败: {stats.error}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            上传列表
          </h3>
          <div className="space-y-3">
            {files.map((fileInfo, index) => (
              <div key={`${fileInfo.file.name}-${index}`} className="relative">
                <UploadProgress
                  filename={fileInfo.file.name}
                  progress={fileInfo.progress}
                  status={fileInfo.status}
                  fileUrl={fileInfo.fileUrl}
                  hashProgress={fileInfo.hashProgress}
                  isCalculatingHash={fileInfo.isCalculatingHash}
                  hashStatus={fileInfo.hashStatus}
                />

                {/* 文件信息和操作按钮 */}
                <div className="flex items-center justify-between mt-2 px-4 pb-2">
                  <div className="text-xs text-slate-500">
                    大小: {formatFileSize(fileInfo.file.size)}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 开始按钮 - 只在未开始时显示 */}
                    {fileInfo.status === taskStatusMap.PENDING && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleStartSingleFile(index)}
                        className="h-8 px-3 cursor-pointer"
                        disabled={fileInfo.isCalculatingHash}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        开始
                      </Button>
                    )}

                    {/* 暂停/继续按钮 - 只在处理中时显示 */}
                    {fileInfo.isPaused ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResumeFile(index)}
                        className="h-8 px-3"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        继续
                      </Button>
                    ) : (
                      fileInfo.progress < 100 &&
                      fileInfo.progress > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePauseFile(index)}
                          className="h-8 px-3"
                        >
                          <Pause className="h-3 w-3 mr-1" />
                          暂停
                        </Button>
                      )
                    )}

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveFile(index)}
                      className="h-8 px-3 cursor-pointer"
                    >
                      <X className="h-3 w-3 mr-1" />
                      移除
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态提示 */}
      {files.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p className="text-sm">
            暂无文件，请选择或拖拽文件到上方区域开始上传
          </p>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
