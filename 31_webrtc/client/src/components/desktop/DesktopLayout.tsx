import { useState } from 'react';
import { DesktopHeader } from './DesktopHeader';
import { FileUpload } from '../shared/FileUpload';
import { TransferRecord } from '../shared/TransferRecord';
import { ControlPanel } from '../shared/ControlPanel';
import { ICEServerManager } from '../shared/ICEServerManager';
import { RoomManager } from '../shared/RoomManager';
import { DeviceList } from '../shared/DeviceList';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Settings, Home, Video } from 'lucide-react';
import { ConnectionState, ExtendedClient, FileTransfer } from '@/types/webRTC';

interface DesktopLayoutProps {
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

export function DesktopLayout({
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
}: DesktopLayoutProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'video' | 'settings'>(
    'home',
  );
  const [clientName, setClientName] = useState('');

  return (
    <div className="min-h-screen bg-background">
      <DesktopHeader
        connectionState={connectionState}
        displayClients={displayClients}
      />

      {connectionState.error && (
        <div className="container px-6 pt-4">
          <Alert className="w-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{connectionState.error}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-80 border-r bg-muted/30 p-6 space-y-6">
          <RoomManager isConnected={connectionState.isConnected} />

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
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* Tab Navigation */}
          <div className="border-b">
            <div className="px-6 py-3">
              <div className="flex space-x-1">
                <Button
                  variant={activeTab === 'home' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('home')}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  文件传输
                </Button>
                <Button
                  variant={activeTab === 'video' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('video')}
                  className="flex items-center gap-2"
                >
                  <Video className="h-4 w-4" />
                  视频通话
                </Button>
                <Button
                  variant={activeTab === 'settings' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('settings')}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  服务器设置
                </Button>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6">
            {activeTab === 'home' && (
              <div className="space-y-6">
                <FileUpload
                  selectedFile={selectedFile}
                  onFileSelect={onFileSelect}
                  onFileClear={onFileClear}
                  isMobile={false}
                />

                <TransferRecord
                  transfers={transfers}
                  onDownload={onDownloadFile}
                  onRemove={onRemoveTransfer}
                  onPause={onPauseTransfer}
                  onResume={onResumeTransfer}
                  onCancel={onCancelTransfer}
                  onClearAll={onClearTransfers}
                  isMobile={false}
                />
              </div>
            )}

            {activeTab === 'video' && (
              <div className="space-y-6">
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
                        <p className="text-muted-foreground">
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
                        <p className="text-muted-foreground">
                          请先连接到服务器以使用视频通话功能
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'settings' && (
              <ICEServerManager serverUrl={process.env.HTTP_HOST} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
