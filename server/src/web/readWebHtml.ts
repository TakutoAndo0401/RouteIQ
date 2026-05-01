import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

export function readWebHtml(): string {
  const candidates = [
    resolve(process.cwd(), "web/dist/index.html"),
    resolve(process.cwd(), "../web/dist/index.html"),
    resolve(currentDir, "../../web/dist/index.html"),
    resolve(currentDir, "../../../web/dist/index.html")
  ];
  const htmlPath = candidates.find((candidate) => existsSync(candidate));
  if (!htmlPath) {
    return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>RouteIQ</title>
  </head>
  <body>
    <main style="font-family: system-ui, sans-serif; padding: 16px;">
      <h1>RouteIQ web app is not built</h1>
      <p>Run <code>pnpm --filter @routeiq/web build</code> before starting the production server.</p>
    </main>
  </body>
</html>`;
  }

  return readFileSync(htmlPath, "utf8");
}
