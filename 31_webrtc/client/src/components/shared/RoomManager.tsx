import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast';

interface RoomManagerProps {
  isConnected: boolean;
}

export const RoomManager = ({ isConnected }: RoomManagerProps) => {
  const [currentRoom, setCurrentRoom] = useState<string>('');
  const [inputRoom, setInputRoom] = useState<string>('');

  useEffect(() => {
    // 从URL参数获取当前房间
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room') || 'default';
    setCurrentRoom(roomId);
    setInputRoom(roomId);
  }, []);

  const handleJoinRoom = () => {
    if (!inputRoom.trim()) {
      toast.error('请输入房间名称');
      return;
    }

    const roomId = inputRoom.trim();
    const url = new URL(window.location.href);

    if (roomId === 'default') {
      url.searchParams.delete('room');
    } else {
      url.searchParams.set('room', roomId);
    }

    window.location.href = url.toString();
  };

  const handleShareRoom = () => {
    const url = window.location.href;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast.success('房间链接已复制到剪贴板');
      })
      .catch(() => {
        toast.error('复制失败');
      });
  };

  const generateRandomRoom = () => {
    const randomRoom = Math.random().toString(36).substring(2, 8);
    setInputRoom(randomRoom);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          房间管理
          {isConnected && (
            <Badge variant="secondary">当前房间: {currentRoom}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="输入房间名称"
            value={inputRoom}
            onChange={(e) => setInputRoom(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
            disabled={isConnected}
          />
          <Button
            onClick={generateRandomRoom}
            variant="outline"
            size="sm"
            disabled={isConnected}
          >
            随机
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleJoinRoom}
            disabled={
              isConnected || !inputRoom.trim() || inputRoom === currentRoom
            }
            className="flex-1"
          >
            {inputRoom === currentRoom ? '当前房间' : '加入房间'}
          </Button>
          <Button
            onClick={handleShareRoom}
            variant="outline"
            disabled={!isConnected}
          >
            分享链接
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>• 只有在同一房间的用户才能相互发送文件</p>
          <p>• 断开连接后可以切换房间</p>
          <p>• 分享链接给其他人加入相同房间</p>
        </div>
      </CardContent>
    </Card>
  );
};
