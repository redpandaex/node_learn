// 从wasm-hash模块导入哈希计算功能
import {
  initWasmHash,
  WasmHashCalculator,
  HashType,
} from '../wasm/wasm-hash/index.ts';

// Worker文件处理消息
self.onmessage = async (event) => {
  const { file, chunkSize, hashType = 'blake3' } = event.data;

  try {
    // 初始化WASM哈希计算模块
    await initWasmHash();

    const result = await processFile(file, chunkSize, hashType);
    // 返回处理结果
    self.postMessage({
      type: 'complete',
      data: result,
    });
  } catch (error) {
    // 发送错误信息
    self.postMessage({
      type: 'error',
      error: error,
    });
  }
};

interface WorkerChunkType {
  hash: string;
  size: number;
  start: number;
  end: number;
}

const processFile = (
  file: File,
  chunkSize: number,
  hashType: HashType = 'blake3',
): Promise<{
  fileHash: string;
  chunks: WorkerChunkType[];
}> => {
  return new Promise((resolve, reject) => {
    // 用于计算整个文件的哈希值
    const hashCalculator = new WasmHashCalculator(hashType);

    // 用于存储每个分块的信息
    const chunks: WorkerChunkType[] = [];

    // 预先创建所有的分块信息
    let cur = 0;
    while (cur < file.size) {
      const end = Math.min(cur + chunkSize, file.size);
      chunks.push({
        hash: '', // 先初始化为空，后面计算
        size: end - cur,
        start: cur,
        end: end,
      });
      cur += chunkSize;
    }

    const fileReader = new FileReader();
    let currentChunk = 0;
    const totalChunks = chunks.length;

    // 报告进度
    const reportProgress = () => {
      const progress = (currentChunk / totalChunks) * 100;
      let status = '';

      if (currentChunk === 0) {
        status = `开始计算文件${hashType.toUpperCase()}哈希...`;
      } else if (currentChunk === totalChunks) {
        status = '完成哈希计算';
      } else {
        status = `正在计算${hashType.toUpperCase()}哈希... (${currentChunk}/${totalChunks})`;
      }

      self.postMessage({
        type: 'progress',
        progress,
        status,
      });
    };

    fileReader.onload = async (e) => {
      if (e.target?.result) {
        const arrayBuffer = e.target.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);

        // 添加到整个文件的哈希计算
        hashCalculator.update(uint8Array);

        // 计算当前分块的哈希
        chunks[currentChunk].hash =
          hashCalculator.calculateChunkHash(uint8Array);

        currentChunk++;
        reportProgress();

        if (currentChunk < totalChunks) {
          // 继续读取下一个分块
          loadNext();
        } else {
          // 完成所有分块读取和哈希计算
          resolve({
            fileHash: hashCalculator.finalize(),
            chunks,
          });
        }
      }
    };

    fileReader.onerror = (e) => {
      reject(new Error('文件读取失败：' + e.target?.error?.message));
    };

    function loadNext() {
      const chunk = file.slice(
        chunks[currentChunk].start,
        chunks[currentChunk].end,
      );
      fileReader.readAsArrayBuffer(chunk);
    }

    // 开始读取第一个分块
    if (chunks.length > 0) {
      // 报告开始进度
      reportProgress();
      loadNext();
    } else {
      // 文件为空的情况
      const emptyHashCalculator = new WasmHashCalculator(hashType);
      resolve({
        fileHash: emptyHashCalculator.finalize(),
        chunks: [],
      });
    }
  });
};
