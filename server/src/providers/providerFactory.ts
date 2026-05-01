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

    return {
      provider: new MockRouteProvider(),
      warnings: [
        "ROUTE_PROVIDER=google ですが GOOGLE_MAPS_API_KEY が未設定のため mock provider に切り替えました。"
      ]
    };
  }

  return {
    provider: new MockRouteProvider(),
    warnings: []
  };
}
