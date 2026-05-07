import { resolveFuelPrice } from "../domain/fuel.js";
import { buildCompareRoutesResult } from "../domain/recommendation.js";
import { fetchFuelPriceAverages } from "../fuelPrices.js";
import type { RouteProvider } from "../providers/types.js";
import type { RouteChatContext } from "./context.js";
import { routeAnalysisArgsSchema } from "./requestSchema.js";
import { buildInitialAnswer } from "./responseBuilder.js";
import type { RouteAnalysisRequest, RouteAnalysisResult } from "./types.js";

function makeContextId(): string {
  return `routeiq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function computeRoute(
  provider: RouteProvider,
  input: RouteAnalysisRequest,
  routeType: "expressway" | "local"
) {
  return provider.computeRoute({
    origin: input.origin,
    destination: input.destination,
    departureTime: input.departureTime,
    routeType
  });
}

export async function analyzeRouteChat(
  args: unknown,
  context: RouteChatContext
): Promise<RouteAnalysisResult> {
  const input = routeAnalysisArgsSchema.parse(args) as RouteAnalysisRequest;
  let latestRegularFuelPrice: number | undefined;
  let fuelPriceWarning: string | undefined;

  if (typeof input.fuelPriceYenPerLiter !== "number") {
    try {
      const fuelPriceAverages = await fetchFuelPriceAverages();
      latestRegularFuelPrice = fuelPriceAverages.prices.find(
        (price) => price.label === "レギュラー"
      )?.value;
      if (typeof latestRegularFuelPrice !== "number") {
        fuelPriceWarning =
          "最新のレギュラー全国平均価格を取得できなかったため、既定のガソリン価格で概算しました。";
      }
    } catch {
      fuelPriceWarning =
        "最新のレギュラー全国平均価格を取得できなかったため、既定のガソリン価格で概算しました。";
    }
  }

  const fuelPrice = resolveFuelPrice(
    input.fuelPriceYenPerLiter,
    context.config.defaultFuelPriceYenPerLiter,
    latestRegularFuelPrice
  );
  let routeComparison: RouteAnalysisResult["routeComparison"];
  const routeApiFailures: string[] = [];
  let expresswayRoute: Awaited<ReturnType<typeof computeRoute>> | undefined;
  let localRoute: Awaited<ReturnType<typeof computeRoute>> | undefined;

  if (context.provider.name === "mock") {
    routeApiFailures.push(
      "ROUTE_PROVIDER=mock は本番回答では使用しません。実経路 provider を設定してください。"
    );
  } else {
    try {
      [expresswayRoute, localRoute] = await Promise.all([
        computeRoute(context.provider, input, "expressway"),
        computeRoute(context.provider, input, "local")
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider error.";
      routeApiFailures.push(`${context.provider.name} provider failed: ${message}`);
    }
  }

  const warnings = [
    ...context.providerWarnings,
    ...(fuelPriceWarning ? [fuelPriceWarning] : []),
    ...(fuelPrice.warning ? [fuelPrice.warning] : [])
  ];

  if (expresswayRoute && localRoute) {
    routeComparison = buildCompareRoutesResult({
      origin: input.origin,
      destination: input.destination,
      departureTime: input.departureTime,
      fuelEfficiencyKmPerLiter: input.fuelEfficiencyKmPerLiter,
      fuelPriceYenPerLiter: fuelPrice.fuelPriceYenPerLiter,
      vehicleType: input.vehicleType,
      prioritize: input.prioritize ?? "balanced",
      expresswayRoute,
      localRoute,
      warnings
    });
  }

  const apiFailures = [...new Set(routeApiFailures)];
  const answer = buildInitialAnswer({
    input,
    routeComparison,
    apiFailures
  });

  return {
    contextId: makeContextId(),
    input,
    answer,
    routeComparison,
    dataSources: [...new Set(routeComparison?.dataSources ?? [])],
    warnings: [...new Set([...warnings, ...(routeComparison?.warnings ?? [])])],
    apiFailures
  };
}
