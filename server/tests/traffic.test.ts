import { describe, expect, it } from "vitest";
import { summarizeSpeedIntervals } from "../src/domain/traffic.js";

describe("summarizeSpeedIntervals", () => {
  it("marks traffic jam intervals as high congestion", () => {
    const result = summarizeSpeedIntervals([
      { speed: "NORMAL" },
      { speed: "SLOW" },
      { speed: "TRAFFIC_JAM" }
    ]);
    expect(result.congestionLevel).toBe("high");
    expect(result.trafficSummary).toContain("TRAFFIC_JAM");
  });

  it("summarizes indexed traffic intervals by route share and location", () => {
    const result = summarizeSpeedIntervals([
      { startPolylinePointIndex: 0, endPolylinePointIndex: 60, speed: "NORMAL" },
      { startPolylinePointIndex: 60, endPolylinePointIndex: 80, speed: "SLOW" },
      { startPolylinePointIndex: 80, endPolylinePointIndex: 100, speed: "TRAFFIC_JAM" }
    ]);

    expect(result.congestionLevel).toBe("high");
    expect(result.trafficSummary).toContain("ルートの後半");
    expect(result.trafficSummary).toContain("通常 60%");
    expect(result.trafficSummary).toContain("低速 20%");
    expect(result.trafficSummary).toContain("渋滞 20%");
  });

  it("returns unknown when traffic intervals are unavailable", () => {
    const result = summarizeSpeedIntervals([]);
    expect(result.congestionLevel).toBe("unknown");
  });
});
