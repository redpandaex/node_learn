import SparkMD5 from 'spark-md5';
import { ChunkType, WorkerChunkType } from './types';
import { DEFAULT_CHUNK_SIZE } from './constants';
import { HashType } from '../wasm/wasm-hash';
// 导入 noble-hashes 库的 blake3
import { blake3 } from '@noble/hashes/blake3';
import { bytesToHex } from '@noble/hashes/utils';

// 使用Worker处理文件
const processFileWithWorker = (
  file: File,
  chunkSize: number,
  hashType: HashType = 'blake3',
  onProgress?: (progress: number, status: string) => void,
): Promise<{
  fileHash: string;
  chunks: ChunkType[];
}> => {
  return new Promise((resolve, reject) => {
    // 创建WebWorker
    const worker = new Worker(
      /** new URL()必须写在里面,不能拆开 https://rspack.rs/zh/guide/features/web-workers#%E4%BD%BF%E7%94%A8%E6%96%B9%E5%BC%8F */
      new URL('../worker/generateHash.ts', import.meta.url),
      { type: 'module' },
    );

    // 监听Worker消息
    worker.onmessage = (e) => {
      const { type, data, error, progress, status } = e.data;

      if (type === 'complete') {
        // 处理完成，将Worker返回的数据转换为所需格式
        // 由于Worker中无法传输Blob对象，需要在这里重新创建分片Blob
        const chunks: ChunkType[] = data.chunks.map(
          (chunkInfo: WorkerChunkType) => ({
            chunk: file.slice(chunkInfo.start, chunkInfo.end),
            hash: chunkInfo.hash,
          }),
        );

        resolve({
          fileHash: data.fileHash,
          chunks,
        });

        // 终止Worker
        worker.terminate();
      } else if (type === 'progress') {
        // 调用进度回调
        if (onProgress) {
          onProgress(
            progress,
            status || `正在计算文件${hashType.toUpperCase()}哈希...`,
          );
        }
      } else if (type === 'error') {
        reject(new Error(error));
        worker.terminate();
      }
    };

    // 处理Worker错误
    worker.onerror = (err) => {
      reject(new Error(`Worker错误: ${err.message}`));
      worker.terminate();
    };

    // 发送数据到Worker
    worker.postMessage({
      file,
      chunkSize,
      hashType,
    });
  });
};

// 使用MD5算法处理文件
const processFileWithMd5 = (
  file: File,
  chunkSize: number,
  onProgress?: (progress: number, status: string) => void,
): Promise<{
  fileHash: string;
  chunks: ChunkType[];
}> => {
  return new Promise((resolve, reject) => {
    // 用于计算整个文件的哈希值
    const fileSpark = new SparkMD5.ArrayBuffer();
    // 用于存储每个分块的信息
    const chunks: ChunkType[] = [];
    // 预先创建所有的分块
    let cur = 0;
    while (cur < file.size) {
      chunks.push({
        chunk: file.slice(cur, cur + chunkSize),
        hash: '', // 先初始化为空，后面计算
      });
      cur += chunkSize;
    }

    const fileReader = new FileReader();
    let currentChunk = 0;
    const totalChunks = chunks.length;

    fileReader.onload = async (e) => {
      if (e.target?.result) {
        const arrayBuffer = e.target.result as ArrayBuffer;

        // 添加到整个文件的哈希计算
        fileSpark.append(arrayBuffer);

        // 计算当前分块的哈希
        const chunkSpark = new SparkMD5.ArrayBuffer();
        chunkSpark.append(arrayBuffer);
        chunks[currentChunk].hash = chunkSpark.end();

        currentChunk++;

        // 报告进度
        if (onProgress) {
          const progress = Math.round((currentChunk / totalChunks) * 100);
          onProgress(
            progress,
            `正在处理第 ${currentChunk}/${totalChunks} 个分片`,
          );
        }

        if (currentChunk < totalChunks) {
          // 继续读取下一个分块
          loadNext();
        } else {
          // 完成所有分块读取和哈希计算
          if (onProgress) {
            onProgress(100, '文件处理完成');
          }
          resolve({
            fileHash: fileSpark.end(),
            chunks,
          });
        }
      }
    };

    fileReader.onerror = (e) => {
      reject(new Error('文件读取失败：' + e.target?.error?.message));
    };

    function loadNext() {
      fileReader.readAsArrayBuffer(chunks[currentChunk].chunk);
    }

    // 开始读取第一个分块
    if (chunks.length > 0) {
      loadNext();
    } else {
      // 文件为空的情况
      resolve({
        fileHash: new SparkMD5.ArrayBuffer().end(),
        chunks: [],
      });
    }
  });
};

// 使用BLAKE3算法处理文件
const processFileWithBlake3 = (
  file: File,
  chunkSize: number,
  onProgress?: (progress: number, status: string) => void,
): Promise<{
  fileHash: string;
  chunks: ChunkType[];
}> => {
  return new Promise((resolve, reject) => {
    // 用于存储每个分块的信息
    const chunks: ChunkType[] = [];

    // 预先创建所有的分块
    let cur = 0;
    while (cur < file.size) {
      chunks.push({
        chunk: file.slice(cur, cur + chunkSize),
        hash: '', // 先初始化为空，后面计算
      });
      cur += chunkSize;
    }

    const fileReader = new FileReader();
    let currentChunk = 0;
    const totalChunks = chunks.length;

    // 创建BLAKE3增量哈希实例
    const fileHasher = blake3.create();

    fileReader.onload = async (e) => {
      if (e.target?.result) {
        const arrayBuffer = e.target.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);

        // 为整个文件增量更新哈希
        fileHasher.update(uint8Array);

        // 计算当前分块的哈希（用于分块验证）
        chunks[currentChunk].hash = bytesToHex(blake3(uint8Array));

        currentChunk++;

        // 报告进度
        if (onProgress) {
          const progress = Math.round((currentChunk / totalChunks) * 100);
          onProgress(
            progress,
            `正在处理第 ${currentChunk}/${totalChunks} 个分片`,
          );
        }

        if (currentChunk < totalChunks) {
          // 继续读取下一个分块
          loadNext();
        } else {
          // 完成所有分块读取，获取整个文件的最终哈希
          const fileHash = bytesToHex(fileHasher.digest());

          if (onProgress) {
            onProgress(100, '文件处理完成');
          }

          resolve({
            fileHash,
            chunks,
          });
        }
      }
    };

    fileReader.onerror = (e) => {
      reject(new Error('文件读取失败：' + e.target?.error?.message));
    };

    function loadNext() {
      fileReader.readAsArrayBuffer(chunks[currentChunk].chunk);
    }

    // 开始读取第一个分块
    if (chunks.length > 0) {
      loadNext();
    } else {
      // 文件为空的情况
      const fileHash = bytesToHex(blake3(new Uint8Array(0)));
      resolve({
        fileHash,
        chunks: [],
      });
    }
  });
};
// 主线程处理文件
const processFileInMainThread = (
  file: File,
  chunkSize: number,
  onProgress?: (progress: number, status: string) => void,
  hashType: HashType = 'blake3',
): Promise<{
  fileHash: string;
  chunks: ChunkType[];
}> => {
  // 根据哈希类型选择对应的处理函数
  if (hashType === 'blake3') {
    return processFileWithBlake3(file, chunkSize, onProgress);
  } else {
    return processFileWithMd5(file, chunkSize, onProgress);
  }
};

/**
 * 处理文件，计算哈希并分片
 * @param file 要处理的文件
 * @param chunkSize 分片大小，默认为5MB
 * @param useWorker 是否使用Worker处理，默认为false
 * @param onProgress 进程回调函数
 * @param hashType 哈希算法类型，默认为'blake3'，也可以是'md5'
 * @returns 返回文件哈希和分片信息
 */
export const processFile = (
  file: File,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  useWorker: boolean = false,
  onProgress?: (progress: number, status: string) => void,
  hashType: HashType = 'blake3',
): Promise<{
  fileHash: string;
  chunks: ChunkType[];
}> => {
  if (useWorker) {
    return processFileWithWorker(file, chunkSize, hashType, onProgress);
  }
  return processFileInMainThread(file, chunkSize, onProgress, hashType);
};
