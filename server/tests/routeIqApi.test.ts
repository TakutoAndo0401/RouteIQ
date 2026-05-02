import { describe, expect, it } from "vitest";
import { getAppConfigFromEnv } from "../src/config/env.js";
import {
  createRouteIqApiHandler,
  readJsonBodyFromBytes
} from "../src/http/routeIqApi.js";
import { HttpRequestError } from "../src/http/security.js";

describe("RouteIQ API handler", () => {
  it("returns browser config with CORS headers for an allowed origin", async () => {
    const config = getAppConfigFromEnv({
      ROUTEIQ_ALLOWED_ORIGINS: "https://routeiq.example.com",
      GOOGLE_MAPS_BROWSER_API_KEY: "browser-key"
    });
    const handleRequest = createRouteIqApiHandler(config);

    const response = await handleRequest({
      method: "GET",
      path: "/api/client-config",
      origin: "https://routeiq.example.com",
      clientKey: "client-a",
      readBody: async () => ({})
    });

    await expect(response.json()).resolves.toEqual({
      googleMapsBrowserApiKey: "browser-key"
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://routeiq.example.com"
    );
  });

  it("rejects disallowed origins before API handling", async () => {
    const config = getAppConfigFromEnv({
      ROUTEIQ_ALLOWED_ORIGINS: "https://routeiq.example.com"
    });
    const handleRequest = createRouteIqApiHandler(config);

    const response = await handleRequest({
      method: "GET",
      path: "/api/client-config",
      origin: "https://evil.example.com",
      clientKey: "client-a",
      readBody: async () => ({})
    });

    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toBe("Forbidden origin");
  });

  it("parses Cloudflare request bodies with the same size guard", () => {
    const body = new TextEncoder().encode(JSON.stringify({ origin: "用賀IC" })).buffer;

    expect(readJsonBodyFromBytes(body, 128)).toEqual({ origin: "用賀IC" });
    expect(() => readJsonBodyFromBytes(body, 4)).toThrow(HttpRequestError);
  });
});
