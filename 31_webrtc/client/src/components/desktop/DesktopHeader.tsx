import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import { ConnectionState, ExtendedClient } from '@/types/webRTC';

interface DesktopHeaderProps {
  connectionState: ConnectionState;
  displayClients: ExtendedClient[];
  title?: string;
  showConnectionCount?: boolean;
}

export function DesktopHeader({
  connectionState,
  displayClients,
  title = '局域网文件传输',
  showConnectionCount = true,
}: DesktopHeaderProps) {
  const connectedCount = displayClients.length - 1; // 减去本设备

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex items-center gap-4">
          {connectionState.isConnected ? (
            <Badge variant="default" className="gap-1">
              <Wifi className="w-4 h-4" />
              {showConnectionCount
                ? `已连接 (${connectedCount} 个其他客户端在线)`
                : `${connectedCount}`}
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <WifiOff className="w-4 h-4" />
              {showConnectionCount ? '未连接' : '离线'}
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
}
