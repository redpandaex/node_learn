import { z } from 'zod';

// zod schema
export const MergeChunksSchema = z.object({
  fileHash: z.string().min(1, '文件哈希不能为空'), // 文件的唯一标识（MD5）
  filename: z.string().min(1, '文件名不能为空'), // 文件名
});

// 导出类型
export type MergeChunksDto = z.infer<typeof MergeChunksSchema>;
