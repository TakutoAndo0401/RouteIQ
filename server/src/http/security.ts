import type { IncomingMessage } from "node:http";
import type { ServerResponse } from "node:http";

export class HttpRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function isAllowedOrigin(origin: string | undefined, allowedOrigins: string[]): boolean {
  return !origin || allowedOrigins.includes(origin);
}

export function setCorsHeaders(
  res: ServerResponse,
  origin: string | undefined,
  allowedOrigins: string[]
): void {
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

export async function readJsonBody(
  req: IncomingMessage,
  maxBytes: number
): Promise<unknown> {
  const contentLength = req.headers["content-length"];
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new HttpRequestError(413, "Request body is too large.");
  }

  const chunks: Buffer[] = [];
  let receivedBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    receivedBytes += buffer.byteLength;
    if (receivedBytes > maxBytes) {
      throw new HttpRequestError(413, "Request body is too large.");
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new HttpRequestError(400, "Request body must be valid JSON.");
  }
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: {
  maxRequests: number;
  windowMs: number;
  now?: () => number;
}): (key: string) => boolean {
  const buckets = new Map<string, RateLimitBucket>();
  const now = options.now ?? Date.now;

  return (key: string) => {
    const currentTime = now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= currentTime) {
      buckets.set(key, {
        count: 1,
        resetAt: currentTime + options.windowMs
      });
      return true;
    }

    if (bucket.count >= options.maxRequests) return false;
    bucket.count += 1;
    return true;
  };
}

export function getClientRateLimitKey(req: IncomingMessage): string {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string") {
    const firstAddress = forwardedFor.split(",")[0]?.trim();
    if (firstAddress) return firstAddress;
  }
  return req.socket.remoteAddress ?? "unknown";
}
