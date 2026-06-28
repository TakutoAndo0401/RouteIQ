import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppConfig } from "../src/config/env.js";
import { MockRouteProvider } from "../src/providers/mockRouteProvider.js";
import { analyzeRouteChat } from "../src/chat/routeChat.js";
import type { RouteChatContext } from "../src/chat/context.js";
import type { ProviderRouteResult } from "../src/domain/types.js";

function route(overrides: Partial<ProviderRouteResult>): ProviderRouteResult {
  return {
    routeType: "expressway",
    distanceKm: 100,
    durationMinutes: 60,
    tollYen: 0,
    tollConfidence: "api",
    trafficSummary: "normal",
    congestionLevel: "low",
    trafficIncidents: [],
    roadClosures: [],
    warnings: [],
    dataSources: ["test"],
    apiFailures: [],
    ...overrides
  };
}

function context(): RouteChatContext {
  return {
    config: {
      ...getAppConfig(),
      googleMapsApiKey: undefined
    },
    provider: new MockRouteProvider(),
    providerWarnings: []
  };
}

describe("route chat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not use mock route data for chat answers", async () => {
    const result = await analyzeRouteChat(
      {
        origin: "東京",
        destination: "横浜",
        fuelEfficiencyKmPerLiter: 15,
        fuelPriceYenPerLiter: 170,
        question: "現在の道路状況を確認して"
      },
      context()
    );

    expect(result.routeComparison).toBeUndefined();
    expect(result.apiFailures).toContain(
      "ROUTE_PROVIDER=mock は本番回答では使用しません。実経路 provider を設定してください。"
    );
    expect(result.answer).not.toContain("事故、通行止め、規制理由は現在の取得対象外です");
  });

  it("uses the latest regular fuel average when the request omits fuel price", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () =>
          "最新価格 169.7 円（2026年04月27日）"
      }))
    );

    const result = await analyzeRouteChat(
      {
        origin: "用賀IC",
        destination: "御殿場IC",
        fuelEfficiencyKmPerLiter: 10,
        question: "現在の道路状況を確認して"
      },
      {
        config: {
          ...getAppConfig(),
          defaultFuelPriceYenPerLiter: 175
        },
        provider: {
          name: "test",
          computeRoute: async (request) =>
            route({
              routeType: request.routeType,
              distanceKm: request.routeType === "expressway" ? 100 : 80,
              durationMinutes: request.routeType === "expressway" ? 60 : 90
            })
        },
        providerWarnings: []
      }
    );

    expect(result.routeComparison?.input.fuelPriceYenPerLiter).toBe(169.7);
    expect(result.routeComparison?.expresswayRoute.fuelCostYen).toBe(1697);
  });
});
