import init, {
  HashCalculator,
  calculate_hash,
  type InitOutput,
} from './pkg/wasm_hash';

// WASM模块的URL，基于当前脚本的位置计算
const wasmUrl = new URL('./pkg/wasm_hash_bg.wasm', import.meta.url);

// 可用的哈希算法类型
export type HashType = 'blake3' | 'md5';

// 初始化状态跟踪
let isInitialized = false;
let initPromise: Promise<InitOutput> | null = null;

// 初始化WASM模块
export async function initWasmHash(): Promise<void> {
  if (isInitialized) return;

  if (!initPromise) {
    initPromise = init(wasmUrl);
    await initPromise;
    isInitialized = true;
  } else {
    await initPromise;
  }
}

// 包装的哈希计算类
export class WasmHashCalculator {
  private calculator: HashCalculator;
  private hashType: HashType;

  constructor(hashType: HashType = 'blake3') {
    if (!isInitialized) {
      throw new Error(
        'WASM module not initialized. Call initWasmHash() first.',
      );
    }
    this.calculator = new HashCalculator();
    this.hashType = hashType;
    this.calculator.set_hash_type(hashType);
  }

  // 设置要使用的哈希算法类型
  setHashType(hashType: HashType): void {
    this.hashType = hashType;
    this.calculator.set_hash_type(hashType);
  }

  // 获取当前使用的哈希算法类型
  getHashType(): HashType {
    return this.hashType;
  }

  // 更新哈希计算
  update(data: Uint8Array): void {
    this.calculator.update(data);
  }

  // 完成计算并获取哈希值
  finalize(): string {
    return this.calculator.finalize();
  }

  // 计算单个分块的哈希值
  calculateChunkHash(data: Uint8Array): string {
    return this.calculator.calculate_chunk_hash(data);
  }
}

// 直接计算整个数据的哈希值
export function calculateHash(
  data: Uint8Array,
  hashType: HashType = 'blake3',
): string {
  if (!isInitialized) {
    throw new Error('WASM module not initialized. Call initWasmHash() first.');
  }
  return calculate_hash(data, hashType);
}

// 导出完整的模块
export default {
  initWasmHash,
  WasmHashCalculator,
  calculateHash,
};
