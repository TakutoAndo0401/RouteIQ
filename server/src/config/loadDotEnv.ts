import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotEnv } from "dotenv";

export function loadLocalDotEnv(): void {
  for (const path of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../.env")]) {
    if (existsSync(path)) {
      loadDotEnv({ path, override: false });
    }
  }
}
