import { AdvancedFileChunk, FileMeta } from '../types/storage';

// 高级文件传输优化服务 - 使用 Streams API 和更多优化技术
export class AdvancedFileStorageService {
  private static instance: AdvancedFileStorageService;
  private db: IDBDatabase | null = null;
  private readonly dbName = 'AdvancedFileTransferDB';
  private readonly version = 1;
  private readonly storeName = 'fileChunks';
  private readonly metaStoreName = 'fileMeta';

  // 内存缓存配置
  private readonly cacheSize = 10 * 1024 * 1024; // 10MB 内存缓存
  private readonly cache = new Map<string, ArrayBuffer>();
  private cacheUsage = 0;

  // 压缩配置
  private readonly useCompression = true;
  private compressionStream: CompressionStream | null = null;
  private decompressionStream: DecompressionStream | null = null;

  private constructor() {
    this.initializeCompression();
  }

  static getInstance(): AdvancedFileStorageService {
    if (!AdvancedFileStorageService.instance) {
      AdvancedFileStorageService.instance = new AdvancedFileStorageService();
    }
    return AdvancedFileStorageService.instance;
  }

  // 初始化压缩流
  private initializeCompression() {
    if ('CompressionStream' in window && this.useCompression) {
      try {
        this.compressionStream = new CompressionStream('gzip');
        this.decompressionStream = new DecompressionStream('gzip');
      } catch (error) {
        console.warn(
          'Compression not supported, falling back to uncompressed storage',
          error,
        );
      }
    }
  }

  // 压缩数据
  private async compressData(data: ArrayBuffer): Promise<ArrayBuffer> {
    if (!this.compressionStream) return data;

    try {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      // 写入数据
      await writer.write(new Uint8Array(data));
      await writer.close();

      // 读取压缩后的数据
      const chunks: Uint8Array[] = [];
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          chunks.push(value);
        }
      }

      // 合并压缩后的数据
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result.buffer;
    } catch (error) {
      console.warn('Compression failed, using original data', error);
      return data;
    }
  }

  // 解压数据
  private async decompressData(data: ArrayBuffer): Promise<ArrayBuffer> {
    if (!this.decompressionStream) return data;

    try {
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      // 写入压缩数据
      await writer.write(new Uint8Array(data));
      await writer.close();

      // 读取解压后的数据
      const chunks: Uint8Array[] = [];
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          chunks.push(value);
        }
      }

      // 合并解压后的数据
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result.buffer;
    } catch (error) {
      console.warn('Decompression failed, assuming uncompressed data', error);
      return data;
    }
  }

  // 缓存管理
  private addToCache(key: string, data: ArrayBuffer) {
    if (this.cacheUsage + data.byteLength > this.cacheSize) {
      this.evictCache();
    }

    this.cache.set(key, data);
    this.cacheUsage += data.byteLength;
  }

  private evictCache() {
    // LRU 策略：删除最早添加的条目
    const keysToDelete = Array.from(this.cache.keys()).slice(
      0,
      Math.floor(this.cache.size / 2),
    );

    for (const key of keysToDelete) {
      const data = this.cache.get(key);
      if (data) {
        this.cacheUsage -= data.byteLength;
        this.cache.delete(key);
      }
    }
  }

  // 初始化数据库
  async initialize(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建文件块存储
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('transferId', 'transferId', { unique: false });
          store.createIndex('chunkIndex', 'chunkIndex', { unique: false });
        }

        // 创建文件元数据存储
        if (!db.objectStoreNames.contains(this.metaStoreName)) {
          const metaStore = db.createObjectStore(this.metaStoreName, {
            keyPath: 'transferId',
          });
          metaStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // 存储文件元数据
  async storeFileMeta(
    transferId: string,
    meta: {
      fileName: string;
      fileSize: number;
      fileType: string;
      totalChunks: number;
      compressed: boolean;
    },
  ): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.metaStoreName],
        'readwrite',
      );
      const store = transaction.objectStore(this.metaStoreName);

      const data = {
        transferId,
        ...meta,
        timestamp: Date.now(),
      };

      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 获取文件元数据
  async getFileMeta(transferId: string): Promise<FileMeta | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.metaStoreName],
        'readonly',
      );
      const store = transaction.objectStore(this.metaStoreName);

      const request = store.get(transferId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 存储文件块（带压缩和缓存）
  async storeChunk(
    transferId: string,
    chunkIndex: number,
    data: ArrayBuffer,
  ): Promise<void> {
    if (!this.db) await this.initialize();

    // 压缩数据
    const compressedData = await this.compressData(data);

    // 缓存原始数据
    const cacheKey = `${transferId}_${chunkIndex}`;
    this.addToCache(cacheKey, data);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const chunk = {
        id: cacheKey,
        transferId,
        chunkIndex,
        data: compressedData,
        originalSize: data.byteLength,
        compressedSize: compressedData.byteLength,
        timestamp: Date.now(),
      };

      const request = store.put(chunk);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 获取文件块（带缓存和解压）
  async getChunk(
    transferId: string,
    chunkIndex: number,
  ): Promise<ArrayBuffer | null> {
    const cacheKey = `${transferId}_${chunkIndex}`;

    // 先检查缓存
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      const request = store.get(cacheKey);
      request.onsuccess = async () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        try {
          // 解压数据
          const decompressedData = await this.decompressData(result.data);

          // 添加到缓存
          this.addToCache(cacheKey, decompressedData);

          resolve(decompressedData);
        } catch (error) {
          reject(error);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // 流式组装文件
  async assembleFileStream(
    transferId: string,
    totalChunks: number,
    fileType: string,
    onProgress?: (progress: number) => void,
  ): Promise<Blob> {
    const chunks: ArrayBuffer[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const chunk = await this.getChunk(transferId, i);
      if (!chunk) {
        throw new Error(`Missing chunk ${i} for transfer ${transferId}`);
      }
      chunks.push(chunk);

      // 报告进度
      if (onProgress) {
        onProgress(((i + 1) / totalChunks) * 100);
      }
    }

    return new Blob(chunks, { type: fileType });
  }

  // 删除传输相关的所有数据
  async deleteTransfer(transferId: string): Promise<void> {
    if (!this.db) await this.initialize();

    // 清理缓存
    const cacheKeysToDelete = Array.from(this.cache.keys()).filter((key) =>
      key.startsWith(`${transferId}_`),
    );

    for (const key of cacheKeysToDelete) {
      const data = this.cache.get(key);
      if (data) {
        this.cacheUsage -= data.byteLength;
        this.cache.delete(key);
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.storeName, this.metaStoreName],
        'readwrite',
      );

      // 删除文件块
      const store = transaction.objectStore(this.storeName);
      const index = store.index('transferId');

      const request = index.openCursor(IDBKeyRange.only(transferId));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // 删除元数据
      const metaStore = transaction.objectStore(this.metaStoreName);
      metaStore.delete(transferId);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // 获取详细的存储使用情况
  async getDetailedStorageUsage(): Promise<{
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
  }> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result;
        const usage = new Map<
          string,
          { chunks: number; originalSize: number; compressedSize: number }
        >();

        results.forEach((chunk: AdvancedFileChunk) => {
          if (!usage.has(chunk.transferId)) {
            usage.set(chunk.transferId, {
              chunks: 0,
              originalSize: 0,
              compressedSize: 0,
            });
          }
          const current = usage.get(chunk.transferId)!;
          current.chunks++;
          current.originalSize += chunk.originalSize || chunk.data.byteLength;
          current.compressedSize +=
            chunk.compressedSize || chunk.data.byteLength;
        });

        const transfers = Array.from(usage.entries()).map(
          ([transferId, data]) => ({
            transferId,
            ...data,
            compressionRatio:
              data.originalSize > 0
                ? data.compressedSize / data.originalSize
                : 1,
          }),
        );

        const totalOriginalSize = transfers.reduce(
          (sum, t) => sum + t.originalSize,
          0,
        );
        const totalCompressedSize = transfers.reduce(
          (sum, t) => sum + t.compressedSize,
          0,
        );

        resolve({
          transfers,
          totalOriginalSize,
          totalCompressedSize,
          cacheUsage: this.cacheUsage,
          cacheHitRate: 0, // 需要额外统计
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  // 清理过期数据（超过指定天数）
  async cleanupExpiredData(daysOld = 7): Promise<number> {
    if (!this.db) await this.initialize();

    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.storeName, this.metaStoreName],
        'readwrite',
      );

      // 清理元数据
      const metaStore = transaction.objectStore(this.metaStoreName);
      const metaIndex = metaStore.index('timestamp');
      const metaRequest = metaIndex.openCursor(
        IDBKeyRange.upperBound(cutoffTime),
      );

      metaRequest.onsuccess = () => {
        const cursor = metaRequest.result;
        if (cursor) {
          const transferId = cursor.value.transferId;

          // 删除相关文件块
          const store = transaction.objectStore(this.storeName);
          const index = store.index('transferId');
          const chunkRequest = index.openCursor(IDBKeyRange.only(transferId));

          chunkRequest.onsuccess = () => {
            const chunkCursor = chunkRequest.result;
            if (chunkCursor) {
              chunkCursor.delete();
              deletedCount++;
              chunkCursor.continue();
            }
          };

          // 删除元数据
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve(deletedCount);
      transaction.onerror = () => reject(transaction.error);
    });
  }
}
