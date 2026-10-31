import type { FlightStatusCheck, LiveValidationStatus } from "../types/flight.js";
import type { RawAeroDataBoxFlight, RawAeroDataBoxSearchResponse } from "./types.js";

const SCHEDULE_CHANGE_THRESHOLD_MINUTES = 60;

const CANCELLED_STATUSES = new Set(["Cancelled", "CancelledUncertain"]);
const INCONCLUSIVE_STATUSES = new Set(["Unknown", "Unstated"]);

function pickBestMatch(
  flights: RawAeroDataBoxFlight[],
  expectedDeparture: Date,
): RawAeroDataBoxFlight | undefined {
  if (flights.length === 0) return undefined;
  if (flights.length === 1) return flights[0];

  // 同一航班號在同一天理論上只會有一筆，但 codeshare 等情況可能回傳多筆；
  // 挑選預定出發時間與 Kiwi 資料最接近的那一筆，降低誤判機率。
  return flights.reduce((closest, candidate) => {
    const closestTime = closest.departure.scheduledTime?.utc;
    const candidateTime = candidate.departure.scheduledTime?.utc;
    if (!candidateTime) return closest;
    if (!closestTime) return candidate;

    const closestDiff = Math.abs(new Date(closestTime).getTime() - expectedDeparture.getTime());
    const candidateDiff = Math.abs(new Date(candidateTime).getTime() - expectedDeparture.getTime());
    return candidateDiff < closestDiff ? candidate : closest;
  }, flights[0]);
}

/**
 * 將 AeroDataBox 的原始航班狀態，比對 Kiwi 資料裡預期的出發時間，
 * 分類成系統要用的 4 種 LiveValidationStatus。
 *
 * @param expectedDepartureIso Kiwi 資料裡記錄的該航段預定出發時間（ISO datetime）
 */
export function classifyFlightStatus(
  rawFlights: RawAeroDataBoxSearchResponse,
  expectedDepartureIso: string,
  now: Date = new Date(),
): FlightStatusCheck {
  const checkedAt = now.toISOString();

  if (rawFlights.length === 0) {
    return { status: "unknown", checkedAt, details: "查無該航班的即時資料，可能航班已停飛或號碼已變更" };
  }

  const expectedDeparture = new Date(expectedDepartureIso);
  const match = pickBestMatch(rawFlights, expectedDeparture);

  if (!match) {
    return { status: "unknown", checkedAt, details: "查無可比對的即時航班資料" };
  }

  if (CANCELLED_STATUSES.has(match.status)) {
    return { status: "cancelled", checkedAt, details: `航空公司回報狀態：${match.status}` };
  }

  if (match.status === "Diverted") {
    return { status: "schedule-changed", checkedAt, details: "航班已改降其他機場" };
  }

  if (INCONCLUSIVE_STATUSES.has(match.status)) {
    return { status: "unknown", checkedAt, details: "航空公司尚未提供明確的航班狀態" };
  }

  const actualOrScheduled = match.departure.actualTime?.utc ?? match.departure.scheduledTime?.utc;
  if (!actualOrScheduled) {
    return { status: "unknown", checkedAt, details: "即時資料缺少出發時間，無法比對" };
  }

  const driftMinutes = Math.abs(new Date(actualOrScheduled).getTime() - expectedDeparture.getTime()) / 60_000;

  if (driftMinutes > SCHEDULE_CHANGE_THRESHOLD_MINUTES) {
    return {
      status: "schedule-changed",
      checkedAt,
      details: `即時出發時間與查詢時的資料相差約 ${Math.round(driftMinutes)} 分鐘`,
    };
  }

  return { status: "confirmed", checkedAt };
}

/** 供無法查詢（額度用盡、逾時、未設定金鑰等）時使用的統一「unknown」結果。 */
export function unavailableFlightStatus(reason: string, now: Date = new Date()): FlightStatusCheck {
  return { status: "unknown", checkedAt: now.toISOString(), details: reason };
}

export type { LiveValidationStatus };
