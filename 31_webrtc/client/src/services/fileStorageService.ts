import { FileChunk } from '../types/storage';

// 文件存储服务 - 使用 IndexedDB 替代内存存储
export class FileStorageService {
  private static instance: FileStorageService;
  private db: IDBDatabase | null = null;
  private readonly dbName = 'FileTransferDB';
  private readonly version = 1;
  private readonly storeName = 'fileChunks';

  private constructor() {}

  static getInstance(): FileStorageService {
    if (!FileStorageService.instance) {
      FileStorageService.instance = new FileStorageService();
    }
    return FileStorageService.instance;
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
      };
    });
  }

  // 存储文件块
  async storeChunk(
    transferId: string,
    chunkIndex: number,
    data: ArrayBuffer,
  ): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const chunk = {
        id: `${transferId}_${chunkIndex}`,
        transferId,
        chunkIndex,
        data,
        timestamp: Date.now(),
      };

      const request = store.put(chunk);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 获取文件块
  async getChunk(
    transferId: string,
    chunkIndex: number,
  ): Promise<ArrayBuffer | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      const request = store.get(`${transferId}_${chunkIndex}`);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // 检查文件块是否存在
  async hasChunk(transferId: string, chunkIndex: number): Promise<boolean> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      const request = store.get(`${transferId}_${chunkIndex}`);
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 获取所有文件块并组装成 Blob
  async assembleFile(
    transferId: string,
    totalChunks: number,
    fileType: string,
  ): Promise<Blob> {
    return this.assembleFileWithProgress(transferId, totalChunks, fileType);
  }

  // 获取所有文件块并组装成 Blob（带进度回调）
  async assembleFileWithProgress(
    transferId: string,
    totalChunks: number,
    fileType: string,
    onProgress?: (progress: number) => void,
  ): Promise<Blob> {
    if (!this.db) await this.initialize();

    const chunks: ArrayBuffer[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const chunk = await this.getChunk(transferId, i);
      if (!chunk) {
        throw new Error(`Missing chunk ${i} for transfer ${transferId}`);
      }
      chunks.push(chunk);

      // 报告进度
      if (onProgress) {
        const progress = ((i + 1) / totalChunks) * 100;
        onProgress(progress);
      }

      // 给UI一个更新的机会，避免阻塞主线程
      if (i % 10 === 0) {
        // 每10个块让出一次控制权
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return new Blob(chunks, { type: fileType });
  }

  // 删除传输相关的所有文件块
  async deleteTransfer(transferId: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('transferId');

      const request = index.openCursor(IDBKeyRange.only(transferId));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // 清理所有数据
  async clearAll(): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // 获取存储使用情况
  async getStorageUsage(): Promise<
    { transferId: string; chunks: number; size: number }[]
  > {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result;
        const usage = new Map<string, { chunks: number; size: number }>();

        results.forEach((chunk: FileChunk) => {
          if (!usage.has(chunk.transferId)) {
            usage.set(chunk.transferId, { chunks: 0, size: 0 });
          }
          const current = usage.get(chunk.transferId)!;
          current.chunks++;
          current.size += chunk.data.byteLength;
        });

        const result = Array.from(usage.entries()).map(
          ([transferId, data]) => ({
            transferId,
            ...data,
          }),
        );

        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }
}
