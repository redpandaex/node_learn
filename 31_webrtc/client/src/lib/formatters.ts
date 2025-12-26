import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

// 配置dayjs
dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

/**
 * 格式化字节大小
 * @param bytes 字节数
 * @param decimals 小数位数，默认为2
 * @returns 格式化后的字符串，如 "1.23 MB"
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * 格式化字节数为人类可读格式（formatBytes的别名，保持向后兼容）
 * @param bytes 字节数
 * @returns 格式化后的字符串，如 "1.2 MB"
 */
export function formatFileSize(bytes: number): string {
  return formatBytes(bytes, 2);
}

/**
 * 格式化传输速度
 * @param bytesPerSecond 每秒字节数
 * @param decimals 小数位数，默认为1
 * @returns 格式化后的速度字符串，如 "1.2 MB/s"
 */
export function formatSpeed(
  bytesPerSecond: number,
  decimals: number = 1,
): string {
  if (bytesPerSecond === 0) return '0 B/s';

  const formatted = formatBytes(bytesPerSecond, decimals);
  return `${formatted}/s`;
}

/**
 * 格式化时间长度
 * @param seconds 秒数
 * @returns 格式化后的时间字符串，如 "1h 23m 45s"
 */
export function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined || seconds === null || !isFinite(seconds)) {
    return '--';
  }

  if (seconds < 0) return '0s';

  const dur = dayjs.duration(seconds, 'seconds');
  const hours = Math.floor(dur.asHours());
  const minutes = dur.minutes();
  const remainingSeconds = dur.seconds();

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${remainingSeconds}s`);
  }

  return parts.join(' ');
}

/**
 * 格式化时间（秒）为可读格式，formatTime函数的别名
 * @param seconds 秒数
 * @returns 格式化后的时间字符串，如 "1h 23m 45s"
 */
export function formatTime(seconds: number | undefined): string {
  return formatDuration(seconds);
}

/**
 * 格式化百分比
 * @param value 数值 (0-1 或 0-100)
 * @param decimals 小数位数，默认为1
 * @param isDecimal 输入值是否为小数形式 (0-1)，默认为true
 * @returns 格式化后的百分比字符串，如 "85.5%"
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  isDecimal: boolean = true,
): string {
  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * 格式化数字，添加千位分隔符
 * @param num 数字
 * @returns 格式化后的数字字符串，如 "1,234,567"
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * 格式化时间戳为可读的时间字符串
 * @param timestamp 时间戳 (毫秒)
 * @param includeTime 是否包含时间，默认为true
 * @returns 格式化后的时间字符串
 */
export function formatTimestamp(
  timestamp: number,
  includeTime: boolean = true,
): string {
  const date = new Date(timestamp);

  if (includeTime) {
    return date.toLocaleString();
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * 格式化相对时间
 * @param timestamp 时间戳 (毫秒)
 * @returns 相对时间字符串，如 "2分钟前"、"刚刚"
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return '刚刚';
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return formatTimestamp(timestamp, false);
  }
}

/**
 * 格式化文件类型显示名称
 * @param mimeType MIME类型
 * @param fileName 文件名（可选，用于提取扩展名）
 * @returns 用户友好的文件类型名称
 */
export function formatFileType(mimeType: string, fileName?: string): string {
  // 常见MIME类型映射
  const mimeTypeMap: Record<string, string> = {
    'application/pdf': 'PDF文档',
    'application/msword': 'Word文档',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      'Word文档',
    'application/vnd.ms-excel': 'Excel表格',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      'Excel表格',
    'application/vnd.ms-powerpoint': 'PowerPoint演示',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      'PowerPoint演示',
    'application/zip': 'ZIP压缩包',
    'application/x-rar-compressed': 'RAR压缩包',
    'application/x-7z-compressed': '7Z压缩包',
    'text/plain': '文本文件',
    'text/html': 'HTML文件',
    'text/css': 'CSS文件',
    'text/javascript': 'JavaScript文件',
    'application/json': 'JSON文件',
    'image/jpeg': 'JPEG图片',
    'image/png': 'PNG图片',
    'image/gif': 'GIF图片',
    'image/svg+xml': 'SVG图片',
    'image/webp': 'WebP图片',
    'video/mp4': 'MP4视频',
    'video/avi': 'AVI视频',
    'video/quicktime': 'MOV视频',
    'video/x-msvideo': 'AVI视频',
    'audio/mpeg': 'MP3音频',
    'audio/wav': 'WAV音频',
    'audio/ogg': 'OGG音频',
  };

  // 优先使用MIME类型映射
  if (mimeTypeMap[mimeType]) {
    return mimeTypeMap[mimeType];
  }

  // 如果有文件名，尝试从扩展名推断
  if (fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension) {
      const extensionMap: Record<string, string> = {
        txt: '文本文件',
        doc: 'Word文档',
        docx: 'Word文档',
        xls: 'Excel表格',
        xlsx: 'Excel表格',
        ppt: 'PowerPoint演示',
        pptx: 'PowerPoint演示',
        pdf: 'PDF文档',
        zip: 'ZIP压缩包',
        rar: 'RAR压缩包',
        '7z': '7Z压缩包',
        jpg: 'JPEG图片',
        jpeg: 'JPEG图片',
        png: 'PNG图片',
        gif: 'GIF图片',
        svg: 'SVG图片',
        webp: 'WebP图片',
        mp4: 'MP4视频',
        avi: 'AVI视频',
        mov: 'MOV视频',
        mp3: 'MP3音频',
        wav: 'WAV音频',
        ogg: 'OGG音频',
      };

      if (extensionMap[extension]) {
        return extensionMap[extension];
      }

      return `${extension.toUpperCase()}文件`;
    }
  }

  // 从MIME类型中提取主要类型
  const mainType = mimeType.split('/')[0];
  switch (mainType) {
    case 'text':
      return '文本文件';
    case 'image':
      return '图片文件';
    case 'video':
      return '视频文件';
    case 'audio':
      return '音频文件';
    case 'application':
      return '应用程序文件';
    default:
      return '未知文件';
  }
}

/**
 * 格式化传输状态显示文本
 * @param status 传输状态
 * @returns 用户友好的状态文本
 */
export function formatTransferStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '等待中',
    transferring: '传输中',
    completed: '已完成',
    failed: '传输失败',
    cancelled: '已取消',
    paused: '已暂停',
  };

  return statusMap[status] || status;
}

/**
 * 格式化传输方向显示文本
 * @param direction 传输方向
 * @returns 用户友好的方向文本
 */
export function formatTransferDirection(direction: string): string {
  const directionMap: Record<string, string> = {
    send: '发送',
    receive: '接收',
  };

  return directionMap[direction] || direction;
}

/**
 * 计算并格式化传输速度的变化趋势
 * @param currentSpeed 当前速度
 * @param previousSpeed 之前的速度
 * @returns 趋势信息对象
 */
export function formatSpeedTrend(
  currentSpeed: number,
  previousSpeed: number,
): {
  trend: 'up' | 'down' | 'stable';
  change: string;
  percentage: string;
} {
  if (previousSpeed === 0) {
    return {
      trend: 'stable',
      change: '0 B/s',
      percentage: '0%',
    };
  }

  const diff = currentSpeed - previousSpeed;
  const percentChange = Math.abs((diff / previousSpeed) * 100);

  let trend: 'up' | 'down' | 'stable';
  if (Math.abs(diff) < previousSpeed * 0.05) {
    // 5%以内认为是稳定
    trend = 'stable';
  } else if (diff > 0) {
    trend = 'up';
  } else {
    trend = 'down';
  }

  return {
    trend,
    change: formatSpeed(Math.abs(diff)),
    percentage: formatPercentage(percentChange / 100),
  };
}

/**
 * 格式化网络延迟显示
 * @param latency 延迟时间（毫秒）
 * @returns 格式化后的延迟显示，包含质量评级
 */
export function formatLatency(latency: number): {
  display: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  color: string;
} {
  const display = `${latency.toFixed(0)}ms`;

  let quality: 'excellent' | 'good' | 'fair' | 'poor';
  let color: string;

  if (latency < 50) {
    quality = 'excellent';
    color = '#22c55e'; // green
  } else if (latency < 100) {
    quality = 'good';
    color = '#84cc16'; // lime
  } else if (latency < 200) {
    quality = 'fair';
    color = '#f59e0b'; // amber
  } else {
    quality = 'poor';
    color = '#ef4444'; // red
  }

  return { display, quality, color };
}

/**
 * 格式化错误率显示
 * @param errorRate 错误率 (0-1)
 * @returns 格式化后的错误率显示，包含质量评级
 */
export function formatErrorRate(errorRate: number): {
  display: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  color: string;
} {
  const percentage = errorRate * 100;
  const display = `${percentage.toFixed(2)}%`;

  let quality: 'excellent' | 'good' | 'fair' | 'poor';
  let color: string;

  if (percentage < 0.1) {
    quality = 'excellent';
    color = '#22c55e'; // green
  } else if (percentage < 1) {
    quality = 'good';
    color = '#84cc16'; // lime
  } else if (percentage < 5) {
    quality = 'fair';
    color = '#f59e0b'; // amber
  } else {
    quality = 'poor';
    color = '#ef4444'; // red
  }

  return { display, quality, color };
}
