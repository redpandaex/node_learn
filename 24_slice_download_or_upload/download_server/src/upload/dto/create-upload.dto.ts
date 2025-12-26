import { z } from 'zod';

// zod schema
export const CreateUploadSchema = z.object({
  // 添加你需要的字段
});

// 导出类型
export type CreateUploadDto = z.infer<typeof CreateUploadSchema>;
