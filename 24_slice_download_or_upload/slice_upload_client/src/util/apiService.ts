import request from './request';
import { AxiosError, AxiosRequestConfig } from 'axios';
import {
  AxiosResponseType,
  VerifyChunkParams,
  VerifyResponseType,
  MergeChunksParams,
  MergeResponseType,
  UploadChunkParams,
  RequestVerifyType,
} from './types';

/**
 * 验证文件上传状态，返回已上传的分片信息
 */
export const verifyChunk = async ({
  fileHash,
  fileName,
  fileSize,
  fileType,
  chunkSize,
}: VerifyChunkParams & {
  fileName: string;
  fileSize: number;
  fileType: string;
  chunkSize: number;
}): Promise<VerifyResponseType | void> => {
  try {
    // 计算总分片数
    const chunkTotal = Math.ceil(fileSize / chunkSize);

    console.log('[debug] verifyChunk fileSize', fileSize);

    const params: RequestVerifyType = {
      fileHash,
      filename: fileName,
      fileSize: Number(fileSize), // 确保是数字类型
      chunkSize: Number(chunkSize), // 确保是数字类型
      chunkTotal: Number(chunkTotal), // 确保是数字类型
      fileType: fileType,
    };

    const response = await request.post<AxiosResponseType<VerifyResponseType>>(
      '/verify',
      params,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    console.log('[debug] 验证文件完成', response);
    // 根据后端返回的数据结构直接返回结果
    return response.data.data;
  } catch (error) {
    // 增强错误日志
    if (error instanceof AxiosError) {
      console.error(
        '验证文件上传状态失败:',
        error.response?.data,
        error.message,
      );
    } else {
      console.error('验证文件上传状态失败:', error);
    }
    throw error;
  }
};

/**
 * 上传单个分片，支持取消
 */
export const uploadChunk = async ({
  file,
  chunkSize,
  chunkIndex,
  chunkHash,
  fileHash,
  filename,
  onProgress,
  abortController,
}: UploadChunkParams): Promise<boolean> => {
  const chunk = file.slice(
    chunkIndex * chunkSize,
    (chunkIndex + 1) * chunkSize,
  );

  // 计算总分片数
  const chunkTotal = Math.ceil(file.size / chunkSize);

  // 创建一个FormData用于文件上传
  const formData = new FormData();
  formData.append('file', chunk);
  formData.append('fileHash', fileHash);
  formData.append('chunkHash', chunkHash);
  formData.append('filename', filename);
  formData.append('chunkIndex', chunkIndex.toString());
  formData.append('chunkTotal', chunkTotal.toString());
  formData.append('chunkSize', chunkSize.toString());
  formData.append('fileSize', file.size.toString());
  formData.append('fileType', file.type || '');

  // 实际发送请求
  try {
    // 准备请求选项，包括可能的取消令牌
    const requestOptions: AxiosRequestConfig<unknown> = {};
    if (abortController) {
      requestOptions.signal = abortController.signal;
    }

    // 如果需要进度报告，使用axios的onUploadProgress
    if (onProgress) {
      requestOptions.onUploadProgress = (progressEvent) => {
        if (progressEvent.total) {
          const percentComplete =
            (progressEvent.loaded / progressEvent.total) * 100;
          onProgress(percentComplete);
        }
      };
    }

    const response = await request.post<
      AxiosResponseType<{
        chunkIndex: number;
        uploadedCount: number;
        chunkTotal: number;
      }>
    >('/chunk', formData, requestOptions);

    return response.status === 201;
  } catch (error) {
    // 区分取消操作和其他错误
    if (error instanceof AxiosError && error.name === 'AbortError') {
      console.log(`分片${chunkIndex}上传被取消`);
      return false;
    }

    console.error(`上传分片${chunkIndex}失败:`, error);
    return false;
  }
};

/**
 * 请求合并分片
 */
export const mergeChunks = async ({
  fileHash,
  filename,
}: MergeChunksParams): Promise<string> => {
  try {
    const response = await request.post<AxiosResponseType<MergeResponseType>>(
      '/merge',
      {
        fileHash,
        filename,
      },
    );

    return response.data.data.url || '';
  } catch (error) {
    console.error('合并分片失败:', error);
    throw error;
  }
};
