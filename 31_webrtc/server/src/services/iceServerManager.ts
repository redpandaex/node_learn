import type { ICEServerConfig, ServerConfig, ConfigRequest } from '../types/config';

class ICEServerManager {
  private config: ServerConfig;

  constructor() {
    // 默认配置包含 Google 公共 STUN 服务器
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ],
      customStunServers: [],
      customTurnServers: [],
    };
  }

  // 获取当前配置
  getConfig(): ServerConfig {
    return { ...this.config };
  }

  // 获取合并后的 ICE 服务器列表（用于客户端）
  getICEServers(): ICEServerConfig[] {
    return [...this.config.iceServers, ...this.config.customStunServers, ...this.config.customTurnServers];
  }

  // 添加自定义 STUN 服务器
  addStunServer(server: ICEServerConfig): boolean {
    try {
      // 验证服务器配置
      if (!this.validateICEServer(server)) {
        return false;
      }

      // 检查是否已存在
      if (this.isServerExists(server, 'stun')) {
        return false;
      }

      this.config.customStunServers.push(server);
      return true;
    } catch (error) {
      console.error('Error adding STUN server:', error);
      return false;
    }
  }

  // 添加自定义 TURN 服务器
  addTurnServer(server: ICEServerConfig): boolean {
    try {
      // 验证服务器配置
      if (!this.validateICEServer(server)) {
        return false;
      }

      // 检查是否已存在
      if (this.isServerExists(server, 'turn')) {
        return false;
      }

      this.config.customTurnServers.push(server);
      return true;
    } catch (error) {
      console.error('Error adding TURN server:', error);
      return false;
    }
  }

  // 移除自定义 STUN 服务器
  removeStunServer(index: number): boolean {
    if (index >= 0 && index < this.config.customStunServers.length) {
      this.config.customStunServers.splice(index, 1);
      return true;
    }
    return false;
  }

  // 移除自定义 TURN 服务器
  removeTurnServer(index: number): boolean {
    if (index >= 0 && index < this.config.customTurnServers.length) {
      this.config.customTurnServers.splice(index, 1);
      return true;
    }
    return false;
  }

  // 更新自定义 STUN 服务器
  updateStunServer(index: number, server: ICEServerConfig): boolean {
    if (index >= 0 && index < this.config.customStunServers.length) {
      if (!this.validateICEServer(server)) {
        return false;
      }
      this.config.customStunServers[index] = server;
      return true;
    }
    return false;
  }

  // 更新自定义 TURN 服务器
  updateTurnServer(index: number, server: ICEServerConfig): boolean {
    if (index >= 0 && index < this.config.customTurnServers.length) {
      if (!this.validateICEServer(server)) {
        return false;
      }
      this.config.customTurnServers[index] = server;
      return true;
    }
    return false;
  }

  // 重置为默认配置
  resetToDefault(): void {
    this.config.customStunServers = [];
    this.config.customTurnServers = [];
  }

  // 批量处理配置请求
  processConfigRequest(request: ConfigRequest): { success: boolean; message: string } {
    try {
      switch (request.type) {
        case 'add':
          if (request.serverType === 'stun' && request.server) {
            const success = this.addStunServer(request.server);
            return {
              success,
              message: success ? 'STUN server added successfully' : 'Failed to add STUN server',
            };
          } else if (request.serverType === 'turn' && request.server) {
            const success = this.addTurnServer(request.server);
            return {
              success,
              message: success ? 'TURN server added successfully' : 'Failed to add TURN server',
            };
          }
          break;

        case 'remove':
          if (request.serverType === 'stun' && typeof request.index === 'number') {
            const success = this.removeStunServer(request.index);
            return {
              success,
              message: success ? 'STUN server removed successfully' : 'Failed to remove STUN server',
            };
          } else if (request.serverType === 'turn' && typeof request.index === 'number') {
            const success = this.removeTurnServer(request.index);
            return {
              success,
              message: success ? 'TURN server removed successfully' : 'Failed to remove TURN server',
            };
          }
          break;

        case 'update':
          if (request.serverType === 'stun' && typeof request.index === 'number' && request.server) {
            const success = this.updateStunServer(request.index, request.server);
            return {
              success,
              message: success ? 'STUN server updated successfully' : 'Failed to update STUN server',
            };
          } else if (request.serverType === 'turn' && typeof request.index === 'number' && request.server) {
            const success = this.updateTurnServer(request.index, request.server);
            return {
              success,
              message: success ? 'TURN server updated successfully' : 'Failed to update TURN server',
            };
          }
          break;

        case 'reset':
          this.resetToDefault();
          return {
            success: true,
            message: 'Configuration reset to default successfully',
          };
      }

      return {
        success: false,
        message: 'Invalid request parameters',
      };
    } catch (error) {
      return {
        success: false,
        message: `Error processing request: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // 验证 ICE 服务器配置
  private validateICEServer(server: ICEServerConfig): boolean {
    if (!server.urls) {
      return false;
    }

    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];

    for (const url of urls) {
      if (!url.startsWith('stun:') && !url.startsWith('turn:') && !url.startsWith('turns:')) {
        return false;
      }
    }

    // TURN 服务器需要用户名和密码
    const hasTurnUrl = urls.some((url) => url.startsWith('turn:') || url.startsWith('turns:'));
    if (hasTurnUrl && (!server.username || !server.credential)) {
      return false;
    }

    return true;
  }

  // 检查服务器是否已存在
  private isServerExists(server: ICEServerConfig, type: 'stun' | 'turn'): boolean {
    const servers = type === 'stun' ? this.config.customStunServers : this.config.customTurnServers;
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];

    return servers.some((existing) => {
      const existingUrls = Array.isArray(existing.urls) ? existing.urls : [existing.urls];
      return existingUrls.some((existingUrl) => urls.includes(existingUrl));
    });
  }

  // 获取统计信息
  getStats() {
    return {
      defaultServers: this.config.iceServers.length,
      customStunServers: this.config.customStunServers.length,
      customTurnServers: this.config.customTurnServers.length,
      totalServers: this.getICEServers().length,
    };
  }
}

// 导出单例实例
export const iceServerManager = new ICEServerManager();
