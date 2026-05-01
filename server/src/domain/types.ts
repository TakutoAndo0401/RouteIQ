import type {
  CongestionLevel,
  RouteComparison,
  RouteCostSummary,
  RouteRequest,
  RouteType,
  TollConfidence
} from "@routeiq/contracts";

export type {
  CongestionLevel,
  PrioritizeMode,
  RouteProviderRequest,
  RouteRequest,
  RouteType,
  TollConfidence
} from "@routeiq/contracts";

export type { RouteCostSummary, RouteComparison } from "@routeiq/contracts";

export interface RouteCoordinate {
  lat: number;
  lng: number;
}

export interface ProviderRouteResult {
  routeType: RouteType;
  distanceKm: number;
  durationMinutes: number;
  tollYen: number | null;
  tollConfidence: TollConfidence;
  tollFallbackMessage?: string;
  trafficSummary: string;
  congestionLevel: CongestionLevel;
  trafficIncidents: string[];
  roadClosures: string[];
  warnings: string[];
  dataSources: string[];
  apiFailures: string[];
  routePolyline?: RouteCoordinate[];
}

export interface CompareRoutesResult extends Record<string, unknown> {
  input: Required<Pick<RouteRequest, "origin" | "destination" | "fuelEfficiencyKmPerLiter">> &
    Pick<RouteRequest, "departureTime" | "fuelPriceYenPerLiter" | "vehicleType" | "prioritize">;
  recommendedRoute: RouteType;
  recommendationReason: string;
  expresswayRoute: RouteCostSummary;
  localRoute: RouteCostSummary;
  comparison: RouteComparison;
  trafficIncidents: string[];
  warnings: string[];
  dataSources: string[];
  apiFailures: string[];
}

export interface TrafficResult extends Record<string, unknown> {
  congestionLevel: CongestionLevel;
  incidents: string[];
  roadClosures: string[];
  trafficSummary: string;
  dataSources: string[];
  warnings: string[];
  apiFailures: string[];
}

export interface TollEstimate extends Record<string, unknown> {
  tollYen: number | null;
  confidence: TollConfidence;
  fallbackMessage?: string;
  dataSources: string[];
}
