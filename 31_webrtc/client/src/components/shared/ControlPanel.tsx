import { ConnectionPanel } from './ConnectionPanel';
import { DeviceList } from './DeviceList';
import { ConnectionState, ExtendedClient } from '@/types/webRTC';

interface ControlPanelProps {
  connectionState: ConnectionState;
  displayClients: ExtendedClient[];
  selectedFile: File | null;
  clientName: string;
  onClientNameChange: (name: string) => void;
  onConnect: (clientName: string) => Promise<void>;
  onDisconnect: () => void;
  onSendFile: (targetId: string) => void;
  onVideoCall?: (targetId: string, targetName: string) => Promise<void>;
  isInCall?: boolean;
}

export function ControlPanel({
  connectionState,
  displayClients,
  selectedFile,
  clientName,
  onClientNameChange,
  onConnect,
  onDisconnect,
  onSendFile,
  onVideoCall,
  isInCall,
}: ControlPanelProps) {
  return (
    <div className="space-y-6">
      <ConnectionPanel
        connectionState={connectionState}
        clientName={clientName}
        onClientNameChange={onClientNameChange}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />

      {connectionState.isConnected && (
        <DeviceList
          displayClients={displayClients}
          onSendFile={onSendFile}
          onVideoCall={onVideoCall}
          selectedFile={selectedFile}
          isInCall={isInCall}
        />
      )}
    </div>
  );
}
