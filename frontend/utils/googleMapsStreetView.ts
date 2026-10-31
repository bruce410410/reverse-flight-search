export interface StreetViewPov {
  heading: number;
  pitch: number;
}

export interface StreetViewPanoramaInstance {
  addListener(eventName: "pov_changed" | "status_changed" | "zoom_changed", handler: () => void): { remove: () => void };
  getPov(): StreetViewPov;
  setPov(pov: StreetViewPov): void;
  getStatus(): string;
  getZoom(): number;
  setPano(pano: string): void;
  setVisible(visible: boolean): void;
}

export interface StreetViewPanoramaData {
  location?: {
    pano?: string;
    latLng?: { lat(): number; lng(): number };
  };
}

interface GoogleMapsApi {
  maps: {
    StreetViewService: new () => {
      getPanorama(
        request: {
          location: { lat: number; lng: number };
          radius: number;
          preference: "nearest";
          sources: Iterable<"outdoor">;
        },
        callback: (data: StreetViewPanoramaData | null, status: string) => void,
      ): void;
    };
    StreetViewPanorama: new (
      container: HTMLElement,
      options: {
        pano?: string;
        position?: { lat: number; lng: number };
        pov: StreetViewPov;
        zoom: number;
        addressControl: boolean;
        fullscreenControl: boolean;
        motionTracking: boolean;
        motionTrackingControl: boolean;
        scrollwheel: boolean;
        zoomControl: boolean;
        linksControl: boolean;
        clickToGo: boolean;
        panControl: boolean;
        visible?: boolean;
      },
    ) => StreetViewPanoramaInstance;
  };
}

declare global {
  interface Window {
    google?: GoogleMapsApi;
  }
}

let loaderPromise: Promise<GoogleMapsApi> | null = null;
let loaderKey: string | null = null;

/** 載入瀏覽器端 Maps JavaScript API；同一頁的多張街景共用同一個 script。 */
export function loadGoogleMapsStreetView(apiKey: string): Promise<GoogleMapsApi> {
  if (window.google?.maps?.StreetViewPanorama) {
    if (loaderKey && loaderKey !== apiKey) return Promise.reject(new Error("Reload the page after changing the Google Maps API key."));
    return Promise.resolve(window.google);
  }
  if (loaderPromise) {
    if (loaderKey !== apiKey) return Promise.reject(new Error("Google Maps API is already loading with another key."));
    return loaderPromise;
  }

  loaderKey = apiKey;
  loaderPromise = new Promise<GoogleMapsApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async`;
    script.onload = () => {
      const googleMaps = window.google;
      if (googleMaps?.maps?.StreetViewPanorama) resolve(googleMaps);
      else reject(new Error("Google Maps JavaScript API did not initialize."));
    };
    script.onerror = () => reject(new Error("Google Maps JavaScript API could not be loaded."));
    document.head.append(script);
  }).catch((error: unknown) => {
    loaderPromise = null;
    loaderKey = null;
    throw error;
  });

  return loaderPromise;
}
