use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::time::{Duration, sleep};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message}; // 添加必要的 trait 导入

#[derive(Serialize, Deserialize, Debug)]
struct WSMessage {
    #[serde(rename = "type")]
    msg_type: String,
    id: Option<String>,
    data: serde_json::Value,
    timestamp: u64,
    from: Option<String>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let url = "ws://localhost:8899";
    println!("连接到 WebSocket 服务器: {}", url);

    let (ws_stream, _) = connect_async(url).await?;
    println!("WebSocket 连接成功!");

    let (mut write, mut read) = ws_stream.split();

    // 启动消息接收任务
    let read_task = tokio::spawn(async move {
        while let Some(msg) = read.next().await {
            match msg {
                Ok(Message::Text(text)) => match serde_json::from_str::<WSMessage>(&text) {
                    Ok(ws_msg) => {
                        println!("收到消息: {:?}", ws_msg);
                    }
                    Err(e) => {
                        println!("解析消息失败: {}, 原始消息: {}", e, text);
                    }
                },
                Ok(Message::Close(_)) => {
                    println!("服务器关闭连接");
                    break;
                }
                Err(e) => {
                    println!("接收消息错误: {}", e);
                    break;
                }
                _ => {}
            }
        }
    });

    // 启动消息发送任务
    let write_task = tokio::spawn(async move {
        // 等待一下让连接稳定
        sleep(Duration::from_secs(1)).await;

        // 发送聊天消息
        let chat_msg = WSMessage {
            msg_type: "chat".to_string(),
            id: None,
            data: serde_json::json!({"text": "Hello from Rust client!"}),
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            from: None,
        };

        if let Ok(msg_text) = serde_json::to_string(&chat_msg) {
            if let Err(e) = write.send(Message::Text(msg_text.into())).await {
                println!("发送消息失败: {}", e);
            } else {
                println!("发送聊天消息成功");
            }
        }

        // 定期发送心跳
        let mut interval = tokio::time::interval(Duration::from_secs(10));
        loop {
            interval.tick().await;

            let heartbeat_msg = WSMessage {
                msg_type: "heartbeat".to_string(),
                id: None,
                data: serde_json::json!({"ping": true}),
                timestamp: SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64,
                from: None,
            };

            if let Ok(msg_text) = serde_json::to_string(&heartbeat_msg) {
                if let Err(e) = write.send(Message::Text(msg_text.into())).await {
                    println!("发送心跳失败: {}", e);
                    break;
                } else {
                    println!("发送心跳成功");
                }
            }
        }
    });

    // 等待任务完成
    tokio::select! {
        _ = read_task => println!("读取任务结束"),
        _ = write_task => println!("写入任务结束"),
    }

    Ok(())
}
