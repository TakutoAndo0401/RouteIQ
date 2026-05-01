import type { CompareRoutesResult } from "../domain/types.js";
import type { RouteAnalysisRequest } from "./types.js";

function routeLabel(route: "expressway" | "local"): string {
  return route === "expressway" ? "高速優先" : "一般道";
}

function buildRouteSummary(comparison: CompareRoutesResult | undefined): string[] {
  if (!comparison) return [];
  return [
    `経路比較では ${routeLabel(comparison.recommendedRoute)} を推奨します。${comparison.recommendationReason}`,
    `高速優先: ${comparison.expresswayRoute.durationMinutes}分 / ${comparison.expresswayRoute.distanceKm}km / 総額 ${
      comparison.expresswayRoute.totalCostYen === null
        ? "未確定"
        : `${comparison.expresswayRoute.totalCostYen}円`
    }`,
    `一般道: ${comparison.localRoute.durationMinutes}分 / ${comparison.localRoute.distanceKm}km / 総額 ${
      comparison.localRoute.totalCostYen === null
        ? "未確定"
        : `${comparison.localRoute.totalCostYen}円`
    }`
  ];
}

export function buildInitialAnswer(params: {
  input: RouteAnalysisRequest;
  routeComparison?: CompareRoutesResult;
  apiFailures: string[];
}): string {
  const lines = [
    `${params.input.origin} から ${params.input.destination} までの条件で確認しました。`
  ];
  lines.push(...buildRouteSummary(params.routeComparison));

  if (params.apiFailures.length > 0) {
    lines.push(`取得できなかった情報: ${params.apiFailures.join(" / ")}`);
  }

  if (params.routeComparison) {
    lines.push(
      "Google Routes API の速度区間をもとに道路状況を確認しています。事故・工事などの原因は断定しません。"
    );
  }
  return lines.join("\n");
}
