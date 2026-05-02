import { describe, expect, it } from "vitest";
import type { AppConfig } from "../src/config/env.js";
import { createRouteProvider } from "../src/providers/providerFactory.js";

function config(overrides: Partial<AppConfig>): AppConfig {
  return {
    port: 8787,
    allowedOrigins: ["http://127.0.0.1:8787"],
    routeAnalysisRateLimitMaxRequests: 60,
    routeAnalysisRateLimitWindowMs: 60_000,
    maxJsonBodyBytes: 16_384,
    routeProvider: "mock",
    googleMapsRegionCode: "JP",
    googleMapsLanguageCode: "ja-JP",
    ...overrides
  };
}

describe("createRouteProvider", () => {
  it("fails closed when google provider is selected without a server key", () => {
    expect(() =>
      createRouteProvider(
        config({
          routeProvider: "google",
          googleMapsApiKey: undefined
        })
      )
    ).toThrow("ROUTE_PROVIDER=google requires GOOGLE_MAPS_API_KEY.");
  });

  it("keeps mock provider available for local checks", () => {
    expect(createRouteProvider(config({ routeProvider: "mock" })).provider.name).toBe("mock");
  });
});
