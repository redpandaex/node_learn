import { z } from 'zod';
import { CreateUploadSchema } from './create-upload.dto';

// zod schema - 使CreateUploadSchema的所有字段可选
export const UpdateUploadSchema = CreateUploadSchema.partial();

// 导出类型
export type UpdateUploadDto = z.infer<typeof UpdateUploadSchema>;
