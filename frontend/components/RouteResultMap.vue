<script setup lang="ts">
import { loadGoogleMapsStreetView, type MapOverlay } from "~/utils/googleMapsStreetView";
import type { LatLng, StoryboardFrame } from "~/utils/storyboard";

// 可拖曳、縮放的路線地圖。疊在靜態地圖上；載入失敗就不顯示，讓底下的靜態地圖當備援。
const props = defineProps<{ routePath: LatLng[]; frames: StoryboardFrame[]; apiKey: string; label: string }>();

const mapEl = ref<HTMLElement | null>(null);
const ready = ref(false);
type GoogleMapsApi = Awaited<ReturnType<typeof loadGoogleMapsStreetView>>;
let googleMaps: GoogleMapsApi | null = null;
let map: InstanceType<GoogleMapsApi["maps"]["Map"]> | null = null;
let overlays: MapOverlay[] = [];
let disposed = false;

function draw() {
  if (!googleMaps || !mapEl.value) return;
  const path = props.routePath.length ? props.routePath : props.frames.map((frame) => frame.node);
  const points = [...path, ...props.frames.map((frame) => frame.node)];
  if (!points.length) return;

  map ??= new googleMaps.maps.Map(mapEl.value, {
    center: points[0],
    zoom: 15,
    clickableIcons: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });
  overlays.forEach((overlay) => overlay.setMap(null));

  const bounds = new googleMaps.maps.LatLngBounds();
  points.forEach((point) => bounds.extend(point));
  map.fitBounds(bounds, 32);

  overlays = [
    new googleMaps.maps.Polyline({ path, strokeColor: "#e36255", strokeOpacity: 1, strokeWeight: 6, map }),
    ...props.frames.map(
      (frame, i) =>
        new googleMaps!.maps.Marker({
          position: frame.node,
          map,
          label: { text: String(i + 1), color: "#2d2420", fontSize: "11px", fontWeight: "700" },
          icon: {
            path: googleMaps!.maps.SymbolPath.CIRCLE,
            scale: 11,
            fillColor: "#f3c262",
            fillOpacity: 1,
            strokeColor: "#2d2420",
            strokeWeight: 2,
          },
          zIndex: i + 1,
        }),
    ),
  ];
  ready.value = true;
}

onMounted(async () => {
  try {
    googleMaps = await loadGoogleMapsStreetView(props.apiKey);
  } catch {
    return; // 保留底下的靜態地圖
  }
  if (!disposed) draw();
});

watch(() => [props.routePath, props.frames], draw);

onBeforeUnmount(() => {
  disposed = true;
  overlays.forEach((overlay) => overlay.setMap(null));
  overlays = [];
});
</script>

<template>
  <div ref="mapEl" class="route-result-live-map" :class="{ ready }" role="region" :aria-label="label" />
</template>

<style scoped>
.route-result-live-map {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}
.route-result-live-map.ready {
  opacity: 1;
  pointer-events: auto;
}
</style>
