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
import {
  applyScriptDelete,
  applyScriptEdit,
  applyScriptInsert,
  applyScriptMove,
  getEditableItem,
} from "./script-edit/editorStore.mjs";
import { buildScriptEditIndex, writeScriptEditIndex } from "./script-edit/indexGenerator.mjs";
import { createScriptEditServer } from "./script-edit/server.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const ROSENTHAL_EDIT_SOURCE_FILES = [
  "src/data/rosenthal/dayContent.js",
  "src/data/rosenthal/characterContent.js",
  "src/data/rosenthal/explorationContent.js",
  "src/data/rosenthal/finaleContent.js",
  "src/data/rosenthal/introContent.js",
];
const TUTORIAL_EDIT_SOURCE_FILES = [
  "src/data/tutorial/introContent.js",
  "src/data/tutorial/dayActionContent.js",
  "src/data/tutorial/nightChoiceContent.js",
  "src/data/tutorial/endingContent.js",
];
const SYSTEM_EDIT_SOURCE_FILES = [
  "src/data/system/metaContent.js",
  "src/data/system/roleContent.js",
  "src/data/system/markUnlockContent.js",
  "src/data/system/affinityMarkContent.js",
  "src/data/system/standaloneMarkContent.js",
  "src/data/system/hiddenRuleContent.js",
];

assert.equal(DEFAULT_SCRIPT_EDIT_CONFIG.allow.includes("src/data/scriptPacks/*.js"), true);
assert.equal(DEFAULT_SCRIPT_EDIT_CONFIG.allow.includes("src/data/rosenthal/*.js"), true);
assert.equal(DEFAULT_SCRIPT_EDIT_CONFIG.allow.includes("src/data/tutorial/*.js"), true);
assert.equal(DEFAULT_SCRIPT_EDIT_CONFIG.allow.includes("src/data/system/*.js"), true);
assert.equal(DEFAULT_SCRIPT_EDIT_CONFIG.allow.includes("src/data/rosenthalContent.js"), false);
assert.equal(DEFAULT_SCRIPT_EDIT_CONFIG.allow.includes("src/data/rosenthalScriptContent.js"), false);
assert.equal(DEFAULT_SCRIPT_EDIT_CONFIG.allow.includes("src/data/tutorialContent.js"), false);
assert.equal(DEFAULT_SCRIPT_EDIT_CONFIG.allow.includes("src/data/systemContent.js"), false);
assert.equal(DEFAULT_SCRIPT_EDIT_CONFIG.allow.includes("src/rules/systemRules.js"), false);
assert.equal(DEFAULT_SCRIPT_EDIT_CONFIG.allow.includes("src/rules/tutorialRules.js"), false);
assert.equal(normalizeProjectPath(repoRoot, "src/data/scriptManifest.js"), "src/data/scriptManifest.js");
assert.throws(() => normalizeProjectPath(repoRoot, "../package.json"), /inside the project/);
assert.throws(() => normalizeProjectPath(repoRoot, "C:/outside/file.js"), /Absolute paths/);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/data/scriptPacks/specialEventGroups.js"), true);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/data/scriptManifest.js"), true);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/data/rosenthal/dayContent.js"), true);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/data/rosenthal/introContent.js"), true);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/data/rosenthalContent.js"), false);
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/data/rosenthalScriptContent.js"), false);
for (const sourceFile of TUTORIAL_EDIT_SOURCE_FILES) {
  assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, sourceFile), true);
}
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/data/tutorialContent.js"), false);
for (const sourceFile of SYSTEM_EDIT_SOURCE_FILES) {
  assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, sourceFile), true);
}
assert.equal(isScriptEditPathAllowed(DEFAULT_SCRIPT_EDIT_CONFIG, "src/data/systemContent.js"), false);
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
assert.equal(ids.has("tutorial:day-opening:1:speaker"), true);
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
assert.equal(rosenthalPrologueLine.sourceFile, "src/data/rosenthal/introContent.js");
assert.equal(index.entries.find((entry) => entry.id === "rosenthal:night-opening:line-1").sourceFile, "src/data/rosenthal/introContent.js");
assert.equal(index.entries.find((entry) => entry.id === "rosenthal:day-eight:normal:line-1").sourceFile, "src/data/rosenthal/introContent.js");
assert.equal(index.entries.find((entry) => entry.id === "rosenthal:day-action:fields:title").sourceFile, "src/data/rosenthal/dayContent.js");
assert.equal(index.entries.find((entry) => entry.id === "rosenthal:core-npc:maid:name").sourceFile, "src/data/rosenthal/characterContent.js");
assert.equal(index.entries.find((entry) => entry.id === "rosenthal:event-title:stairs:1").sourceFile, "src/data/rosenthal/explorationContent.js");
assert.equal(index.entries.find((entry) => entry.id === "rosenthal:finale:stair-hound:title").sourceFile, "src/data/rosenthal/finaleContent.js");
assert.equal(index.entries.some((entry) => entry.id.startsWith("rosenthal:") && entry.sourceFile === "src/data/rosenthalScriptContent.js"), false);
const tutorialWeight = index.entries.find((entry) => entry.id === "tutorial:day-action:documents:weight");
assert.equal(tutorialWeight.kind, "number");
assert.equal(tutorialWeight.sourceFile, "src/data/tutorial/dayActionContent.js");
assert.equal(tutorialWeight.valueType, "number");
assert.equal(tutorialWeight.value, 8);
assert.equal(index.entries.find((entry) => entry.id === "tutorial:day-opening:1:text").sourceFile, "src/data/tutorial/introContent.js");
const tutorialDayOpeningOne = index.entries.find((entry) => entry.id === "tutorial:day-opening:1:text");
assert.equal(tutorialDayOpeningOne.insert?.type, "object-array-item");
assert.equal(tutorialDayOpeningOne.insert?.defaults?.speaker, "npc:scribe");
assert.equal(tutorialDayOpeningOne.insert?.fields?.some((field) => field.name === "speaker"), true);
assert.equal(tutorialDayOpeningOne.insert?.fields?.some((field) => field.name === "text"), true);
assert.equal(tutorialDayOpeningOne.item?.type, "object-array-item");
assert.equal(Number.isInteger(tutorialDayOpeningOne.item?.range?.start), true);
assert.equal(Number.isInteger(tutorialDayOpeningOne.item?.range?.end), true);
assert.equal(tutorialDayOpeningOne.item?.previous, null);
assert.notEqual(tutorialDayOpeningOne.item?.next, null);
const tutorialDayOpeningSpeakerOne = index.entries.find((entry) => entry.id === "tutorial:day-opening:1:speaker");
assert.equal(tutorialDayOpeningSpeakerOne.kind, "speaker");
assert.equal(tutorialDayOpeningSpeakerOne.sourceFile, "src/data/tutorial/introContent.js");
assert.equal(tutorialDayOpeningSpeakerOne.value, "npc:scribe");
assert.equal(tutorialDayOpeningSpeakerOne.insert, undefined);
assert.equal(tutorialDayOpeningSpeakerOne.item?.type, "object-array-item");
const tutorialDayOpeningTwo = index.entries.find((entry) => entry.id === "tutorial:day-opening:2:text");
assert.notEqual(tutorialDayOpeningTwo.item?.previous, null);
assert.equal(index.entries.find((entry) => entry.id === "tutorial:day-interlude:1:paragraph:line-1").sourceFile, "src/data/tutorial/introContent.js");
const tutorialInterludeLineOne = index.entries.find((entry) => entry.id === "tutorial:day-interlude:1:paragraph:line-1");
assert.equal(tutorialInterludeLineOne.insert?.type, "string-array-item");
assert.equal(tutorialInterludeLineOne.insert?.fields?.some((field) => field.name === "text"), true);
assert.equal(tutorialInterludeLineOne.insert?.fields?.some((field) => field.name === "speaker"), false);
assert.equal(tutorialInterludeLineOne.item?.type, "string-array-item");
assert.equal(tutorialInterludeLineOne.item?.previous, null);
assert.notEqual(tutorialInterludeLineOne.item?.next, null);
assert.equal(index.entries.find((entry) => entry.id === "tutorial:night-choice:knight:result").sourceFile, "src/data/tutorial/nightChoiceContent.js");
assert.equal(index.entries.find((entry) => entry.id === "tutorial:ending:peacefulLord:title").sourceFile, "src/data/tutorial/endingContent.js");
assert.equal(index.entries.find((entry) => entry.id === "tutorial:worker-name-choice:remember-worker:title").sourceFile, "src/data/tutorial/endingContent.js");
assert.equal(index.entries.find((entry) => entry.id === "tutorial:forfeit:day").sourceFile, "src/data/tutorial/endingContent.js");
assert.equal(index.entries.some((entry) => entry.id.startsWith("tutorial:") && entry.sourceFile === "src/data/tutorialContent.js"), false);
const ruleThreshold = index.entries.find((entry) => entry.id === "rules:mark-branch-unlock:purification-hint:condition:stigma");
assert.equal(index.entries.find((entry) => entry.id === "rules:resource-meta:food:label").sourceFile, "src/data/system/metaContent.js");
assert.equal(index.entries.find((entry) => entry.id === "rules:job:steward:name").sourceFile, "src/data/system/roleContent.js");
assert.equal(index.entries.find((entry) => entry.id === "rules:title:accepted-lord:description").sourceFile, "src/data/system/roleContent.js");
assert.equal(index.entries.find((entry) => entry.id === "rules:passive:careful-stockpile:description").sourceFile, "src/data/system/roleContent.js");
assert.equal(index.entries.find((entry) => entry.id === "rules:mark-loadout-limit").sourceFile, "src/data/system/markUnlockContent.js");
assert.equal(ruleThreshold.sourceFile, "src/data/system/markUnlockContent.js");
assert.equal(ruleThreshold.valueType, "number");
assert.equal(ruleThreshold.value, 3);
assert.equal(index.entries.find((entry) => entry.id === "rules:affinity-mark-group:life:capstone-count").sourceFile, "src/data/system/affinityMarkContent.js");
assert.equal(index.entries.find((entry) => entry.id === "rules:affinity-mark:life:stigma:1:name").sourceFile, "src/data/system/affinityMarkContent.js");
assert.equal(index.entries.find((entry) => entry.id === "rules:standalone-mark:stigma-standalone-first-bell:codexText").sourceFile, "src/data/system/standaloneMarkContent.js");
assert.equal(index.entries.find((entry) => entry.id === "rules:hidden-run-rule:flaw:1").sourceFile, "src/data/system/hiddenRuleContent.js");
assert.equal(index.entries.some((entry) => entry.id.startsWith("rules:") && entry.sourceFile === "src/data/systemContent.js"), false);
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
  mkdirSync(join(tempEditRoot, "src", "data", "rosenthal"), { recursive: true });
  mkdirSync(join(tempEditRoot, "src", "data", "tutorial"), { recursive: true });
  mkdirSync(join(tempEditRoot, "src", "data", "system"), { recursive: true });
  mkdirSync(join(tempEditRoot, "src", "data"), { recursive: true });
  mkdirSync(join(tempEditRoot, "src", "rules"), { recursive: true });
  mkdirSync(join(tempEditRoot, ".script-edit"), { recursive: true });
  copyFileSync(join(repoRoot, "src", "data", "scriptManifest.js"), join(tempEditRoot, "src", "data", "scriptManifest.js"));
  copyFileSync(join(repoRoot, "src", "data", "scriptPacks", "specialEventGroups.js"), join(tempEditRoot, "src", "data", "scriptPacks", "specialEventGroups.js"));
  for (const sourceFile of ROSENTHAL_EDIT_SOURCE_FILES) {
    copyFileSync(join(repoRoot, ...sourceFile.split("/")), join(tempEditRoot, ...sourceFile.split("/")));
  }
  for (const sourceFile of TUTORIAL_EDIT_SOURCE_FILES) {
    copyFileSync(join(repoRoot, ...sourceFile.split("/")), join(tempEditRoot, ...sourceFile.split("/")));
  }
  for (const sourceFile of SYSTEM_EDIT_SOURCE_FILES) {
    copyFileSync(join(repoRoot, ...sourceFile.split("/")), join(tempEditRoot, ...sourceFile.split("/")));
  }
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
  const insertResult = await applyScriptInsert(tempEditRoot, {
    id: "tutorial:day-opening:1:text",
    direction: "after",
    fields: { speaker: "narration", text: "테스트용 추가 튜토리얼 대사" },
  });
  assert.equal(insertResult.changedFile, "src/data/tutorial/introContent.js");
  assert.equal(insertResult.reindexed, true);
  const introAfterInsert = readFileSync(join(tempEditRoot, "src", "data", "tutorial", "introContent.js"), "utf8");
  assert.equal(introAfterInsert.includes('speaker: "narration"'), true);
  assert.equal(introAfterInsert.includes('text: "테스트용 추가 튜토리얼 대사"'), true);
  assert.equal(getEditableItem(tempEditRoot, "tutorial:day-opening:2:speaker").value, "narration");
  assert.equal(getEditableItem(tempEditRoot, "tutorial:day-opening:2:text").value, "테스트용 추가 튜토리얼 대사");
  const moveResult = await applyScriptMove(tempEditRoot, {
    id: "tutorial:day-opening:2:text",
    direction: "up",
  });
  assert.equal(moveResult.changedFile, "src/data/tutorial/introContent.js");
  assert.equal(getEditableItem(tempEditRoot, "tutorial:day-opening:1:speaker").value, "narration");
  assert.equal(getEditableItem(tempEditRoot, "tutorial:day-opening:1:text").value, "테스트용 추가 튜토리얼 대사");
  const deleteResult = await applyScriptDelete(tempEditRoot, { id: "tutorial:day-opening:1:text" });
  assert.equal(deleteResult.changedFile, "src/data/tutorial/introContent.js");
  assert.equal(getEditableItem(tempEditRoot, "tutorial:day-opening:1:speaker").value, "npc:scribe");
  assert.equal(getEditableItem(tempEditRoot, "tutorial:day-opening:1:text").value, "오늘 처리하실 일을 정리했습니다. 처음 보시는 항목부터 설명드리겠습니다.");
  const stringInsertResult = await applyScriptInsert(tempEditRoot, {
    id: "tutorial:day-interlude:1:paragraph:line-1",
    direction: "after",
    fields: { text: "테스트용 추가 인터루드 문단" },
  });
  assert.equal(stringInsertResult.changedFile, "src/data/tutorial/introContent.js");
  assert.equal(getEditableItem(tempEditRoot, "tutorial:day-interlude:1:paragraph:line-2").value, "테스트용 추가 인터루드 문단");
  const stringMoveResult = await applyScriptMove(tempEditRoot, {
    id: "tutorial:day-interlude:1:paragraph:line-2",
    direction: "up",
  });
  assert.equal(stringMoveResult.changedFile, "src/data/tutorial/introContent.js");
  assert.equal(getEditableItem(tempEditRoot, "tutorial:day-interlude:1:paragraph:line-1").value, "테스트용 추가 인터루드 문단");
  await applyScriptDelete(tempEditRoot, { id: "tutorial:day-interlude:1:paragraph:line-1" });
  assert.equal(getEditableItem(tempEditRoot, "tutorial:day-interlude:1:paragraph:line-1").value, "당신은 선택을 해야 한다. 그 뒤에 무엇이 기다리고 있을지는 아무도 알려주지 않는다.");
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
  mkdirSync(join(serverTestRoot, "src", "data", "rosenthal"), { recursive: true });
  mkdirSync(join(serverTestRoot, "src", "data", "tutorial"), { recursive: true });
  mkdirSync(join(serverTestRoot, "src", "data", "system"), { recursive: true });
  mkdirSync(join(serverTestRoot, "src", "data"), { recursive: true });
  mkdirSync(join(serverTestRoot, "src", "rules"), { recursive: true });
  mkdirSync(join(serverTestRoot, ".script-edit"), { recursive: true });
  copyFileSync(join(repoRoot, "src", "data", "scriptManifest.js"), join(serverTestRoot, "src", "data", "scriptManifest.js"));
  copyFileSync(join(repoRoot, "src", "data", "scriptPacks", "specialEventGroups.js"), join(serverTestRoot, "src", "data", "scriptPacks", "specialEventGroups.js"));
  for (const sourceFile of ROSENTHAL_EDIT_SOURCE_FILES) {
    copyFileSync(join(repoRoot, ...sourceFile.split("/")), join(serverTestRoot, ...sourceFile.split("/")));
  }
  for (const sourceFile of TUTORIAL_EDIT_SOURCE_FILES) {
    copyFileSync(join(repoRoot, ...sourceFile.split("/")), join(serverTestRoot, ...sourceFile.split("/")));
  }
  for (const sourceFile of SYSTEM_EDIT_SOURCE_FILES) {
    copyFileSync(join(repoRoot, ...sourceFile.split("/")), join(serverTestRoot, ...sourceFile.split("/")));
  }
  writeFileSync(join(serverTestRoot, ".script-edit", "config.json"), JSON.stringify({
    ...DEFAULT_SCRIPT_EDIT_CONFIG,
    verify: ["node -e \"process.exit(0)\""],
  }, null, 2), "utf8");
  await writeScriptEditIndex(serverTestRoot);
  assert.equal(createScriptEditServer({ projectRoot: serverTestRoot, port: 0 }).token, "understand-edit");
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
  const insertResponse = await fetch(`${base}/api/insert?token=test-token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: "tutorial:day-opening:1:text",
      direction: "after",
      fields: { speaker: "narration", text: "서버 추가 튜토리얼 대사" },
    }),
  });
  assert.equal(insertResponse.status, 200);
  assert.equal((await insertResponse.json()).changedFile, "src/data/tutorial/introContent.js");
  assert.equal(getEditableItem(serverTestRoot, "tutorial:day-opening:2:speaker").value, "narration");
  assert.equal(getEditableItem(serverTestRoot, "tutorial:day-opening:2:text").value, "서버 추가 튜토리얼 대사");
  const moveResponse = await fetch(`${base}/api/move?token=test-token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "tutorial:day-opening:2:text", direction: "up" }),
  });
  assert.equal(moveResponse.status, 200);
  assert.equal(getEditableItem(serverTestRoot, "tutorial:day-opening:1:text").value, "서버 추가 튜토리얼 대사");
  const deleteResponse = await fetch(`${base}/api/delete?token=test-token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "tutorial:day-opening:1:text" }),
  });
  assert.equal(deleteResponse.status, 200);
  assert.equal(getEditableItem(serverTestRoot, "tutorial:day-opening:1:text").value, "오늘 처리하실 일을 정리했습니다. 처음 보시는 항목부터 설명드리겠습니다.");
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
const rosenthalDayContentSource = readFileSync(join(repoRoot, "src", "data", "rosenthal", "dayContent.js"), "utf8");
const rosenthalCharacterContentSource = readFileSync(join(repoRoot, "src", "data", "rosenthal", "characterContent.js"), "utf8");
const rosenthalExplorationContentSource = readFileSync(join(repoRoot, "src", "data", "rosenthal", "explorationContent.js"), "utf8");
const rosenthalFinaleContentSource = readFileSync(join(repoRoot, "src", "data", "rosenthal", "finaleContent.js"), "utf8");
const rosenthalIntroContentSource = readFileSync(join(repoRoot, "src", "data", "rosenthal", "introContent.js"), "utf8");
const tutorialContentSource = readFileSync(join(repoRoot, "src", "data", "tutorialContent.js"), "utf8");
const tutorialIntroContentSource = readFileSync(join(repoRoot, "src", "data", "tutorial", "introContent.js"), "utf8");
const tutorialDayActionContentSource = readFileSync(join(repoRoot, "src", "data", "tutorial", "dayActionContent.js"), "utf8");
const tutorialNightChoiceContentSource = readFileSync(join(repoRoot, "src", "data", "tutorial", "nightChoiceContent.js"), "utf8");
const tutorialEndingContentSource = readFileSync(join(repoRoot, "src", "data", "tutorial", "endingContent.js"), "utf8");
const systemContentSource = readFileSync(join(repoRoot, "src", "data", "systemContent.js"), "utf8");
const systemMetaContentSource = readFileSync(join(repoRoot, "src", "data", "system", "metaContent.js"), "utf8");
const systemRoleContentSource = readFileSync(join(repoRoot, "src", "data", "system", "roleContent.js"), "utf8");
const systemMarkUnlockContentSource = readFileSync(join(repoRoot, "src", "data", "system", "markUnlockContent.js"), "utf8");
const systemAffinityMarkContentSource = readFileSync(join(repoRoot, "src", "data", "system", "affinityMarkContent.js"), "utf8");
const systemStandaloneMarkContentSource = readFileSync(join(repoRoot, "src", "data", "system", "standaloneMarkContent.js"), "utf8");
const systemHiddenRuleContentSource = readFileSync(join(repoRoot, "src", "data", "system", "hiddenRuleContent.js"), "utf8");
const systemRulesSource = readFileSync(join(repoRoot, "src", "rules", "systemRules.js"), "utf8");
assert.equal(existsSync(join(repoRoot, "src", "rules", "tutorialRules.js")), false);
assert.equal(rosenthalDayContentSource.includes("export const DAY_ACTIONS"), true);
assert.equal(rosenthalCharacterContentSource.includes("export const CORE_NPCS"), true);
assert.equal(rosenthalExplorationContentSource.includes("export const DIRECTIONS"), true);
assert.equal(rosenthalExplorationContentSource.includes("EVENT_TITLES"), true);
assert.equal(rosenthalFinaleContentSource.includes("export const FINALES"), true);
assert.equal(rosenthalIntroContentSource.includes("export const PROLOGUE"), true);
assert.equal(rosenthalIntroContentSource.includes("export const DAY_EIGHT_SCRIPTS"), true);
assert.equal(rosenthalScriptContentSource.includes("./rosenthal/dayContent.js"), true);
assert.equal(rosenthalScriptContentSource.includes("./rosenthal/introContent.js"), true);
assert.equal(rosenthalScriptContentSource.includes("export const DAY_ACTIONS"), false);
assert.equal(rosenthalScriptContentSource.includes("export const PROLOGUE"), false);
assert.equal(rosenthalContentSource.includes("./rosenthalScriptContent.js"), true);
assert.equal(rosenthalContentSource.includes("export const DAY_ACTIONS = ["), false);
assert.equal(tutorialContentSource.includes("./tutorial/introContent.js"), true);
assert.equal(tutorialContentSource.includes("./tutorial/dayActionContent.js"), true);
assert.equal(tutorialContentSource.includes("./tutorial/nightChoiceContent.js"), true);
assert.equal(tutorialContentSource.includes("./tutorial/endingContent.js"), true);
assert.equal(tutorialContentSource.includes("export const DAY_ACTIONS"), false);
assert.equal(tutorialContentSource.includes("export const NIGHT_CHOICES"), false);
assert.equal(tutorialIntroContentSource.includes("PROLOGUE as ROSENTHAL_PROLOGUE"), true);
assert.equal(tutorialIntroContentSource.includes("NIGHT_OPENING as ROSENTHAL_NIGHT_OPENING"), true);
assert.equal(tutorialIntroContentSource.includes("text: ROSENTHAL_PROLOGUE"), true);
assert.equal(tutorialIntroContentSource.includes("text: ROSENTHAL_NIGHT_OPENING[0]"), true);
assert.equal(tutorialIntroContentSource.includes("export const PROLOGUE"), true);
assert.equal(tutorialIntroContentSource.includes("export const DAY_OPENING_SCRIPT"), true);
assert.equal(tutorialIntroContentSource.includes("export const DAY_INTERLUDES"), true);
assert.equal(tutorialIntroContentSource.includes("export const NIGHT_ENTRY_SCRIPT"), true);
assert.equal(tutorialDayActionContentSource.includes("export const DAY_ACTIONS"), true);
assert.equal(tutorialNightChoiceContentSource.includes("export const NIGHT_CHOICES"), true);
assert.equal(tutorialEndingContentSource.includes("export const ENDINGS"), true);
assert.equal(tutorialEndingContentSource.includes("export const WORKER_NAME_CHOICES"), true);
assert.equal(tutorialEndingContentSource.includes("export const FORFEIT_RESULTS"), true);
assert.equal(systemContentSource.includes("./system/metaContent.js"), true);
assert.equal(systemContentSource.includes("./system/roleContent.js"), true);
assert.equal(systemContentSource.includes("./system/markUnlockContent.js"), true);
assert.equal(systemContentSource.includes("./system/affinityMarkContent.js"), true);
assert.equal(systemContentSource.includes("./system/standaloneMarkContent.js"), true);
assert.equal(systemContentSource.includes("./system/hiddenRuleContent.js"), true);
assert.equal(systemContentSource.includes("export const RESOURCE_META"), false);
assert.equal(systemContentSource.includes("export const AFFINITY_MARK_GROUPS"), false);
assert.equal(systemContentSource.includes("export const HIDDEN_RUN_RULES"), false);
assert.equal(systemMetaContentSource.includes("export const RESOURCE_META"), true);
assert.equal(systemMetaContentSource.includes("export const HORROR_DERIVED_META"), true);
assert.equal(systemRoleContentSource.includes("export const JOBS"), true);
assert.equal(systemRoleContentSource.includes("export const TITLES"), true);
assert.equal(systemRoleContentSource.includes("export const PASSIVES"), true);
assert.equal(systemMarkUnlockContentSource.includes("export const MARK_LOADOUT_LIMIT"), true);
assert.equal(systemMarkUnlockContentSource.includes("export const MARK_BRANCH_UNLOCKS"), true);
assert.equal(systemAffinityMarkContentSource.includes("export const AFFINITY_MARK_GROUPS"), true);
assert.equal(systemStandaloneMarkContentSource.includes("export const STANDALONE_MARKS"), true);
assert.equal(systemStandaloneMarkContentSource.includes("export const LEGACY_STIGMA_MARK_MAP"), true);
assert.equal(systemHiddenRuleContentSource.includes("export const HIDDEN_RUN_RULES"), true);
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
const graphEditableText = graphJson.nodes.find((node) => node.scriptEdit?.id === "script-pack:special-event-groups:blank-ledger:stage-1:text");
assert.equal(graphEditableText.scriptEdit.apiBase, "http://127.0.0.1:3799");
assert.equal(graphEditableText.scriptEdit.token, "understand-edit");
assert.equal(new URL(graphEditableText.scriptEdit.editorUrl).searchParams.get("token"), "understand-edit");
assert.equal(new URL(graphEditableText.scriptEdit.editorUrl).searchParams.get("id"), "script-pack:special-event-groups:blank-ledger:stage-1:text");
assert.equal(graphJson.nodes.some((node) => node.scriptEdit?.folderPath?.includes("Stage 1")), true);
assert.equal(graphJson.layers.some((layer) => layer.id === "layer:editable-index"), true);
const editorHtml = readFileSync(join(repoRoot, "scripts", "script-edit", "public", "index.html"), "utf8");
const editorJs = readFileSync(join(repoRoot, "scripts", "script-edit", "public", "app.js"), "utf8");
const editorCss = readFileSync(join(repoRoot, "scripts", "script-edit", "public", "styles.css"), "utf8");
const editorUiVerify = readFileSync(join(repoRoot, "scripts", "verify-script-edit-ui.cjs"), "utf8");
assert.equal(packageJson.scripts["script-edit:verify-ui"], "electron scripts/verify-script-edit-ui.cjs");
assert.equal(editorHtml.includes("script-edit-root"), true);
assert.equal(editorHtml.includes("/styles.css?v=item-actions"), true);
assert.equal(editorHtml.includes("/app.js?v=item-actions"), true);
assert.equal(editorHtml.includes("entry-count"), true);
assert.equal(editorHtml.includes("kind-filter"), true);
assert.equal(editorHtml.includes("file-filter"), true);
assert.equal(editorHtml.includes("entry-list-shell"), true);
assert.equal(editorHtml.includes("entry-scrollbar"), true);
assert.equal(editorHtml.includes("entry-scrollbar-thumb"), true);
assert.equal(editorJs.includes("/api/index"), true);
assert.equal(editorJs.includes("/api/item"), true);
assert.equal(editorJs.includes("/api/insert"), true);
assert.equal(editorJs.includes("/api/delete"), true);
assert.equal(editorJs.includes("/api/move"), true);
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
assert.equal(editorJs.includes("initialItemId"), true);
assert.equal(editorJs.includes("selectEntryById"), true);
assert.equal(editorJs.includes("insert-before-button"), true);
assert.equal(editorJs.includes("insert-after-button"), true);
assert.equal(editorJs.includes("delete-item-button"), true);
assert.equal(editorJs.includes("move-up-button"), true);
assert.equal(editorJs.includes("move-down-button"), true);
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
assert.equal(editorCss.includes(".insert-pane"), true);
assert.equal(editorCss.includes(".item-action-pane"), true);
assert.equal(editorCss.includes(".entry-folder"), true);
assert.equal(editorCss.includes(".folder-summary"), true);
assert.equal(editorUiVerify.includes("sendInputEvent"), true);
assert.equal(editorUiVerify.includes("Nested script edit folders were not rendered"), true);
assert.equal(editorUiVerify.includes("Selecting entry changed scrollTop"), true);
assert.equal(editorUiVerify.includes("Rail click did not move entry list scrollTop"), true);
assert.equal(editorUiVerify.includes("Rail drag did not move entry list scrollTop farther"), true);

console.log("Script edit verification passed.");
