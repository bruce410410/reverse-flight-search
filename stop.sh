#!/bin/bash
# npx 會再開子程序（tsx、nuxt 的實際 server），只停 npx 本身會留下佔著 port 的子程序，
# 所以由下往上把整棵程序樹都停掉。
kill_tree() {
  local child
  for child in $(pgrep -P "$1"); do
    kill_tree "$child"
  done
  kill "$1" 2>/dev/null
}

for name in mini-redis backend frontend; do
  pidfile="/tmp/reverse-flight-$name.pid"
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      kill_tree "$pid"
      echo "已停止 $name (pid $pid)"
    else
      echo "$name 似乎已經不在執行"
    fi
    rm -f "$pidfile"
  else
    echo "$name 沒有在執行中的紀錄"
  fi
done
