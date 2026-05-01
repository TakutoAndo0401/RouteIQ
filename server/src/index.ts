import { createServer } from "node:http";
import type { IncomingMessage } from "node:http";
import type { ServerResponse } from "node:http";
import { getAppConfig } from "./config/env.js";
import { analyzeRouteChat } from "./chat/routeChat.js";
import { fetchFuelPriceAverages } from "./fuelPrices.js";
import { createRouteProvider } from "./providers/providerFactory.js";
import { readWebHtml } from "./web/readWebHtml.js";

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "content-type, authorization"
  );
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function writeJson(res: ServerResponse, status: number, payload: unknown): void {
  res
    .writeHead(status, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    })
    .end(JSON.stringify(payload));
}

const config = getAppConfig();
const httpServer = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end("Missing URL");
    return;
  }

  const origin = req.headers.origin;
  if (!isAllowedOrigin(origin)) {
    res.writeHead(403).end("Forbidden origin");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  if (req.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
    setCorsHeaders(res);
    res.writeHead(204).end();
    return;
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/preview")) {
    res
      .writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      })
      .end(readWebHtml());
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/fuel-prices") {
    setCorsHeaders(res);
    try {
      writeJson(res, 200, await fetchFuelPriceAverages());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Fuel price request failed.";
      writeJson(res, 502, { error: message });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/client-config") {
    setCorsHeaders(res);
    writeJson(res, 200, {
      googleMapsBrowserApiKey: config.googleMapsBrowserApiKey ?? null
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/route-analysis") {
    setCorsHeaders(res);
    try {
      const body = await readJsonBody(req);
      const { provider, warnings } = createRouteProvider(config);
      const result = await analyzeRouteChat(body, {
        config,
        provider,
        providerWarnings: warnings
      });
      writeJson(res, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Route analysis failed.";
      writeJson(res, 400, { error: message });
    }
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(config.port, "127.0.0.1");
