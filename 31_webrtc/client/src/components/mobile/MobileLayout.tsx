import { useState } from 'react';
import { MobileHeader } from './MobileHeader';
import { ControlPanel } from '../shared/ControlPanel';
import { FileUpload } from '../shared/FileUpload';
import { TransferRecord } from '../shared/TransferRecord';
import { ICEServerManager } from '../shared/ICEServerManager';
import { RoomManager } from '../shared/RoomManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Settings, Video } from 'lucide-react';
import { ConnectionState, ExtendedClient, FileTransfer } from '@/types/webRTC';
import { DeviceList } from '../shared/DeviceList';

interface MobileLayoutProps {
  connectionState: ConnectionState;
  displayClients: ExtendedClient[];
  selectedFile: File | null;
  transfers: FileTransfer[];
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  onConnect: (clientName: string) => Promise<void>;
  onDisconnect: () => void;
  onSendFile: (targetId: string) => void;
  onVideoCall?: (targetId: string, targetName: string) => Promise<void>;
  onDownloadFile: (transferId: string) => void;
  onRemoveTransfer: (transferId: string) => void;
  onPauseTransfer?: (transferId: string) => void;
  onResumeTransfer?: (transferId: string) => void;
  onCancelTransfer?: (transferId: string) => void;
  onClearTransfers: () => void;
  isInCall?: boolean;
}

export function MobileLayout({
  connectionState,
  displayClients,
  selectedFile,
  transfers,
  onFileSelect,
  onFileClear,
  onConnect,
  onDisconnect,
  onSendFile,
  onVideoCall,
  onDownloadFile,
  onRemoveTransfer,
  onPauseTransfer,
  onResumeTransfer,
  onCancelTransfer,
  onClearTransfers,
  isInCall,
}: MobileLayoutProps) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'video' | 'settings'>(
    'home',
  );
  const [clientName, setClientName] = useState('');

  const getTitle = () => {
    switch (activeTab) {
      case 'home':
        return '文件传输';
      case 'video':
        return '视频通话';
      case 'settings':
        return '服务器设置';
      default:
        return '文件传输';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader
        connectionState={connectionState}
        displayClients={displayClients}
        drawerVisible={drawerVisible}
        setDrawerVisible={setDrawerVisible}
        title={getTitle()}
      >
        <ControlPanel
          connectionState={connectionState}
          displayClients={displayClients}
          selectedFile={selectedFile}
          clientName={clientName}
          onClientNameChange={setClientName}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          onSendFile={onSendFile}
          onVideoCall={onVideoCall}
          isInCall={isInCall}
        />
      </MobileHeader>

      {/* Tab Navigation */}
      <div className="border-b bg-background">
        <div className="container px-4 py-2">
          <div className="flex space-x-1">
            <Button
              variant={activeTab === 'home' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2 flex-1"
            >
              <Home className="h-4 w-4" />
              传输
            </Button>
            <Button
              variant={activeTab === 'video' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('video')}
              className="flex items-center gap-2 flex-1"
            >
              <Video className="h-4 w-4" />
              通话
            </Button>
            <Button
              variant={activeTab === 'settings' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2 flex-1"
            >
              <Settings className="h-4 w-4" />
              设置
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <main className="flex-1 container px-4 py-6">
        {activeTab === 'home' && (
          <div className="space-y-6">
            <RoomManager isConnected={connectionState.isConnected} />

            <FileUpload
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
              onFileClear={onFileClear}
              isMobile={true}
            />

            <TransferRecord
              transfers={transfers}
              onDownload={onDownloadFile}
              onRemove={onRemoveTransfer}
              onPause={onPauseTransfer}
              onResume={onResumeTransfer}
              onCancel={onCancelTransfer}
              onClearAll={onClearTransfers}
              isMobile={true}
            />
          </div>
        )}

        {activeTab === 'video' && (
          <div className="space-y-6">
            <RoomManager isConnected={connectionState.isConnected} />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  视频通话
                </CardTitle>
              </CardHeader>
              <CardContent>
                {connectionState.isConnected ? (
                  <div className="space-y-4">
                    <p className="text-muted-foreground text-sm">
                      点击下方的视频通话按钮与其他设备进行视频通话
                    </p>
                    <DeviceList
                      displayClients={displayClients}
                      onSendFile={onSendFile}
                      onVideoCall={onVideoCall}
                      selectedFile={selectedFile}
                      isInCall={isInCall}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">
                      请先连接到服务器以使用视频通话功能
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <RoomManager isConnected={connectionState.isConnected} />
            <ICEServerManager serverUrl={process.env.HTTP_HOST} />
          </div>
        )}
      </main>
    </div>
  );
}
