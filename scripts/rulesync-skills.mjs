import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const mode = process.argv[2] ?? "generate";
if (mode !== "generate" && mode !== "check") {
  throw new Error(`Unknown rulesync mode: ${mode}`);
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const sourceSkills = resolve(repositoryRoot, ".codex/skills");
const rulesyncSkills = resolve(repositoryRoot, ".rulesync/skills");

await mkdir(rulesyncSkills, { recursive: true });
const stagedEntries = await readdir(rulesyncSkills, { withFileTypes: true });
await Promise.all(
  stagedEntries
    .filter((entry) => entry.name !== ".curated")
    .map((entry) =>
      rm(resolve(rulesyncSkills, entry.name), { force: true, recursive: true }),
    ),
);
await cp(sourceSkills, rulesyncSkills, { recursive: true });

const executable = process.platform === "win32" ? "rulesync.cmd" : "rulesync";
const args = mode === "check" ? ["generate", "--check"] : ["generate"];

await new Promise((resolveProcess, rejectProcess) => {
  const child = spawn(executable, args, {
    cwd: repositoryRoot,
    stdio: "inherit",
    shell: false,
  });

  child.once("error", rejectProcess);
  child.once("close", (exitCode, signal) => {
    if (signal) {
      rejectProcess(new Error(`rulesync exited with signal ${signal}`));
      return;
    }

    if (exitCode !== 0) {
      process.exitCode = exitCode ?? 1;
    }
    resolveProcess();
  });
});
