import { UploadTask, SerializableTaskData } from './types';
import { taskStatusMap } from './constants';

/**
 * 本地存储管理器
 */
export class StorageManager {
  private static readonly STORAGE_KEY = 'uploadTasks';

  /**
   * 保存任务到本地存储
   */
  static saveTasksToStorage(tasks: Map<string, UploadTask>): void {
    try {
      // 创建可序列化的任务数据
      const tasksData = Array.from(tasks.entries()).map(([id, task]) => {
        // 排除不可序列化的属性
        console.log('[debug] id', id);
        const { file, chunks, ...serializableTask } = task;

        const taskData: SerializableTaskData = {
          ...serializableTask,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          chunksCount: chunks.length,
        };

        return taskData;
      });

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasksData));
    } catch (error) {
      console.error('保存任务状态到本地存储失败:', error);
    }
  }

  /**
   * 从本地存储恢复任务
   */
  static restoreTasksFromStorage(): Map<string, UploadTask> {
    const tasks = new Map<string, UploadTask>();

    try {
      const tasksData = localStorage.getItem(this.STORAGE_KEY);
      if (!tasksData) return tasks;

      const parsedTasks: SerializableTaskData[] = JSON.parse(tasksData);

      // 由于文件对象无法序列化，我们只保留任务ID和状态信息
      // 这里将恢复的任务标记为暂停状态，用户需要重新添加文件才能继续上传
      for (const taskData of parsedTasks) {
        // 保留原始状态，尤其是已完成的任务
        const originalStatus = taskData.status;

        const task: UploadTask = {
          ...taskData,
          file: new File([], taskData.fileName), // 仅占位，需要用户重新选择文件
          chunks: [], // 占位，需要重新处理文件
          status:
            // 如果任务原本是已完成状态，保持完成状态；否则设置为暂停状态
            originalStatus === taskStatusMap.COMPLETED
              ? taskStatusMap.COMPLETED
              : taskStatusMap.PAUSED,
        };

        tasks.set(taskData.id, task);
      }
    } catch (error) {
      console.error('从本地存储恢复任务失败:', error);
    }

    return tasks;
  }

  /**
   * 清除本地存储中的任务数据
   */
  static clearTasksFromStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('清除本地存储任务失败:', error);
    }
  }
}
