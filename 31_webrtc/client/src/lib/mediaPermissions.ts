export interface MediaPermissionResult {
  granted: boolean;
  error?: string;
  errorType?:
    | 'NotAllowedError'
    | 'NotFoundError'
    | 'NotSupportedError'
    | 'SecurityError'
    | 'Other';
  details?: string;
}

export interface MediaDevicesInfo {
  hasCamera: boolean;
  hasMicrophone: boolean;
  cameraCount: number;
  microphoneCount: number;
  devices: MediaDeviceInfo[];
}

/**
 * 检查浏览器是否支持WebRTC和媒体设备访问
 */
export const checkWebRTCSupport = (): {
  supported: boolean;
  issues: string[];
} => {
  const issues: string[] = [];

  // 检查基本WebRTC支持
  if (!window.RTCPeerConnection) {
    issues.push('浏览器不支持WebRTC (RTCPeerConnection)');
  }

  if (!navigator.mediaDevices) {
    issues.push('浏览器不支持MediaDevices API');
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    issues.push('浏览器不支持getUserMedia');
  }

  // 检查是否在安全上下文中 (HTTPS 或 localhost)
  if (
    location.protocol !== 'https:' &&
    location.hostname !== 'localhost' &&
    location.hostname !== '127.0.0.1'
  ) {
    issues.push('getUserMedia 需要在HTTPS环境或localhost中使用');
  }

  return {
    supported: issues.length === 0,
    issues,
  };
};

/**
 * 检查媒体设备权限状态
 */
export const checkMediaPermissions =
  async (): Promise<MediaPermissionResult> => {
    try {
      // 先检查WebRTC支持
      const support = checkWebRTCSupport();
      if (!support.supported) {
        return {
          granted: false,
          error: support.issues.join('; '),
          errorType: 'NotSupportedError',
          details: '浏览器不支持WebRTC或不在安全上下文中',
        };
      }

      // 检查权限API支持
      if (navigator.permissions) {
        try {
          const cameraPermission = await navigator.permissions.query({
            name: 'camera' as PermissionName,
          });
          const micPermission = await navigator.permissions.query({
            name: 'microphone' as PermissionName,
          });

          if (
            cameraPermission.state === 'denied' ||
            micPermission.state === 'denied'
          ) {
            return {
              granted: false,
              error: '摄像头或麦克风权限被拒绝',
              errorType: 'NotAllowedError',
              details: `摄像头权限: ${cameraPermission.state}, 麦克风权限: ${micPermission.state}`,
            };
          }
        } catch (error) {
          console.warn('无法查询权限状态:', error);
        }
      }

      // 尝试获取媒体流进行实际权限检查
      let testStream: MediaStream | null = null;
      try {
        testStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
          audio: true,
        });

        // 权限获取成功
        return {
          granted: true,
          details: '媒体权限检查通过',
        };
      } catch (error) {
        const err = error as DOMException;
        let errorType: MediaPermissionResult['errorType'] = 'Other';
        let userFriendlyMessage = '未知错误';

        switch (err.name) {
          case 'NotAllowedError':
            errorType = 'NotAllowedError';
            userFriendlyMessage =
              '用户拒绝了摄像头/麦克风权限，请在浏览器设置中允许访问';
            break;
          case 'NotFoundError':
            errorType = 'NotFoundError';
            userFriendlyMessage = '未找到摄像头或麦克风设备，请检查设备连接';
            break;
          case 'NotReadableError':
            errorType = 'Other';
            userFriendlyMessage =
              '设备正被其他程序占用，请关闭其他使用摄像头的应用';
            break;
          case 'SecurityError':
            errorType = 'SecurityError';
            userFriendlyMessage =
              '安全策略阻止了媒体访问，请确保在HTTPS环境下使用';
            break;
          case 'AbortError':
            errorType = 'Other';
            userFriendlyMessage = '媒体获取被中断';
            break;
          case 'NotSupportedError':
            errorType = 'NotSupportedError';
            userFriendlyMessage = '浏览器不支持请求的媒体类型';
            break;
          default:
            userFriendlyMessage = `媒体访问失败: ${err.message}`;
        }

        return {
          granted: false,
          error: userFriendlyMessage,
          errorType,
          details: `错误代码: ${err.name}, 原始消息: ${err.message}`,
        };
      } finally {
        // 清理测试流
        if (testStream) {
          testStream.getTracks().forEach((track) => track.stop());
        }
      }
    } catch (error) {
      return {
        granted: false,
        error: '权限检查过程中发生错误',
        errorType: 'Other',
        details: `${error}`,
      };
    }
  };

/**
 * 获取可用媒体设备信息
 */
export const getMediaDevicesInfo = async (): Promise<MediaDevicesInfo> => {
  const info: MediaDevicesInfo = {
    hasCamera: false,
    hasMicrophone: false,
    cameraCount: 0,
    microphoneCount: 0,
    devices: [],
  };

  try {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return info;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    info.devices = devices;

    for (const device of devices) {
      if (device.kind === 'videoinput') {
        info.hasCamera = true;
        info.cameraCount++;
      } else if (device.kind === 'audioinput') {
        info.hasMicrophone = true;
        info.microphoneCount++;
      }
    }
  } catch (error) {
    console.error('获取设备信息失败:', error);
  }

  return info;
};

/**
 * 获取详细的媒体诊断信息
 */
export const getMediaDiagnostics = async (): Promise<{
  webRTCSupport: ReturnType<typeof checkWebRTCSupport>;
  permissions: MediaPermissionResult;
  devices: MediaDevicesInfo;
  environment: {
    isSecureContext: boolean;
    protocol: string;
    hostname: string;
    userAgent: string;
  };
}> => {
  const [webRTCSupport, permissions, devices] = await Promise.all([
    checkWebRTCSupport(),
    checkMediaPermissions(),
    getMediaDevicesInfo(),
  ]);

  return {
    webRTCSupport,
    permissions,
    devices,
    environment: {
      isSecureContext: window.isSecureContext,
      protocol: location.protocol,
      hostname: location.hostname,
      userAgent: navigator.userAgent,
    },
  };
};

/**
 * 尝试获取用户媒体流，带有详细错误信息
 */
export const getUserMediaWithDiagnostics = async (
  constraints: MediaStreamConstraints,
): Promise<{
  stream?: MediaStream;
  error?: string;
  diagnostics?:
    | MediaPermissionResult
    | Awaited<ReturnType<typeof getMediaDiagnostics>>;
}> => {
  // 先进行权限检查
  const permissionResult = await checkMediaPermissions();

  if (!permissionResult.granted) {
    return {
      error: permissionResult.error,
      diagnostics: permissionResult,
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return { stream };
  } catch (error) {
    const err = error as DOMException;
    const diagnostics = await getMediaDiagnostics();

    let userFriendlyError = '';
    switch (err.name) {
      case 'NotAllowedError':
        userFriendlyError =
          '摄像头/麦克风权限被拒绝。请点击地址栏中的摄像头图标，选择"始终允许"';
        break;
      case 'NotFoundError':
        userFriendlyError = '未找到摄像头或麦克风。请检查设备是否正确连接';
        break;
      case 'NotReadableError':
        userFriendlyError = '设备正被占用。请关闭其他使用摄像头/麦克风的程序';
        break;
      case 'SecurityError':
        userFriendlyError =
          '安全限制。请确保在HTTPS环境下使用，或使用localhost';
        break;
      default:
        userFriendlyError = `获取媒体流失败: ${err.message}`;
    }

    return {
      error: userFriendlyError,
      diagnostics,
    };
  }
};
