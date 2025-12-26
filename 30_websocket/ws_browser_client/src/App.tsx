import { useState, useEffect, useRef } from 'react';
import './App.css';

interface WSMessage {
  type: 'chat' | 'broadcast' | 'heartbeat' | 'system';
  id?: string;
  data: { message?: string; clientId?: string; text?: string; ping?: boolean };
  timestamp: number;
  from?: string;
}

function App() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [clientId, setClientId] = useState('');
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // 连接WebSocket
    const connectWS = () => {
      ws.current = new WebSocket('ws://localhost:8899', ['custom-protocol']);

      ws.current.onopen = () => {
        console.log('WebSocket连接成功');
        setConnected(true);
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          console.log('收到消息:', message);

          if (message.type === 'system' && message.data.clientId) {
            setClientId(message.data.clientId);
          }

          setMessages((prev) => [...prev, message]);
        } catch (error) {
          console.error('解析消息失败:', error);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket连接关闭');
        setConnected(false);
        // 3秒后重连
        setTimeout(connectWS, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket错误:', error);
      };
    };

    connectWS();

    // 清理函数
    return () => {
      ws.current?.close();
    };
  }, []);

  // 发送消息
  const sendMessage = () => {
    if (ws.current && connected && inputMessage.trim()) {
      const message: WSMessage = {
        type: 'chat',
        data: { text: inputMessage.trim() },
        timestamp: Date.now(),
      };

      ws.current.send(JSON.stringify(message));
      setInputMessage('');
    }
  };

  // 发送心跳
  const sendHeartbeat = () => {
    if (ws.current && connected) {
      const message: WSMessage = {
        type: 'heartbeat',
        data: { ping: true },
        timestamp: Date.now(),
      };
      ws.current.send(JSON.stringify(message));
    }
  };

  return (
    <div className="App">
      <h1>WebSocket 聊天室</h1>

      <div className="status">
        <p>连接状态: {connected ? '已连接' : '未连接'}</p>
        {clientId && <p>客户端ID: {clientId}</p>}
        <button onClick={sendHeartbeat} disabled={!connected}>
          发送心跳
        </button>
      </div>

      <div
        className="messages"
        style={{
          height: '300px',
          overflow: 'auto',
          border: '1px solid #ccc',
          padding: '10px',
        }}
      >
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`}>
            <small>{new Date(msg.timestamp).toLocaleTimeString()}</small>
            <strong> [{msg.type}] </strong>
            {msg.from && <span>来自: {msg.from} </span>}
            <span>{JSON.stringify(msg.data)}</span>
          </div>
        ))}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="输入消息..."
          disabled={!connected}
        />
        <button
          onClick={sendMessage}
          disabled={!connected || !inputMessage.trim()}
        >
          发送
        </button>
      </div>
    </div>
  );
}

export default App;
