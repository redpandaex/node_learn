#!/bin/bash

# chmod +x dev.sh
# ./dev.sh
echo "启动开发环境..."

# 存储进程ID数组
pids=()

# 启动服务并记录PID
echo "启动 ws_browser_client..."
(cd ws_browser_client && pnpm dev) &
pids+=($!)

echo "启动 ws_server..."
(cd ws_server && pnpm dev) &
pids+=($!)

echo "启动 ws_server_client..."
(cd ws_server_client && cargo run) &
pids+=($!)

echo "所有服务已启动！进程ID: ${pids[*]}"
echo "按 Ctrl+C 停止所有服务"

# 捕获退出信号并清理所有进程
trap 'echo "正在停止所有服务..."; kill ${pids[*]} 2>/dev/null; exit 0' INT TERM

# 等待所有后台进程
wait