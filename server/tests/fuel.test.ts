import { describe, expect, it } from "vitest";
import { estimateFuelCostYen, resolveFuelPrice } from "../src/domain/fuel.js";

describe("estimateFuelCostYen", () => {
  it("calculates rounded fuel cost from distance, efficiency, and price", () => {
    expect(estimateFuelCostYen(120, 15, 175)).toBe(1400);
  });

  it("rejects invalid fuel efficiency", () => {
    expect(() => estimateFuelCostYen(120, 0, 175)).toThrow(
      "fuelEfficiencyKmPerLiter"
    );
  });
});

describe("resolveFuelPrice", () => {
  it("uses user input before environment default", () => {
    expect(resolveFuelPrice(180, 170).fuelPriceYenPerLiter).toBe(180);
  });

  it("uses the latest fetched average before environment default", () => {
    expect(resolveFuelPrice(undefined, 170, 169.7).fuelPriceYenPerLiter).toBe(169.7);
  });

  it("warns when using the built-in fallback", () => {
    const resolved = resolveFuelPrice(undefined, undefined);
    expect(resolved.fuelPriceYenPerLiter).toBe(175);
    expect(resolved.warning).toContain("175円/Lで概算");
  });
});
