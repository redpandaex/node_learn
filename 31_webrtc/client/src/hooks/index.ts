// 重构后的模块化 useWebRTC hook
export { useWebRTC } from './useWebRTC';

// 拆分的子模块 hooks
export { useConnection } from './useWebRTC/useConnection';
export { usePeerConnection } from './useWebRTC/usePeerConnection';
export { useDataChannel } from './useWebRTC/useDataChannel';
export { useFileTransfer } from './useWebRTC/useFileTransfer';

// 其他 hooks
export { useMobile } from './useMobile';

// 类型导出
export type {
  UseConnectionOptions,
  UseConnectionReturn,
} from './useWebRTC/useConnection';
export type {
  UsePeerConnectionOptions,
  UsePeerConnectionReturn,
} from './useWebRTC/usePeerConnection';
export type {
  UseDataChannelOptions,
  UseDataChannelReturn,
} from './useWebRTC/useDataChannel';
export type { UseFileTransferReturn } from './useWebRTC/useFileTransfer';
