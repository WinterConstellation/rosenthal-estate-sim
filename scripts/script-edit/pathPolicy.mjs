import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path";

export const DEFAULT_SCRIPT_EDIT_CONFIG = {
  allow: [
    "src/data/scriptPacks/*.js",
    "src/data/scriptManifest.js",
    "src/data/rosenthalScriptContent.js",
    "src/data/tutorialContent.js",
    "src/data/systemContent.js",
  ],
  deny: [
    "src/App.jsx",
    "src/engine/**",
    "src/components/**",
    "electron/**",
    "scripts/**",
    "package.json",
    "vite.config.js",
  ],
  verify: ["npm.cmd run verify"],
};

export function getScriptEditDir(projectRoot) {
  return join(projectRoot, ".script-edit");
}

export function getScriptEditConfigPath(projectRoot) {
  return join(getScriptEditDir(projectRoot), "config.json");
}

export function getScriptEditIndexPath(projectRoot) {
  return join(getScriptEditDir(projectRoot), "index.json");
}

export function toProjectSlashPath(value) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/^\.\//, "");
}

export function normalizeProjectPath(projectRoot, rawPath) {
  if (!rawPath || rawPath.includes("\0")) throw new Error("Invalid path");
  if (isAbsolute(rawPath)) throw new Error("Absolute paths are not allowed");
  const absolute = resolve(projectRoot, normalize(rawPath));
  const rel = relative(projectRoot, absolute);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error("Path must stay inside the project");
  }
  return toProjectSlashPath(rel);
}

function escapeRegExp(value) {
  return value.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

export function globToRegExp(pattern) {
  const normalized = toProjectSlashPath(pattern);
  let source = "";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (normalized.slice(index, index + 3) === "**/") {
      source += "(?:[^/]+/)*";
      index += 2;
      continue;
    }
    if (normalized.slice(index, index + 2) === "**") {
      source += ".*";
      index += 1;
      continue;
    }
    if (char === "*") {
      source += "[^/]*";
      continue;
    }
    source += escapeRegExp(char);
  }
  return new RegExp(`^${source}$`);
}

export function matchesPattern(pattern, relativePath) {
  return globToRegExp(pattern).test(toProjectSlashPath(relativePath));
}

export function matchesAny(patterns, relativePath) {
  return patterns.some((pattern) => matchesPattern(pattern, relativePath));
}

export function normalizeScriptEditConfig(raw = {}) {
  return {
    allow: Array.isArray(raw.allow) ? raw.allow : DEFAULT_SCRIPT_EDIT_CONFIG.allow,
    deny: Array.isArray(raw.deny) ? raw.deny : DEFAULT_SCRIPT_EDIT_CONFIG.deny,
    verify: Array.isArray(raw.verify) ? raw.verify : DEFAULT_SCRIPT_EDIT_CONFIG.verify,
  };
}

export function ensureScriptEditConfig(projectRoot) {
  const configPath = getScriptEditConfigPath(projectRoot);
  if (!existsSync(configPath)) {
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, `${JSON.stringify(DEFAULT_SCRIPT_EDIT_CONFIG, null, 2)}\n`, "utf8");
  }
  return loadScriptEditConfig(projectRoot);
}

export function loadScriptEditConfig(projectRoot) {
  const configPath = getScriptEditConfigPath(projectRoot);
  if (!existsSync(configPath)) return DEFAULT_SCRIPT_EDIT_CONFIG;
  return normalizeScriptEditConfig(JSON.parse(readFileSync(configPath, "utf8")));
}

export function isScriptEditPathAllowed(config, relativePath) {
  const path = toProjectSlashPath(relativePath);
  if (matchesAny(config.deny ?? [], path)) return false;
  return matchesAny(config.allow ?? [], path);
}

export function assertScriptEditPathAllowed(config, relativePath) {
  if (!isScriptEditPathAllowed(config, relativePath)) {
    throw new Error(`Path is not editable: ${relativePath}`);
  }
}
