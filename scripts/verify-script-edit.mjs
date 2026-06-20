import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_SCRIPT_EDIT_CONFIG,
  assertScriptEditPathAllowed,
  ensureScriptEditConfig,
  getScriptEditIndexPath,
  isScriptEditPathAllowed,
  loadScriptEditConfig,
  matchesPattern,
  normalizeProjectPath,
} from "./script-edit/pathPolicy.mjs";
import { applyScriptEdit, getEditableItem } from "./script-edit/editorStore.mjs";
import { buildScriptEditIndex, writeScriptEditIndex } from "./script-edit/indexGenerator.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

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
    verify: ["npm.cmd run verify"],
  }, null, 2), "utf8");
  assert.equal(loadScriptEditConfig(tempRoot).allow.length, 1);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

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
    value: "",
  });
  writeFileSync(join(tempEditRoot, ".script-edit", "index.json"), JSON.stringify(denied, null, 2), "utf8");
  await assert.rejects(() => applyScriptEdit(tempEditRoot, { id: "denied:app", value: "no" }), /not editable/);
} finally {
  rmSync(tempEditRoot, { recursive: true, force: true });
}

console.log("Script edit verification passed.");
