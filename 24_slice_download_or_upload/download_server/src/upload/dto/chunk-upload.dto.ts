import { z } from 'zod';

// 首先定义类型接口

// zod schema，使用类型注解
export const ChunkUploadSchema = z.object({
  fileHash: z.string().min(1, '文件哈希不能为空'), // 文件的唯一标识（通常是MD5值）
  chunkHash: z.string().min(1, '分片哈希不能为空'), // 分片的唯一标识（通常是MD5值）
  filename: z.string().min(1, '文件名不能为空'), // 原始文件名
  chunkIndex: z.coerce.number().int().min(0, '分片索引必须为非负整数'), // 自动将字符串转换为数字
  chunkTotal: z.coerce.number().int().positive('分片总数必须为正整数'), // 自动将字符串转换为数字
  chunkSize: z.coerce.number().int().positive('分片大小必须为正整数'), // 自动将字符串转换为数字
  fileSize: z.coerce.number().int().positive('文件大小必须为正整数'), // 自动将字符串转换为数字
  fileType: z.string().optional(), // 文件类型，可选
});
// 导出类型
export type ChunkUploadDto = z.infer<typeof ChunkUploadSchema>;
