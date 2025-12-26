import { Map2Enum } from './types';

// 默认分片大小 5MB
export const DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024;

// 任务状态枚举
export const taskStatusMap = {
  PENDING: 'pending', // 等待中
  PROCESSING: 'processing', // 处理中
  PAUSED: 'paused', // 已暂停
  COMPLETED: 'completed', // 已完成
  ERROR: 'error', // 错误
} as const;

export const taskStatusTextMap = {
  [taskStatusMap.PENDING]: '等待上传',
  [taskStatusMap.PROCESSING]: '上传中',
  [taskStatusMap.PAUSED]: '已暂停',
  [taskStatusMap.COMPLETED]: '上传完成',
  [taskStatusMap.ERROR]: '上传失败',
};

export type TaskStatus = Map2Enum<typeof taskStatusMap>;

// 验证状态枚举
export const verifyStatusMap = {
  /** 已完全上传 */
  SUCCESS: 'success',
  /** 上传了一部分 */
  PENDING: 'pending',
  /** 分片已上传,但是未合并 */
  READY: 'ready',
  /** 部分上传 */
  PARTIAL: 'partial',
} as const;

export type VerifyStatusEnum = Map2Enum<typeof verifyStatusMap>;
