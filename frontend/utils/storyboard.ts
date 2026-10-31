export interface LatLng {
  lat: number;
  lng: number;
}

/** Routes API（computeRoutes）回傳的 step，只取故事板需要的欄位。 */
export interface RouteStep {
  distanceMeters?: number;
  startLocation: { latLng: { latitude: number; longitude: number } };
  endLocation: { latLng: { latitude: number; longitude: number } };
  polyline?: { encodedPolyline: string };
  navigationInstruction?: { maneuver?: string; instructions?: string };
}

export interface StoryboardFrame {
  kind: "start" | "turn" | "arrive";
  instruction: string;
  maneuver: string;
  /** 對照地圖上的實際路線節點 */
  node: LatLng;
  /** 街景相機位置 */
  camera: LatLng;
  /** 街景相機朝向（0 = 正北，順時針） */
  heading: number;
  /** 沿路線前進的方位角，街景箭頭會依目前視角即時轉向此方位 */
  routeHeading?: number;
  /** 這張圖卡之後要走的距離（公尺），抵達點為 0 */
  distanceAfterMeters: number;
}

/** 相機往回退的距離：站在路口前方一小段，正面看著路口，跟實際走近時看到的畫面一致。 */
export const APPROACH_DISTANCE_METERS = 20;

const SKIPPED_MANEUVERS = new Set(["STRAIGHT", "MANEUVER_UNSPECIFIED", ""]);

export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const axis of ["lat", "lng"] as const) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === "lat") lat += delta;
      else lng += delta;
    }
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function encodeValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let out = "";
  while (v >= 0x20) {
    out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  return out + String.fromCharCode(v + 63);
}

export function encodePolyline(points: LatLng[]): string {
  let prevLat = 0;
  let prevLng = 0;
  return points
    .map((point) => {
      const lat = Math.round(point.lat * 1e5);
      const lng = Math.round(point.lng * 1e5);
      const value = encodeValue(lat - prevLat) + encodeValue(lng - prevLng);
      prevLat = lat;
      prevLng = lng;
      return value;
    })
    .join("");
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

export function bearing(from: LatLng, to: LatLng): number {
  const y = Math.sin(toRad(to.lng - from.lng)) * Math.cos(toRad(to.lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(toRad(to.lng - from.lng));
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}

function toLatLng(loc: RouteStep["startLocation"]): LatLng {
  return { lat: loc.latLng.latitude, lng: loc.latLng.longitude };
}

function stepPoints(step: RouteStep): LatLng[] {
  const decoded = step.polyline ? decodePolyline(step.polyline.encodedPolyline) : [];
  return decoded.length >= 2 ? decoded : [toLatLng(step.startLocation), toLatLng(step.endLocation)];
}

export function buildRoutePath(steps: RouteStep[]): LatLng[] {
  return steps.flatMap((step, index) => {
    const points = stepPoints(step);
    return index === 0 ? points : points.slice(1);
  });
}

/** 沿著前一段路徑從終點往回找，回傳距離終點至少 APPROACH_DISTANCE_METERS 的點（找不到就用起點）。 */
function approachPoint(points: LatLng[]): LatLng {
  const target = points[points.length - 1];
  for (let i = points.length - 2; i >= 0; i--) {
    if (distanceMeters(points[i], target) >= APPROACH_DISTANCE_METERS) return points[i];
  }
  return points[0];
}

/** 從某點出發、沿路徑朝前看的方位角（跳過與起點重疊的點）。 */
function forwardHeading(points: LatLng[]): number {
  const origin = points[0];
  const next = points.find((p) => distanceMeters(origin, p) > 1) ?? points[points.length - 1];
  return bearing(origin, next);
}

/** 接近 target 時的相機：從 approach 看向 target；兩者重疊時改看接下來的路。 */
function approachCamera(prevPoints: LatLng[], fallbackPoints: LatLng[]): { camera: LatLng; heading: number } {
  const target = prevPoints[prevPoints.length - 1];
  const camera = approachPoint(prevPoints);
  if (distanceMeters(camera, target) > 1) return { camera, heading: bearing(camera, target) };
  return { camera: target, heading: forwardHeading(fallbackPoints) };
}

/** 把 Routes API 的 steps 轉成路口故事板：出發點、每個需要轉彎的路口、抵達點。直行的 step 不出圖卡。 */
export function buildStoryboard(steps: RouteStep[]): StoryboardFrame[] {
  if (steps.length === 0) return [];
  const points = steps.map(stepPoints);
  const frames: StoryboardFrame[] = [];

  frames.push({
    kind: "start",
    instruction: steps[0].navigationInstruction?.instructions ?? "出發",
    maneuver: steps[0].navigationInstruction?.maneuver ?? "DEPART",
    node: points[0][0],
    camera: points[0][0],
    heading: forwardHeading(points[0]),
    routeHeading: forwardHeading(points[0]),
    distanceAfterMeters: steps[0].distanceMeters ?? 0,
  });

  for (let i = 1; i < steps.length; i++) {
    const maneuver = steps[i].navigationInstruction?.maneuver ?? "";
    if (SKIPPED_MANEUVERS.has(maneuver)) {
      frames[frames.length - 1].distanceAfterMeters += steps[i].distanceMeters ?? 0;
      continue;
    }
    frames.push({
      kind: "turn",
      instruction: steps[i].navigationInstruction?.instructions ?? "",
      maneuver,
      node: points[i - 1][points[i - 1].length - 1],
      ...approachCamera(points[i - 1], points[i]),
      routeHeading: forwardHeading(points[i]),
      distanceAfterMeters: steps[i].distanceMeters ?? 0,
    });
  }

  const last = points[points.length - 1];
  frames.push({
    kind: "arrive",
    instruction: "抵達目的地",
    maneuver: "ARRIVE",
    node: last[last.length - 1],
    ...approachCamera(last, last),
    routeHeading: forwardHeading(last),
    distanceAfterMeters: 0,
  });
  return frames;
}

export function streetViewImageUrl(frame: StoryboardFrame, apiKey: string, pano?: string): string {
  const params = new URLSearchParams({
    size: "640x400",
    ...(pano ? { pano } : { location: `${frame.camera.lat},${frame.camera.lng}` }),
    heading: String(frame.heading),
    fov: "80",
    pitch: "0",
    source: "outdoor",
    // 沒有街景時回 404（而不是灰色佔位圖），前端才能用 @error 顯示提示。
    return_error_code: "true",
    key: apiKey,
  });
  return `https://maps.googleapis.com/maps/api/streetview?${params}`;
}

export function streetViewMapsUrl(frame: StoryboardFrame): string {
  const params = new URLSearchParams({
    api: "1",
    map_action: "pano",
    viewpoint: `${frame.camera.lat},${frame.camera.lng}`,
    heading: String(frame.heading),
    pitch: "0",
    fov: "80",
  });
  return `https://www.google.com/maps/@?${params}`;
}

const MAP_PX = 640;

function mercator(p: LatLng, zoom: number): { x: number; y: number } {
  const scale = 256 * 2 ** zoom;
  const sin = Math.sin((p.lat * Math.PI) / 180);
  return {
    x: ((p.lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

// Static Maps 標籤只能是單一字元，所以自己決定地圖範圍，再用 HTML 疊上數字標記
function mapViewport(points: LatLng[]): { center: LatLng; zoom: number } {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const box = { n: Math.max(...lats), s: Math.min(...lats), w: Math.min(...lngs), e: Math.max(...lngs) };
  const usable = MAP_PX * 0.8;
  let zoom = 18;
  for (; zoom > 1; zoom--) {
    const nw = mercator({ lat: box.n, lng: box.w }, zoom);
    const se = mercator({ lat: box.s, lng: box.e }, zoom);
    if (se.x - nw.x <= usable && se.y - nw.y <= usable) break;
  }
  return { center: { lat: (box.n + box.s) / 2, lng: (box.w + box.e) / 2 }, zoom };
}

function routePoints(routePath: LatLng[], frames: StoryboardFrame[]): LatLng[] {
  return routePath.length ? routePath : frames.map((frame) => frame.node);
}

export function staticRouteMapUrl(routePath: LatLng[], frames: StoryboardFrame[], apiKey: string): string {
  const path = routePoints(routePath, frames);
  const params = new URLSearchParams({
    size: `${MAP_PX}x${MAP_PX}`,
    scale: "2",
    maptype: "roadmap",
    key: apiKey,
  });
  if (path.length) {
    const { center, zoom } = mapViewport([...path, ...frames.map((frame) => frame.node)]);
    params.set("center", `${center.lat},${center.lng}`);
    params.set("zoom", String(zoom));
    params.append("path", `color:0xe36255ff|weight:6|enc:${encodePolyline(path)}`);
  }
  return `https://maps.googleapis.com/maps/api/staticmap?${params}`;
}

/** 每張圖卡在地圖上的位置（百分比），編號 = 陣列 index + 1 */
export function mapMarkerPositions(routePath: LatLng[], frames: StoryboardFrame[]): { left: number; top: number }[] {
  const path = routePoints(routePath, frames);
  if (!path.length) return [];
  const { center, zoom } = mapViewport([...path, ...frames.map((frame) => frame.node)]);
  const c = mercator(center, zoom);
  return frames.map((frame) => {
    const p = mercator(frame.node, zoom);
    return { left: 50 + ((p.x - c.x) / MAP_PX) * 100, top: 50 + ((p.y - c.y) / MAP_PX) * 100 };
  });
}
