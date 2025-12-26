import { processFile } from './fileProcessor';
import { verifyChunk, uploadChunk, mergeChunks } from './apiService';
import { StorageManager } from './storageManager';
import {
  taskStatusMap,
  verifyStatusMap,
  DEFAULT_CHUNK_SIZE,
  TaskStatus,
} from './constants';
import { UploadTask, UploadQueueCbType } from './types';
import { HashType } from '../wasm/wasm-hash';

/**
 * 上传队列类，管理上传任务
 */
export class UploadQueue {
  private tasks: Map<string, UploadTask> = new Map();
  private isProcessing: boolean = false;
  private concurrentLimit: number = 1; // 同时上传的任务数，默认为1（按顺序上传）

  // 事件回调
  private onTaskProgressCallback?: (taskId: string, progress: number) => void;
  private onTaskStatusChangeCallback?: (
    taskId: string,
    status: TaskStatus,
  ) => void;
  private onTaskCompleteCallback?: (taskId: string, url: string) => void;
  private onTaskErrorCallback?: (taskId: string, error: Error) => void;

  constructor(concurrentLimit: number = 1) {
    this.concurrentLimit = concurrentLimit;
    // 尝试从本地存储恢复上传任务
    this.tasks = StorageManager.restoreTasksFromStorage();
  }

  /**
   * 设置回调函数
   */
  public setCallbacks({
    onProgress,
    onStatusChange,
    onComplete,
    onError,
  }: UploadQueueCbType) {
    this.onTaskProgressCallback = onProgress;
    this.onTaskStatusChangeCallback = onStatusChange;
    this.onTaskCompleteCallback = onComplete;
    this.onTaskErrorCallback = onError;
  }

  /**
   * 删除任务
   */
  public removeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    // 如果任务正在处理中，先中断上传
    if (task.status === taskStatusMap.PROCESSING && task.abortController) {
      task.abortController.abort();
    }

    // 从队列中移除任务
    this.tasks.delete(taskId);

    // 保存任务状态
    StorageManager.saveTasksToStorage(this.tasks);

    // 尝试处理队列
    this.processQueue();

    return true;
  }

  /**
   * 获取当前任务
   */
  public getTask(taskId: string): UploadTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取任务状态
   */
  public getTaskStatus(taskId: string): TaskStatus | undefined {
    return this.tasks.get(taskId)?.status;
  }

  /**
   * 获取任务进度
   */
  public getTaskProgress(taskId: string): number {
    return this.tasks.get(taskId)?.progress || 0;
  }

  /**
   * 获取所有任务
   */
  public getAllTasks(): UploadTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 添加上传任务
   */
  public async addTask(
    file: File,
    chunkSize: number = DEFAULT_CHUNK_SIZE,
    onHashProgress?: (progress: number, status: string) => void,
    hashType: HashType = 'blake3',
  ): Promise<string> {
    // webWorker会导致一部分File数据丢失
    const fileName = file.name;
    const fileSize = file.size;
    const fileType = file.type;
    console.log('[debug] addTask fileSize:', fileSize);
    // 处理文件，计算哈希并分块
    const start = performance.now();
    const { fileHash, chunks } = await processFile(
      file,
      chunkSize,
      true,
      onHashProgress,
      hashType, // 传递哈希算法类型
    );
    const end = performance.now();
    console.log(
      '[debug] 文件分片完成',
      fileHash,
      chunks,
      this.tasks,
      this.tasks.has(fileHash),
      `耗时：${end - start}ms`,
      `哈希算法：${hashType}`,
    );
    const taskId = fileHash;

    let task: UploadTask;

    // 检查是否已存在相同的任务
    if (this.tasks.has(taskId)) {
      task = this.tasks.get(taskId)!;
    } else {
      // 创建新任务
      task = {
        id: taskId,
        file,
        fileHash,
        fileName,
        fileSize,
        fileType,
        chunkSize,
        chunks,
        uploadedChunks: Array(chunks.length).fill(false),
        currentChunkIndex: 0,
        status: taskStatusMap.PENDING,
        progress: 0,
      };
    }
    console.log('[debug] verify start task:', task);
    // 验证文件上传状态并更新任务信息
    await this.verifyAndUpdateTask(task);

    // 将任务添加到队列
    this.tasks.set(taskId, task);

    // 保存任务状态
    StorageManager.saveTasksToStorage(this.tasks);

    // 尝试开始处理队列
    this.processQueue();

    return taskId;
  }

  /**
   * 暂停任务
   */
  public pauseTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === taskStatusMap.PROCESSING) {
      if (task.abortController) {
        task.abortController.abort();
        task.abortController = undefined;
      }

      task.status = taskStatusMap.PAUSED;
      this.triggerStatusCallback(taskId, task.status);
      StorageManager.saveTasksToStorage(this.tasks);
      this.processQueue();

      return true;
    } else if (task.status === taskStatusMap.PENDING) {
      task.status = taskStatusMap.PAUSED;
      this.triggerStatusCallback(taskId, task.status);
      StorageManager.saveTasksToStorage(this.tasks);

      return true;
    }

    return false;
  }

  /**
   * 恢复任务
   */
  public resumeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== taskStatusMap.PAUSED) return false;

    // 将任务状态设置为等待处理
    task.status = taskStatusMap.PENDING;
    this.triggerStatusCallback(taskId, task.status);
    StorageManager.saveTasksToStorage(this.tasks);

    // 尝试处理队列
    this.processQueue();

    return true;
  }

  /**
   * 验证文件上传状态并更新任务信息
   */
  private async verifyAndUpdateTask(task: UploadTask): Promise<void> {
    try {
      const { fileHash, fileName, fileSize, fileType, chunkSize } = task;
      console.log('[debug] verifyAndUpdateTask fileSize ', fileSize);
      const verifyResult = await verifyChunk({
        fileHash,
        fileName,
        fileSize,
        fileType,
        chunkSize,
      });

      if (!verifyResult) return;

      // 更新已上传的分片信息
      if (
        verifyResult.status === verifyStatusMap.SUCCESS ||
        verifyResult.status === verifyStatusMap.READY
      ) {
        // 文件已完全上传，或分片全部上传但是未合并
        task.uploadedChunks.fill(true);
        task.progress = 100;

        if (verifyResult.status === verifyStatusMap.SUCCESS) {
          task.status = taskStatusMap.COMPLETED;
          if (verifyResult.url) {
            this.triggerCompleteCallback(task.id, verifyResult.url);
          }
        } else {
          // 已上传所有分片但未合并，需要继续处理
          task.status = taskStatusMap.PENDING;
        }
      } else if (verifyResult.status === verifyStatusMap.PARTIAL) {
        // 部分上传
        verifyResult.uploadedChunkIndexes.forEach((index: number) => {
          task.uploadedChunks[index] = true;
        });

        // 更新进度
        const uploadedCount = task.uploadedChunks.filter(Boolean).length;
        task.progress = (uploadedCount / task.chunks.length) * 100;

        // 寻找第一个未上传的分片作为当前索引
        task.currentChunkIndex = task.uploadedChunks.findIndex(
          (uploaded) => !uploaded,
        );
        if (task.currentChunkIndex === -1) {
          task.currentChunkIndex = 0; // 所有分片都已上传，但可能需要合并
        }
      }
    } catch (error) {
      console.error('验证文件上传状态失败:', error);
      // 验证失败，默认全部重新上传
    }
  }

  /**
   * 处理上传队列
   */
  private async processQueue() {
    // 如果已经在处理队列，则退出
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      // 获取所有待处理的任务
      const pendingTasks = Array.from(this.tasks.values()).filter(
        (task) => task.status === taskStatusMap.PENDING,
      );

      // 如果没有待处理的任务，退出
      if (pendingTasks.length === 0) {
        this.isProcessing = false;
        return;
      }

      // 处理并发限制数量的任务
      const tasksToProcess = pendingTasks.slice(0, this.concurrentLimit);

      // 处理选定的任务
      await Promise.all(tasksToProcess.map((task) => this.processTask(task)));

      // 处理完成后，尝试处理队列中的下一批任务
      this.isProcessing = false;
      this.processQueue();
    } catch (error) {
      console.error('处理上传队列时出错:', error);
      this.isProcessing = false;
    }
  }

  /**
   * 处理单个上传任务
   */
  private async processTask(task: UploadTask) {
    // 更新任务状态
    task.status = taskStatusMap.PROCESSING;
    this.triggerStatusCallback(task.id, task.status);

    try {
      // 1. 若所有分片都已上传，则尝试合并
      if (task.uploadedChunks.every(Boolean)) {
        await this.mergeTaskChunks(task);
        return;
      }

      // 2. 分片只上传了部分，则按照顺序继续上传未上传的分片
      await this.uploadRemainingChunks(task);

      // 3. 上传完成后，检查是否所有分片都已上传
      if (
        task.status === taskStatusMap.PROCESSING &&
        task.uploadedChunks.every(Boolean)
      ) {
        await this.mergeTaskChunks(task);
      }
    } catch (error) {
      console.error(`处理任务 ${task.id} 时出错:`, error);
      this.handleTaskError(task, error as Error);
    }

    // 保存任务状态
    StorageManager.saveTasksToStorage(this.tasks);
  }

  /**
   * 上传剩余的分片
   */
  private async uploadRemainingChunks(task: UploadTask): Promise<void> {
    while (task.currentChunkIndex < task.chunks.length) {
      // 检查任务是否被暂停
      if (task.status !== taskStatusMap.PROCESSING) {
        break;
      }

      // 如果当前分片已上传，跳过
      if (task.uploadedChunks[task.currentChunkIndex]) {
        task.currentChunkIndex++;
        continue;
      }

      // 创建 AbortController 用于取消请求
      task.abortController = new AbortController();

      // 上传当前分片
      const success = await uploadChunk({
        file: task.file,
        chunkSize: task.chunkSize,
        chunkIndex: task.currentChunkIndex,
        chunkHash: task.chunks[task.currentChunkIndex].hash,
        fileHash: task.fileHash,
        filename: task.file.name,
        abortController: task.abortController,
        onProgress: (chunkProgress) => {
          this.updateTaskProgress(task, chunkProgress);
        },
      });

      // 清除 AbortController
      task.abortController = undefined;

      if (success) {
        // 标记当前分片为已上传
        task.uploadedChunks[task.currentChunkIndex] = true;

        // 更新进度
        const uploadedChunks = task.uploadedChunks.filter(Boolean).length;
        task.progress = (uploadedChunks / task.chunks.length) * 100;

        // 保存任务状态
        StorageManager.saveTasksToStorage(this.tasks);

        // 移动到下一个分片
        task.currentChunkIndex++;
      } else if (task.status === taskStatusMap.PROCESSING) {
        // 如果上传失败且不是由于暂停导致的，标记为错误
        const error = new Error(`分片 ${task.currentChunkIndex} 上传失败`);
        this.handleTaskError(task, error);
        return;
      } else {
        // 任务被暂停，退出循环
        break;
      }
    }
  }

  /**
   * 合并任务分片
   */
  private async mergeTaskChunks(task: UploadTask): Promise<void> {
    const url = await mergeChunks({
      fileHash: task.fileHash,
      filename: task.file.name,
    });

    // 更新任务状态
    task.status = taskStatusMap.COMPLETED;
    task.progress = 100;

    // 触发回调
    this.triggerProgressCallback(task.id, 100);
    this.triggerStatusCallback(task.id, task.status);
    this.triggerCompleteCallback(task.id, url);
  }

  /**
   * 更新任务进度
   */
  private updateTaskProgress(task: UploadTask, chunkProgress: number): void {
    const uploadedChunks = task.uploadedChunks.filter(Boolean).length;
    const totalProgress =
      ((uploadedChunks + chunkProgress / 100) / task.chunks.length) * 100;

    task.progress = totalProgress;
    this.triggerProgressCallback(task.id, totalProgress);
  }

  /**
   * 处理任务错误
   */
  private handleTaskError(task: UploadTask, error: Error): void {
    task.status = taskStatusMap.ERROR;
    task.error = error;

    this.triggerStatusCallback(task.id, task.status);
    this.triggerErrorCallback(task.id, error);
  }

  /**
   * 触发进度回调
   */
  private triggerProgressCallback(taskId: string, progress: number): void {
    if (this.onTaskProgressCallback) {
      this.onTaskProgressCallback(taskId, progress);
    }
  }

  /**
   * 触发状态变更回调
   */
  private triggerStatusCallback(taskId: string, status: TaskStatus): void {
    if (this.onTaskStatusChangeCallback) {
      this.onTaskStatusChangeCallback(taskId, status);
    }
  }

  /**
   * 触发完成回调
   */
  private triggerCompleteCallback(taskId: string, url: string): void {
    if (this.onTaskCompleteCallback) {
      this.onTaskCompleteCallback(taskId, url);
    }
  }

  /**
   * 触发错误回调
   */
  private triggerErrorCallback(taskId: string, error: Error): void {
    if (this.onTaskErrorCallback) {
      this.onTaskErrorCallback(taskId, error);
    }
  }
}

// 全局上传队列实例
export const globalUploadQueue = new UploadQueue();

// 重新导出常量和类型
export {
  taskStatusMap,
  taskStatusTextMap,
  DEFAULT_CHUNK_SIZE,
} from './constants';
export type { TaskStatus } from './constants';
export { processFile } from './fileProcessor';
export { verifyChunk, uploadChunk, mergeChunks } from './apiService';
