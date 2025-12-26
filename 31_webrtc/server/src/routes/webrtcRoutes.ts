import { Hono } from 'hono';
import { iceServerManager } from '../services/iceServerManager';
import { getICEServers, getConfig, updateConfig, addPresetServers, testICEServers } from './iceConfig';

/**
 * WebRTC和ICE服务器配置路由
 */
export function createWebRTCRoutes(app: Hono): void {
  // ICE 服务器管理 API 路由
  app.get('/api/ice-servers', getICEServers);
  app.get('/api/ice-config', getConfig);
  app.post('/api/ice-config', updateConfig);
  app.post('/api/ice-servers/preset', addPresetServers);
  app.get('/api/ice-servers/test', testICEServers);

  // 特殊路由：为客户端提供 ICE 服务器配置
  app.get('/api/webrtc-config', (c) => {
    const iceServers = iceServerManager.getICEServers();
    return c.json({
      iceServers,
      timestamp: new Date().toISOString(),
    });
  });
}
