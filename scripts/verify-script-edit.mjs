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
import { createScriptEditServer } from "./script-edit/server.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

assert.equal(DEFAULT_SCRIPT_EDIT_CONFIG.allow.includes("src/data/scriptPacks/*.js"), true);
assert.equal(DEFAULT_SCRIPT_EDIT_CONFIG.allow.includes("src/data/tutorialContent.js"), true);
assert.equal(DEFAULT_SCRIPT_EDIT_CONFIG.allow.includes("src/data/rosenthalScriptContent.js"), true);
assert.equal(DEFAULT_SCRIPT_EDIT_CONFIG.allow.includes("src/data/systemContent.js"), true);
assert.equal(DEFAULT_SCRIPT_EDIT_CONFIG.allow.includes("src/data/rosenthalContent.js"), false);
assert.equal(DEFAULT_SCRIPT_EDIT_CONFIG.allow.includes("src/rules/systemRules.js"), false);
assert.equal(DEFAULT_SCRIPT_EDIT_CONFIG.allow.includes("src/rules/tutorialRules.js"), false);
assert.equal(normalizeProjectPath(repoRoot, "src/data/scriptManifest.js"), "src/data/scriptManifest.js");
assert.throws(() => normalizeProjectPath(repoRoot, "../package.json"), /inside the project/);
assert.throws(() => normalizeProjectPath(repoRoot, "C:/outside/file.js"), /Absolute paths/);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/data/scriptPacks/specialEventGroups.js"), true);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/data/scriptManifest.js"), true);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/data/rosenthalScriptContent.js"), true);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/data/rosenthalContent.js"), false);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/data/tutorialContent.js"), true);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/data/systemContent.js"), true);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/App.jsx"), false);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/engine/scriptLoader.js"), false);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/rules/systemRules.js"), false);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/rules/tutorialRules.js"), false);
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
assert.equal(ids.has("rosenthal:day-action:fields:title"), true);
assert.equal(ids.has("rosenthal:day-action:fields:result"), true);
assert.equal(ids.has("rosenthal:prologue:line-1"), true);
assert.equal(ids.has("rosenthal:night-opening:line-1"), true);
assert.equal(ids.has("tutorial:prologue:text:line-1"), false);
assert.equal(ids.has("tutorial:night-entry:1:text"), false);
assert.equal(ids.has("tutorial:day-action:documents:title"), true);
assert.equal(ids.has("tutorial:day-action:documents:weight"), true);
assert.equal(ids.has("tutorial:night-choice:knight:result"), true);
assert.equal(ids.has("tutorial:forfeit:day"), true);
assert.equal(ids.has("rules:mark-loadout-limit"), true);
assert.equal(ids.has("rules:mark-branch-unlock:purification-hint:condition:stigma"), true);
assert.equal(ids.has("rules:passive:careful-stockpile:description"), true);
assert.equal(ids.has("rules:hidden-run-rule:flaw:1"), true);
const blankText = index.entries.find((entry) => entry.id === "script-pack:special-event-groups:blank-ledger:stage-1:text");
assert.equal(blankText.kind, "dialogue");
assert.equal(blankText.sourceFile, "src/data/scriptPacks/specialEventGroups.js");
assert.deepEqual(blankText.folderPath.slice(-1), ["Stage 1"]);
assert.equal(blankText.locator.type, "source-span");
assert.equal(Number.isInteger(blankText.locator.start), true);
assert.equal(Number.isInteger(blankText.locator.end), true);
assert.equal(blankText.value, "새 장부 앞 일곱 장은 날짜만 남아 있다.");
const rosenthalPrologueLine = index.entries.find((entry) => entry.id === "rosenthal:prologue:line-1");
assert.deepEqual(rosenthalPrologueLine.folderPath, ["Rosenthal Prologue"]);
assert.equal(rosenthalPrologueLine.sourceFile, "src/data/rosenthalScriptContent.js");
assert.equal(index.entries.find((entry) => entry.id === "rosenthal:night-opening:line-1").sourceFile, "src/data/rosenthalScriptContent.js");
assert.equal(index.entries.find((entry) => entry.id === "rosenthal:day-action:fields:title").sourceFile, "src/data/rosenthalScriptContent.js");
const tutorialWeight = index.entries.find((entry) => entry.id === "tutorial:day-action:documents:weight");
assert.equal(tutorialWeight.kind, "number");
assert.equal(tutorialWeight.sourceFile, "src/data/tutorialContent.js");
assert.equal(tutorialWeight.valueType, "number");
assert.equal(tutorialWeight.value, 8);
const ruleThreshold = index.entries.find((entry) => entry.id === "rules:mark-branch-unlock:purification-hint:condition:stigma");
assert.equal(ruleThreshold.sourceFile, "src/data/systemContent.js");
assert.equal(ruleThreshold.valueType, "number");
assert.equal(ruleThreshold.value, 3);
const duplicateEditableValues = new Map();
for (const entry of index.entries) {
  if (typeof entry.value !== "string") continue;
  const value = entry.value.trim();
  if (value.length < 6) continue;
  if (!duplicateEditableValues.has(value)) duplicateEditableValues.set(value, []);
  duplicateEditableValues.get(value).push(entry);
}
const allowedCrossFileDuplicateValues = new Set(["다른 이름의 축복"]);
const unexpectedCrossFileDuplicateValues = [...duplicateEditableValues.entries()]
  .filter(([value, entries]) => new Set(entries.map((entry) => entry.sourceFile)).size > 1)
  .filter(([value]) => !allowedCrossFileDuplicateValues.has(value))
  .map(([value, entries]) => ({ value, ids: entries.map((entry) => entry.id) }));
assert.deepEqual(unexpectedCrossFileDuplicateValues, []);
const writtenIndex = await writeScriptEditIndex(repoRoot);
assert.equal(writtenIndex.entries.length, index.entries.length);
assert.equal(existsSync(getScriptEditIndexPath(repoRoot)), true);
assert.equal(JSON.parse(readFileSync(getScriptEditIndexPath(repoRoot), "utf8")).entries.length, index.entries.length);
await import("./understand-anything/generate-knowledge-graph.mjs");

const tempEditRoot = mkdtempSync(join(tmpdir(), "script-edit-save-"));
try {
  mkdirSync(join(tempEditRoot, "src", "data", "scriptPacks"), { recursive: true });
  mkdirSync(join(tempEditRoot, "src", "data"), { recursive: true });
  mkdirSync(join(tempEditRoot, "src", "rules"), { recursive: true });
  mkdirSync(join(tempEditRoot, ".script-edit"), { recursive: true });
  copyFileSync(join(repoRoot, "src", "data", "scriptManifest.js"), join(tempEditRoot, "src", "data", "scriptManifest.js"));
  copyFileSync(join(repoRoot, "src", "data", "scriptPacks", "specialEventGroups.js"), join(tempEditRoot, "src", "data", "scriptPacks", "specialEventGroups.js"));
  copyFileSync(join(repoRoot, "src", "data", "rosenthalScriptContent.js"), join(tempEditRoot, "src", "data", "rosenthalScriptContent.js"));
  copyFileSync(join(repoRoot, "src", "data", "tutorialContent.js"), join(tempEditRoot, "src", "data", "tutorialContent.js"));
  copyFileSync(join(repoRoot, "src", "data", "systemContent.js"), join(tempEditRoot, "src", "data", "systemContent.js"));
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

const serverTestRoot = mkdtempSync(join(tmpdir(), "script-edit-server-"));
try {
  mkdirSync(join(serverTestRoot, "src", "data", "scriptPacks"), { recursive: true });
  mkdirSync(join(serverTestRoot, "src", "data"), { recursive: true });
  mkdirSync(join(serverTestRoot, "src", "rules"), { recursive: true });
  mkdirSync(join(serverTestRoot, ".script-edit"), { recursive: true });
  copyFileSync(join(repoRoot, "src", "data", "scriptManifest.js"), join(serverTestRoot, "src", "data", "scriptManifest.js"));
  copyFileSync(join(repoRoot, "src", "data", "scriptPacks", "specialEventGroups.js"), join(serverTestRoot, "src", "data", "scriptPacks", "specialEventGroups.js"));
  copyFileSync(join(repoRoot, "src", "data", "rosenthalScriptContent.js"), join(serverTestRoot, "src", "data", "rosenthalScriptContent.js"));
  copyFileSync(join(repoRoot, "src", "data", "tutorialContent.js"), join(serverTestRoot, "src", "data", "tutorialContent.js"));
  copyFileSync(join(repoRoot, "src", "data", "systemContent.js"), join(serverTestRoot, "src", "data", "systemContent.js"));
  writeFileSync(join(serverTestRoot, ".script-edit", "config.json"), JSON.stringify({
    ...DEFAULT_SCRIPT_EDIT_CONFIG,
    verify: ["node -e \"process.exit(0)\""],
  }, null, 2), "utf8");
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
  const staticCssResponse = await fetch(`${base}/styles.css`);
  assert.equal(staticCssResponse.status, 200);
  assert.equal(staticCssResponse.headers.get("cache-control"), "no-store");
  const itemResponse = await fetch(`${base}/api/item?token=test-token&id=${encodeURIComponent("script-pack:special-event-groups:blank-ledger:stage-1:title")}`);
  assert.equal(itemResponse.status, 200);
  assert.equal((await itemResponse.json()).value, "비어 있는 첫 장");
  const saveResponse = await fetch(`${base}/api/item?token=test-token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "script-pack:special-event-groups:blank-ledger:stage-1:title", value: "서버 저장 테스트" }),
  });
  assert.equal(saveResponse.status, 200);
  assert.equal((await saveResponse.json()).changedFile, "src/data/scriptPacks/specialEventGroups.js");
  const missing = await fetch(`${base}/api/item?token=test-token&id=missing`);
  assert.equal(missing.status, 404);
  const verifyResponse = await fetch(`${base}/api/verify?token=test-token`, { method: "POST" });
  assert.equal(verifyResponse.status, 200);
  const verifyBody = await verifyResponse.json();
  assert.equal(verifyBody.results.length, 1);
  assert.equal(verifyBody.results[0].ok, true);
  await server.close();
} finally {
  rmSync(serverTestRoot, { recursive: true, force: true });
}

const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
const rosenthalContentSource = readFileSync(join(repoRoot, "src", "data", "rosenthalContent.js"), "utf8");
const rosenthalScriptContentSource = readFileSync(join(repoRoot, "src", "data", "rosenthalScriptContent.js"), "utf8");
const tutorialContentSource = readFileSync(join(repoRoot, "src", "data", "tutorialContent.js"), "utf8");
const systemContentSource = readFileSync(join(repoRoot, "src", "data", "systemContent.js"), "utf8");
const systemRulesSource = readFileSync(join(repoRoot, "src", "rules", "systemRules.js"), "utf8");
assert.equal(existsSync(join(repoRoot, "src", "rules", "tutorialRules.js")), false);
assert.equal(rosenthalScriptContentSource.includes("export const DAY_ACTIONS"), true);
assert.equal(rosenthalScriptContentSource.includes("export const PROLOGUE"), true);
assert.equal(rosenthalContentSource.includes("./rosenthalScriptContent.js"), true);
assert.equal(rosenthalContentSource.includes("export const DAY_ACTIONS = ["), false);
assert.equal(tutorialContentSource.includes("PROLOGUE as ROSENTHAL_PROLOGUE"), true);
assert.equal(tutorialContentSource.includes("NIGHT_OPENING as ROSENTHAL_NIGHT_OPENING"), true);
assert.equal(tutorialContentSource.includes("text: ROSENTHAL_PROLOGUE"), true);
assert.equal(tutorialContentSource.includes("text: ROSENTHAL_NIGHT_OPENING[0]"), true);
assert.equal(systemContentSource.includes("export const RESOURCE_META"), true);
assert.equal(systemContentSource.includes("export const AFFINITY_MARK_GROUPS"), true);
assert.equal(systemContentSource.includes("export const HIDDEN_RUN_RULES"), true);
assert.equal(systemRulesSource.includes("../data/systemContent.js"), true);
assert.equal(systemRulesSource.includes("export const RESOURCE_META"), false);
assert.equal(systemRulesSource.includes("export const AFFINITY_MARK_GROUPS"), false);
assert.equal(systemRulesSource.includes("export const HIDDEN_RUN_RULES"), false);
assert.equal(packageJson.scripts["script-edit:index"], "node scripts/script-edit/indexGenerator.mjs --write");
assert.equal(packageJson.scripts["script-edit"], "node scripts/script-edit/server.mjs");
assert.equal(packageJson.scripts["understand:graph"], "npm run script-edit:index && node scripts/understand-anything/generate-knowledge-graph.mjs");
const graphJson = JSON.parse(readFileSync(join(repoRoot, ".understand-anything", "knowledge-graph.json"), "utf8"));
assert.equal(graphJson.nodes.some((node) => node.id === "file:src/data/scriptManifest.js"), true);
assert.equal(graphJson.nodes.some((node) => node.id === "file:src/engine/scriptLoader.js"), true);
assert.equal(graphJson.nodes.some((node) => node.scriptEdit?.id === "script-pack:special-event-groups:blank-ledger:stage-1:text"), true);
assert.equal(graphJson.nodes.some((node) => node.scriptEdit?.folderPath?.includes("Stage 1")), true);
assert.equal(graphJson.layers.some((layer) => layer.id === "layer:editable-index"), true);
const editorHtml = readFileSync(join(repoRoot, "scripts", "script-edit", "public", "index.html"), "utf8");
const editorJs = readFileSync(join(repoRoot, "scripts", "script-edit", "public", "app.js"), "utf8");
const editorCss = readFileSync(join(repoRoot, "scripts", "script-edit", "public", "styles.css"), "utf8");
const editorUiVerify = readFileSync(join(repoRoot, "scripts", "verify-script-edit-ui.cjs"), "utf8");
assert.equal(packageJson.scripts["script-edit:verify-ui"], "electron scripts/verify-script-edit-ui.cjs");
assert.equal(editorHtml.includes("script-edit-root"), true);
assert.equal(editorHtml.includes("/styles.css?v=folder-scroll"), true);
assert.equal(editorHtml.includes("/app.js?v=folder-scroll"), true);
assert.equal(editorHtml.includes("entry-count"), true);
assert.equal(editorHtml.includes("kind-filter"), true);
assert.equal(editorHtml.includes("file-filter"), true);
assert.equal(editorHtml.includes("entry-list-shell"), true);
assert.equal(editorHtml.includes("entry-scrollbar"), true);
assert.equal(editorHtml.includes("entry-scrollbar-thumb"), true);
assert.equal(editorJs.includes("/api/index"), true);
assert.equal(editorJs.includes("/api/item"), true);
assert.equal(editorJs.includes("/api/reindex"), true);
assert.equal(editorJs.includes("/api/verify"), true);
assert.equal(editorJs.includes("formatEntryPreview"), true);
assert.equal(editorJs.includes("entry.value"), true);
assert.equal(editorJs.includes("entry.folderPath"), true);
assert.equal(editorJs.includes("entry-count"), true);
assert.equal(editorJs.includes("groupEntriesByFolder"), true);
assert.equal(editorJs.includes("folderSegmentsForEntry"), true);
assert.equal(editorJs.includes("refreshIndex({ preserveScroll: true, scrollTop })"), true);
assert.equal(editorJs.includes("entry-folder"), true);
assert.equal(editorJs.includes("updateActiveEntry"), true);
assert.equal(editorJs.includes("Do not rebuild the 1000+ item list on selection"), true);
assert.equal(editorJs.includes("updateEntryScrollbar"), true);
assert.equal(editorJs.includes("entryList.addEventListener(\"scroll\""), true);
assert.equal(editorJs.includes("Native scrollbars can disappear under OS overlay settings"), true);
const setSelectedBody = editorJs.match(/function setSelected\(item\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
assert.equal(setSelectedBody.includes("renderEntries("), false);
assert.equal(setSelectedBody.includes("updateActiveEntry"), true);
assert.equal(editorCss.includes(".editor-shell"), true);
assert.equal(editorCss.includes(".entry-list-shell"), true);
assert.equal(editorCss.includes(".entry-scrollbar"), true);
assert.equal(editorCss.includes(".entry-scrollbar-thumb"), true);
assert.equal(editorCss.includes(".entry-folder[data-depth=\"1\"]"), true);
assert.equal(editorCss.includes("flex-direction: column"), true);
assert.match(editorCss, /\.entry-list\s*\{[\s\S]*?flex:\s*1;[\s\S]*?min-height:\s*0;/);
assert.match(editorCss, /\.entry-list\s*\{[\s\S]*?display:\s*flex;/);
assert.match(editorCss, /\.entry-list\s*\{[\s\S]*?flex-direction:\s*column;/);
assert.match(editorCss, /\.entry-list\s*\{[\s\S]*?overflow-y:\s*scroll;/);
assert.match(editorCss, /\.entry-list\s*\{[\s\S]*?scrollbar-width:\s*none;/);
assert.equal(editorCss.includes(".entry-list::-webkit-scrollbar"), true);
assert.match(editorCss, /\.entry-list::-webkit-scrollbar\s*\{[\s\S]*?width:\s*0;/);
assert.match(editorCss, /\.entry-list::-webkit-scrollbar\s*\{[\s\S]*?height:\s*0;/);
assert.equal(editorCss.includes("Hide the native scrollbar"), true);
assert.match(editorCss, /\.entry-folder\s*\{[\s\S]*?flex-shrink:\s*0;/);
assert.equal(editorCss.includes("Do not use CSS grid for the folder list"), true);
assert.equal(editorCss.includes(".entry-value"), true);
assert.equal(editorCss.includes(".entry-folder"), true);
assert.equal(editorCss.includes(".folder-summary"), true);
assert.equal(editorUiVerify.includes("sendInputEvent"), true);
assert.equal(editorUiVerify.includes("Nested script edit folders were not rendered"), true);
assert.equal(editorUiVerify.includes("Selecting entry changed scrollTop"), true);
assert.equal(editorUiVerify.includes("Rail click did not move entry list scrollTop"), true);
assert.equal(editorUiVerify.includes("Rail drag did not move entry list scrollTop farther"), true);

console.log("Script edit verification passed.");
