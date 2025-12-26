export interface Client {
  id: string;
  name: string;
  ip?: string;
}

export interface ExtendedClient extends Client {
  isCurrentDevice?: boolean;
}

export interface FileTransfer {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  // 移除内存中的 chunks 数组，改用 IndexedDB 存储
  // chunks: ArrayBuffer[];
  receivedChunks: number;
  totalChunks: number;
  progress: number;
  status:
    | 'pending'
    | 'transferring'
    | 'completed'
    | 'failed'
    | 'assembling'
    | 'paused';
  direction: 'send' | 'receive';
  timestamp: number;
  // 新增速度检测相关字段
  startTime?: number;
  lastUpdateTime?: number;
  transferredBytes: number;
  speed: number; // 当前传输速度 (bytes/second)
  avgSpeed: number; // 平均传输速度 (bytes/second)
  estimatedTimeRemaining?: number; // 预估剩余时间 (seconds)
  // 新增：是否使用优化存储
  useOptimizedStorage?: boolean;
  // 新增：组装进度（0-100）
  assemblingProgress?: number;
  // 新增：暂停和多通道相关字段
  isPaused?: boolean;
  currentChunk?: number; // 当前处理的块索引
  channelCount?: number; // 使用的通道数量
  pausedAt?: number; // 暂停时间戳
  resumedAt?: number; // 恢复时间戳
}

export interface SignalingMessage {
  type:
    | 'register'
    | 'registered'
    | 'client-list'
    | 'offer'
    | 'answer'
    | 'ice-candidate'
    | 'disconnect'
    | 'call-invite'
    | 'call-accept'
    | 'call-reject'
    | 'call-end'
    | 'call-cancel';
  [key: string]: unknown;
}

// 视频通话相关类型定义
export interface VideoCallState {
  isInCall: boolean;
  isIncoming: boolean;
  callId: string | null;
  targetId: string | null;
  targetName: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  callStartTime: number | null;
  windowState: 'minimized' | 'normal' | 'maximized';
}

export interface VideoCallInviteMessage extends SignalingMessage {
  type: 'call-invite';
  fromId: string;
  fromName: string;
  targetId: string;
  callId: string;
}

export interface VideoCallAcceptMessage extends SignalingMessage {
  type: 'call-accept';
  fromId: string;
  targetId: string;
  callId: string;
}

export interface VideoCallRejectMessage extends SignalingMessage {
  type: 'call-reject';
  fromId: string;
  targetId: string;
  callId: string;
  reason?: string;
}

export interface VideoCallEndMessage extends SignalingMessage {
  type: 'call-end';
  fromId: string;
  targetId: string;
  callId: string;
}

export interface VideoCallCancelMessage extends SignalingMessage {
  type: 'call-cancel';
  fromId: string;
  targetId: string;
  callId: string;
}

export interface MediaStreamOptions {
  video: boolean | MediaTrackConstraints;
  audio: boolean | MediaTrackConstraints;
  videoQuality?: 'low' | 'medium' | 'high';
}

export interface UseVideoCallOptions {
  autoAnswer?: boolean;
  defaultVideoEnabled?: boolean;
  defaultAudioEnabled?: boolean;
  onCallInvite?: (invite: VideoCallInviteMessage) => void;
  onCallAccept?: (accept: VideoCallAcceptMessage) => void;
  onCallReject?: (reject: VideoCallRejectMessage) => void;
  onCallEnd?: (end: VideoCallEndMessage) => void;
}

export interface UseVideoCallReturn {
  // 通话状态
  callState: VideoCallState;

  // 通话控制
  initiateCall: (targetId: string, targetName: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: (reason?: string) => void;
  endCall: () => void;

  // 媒体控制
  toggleMute: () => void;
  toggleVideo: () => void;

  // 窗口控制
  minimizeWindow: () => void;
  normalizeWindow: () => void;
  maximizeWindow: () => void;

  // 媒体流管理
  switchCamera: () => Promise<void>;
  setVideoQuality: (quality: 'low' | 'medium' | 'high') => Promise<void>;
  getVideoRefs: () => {
    localVideoRef: React.RefObject<HTMLVideoElement>;
    remoteVideoRef: React.RefObject<HTMLVideoElement>;
  };

  // 内部处理函数（供useWebRTC调用）
  handleIncomingCall: (invite: VideoCallInviteMessage) => void;
  handleCallAccepted: () => void;
}

export interface RegisterMessage extends SignalingMessage {
  type: 'register';
  name: string;
  roomId?: string; // 添加房间ID
}

export interface RegisteredMessage extends SignalingMessage {
  type: 'registered';
  clientId: string;
  name: string;
  ip?: string;
  roomId?: string; // 添加房间ID
}

export interface ClientListMessage extends SignalingMessage {
  type: 'client-list';
  clients: Client[];
}

export interface OfferMessage extends SignalingMessage {
  type: 'offer';
  offer: RTCSessionDescriptionInit;
  fromId: string;
  targetId: string;
}

export interface AnswerMessage extends SignalingMessage {
  type: 'answer';
  answer: RTCSessionDescriptionInit;
  fromId: string;
  targetId: string;
}

export interface IceCandidateMessage extends SignalingMessage {
  type: 'ice-candidate';
  candidate: RTCIceCandidate;
  fromId: string;
  targetId: string;
}

export interface FileInfoMessage {
  type: 'file-info';
  fileName: string;
  fileSize: number;
  fileType: string;
  totalChunks: number;
}

export interface FileChunkMessage {
  type: 'file-chunk';
  chunkIndex: number;
  totalChunks: number;
}

export interface ConnectionState {
  isConnected: boolean;
  clientId: string;
  clientName: string;
  clientIP?: string;
  error: string | null;
}

export interface UseWebRTCOptions {
  serverUrl?: string;
  iceServers?: RTCIceServer[];
  chunkSize?: number;
  autoFetchICEServers?: boolean; // 是否自动从服务器获取 ICE 服务器配置
  // 视频通话回调
  onCallInvite?: (invite: VideoCallInviteMessage) => void;
  onCallAccept?: (accept: VideoCallAcceptMessage) => void;
  onCallReject?: (reject: VideoCallRejectMessage) => void;
  onCallEnd?: (end: VideoCallEndMessage) => void;
}

export interface ICEServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
  credentialType?: 'password' | 'oauth';
}

export interface WebRTCConfig {
  iceServers: ICEServerConfig[];
  timestamp: string;
}

export interface UseWebRTCReturn {
  // 连接状态
  connectionState: ConnectionState;
  clients: Client[];
  transfers: FileTransfer[];

  // 连接方法
  connect: (name: string, roomId?: string) => Promise<void>;
  disconnect: () => void;

  // 文件传输方法
  sendFile: (
    targetId: string,
    file: File,
    channelCount?: number,
  ) => Promise<void>;
  downloadFile: (transferId: string) => void;

  // 传输控制方法
  pauseTransfer: (transferId: string) => void;
  resumeTransfer: (transferId: string) => void;
  cancelTransfer: (transferId: string) => void;

  // 状态管理
  clearTransfers: () => void;
  removeTransfer: (transferId: string) => void;

  // 视频通话功能
  videoCall: UseVideoCallReturn;
}
