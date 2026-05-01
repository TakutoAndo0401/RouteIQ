import type { ProviderRouteResult, RouteProviderRequest } from "../domain/types.js";

export interface RouteProvider {
  readonly name: string;
  computeRoute(request: RouteProviderRequest): Promise<ProviderRouteResult>;
}
