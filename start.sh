#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "啟動 mini-redis（純 JS 版 Redis 相容伺服器，不需要 Docker）..."
(cd backend && nohup node scripts/mini-redis.mjs 6379 > /tmp/reverse-flight-mini-redis.log 2>&1 & echo $! > /tmp/reverse-flight-mini-redis.pid)
sleep 1

echo "啟動後端 (http://localhost:3001)..."
(cd backend && nohup npx tsx --env-file .env src/index.ts > /tmp/reverse-flight-backend.log 2>&1 & echo $! > /tmp/reverse-flight-backend.pid)
sleep 2

echo "啟動前端 (http://localhost:3000)..."
(cd frontend && nohup npx nuxt dev --port 3000 > /tmp/reverse-flight-frontend.log 2>&1 & echo $! > /tmp/reverse-flight-frontend.pid)
sleep 2

echo ""
echo "======================================"
echo "全部啟動完成！請打開瀏覽器前往："
echo "  http://localhost:3000"
echo "======================================"
echo ""
echo "查看日誌：tail -f /tmp/reverse-flight-*.log"
echo "要停止所有服務，執行：./stop.sh"
