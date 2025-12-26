import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from '../../lib/toast';

interface ICEServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
  credentialType?: 'password' | 'oauth';
}

interface ServerConfig {
  iceServers: ICEServerConfig[];
  customStunServers: ICEServerConfig[];
  customTurnServers: ICEServerConfig[];
}

interface ICEServerManagerProps {
  serverUrl?: string;
}

export const ICEServerManager: React.FC<ICEServerManagerProps> = ({
  serverUrl = process.env.HTTP_HOST,
}) => {
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 表单状态
  const [newServer, setNewServer] = useState({
    type: 'stun' as 'stun' | 'turn',
    urls: '',
    username: '',
    credential: '',
  });

  // 获取配置
  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${serverUrl}/api/ice-config`);
      if (!response.ok) {
        throw new Error('Failed to fetch configuration');
      }
      const data = await response.json();
      setConfig(data.data.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // 添加服务器
  const addServer = async () => {
    if (!newServer.urls.trim()) {
      toast.error('请输入服务器 URL');
      return;
    }

    // 验证 URL 格式
    const urlPattern = newServer.type === 'stun' ? /^stuns?:/ : /^turns?:/;

    if (!urlPattern.test(newServer.urls)) {
      toast.error(`URL 应该以 ${newServer.type}: 或 ${newServer.type}s: 开头`);
      return;
    }

    // TURN 服务器需要用户名和密码
    if (
      newServer.type === 'turn' &&
      (!newServer.username || !newServer.credential)
    ) {
      toast.error('TURN 服务器需要用户名和密码');
      return;
    }

    setLoading(true);
    try {
      const serverData: ICEServerConfig = {
        urls: newServer.urls,
      };

      if (newServer.type === 'turn') {
        serverData.username = newServer.username;
        serverData.credential = newServer.credential;
      }

      const response = await fetch(`${serverUrl}/api/ice-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'add',
          serverType: newServer.type,
          server: serverData,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        setConfig(result.data.config);
        setNewServer({
          type: 'stun',
          urls: '',
          username: '',
          credential: '',
        });
      } else {
        toast.error(result.message || 'Failed to add server');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // 删除服务器
  const removeServer = async (type: 'stun' | 'turn', index: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${serverUrl}/api/ice-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'remove',
          serverType: type,
          index,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        setConfig(result.data.config);
      } else {
        toast.error(result.message || 'Failed to remove server');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // 重置配置
  const resetConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${serverUrl}/api/ice-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'reset',
          serverType: 'stun', // 这个参数在重置时不重要
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        setConfig(result.data.config);
      } else {
        toast.error(result.message || 'Failed to reset configuration');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // 添加预设服务器
  const addPresetServers = async (preset: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${serverUrl}/api/ice-servers/preset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preset }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        setConfig(result.data.config);
      } else {
        toast.error(result.message || 'Failed to add preset servers');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // 测试服务器
  const testServers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${serverUrl}/api/ice-servers/test`);
      const result = await response.json();

      if (result.success) {
        const testResults = result.data.testResults;
        const validCount = testResults.filter(
          (r: { status: string }) => r.status === 'valid',
        ).length;
        const totalCount = testResults.length;

        toast.success(`测试完成: ${validCount}/${totalCount} 个服务器可用`);

        // 可以在这里显示详细的测试结果
        console.log('Test results:', testResults);
      } else {
        toast.error('测试失败');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const renderServerList = (
    servers: ICEServerConfig[],
    type: 'stun' | 'turn' | 'default',
    title: string,
  ) => (
    <div className="space-y-2">
      <h4 className="font-medium text-sm text-gray-700">{title}</h4>
      {servers.length === 0 ? (
        <p className="text-sm text-gray-500">暂无{title.toLowerCase()}</p>
      ) : (
        servers.map((server, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-gray-50 rounded"
          >
            <div className="flex-1">
              <div className="font-mono text-sm">
                {Array.isArray(server.urls)
                  ? server.urls.join(', ')
                  : server.urls}
              </div>
              {server.username && (
                <div className="text-xs text-gray-500">
                  用户名: {server.username}
                </div>
              )}
            </div>
            {type !== 'default' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => removeServer(type, index)}
                disabled={loading}
              >
                删除
              </Button>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ICE 服务器管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={fetchConfig} disabled={loading}>
              刷新配置
            </Button>
            <Button onClick={testServers} disabled={loading}>
              测试服务器
            </Button>
            <Button onClick={resetConfig} disabled={loading} variant="outline">
              重置配置
            </Button>
          </div>

          {/* 预设服务器 */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-2">
              快速添加预设服务器
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => addPresetServers('twilio')}
                disabled={loading}
              >
                Twilio STUN
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addPresetServers('xirsys')}
                disabled={loading}
              >
                Xirsys STUN
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addPresetServers('coturn')}
                disabled={loading}
              >
                Coturn 模板
              </Button>
            </div>
          </div>

          {/* 添加新服务器 */}
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium">添加新服务器</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  服务器类型
                </label>
                <select
                  value={newServer.type}
                  onChange={(e) =>
                    setNewServer({
                      ...newServer,
                      type: e.target.value as 'stun' | 'turn',
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="stun">STUN</option>
                  <option value="turn">TURN</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  服务器 URL
                </label>
                <Input
                  value={newServer.urls}
                  onChange={(e) =>
                    setNewServer({ ...newServer, urls: e.target.value })
                  }
                  placeholder={`${newServer.type}://example.com:3478`}
                />
              </div>
            </div>

            {newServer.type === 'turn' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    用户名
                  </label>
                  <Input
                    value={newServer.username}
                    onChange={(e) =>
                      setNewServer({ ...newServer, username: e.target.value })
                    }
                    placeholder="用户名"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">密码</label>
                  <Input
                    type="password"
                    value={newServer.credential}
                    onChange={(e) =>
                      setNewServer({ ...newServer, credential: e.target.value })
                    }
                    placeholder="密码"
                  />
                </div>
              </div>
            )}

            <Button onClick={addServer} disabled={loading}>
              添加服务器
            </Button>
          </div>

          {/* 服务器列表 */}
          {config && (
            <div className="space-y-4">
              {renderServerList(
                config.iceServers,
                'default',
                '默认 STUN 服务器',
              )}
              {renderServerList(
                config.customStunServers,
                'stun',
                '自定义 STUN 服务器',
              )}
              {renderServerList(
                config.customTurnServers,
                'turn',
                '自定义 TURN 服务器',
              )}
            </div>
          )}

          {/* 统计信息 */}
          {config && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                默认: {config.iceServers.length}
              </Badge>
              <Badge variant="secondary">
                自定义 STUN: {config.customStunServers.length}
              </Badge>
              <Badge variant="secondary">
                自定义 TURN: {config.customTurnServers.length}
              </Badge>
              <Badge>
                总计:{' '}
                {config.iceServers.length +
                  config.customStunServers.length +
                  config.customTurnServers.length}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
