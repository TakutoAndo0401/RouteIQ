import type { AppConfig } from "../config/env.js";
import type { RouteProvider } from "./types.js";
import { GoogleRoutesProvider } from "./googleRoutesProvider.js";
import { MockRouteProvider } from "./mockRouteProvider.js";

export function createRouteProvider(config: AppConfig): {
  provider: RouteProvider;
  warnings: string[];
} {
  if (config.routeProvider === "google") {
    if (config.googleMapsApiKey) {
      return {
        provider: new GoogleRoutesProvider({
          apiKey: config.googleMapsApiKey,
          languageCode: config.googleMapsLanguageCode,
          regionCode: config.googleMapsRegionCode
        }),
        warnings: []
      };
    }

    throw new Error("ROUTE_PROVIDER=google requires GOOGLE_MAPS_API_KEY.");
  }

  return {
    provider: new MockRouteProvider(),
    warnings: []
  };
}
