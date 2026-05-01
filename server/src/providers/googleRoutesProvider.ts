import type {
  ProviderRouteResult,
  RouteCoordinate,
  RouteProviderRequest,
  RouteType,
  TollConfidence
} from "../domain/types.js";
import { summarizeSpeedIntervals } from "../domain/traffic.js";
import type { RouteProvider } from "./types.js";

interface GoogleRoutesProviderOptions {
  apiKey: string;
  languageCode: string;
  regionCode: string;
}

interface GoogleMoney {
  currencyCode?: string;
  units?: string;
  nanos?: number;
}

interface GoogleTollInfo {
  estimatedPrice?: GoogleMoney[];
}

interface GoogleTravelAdvisory {
  tollInfo?: GoogleTollInfo;
  speedReadingIntervals?: Array<{ speed?: string }>;
}

interface GoogleRoute {
  distanceMeters?: number;
  duration?: string;
  description?: string;
  warnings?: string[];
  polyline?: {
    encodedPolyline?: string;
  };
  travelAdvisory?: GoogleTravelAdvisory;
  legs?: Array<{ travelAdvisory?: GoogleTravelAdvisory }>;
}

interface GoogleComputeRoutesResponse {
  routes?: GoogleRoute[];
  fallbackInfo?: unknown;
}

function parseDurationMinutes(duration: string | undefined): number {
  const match = duration?.match(/^(\d+(?:\.\d+)?)s$/);
  if (!match) {
    throw new Error("Google Routes API response did not include a valid duration.");
  }
  return Math.round(Number(match[1]) / 60);
}

export function decodePolyline(encoded: string | undefined): RouteCoordinate[] {
  if (!encoded) return [];

  const coordinates: RouteCoordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  const readValue = () => {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index <= encoded.length);

    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    lat += readValue();
    lng += readValue();
    coordinates.push({
      lat: lat / 1e5,
      lng: lng / 1e5
    });
  }

  return coordinates;
}

export function resolveGoogleDepartureTime(
  departureTime: string | undefined,
  now = new Date()
): { departureTime?: string; warning?: string } {
  if (!departureTime) return {};

  const parsed = new Date(departureTime);
  if (!Number.isFinite(parsed.getTime())) return {};

  const minimumFuture = new Date(now.getTime() + 5 * 60 * 1000);
  if (parsed.getTime() > minimumFuture.getTime()) {
    return { departureTime };
  }

  return {
    departureTime: minimumFuture.toISOString(),
    warning:
      "Google Routes API は過去または直近すぎる departureTime を受け付けないため、経路比較では現在から5分後に補正しました。"
  };
}

function yenFromMoney(money: GoogleMoney): number | null {
  if (money.currencyCode !== "JPY") return null;
  const units = Number(money.units ?? "0");
  const nanos = Math.round((money.nanos ?? 0) / 1_000_000_000);
  if (!Number.isFinite(units)) return null;
  return units + nanos;
}

function parseToll(route: GoogleRoute, routeType: RouteType): {
  tollYen: number | null;
  confidence: TollConfidence;
  fallbackMessage?: string;
  warning?: string;
} {
  const tollInfo = route.travelAdvisory?.tollInfo;
  if (!tollInfo) {
    if (routeType === "expressway") {
      return {
        tollYen: null,
        confidence: "unavailable",
        fallbackMessage:
          "Google Routes API は高速優先ルートの有料道路料金情報を返しませんでした。料金を0円とは扱わず未確定にしています。"
      };
    }
    return { tollYen: 0, confidence: "api" };
  }

  const prices = tollInfo.estimatedPrice ?? [];
  if (prices.length === 0) {
    return {
      tollYen: null,
      confidence: "unavailable",
      fallbackMessage:
        "Google Routes API は有料道路の存在を示しましたが、推定料金は返しませんでした。"
    };
  }

  const yenPrice = prices.map(yenFromMoney).find((price) => price !== null);
  if (typeof yenPrice === "number") {
    return { tollYen: yenPrice, confidence: "api" };
  }

  return {
    tollYen: null,
    confidence: "unavailable",
    fallbackMessage:
      "Google Routes API は料金を返しましたが、JPY の推定料金ではありませんでした。",
    warning: "JPY 以外の toll estimate は RouteIQ の円建て比較に含めていません。"
  };
}

export class GoogleRoutesProvider implements RouteProvider {
  readonly name = "google";
  private readonly options: GoogleRoutesProviderOptions;

  constructor(options: GoogleRoutesProviderOptions) {
    this.options = options;
  }

  async computeRoute(request: RouteProviderRequest): Promise<ProviderRouteResult> {
    const resolvedDepartureTime = resolveGoogleDepartureTime(request.departureTime);
    const body = {
      origin: { address: request.origin },
      destination: { address: request.destination },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE_OPTIMAL",
      computeAlternativeRoutes: false,
      languageCode: this.options.languageCode,
      regionCode: this.options.regionCode,
      extraComputations: ["TOLLS", "TRAFFIC_ON_POLYLINE"],
      ...(resolvedDepartureTime.departureTime
        ? { departureTime: resolvedDepartureTime.departureTime }
        : {}),
      routeModifiers:
        request.routeType === "local"
          ? { avoidTolls: true, avoidHighways: true }
          : { vehicleInfo: { emissionType: "GASOLINE" } }
    };

    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.options.apiKey,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.description,routes.polyline.encodedPolyline,routes.warnings,routes.travelAdvisory.tollInfo,routes.travelAdvisory.speedReadingIntervals,routes.legs.travelAdvisory.tollInfo,routes.legs.travelAdvisory.speedReadingIntervals,fallbackInfo"
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Google Routes API request failed with ${response.status}: ${text.slice(0, 300)}`
      );
    }

    const payload = (await response.json()) as GoogleComputeRoutesResponse;
    const route = payload.routes?.[0];
    if (!route?.distanceMeters) {
      throw new Error("Google Routes API response did not include a route.");
    }

    const toll = parseToll(route, request.routeType);
    const intervals = route.travelAdvisory?.speedReadingIntervals ?? [];
    const traffic = summarizeSpeedIntervals(intervals);
    const warnings = [
      ...(route.warnings ?? []),
      ...(resolvedDepartureTime.warning ? [resolvedDepartureTime.warning] : []),
      ...(toll.warning ? [toll.warning] : []),
      ...(request.routeType === "local"
        ? [
            "Google Routes API の avoidTolls / avoidHighways は完全除外ではなく、合理的な範囲での回避指定です。"
          ]
        : []),
      ...(payload.fallbackInfo
        ? ["Google Routes API が fallbackInfo を返しました。条件の一部が緩和された可能性があります。"]
        : [])
    ];
    const apiFailures = [...(toll.fallbackMessage ? [toll.fallbackMessage] : [])];

    return {
      routeType: request.routeType,
      distanceKm: Math.round((route.distanceMeters / 1000) * 10) / 10,
      durationMinutes: parseDurationMinutes(route.duration),
      tollYen: toll.tollYen,
      tollConfidence: toll.confidence,
      tollFallbackMessage: toll.fallbackMessage,
      trafficSummary: `${traffic.trafficSummary}${route.description ? ` 主な経路: ${route.description}` : ""}`,
      congestionLevel: traffic.congestionLevel,
      trafficIncidents: [],
      roadClosures: [],
      warnings,
      dataSources: ["Google Maps Routes API"],
      apiFailures,
      routePolyline: decodePolyline(route.polyline?.encodedPolyline)
    };
  }
}
