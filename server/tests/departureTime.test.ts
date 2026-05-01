import { describe, expect, it } from "vitest";
import {
  isDepartureTimeWithinToday,
  parseDepartureTimeToday
} from "../src/domain/departureTime.js";

describe("departure time window", () => {
  const now = new Date("2026-04-30T10:00:00.000Z");

  it("accepts departure times later on the same local day", () => {
    expect(isDepartureTimeWithinToday("2026-04-30T11:00:00.000Z", now)).toBe(true);
  });

  it("rejects departure times that are too close", () => {
    expect(isDepartureTimeWithinToday("2026-04-30T10:04:59.000Z", now)).toBe(false);
  });

  it("rejects departure times on a later local day", () => {
    expect(isDepartureTimeWithinToday("2026-05-01T10:00:00.000Z", now)).toBe(false);
  });

  it("does not roll a past clock time over to tomorrow", () => {
    expect(parseDepartureTimeToday("9", "00", now)).toBeUndefined();
  });
});
