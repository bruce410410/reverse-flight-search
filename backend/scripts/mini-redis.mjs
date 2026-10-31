#!/usr/bin/env node
/**
 * 最小可用的 Redis 協定相容伺服器（純 Node.js、不需要任何外部二進位檔）。
 *
 * 使用情境：在無法安裝 Docker / Homebrew / 下載 redis-server 二進位檔的環境
 * （例如受限的網路權限）快速起一個「夠用」的 Redis 相容伺服器，讓 ioredis
 * 能正常連線並執行本專案實際會用到的指令：PING、SET（含 EX）、GET、DEL、
 * SELECT、AUTH、CLIENT、COMMAND、INFO、QUIT。
 *
 * 這不是生產用的 Redis 替代品——沒有持久化、沒有叢集、沒有完整指令集，
 * 純粹是為了讓這個專案在沒有真正 Redis 可用的機器上也能被實際跑起來測試。
 */
import net from "node:net";

const store = new Map(); // key -> { value: string, expiresAt: number | null }

function encodeSimpleString(s) {
  return `+${s}\r\n`;
}
function encodeError(s) {
  return `-ERR ${s}\r\n`;
}
function encodeBulkString(s) {
  if (s === null || s === undefined) return `$-1\r\n`;
  const buf = Buffer.from(String(s));
  return `$${buf.length}\r\n${buf.toString()}\r\n`;
}
function encodeInteger(n) {
  return `:${n}\r\n`;
}
function encodeEmptyArray() {
  return `*0\r\n`;
}

function isExpired(entry) {
  return entry.expiresAt !== null && Date.now() > entry.expiresAt;
}

function handleCommand(args) {
  const cmd = (args[0] ?? "").toUpperCase();
  switch (cmd) {
    case "PING":
      return encodeSimpleString("PONG");
    case "SET": {
      const key = args[1];
      const value = args[2];
      let expiresAt = null;
      for (let i = 3; i < args.length; i++) {
        if ((args[i] ?? "").toUpperCase() === "EX") {
          const seconds = parseInt(args[i + 1], 10);
          expiresAt = Date.now() + seconds * 1000;
          i++;
        }
      }
      store.set(key, { value, expiresAt });
      return encodeSimpleString("OK");
    }
    case "GET": {
      const key = args[1];
      const entry = store.get(key);
      if (!entry || isExpired(entry)) {
        if (entry) store.delete(key);
        return encodeBulkString(null);
      }
      return encodeBulkString(entry.value);
    }
    case "DEL": {
      let count = 0;
      for (let i = 1; i < args.length; i++) {
        if (store.delete(args[i])) count++;
      }
      return encodeInteger(count);
    }
    case "QUIT":
      return encodeSimpleString("OK");
    case "SELECT":
    case "AUTH":
    case "CLIENT":
    case "HELLO":
      return encodeSimpleString("OK");
    case "INFO":
      return encodeBulkString("redis_version:7.0.0-mini\n");
    case "COMMAND":
      return encodeEmptyArray();
    default:
      return encodeError(`unknown command '${cmd}'`);
  }
}

function makeParser(onCommand) {
  let buffer = Buffer.alloc(0);
  return function feed(chunk) {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      if (buffer.length === 0) return;
      if (buffer[0] === 0x2a) {
        // '*' — multi-bulk array
        const nlIndex = buffer.indexOf("\r\n");
        if (nlIndex === -1) return;
        const count = parseInt(buffer.subarray(1, nlIndex).toString(), 10);
        let offset = nlIndex + 2;
        const args = [];
        let ok = true;
        for (let i = 0; i < count; i++) {
          if (buffer[offset] !== 0x24) {
            ok = false;
            break;
          } // '$'
          const lenEnd = buffer.indexOf("\r\n", offset);
          if (lenEnd === -1) {
            ok = false;
            break;
          }
          const len = parseInt(buffer.subarray(offset + 1, lenEnd).toString(), 10);
          const dataStart = lenEnd + 2;
          const dataEnd = dataStart + len;
          if (buffer.length < dataEnd + 2) {
            ok = false;
            break;
          }
          args.push(buffer.subarray(dataStart, dataEnd).toString());
          offset = dataEnd + 2;
        }
        if (!ok) return; // 資料還沒收完整，等下一批
        buffer = buffer.subarray(offset);
        onCommand(args);
      } else {
        const nlIndex = buffer.indexOf("\r\n");
        if (nlIndex === -1) return;
        const line = buffer.subarray(0, nlIndex).toString();
        buffer = buffer.subarray(nlIndex + 2);
        if (line.trim().length > 0) onCommand(line.trim().split(/\s+/));
      }
    }
  };
}

const port = parseInt(process.argv[2] || "6379", 10);
const server = net.createServer((socket) => {
  const feed = makeParser((args) => {
    try {
      socket.write(handleCommand(args));
    } catch (err) {
      socket.write(encodeError(String(err)));
    }
  });
  socket.on("data", feed);
  socket.on("error", () => {});
});

server.listen(port, "127.0.0.1", () => {
  console.log(`mini-redis listening on 127.0.0.1:${port}`);
});
