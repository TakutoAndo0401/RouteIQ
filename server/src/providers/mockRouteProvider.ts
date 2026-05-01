import type { ProviderRouteResult, RouteProviderRequest } from "../domain/types.js";
import type { RouteProvider } from "./types.js";

function hashRoute(origin: string, destination: string): number {
  const text = `${origin}->${destination}`;
  return [...text].reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

export class MockRouteProvider implements RouteProvider {
  readonly name = "mock";

  async computeRoute(request: RouteProviderRequest): Promise<ProviderRouteResult> {
    const seed = hashRoute(request.origin, request.destination);
    const localDistanceKm = 42 + (seed % 55);
    const expresswayDistanceKm = Math.round(localDistanceKm * 1.08 * 10) / 10;
    const isExpressway = request.routeType === "expressway";
    const distanceKm = isExpressway ? expresswayDistanceKm : localDistanceKm;
    const durationMinutes = isExpressway
      ? Math.round(distanceKm * 0.78 + 18)
      : Math.round(distanceKm * 1.55 + 25);

    return {
      routeType: request.routeType,
      distanceKm,
      durationMinutes,
      tollYen: isExpressway ? null : 0,
      tollConfidence: isExpressway ? "unavailable" : "api",
      tollFallbackMessage: isExpressway
        ? "mock provider では高速料金を確認できません。Google Routes API などの実データ provider を設定してください。"
        : undefined,
      trafficSummary: isExpressway
        ? "mock provider: 高速道路は一部で交通量が多い想定です。"
        : "mock provider: 一般道は信号・市街地区間を含む想定です。",
      congestionLevel: isExpressway ? "moderate" : "low",
      trafficIncidents: [],
      roadClosures: [],
      warnings: [
        "mock provider の概算値です。実際の道路状況、料金、規制とは異なる可能性があります。"
      ],
      dataSources: ["mock"],
      apiFailures: isExpressway
        ? ["高速料金 API は mock provider では利用できません。"]
        : []
    };
  }
}
