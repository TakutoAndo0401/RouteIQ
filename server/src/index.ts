import { createServer } from "node:http";
import { getAppConfig } from "./config/env.js";
import { loadLocalDotEnv } from "./config/loadDotEnv.js";
import {
  getClientRateLimitKey,
  readJsonBody
} from "./http/security.js";
import { createRouteIqApiHandler } from "./http/routeIqApi.js";
import { readWebHtml } from "./web/readWebHtml.js";

loadLocalDotEnv();
const config = getAppConfig();
const handleApiRequest = createRouteIqApiHandler(config);

const httpServer = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end("Missing URL");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/preview")) {
    res
      .writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      })
      .end(readWebHtml());
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    const response = await handleApiRequest({
      method: req.method ?? "GET",
      path: url.pathname,
      origin: req.headers.origin,
      clientKey: getClientRateLimitKey(req),
      readBody: (maxBytes) => readJsonBody(req, maxBytes)
    });
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(await response.text());
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(config.port, "127.0.0.1");
