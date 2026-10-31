import { loadEnv } from "./config/env.js";
import { buildApp } from "./server.js";

async function main(): Promise<void> {
  const env = loadEnv();
  const { app, redis } = buildApp(env);

  try {
    await redis.connect();
  } catch (err) {
    // 不讓 Redis 連線失敗直接讓整個服務掛掉：以「degraded」狀態啟動，
    // 讓 /api/health 誠實回報問題，方便維運排查，並讓重試策略有機會在背景恢復連線。
    app.log.warn({ err }, "Redis 初始連線失敗，服務將以 degraded 狀態啟動並持續重試");
  }

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "收到終止訊號，開始關閉伺服器");
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "關閉伺服器時發生錯誤");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.error({ err }, "伺服器啟動失敗");
    process.exit(1);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("未預期的啟動錯誤:", err);
  process.exit(1);
});
