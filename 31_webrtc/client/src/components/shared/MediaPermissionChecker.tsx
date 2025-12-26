import React, { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Camera,
  Mic,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  checkMediaPermissions,
  getMediaDiagnostics,
  checkWebRTCSupport,
} from '../../lib/mediaPermissions';
import type { MediaPermissionResult } from '../../lib/mediaPermissions';
import { toast } from '../../lib/toast';

interface MediaPermissionCheckerProps {
  onPermissionGranted?: () => void;
  showDiagnostics?: boolean;
}

export const MediaPermissionChecker: React.FC<MediaPermissionCheckerProps> = ({
  onPermissionGranted,
  showDiagnostics = false,
}) => {
  const [permissionStatus, setPermissionStatus] =
    useState<MediaPermissionResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const checkPermissions = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await checkMediaPermissions();
      setPermissionStatus(result);

      if (showDiagnostics) {
        const diag = await getMediaDiagnostics();
        setDiagnostics(diag);
        console.log('媒体诊断信息:', diag);
      }

      if (result.granted) {
        toast.success('媒体权限检查通过');
        onPermissionGranted?.();
      } else {
        toast.error(result.error || '媒体权限检查失败');
      }
    } catch (error) {
      console.error('权限检查失败:', error);
      toast.error('权限检查过程中发生错误');
    } finally {
      setIsChecking(false);
    }
  }, [onPermissionGranted, showDiagnostics]);

  const getStatusIcon = () => {
    if (isChecking) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (!permissionStatus) return <Shield className="h-4 w-4" />;
    if (permissionStatus.granted)
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusText = () => {
    if (isChecking) return '检查中...';
    if (!permissionStatus) return '点击检查媒体权限';
    if (permissionStatus.granted) return '权限已获取';
    return '权限被拒绝';
  };

  const getStatusVariant = (): 'default' | 'secondary' | 'destructive' => {
    if (!permissionStatus || isChecking) return 'default';
    return permissionStatus.granted ? 'secondary' : 'destructive';
  };

  const renderWebRTCSupport = () => {
    if (!diagnostics?.webRTCSupport) return null;

    const support = diagnostics.webRTCSupport;
    return (
      <div className="space-y-2">
        <h4 className="font-medium flex items-center gap-2">
          <Camera className="h-4 w-4" />
          WebRTC 支持状态
        </h4>
        <div className="space-y-1">
          {support.supported ? (
            <Badge variant="secondary" className="text-green-700 bg-green-100">
              <CheckCircle className="h-3 w-3 mr-1" />
              支持 WebRTC
            </Badge>
          ) : (
            <div className="space-y-1">
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                不支持 WebRTC
              </Badge>
              <div className="text-sm text-muted-foreground">
                问题:
                <ul className="list-disc list-inside ml-2">
                  {support.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDeviceInfo = () => {
    if (!diagnostics?.devices) return null;

    const devices = diagnostics.devices;
    return (
      <div className="space-y-2">
        <h4 className="font-medium flex items-center gap-2">
          <Mic className="h-4 w-4" />
          设备信息
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Badge variant={devices.hasCamera ? 'secondary' : 'destructive'}>
              <Camera className="h-3 w-3 mr-1" />
              摄像头: {devices.cameraCount}个
            </Badge>
          </div>
          <div>
            <Badge
              variant={devices.hasMicrophone ? 'secondary' : 'destructive'}
            >
              <Mic className="h-3 w-3 mr-1" />
              麦克风: {devices.microphoneCount}个
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  const renderEnvironmentInfo = () => {
    if (!diagnostics?.environment) return null;

    const env = diagnostics.environment;
    return (
      <div className="space-y-2">
        <h4 className="font-medium flex items-center gap-2">
          <Shield className="h-4 w-4" />
          环境信息
        </h4>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div>协议: {env.protocol}</div>
          <div>主机: {env.hostname}</div>
          <div>
            安全上下文:
            <Badge
              variant={env.isSecureContext ? 'secondary' : 'destructive'}
              className="ml-1"
            >
              {env.isSecureContext ? '是' : '否'}
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          媒体权限检查
          <Badge variant={getStatusVariant()}>{getStatusText()}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={checkPermissions}
          disabled={isChecking}
          className="w-full"
        >
          {isChecking ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              检查中...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              检查媒体权限
            </>
          )}
        </Button>

        {permissionStatus && !permissionStatus.granted && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div>{permissionStatus.error}</div>
                {permissionStatus.details && (
                  <details className="text-xs">
                    <summary>详细信息</summary>
                    <div className="mt-1">{permissionStatus.details}</div>
                  </details>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {permissionStatus?.granted && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              摄像头和麦克风权限已获取，可以进行视频通话
            </AlertDescription>
          </Alert>
        )}

        {showDiagnostics && diagnostics && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium flex items-center gap-2">
              <Info className="h-4 w-4" />
              诊断信息
            </h3>
            {renderWebRTCSupport()}
            {renderDeviceInfo()}
            {renderEnvironmentInfo()}
          </div>
        )}

        {!diagnostics?.webRTCSupport?.supported && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              您的浏览器或环境不支持WebRTC视频通话功能。请使用Chrome、Firefox、Safari等现代浏览器，并确保在HTTPS环境下访问。
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default MediaPermissionChecker;
