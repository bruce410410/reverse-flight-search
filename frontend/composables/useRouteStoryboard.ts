import { buildRoutePath, buildStoryboard, type LatLng, type RouteStep, type StoryboardFrame } from "~/utils/storyboard";

export type TravelMode = "WALK" | "DRIVE";

export type RouteError =
  | { kind: "api"; status: number; message: string }
  | { kind: "notFound" }
  | { kind: "network" };

export interface RouteSummary {
  distanceMeters: number;
  durationSeconds: number;
}

const ROUTES_ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";
const FIELD_MASK = [
  "routes.distanceMeters",
  "routes.duration",
  "routes.legs.steps.distanceMeters",
  "routes.legs.steps.startLocation",
  "routes.legs.steps.endLocation",
  "routes.legs.steps.polyline.encodedPolyline",
  "routes.legs.steps.navigationInstruction",
].join(",");

/** 由瀏覽器帶使用者的 Key 直連 Routes API，再把 steps 轉成路口故事板。 */
export function useRouteStoryboard() {
  const loading = ref(false);
  const error = ref<RouteError | null>(null);
  const frames = ref<StoryboardFrame[]>([]);
  const routePath = ref<LatLng[]>([]);
  const summary = ref<RouteSummary | null>(null);

  async function compute(
    apiKey: string,
    origin: string,
    destination: string,
    travelMode: TravelMode,
    languageCode = "zh-TW",
  ) {
    loading.value = true;
    error.value = null;
    frames.value = [];
    routePath.value = [];
    summary.value = null;
    try {
      const res = await fetch(ROUTES_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify({
          origin: { address: origin },
          destination: { address: destination },
          travelMode,
          languageCode,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        error.value = { kind: "api", status: res.status, message: body?.error?.message ?? "" };
        return;
      }
      const route = body.routes?.[0];
      if (!route) {
        error.value = { kind: "notFound" };
        return;
      }
      const steps: RouteStep[] = route.legs.flatMap((leg: { steps?: RouteStep[] }) => leg.steps ?? []);
      routePath.value = buildRoutePath(steps);
      frames.value = buildStoryboard(steps);
      summary.value = {
        distanceMeters: route.distanceMeters ?? 0,
        durationSeconds: parseInt(route.duration ?? "0", 10),
      };
    } catch {
      error.value = { kind: "network" };
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, frames, routePath, summary, compute };
}
