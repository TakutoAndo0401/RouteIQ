import { describe, expect, it } from "vitest";
import { buildCompareRoutesResult } from "../src/domain/recommendation.js";
import type { ProviderRouteResult } from "../src/domain/types.js";

function route(overrides: Partial<ProviderRouteResult>): ProviderRouteResult {
  return {
    routeType: "expressway",
    distanceKm: 100,
    durationMinutes: 70,
    tollYen: 2500,
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

describe("buildCompareRoutesResult", () => {
  it("recommends expressway when balanced cost per saved minute is low", () => {
    const result = buildCompareRoutesResult({
      origin: "東京",
      destination: "箱根",
      fuelEfficiencyKmPerLiter: 20,
      fuelPriceYenPerLiter: 100,
      prioritize: "balanced",
      expresswayRoute: route({
        routeType: "expressway",
        durationMinutes: 60,
        distanceKm: 100,
        tollYen: 500
      }),
      localRoute: route({
        routeType: "local",
        durationMinutes: 80,
        distanceKm: 90,
        tollYen: 0
      }),
      warnings: []
    });

    expect(result.recommendedRoute).toBe("expressway");
    expect(result.comparison.timeDifferenceMinutes).toBe(20);
  });

  it("does not synthesize total cost when toll is unavailable", () => {
    const result = buildCompareRoutesResult({
      origin: "東京",
      destination: "箱根",
      fuelEfficiencyKmPerLiter: 10,
      fuelPriceYenPerLiter: 200,
      prioritize: "cost",
      expresswayRoute: route({
        routeType: "expressway",
        tollYen: null,
        tollConfidence: "unavailable"
      }),
      localRoute: route({
        routeType: "local",
        tollYen: 0,
        tollConfidence: "api"
      }),
      warnings: []
    });

    expect(result.expresswayRoute.totalCostYen).toBeNull();
    expect(result.comparison.costDifferenceYen).toBeNull();
  });
});
