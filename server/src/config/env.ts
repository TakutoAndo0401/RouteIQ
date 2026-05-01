import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotEnv } from "dotenv";
import { z } from "zod/v4";

for (const path of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../.env")]) {
  if (existsSync(path)) {
    loadDotEnv({ path, override: false });
  }
}

export type RouteProviderName = "mock" | "google";

export interface AppConfig {
  port: number;
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
    ROUTE_PROVIDER: z.enum(["mock", "google"]).optional().default("mock"),
    GOOGLE_MAPS_API_KEY: optionalTrimmedString,
    GOOGLE_MAPS_BROWSER_API_KEY: optionalTrimmedString,
    GOOGLE_MAPS_EMBED_API_KEY: optionalTrimmedString,
    DEFAULT_FUEL_PRICE_YEN_PER_LITER: z.string().optional(),
    GOOGLE_MAPS_REGION_CODE: z.string().optional().default("JP"),
    GOOGLE_MAPS_LANGUAGE_CODE: z.string().optional().default("ja-JP")
  })
  .passthrough();

export function getAppConfig(): AppConfig {
  const env = envSchema.parse(process.env);
  return {
    port: optionalNumber(env.PORT) ?? 8787,
    routeProvider: env.ROUTE_PROVIDER,
    googleMapsApiKey: env.GOOGLE_MAPS_API_KEY,
    googleMapsBrowserApiKey: env.GOOGLE_MAPS_BROWSER_API_KEY ?? env.GOOGLE_MAPS_EMBED_API_KEY,
    defaultFuelPriceYenPerLiter: optionalNumber(env.DEFAULT_FUEL_PRICE_YEN_PER_LITER),
    googleMapsRegionCode: env.GOOGLE_MAPS_REGION_CODE,
    googleMapsLanguageCode: env.GOOGLE_MAPS_LANGUAGE_CODE
  };
}
