import { readFileSync } from "node:fs";

const envText = readFileSync(new URL("./.env", import.meta.url), "utf-8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const key = env.SKYSCRAPPER_API_KEY;
const host = env.SKYSCRAPPER_API_HOST || "sky-scrapper.p.rapidapi.com";
const base = env.SKYSCRAPPER_API_BASE_URL || "https://sky-scrapper.p.rapidapi.com";

if (!key) {
  console.error("SKYSCRAPPER_API_KEY 是空的，請先確認 .env");
  process.exit(1);
}

async function call(path) {
  const res = await fetch(`${base}${path}`, {
    headers: { "x-rapidapi-key": key, "x-rapidapi-host": host },
  });
  const text = await res.text();
  console.log(`\n=== ${path} ===`);
  console.log("status:", res.status);
  console.log("ratelimit-requests-remaining:", res.headers.get("x-ratelimit-requests-remaining"));
  return { status: res.status, text };
}

const nrt = await call("/api/v1/flights/searchAirport?query=NRT");
console.log(nrt.text.slice(0, 1200));

const tpe = await call("/api/v1/flights/searchAirport?query=TPE");
console.log(tpe.text.slice(0, 1200));

try {
  const nrtData = JSON.parse(nrt.text).data.find((c) => c.skyId === "NRT");
  const tpeData = JSON.parse(tpe.text).data.find((c) => c.skyId === "TPE");
  if (!nrtData || !tpeData) {
    console.error("找不到機場層級的候選項目，實際資料如上，需要人工檢查");
    process.exit(1);
  }
  const today = new Date();
  today.setDate(today.getDate() + 30);
  const date = today.toISOString().slice(0, 10);

  const params = new URLSearchParams({
    originSkyId: nrtData.skyId,
    destinationSkyId: tpeData.skyId,
    originEntityId: nrtData.entityId,
    destinationEntityId: tpeData.entityId,
    date,
    adults: "1",
    currency: "TWD",
    market: "en-US",
    countryCode: "US",
  });

  const flights = await call(`/api/v1/flights/searchFlights?${params.toString()}`);
  console.log(flights.text.slice(0, 6000));
} catch (err) {
  console.error("解析失敗：", err);
}
