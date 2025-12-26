import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Menu, Wifi, WifiOff } from 'lucide-react';
import { ConnectionState, ExtendedClient } from '@/types/webRTC';

interface MobileHeaderProps {
  connectionState: ConnectionState;
  displayClients: ExtendedClient[];
  drawerVisible: boolean;
  setDrawerVisible: (visible: boolean) => void;
  children: React.ReactNode;
  title?: string;
}

export function MobileHeader({
  connectionState,
  displayClients,
  drawerVisible,
  setDrawerVisible,
  children,
  title = '文件传输',
}: MobileHeaderProps) {
  const connectedCount = displayClients.length - 1; // 减去本设备

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Sheet open={drawerVisible} onOpenChange={setDrawerVisible}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>控制面板</SheetTitle>
              </SheetHeader>
              <div className="mt-6">{children}</div>
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        <div>
          {connectionState.isConnected ? (
            <Badge variant="default" className="gap-1">
              <Wifi className="w-3 h-3" />
              {connectedCount}
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <WifiOff className="w-3 h-3" />
              离线
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
}
