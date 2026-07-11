import {
  AlertCircle,
  Calculator,
  ChevronDown,
  LocateFixed,
  MapPinned,
  MapPin,
  X
} from "lucide-react";
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
  /** すべての入力と送信操作を無効にします。 */
  disabled?: boolean;
  /** tokenが変わるたびに、指定した出発地または目的地へフォーカスします。 */
  focusRequest?: FormFocusRequest | null;
  /** 履歴の復元などでフォームへ反映する初期値。 */
  initialValues?: RouteAnalysisRequest | null;
  /** tokenが変わるたびに、指定した地点の地図選択を開きます。 */
  mapPickerRequest?: FormMapPickerRequest | null;
  /** ユーザーが入力内容を変更したときに呼ばれます。 */
  onDraftChange?: () => void;
  /** focusRequestを処理し終えたときに呼ばれます。 */
  onFocusRequestConsumed?: () => void;
  /** mapPickerRequestを処理し終えたときに呼ばれます。 */
  onMapPickerRequestConsumed?: () => void;
  /** 入力検証に成功した経路比較条件を渡します。 */
  onSubmit: (input: RouteAnalysisRequest) => void;
}

type FormErrors = Partial<
  Record<"origin" | "destination" | "fuelEfficiency" | "fuelPrice" | "currentLocation", string>
>;
type MapPickerTarget = "origin" | "destination";
type FormFocusTarget = "origin" | "destination";
type FormFocusRequest = {
  target: FormFocusTarget;
  token: number;
};
type FormMapPickerRequest = {
  target: MapPickerTarget;
  token: number;
};

const VEHICLE_TYPES = ["普通車", "軽自動車", "中型車", "大型車"] as const;
const DEFAULT_QUESTION = "現在の道路状況を確認して";

/**
 * 出発地・目的地・燃費・燃料単価・車両条件を収集し、検証済みの経路比較条件を送信します。
 *
 * @summary 経路比較に必要な条件を入力するフォーム
 */
export function RouteForm({
  disabled = false,
  focusRequest = null,
  initialValues = null,
  mapPickerRequest = null,
  onDraftChange,
  onFocusRequestConsumed,
  onMapPickerRequestConsumed,
  onSubmit
}: RouteFormProps) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [fuelEfficiency, setFuelEfficiency] = useState("15");
  const [fuelPrice, setFuelPrice] = useState("");
  const [vehicleType, setVehicleType] = useState("普通車");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isResolvingCurrentLocation, setIsResolvingCurrentLocation] = useState(false);
  const { fuelPriceAverages, fuelPriceError } = useFuelPriceAverages();
  const fuelPriceState = fuelPriceAverages ? "ready" : fuelPriceError ? "error" : "loading";
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [mapPickerTarget, setMapPickerTarget] = useState<MapPickerTarget>("origin");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const originInputRef = useRef<HTMLInputElement | null>(null);
  const destinationInputRef = useRef<HTMLInputElement | null>(null);
  const fuelEfficiencyInputRef = useRef<HTMLInputElement | null>(null);
  const fuelPriceInputRef = useRef<HTMLInputElement | null>(null);
  const mapPickerDialogRef = useRef<HTMLElement | null>(null);
  const closeMapPickerButtonRef = useRef<HTMLButtonElement | null>(null);
  const mapPickerReturnFocusRef = useRef<HTMLElement | null>(null);
  const originDescribedBy =
    [
      "origin-hint",
      errors.origin ? "origin-error" : undefined,
      errors.currentLocation ? "current-location-error" : undefined
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  const destinationDescribedBy =
    ["destination-hint", errors.destination ? "destination-error" : undefined]
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

  useEffect(() => {
    if (errors.fuelEfficiency || errors.fuelPrice) {
      setIsDetailsOpen(true);
    }
  }, [errors.fuelEfficiency, errors.fuelPrice]);

  const updateOrigin = (value: string) => {
    setOrigin(value);
    onDraftChange?.();
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
    onDraftChange?.();
    if (errors.destination) setErrors((current) => ({ ...current, destination: undefined }));
  };

  const openMapPicker = (target: MapPickerTarget) => {
    if (disabled) return;
    mapPickerReturnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setMapPickerTarget(target);
    setIsMapPickerOpen(true);
  };

  const closeMapPicker = () => {
    setIsMapPickerOpen(false);
  };

  const closeMapPickerForManualEntry = () => {
    const input =
      mapPickerTarget === "origin" ? originInputRef.current : destinationInputRef.current;
    mapPickerReturnFocusRef.current = input;
    setIsMapPickerOpen(false);
    requestAnimationFrame(() => {
      input?.focus();
      input?.select();
    });
  };

  useEffect(() => {
    if (!focusRequest) return;

    const input =
      focusRequest.target === "origin" ? originInputRef.current : destinationInputRef.current;
    requestAnimationFrame(() => {
      input?.focus();
      input?.select();
      onFocusRequestConsumed?.();
    });
  }, [focusRequest, onFocusRequestConsumed]);

  useEffect(() => {
    if (!mapPickerRequest) return;

    const target = mapPickerRequest.target;
    requestAnimationFrame(() => {
      openMapPicker(target);
      onMapPickerRequestConsumed?.();
    });
  }, [mapPickerRequest, onMapPickerRequestConsumed]);

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

    requestAnimationFrame(() => closeMapPickerButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMapPicker();
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = mapPickerDialogRef.current;
      if (!dialog) return;

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          [
            "a[href]",
            "button:not([disabled])",
            "input:not([disabled])",
            "select:not([disabled])",
            "textarea:not([disabled])",
            "[tabindex]:not([tabindex='-1'])"
          ].join(",")
        )
      ).filter((element) => !element.hasAttribute("aria-hidden"));
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (!firstElement || !lastElement) return;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.body.classList.add("is-modal-open");
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("is-modal-open");
      window.removeEventListener("keydown", handleKeyDown);
      mapPickerReturnFocusRef.current?.focus();
      mapPickerReturnFocusRef.current = null;
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

  const focusFirstError = (nextErrors: FormErrors) => {
    const target =
      nextErrors.origin || nextErrors.currentLocation
        ? originInputRef.current
        : nextErrors.destination
          ? destinationInputRef.current
          : nextErrors.fuelEfficiency
            ? fuelEfficiencyInputRef.current
            : nextErrors.fuelPrice
              ? fuelPriceInputRef.current
              : null;

    if (nextErrors.fuelEfficiency || nextErrors.fuelPrice) {
      setIsDetailsOpen(true);
    }

    requestAnimationFrame(() => {
      target?.focus();
    });
  };

  return (
    <form
      className="route-form"
      autoComplete="off"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const trimmedOrigin = origin.trim();
        const trimmedDestination = destination.trim();
        const nextErrors = validate();
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
          focusFirstError(nextErrors);
          return;
        }
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
          <label className="form-field__label" id="origin-label" htmlFor="routeiq-origin-input">
            出発地
          </label>
          <div className="input-shell input-shell--location">
            <div className="input-shell__main">
              <MapPin size={16} aria-hidden="true" />
              <input
                ref={originInputRef}
                id="routeiq-origin-input"
                name="routeiq-origin"
                value={origin}
                onChange={(event) => updateOrigin(event.target.value)}
                placeholder="例: 用賀IC"
                disabled={disabled}
                required
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
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
          <small className="form-field__hint" id="origin-hint">
            IC名、住所、緯度経度で指定できます。
          </small>
          {isResolvingCurrentLocation ? (
            <small className="form-field__hint form-field__hint--loading" role="status">
              <span aria-hidden="true">
                <LoadingSpinner label="現在地を確認中" size={14} />
              </span>
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
          <label
            className="form-field__label"
            id="destination-label"
            htmlFor="routeiq-destination-input"
          >
            目的地
          </label>
          <div className="input-shell input-shell--location">
            <div className="input-shell__main">
              <MapPin size={16} aria-hidden="true" />
              <input
                ref={destinationInputRef}
                id="routeiq-destination-input"
                name="routeiq-destination"
                value={destination}
                onChange={(event) => updateDestination(event.target.value)}
                placeholder="例: 御殿場IC"
                disabled={disabled}
                required
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-labelledby="destination-label"
                aria-invalid={Boolean(errors.destination)}
                aria-describedby={destinationDescribedBy}
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
          <small className="form-field__hint" id="destination-hint">
            IC名、住所、緯度経度で指定できます。
          </small>
          {errors.destination ? <em id="destination-error">{errors.destination}</em> : null}
        </div>
        <details
          className="form-details form-grid__wide"
          open={isDetailsOpen}
          onToggle={(event) => setIsDetailsOpen(event.currentTarget.open)}
        >
          <summary>
            <span className="form-details__summary">
              <span className="form-details__summary-title">詳細条件</span>
              <ChevronDown className="form-details__chevron" size={18} aria-hidden="true" />
            </span>
          </summary>
          <div className="form-details__content">
            <label>
              <span>燃費 km/L</span>
              <input
                ref={fuelEfficiencyInputRef}
                type="number"
                min="1"
                step="0.1"
                value={fuelEfficiency}
                onChange={(event) => {
                  setFuelEfficiency(event.target.value);
                  onDraftChange?.();
                  setErrors((current) =>
                    current.fuelEfficiency
                      ? { ...current, fuelEfficiency: undefined }
                      : current
                  );
                }}
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
                ref={fuelPriceInputRef}
                type="number"
                min="0"
                step="1"
                value={fuelPrice}
                onChange={(event) => {
                  setFuelPrice(event.target.value);
                  onDraftChange?.();
                  setErrors((current) =>
                    current.fuelPrice ? { ...current, fuelPrice: undefined } : current
                  );
                }}
                disabled={disabled}
                placeholder="全国平均を使用"
                aria-invalid={Boolean(errors.fuelPrice)}
                aria-describedby={errors.fuelPrice ? "fuel-price-error" : undefined}
              />
              {errors.fuelPrice ? <em id="fuel-price-error">{errors.fuelPrice}</em> : null}
            </label>
            <fieldset className="vehicle-type-group">
              <legend>車両</legend>
              <div className="vehicle-type-options">
                {VEHICLE_TYPES.map((type) => (
                  <label key={type} className="vehicle-type-option">
                    <input
                      type="radio"
                      name="vehicleType"
                      value={type}
                      checked={vehicleType === type}
                      disabled={disabled}
                      onChange={(event) => {
                        setVehicleType(event.target.value);
                        onDraftChange?.();
                      }}
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div
              className={`fuel-average-panel fuel-average-panel--${fuelPriceState}`}
              aria-label="燃料全国平均価格"
              aria-busy={fuelPriceState === "loading"}
            >
              <div>
                <span>全国平均</span>
                <strong>
                  {fuelPriceState === "ready"
                    ? fuelPriceAverages?.prices[0]?.surveyedAt
                    : fuelPriceState === "error"
                      ? "未取得"
                      : "取得中"}
                </strong>
              </div>
              <div className="fuel-average-panel__prices">
                {fuelPriceAverages
                  ? fuelPriceAverages.prices.map((price) => (
                      <button
                        key={price.label}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setFuelPrice(String(price.value));
                          onDraftChange?.();
                          setErrors((current) =>
                            current.fuelPrice
                              ? { ...current, fuelPrice: undefined }
                              : current
                          );
                        }}
                      >
                        <span>{price.label}</span>
                        <strong>{price.value.toFixed(1)}円/L</strong>
                      </button>
                    ))
                  : ["レギュラー", "ハイオク", "軽油"].map((label) => (
                      <button key={label} type="button" disabled>
                        <span>{label}</span>
                        <strong>{fuelPriceState === "error" ? "未取得" : "取得中"}</strong>
                      </button>
                    ))}
              </div>
              <p role={fuelPriceState === "error" ? "alert" : undefined}>
                {fuelPriceState === "error"
                  ? `${fuelPriceError}上の「ガソリン円/L」へ価格を手入力してください。`
                  : fuelPriceState === "loading"
                    ? "全国平均価格を取得しています。"
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
                if (event.target === event.currentTarget) closeMapPicker();
              }}
            >
              <section
                ref={mapPickerDialogRef}
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
                    onClick={closeMapPicker}
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
                  onSelectComplete={closeMapPicker}
                  onManualEntryRequest={closeMapPickerForManualEntry}
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
