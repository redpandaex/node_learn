export interface ICEServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
  credentialType?: 'password' | 'oauth';
}

export interface ServerConfig {
  iceServers: ICEServerConfig[];
  customStunServers: ICEServerConfig[];
  customTurnServers: ICEServerConfig[];
}

export interface ConfigRequest {
  type: 'add' | 'remove' | 'update' | 'reset';
  serverType: 'stun' | 'turn';
  server?: ICEServerConfig;
  index?: number;
}
