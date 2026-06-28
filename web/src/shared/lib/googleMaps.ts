export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface MapsEventListener {
  remove: () => void;
}

export interface MapMouseEvent {
  latLng?: {
    toJSON: () => LatLngLiteral;
  };
}

export interface GoogleMap {
  addListener: {
    (eventName: "click", handler: (event: MapMouseEvent) => void): MapsEventListener;
    (eventName: "tilesloaded", handler: () => void): MapsEventListener;
  };
  fitBounds: (bounds: GoogleLatLngBounds) => void;
  setCenter: (position: LatLngLiteral) => void;
  setZoom: (zoom: number) => void;
}

export interface GoogleMarker {
  addListener: (eventName: "click", handler: () => void) => MapsEventListener;
  setPosition: (position: LatLngLiteral) => void;
}

export interface GoogleLatLngBounds {
  extend: (position: LatLngLiteral) => void;
}

export interface GoogleInfoWindow {
  open: (options: { map: GoogleMap; anchor: GoogleMarker }) => void;
}

export interface GoogleGeocoderResult {
  formatted_address?: string;
}

export interface GoogleGeocoder {
  geocode: (
    request: { location: LatLngLiteral },
    callback: (results: GoogleGeocoderResult[] | null, status: string) => void
  ) => void;
}

export interface GoogleMapsApi {
  maps: {
    LatLngBounds: new () => GoogleLatLngBounds;
    Map: new (
      element: HTMLElement,
      options: {
        center: LatLngLiteral;
        zoom: number;
        streetViewControl: boolean;
        mapTypeControl: boolean;
        fullscreenControl: boolean;
      }
    ) => GoogleMap;
    Marker: new (options: {
      map: GoogleMap;
      position: LatLngLiteral;
      label?: string;
      title: string;
    }) => GoogleMarker;
    InfoWindow: new (options: { content: string }) => GoogleInfoWindow;
    Geocoder: new () => GoogleGeocoder;
  };
}

declare global {
  interface Window {
    google?: GoogleMapsApi;
    __routeIqGoogleMapsPromise?: Promise<GoogleMapsApi>;
    __routeIqInitGoogleMaps?: () => void;
    gm_authFailure?: () => void;
  }
}

const SCRIPT_ID = "routeiq-google-maps-js";

export function loadGoogleMaps(apiKey: string): Promise<GoogleMapsApi> {
  if (window.google) return Promise.resolve(window.google);
  if (window.__routeIqGoogleMapsPromise) return window.__routeIqGoogleMapsPromise;

  window.__routeIqGoogleMapsPromise = new Promise((resolve, reject) => {
    window.__routeIqInitGoogleMaps = () => {
      if (window.google) {
        resolve(window.google);
      } else {
        reject(new Error("Google Maps JavaScript API の読み込みに失敗しました。"));
      }
    };

    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) return;

    const script = document.createElement("script");
    const url = new URL("https://maps.googleapis.com/maps/api/js");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("callback", "__routeIqInitGoogleMaps");
    url.searchParams.set("language", "ja");
    url.searchParams.set("region", "JP");
    url.searchParams.set("v", "weekly");
    url.searchParams.set("loading", "async");

    script.id = SCRIPT_ID;
    script.src = url.toString();
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Google Maps JavaScript API の読み込みに失敗しました。"));
    document.head.appendChild(script);
  });

  return window.__routeIqGoogleMapsPromise;
}

export function formatCoordinate(position: LatLngLiteral): string {
  return `${position.lat.toFixed(6)},${position.lng.toFixed(6)}`;
}

export function reverseGeocode(
  geocoder: GoogleGeocoder,
  position: LatLngLiteral
): Promise<string> {
  return new Promise((resolve) => {
    geocoder.geocode({ location: position }, (results, status) => {
      const formattedAddress = results?.[0]?.formatted_address?.trim();
      resolve(status === "OK" && formattedAddress ? formattedAddress : formatCoordinate(position));
    });
  });
}
