import { TaskStatus, VerifyStatusEnum } from './constants';

export type Map2Enum<T> = T[keyof T];

// 分片信息接口
export interface ChunkType {
  chunk: Blob;
  hash: string;
}

// Worker中使用的分片信息
export interface WorkerChunkType {
  hash: string;
  size: number;
  start: number;
  end: number;
}

// 验证分片参数
export interface VerifyChunkParams {
  fileHash: string;
  chunkHash?: string;
}

// 合并分片参数
export interface MergeChunksParams {
  fileHash: string;
  filename: string;
}

// 上传分片参数
export interface UploadChunkParams {
  file: File;
  chunkSize: number;
  chunkIndex: number;
  fileHash: string;
  filename: string;
  chunkHash: string;
  onProgress?: (progress: number) => void;
  abortController?: AbortController;
}

// API响应类型
export interface AxiosResponseType<T> {
  code: number;
  message?: string;
  data: T;
}

// 验证响应类型
export interface VerifyResponseType {
  status: VerifyStatusEnum;
  uploadedChunkIndexes: number[];
  url?: string;
}

// 合并响应类型
export interface MergeResponseType {
  url: string;
}

// 请求验证类型
export interface RequestVerifyType {
  fileHash: string;
  filename: string;
  fileSize: number;
  chunkSize: number;
  chunkTotal: number;
  fileType?: string;
}

// 上传任务接口
export interface UploadTask {
  id: string; // 任务ID（通常使用文件hash）
  file: File; // 文件对象
  fileName: string; // 文件名
  fileSize: number; // 文件大小
  fileType: string; // 文件类型
  fileHash: string; // 文件哈希
  chunkSize: number; // 分片大小
  chunks: ChunkType[]; // 所有分片
  uploadedChunks: boolean[]; // 已上传的分片标记
  currentChunkIndex: number; // 当前上传的分片索引
  status: TaskStatus; // 任务状态
  progress: number; // 上传进度
  error?: Error; // 错误信息
  abortController?: AbortController; // 用于取消上传请求
}

// 上传队列回调接口
export interface UploadQueueCbType {
  onProgress?: (taskId: string, progress: number) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onComplete?: (taskId: string, url: string) => void;
  onError?: (taskId: string, error: Error) => void;
}

// 可序列化的任务数据
export interface SerializableTaskData {
  id: string;
  fileHash: string;
  chunkSize: number;
  uploadedChunks: boolean[];
  currentChunkIndex: number;
  status: TaskStatus;
  progress: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  chunksCount: number;
}
