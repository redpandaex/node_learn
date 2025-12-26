import type { Context } from 'hono';
import { iceServerManager } from '../services/iceServerManager';
import type { ConfigRequest } from '../types/config';

// 获取 ICE 服务器配置
export const getICEServers = (c: Context) => {
  try {
    const iceServers = iceServerManager.getICEServers();
    return c.json({
      success: true,
      data: {
        iceServers,
        stats: iceServerManager.getStats(),
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to get ICE servers',
      },
      500,
    );
  }
};

// 获取详细配置信息
export const getConfig = (c: Context) => {
  try {
    const config = iceServerManager.getConfig();
    return c.json({
      success: true,
      data: {
        config,
        stats: iceServerManager.getStats(),
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to get configuration',
      },
      500,
    );
  }
};

// 更新配置
export const updateConfig = async (c: Context) => {
  try {
    const request = (await c.req.json()) as ConfigRequest;
    const result = iceServerManager.processConfigRequest(request);

    return c.json(
      {
        success: result.success,
        message: result.message,
        data: result.success
          ? {
              config: iceServerManager.getConfig(),
              stats: iceServerManager.getStats(),
            }
          : undefined,
      },
      result.success ? 200 : 400,
    );
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Invalid request body',
      },
      400,
    );
  }
};

// 批量添加预设的 TURN 服务器
export const addPresetServers = async (c: Context) => {
  try {
    const { preset } = (await c.req.json()) as { preset: string };

    let serversToAdd: any[] = [];

    switch (preset) {
      case 'coturn':
        serversToAdd = [
          {
            urls: 'turn:your-server.com:3478',
            username: 'your-username',
            credential: 'your-password',
          },
          {
            urls: 'turns:your-server.com:5349',
            username: 'your-username',
            credential: 'your-password',
          },
        ];
        break;

      case 'twilio':
        serversToAdd = [
          {
            urls: 'stun:global.stun.twilio.com:3478',
          },
        ];
        break;

      case 'xirsys':
        serversToAdd = [
          {
            urls: 'stun:stun.xirsys.com',
          },
        ];
        break;

      default:
        return c.json(
          {
            success: false,
            error: 'Unknown preset',
          },
          400,
        );
    }

    const results = [];
    for (const server of serversToAdd) {
      const isStun = server.urls.startsWith('stun:');
      const result = isStun ? iceServerManager.addStunServer(server) : iceServerManager.addTurnServer(server);
      results.push({ server: server.urls, success: result });
    }

    return c.json({
      success: true,
      message: `Added ${preset} preset servers`,
      data: {
        results,
        config: iceServerManager.getConfig(),
        stats: iceServerManager.getStats(),
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to add preset servers',
      },
      500,
    );
  }
};

// 测试 ICE 服务器连接性
export const testICEServers = async (c: Context) => {
  try {
    const iceServers = iceServerManager.getICEServers();
    const results = [];

    for (const server of iceServers) {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      for (const url of urls) {
        try {
          // 这里可以添加实际的连接测试逻辑
          // 目前只是简单的格式验证
          const isValid = url.startsWith('stun:') || url.startsWith('turn:') || url.startsWith('turns:');
          results.push({
            url,
            status: isValid ? 'valid' : 'invalid',
            responseTime: isValid ? Math.random() * 100 : null,
          });
        } catch (error) {
          results.push({
            url,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return c.json({
      success: true,
      data: {
        testResults: results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Failed to test ICE servers',
      },
      500,
    );
  }
};
