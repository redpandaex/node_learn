import { WebSocket } from 'ws';

export interface Client {
  id: string;
  name: string;
  ws: WebSocket;
  connected: boolean;
  lastSeen: number;
  ip: string;
  userAgent?: string;
  roomId?: string; // 添加房间ID
}

export interface ClientInfo {
  id: string;
  name: string;
  ip: string;
  connected: boolean;
  lastSeen: string;
  userAgent?: string;
}

export interface RegisterMessage {
  type: 'register';
  name?: string;
  roomId?: string;
}

export interface SignalingMessage {
  type:
    | 'offer'
    | 'answer'
    | 'ice-candidate'
    | 'call-invite'
    | 'call-accept'
    | 'call-reject'
    | 'call-end'
    | 'call-cancel';
  targetId: string;
  fromId: string;
  [key: string]: any;
}

export interface VideoCallInviteMessage extends SignalingMessage {
  type: 'call-invite';
  fromName: string;
  callId: string;
}

export interface VideoCallAcceptMessage extends SignalingMessage {
  type: 'call-accept';
  callId: string;
}

export interface VideoCallRejectMessage extends SignalingMessage {
  type: 'call-reject';
  callId: string;
  reason?: string;
}

export interface VideoCallEndMessage extends SignalingMessage {
  type: 'call-end';
  callId: string;
}

export interface VideoCallCancelMessage extends SignalingMessage {
  type: 'call-cancel';
  callId: string;
}

export interface DisconnectMessage {
  type: 'disconnect';
  clientId: string;
}

export type WebSocketMessage =
  | RegisterMessage
  | SignalingMessage
  | DisconnectMessage
  | VideoCallInviteMessage
  | VideoCallAcceptMessage
  | VideoCallRejectMessage
  | VideoCallEndMessage
  | VideoCallCancelMessage;
