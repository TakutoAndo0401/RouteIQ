import type { AppConfig } from "../config/env.js";
import type { RouteProvider } from "../providers/types.js";

export interface RouteChatContext {
  config: AppConfig;
  provider: RouteProvider;
  providerWarnings: string[];
}
