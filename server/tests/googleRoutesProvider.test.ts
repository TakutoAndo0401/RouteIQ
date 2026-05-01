import { describe, expect, it } from "vitest";
import {
  decodePolyline,
  GoogleRoutesProvider,
  resolveGoogleDepartureTime
} from "../src/providers/googleRoutesProvider.js";

describe("resolveGoogleDepartureTime", () => {
  it("keeps future departure times", () => {
    const result = resolveGoogleDepartureTime(
      "2026-04-30T12:00:00.000Z",
      new Date("2026-04-30T11:00:00.000Z")
    );

    expect(result.departureTime).toBe("2026-04-30T12:00:00.000Z");
    expect(result.warning).toBeUndefined();
  });

  it("moves past departure times to a near future timestamp", () => {
    const result = resolveGoogleDepartureTime(
      "2026-04-30T10:00:00.000Z",
      new Date("2026-04-30T11:00:00.000Z")
    );

    expect(result.departureTime).toBe("2026-04-30T11:05:00.000Z");
    expect(result.warning).toContain("現在から5分後");
  });
});

describe("GoogleRoutesProvider", () => {
  it("decodes Google encoded polylines", () => {
    expect(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 }
    ]);
  });

  it("does not treat missing expressway tollInfo as zero yen", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          routes: [
            {
              distanceMeters: 2900,
              duration: "360s",
              polyline: { encodedPolyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@" },
              travelAdvisory: {}
            }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );

    try {
      const provider = new GoogleRoutesProvider({
        apiKey: "test",
        languageCode: "ja-JP",
        regionCode: "JP"
      });
      const route = await provider.computeRoute({
        origin: "東神奈川駅",
        destination: "みなとみらい",
        routeType: "expressway"
      });

      expect(route.tollYen).toBeNull();
      expect(route.tollConfidence).toBe("unavailable");
      expect(route.tollFallbackMessage).toContain("0円とは扱わず");
      expect(route.routePolyline).toHaveLength(3);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
