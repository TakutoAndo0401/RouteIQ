import { describe, expect, it } from "vitest";
import { createRateLimiter, isAllowedOrigin } from "../src/http/security.js";

describe("http security helpers", () => {
  it("allows only configured origins when Origin is present", () => {
    const allowedOrigins = ["https://routeiq.example.com"];

    expect(isAllowedOrigin(undefined, allowedOrigins)).toBe(true);
    expect(isAllowedOrigin("https://routeiq.example.com", allowedOrigins)).toBe(true);
    expect(isAllowedOrigin("https://evil.example.com", allowedOrigins)).toBe(false);
  });

  it("limits requests by key within the configured window", () => {
    let now = 1_000;
    const allowRequest = createRateLimiter({
      maxRequests: 2,
      windowMs: 1_000,
      now: () => now
    });

    expect(allowRequest("client-a")).toBe(true);
    expect(allowRequest("client-a")).toBe(true);
    expect(allowRequest("client-a")).toBe(false);
    expect(allowRequest("client-b")).toBe(true);

    now = 2_001;
    expect(allowRequest("client-a")).toBe(true);
  });
});
