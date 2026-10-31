#!/bin/bash
for name in mini-redis backend frontend; do
  pidfile="/tmp/reverse-flight-$name.pid"
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile")
    if kill "$pid" 2>/dev/null; then
      echo "已停止 $name (pid $pid)"
    else
      echo "$name 似乎已經不在執行"
    fi
    rm -f "$pidfile"
  else
    echo "$name 沒有在執行中的紀錄"
  fi
done
