import { AlertCircle, Calculator, LocateFixed, MapPinned, MapPin, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { RouteAnalysisRequest } from "../../../entities/route/model";
import { LoadingSpinner } from "../../../shared/ui";
import { loadGoogleMaps, reverseGeocode } from "../../../shared/lib/googleMaps";
import {
  getClientConfig,
  getGoogleMapsBrowserApiKey
} from "../../../shared/lib/routeIqApi";
import { useFuelPriceAverages } from "../model/useFuelPriceAverages";
import { LocationPickerMap } from "./LocationPickerMap";

interface RouteFormProps {
  disabled?: boolean;
  initialValues?: RouteAnalysisRequest | null;
  onSubmit: (input: RouteAnalysisRequest) => void;
}

type FormErrors = Partial<
  Record<"origin" | "destination" | "fuelEfficiency" | "fuelPrice" | "currentLocation", string>
>;
type MapPickerTarget = "origin" | "destination";

const VEHICLE_TYPES = ["普通車", "軽自動車", "中型車", "大型車"] as const;
const DEFAULT_QUESTION = "現在の道路状況を確認して";

export function RouteForm({ disabled = false, initialValues = null, onSubmit }: RouteFormProps) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [fuelEfficiency, setFuelEfficiency] = useState("15");
  const [fuelPrice, setFuelPrice] = useState("");
  const [vehicleType, setVehicleType] = useState("普通車");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isResolvingCurrentLocation, setIsResolvingCurrentLocation] = useState(false);
  const { fuelPriceAverages, fuelPriceError } = useFuelPriceAverages();
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [mapPickerTarget, setMapPickerTarget] = useState<MapPickerTarget>("origin");
  const closeMapPickerButtonRef = useRef<HTMLButtonElement | null>(null);
  const originDescribedBy =
    [
      errors.origin ? "origin-error" : undefined,
      errors.currentLocation ? "current-location-error" : undefined
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  useEffect(() => {
    if (!initialValues) return;

    setOrigin(initialValues.origin);
    setDestination(initialValues.destination);
    setFuelEfficiency(String(initialValues.fuelEfficiencyKmPerLiter));
    setFuelPrice(
      typeof initialValues.fuelPriceYenPerLiter === "number"
        ? String(initialValues.fuelPriceYenPerLiter)
        : ""
    );
    setVehicleType(initialValues.vehicleType ?? "普通車");
    setErrors({});
  }, [initialValues]);

  const updateOrigin = (value: string) => {
    setOrigin(value);
    if (errors.origin || errors.currentLocation) {
      setErrors((current) => ({
        ...current,
        origin: undefined,
        currentLocation: undefined
      }));
    }
  };
  const updateDestination = (value: string) => {
    setDestination(value);
    if (errors.destination) setErrors((current) => ({ ...current, destination: undefined }));
  };

  const openMapPicker = (target: MapPickerTarget) => {
    setMapPickerTarget(target);
    setIsMapPickerOpen(true);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrors((current) => ({
        ...current,
        currentLocation: "現在地を取得できません。ブラウザの位置情報許可を確認してください。"
      }));
      return;
    }

    setIsResolvingCurrentLocation(true);
    setErrors((current) => ({ ...current, currentLocation: undefined }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        void getClientConfig()
          .then(async (config) => {
            const apiKey = getGoogleMapsBrowserApiKey(config);
            if (!apiKey) return `${current.lat.toFixed(6)},${current.lng.toFixed(6)}`;
            const google = await loadGoogleMaps(apiKey);
            return reverseGeocode(new google.maps.Geocoder(), current);
          })
          .then((address) => {
            updateOrigin(address);
          })
          .catch(() => {
            updateOrigin(`${current.lat.toFixed(6)},${current.lng.toFixed(6)}`);
          })
          .finally(() => {
            setIsResolvingCurrentLocation(false);
          });
      },
      () => {
        setIsResolvingCurrentLocation(false);
        setErrors((current) => ({
          ...current,
          currentLocation:
            "現在地を取得できませんでした。ブラウザの位置情報許可を確認してください。"
        }));
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 }
    );
  };

  useEffect(() => {
    if (!isMapPickerOpen) return undefined;

    closeMapPickerButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMapPickerOpen(false);
    };

    document.body.classList.add("is-modal-open");
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("is-modal-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMapPickerOpen]);

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};
    if (!origin.trim()) nextErrors.origin = "出発地を入力してください。";
    if (!destination.trim()) nextErrors.destination = "目的地を入力してください。";
    if (origin.trim() && destination.trim() && origin.trim() === destination.trim()) {
      nextErrors.destination = "出発地と目的地は別の場所にしてください。";
    }

    const fuelEfficiencyValue = Number(fuelEfficiency);
    if (!fuelEfficiency || !Number.isFinite(fuelEfficiencyValue) || fuelEfficiencyValue <= 0) {
      nextErrors.fuelEfficiency = "燃費は0より大きい数値を入力してください。";
    }

    const fuelPriceValue = fuelPrice ? Number(fuelPrice) : undefined;
    if (
      fuelPrice &&
      (!Number.isFinite(fuelPriceValue) || typeof fuelPriceValue !== "number" || fuelPriceValue < 0)
    ) {
      nextErrors.fuelPrice = "ガソリン価格は0以上の数値を入力してください。";
    }

    return nextErrors;
  };

  return (
    <form
      className="route-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const trimmedOrigin = origin.trim();
        const trimmedDestination = destination.trim();
        const nextErrors = validate();
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;
        const input: RouteAnalysisRequest = {
          origin: trimmedOrigin,
          destination: trimmedDestination,
          fuelEfficiencyKmPerLiter: Number(fuelEfficiency),
          prioritize: "balanced",
          question: DEFAULT_QUESTION
        };
        input.vehicleType = vehicleType;
        if (fuelPrice) input.fuelPriceYenPerLiter = Number(fuelPrice);
        onSubmit(input);
      }}
    >
      <div className="form-grid">
        <div className="form-field form-field--location">
          <span id="origin-label">出発地</span>
          <div className="input-shell input-shell--location">
            <div className="input-shell__main">
              <MapPin size={16} aria-hidden="true" />
              <input
                value={origin}
                onChange={(event) => updateOrigin(event.target.value)}
                placeholder="用賀IC"
                disabled={disabled}
                required
                aria-labelledby="origin-label"
                aria-invalid={Boolean(errors.origin)}
                aria-describedby={originDescribedBy}
              />
            </div>
            <div className="input-shell__actions">
              <button
                type="button"
                disabled={disabled || isResolvingCurrentLocation}
                aria-label="現在地を出発地に入力"
                title="現在地を出発地に入力"
                onClick={useCurrentLocation}
              >
                <LocateFixed size={16} aria-hidden="true" />
                現在地
              </button>
              <button
                type="button"
                disabled={disabled || isResolvingCurrentLocation}
                aria-label="出発地を地図から選択"
                aria-haspopup="dialog"
                title="出発地を地図から選択"
                onClick={() => openMapPicker("origin")}
              >
                <MapPinned size={16} aria-hidden="true" />
                地図
              </button>
            </div>
          </div>
          {isResolvingCurrentLocation ? (
            <small className="form-field__hint form-field__hint--loading">
              <LoadingSpinner label="現在地を確認中" size={14} />
              <span>現在地を確認しています。</span>
            </small>
          ) : null}
          {errors.origin ? <em id="origin-error">{errors.origin}</em> : null}
          {errors.currentLocation ? (
            <div className="form-field__notice" id="current-location-error" role="alert">
              <AlertCircle size={15} aria-hidden="true" />
              <span>{errors.currentLocation}</span>
            </div>
          ) : null}
        </div>
        <div className="form-field form-field--location">
          <span id="destination-label">目的地</span>
          <div className="input-shell input-shell--location">
            <div className="input-shell__main">
              <MapPin size={16} aria-hidden="true" />
              <input
                value={destination}
                onChange={(event) => updateDestination(event.target.value)}
                placeholder="御殿場IC"
                disabled={disabled}
                required
                aria-labelledby="destination-label"
                aria-invalid={Boolean(errors.destination)}
                aria-describedby={errors.destination ? "destination-error" : undefined}
              />
            </div>
            <div className="input-shell__actions">
              <button
                type="button"
                disabled={disabled}
                aria-label="目的地を地図から選択"
                aria-haspopup="dialog"
                title="目的地を地図から選択"
                onClick={() => openMapPicker("destination")}
              >
                <MapPinned size={16} aria-hidden="true" />
                地図
              </button>
            </div>
          </div>
          {errors.destination ? <em id="destination-error">{errors.destination}</em> : null}
        </div>
        <details
          className="form-details form-grid__wide"
          open={Boolean(errors.fuelEfficiency || errors.fuelPrice)}
        >
          <summary>詳細条件</summary>
          <div className="form-details__content">
            <label>
              <span>燃費 km/L</span>
              <input
                type="number"
                min="1"
                step="0.1"
                value={fuelEfficiency}
                onChange={(event) => setFuelEfficiency(event.target.value)}
                disabled={disabled}
                required
                aria-invalid={Boolean(errors.fuelEfficiency)}
                aria-describedby={errors.fuelEfficiency ? "fuel-efficiency-error" : undefined}
              />
              {errors.fuelEfficiency ? (
                <em id="fuel-efficiency-error">{errors.fuelEfficiency}</em>
              ) : null}
            </label>
            <label>
              <span>ガソリン円/L</span>
              <input
                type="number"
                min="0"
                step="1"
                value={fuelPrice}
                onChange={(event) => setFuelPrice(event.target.value)}
                disabled={disabled}
                placeholder="全国平均を使用"
                aria-invalid={Boolean(errors.fuelPrice)}
                aria-describedby={errors.fuelPrice ? "fuel-price-error" : undefined}
              />
              {errors.fuelPrice ? <em id="fuel-price-error">{errors.fuelPrice}</em> : null}
            </label>
            <label>
              <span>車両</span>
              <select
                value={vehicleType}
                onChange={(event) => setVehicleType(event.target.value)}
                disabled={disabled}
              >
                {VEHICLE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <div className="fuel-average-panel" aria-label="燃料全国平均価格">
              <div>
                <span>全国平均</span>
                <strong>{fuelPriceAverages?.prices[0]?.surveyedAt ?? "取得中"}</strong>
              </div>
              <div className="fuel-average-panel__prices">
                {fuelPriceAverages
                  ? fuelPriceAverages.prices.map((price) => (
                      <button
                        key={price.label}
                        type="button"
                        disabled={disabled}
                        onClick={() => setFuelPrice(String(price.value))}
                      >
                        <span>{price.label}</span>
                        <strong>{price.value.toFixed(1)}円/L</strong>
                      </button>
                    ))
                  : ["レギュラー", "ハイオク", "軽油"].map((label) => (
                      <button key={label} type="button" disabled>
                        <span>{label}</span>
                        <strong>取得中</strong>
                      </button>
                    ))}
              </div>
              <p>
                {fuelPriceError
                  ? fuelPriceError
                  : `出典: ${fuelPriceAverages?.sourceLabel ?? "石油製品価格調査"}`}
              </p>
            </div>
          </div>
        </details>
      </div>

      {isMapPickerOpen
        ? createPortal(
            <div
              className="location-picker-modal"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setIsMapPickerOpen(false);
              }}
            >
              <section
                className="location-picker-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="location-picker-dialog-title"
              >
                <div className="location-picker-dialog__header">
                  <div>
                    <p>地図選択</p>
                    <h2 id="location-picker-dialog-title">
                      {mapPickerTarget === "origin" ? "出発地" : "目的地"}を地図で選択
                    </h2>
                  </div>
                  <button
                    ref={closeMapPickerButtonRef}
                    type="button"
                    aria-label="地図選択を閉じる"
                    onClick={() => setIsMapPickerOpen(false)}
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
                <LocationPickerMap
                  disabled={disabled}
                  origin={origin}
                  destination={destination}
                  target={mapPickerTarget}
                  onOriginChange={updateOrigin}
                  onDestinationChange={updateDestination}
                  onSelectComplete={() => setIsMapPickerOpen(false)}
                />
              </section>
            </div>,
            document.body
          )
        : null}

      <div className="form-actions">
        <button className="primary-button" type="submit" disabled={disabled}>
          <Calculator size={16} aria-hidden="true" />
          比較
        </button>
      </div>
    </form>
  );
}
