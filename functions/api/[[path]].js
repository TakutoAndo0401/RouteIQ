import { getAppConfigFromEnv } from "../../server/dist/config/env.js";
import {
  createRouteIqApiHandler,
  readJsonBodyFromBytes
} from "../../server/dist/http/routeIqApi.js";

let cachedHandler;
let cachedConfigKey;

function getClientKey(request) {
  return (
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function getHandler(env) {
  const config = getAppConfigFromEnv(env);
  const configKey = JSON.stringify({
    allowedOrigins: config.allowedOrigins,
    routeAnalysisRateLimitMaxRequests: config.routeAnalysisRateLimitMaxRequests,
    routeAnalysisRateLimitWindowMs: config.routeAnalysisRateLimitWindowMs,
    maxJsonBodyBytes: config.maxJsonBodyBytes,
    routeProvider: config.routeProvider,
    googleMapsApiKey: config.googleMapsApiKey,
    googleMapsBrowserApiKey: config.googleMapsBrowserApiKey,
    defaultFuelPriceYenPerLiter: config.defaultFuelPriceYenPerLiter,
    googleMapsRegionCode: config.googleMapsRegionCode,
    googleMapsLanguageCode: config.googleMapsLanguageCode
  });
  if (!cachedHandler || cachedConfigKey !== configKey) {
    cachedHandler = createRouteIqApiHandler(config);
    cachedConfigKey = configKey;
  }
  return cachedHandler;
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  return getHandler(context.env)({
    method: context.request.method,
    path: url.pathname,
    origin: context.request.headers.get("origin") ?? undefined,
    clientKey: getClientKey(context.request),
    readBody: async (maxBytes) =>
      readJsonBodyFromBytes(await context.request.arrayBuffer(), maxBytes)
  });
}
