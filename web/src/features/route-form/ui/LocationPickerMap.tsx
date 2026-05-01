import { useEffect, useRef, useState } from "react";
import {
  getClientConfig,
  getGoogleMapsBrowserApiKey
} from "../../../shared/lib/routeIqApi";
import type {
  GoogleMarker,
  LatLngLiteral,
  MapsEventListener
} from "../../../shared/lib/googleMaps";
import { loadGoogleMaps, reverseGeocode } from "../../../shared/lib/googleMaps";
import { LoadingSpinner } from "../../../shared/ui";

type PickerTarget = "origin" | "destination";

interface LocationPickerMapProps {
  disabled?: boolean;
  origin: string;
  destination: string;
  target: PickerTarget;
  onOriginChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onSelectComplete?: () => void;
}

const DEFAULT_CENTER: LatLngLiteral = { lat: 35.681236, lng: 139.767125 };

function isLoadingStatus(status: string): boolean {
  return status.includes("読み込み中") || status.includes("確認しています");
}

export function LocationPickerMap({
  disabled = false,
  origin,
  destination,
  target,
  onOriginChange,
  onDestinationChange,
  onSelectComplete
}: LocationPickerMapProps) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<GoogleMarker | null>(null);
  const targetRef = useRef<PickerTarget>(target);
  const disabledRef = useRef(disabled);
  const [status, setStatus] = useState("地図を読み込み中です。");

  targetRef.current = target;
  disabledRef.current = disabled;

  const targetLabel = target === "origin" ? "出発地" : "目的地";
  const currentValue = target === "origin" ? origin : destination;

  useEffect(() => {
    let ignore = false;
    let listener: MapsEventListener | null = null;

    setStatus("地図を読み込み中です。");
    getClientConfig()
      .then(async (config) => {
        const apiKey = getGoogleMapsBrowserApiKey(config);
        if (!apiKey) {
          setStatus("地図選択には GOOGLE_MAPS_BROWSER_API_KEY と Maps JavaScript API が必要です。");
          return;
        }
        window.gm_authFailure = () => {
          if (!ignore) {
            setStatus(
              "Google Maps API key で地図を表示できません。Maps JavaScript API と Geocoding API の有効化、HTTP referrer 制限を確認してください。"
            );
          }
        };
        const google = await loadGoogleMaps(apiKey);
        if (ignore || !mapNodeRef.current) return;

        const map = new google.maps.Map(mapNodeRef.current, {
          center: DEFAULT_CENTER,
          zoom: 10,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false
        });
        const geocoder = new google.maps.Geocoder();
        setStatus(`${targetRef.current === "origin" ? "出発地" : "目的地"}にしたい地点を地図上でクリックしてください。`);

        listener = map.addListener("click", (event) => {
          const position = event.latLng?.toJSON();
          if (!position || disabledRef.current) return;
          const selectedTarget = targetRef.current;
          const label = selectedTarget === "origin" ? "出" : "目";
          const title = selectedTarget === "origin" ? "出発地" : "目的地";

          if (markerRef.current) {
            markerRef.current.setPosition(position);
          } else {
            markerRef.current = new google.maps.Marker({ map, position, label, title });
          }

          setStatus(`${title}を確認しています。`);
          void reverseGeocode(geocoder, position).then((address) => {
            if (selectedTarget === "origin") {
              onOriginChange(address);
              setStatus("出発地を設定しました。");
            } else {
              onDestinationChange(address);
              setStatus("目的地を設定しました。");
            }
            onSelectComplete?.();
          });
        });
      })
      .catch((error: unknown) => {
        if (!ignore) {
          setStatus(
            error instanceof Error && error.message.includes("Google Maps JavaScript API")
              ? error.message
              : "地図設定を取得できませんでした。API キーの設定とアプリサーバーの起動状態を確認してください。"
          );
        }
      });

    return () => {
      ignore = true;
      if (window.gm_authFailure) window.gm_authFailure = undefined;
      listener?.remove();
    };
  }, [onDestinationChange, onOriginChange, onSelectComplete]);

  return (
    <section className="location-picker" aria-label="地図で地点を選択">
      <div className="location-picker__header">
        <div>
          <p>地図選択</p>
          <h2>{targetLabel}を地図で選択</h2>
        </div>
      </div>

      <div ref={mapNodeRef} className="location-picker__map" />
      <div className="location-picker__status" aria-live="polite">
        <span className="location-picker__status-message">
          {isLoadingStatus(status) ? <LoadingSpinner label={status} size={14} /> : null}
          <span>{status}</span>
        </span>
        <dl>
          <div>
            <dt>{targetLabel}</dt>
            <dd>{currentValue || "未設定"}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
