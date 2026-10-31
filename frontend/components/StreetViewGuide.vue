<script setup lang="ts">
import { bearing, distanceMeters, streetViewImageUrl, type StoryboardFrame } from "~/utils/storyboard";
import {
  loadGoogleMapsStreetView,
  type StreetViewPanoramaData,
  type StreetViewPanoramaInstance,
} from "~/utils/googleMapsStreetView";

const props = defineProps<{
  frame: StoryboardFrame;
  apiKey: string;
  title: string;
}>();

const { t } = useI18n();
const panoramaEl = ref<HTMLElement | null>(null);
const interactiveRequested = ref(false);
const loading = ref(true);
const failed = ref(false);
const previewFailed = ref(false);
const previewImage = computed(() => streetViewImageUrl(props.frame, props.apiKey));
const panoramaReady = ref(false);
const targetX = ref(50);
const targetInView = ref(true);
let observer: IntersectionObserver | null = null;
let listeners: Array<{ remove: () => void }> = [];
let disposed = false;
let inView = false;
let initializing = false;
let activePanorama: StreetViewPanoramaInstance | null = null;
let activePanoId: string | null = null;
let activationTimer: ReturnType<typeof setTimeout> | null = null;
let statusErrorTimer: ReturnType<typeof setTimeout> | null = null;
let recoveryTimer: ReturnType<typeof setTimeout> | null = null;
let recoveryAttempted = false;
let povUpdateTimer: ReturnType<typeof setTimeout> | null = null;
let dragPointerId: number | null = null;
let dragStartX = 0;
let dragStartHeading = 0;
let dragSurfaceWidth = 1;
let desiredHeading = 0;
let lastPovUpdate = 0;
const povUpdateIntervalMs = 350;

function updateTarget(panorama: StreetViewPanoramaInstance) {
  const pov = panorama.getPov();
  const targetHeading = distanceMeters(props.frame.camera, props.frame.node) > 3
    ? bearing(props.frame.camera, props.frame.node)
    : props.frame.routeHeading ?? props.frame.heading;
  const delta = ((targetHeading - pov.heading + 540) % 360) - 180;
  // Convert the target's bearing to a horizontal screen position using Street View's current FOV.
  const zoom = panorama.getZoom();
  const halfFov = Math.min(89, 90 / 2 ** zoom);
  targetInView.value = Math.abs(delta) <= halfFov;
  if (!targetInView.value) {
    targetX.value = delta < 0 ? 6 : 94;
    return;
  }
  const denominator = Math.tan((halfFov * Math.PI) / 180);
  const projected = 50 + 50 * Math.tan((delta * Math.PI) / 180) / Math.max(denominator, 0.01);
  targetX.value = Math.min(92, Math.max(8, projected));
}

function findPanorama(
  googleMaps: Awaited<ReturnType<typeof loadGoogleMapsStreetView>>,
  location: { lat: number; lng: number },
) {
  const service = new googleMaps.maps.StreetViewService();
  const searches = [
    { radius: 100, sources: ["outdoor"] as const },
    { radius: 500, sources: ["outdoor"] as const },
  ];

  return searches.reduce<Promise<NonNullable<StreetViewPanoramaData["location"]> | null>>(async (previous, search) => {
    const existing = await previous;
    if (existing) return existing;
    return new Promise((resolve) => {
      service.getPanorama({
        location,
        radius: search.radius,
        preference: "nearest",
        sources: search.sources,
      }, (data, status) => resolve(status === "OK" ? data?.location ?? null : null));
    });
  }, Promise.resolve(null));
}

async function initializePanorama() {
  if (!interactiveRequested.value || !panoramaEl.value || disposed || !inView || initializing || activePanorama) return;
  initializing = true;
  loading.value = true;
  try {
    const googleMaps = await loadGoogleMapsStreetView(props.apiKey);
    if (!panoramaEl.value || disposed || !inView) return;
    const panoramaLocation = await findPanorama(googleMaps, {
      lat: props.frame.camera.lat,
      lng: props.frame.camera.lng,
    });
    if (!panoramaLocation?.pano) {
      failed.value = true;
      loading.value = false;
      return;
    }
    if (!panoramaEl.value || disposed || !inView) return;
    const panoId = panoramaLocation.pano;
    const panorama = new googleMaps.maps.StreetViewPanorama(panoramaEl.value, {
      pano: panoId,
      pov: { heading: props.frame.heading, pitch: 0 },
      zoom: 1,
      addressControl: false,
      fullscreenControl: true,
      motionTracking: false,
      motionTrackingControl: false,
      scrollwheel: false,
      zoomControl: true,
      linksControl: false,
      clickToGo: false,
      panControl: false,
      visible: true,
    });
    activePanorama = panorama;
    activePanoId = panoId;
    updateTarget(panorama);
    listeners = [
      panorama.addListener("pov_changed", () => {
        const pov = panorama.getPov();
        if (Math.abs(pov.pitch) > 0.5) panorama.setPov({ heading: pov.heading, pitch: 0 });
        updateTarget(panorama);
      }),
      panorama.addListener("zoom_changed", () => updateTarget(panorama)),
      panorama.addListener("status_changed", () => handlePanoramaStatus(panorama, panoId)),
    ];
    // The pano is supplied to the constructor, and the canvas stays covered by the loading
    // state until status_changed confirms that the lookup completed successfully.
    statusErrorTimer = setTimeout(() => {
      statusErrorTimer = null;
      if (panoramaReady.value || disposed) return;
      // Some API responses do not emit status_changed in time. Check once after the
      // request window before giving up; never use the constructor's immediate status.
      if (panorama.getStatus() === "OK") handlePanoramaStatus(panorama, panoId);
      else {
        failed.value = true;
        loading.value = false;
      }
    }, 9000);
  } catch {
    if (!disposed) {
      failed.value = true;
      loading.value = false;
    }
  } finally {
    initializing = false;
    if (interactiveRequested.value && inView && !disposed && !activePanorama && !failed.value) {
      void initializePanorama();
    }
  }
}

function schedulePanoramaActivation() {
  if (activationTimer) clearTimeout(activationTimer);
  activationTimer = setTimeout(() => {
    activationTimer = null;
    void initializePanorama();
  }, 250);
}

function activateStreetView() {
  if (previewFailed.value) return;
  interactiveRequested.value = true;
  loading.value = true;
  if (inView) schedulePanoramaActivation();
}

function handlePanoramaStatus(panorama: StreetViewPanoramaInstance, panoId: string) {
  if (panorama.getStatus() === "OK") {
    if (statusErrorTimer) clearTimeout(statusErrorTimer);
    statusErrorTimer = null;
    if (recoveryTimer) clearTimeout(recoveryTimer);
    recoveryTimer = null;
    panoramaReady.value = true;
    panorama.setVisible(inView);
    failed.value = false;
    loading.value = false;
    return;
  }

  if (!recoveryAttempted && !recoveryTimer) {
    recoveryAttempted = true;
    loading.value = true;
    failed.value = false;
    panorama.setVisible(false);
    recoveryTimer = setTimeout(() => {
      recoveryTimer = null;
      if (!disposed && inView) panorama.setPano(panoId);
    }, 350);
  }
}

function onPovPointerDown(event: PointerEvent) {
  if (!activePanorama || !panoramaReady.value || !event.isPrimary) return;
  if (event.pointerType === "mouse") event.preventDefault();
  dragPointerId = event.pointerId;
  dragStartX = event.clientX;
  dragStartHeading = activePanorama.getPov().heading;
  desiredHeading = dragStartHeading;
  dragSurfaceWidth = Math.max(1, panoramaEl.value?.clientWidth ?? (event.currentTarget as HTMLElement).clientWidth);
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function updateDesiredHeading(event: PointerEvent) {
  if (dragPointerId !== event.pointerId || !activePanorama) return;
  const fieldOfView = 180 / 2 ** activePanorama.getZoom();
  const delta = (event.clientX - dragStartX) * fieldOfView / dragSurfaceWidth;
  desiredHeading = ((dragStartHeading - delta) % 360 + 360) % 360;
  const fromCurrent = ((desiredHeading - activePanorama.getPov().heading + 540) % 360) - 180;
  if (Math.abs(fromCurrent) < 0.5) {
    if (povUpdateTimer) clearTimeout(povUpdateTimer);
    povUpdateTimer = null;
    return;
  }
  const wait = Math.max(0, povUpdateIntervalMs - (Date.now() - lastPovUpdate));
  if (wait === 0) {
    if (povUpdateTimer) clearTimeout(povUpdateTimer);
    povUpdateTimer = null;
    applyDesiredHeading();
  } else if (!povUpdateTimer) {
    povUpdateTimer = setTimeout(() => {
      povUpdateTimer = null;
      applyDesiredHeading();
    }, wait);
  }
}

function applyDesiredHeading() {
  if (!activePanorama || !panoramaReady.value || !inView) return;
  activePanorama.setPov({ heading: desiredHeading, pitch: 0 });
  lastPovUpdate = Date.now();
}

function onPovPointerMove(event: PointerEvent) {
  updateDesiredHeading(event);
}

function onPovPointerUp(event: PointerEvent) {
  if (dragPointerId !== event.pointerId) return;
  updateDesiredHeading(event);
  dragPointerId = null;
  const surface = event.currentTarget as HTMLElement;
  if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
}

function onPovPointerCancel(event: PointerEvent) {
  if (dragPointerId !== event.pointerId) return;
  dragPointerId = null;
  if (povUpdateTimer) clearTimeout(povUpdateTimer);
  povUpdateTimer = null;
}

onMounted(() => {
  if (!panoramaEl.value) return;
  if (typeof IntersectionObserver === "undefined") {
    inView = true;
    void initializePanorama();
    return;
  }
  observer = new IntersectionObserver((entries) => {
    inView = entries.some((entry) => entry.isIntersecting);
    if (!inView) {
      if (activationTimer) clearTimeout(activationTimer);
      activationTimer = null;
      activePanorama?.setVisible(false);
      return;
    }
    if (activePanorama) {
      if (panoramaReady.value) activePanorama.setVisible(true);
      else if (activePanoId) activePanorama.setPano(activePanoId);
    }
    else if (interactiveRequested.value) schedulePanoramaActivation();
  }, { rootMargin: "0px", threshold: 0.1 });
  observer.observe(panoramaEl.value);
});

onBeforeUnmount(() => {
  disposed = true;
  observer?.disconnect();
  if (activationTimer) clearTimeout(activationTimer);
  if (statusErrorTimer) clearTimeout(statusErrorTimer);
  if (recoveryTimer) clearTimeout(recoveryTimer);
  if (povUpdateTimer) clearTimeout(povUpdateTimer);
  activePanorama?.setVisible(false);
  listeners.forEach((listener) => listener.remove());
});
</script>

<template>
  <div class="street-view-guide">
    <div
      ref="panoramaEl"
      class="panorama-canvas"
      :class="{ 'panorama-unconfirmed': !interactiveRequested || loading || failed }"
      :aria-label="title"
    />
    <div v-if="interactiveRequested && panoramaReady && !failed" class="pov-drag-zones" aria-hidden="true">
      <div class="pov-drag-zone pov-drag-main" @pointerdown="onPovPointerDown" @pointermove="onPovPointerMove" @pointerup="onPovPointerUp" @pointercancel="onPovPointerCancel" @lostpointercapture="onPovPointerCancel" />
      <div class="pov-drag-zone pov-drag-top" @pointerdown="onPovPointerDown" @pointermove="onPovPointerMove" @pointerup="onPovPointerUp" @pointercancel="onPovPointerCancel" @lostpointercapture="onPovPointerCancel" />
      <div class="pov-drag-zone pov-drag-bottom" @pointerdown="onPovPointerDown" @pointermove="onPovPointerMove" @pointerup="onPovPointerUp" @pointercancel="onPovPointerCancel" @lostpointercapture="onPovPointerCancel" />
      <div class="pov-drag-zone pov-drag-right" @pointerdown="onPovPointerDown" @pointermove="onPovPointerMove" @pointerup="onPovPointerUp" @pointercancel="onPovPointerCancel" @lostpointercapture="onPovPointerCancel" />
    </div>
    <button
      v-if="!interactiveRequested && !previewFailed"
      class="street-view-preview"
      type="button"
      :aria-label="`${title} — ${t('routes.result.streetViewPreview')}`"
      @click="activateStreetView"
    >
      <img :src="previewImage" :alt="title" loading="lazy" decoding="async" @error="previewFailed = true" />
      <span class="preview-prompt">{{ t("routes.result.streetViewPreview") }}</span>
    </button>
    <div v-if="!interactiveRequested && previewFailed" class="panorama-message panorama-error">{{ t("routes.result.streetViewUnavailable") }}</div>
    <div v-if="interactiveRequested && loading && !failed" class="panorama-message">{{ t("routes.result.streetViewLoading") }}</div>
    <div v-if="interactiveRequested && failed" class="panorama-message panorama-error">{{ t("routes.result.streetViewUnavailable") }}</div>
    <div
      v-if="interactiveRequested && targetInView && !loading && !failed"
      class="route-target"
      :style="{ left: `${targetX}%` }"
      aria-hidden="true"
    >
      <span class="target-label">{{ t(`routes.result.target.${frame.kind}`) }}</span>
      <svg class="target-pin" viewBox="0 0 30 40">
        <path d="M15 38 C15 38 3 24 3 14 A12 12 0 0 1 27 14 C27 24 15 38 15 38 Z" />
        <circle cx="15" cy="14" r="4.5" />
      </svg>
    </div>
    <div
      v-else-if="interactiveRequested && !loading && !failed"
      class="target-edge"
      aria-hidden="true"
    >
      <span>{{ t("routes.result.lookThisWay") }}</span>
    </div>
  </div>
</template>

<style scoped>
.street-view-guide {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--sage);
}
.panorama-canvas {
  width: 100%;
  height: 100%;
  transition: opacity 0.2s ease;
}
.panorama-unconfirmed {
  opacity: 0;
}
.pov-drag-zones {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}
.pov-drag-zone {
  position: absolute;
  pointer-events: auto;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
}
.pov-drag-zone:active {
  cursor: grabbing;
}
.pov-drag-main {
  inset: 52px 72px 56px 0;
}
.pov-drag-top {
  top: 0;
  right: 72px;
  left: 0;
  height: 52px;
}
.pov-drag-bottom {
  right: 72px;
  bottom: 0;
  left: 0;
  height: 56px;
}
.pov-drag-right {
  top: 52px;
  right: 0;
  bottom: 56px;
  width: 72px;
}
.street-view-preview {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: block;
  overflow: hidden;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: var(--sage);
  color: inherit;
  cursor: pointer;
}
.street-view-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.preview-prompt {
  position: absolute;
  right: 12px;
  bottom: 12px;
  left: 12px;
  z-index: 1;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgb(20 28 31 / 78%);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  text-align: center;
  opacity: 1;
  transition: opacity 0.2s ease;
  pointer-events: none;
}
.street-view-preview:hover .preview-prompt,
.street-view-preview:focus-visible .preview-prompt {
  opacity: 1;
}
.street-view-preview:focus-visible {
  outline: 4px solid #1685f8;
  outline-offset: -4px;
}
.panorama-message {
  z-index: 3;
}
.panorama-error {
  z-index: 4;
}
.route-target {
  position: absolute;
  top: 56%;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translate(-50%, -50%);
  pointer-events: none;
  transition: left 90ms linear;
}
.target-label {
  padding: 6px 10px;
  border: 2px solid var(--ink);
  border-radius: 999px;
  background: var(--white);
  box-shadow: 2px 2px 0 var(--ink);
  color: var(--ink);
  font-size: 13px;
  font-weight: 900;
  white-space: nowrap;
}
.target-pin {
  display: block;
  width: 30px;
  height: 40px;
  margin-top: 3px;
  filter: drop-shadow(2px 2px 0 var(--ink));
}
.target-pin path {
  fill: var(--coral);
  stroke: var(--ink);
  stroke-width: 2;
  stroke-linejoin: round;
}
.target-pin circle {
  fill: #fff;
}
.target-edge {
  position: absolute;
  top: 53%;
  right: 8px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  border: 2px solid var(--ink);
  border-radius: 999px;
  background: var(--white);
  box-shadow: 2px 2px 0 var(--ink);
  color: var(--ink);
  font-size: 12px;
  font-weight: 900;
  pointer-events: none;
}
.panorama-message {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgb(255 255 255 / 78%);
  color: var(--ink);
  font-weight: 800;
  text-align: center;
  pointer-events: none;
}
.panorama-error {
  background: #fff8f0;
}
</style>
