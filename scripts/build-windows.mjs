import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = resolve(import.meta.dirname, "..");
const outputDir = join(tmpdir(), `rosenthal-estate-builder-${process.pid}`);
const releaseDir = join(projectRoot, "release");
const npmCli = process.env.npm_execpath;
const builder = join(projectRoot, "node_modules", "electron-builder", "out", "cli", "cli.js");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: "false",
      NODE_OPTIONS: [process.env.NODE_OPTIONS, "--use-system-ca"].filter(Boolean).join(" "),
    },
    stdio: "inherit",
    shell: false,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

rmSync(outputDir, { recursive: true, force: true });
rmSync(releaseDir, { recursive: true, force: true });

run(process.execPath, [npmCli, "run", "build"]);
run(process.execPath, [builder, "--win", "portable", "--x64", `--config.directories.output=${outputDir}`]);

const executable = readdirSync(outputDir).find((name) => name.endsWith(".exe"));
if (!executable) throw new Error("Windows executable was not created.");

mkdirSync(releaseDir, { recursive: true });
copyFileSync(join(outputDir, executable), join(releaseDir, executable));
rmSync(outputDir, { recursive: true, force: true });

console.log(`Created release/${executable}`);
