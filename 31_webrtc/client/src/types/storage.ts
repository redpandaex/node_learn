// 基础文件块接口
export interface FileChunk {
  id: string;
  transferId: string;
  chunkIndex: number;
  data: ArrayBuffer;
  timestamp: number;
}

// 高级文件块接口（包含压缩信息）
export interface AdvancedFileChunk extends FileChunk {
  originalSize: number;
  compressedSize: number;
}

// 文件元数据接口
export interface FileMeta {
  transferId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
  compressed: boolean;
  timestamp: number;
}

// 存储使用情况接口
export interface StorageUsageItem {
  transferId: string;
  chunks: number;
  size: number;
}

// 详细存储使用情况接口
export interface DetailedStorageUsage {
  transfers: {
    transferId: string;
    chunks: number;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  }[];
  totalOriginalSize: number;
  totalCompressedSize: number;
  cacheUsage: number;
  cacheHitRate: number;
}

// 存储策略枚举
export type StorageStrategy = 'memory' | 'indexeddb' | 'advanced' | 'auto';

// 文件传输配置接口
export interface FileTransferConfig {
  // 存储策略
  storageStrategy: StorageStrategy;

  // 缓存配置
  cacheSize: number; // 默认 10MB

  // 压缩配置
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'deflate';
    level?: number;
  };

  // 自动清理
  autoCleanup: {
    enabled: boolean;
    maxAge: number; // 天数
    maxSize: number; // 字节
  };

  // 文件大小阈值
  thresholds: {
    memoryThreshold: number; // 1MB - 小于此值使用内存
    advancedThreshold: number; // 100MB - 大于此值使用高级存储
  };
}

// 默认配置
export const DEFAULT_FILE_TRANSFER_CONFIG: FileTransferConfig = {
  storageStrategy: 'auto',
  cacheSize: 10 * 1024 * 1024, // 10MB
  compression: {
    enabled: true,
    algorithm: 'gzip',
  },
  autoCleanup: {
    enabled: true,
    maxAge: 7, // 7天
    maxSize: 500 * 1024 * 1024, // 500MB
  },
  thresholds: {
    memoryThreshold: 1024 * 1024, // 1MB
    advancedThreshold: 100 * 1024 * 1024, // 100MB
  },
};
