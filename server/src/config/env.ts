import { z } from "zod/v4";

export type RouteProviderName = "mock" | "google";

export interface AppConfig {
  port: number;
  allowedOrigins: string[];
  routeAnalysisRateLimitMaxRequests: number;
  routeAnalysisRateLimitWindowMs: number;
  maxJsonBodyBytes: number;
  routeProvider: RouteProviderName;
  googleMapsApiKey?: string;
  googleMapsBrowserApiKey?: string;
  defaultFuelPriceYenPerLiter?: number;
  googleMapsRegionCode: string;
  googleMapsLanguageCode: string;
}

function optionalNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected a numeric environment value, received "${value}".`);
  }
  return parsed;
}

function optionalPositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = optionalNumber(value);
  if (parsed === undefined) return fallback;
  if (parsed <= 0) {
    throw new Error(`Expected a positive environment value, received "${value}".`);
  }
  return parsed;
}

function parseAllowedOrigins(value: string | undefined, port: number): string[] {
  const localOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`
  ];
  const configuredOrigins =
    value
      ?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  return [...new Set([...localOrigins, ...configuredOrigins])];
}

const optionalTrimmedString = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

const envSchema = z
  .object({
    PORT: z.string().optional(),
    ROUTEIQ_ALLOWED_ORIGINS: z.string().optional(),
    ROUTEIQ_RATE_LIMIT_MAX_REQUESTS: z.string().optional(),
    ROUTEIQ_RATE_LIMIT_WINDOW_MS: z.string().optional(),
    ROUTEIQ_MAX_JSON_BODY_BYTES: z.string().optional(),
    ROUTE_PROVIDER: z.enum(["mock", "google"]).optional().default("mock"),
    GOOGLE_MAPS_API_KEY: optionalTrimmedString,
    GOOGLE_MAPS_BROWSER_API_KEY: optionalTrimmedString,
    GOOGLE_MAPS_EMBED_API_KEY: optionalTrimmedString,
    DEFAULT_FUEL_PRICE_YEN_PER_LITER: z.string().optional(),
    GOOGLE_MAPS_REGION_CODE: z.string().optional().default("JP"),
    GOOGLE_MAPS_LANGUAGE_CODE: z.string().optional().default("ja-JP")
  })
  .passthrough();

export function getAppConfigFromEnv(source: Record<string, string | undefined>): AppConfig {
  const env = envSchema.parse(source);
  const port = optionalNumber(env.PORT) ?? 8787;
  return {
    port,
    allowedOrigins: parseAllowedOrigins(env.ROUTEIQ_ALLOWED_ORIGINS, port),
    routeAnalysisRateLimitMaxRequests: optionalPositiveNumber(
      env.ROUTEIQ_RATE_LIMIT_MAX_REQUESTS,
      60
    ),
    routeAnalysisRateLimitWindowMs: optionalPositiveNumber(
      env.ROUTEIQ_RATE_LIMIT_WINDOW_MS,
      60_000
    ),
    maxJsonBodyBytes: optionalPositiveNumber(env.ROUTEIQ_MAX_JSON_BODY_BYTES, 16_384),
    routeProvider: env.ROUTE_PROVIDER,
    googleMapsApiKey: env.GOOGLE_MAPS_API_KEY,
    googleMapsBrowserApiKey: env.GOOGLE_MAPS_BROWSER_API_KEY ?? env.GOOGLE_MAPS_EMBED_API_KEY,
    defaultFuelPriceYenPerLiter: optionalNumber(env.DEFAULT_FUEL_PRICE_YEN_PER_LITER),
    googleMapsRegionCode: env.GOOGLE_MAPS_REGION_CODE,
    googleMapsLanguageCode: env.GOOGLE_MAPS_LANGUAGE_CODE
  };
}

export function getAppConfig(): AppConfig {
  return getAppConfigFromEnv(process.env);
}
