# Local Script Editing Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a localhost-only editing tool that lets the user edit allowlisted script and tuning data, save the change to the real local source file, and verify the result.

**Architecture:** Keep Understand Anything read-only and separate. Add a small Node-based script-edit subsystem under `scripts/script-edit/`, with a generated `.script-edit/index.json`, a committed `.script-edit/config.json`, a localhost token-protected HTTP server, and a static editor UI. All writes go through allowlist and stale-index checks before touching source files.

**Tech Stack:** Node ESM, built-in `node:http`, `node:fs`, `node:path`, `node:crypto`, `node:child_process`, existing `npm.cmd run verify`, no new npm dependency.

## Global Constraints

- The edit server binds to `127.0.0.1` only.
- The edit server requires a one-time token in the URL and on API requests.
- Write targets must pass `.script-edit/config.json` allow rules and deny rules.
- First writable files are `src/data/scriptPacks/*.js`, `src/data/scriptManifest.js`, `src/data/rosenthalContent.js`, `src/rules/tutorialRules.js`, and declarative data in `src/rules/systemRules.js`.
- Locked files include `src/App.jsx`, `src/engine/**`, `src/components/**`, `electron/**`, `scripts/**` except the edit tool's own scripts, `package.json`, `vite.config.js`, build config, deployment config, and save migration logic.
- Generated indexes are not source of truth. Source files remain source of truth.
- Preserve UTF-8 without BOM and LF.
- Source and docs must not be written through PowerShell redirection.
- Verification remains available through `npm.cmd run verify`.

---

## File Structure

- `.script-edit/config.json`: committed write policy for the local editor.
- `.gitignore`: ignore generated `.script-edit/index.json`, backups, and temp files while keeping config.
- `scripts/script-edit/pathPolicy.mjs`: path normalization, glob matching, config loading, and write permission checks.
- `scripts/script-edit/sourceText.mjs`: UTF-8/LF file IO, hash calculation, and backup record writing.
- `scripts/script-edit/sourceScanner.mjs`: source-span helpers for safe string literal replacement in known JS data modules.
- `scripts/script-edit/indexGenerator.mjs`: builds and writes `.script-edit/index.json` from allowlisted source modules.
- `scripts/script-edit/editorStore.mjs`: reads index items and applies single-field edits with stale-index protection.
- `scripts/script-edit/server.mjs`: token-protected localhost HTTP API and static UI server.
- `scripts/script-edit/public/index.html`: editor shell.
- `scripts/script-edit/public/styles.css`: focused authoring-tool layout.
- `scripts/script-edit/public/app.js`: client-side index list, item loading, save, re-index, and verify actions.
- `scripts/verify-script-edit.mjs`: script-edit verification suite.
- `scripts/verify-game.mjs`: import the script-edit verification suite before the final success log.
- `package.json`: add `script-edit` and `script-edit:index` commands.
- `docs/pingpong.txt`: mark this implementation plan as the next handoff target.
- `docs/work_log.txt`: record the plan and later implementation completion.

---

### Task 1: Policy, Config, And Verification Harness

**Files:**
- Create: `.script-edit/config.json`
- Modify: `.gitignore`
- Create: `scripts/script-edit/pathPolicy.mjs`
- Create: `scripts/verify-script-edit.mjs`
- Modify: `scripts/verify-game.mjs`

**Interfaces:**
- Produces: `loadScriptEditConfig(projectRoot: string): object`
- Produces: `ensureScriptEditConfig(projectRoot: string): object`
- Produces: `normalizeProjectPath(projectRoot: string, rawPath: string): string`
- Produces: `matchesPattern(pattern: string, relativePath: string): boolean`
- Produces: `isScriptEditPathAllowed(config: object, relativePath: string): boolean`
- Produces: `assertScriptEditPathAllowed(config: object, relativePath: string): void`

- [ ] **Step 1: Add failing policy tests**

Append this first block to a new `scripts/verify-script-edit.mjs`:

```js
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_SCRIPT_EDIT_CONFIG,
  assertScriptEditPathAllowed,
  ensureScriptEditConfig,
  isScriptEditPathAllowed,
  loadScriptEditConfig,
  matchesPattern,
  normalizeProjectPath,
} from "./script-edit/pathPolicy.mjs";

const repoRoot = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

assert.equal(DEFAULT_SCRIPT_EDIT_CONFIG.allow.includes("src/data/scriptPacks/*.js"), true);
assert.equal(normalizeProjectPath(repoRoot, "src/data/scriptManifest.js"), "src/data/scriptManifest.js");
assert.throws(() => normalizeProjectPath(repoRoot, "../package.json"), /inside the project/);
assert.throws(() => normalizeProjectPath(repoRoot, "C:/outside/file.js"), /Absolute paths/);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/data/scriptPacks/specialEventGroups.js"), true);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/data/scriptManifest.js"), true);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/App.jsx"), false);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/engine/scriptLoader.js"), false);
assert.equal(matchesPattern("src/engine/**", "src/engine/scriptLoader.js"), true);
assert.equal(matchesPattern("src/data/scriptPacks/*.js", "src/data/scriptPacks/specialEventGroups.js"), true);
assert.equal(matchesPattern("src/data/scriptPacks/*.js", "src/data/scriptPacks/nested/file.js"), false);
assert.doesNotThrow(() => assertScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/data/scriptManifest.js"));
assert.throws(() => assertScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/engine/scriptLoader.js"), /not editable/);

const tempRoot = mkdtempSync(join(tmpdir(), "script-edit-policy-"));
try {
  mkdirSync(join(tempRoot, ".script-edit"), { recursive: true });
  const config = ensureScriptEditConfig(tempRoot);
  assert.deepEqual(config.allow, DEFAULT_SCRIPT_EDIT_CONFIG.allow);
  assert.deepEqual(loadScriptEditConfig(tempRoot).deny, DEFAULT_SCRIPT_EDIT_CONFIG.deny);
  writeFileSync(join(tempRoot, ".script-edit", "config.json"), JSON.stringify({
    allow: ["src/data/scriptManifest.js"],
    deny: ["src/data/scriptPacks/*.js"],
    verify: ["npm.cmd run verify"]
  }, null, 2), "utf8");
  assert.equal(loadScriptEditConfig(tempRoot).allow.length, 1);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Script edit verification passed.");
```

- [ ] **Step 2: Run the failing verification**

Run: `npm.cmd run verify`

Expected: FAIL with a module resolution error for `scripts/script-edit/pathPolicy.mjs`.

- [ ] **Step 3: Add the committed edit policy**

Create `.script-edit/config.json`:

```json
{
  "allow": [
    "src/data/scriptPacks/*.js",
    "src/data/scriptManifest.js",
    "src/data/rosenthalContent.js",
    "src/rules/tutorialRules.js",
    "src/rules/systemRules.js"
  ],
  "deny": [
    "src/App.jsx",
    "src/engine/**",
    "src/components/**",
    "electron/**",
    "scripts/**",
    "package.json",
    "vite.config.js"
  ],
  "verify": ["npm.cmd run verify"]
}
```

- [ ] **Step 4: Ignore generated edit artifacts**

Append these exact lines to `.gitignore`:

```gitignore
.script-edit/index.json
.script-edit/backups/
.script-edit/tmp/
```

- [ ] **Step 5: Implement path policy**

Create `scripts/script-edit/pathPolicy.mjs`:

```js
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path";

export const DEFAULT_SCRIPT_EDIT_CONFIG = {
  allow: [
    "src/data/scriptPacks/*.js",
    "src/data/scriptManifest.js",
    "src/data/rosenthalContent.js",
    "src/rules/tutorialRules.js",
    "src/rules/systemRules.js",
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
```

- [ ] **Step 6: Connect script-edit verification to the existing verify command**

Add this line immediately before the final `console.log("Rosenthal vertical slice verification passed.");` in `scripts/verify-game.mjs`:

```js
await import("./verify-script-edit.mjs");
```

- [ ] **Step 7: Run verification**

Run: `npm.cmd run verify`

Expected: PASS and output includes:

```text
Script edit verification passed.
Rosenthal vertical slice verification passed.
```

- [ ] **Step 8: Commit Task 1**

Run:

```bash
git add .gitignore .script-edit/config.json scripts/script-edit/pathPolicy.mjs scripts/verify-script-edit.mjs scripts/verify-game.mjs
git commit -m "feat: add script edit policy"
```

---

### Task 2: Script Edit Index Generator

**Files:**
- Create: `scripts/script-edit/sourceText.mjs`
- Create: `scripts/script-edit/sourceScanner.mjs`
- Create: `scripts/script-edit/indexGenerator.mjs`
- Modify: `scripts/verify-script-edit.mjs`

**Interfaces:**
- Consumes: Task 1 policy functions.
- Produces: `readUtf8Lf(projectRoot: string, relativePath: string): string`
- Produces: `sha256Text(text: string): string`
- Produces: `parseStageCalls(source: string): Array<object>`
- Produces: `buildScriptEditIndex(projectRoot: string): Promise<object>`
- Produces: `writeScriptEditIndex(projectRoot: string): Promise<object>`

- [ ] **Step 1: Add failing index tests**

Add these imports to `scripts/verify-script-edit.mjs`:

```js
import { existsSync, readFileSync } from "node:fs";
import { getScriptEditIndexPath } from "./script-edit/pathPolicy.mjs";
import { buildScriptEditIndex, writeScriptEditIndex } from "./script-edit/indexGenerator.mjs";
```

Add this test block before the final script-edit success log:

```js
const index = await buildScriptEditIndex(repoRoot);
const ids = new Set(index.entries.map((entry) => entry.id));
assert.equal(index.version, "1.0.0");
assert.equal(index.entries.some((entry) => entry.sourceFile === "src/App.jsx"), false);
assert.equal(ids.has("manifest:special-event-groups:triggerKey"), true);
assert.equal(ids.has("manifest:special-event-groups:stageCount"), true);
assert.equal(ids.has("script-pack:special-event-groups:blank-ledger:stage-1:title"), true);
assert.equal(ids.has("script-pack:special-event-groups:blank-ledger:stage-1:text"), true);
assert.equal(ids.has("script-pack:special-event-groups:blank-ledger:stage-1:left-label"), true);
assert.equal(ids.has("script-pack:special-event-groups:blank-ledger:stage-1:right-label"), true);
const blankText = index.entries.find((entry) => entry.id === "script-pack:special-event-groups:blank-ledger:stage-1:text");
assert.equal(blankText.kind, "dialogue");
assert.equal(blankText.sourceFile, "src/data/scriptPacks/specialEventGroups.js");
assert.equal(blankText.locator.type, "source-span");
assert.equal(Number.isInteger(blankText.locator.start), true);
assert.equal(Number.isInteger(blankText.locator.end), true);
assert.equal(blankText.value, "새 장부 앞 일곱 장은 날짜만 남아 있다.");
const writtenIndex = await writeScriptEditIndex(repoRoot);
assert.equal(writtenIndex.entries.length, index.entries.length);
assert.equal(existsSync(getScriptEditIndexPath(repoRoot)), true);
assert.equal(JSON.parse(readFileSync(getScriptEditIndexPath(repoRoot), "utf8")).entries.length, index.entries.length);
```

- [ ] **Step 2: Run the failing verification**

Run: `npm.cmd run verify`

Expected: FAIL with a module resolution error for `scripts/script-edit/indexGenerator.mjs`.

- [ ] **Step 3: Add source text helpers**

Create `scripts/script-edit/sourceText.mjs`:

```js
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
```

- [ ] **Step 4: Add source scanner helpers**

Create `scripts/script-edit/sourceScanner.mjs` with these exported behaviors:

```js
export function readStringLiteral(source, quoteIndex) {
  const quote = source[quoteIndex];
  if (quote !== "\"" && quote !== "'") throw new Error(`Expected string literal at ${quoteIndex}`);
  let value = "";
  for (let index = quoteIndex + 1; index < source.length; index += 1) {
    const char = source[index];
    if (char === "\\") {
      value += JSON.parse(`"${source.slice(index, index + 2).replace(/"/g, "\\\"")}"`);
      index += 1;
      continue;
    }
    if (char === quote) {
      return {
        value,
        literalStart: quoteIndex,
        literalEnd: index + 1,
        valueStart: quoteIndex + 1,
        valueEnd: index,
      };
    }
    value += char;
  }
  throw new Error("Unterminated string literal");
}

export function findNextStringLiteral(source, fromIndex) {
  for (let index = fromIndex; index < source.length; index += 1) {
    if (source[index] === "\"" || source[index] === "'") return readStringLiteral(source, index);
  }
  throw new Error("No string literal found");
}

export function parseStageCalls(source) {
  const stages = [];
  const stagePattern = /\bstage\s*\(/g;
  let match;
  while ((match = stagePattern.exec(source)) !== null) {
    let cursor = match.index + match[0].length;
    const fields = [];
    for (const field of ["title", "text", "left", "right"]) {
      const literal = findNextStringLiteral(source, cursor);
      fields.push({ field, ...literal });
      cursor = literal.literalEnd;
    }
    stages.push({ callStart: match.index, callEnd: cursor, fields });
  }
  return stages;
}

export function findObjectContainingString(source, literalValue) {
  const encoded = JSON.stringify(literalValue);
  const literalIndex = source.indexOf(encoded);
  if (literalIndex < 0) throw new Error(`Could not find literal ${literalValue}`);
  let start = literalIndex;
  while (start >= 0 && source[start] !== "{") start -= 1;
  let depth = 0;
  for (let end = start; end < source.length; end += 1) {
    if (source[end] === "{") depth += 1;
    if (source[end] === "}") depth -= 1;
    if (depth === 0) return { start, end: end + 1, text: source.slice(start, end + 1) };
  }
  throw new Error(`Could not close object for ${literalValue}`);
}

export function findPropertyLiteralSpan(objectSource, objectOffset, propertyName) {
  const propertyPattern = new RegExp(`\\b${propertyName}\\s*:\\s*`);
  const match = propertyPattern.exec(objectSource);
  if (!match) throw new Error(`Missing property ${propertyName}`);
  const valueStart = objectOffset + match.index + match[0].length;
  const nextComma = objectSource.indexOf(",", match.index + match[0].length);
  const localEnd = nextComma < 0 ? objectSource.length : nextComma;
  return {
    start: valueStart,
    end: objectOffset + localEnd,
    raw: objectSource.slice(match.index + match[0].length, localEnd).trim(),
  };
}
```

- [ ] **Step 5: Add the index generator**

Create `scripts/script-edit/indexGenerator.mjs`. It must:

- call `ensureScriptEditConfig(projectRoot)`,
- read `src/data/scriptManifest.js` as source text and parse known manifest properties,
- read `src/data/scriptPacks/specialEventGroups.js` as source text and parse known group/stage literals,
- generate manifest entries for `triggerKey`, `kind`, `moduleKey`, `exportName`, `itemCount`, and `stageCount`,
- generate script pack entries for stage title, text, left label, and right label,
- store `sourceHash` for stale-index protection,
- write `.script-edit/index.json` on `--write`.

Do not use dynamic `import()` for project files in the index generator. The verification suite copies source files into temporary directories that do not have the repository's `package.json` module scope, so source-text parsing is the stable path.

Use this entry shape for every item:

```js
function makeEntry({ id, kind, label, sourceFile, source, start, end, value, valueType, field, verify }) {
  return {
    id,
    kind,
    label,
    sourceFile,
    sourceHash: sha256Text(source),
    locator: { type: "source-span", start, end },
    editableFields: [{ name: "value", type: valueType }],
    field,
    value,
    verify,
  };
}
```

- [ ] **Step 6: Run verification**

Run: `npm.cmd run verify`

Expected: PASS and `.script-edit/index.json` exists locally but is ignored by Git.

- [ ] **Step 7: Confirm generated artifacts are ignored**

Run: `git status --short`

Expected: changed source files are visible, but `.script-edit/index.json` is not listed.

- [ ] **Step 8: Commit Task 2**

Run:

```bash
git add scripts/script-edit/sourceText.mjs scripts/script-edit/sourceScanner.mjs scripts/script-edit/indexGenerator.mjs scripts/verify-script-edit.mjs
git commit -m "feat: generate script edit index"
```

---

### Task 3: Safe Local Write Path

**Files:**
- Create: `scripts/script-edit/editorStore.mjs`
- Modify: `scripts/verify-script-edit.mjs`

**Interfaces:**
- Consumes: Task 2 index output.
- Produces: `loadScriptEditIndex(projectRoot: string): object`
- Produces: `getEditableItem(projectRoot: string, itemId: string): object`
- Produces: `applyScriptEdit(projectRoot: string, edit: { id: string, value: string | number }): Promise<object>`

- [ ] **Step 1: Add failing save tests**

Add these imports to `scripts/verify-script-edit.mjs`:

```js
import { copyFileSync } from "node:fs";
import { applyScriptEdit, getEditableItem } from "./script-edit/editorStore.mjs";
```

Add this temp-project save test before the final script-edit success log:

```js
const tempEditRoot = mkdtempSync(join(tmpdir(), "script-edit-save-"));
try {
  mkdirSync(join(tempEditRoot, "src", "data", "scriptPacks"), { recursive: true });
  mkdirSync(join(tempEditRoot, "src", "data"), { recursive: true });
  mkdirSync(join(tempEditRoot, ".script-edit"), { recursive: true });
  copyFileSync(join(repoRoot, "src", "data", "scriptManifest.js"), join(tempEditRoot, "src", "data", "scriptManifest.js"));
  copyFileSync(join(repoRoot, "src", "data", "scriptPacks", "specialEventGroups.js"), join(tempEditRoot, "src", "data", "scriptPacks", "specialEventGroups.js"));
  writeFileSync(join(tempEditRoot, ".script-edit", "config.json"), JSON.stringify(DEFAULT_SCRIPT_EDIT_CONFIG, null, 2), "utf8");
  await writeScriptEditIndex(tempEditRoot);
  const itemId = "script-pack:special-event-groups:blank-ledger:stage-1:text";
  const beforeItem = getEditableItem(tempEditRoot, itemId);
  assert.equal(beforeItem.value, "새 장부 앞 일곱 장은 날짜만 남아 있다.");
  const result = await applyScriptEdit(tempEditRoot, { id: itemId, value: "테스트용으로 바꾼 첫 장부 문장" });
  assert.equal(result.changedFile, "src/data/scriptPacks/specialEventGroups.js");
  assert.equal(result.reindexed, true);
  assert.equal(readFileSync(join(tempEditRoot, result.changedFile), "utf8").includes("테스트용으로 바꾼 첫 장부 문장"), true);
  assert.equal(getEditableItem(tempEditRoot, itemId).value, "테스트용으로 바꾼 첫 장부 문장");
  const staleIndex = JSON.parse(readFileSync(join(tempEditRoot, ".script-edit", "index.json"), "utf8"));
  staleIndex.entries.find((entry) => entry.id === itemId).sourceHash = "stale";
  writeFileSync(join(tempEditRoot, ".script-edit", "index.json"), JSON.stringify(staleIndex, null, 2), "utf8");
  await assert.rejects(() => applyScriptEdit(tempEditRoot, { id: itemId, value: "stale write" }), /stale/);
  await writeScriptEditIndex(tempEditRoot);
  const denied = JSON.parse(readFileSync(join(tempEditRoot, ".script-edit", "index.json"), "utf8"));
  denied.entries.push({
    id: "denied:app",
    kind: "source",
    label: "Denied",
    sourceFile: "src/App.jsx",
    sourceHash: "x",
    locator: { type: "source-span", start: 0, end: 0 },
    editableFields: [{ name: "value", type: "singleLineText" }],
    value: ""
  });
  writeFileSync(join(tempEditRoot, ".script-edit", "index.json"), JSON.stringify(denied, null, 2), "utf8");
  await assert.rejects(() => applyScriptEdit(tempEditRoot, { id: "denied:app", value: "no" }), /not editable/);
} finally {
  rmSync(tempEditRoot, { recursive: true, force: true });
}
```

- [ ] **Step 2: Run the failing verification**

Run: `npm.cmd run verify`

Expected: FAIL with a module resolution error for `scripts/script-edit/editorStore.mjs`.

- [ ] **Step 3: Implement the editor store**

Create `scripts/script-edit/editorStore.mjs`. It must:

- load `.script-edit/index.json`,
- resolve an entry by id,
- assert the entry source file is still allowed,
- compare current file hash against `entry.sourceHash`,
- replace only `entry.locator.start` to `entry.locator.end`,
- encode strings with `JSON.stringify(value)` when replacing JS literal fields,
- write a JSON backup record to `.script-edit/backups/`,
- run `writeScriptEditIndex(projectRoot)` after save.

Use this replacement rule:

```js
function encodeReplacement(value) {
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);
  return JSON.stringify(String(value));
}
```

Use this return shape from `applyScriptEdit`:

```js
{
  id: entry.id,
  changedFile: entry.sourceFile,
  backupFile: backupRelativePath,
  reindexed: true
}
```

- [ ] **Step 4: Run verification**

Run: `npm.cmd run verify`

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

Run:

```bash
git add scripts/script-edit/editorStore.mjs scripts/verify-script-edit.mjs
git commit -m "feat: save script edit items"
```

---

### Task 4: Localhost API Server

**Files:**
- Create: `scripts/script-edit/server.mjs`
- Modify: `scripts/verify-script-edit.mjs`

**Interfaces:**
- Consumes: Task 3 `getEditableItem` and `applyScriptEdit`.
- Produces: `createScriptEditServer(options: object): object`
- Produces endpoints: `GET /api/index`, `GET /api/item?id=...`, `POST /api/item`, `POST /api/reindex`, `POST /api/verify`

- [ ] **Step 1: Add failing server tests**

Add these imports to `scripts/verify-script-edit.mjs`:

```js
import { createScriptEditServer } from "./script-edit/server.mjs";
```

Add this test block before the final script-edit success log:

```js
const serverTestRoot = mkdtempSync(join(tmpdir(), "script-edit-server-"));
try {
  mkdirSync(join(serverTestRoot, "src", "data", "scriptPacks"), { recursive: true });
  mkdirSync(join(serverTestRoot, "src", "data"), { recursive: true });
  mkdirSync(join(serverTestRoot, ".script-edit"), { recursive: true });
  copyFileSync(join(repoRoot, "src", "data", "scriptManifest.js"), join(serverTestRoot, "src", "data", "scriptManifest.js"));
  copyFileSync(join(repoRoot, "src", "data", "scriptPacks", "specialEventGroups.js"), join(serverTestRoot, "src", "data", "scriptPacks", "specialEventGroups.js"));
  writeFileSync(join(serverTestRoot, ".script-edit", "config.json"), JSON.stringify(DEFAULT_SCRIPT_EDIT_CONFIG, null, 2), "utf8");
  await writeScriptEditIndex(serverTestRoot);
  const server = createScriptEditServer({ projectRoot: serverTestRoot, token: "test-token", port: 0, openBrowser: false });
  const address = await server.start();
  const base = `http://${address.host}:${address.port}`;
  const forbidden = await fetch(`${base}/api/index`);
  assert.equal(forbidden.status, 403);
  const okIndex = await fetch(`${base}/api/index?token=test-token`);
  assert.equal(okIndex.status, 200);
  const indexJson = await okIndex.json();
  assert.equal(indexJson.entries.length > 0, true);
  const itemResponse = await fetch(`${base}/api/item?token=test-token&id=${encodeURIComponent("script-pack:special-event-groups:blank-ledger:stage-1:title")}`);
  assert.equal(itemResponse.status, 200);
  assert.equal((await itemResponse.json()).value, "비어 있는 첫 장");
  const saveResponse = await fetch(`${base}/api/item?token=test-token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "script-pack:special-event-groups:blank-ledger:stage-1:title", value: "서버 저장 테스트" })
  });
  assert.equal(saveResponse.status, 200);
  assert.equal((await saveResponse.json()).changedFile, "src/data/scriptPacks/specialEventGroups.js");
  const missing = await fetch(`${base}/api/item?token=test-token&id=missing`);
  assert.equal(missing.status, 404);
  await server.close();
} finally {
  rmSync(serverTestRoot, { recursive: true, force: true });
}
```

- [ ] **Step 2: Run the failing verification**

Run: `npm.cmd run verify`

Expected: FAIL with a module resolution error for `scripts/script-edit/server.mjs`.

- [ ] **Step 3: Implement the server**

Create `scripts/script-edit/server.mjs`. It must:

- use only built-in Node modules,
- generate a random token when one is not provided,
- bind to `127.0.0.1`,
- serve static files from `scripts/script-edit/public`,
- reject API requests without the token,
- return JSON errors in this shape: `{ "error": "message" }`,
- expose `createScriptEditServer` for tests,
- when run directly, write the tokenized URL to the terminal.

Use this startup behavior:

```js
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createScriptEditServer({ projectRoot: process.cwd() });
  const address = await server.start();
  console.log(`Script editor: http://${address.host}:${address.port}/?token=${server.token}`);
}
```

- [ ] **Step 4: Run verification**

Run: `npm.cmd run verify`

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

Run:

```bash
git add scripts/script-edit/server.mjs scripts/verify-script-edit.mjs
git commit -m "feat: serve local script editor api"
```

---

### Task 5: Editor UI And Developer Commands

**Files:**
- Create: `scripts/script-edit/public/index.html`
- Create: `scripts/script-edit/public/styles.css`
- Create: `scripts/script-edit/public/app.js`
- Modify: `package.json`
- Modify: `scripts/verify-script-edit.mjs`

**Interfaces:**
- Consumes: Task 4 API endpoints.
- Produces: browser UI that lists index entries, loads an item, saves a value, re-indexes, and runs verify.
- Produces npm commands: `npm.cmd run script-edit:index`, `npm.cmd run script-edit`

- [ ] **Step 1: Add failing UI file and package tests**

Add this block to `scripts/verify-script-edit.mjs` before the final script-edit success log:

```js
const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
assert.equal(packageJson.scripts["script-edit:index"], "node scripts/script-edit/indexGenerator.mjs --write");
assert.equal(packageJson.scripts["script-edit"], "node scripts/script-edit/server.mjs");
const editorHtml = readFileSync(join(repoRoot, "scripts", "script-edit", "public", "index.html"), "utf8");
const editorJs = readFileSync(join(repoRoot, "scripts", "script-edit", "public", "app.js"), "utf8");
const editorCss = readFileSync(join(repoRoot, "scripts", "script-edit", "public", "styles.css"), "utf8");
assert.equal(editorHtml.includes("script-edit-root"), true);
assert.equal(editorJs.includes("/api/index"), true);
assert.equal(editorJs.includes("/api/item"), true);
assert.equal(editorJs.includes("/api/reindex"), true);
assert.equal(editorJs.includes("/api/verify"), true);
assert.equal(editorCss.includes(".editor-shell"), true);
```

- [ ] **Step 2: Run the failing verification**

Run: `npm.cmd run verify`

Expected: FAIL because the UI files and package scripts do not exist yet.

- [ ] **Step 3: Add the editor HTML**

Create `scripts/script-edit/public/index.html` with:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Script Edit Index</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <main id="script-edit-root" class="editor-shell">
      <aside class="item-pane">
        <div class="pane-head">
          <strong>Script Edit Index</strong>
          <button id="reindex-button" type="button">Re-index</button>
        </div>
        <input id="search-input" type="search" aria-label="Search by id, label, or file" />
        <div id="entry-list" class="entry-list"></div>
      </aside>
      <section class="edit-pane">
        <header class="edit-head">
          <div>
            <p id="selected-kind" class="eyebrow">No item</p>
            <h1 id="selected-label">Select an editable item</h1>
            <p id="selected-file"></p>
          </div>
          <button id="verify-button" type="button">Verify</button>
        </header>
        <textarea id="value-editor" spellcheck="false" disabled></textarea>
        <div class="actions">
          <button id="discard-button" type="button" disabled>Discard</button>
          <button id="save-button" type="button" disabled>Save</button>
        </div>
      </section>
      <aside class="context-pane">
        <strong>Context</strong>
        <pre id="context-output"></pre>
      </aside>
    </main>
    <script type="module" src="/app.js"></script>
  </body>
</html>
```

- [ ] **Step 4: Add the editor CSS**

Create `scripts/script-edit/public/styles.css` with:

```css
:root {
  color-scheme: dark;
  font-family: "Noto Sans KR", system-ui, sans-serif;
  background: #101115;
  color: #ece7dc;
}

* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: #101115; }
button, input, textarea { font: inherit; }
button { cursor: pointer; border: 1px solid #5f6f7a; background: #1d2630; color: #f3ead9; padding: 0.45rem 0.7rem; border-radius: 6px; }
button:disabled { cursor: not-allowed; opacity: 0.45; }
.editor-shell { display: grid; grid-template-columns: minmax(260px, 320px) minmax(420px, 1fr) minmax(280px, 360px); height: 100vh; }
.item-pane, .edit-pane, .context-pane { min-width: 0; min-height: 0; border-right: 1px solid #2c3238; }
.item-pane, .context-pane { display: flex; flex-direction: column; padding: 14px; gap: 12px; background: #14181e; }
.edit-pane { display: flex; flex-direction: column; gap: 12px; padding: 16px; background: #101115; }
.pane-head, .edit-head, .actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
#search-input { width: 100%; border: 1px solid #38444d; background: #0f1216; color: #ece7dc; padding: 0.55rem 0.65rem; border-radius: 6px; }
.entry-list { overflow: auto; display: grid; gap: 8px; }
.entry-button { width: 100%; text-align: left; border-color: #303942; background: #171d24; }
.entry-button.is-active { border-color: #b7a36a; background: #24251d; }
.entry-kind, .eyebrow { margin: 0; color: #b7a36a; font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.04em; }
.entry-label { margin-top: 4px; font-weight: 700; }
.entry-file, #selected-file { margin: 4px 0 0; color: #9ba7ae; font-family: Consolas, monospace; font-size: 0.78rem; overflow-wrap: anywhere; }
#selected-label { margin: 2px 0; font-size: 1.25rem; }
#value-editor { flex: 1; min-height: 0; width: 100%; resize: none; border: 1px solid #38444d; border-radius: 8px; background: #0d0f13; color: #f3ead9; padding: 14px; line-height: 1.7; font-family: "Gowun Batang", "Noto Sans KR", serif; }
#context-output { flex: 1; overflow: auto; margin: 0; white-space: pre-wrap; color: #c7d0d4; font-family: Consolas, monospace; font-size: 0.78rem; }
@media (max-width: 960px) {
  .editor-shell { grid-template-columns: 1fr; height: auto; min-height: 100vh; }
  .item-pane, .edit-pane, .context-pane { min-height: 40vh; border-right: 0; border-bottom: 1px solid #2c3238; }
}
```

- [ ] **Step 5: Add the editor client**

Create `scripts/script-edit/public/app.js`. It must:

- read `token` from `window.location.search`,
- load `/api/index?token=...`,
- filter entries by search text,
- load `/api/item?token=...&id=...`,
- save through `POST /api/item?token=...`,
- run re-index through `POST /api/reindex?token=...`,
- run verify through `POST /api/verify?token=...`,
- disable save when no item is selected.

Use this API helper:

```js
async function api(path, options = {}) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("token", token);
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`);
  return data;
}
```

- [ ] **Step 6: Add package scripts**

Modify `package.json` scripts:

```json
"script-edit:index": "node scripts/script-edit/indexGenerator.mjs --write",
"script-edit": "node scripts/script-edit/server.mjs"
```

- [ ] **Step 7: Run verification and build**

Run: `npm.cmd run verify`

Expected: PASS.

Run: `npm.cmd run build`

Expected: PASS.

- [ ] **Step 8: Smoke the local editor**

Run: `npm.cmd run script-edit`

Expected terminal output:

```text
Script editor: http://127.0.0.1:<port>/?token=<token>
```

Open the URL, select `script-pack:special-event-groups:blank-ledger:stage-1:title`, edit the value, save, then discard the test edit by reverting the changed line before committing this task.

- [ ] **Step 9: Commit Task 5**

Run:

```bash
git add package.json scripts/script-edit/public/index.html scripts/script-edit/public/styles.css scripts/script-edit/public/app.js scripts/verify-script-edit.mjs
git commit -m "feat: add script edit ui"
```

---

### Task 6: Handoff, Full Verification, And Publish Decision

**Files:**
- Modify: `docs/pingpong.txt`
- Modify: `docs/work_log.txt`

**Interfaces:**
- Consumes: completed Tasks 1-5.
- Produces: current handoff state and verification evidence.

- [ ] **Step 1: Update handoff notes**

In `docs/pingpong.txt`, replace the local script edit index pending note with:

```text
## 완료: 로컬 스크립트 편집 인덱스 1차 구현

- Understand Anything은 시각화 전용으로 유지한다.
- `.script-edit/config.json`은 편집 허용/잠금 경로를 정의한다.
- `scripts/script-edit/indexGenerator.mjs`가 `scriptManifest.js`와 `specialEventGroups.js` 기준 편집 인덱스를 생성한다.
- `scripts/script-edit/server.mjs`는 `127.0.0.1` token URL로 편집 UI와 API를 제공한다.
- 첫 버전은 특수 사건 본문과 manifest 필드 편집을 대상으로 한다.
- 저장은 allowlist, source hash, source-span locator 검사를 통과해야 한다.
- `.script-edit/index.json`과 backups는 생성물로 Git에 올리지 않는다.
- 확인: `npm.cmd run verify`, `npm.cmd run build`
```

- [ ] **Step 2: Update work log**

Append a short entry to `docs/work_log.txt`:

```text
YYYY-MM-DD HH:mm KST
- 작업: 로컬 스크립트 편집 인덱스 1차 구현으로 편집 정책, 인덱스 생성기, 저장 경로, localhost 편집 UI를 추가했다.
- 구조: 첫 쓰기 대상은 `scriptManifest.js`와 `specialEventGroups.js`이며, 저장은 allowlist와 source hash 검사를 통과한 항목만 허용한다.
- 수정 파일: `.gitignore`, `.script-edit/config.json`, `package.json`, `scripts/script-edit/*`, `scripts/verify-script-edit.mjs`, `scripts/verify-game.mjs`, `docs/pingpong.txt`, `docs/work_log.txt`
- 확인: `npm.cmd run verify`, `npm.cmd run build`
```

- [ ] **Step 3: Run full checks**

Run: `npm.cmd run verify`

Expected: PASS.

Run: `npm.cmd run build`

Expected: PASS.

- [ ] **Step 4: Check status and generated-file hygiene**

Run: `git status --short`

Expected:

- implementation and docs files are shown,
- `.script-edit/index.json` is not shown,
- `.script-edit/backups/` is not shown.

- [ ] **Step 5: Commit Task 6**

Run:

```bash
git add docs/pingpong.txt docs/work_log.txt
git commit -m "docs: record script edit implementation"
```

- [ ] **Step 6: Finish branch**

If all tasks were committed on a feature branch, push the branch and open a draft PR. If the user explicitly wants direct `main`, push only after confirming that the branch is `main` and `git status -sb` is clean.

---

## Self-Review Notes

- Spec coverage: the plan covers read-only Understand Anything separation, allowlist/deny policy, generated index, localhost token server, save-to-source behavior, re-index after save, backups, and verify/build evidence.
- Scope: this plan implements the first editor version for `scriptManifest.js` and `specialEventGroups.js`; broader data modules are intentionally left for a separate expansion after the write path is proven.
- Dependency check: no new package is introduced.
- Verification check: `npm.cmd run verify` remains the primary command and imports `scripts/verify-script-edit.mjs`.
