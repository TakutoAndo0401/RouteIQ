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
type MapLoadState = "loading" | "ready" | "unavailable";

interface LocationPickerMapProps {
  /** 地図上の地点選択を無効にします。 */
  disabled?: boolean;
  /** 現在の出発地の表示値。 */
  origin: string;
  /** 現在の目的地の表示値。 */
  destination: string;
  /** 今回の地図操作で更新する地点。 */
  target: PickerTarget;
  /** 出発地が選択されたとき、逆ジオコーディング後の値を渡します。 */
  onOriginChange: (value: string) => void;
  /** 目的地が選択されたとき、逆ジオコーディング後の値を渡します。 */
  onDestinationChange: (value: string) => void;
  /** 地点の選択と値の反映が完了したときに呼ばれます。 */
  onSelectComplete?: () => void;
  /** 地図を閉じ、住所または施設名の手入力へ戻るときに呼ばれます。 */
  onManualEntryRequest?: () => void;
}

const DEFAULT_CENTER: LatLngLiteral = { lat: 35.681236, lng: 139.767125 };

function isLoadingStatus(status: string): boolean {
  return status.includes("読み込み中") || status.includes("確認しています");
}

/**
 * Google Maps上で候補地点を選び、住所へ変換して出発地または目的地へ反映します。
 *
 * @summary 地図から出発地または目的地を選択
 */
export function LocationPickerMap({
  disabled = false,
  origin,
  destination,
  target,
  onOriginChange,
  onDestinationChange,
  onSelectComplete,
  onManualEntryRequest
}: LocationPickerMapProps) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<GoogleMarker | null>(null);
  const targetRef = useRef<PickerTarget>(target);
  const disabledRef = useRef(disabled);
  const [status, setStatus] = useState("地図を読み込み中です。");
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isResolvingSelection, setIsResolvingSelection] = useState(false);
  const [mapLoadState, setMapLoadState] = useState<MapLoadState>("loading");

  targetRef.current = target;
  disabledRef.current = disabled;

  const targetLabel = target === "origin" ? "出発地" : "目的地";
  const currentValue = target === "origin" ? origin : destination;

  useEffect(() => {
    setSelectedAddress(null);
    setIsResolvingSelection(false);
    if (mapLoadState === "ready") {
      setStatus(`${targetLabel}にしたい地点を地図上でクリックしてください。`);
    }
  }, [mapLoadState, target, targetLabel]);

  useEffect(() => {
    let ignore = false;
    let listener: MapsEventListener | null = null;
    let tilesListener: MapsEventListener | null = null;

    setMapLoadState("loading");
    setStatus("地図を読み込んでいます。");
    getClientConfig()
      .then(async (config) => {
        const apiKey = getGoogleMapsBrowserApiKey(config);
        if (!apiKey) {
          setMapLoadState("unavailable");
          setStatus("地図選択を利用できません。住所または施設名を入力してください。");
          return;
        }
        window.gm_authFailure = () => {
          if (!ignore) {
            setMapLoadState("unavailable");
            setStatus("地図を表示できません。住所または施設名を入力してください。");
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
        setStatus("地図を表示しています。");
        tilesListener = map.addListener("tilesloaded", () => {
          if (ignore) return;
          setMapLoadState("ready");
          setStatus(
            `${targetRef.current === "origin" ? "出発地" : "目的地"}にしたい地点を地図上でクリックしてください。`
          );
        });

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

          setIsResolvingSelection(true);
          setSelectedAddress(null);
          setStatus(`${title}を確認しています。`);
          void reverseGeocode(geocoder, position)
            .then((address) => {
              setSelectedAddress(address);
              setStatus(`${title}の候補を確認しました。内容を確認して確定してください。`);
            })
            .catch(() => {
              const fallbackAddress = `${position.lat.toFixed(6)},${position.lng.toFixed(6)}`;
              setSelectedAddress(fallbackAddress);
              setStatus(`${title}の候補を確認しました。内容を確認して確定してください。`);
            })
            .finally(() => {
              setIsResolvingSelection(false);
            });
        });
      })
      .catch(() => {
        if (!ignore) {
          setStatus("地図を表示できません。住所または施設名を入力してください。");
          setMapLoadState("unavailable");
        }
      });

    return () => {
      ignore = true;
      if (window.gm_authFailure) window.gm_authFailure = undefined;
      listener?.remove();
      tilesListener?.remove();
    };
  }, []);

  return (
    <section className="location-picker" aria-label="地図で地点を選択">
      <div className="location-picker__map-shell">
        <div ref={mapNodeRef} className="location-picker__map" />
        {mapLoadState !== "ready" ? (
          <div
            className={`location-picker__map-status${
              mapLoadState === "unavailable" ? " location-picker__map-status--unavailable" : ""
            }`}
            role="status"
          >
            {mapLoadState === "loading" ? (
              <span aria-hidden="true">
                <LoadingSpinner label={status} size={18} />
              </span>
            ) : null}
            <span>{status}</span>
          </div>
        ) : null}
      </div>
      <div className="location-picker__status" aria-live="polite">
        {mapLoadState === "ready" || isResolvingSelection ? (
          <span className="location-picker__status-message">
            {isLoadingStatus(status) || isResolvingSelection ? (
              <span aria-hidden="true">
                <LoadingSpinner label={status} size={14} />
              </span>
            ) : null}
            <span>{status}</span>
          </span>
        ) : null}
        <dl>
          <div>
            <dt>現在</dt>
            <dd>{currentValue || "未設定"}</dd>
          </div>
          <div>
            <dt>選択候補</dt>
            <dd>{selectedAddress ?? "まだ選択していません"}</dd>
          </div>
        </dl>
      </div>
      <div className="location-picker__actions">
        {mapLoadState === "unavailable" && onManualEntryRequest ? (
          <button
            className="primary-button location-picker__manual-entry-button"
            type="button"
            disabled={disabled}
            onClick={onManualEntryRequest}
          >
            住所を入力する
          </button>
        ) : (
          <button
            className="primary-button"
            type="button"
            disabled={disabled || isResolvingSelection || !selectedAddress}
            onClick={() => {
              if (!selectedAddress) return;

              if (target === "origin") {
                onOriginChange(selectedAddress);
              } else {
                onDestinationChange(selectedAddress);
              }

              setStatus(`${targetLabel}を設定しました。`);
              onSelectComplete?.();
            }}
          >
            {targetLabel}に設定する
          </button>
        )}
      </div>
    </section>
  );
}
