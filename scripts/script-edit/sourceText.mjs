import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { normalizeProjectPath } from "./pathPolicy.mjs";

export function normalizeLf(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function readUtf8Lf(projectRoot, relativePath) {
  const safePath = normalizeProjectPath(projectRoot, relativePath);
  return normalizeLf(readFileSync(join(projectRoot, safePath), "utf8").replace(/^\uFEFF/, ""));
}

export function writeUtf8Lf(projectRoot, relativePath, content) {
  const safePath = normalizeProjectPath(projectRoot, relativePath);
  const absolute = join(projectRoot, safePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${normalizeLf(content).replace(/\n?$/, "\n")}`, "utf8");
}

export function writeJsonLf(projectRoot, relativePath, value) {
  writeUtf8Lf(projectRoot, relativePath, JSON.stringify(value, null, 2));
}

export function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
