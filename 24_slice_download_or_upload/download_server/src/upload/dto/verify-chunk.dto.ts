import { z } from 'zod';

// zod schema
export const VerifyChunkSchema = z.object({
  fileHash: z.string().min(1, '文件哈希不能为空'), // 文件的唯一标识（MD5）
  filename: z.string().min(1, '文件名不能为空'), // 文件名
  fileSize: z.number().int().positive('文件大小必须为正整数'), // 文件大小
  chunkSize: z.number().int().positive('分片大小必须为正整数'), // 分片大小
  chunkTotal: z.number().int().positive('分片总数必须为正整数'), // 分片总数
  fileType: z.string().optional(), // 文件类型，可选
});

// 导出类型
export type VerifyChunkDto = z.infer<typeof VerifyChunkSchema>;
