import type {
  CompareRoutesResult,
  PrioritizeMode,
  ProviderRouteResult,
  RouteComparison,
  RouteCostSummary,
  RouteType
} from "./types.js";
import { estimateFuelCostYen } from "./fuel.js";

export function toRouteCostSummary(
  route: ProviderRouteResult,
  fuelEfficiencyKmPerLiter: number,
  fuelPriceYenPerLiter: number
): RouteCostSummary {
  const fuelCostYen = estimateFuelCostYen(
    route.distanceKm,
    fuelEfficiencyKmPerLiter,
    fuelPriceYenPerLiter
  );
  const totalCostYen =
    typeof route.tollYen === "number" ? route.tollYen + fuelCostYen : null;

  return {
    distanceKm: route.distanceKm,
    durationMinutes: route.durationMinutes,
    tollYen: route.tollYen,
    tollConfidence: route.tollConfidence,
    tollFallbackMessage: route.tollFallbackMessage,
    fuelCostYen,
    totalCostYen,
    trafficSummary: route.trafficSummary
  };
}

export function buildComparison(
  expresswayRoute: RouteCostSummary,
  localRoute: RouteCostSummary
): RouteComparison {
  const timeDifferenceMinutes =
    localRoute.durationMinutes - expresswayRoute.durationMinutes;
  const costDifferenceYen =
    expresswayRoute.totalCostYen === null || localRoute.totalCostYen === null
      ? null
      : expresswayRoute.totalCostYen - localRoute.totalCostYen;
  const valueOfTimeSavedYenPerMinute =
    costDifferenceYen === null || timeDifferenceMinutes <= 0
      ? null
      : Math.round(costDifferenceYen / timeDifferenceMinutes);

  return {
    timeDifferenceMinutes,
    costDifferenceYen,
    valueOfTimeSavedYenPerMinute
  };
}

export function chooseRecommendedRoute(
  expresswayRoute: RouteCostSummary,
  localRoute: RouteCostSummary,
  comparison: RouteComparison,
  prioritize: PrioritizeMode
): { recommendedRoute: RouteType; recommendationReason: string } {
  if (prioritize === "time") {
    if (expresswayRoute.durationMinutes <= localRoute.durationMinutes) {
      return {
        recommendedRoute: "expressway",
        recommendationReason: "時間優先のため、所要時間が短い高速道路ルートをおすすめします。"
      };
    }
    return {
      recommendedRoute: "local",
      recommendationReason: "時間優先でも一般道ルートの方が短時間のため、一般道ルートをおすすめします。"
    };
  }

  if (prioritize === "cost") {
    if (expresswayRoute.totalCostYen === null || localRoute.totalCostYen === null) {
      return {
        recommendedRoute:
          expresswayRoute.durationMinutes <= localRoute.durationMinutes
            ? "expressway"
            : "local",
        recommendationReason:
          "料金未確定のため費用だけでは判断できません。確認できる所要時間を優先しておすすめしています。"
      };
    }
    if (localRoute.totalCostYen <= expresswayRoute.totalCostYen) {
      return {
        recommendedRoute: "local",
        recommendationReason: "費用優先のため、総額が安い一般道ルートをおすすめします。"
      };
    }
    return {
      recommendedRoute: "expressway",
      recommendationReason: "費用優先でも高速道路ルートの総額が安いため、高速道路ルートをおすすめします。"
    };
  }

  if (
    comparison.costDifferenceYen !== null &&
    comparison.timeDifferenceMinutes > 0 &&
    comparison.valueOfTimeSavedYenPerMinute !== null &&
    comparison.valueOfTimeSavedYenPerMinute <= 80
  ) {
    return {
      recommendedRoute: "expressway",
      recommendationReason:
        "時間短縮に対する追加費用が小さいため、バランス重視で高速道路ルートをおすすめします。"
    };
  }

  if (
    expresswayRoute.totalCostYen !== null &&
    localRoute.totalCostYen !== null &&
    localRoute.totalCostYen < expresswayRoute.totalCostYen
  ) {
    return {
      recommendedRoute: "local",
      recommendationReason:
        "高速道路ルートの時間短縮に対する追加費用が大きいため、バランス重視で一般道ルートをおすすめします。"
    };
  }

  return {
    recommendedRoute:
      expresswayRoute.durationMinutes <= localRoute.durationMinutes
        ? "expressway"
        : "local",
    recommendationReason:
      "費用の一部が未確定のため、確認できる所要時間と交通状況をもとにおすすめしています。"
  };
}

export function buildCompareRoutesResult(params: {
  origin: string;
  destination: string;
  departureTime?: string;
  fuelEfficiencyKmPerLiter: number;
  fuelPriceYenPerLiter: number;
  vehicleType?: string;
  prioritize: PrioritizeMode;
  expresswayRoute: ProviderRouteResult;
  localRoute: ProviderRouteResult;
  warnings: string[];
}): CompareRoutesResult {
  const expresswayRoute = toRouteCostSummary(
    params.expresswayRoute,
    params.fuelEfficiencyKmPerLiter,
    params.fuelPriceYenPerLiter
  );
  const localRoute = toRouteCostSummary(
    params.localRoute,
    params.fuelEfficiencyKmPerLiter,
    params.fuelPriceYenPerLiter
  );
  const comparison = buildComparison(expresswayRoute, localRoute);
  const recommendation = chooseRecommendedRoute(
    expresswayRoute,
    localRoute,
    comparison,
    params.prioritize
  );
  const input: CompareRoutesResult["input"] = {
    origin: params.origin,
    destination: params.destination,
    fuelEfficiencyKmPerLiter: params.fuelEfficiencyKmPerLiter,
    fuelPriceYenPerLiter: params.fuelPriceYenPerLiter,
    prioritize: params.prioritize
  };
  if (params.departureTime) input.departureTime = params.departureTime;
  if (params.vehicleType) input.vehicleType = params.vehicleType;

  return {
    input,
    ...recommendation,
    expresswayRoute,
    localRoute,
    comparison,
    trafficIncidents: [
      ...params.expresswayRoute.trafficIncidents,
      ...params.localRoute.trafficIncidents
    ],
    warnings: [
      ...new Set([
        ...params.warnings,
        ...params.expresswayRoute.warnings,
        ...params.localRoute.warnings
      ])
    ],
    dataSources: [
      ...new Set([
        ...params.expresswayRoute.dataSources,
        ...params.localRoute.dataSources
      ])
    ],
    apiFailures: [
      ...new Set([
        ...params.expresswayRoute.apiFailures,
        ...params.localRoute.apiFailures
      ])
    ]
  };
}
