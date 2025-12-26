import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 解决 ESM 中 __dirname 不可用的问题
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定义路径
const SOURCE_DIR = path.resolve(__dirname, '../pkg');
const TARGET_DIR = path.resolve(__dirname, '../../slice_upload_client/src/wasm/wasm-hash/pkg');

try {
  // 确保目标目录存在（递归创建）
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
    console.log(`Created directory: ${TARGET_DIR}`);
  }

  // 复制必要文件
  const FILES_TO_COPY: string[] = ['wasm_hash_bg.wasm', 'wasm_hash.js', 'wasm_hash.d.ts'];

  FILES_TO_COPY.forEach((file) => {
    const sourcePath = path.join(SOURCE_DIR, file);
    const targetPath = path.join(TARGET_DIR, file);

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`Copied ${file} to ${targetPath}`);
    } else {
      throw new Error(`Source file not found: ${sourcePath}`);
    }
  });

  console.log('Deployment completed successfully!');
} catch (error) {
  console.error('Deployment failed:');
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
}
