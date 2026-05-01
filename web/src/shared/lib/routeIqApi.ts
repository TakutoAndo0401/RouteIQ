import type { RouteAnalysisRequest, RouteAnalysisResult } from "../../entities/route/model";

export interface FuelPriceAverage {
  label: string;
  value: number;
  unit: "円/L";
  surveyedAt: string;
  sourceUrl: string;
}

export interface FuelPriceAveragesResponse {
  prices: FuelPriceAverage[];
  sourceLabel: string;
  fetchedAt: string;
}

export interface ClientConfigResponse {
  googleMapsBrowserApiKey: string | null;
  googleMapsEmbedApiKey?: string | null;
}

export function getGoogleMapsBrowserApiKey(config: ClientConfigResponse): string | null {
  return config.googleMapsBrowserApiKey ?? config.googleMapsEmbedApiKey ?? null;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = (await response.json()) as T | { error?: string };
  if (!response.ok) {
    const maybeError = payload as { error?: unknown };
    throw new Error(
      typeof maybeError.error === "string" && maybeError.error
        ? maybeError.error
        : "RouteIQ API request failed."
    );
  }
  return payload as T;
}

export function analyzeRoute(input: RouteAnalysisRequest) {
  return postJson<RouteAnalysisResult>("/api/route-analysis", input);
}

export async function getFuelPriceAverages(): Promise<FuelPriceAveragesResponse> {
  const response = await fetch("/api/fuel-prices");
  const payload = (await response.json()) as FuelPriceAveragesResponse | { error?: string };
  if (!response.ok) {
    const maybeError = payload as { error?: unknown };
    throw new Error(
      typeof maybeError.error === "string" && maybeError.error
        ? maybeError.error
        : "Fuel price request failed."
    );
  }
  return payload as FuelPriceAveragesResponse;
}

export async function getClientConfig(): Promise<ClientConfigResponse> {
  const response = await fetch("/api/client-config");
  const payload = (await response.json()) as ClientConfigResponse | { error?: string };
  if (!response.ok) {
    const maybeError = payload as { error?: unknown };
    throw new Error(
      typeof maybeError.error === "string" && maybeError.error
        ? maybeError.error
        : "Client config request failed."
    );
  }
  return payload as ClientConfigResponse;
}
