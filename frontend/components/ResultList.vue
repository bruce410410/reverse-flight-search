<script setup lang="ts">
import type { FlightOffer, TripType } from "~/types/reverseSearch";
import { airportName } from "~/utils/airports";

defineProps<{ offers: FlightOffer[]; cheapestPrice: number | null; tripType: TripType }>();
const { t, locale } = useI18n();

/** 後端回傳的時間是當地時間字串（YYYY-MM-DDTHH:mm:ss），直接取出時分，避免被瀏覽器時區換算。 */
function hhmm(iso?: string): string {
  const m = iso?.match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "--:--";
}

function duration(minutes?: number): string {
  if (minutes === undefined) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? t("common.hm", { h, m }) : t("common.minutes", { m });
}

function flightNumbers(offer: FlightOffer): string {
  return offer.segments.map((s) => `${s.airlineIata} ${s.flightNumber}`).join(" / ");
}

function priceText(offer: FlightOffer): string {
  try {
    return new Intl.NumberFormat(locale.value === "zh" ? "zh-TW" : locale.value, {
      style: "currency",
      currency: offer.currency,
      maximumFractionDigits: 0,
    }).format(offer.price);
  } catch {
    return `${offer.currency} ${offer.price.toLocaleString()}`;
  }
}

function cityName(offer: FlightOffer): string {
  const name = airportName(offer.origin, locale.value);
  return name === offer.origin ? offer.originCity : name;
}
</script>

<template>
  <ol class="offers">
    <li
      v-for="(offer, i) in offers"
      :key="`${offer.origin}-${offer.departureAt}`"
      class="offer"
      :class="{ best: cheapestPrice !== null && offer.price === cheapestPrice }"
    >
      <span class="rank display">#{{ i + 1 }}</span>
      <div class="route">
        <div class="end">
          <span class="iata mono">{{ offer.origin }}</span>
          <span class="sub">{{ cityName(offer) }}<template v-if="offer.originCountry">，{{ offer.originCountry }}</template></span>
          <span class="sub small">{{ offer.airlines.join(", ") }}<template v-if="offer.segments.length"> · {{ flightNumbers(offer) }}</template></span>
        </div>
        <div class="mid">
          <span class="small">{{ duration(offer.durationMinutes) }}</span>
          <span class="line">
            <span class="dash" />
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" class="plane"><path d="M2 12l20-8-6 16-3-6z" fill="#e36255" stroke="#2D2420" stroke-width="1.6" stroke-linejoin="round" /></svg>
          </span>
          <span v-if="offer.stopovers !== undefined" class="stops" :class="{ warn: offer.stopovers > 0 }">
            {{ offer.stopovers === 0 ? t("results.direct") : t("results.stopsN", { n: offer.stopovers }) }}
          </span>
        </div>
        <div class="end right">
          <span class="iata mono">{{ offer.segments.at(-1)?.arrivalAirport ?? "" }}</span>
          <span class="sub">{{ hhmm(offer.departureAt) }} → {{ hhmm(offer.arrivalAt) }}</span>
        </div>
      </div>
      <div class="buy">
        <div class="price-box">
          <span v-if="cheapestPrice !== null && offer.price === cheapestPrice" class="badge">{{ t("results.cheapest") }}</span>
          <strong class="price">{{ priceText(offer) }}</strong>
          <span class="small">{{ tripType === "round-trip" ? t("results.perPersonRound") : t("results.perPersonOneWay") }}</span>
          <FlightStatusBadge :flight-status="offer.flightStatus" />
        </div>
        <a
          v-if="offer.deepLink"
          :href="offer.deepLink"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-ink view"
        >
          {{ t("results.view") }}
        </a>
        <span v-else class="small no-link">{{ t("results.noLink") }}</span>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.offers {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.offer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 22px;
  padding: 20px 24px;
  background: var(--white);
  border: 2px solid var(--ink);
  border-radius: 26px;
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.offer:hover {
  transform: translateY(-4px);
}
.offer.best {
  background: var(--mustard);
  border-width: 3px;
  box-shadow: var(--shadow-hard);
}
.rank {
  font-size: 30px;
  width: 52px;
}
.route {
  flex: 1 1 340px;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 16px;
}
.end {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.end.right {
  text-align: right;
}
.iata {
  font-size: clamp(26px, 3vw, 34px);
  font-weight: 700;
  line-height: 1;
}
.sub {
  font-size: 14px;
  color: var(--muted);
}
.small {
  font-size: 12px;
  color: var(--muted);
}
.mid {
  flex: 1;
  min-width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.line {
  position: relative;
  width: 100%;
  height: 16px;
}
.dash {
  position: absolute;
  top: 7px;
  left: 0;
  right: 0;
  border-top: 2px dashed var(--ink);
}
.plane {
  position: absolute;
  left: 50%;
  top: -1px;
  transform: translateX(-50%);
}
.stops {
  font-size: 13px;
  font-weight: 900;
}
.stops.warn {
  color: var(--accent-text);
}
.buy {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
}
.price-box {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.price {
  font-size: 24px;
  line-height: 1.2;
}
.view {
  min-height: 46px;
  padding: 0 18px;
}
.no-link {
  max-width: 90px;
  text-align: center;
}
@media (max-width: 640px) {
  .offer {
    padding: 18px;
    gap: 12px;
  }
  .rank {
    width: 100%;
    font-size: 22px;
  }
  .route {
    flex-basis: 100%;
    gap: 10px;
  }
  .buy {
    flex-basis: 100%;
    margin-left: 0;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    border-top: 2px dashed rgba(45, 36, 32, 0.25);
    padding-top: 12px;
  }
  .price-box {
    min-width: 0;
  }
  .price-box {
    align-items: flex-start;
  }
}
@media (max-width: 420px) {
  .view {
    flex: 1 1 100%;
    justify-content: center;
  }
}
</style>
