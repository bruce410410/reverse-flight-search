import { describe, expect, it } from "vitest";
import {
  bearing,
  buildRoutePath,
  buildStoryboard,
  decodePolyline,
  distanceMeters,
  streetViewImageUrl,
  streetViewMapsUrl,
  type RouteStep,
} from "../utils/storyboard";

function encodeValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let out = "";
  while (v >= 0x20) {
    out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  return out + String.fromCharCode(v + 63);
}

function encodePolyline(points: [number, number][]): string {
  let prevLat = 0;
  let prevLng = 0;
  return points
    .map(([lat, lng]) => {
      const la = Math.round(lat * 1e5);
      const ln = Math.round(lng * 1e5);
      const s = encodeValue(la - prevLat) + encodeValue(ln - prevLng);
      prevLat = la;
      prevLng = ln;
      return s;
    })
    .join("");
}

function step(points: [number, number][], maneuver?: string, distance = 100): RouteStep {
  const [s, e] = [points[0], points[points.length - 1]];
  return {
    distanceMeters: distance,
    startLocation: { latLng: { latitude: s[0], longitude: s[1] } },
    endLocation: { latLng: { latitude: e[0], longitude: e[1] } },
    polyline: { encodedPolyline: encodePolyline(points) },
    navigationInstruction: maneuver ? { maneuver, instructions: maneuver } : undefined,
  };
}

describe("decodePolyline", () => {
  it("解出 Google 官方文件範例", () => {
    expect(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ]);
  });
});

describe("bearing / distanceMeters", () => {
  it("正北 0、正東 90、正南 180、正西 270", () => {
    const o = { lat: 25, lng: 121 };
    expect(bearing(o, { lat: 25.001, lng: 121 })).toBe(0);
    expect(bearing(o, { lat: 25, lng: 121.001 })).toBe(90);
    expect(bearing(o, { lat: 24.999, lng: 121 })).toBe(180);
    expect(bearing(o, { lat: 25, lng: 120.999 })).toBe(270);
  });

  it("緯度差 0.001 度約 111 公尺", () => {
    expect(distanceMeters({ lat: 25, lng: 121 }, { lat: 25.001, lng: 121 })).toBeCloseTo(111.2, 0);
  });
});

describe("buildStoryboard", () => {
  // 往北走 ~111m，到路口右轉往東 ~100m，再左轉往北
  const north: [number, number][] = [
    [25.0, 121.0],
    [25.0005, 121.0],
    [25.001, 121.0],
  ];
  const east: [number, number][] = [
    [25.001, 121.0],
    [25.001, 121.001],
  ];
  const northAgain: [number, number][] = [
    [25.001, 121.001],
    [25.002, 121.001],
  ];

  it("空路線回傳空陣列", () => {
    expect(buildStoryboard([])).toEqual([]);
  });

  it("產出 出發 → 每個轉彎 → 抵達，轉彎圖卡站在路口前方看向路口", () => {
    const frames = buildStoryboard([
      step(north, "DEPART"),
      step(east, "TURN_RIGHT"),
      step(northAgain, "TURN_LEFT"),
    ]);

    expect(frames.map((f) => f.kind)).toEqual(["start", "turn", "turn", "arrive"]);
    expect(frames[0].heading).toBe(0);
    expect(frames[1].node).toEqual({ lat: 25.001, lng: 121 });

    // 右轉路口：相機在往北那段上、離路口 ≥20m，面向北（看著路口）
    const turnRight = frames[1];
    expect(turnRight.maneuver).toBe("TURN_RIGHT");
    expect(turnRight.heading).toBe(0);
    expect(distanceMeters(turnRight.camera, { lat: 25.001, lng: 121 })).toBeGreaterThanOrEqual(20);

    // 左轉路口：相機在往東那段上，面向東
    expect(frames[2].heading).toBe(90);

    // 抵達：在最後一段上面向北
    expect(frames[3].heading).toBe(0);
    expect(frames[3].distanceAfterMeters).toBe(0);
  });

  it("直行 step 不出圖卡，距離併入前一張", () => {
    const frames = buildStoryboard([
      step(north, "DEPART", 50),
      step(east, "STRAIGHT", 30),
      step(northAgain, "TURN_LEFT", 70),
    ]);
    expect(frames.map((f) => f.kind)).toEqual(["start", "turn", "arrive"]);
    expect(frames[0].distanceAfterMeters).toBe(80);
  });

  it("前一段太短（相機與路口重疊）時改看接下來要走的方向", () => {
    const tiny: [number, number][] = [
      [25.0, 121.0],
      [25.0, 121.0],
    ];
    const frames = buildStoryboard([step(tiny, "DEPART"), step(east.map(([, lng]) => [25.0, lng]), "TURN_RIGHT")]);
    expect(frames[1].heading).toBe(90);
  });
});

describe("buildRoutePath", () => {
  it("合併每段 polyline 並避免段落交界點重複", () => {
    const north: [number, number][] = [
      [25.0, 121.0],
      [25.0005, 121.0],
      [25.001, 121.0],
    ];
    const east: [number, number][] = [
      [25.001, 121.0],
      [25.001, 121.001],
    ];
    const path = buildRoutePath([step(north, "DEPART"), step(east, "TURN_RIGHT")]);
    expect(path).toEqual([
      { lat: 25, lng: 121 },
      { lat: 25.0005, lng: 121 },
      { lat: 25.001, lng: 121 },
      { lat: 25.001, lng: 121.001 },
    ]);
  });
});

describe("streetViewImageUrl", () => {
  it("帶入位置、朝向、金鑰與 return_error_code", () => {
    const url = new URL(
      streetViewImageUrl(
        {
          kind: "turn",
          instruction: "",
          maneuver: "TURN_LEFT",
          node: { lat: 25, lng: 121 },
          camera: { lat: 25, lng: 121 },
          heading: 90,
          distanceAfterMeters: 0,
        },
        "KEY123",
      ),
    );
    expect(url.searchParams.get("location")).toBe("25,121");
    expect(url.searchParams.get("heading")).toBe("90");
    expect(url.searchParams.get("key")).toBe("KEY123");
    expect(url.searchParams.get("return_error_code")).toBe("true");
  });

  it("產生 Google Maps 街景外開連結", () => {
    const url = new URL(
      streetViewMapsUrl({
        kind: "turn",
        instruction: "",
        maneuver: "TURN_LEFT",
        node: { lat: 25, lng: 121 },
        camera: { lat: 25, lng: 121 },
        heading: 90,
        distanceAfterMeters: 0,
      }),
    );
    expect(url.hostname).toBe("www.google.com");
    expect(url.searchParams.get("map_action")).toBe("pano");
    expect(url.searchParams.get("viewpoint")).toBe("25,121");
  });
});
