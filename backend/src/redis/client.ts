import { Redis, type RedisOptions } from "ioredis";
import type { AppEnv } from "../config/env.js";

export type RedisConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

/**
 * 封裝 ioredis client，統一管理：
 *  - 連線重試策略（指數退避，上限由 REDIS_MAX_RETRIES 控制）
 *  - 連線狀態追蹤，讓 /api/health 等端點可以回報真實狀態
 *  - 逾時與錯誤事件的集中處理，避免未捕捉的例外讓行程崩潰
 *
 * 這裡刻意不做任何「快取鮮度判斷」的業務邏輯（那是反向搜票核心模組的職責），
 * 只提供乾淨、可靠的 Redis 存取介面。
 */
export class RedisClient {
  private readonly client: Redis;
  private state: RedisConnectionState = "connecting";
  private lastError: Error | null = null;

  constructor(env: AppEnv) {
    const options: RedisOptions = {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      db: env.REDIS_DB,
      connectTimeout: env.REDIS_CONNECT_TIMEOUT_MS,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy: (attempt: number) => {
        if (attempt > env.REDIS_MAX_RETRIES) {
          // 回傳 null 讓 ioredis 停止自動重連；由應用層記錄並保持 "disconnected" 狀態。
          return null;
        }
        // 指數退避，上限 10 秒，並加入抖動避免多個 instance 同時重連造成尖峰。
        const backoff = Math.min(1000 * 2 ** attempt, 10_000);
        const jitter = Math.floor(Math.random() * 200);
        return backoff + jitter;
      },
    };

    this.client = new Redis(options);
    this.registerEventHandlers();
  }

  private registerEventHandlers(): void {
    this.client.on("connect", () => {
      this.state = "connecting";
    });
    this.client.on("ready", () => {
      this.state = "connected";
      this.lastError = null;
    });
    this.client.on("reconnecting", () => {
      this.state = "reconnecting";
    });
    this.client.on("end", () => {
      this.state = "disconnected";
    });
    this.client.on("error", (err: Error) => {
      this.state = "error";
      this.lastError = err;
    });
  }

  /** 建立連線；伺服器啟動時應呼叫一次並等待結果，讓啟動失敗能被明確偵測到。 */
  async connect(): Promise<void> {
    if (this.client.status === "ready" || this.client.status === "connecting") {
      return;
    }
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  getState(): RedisConnectionState {
    return this.state;
  }

  getLastError(): Error | null {
    return this.lastError;
  }

  /** 健康檢查：主動 PING，而不是只看快取的連線狀態，避免狀態與現實脫節。 */
  async ping(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = performance.now();
    try {
      const reply = await this.client.ping();
      const latencyMs = Math.round(performance.now() - start);
      return { ok: reply === "PONG", latencyMs };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        ok: false,
        latencyMs,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /** 提供底層 client 給未來的快取讀寫模組使用（例如反向搜票的兩段式快取邏輯）。 */
  raw(): Redis {
    return this.client;
  }
}
