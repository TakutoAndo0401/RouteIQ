import type {
  GoogleGeocoder,
  GoogleInfoWindow,
  GoogleLatLngBounds,
  GoogleMap,
  GoogleMapsApi,
  GoogleMarker,
  MapMouseEvent,
  MapsEventListener
} from "../../shared/lib/googleMaps";

const STORYBOOK_POSITION = { lat: 35.681236, lng: 139.767125 };

class StorybookMap implements GoogleMap {
  private clickHandler: ((event: MapMouseEvent) => void) | undefined;
  private readonly selectButton: HTMLButtonElement;

  constructor(element: HTMLElement) {
    const canvas = document.createElement("div");
    canvas.className = "storybook-map-canvas";
    this.selectButton = document.createElement("button");
    this.selectButton.type = "button";
    this.selectButton.textContent = "東京駅付近を選択";
    this.selectButton.addEventListener("click", () => {
      this.clickHandler?.({
        latLng: {
          toJSON: () => STORYBOOK_POSITION
        }
      });
    });
    canvas.append(this.selectButton);
    element.replaceChildren(canvas);
  }

  addListener(
    eventName: "click",
    handler: (event: MapMouseEvent) => void
  ): MapsEventListener;
  addListener(eventName: "tilesloaded", handler: () => void): MapsEventListener;
  addListener(
    eventName: "click" | "tilesloaded",
    handler: ((event: MapMouseEvent) => void) | (() => void)
  ): MapsEventListener {
    if (eventName === "click") {
      this.clickHandler = handler as (event: MapMouseEvent) => void;
      return {
        remove: () => {
          this.clickHandler = undefined;
        }
      };
    }

    const tilesLoadedHandler = handler as () => void;
    queueMicrotask(tilesLoadedHandler);
    return { remove: () => undefined };
  }

  fitBounds() {}

  setCenter() {}

  setZoom() {}
}

class StorybookMarker implements GoogleMarker {
  addListener(eventName: "click", handler: () => void): MapsEventListener {
    void eventName;
    void handler;
    return { remove: () => undefined };
  }

  setPosition() {}
}

class StorybookGeocoder implements GoogleGeocoder {
  geocode(
    _request: { location: { lat: number; lng: number } },
    callback: Parameters<GoogleGeocoder["geocode"]>[1]
  ) {
    queueMicrotask(() => {
      callback([{ formatted_address: "日本、〒100-0005 東京都千代田区丸の内1丁目" }], "OK");
    });
  }
}

class StorybookLatLngBounds implements GoogleLatLngBounds {
  extend() {}
}

class StorybookInfoWindow implements GoogleInfoWindow {
  open() {}
}

export function installStorybookGoogleMapsMock() {
  const googleMapsMock: GoogleMapsApi = {
    maps: {
      Map: StorybookMap,
      Marker: StorybookMarker,
      Geocoder: StorybookGeocoder,
      LatLngBounds: StorybookLatLngBounds,
      InfoWindow: StorybookInfoWindow
    }
  };

  window.google = googleMapsMock;
  window.__routeIqGoogleMapsPromise = undefined;
}
