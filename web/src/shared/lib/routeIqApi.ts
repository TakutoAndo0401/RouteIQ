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

/** 呼び出し側が復旧手段を選ぶための失敗分類。 */
export type RouteIqApiErrorKind =
  | "network"
  | "rate-limit"
  | "invalid-request"
  | "server"
  | "unknown";

const MAX_DETAIL_LENGTH = 400;

/** HTTP ステータスと元の応答本文を保持する RouteIQ API の失敗。 */
export class RouteIqApiError extends Error {
  readonly kind: RouteIqApiErrorKind;
  readonly status: number | null;

  constructor(kind: RouteIqApiErrorKind, status: number | null, detail: string) {
    super(detail);
    this.name = "RouteIqApiError";
    this.kind = kind;
    this.status = status;
  }
}

function classifyStatus(status: number): RouteIqApiErrorKind {
  if (status === 429) return "rate-limit";
  if (status === 400 || status === 422) return "invalid-request";
  if (status >= 500) return "server";
  return "unknown";
}

function readServerErrorMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const { error } = payload as { error?: unknown };
  return typeof error === "string" && error.trim() ? error.trim() : null;
}

/**
 * 応答本文を読み、JSON として解釈できたときだけ値を返します。
 * `response.ok` の判定前に `response.json()` を呼ぶと、プロキシが返す HTML の
 * エラーページで SyntaxError が発生し、本来のステータスが失われるため分離しています。
 */
async function readResponseBody(
  response: Response
): Promise<{ payload: unknown; raw: string }> {
  let raw: string;
  try {
    raw = await response.text();
  } catch {
    return { payload: null, raw: "" };
  }

  if (!raw.trim()) return { payload: null, raw };

  try {
    return { payload: JSON.parse(raw) as unknown, raw };
  } catch {
    return { payload: null, raw };
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, init);
  } catch (caught) {
    throw new RouteIqApiError(
      "network",
      null,
      caught instanceof Error ? caught.message : String(caught)
    );
  }

  const { payload, raw } = await readResponseBody(response);

  if (!response.ok) {
    const detail = readServerErrorMessage(payload) ?? raw.trim().slice(0, MAX_DETAIL_LENGTH);
    throw new RouteIqApiError(
      classifyStatus(response.status),
      response.status,
      detail || `HTTP ${response.status} ${response.statusText}`.trim()
    );
  }

  if (payload === null) {
    throw new RouteIqApiError(
      "server",
      response.status,
      raw.trim().slice(0, MAX_DETAIL_LENGTH) || "Response body was not valid JSON."
    );
  }

  return payload as T;
}

export function analyzeRoute(input: RouteAnalysisRequest) {
  return requestJson<RouteAnalysisResult>("/api/route-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
}

export function getFuelPriceAverages(): Promise<FuelPriceAveragesResponse> {
  return requestJson<FuelPriceAveragesResponse>("/api/fuel-prices");
}

export function getClientConfig(): Promise<ClientConfigResponse> {
  return requestJson<ClientConfigResponse>("/api/client-config");
}
