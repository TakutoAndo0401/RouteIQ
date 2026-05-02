import type { AppConfig } from "../config/env.js";
import { analyzeRouteChat } from "../chat/routeChat.js";
import { fetchFuelPriceAverages } from "../fuelPrices.js";
import { createRouteProvider } from "../providers/providerFactory.js";
import {
  HttpRequestError,
  createRateLimiter,
  isAllowedOrigin
} from "./security.js";

export interface RouteIqApiRequest {
  method: string;
  path: string;
  origin?: string;
  clientKey: string;
  readBody: (maxBytes: number) => Promise<unknown>;
}

export type RouteIqApiHandler = (request: RouteIqApiRequest) => Promise<Response>;

function jsonResponse(status: number, payload: unknown, headers: Headers): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", "application/json; charset=utf-8");
  responseHeaders.set("cache-control", "no-store");
  return new Response(JSON.stringify(payload), {
    status,
    headers: responseHeaders
  });
}

function corsHeaders(origin: string | undefined, allowedOrigins: string[]): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "content-type"
  });
  if (origin && allowedOrigins.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return headers;
}

export function createRouteIqApiHandler(config: AppConfig): RouteIqApiHandler {
  const routeAnalysisRateLimit = createRateLimiter({
    maxRequests: config.routeAnalysisRateLimitMaxRequests,
    windowMs: config.routeAnalysisRateLimitWindowMs
  });

  return async (request) => {
    if (!request.path.startsWith("/api/")) {
      return new Response("Not Found", { status: 404 });
    }

    if (!isAllowedOrigin(request.origin, config.allowedOrigins)) {
      return new Response("Forbidden origin", { status: 403 });
    }

    const headers = corsHeaders(request.origin, config.allowedOrigins);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method === "GET" && request.path === "/api/fuel-prices") {
      try {
        return jsonResponse(200, await fetchFuelPriceAverages(), headers);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Fuel price request failed.";
        return jsonResponse(502, { error: message }, headers);
      }
    }

    if (request.method === "GET" && request.path === "/api/client-config") {
      return jsonResponse(
        200,
        {
          googleMapsBrowserApiKey: config.googleMapsBrowserApiKey ?? null
        },
        headers
      );
    }

    if (request.method === "POST" && request.path === "/api/route-analysis") {
      try {
        if (!routeAnalysisRateLimit(request.clientKey)) {
          return jsonResponse(
            429,
            { error: "Too many route analysis requests. Please retry later." },
            headers
          );
        }

        const body = await request.readBody(config.maxJsonBodyBytes);
        const { provider, warnings } = createRouteProvider(config);
        const result = await analyzeRouteChat(body, {
          config,
          provider,
          providerWarnings: warnings
        });
        return jsonResponse(200, result, headers);
      } catch (error) {
        if (error instanceof HttpRequestError) {
          return jsonResponse(error.status, { error: error.message }, headers);
        }
        const message = error instanceof Error ? error.message : "Route analysis failed.";
        return jsonResponse(400, { error: message }, headers);
      }
    }

    return new Response("Not Found", { status: 404, headers });
  };
}

export function readJsonBodyFromBytes(bytes: ArrayBuffer, maxBytes: number): unknown {
  if (bytes.byteLength > maxBytes) {
    throw new HttpRequestError(413, "Request body is too large.");
  }
  if (bytes.byteLength === 0) return {};

  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new HttpRequestError(400, "Request body must be valid JSON.");
  }
}
