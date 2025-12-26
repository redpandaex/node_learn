import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ChunkUploadDto } from './dto/chunk-upload.dto';
import { VerifyChunkDto } from './dto/verify-chunk.dto';
import { MergeChunksDto } from './dto/merge-chunks.dto';
import fs from 'fs-extra';
import * as path from 'path';
import { Response, Request } from 'express';

const originHost = 'http://127.0.0.1:3210';

@Injectable()
export class UploadService {
  private readonly uploadDir = path.join(process.cwd(), 'resources');
  private readonly chunksDir = path.join(this.uploadDir, 'chunks');
  private readonly filesDir = path.join(this.uploadDir, 'files');

  constructor() {
    this.initFolders().catch((error) => console.log('[debug] ', error));
  }

  // 初始化上传所需的文件夹
  private async initFolders() {
    await fs.ensureDir(this.chunksDir);
    await fs.ensureDir(this.filesDir);
  }

  // 验证文件上传状态
  async verifyUpload(verifyChunkDto: VerifyChunkDto) {
    try {
      const { fileHash, filename, chunkTotal } = verifyChunkDto;
      // 查找以该文件哈希开头的所有文件
      const uploadedFiles = await fs.readdir(this.filesDir);
      const existingFile = uploadedFiles.find((file) =>
        file.startsWith(`${fileHash}-`),
      );

      // 检查文件是否已经存在（已完全上传）
      if (existingFile) {
        return {
          code: 1000,
          data: {
            status: 'success',
            uploadedChunkIndexes: [],
            url: `${originHost}/upload/download/${fileHash}?filename=${encodeURIComponent(filename)}`,
          },
        };
      }

      // 检查是否有部分分片已上传

      // 分片路径
      const chunkDir = path.join(this.chunksDir, fileHash);
      const chunkDirExists = await fs.pathExists(chunkDir);

      if (!chunkDirExists) {
        // 没有任何分片，需要从头开始上传
        return {
          code: 1001,
          data: {
            status: 'pending',
            uploadedChunkIndexes: [],
          },
        };
      }

      // 获取已上传的分片列表
      const files = await fs.readdir(chunkDir);
      // 从文件名中提取分片索引，格式为：索引_哈希值
      const uploadedChunkIndexes = files.map((filename) => {
        const parts = filename.split('_');
        return parseInt(parts[0], 10);
      });

      // 检查是否所有分片都已经上传
      if (uploadedChunkIndexes.length === chunkTotal) {
        return {
          code: 1002,
          data: {
            status: 'ready',
            uploadedChunkIndexes,
          },
        };
      }

      // 部分分片已上传，返回已上传的分片信息
      return {
        code: 1003,
        data: {
          status: 'partial',
          uploadedChunkIndexes,
        },
      };
    } catch (error) {
      console.log('[debug] error', error);
      throw new BadRequestException('Failed to verify upload status');
    }
  }

  // 保存分片
  async saveChunk(file: Express.Multer.File, chunkUploadDto: ChunkUploadDto) {
    const { fileHash, chunkHash, chunkIndex, chunkTotal } = chunkUploadDto;

    // 确保分片目录存在
    const chunkDir = path.join(this.chunksDir, fileHash);
    await fs.ensureDir(chunkDir);

    // 检查分片是否已经上传（断点续传）
    const chunkPath = path.join(chunkDir, `${chunkIndex}_${chunkHash}`);
    const exists = await fs.pathExists(chunkPath);

    if (!exists && !file) {
      throw new BadRequestException('Chunk file is required');
    }

    // 如果分片已存在，则跳过
    if (exists) {
      return {
        code: 0,
        message: `Chunk ${chunkIndex} already exists`,
        data: {
          chunkIndex,
          uploadedCount: (await fs.readdir(chunkDir)).length,
          chunkTotal,
        },
      };
    }

    // 确保文件已正确上传
    if (!file) {
      throw new BadRequestException('Chunk file upload failed');
    }

    try {
      // 将临时文件移动到最终位置
      await fs.move(file.path, chunkPath, { overwrite: false });

      // 返回成功响应
      return {
        code: 0,
        message: `Chunk ${chunkIndex} uploaded successfully`,
        data: {
          chunkIndex,
          uploadedCount: (await fs.readdir(chunkDir)).length,
          chunkTotal,
        },
      };
    } catch (error) {
      console.error(`Error saving chunk ${chunkIndex}:`, error);
      throw new BadRequestException(`Failed to save chunk ${chunkIndex}`);
    }
  }

  // 合并分片
  async mergeChunks(mergeChunksDto: MergeChunksDto) {
    const { fileHash, filename } = mergeChunksDto;
    // 1. 检查是否已经有以该文件哈希开头的文件
    const files = await fs.readdir(this.filesDir);
    const existingFile = files.find((file) => file.startsWith(`${fileHash}-`));

    if (existingFile) {
      return {
        code: 0,
        message: 'File already merged',
        data: {
          url: `${originHost}/upload/download/${fileHash}?filename=${encodeURIComponent(filename)}`,
        },
      };
    }

    // 文件路径
    const filePath = path.join(this.filesDir, `${fileHash}-${filename}`);

    // 检查分片目录是否存在
    // 分片路径
    const chunkDir = path.join(this.chunksDir, fileHash);
    const chunkDirExists = await fs.pathExists(chunkDir);
    if (!chunkDirExists) {
      throw new NotFoundException('No chunks found for this file');
    }

    // 获取分片列表并排序
    const chunkFilenames = await fs.readdir(chunkDir);
    const sortedChunkFilenames = chunkFilenames.sort((a, b) => {
      // 从文件名中提取索引（格式：索引_哈希值）
      const indexA = parseInt(a.split('_')[0], 10);
      const indexB = parseInt(b.split('_')[0], 10);
      return indexA - indexB;
    });

    // 创建可写流，用于合并文件
    const writeStream = fs.createWriteStream(filePath);

    // 依次将每个分片写入目标文件
    for (const chunkFilename of sortedChunkFilenames) {
      const chunkPath = path.join(chunkDir, chunkFilename);
      const chunkContent = await fs.readFile(chunkPath);
      writeStream.write(chunkContent);
    }

    // 完成写入
    writeStream.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        // 清理分片目录
        fs.remove(chunkDir)
          .then(() => {
            resolve({
              code: 0,
              message: 'File merged successfully',
              data: {
                url: `/upload/download/${fileHash}?filename=${encodeURIComponent(filename)}`,
              },
            });
          })
          .catch((error: unknown) => {
            console.log('[debug] ', error);
            reject(new BadRequestException('Failed to clean up chunks'));
          });
      });

      writeStream.on('error', (error) => {
        reject(
          new BadRequestException(`Failed to merge chunks: ${error.message}`),
        );
      });
    });
  }

  // 下载已上传的文件
  async downloadFile(
    fileHash: string,
    res: Response,
    req: Request,
    filename?: string,
  ) {
    // 查找以该文件哈希开头的所有文件
    const files = await fs.readdir(this.filesDir);
    const existingFile = files.find((file) => file.startsWith(`${fileHash}-`));

    // 检查文件是否存在
    if (!existingFile) {
      throw new NotFoundException('File not found');
    }

    const filePath = path.join(this.filesDir, existingFile);

    // 从文件名中提取原始文件名（格式：{fileHash}-{originalFilename}）
    const originalFilename = existingFile.substring(fileHash.length + 1);

    // 如果没有通过查询参数提供filename，则使用从文件名中提取的原始文件名
    const actualFilename =
      filename && filename !== 'undefined' ? filename : originalFilename;

    // 获取文件信息
    const stat = await fs.stat(filePath);
    const fileSize = stat.size;

    // 设置通用响应头
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${encodeURIComponent(actualFilename)}`,
    );
    res.setHeader('Accept-Ranges', 'bytes'); // 告诉客户端支持范围请求

    // 检查是否是范围请求
    const rangeHeader = req.headers.range;

    if (rangeHeader) {
      // 解析范围请求头
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // 验证请求范围是否有效
      if (start >= fileSize || end >= fileSize || start > end) {
        // 请求范围无效
        res.status(416); // Range Not Satisfiable
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      // 计算要发送的内容长度
      const chunkSize = end - start + 1;

      // 设置范围响应的头信息
      res.status(206); // Partial Content
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize);

      // 创建文件的范围读取流
      const fileStream = fs.createReadStream(filePath, { start, end });
      fileStream.pipe(res);
    } else {
      // 非范围请求，发送整个文件
      res.setHeader('Content-Length', fileSize);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    }
  }
}
