import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  assertScriptEditPathAllowed,
  getScriptEditIndexPath,
  loadScriptEditConfig,
  normalizeProjectPath,
} from "./pathPolicy.mjs";
import { readUtf8Lf, sha256Text, writeUtf8Lf, writeJsonLf } from "./sourceText.mjs";
import { writeScriptEditIndex } from "./indexGenerator.mjs";

export function loadScriptEditIndex(projectRoot) {
  const indexPath = getScriptEditIndexPath(projectRoot);
  if (!existsSync(indexPath)) throw new Error("Script edit index is missing. Run script-edit:index first.");
  return JSON.parse(readFileSync(indexPath, "utf8"));
}

export function getEditableItem(projectRoot, itemId) {
  const index = loadScriptEditIndex(projectRoot);
  const entry = index.entries.find((candidate) => candidate.id === itemId);
  if (!entry) throw new Error(`Editable item not found: ${itemId}`);
  return entry;
}

function encodeReplacement(value) {
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);
  return JSON.stringify(String(value));
}

function assertSourceIsFresh(source, entry) {
  const currentHash = sha256Text(source);
  if (currentHash !== entry.sourceHash) {
    throw new Error(`Script edit index is stale for ${entry.sourceFile}`);
  }
}

function writeBackupRecord(projectRoot, entry, sourceBefore, replacement) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupRelativePath = `.script-edit/backups/${stamp}-${entry.id.replace(/[^A-Za-z0-9_.-]+/g, "_")}.json`;
  const backupAbsolutePath = join(projectRoot, backupRelativePath);
  mkdirSync(dirname(backupAbsolutePath), { recursive: true });
  writeJsonLf(projectRoot, backupRelativePath, {
    id: entry.id,
    sourceFile: entry.sourceFile,
    sourceHash: entry.sourceHash,
    locator: entry.locator,
    valueBefore: entry.value,
    replacement,
    sourceBefore,
    createdAt: new Date().toISOString(),
  });
  return backupRelativePath;
}

function formatInsertedObject(insert, fields = {}) {
  const speaker = fields.speaker == null || fields.speaker === ""
    ? (insert.defaults?.speaker ?? "narration")
    : fields.speaker;
  const text = fields.text == null ? "" : fields.text;
  const itemIndent = insert.itemIndent ?? "  ";
  const propertyIndent = insert.propertyIndent ?? `${itemIndent}  `;
  return [
    `${itemIndent}{`,
    `${propertyIndent}speaker: ${encodeReplacement(speaker)},`,
    `${propertyIndent}text: ${encodeReplacement(text)},`,
    `${itemIndent}}`,
  ].join("\n");
}

function formatInsertedString(insert, fields = {}) {
  const text = fields.text == null ? "" : fields.text;
  return `${insert.itemIndent ?? ""}${encodeReplacement(text)}`;
}

export async function applyScriptEdit(projectRoot, edit) {
  const entry = getEditableItem(projectRoot, edit.id);
  const config = loadScriptEditConfig(projectRoot);
  const sourceFile = normalizeProjectPath(projectRoot, entry.sourceFile);
  assertScriptEditPathAllowed(config, sourceFile);
  if (entry.locator?.type !== "source-span") {
    throw new Error(`Unsupported locator type: ${entry.locator?.type}`);
  }

  const source = readUtf8Lf(projectRoot, sourceFile);
  assertSourceIsFresh(source, entry);
  const { start, end } = entry.locator;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > source.length) {
    throw new Error(`Invalid source span for ${entry.id}`);
  }

  const replacement = encodeReplacement(edit.value);
  const backupFile = writeBackupRecord(projectRoot, entry, source, replacement);
  writeUtf8Lf(projectRoot, sourceFile, `${source.slice(0, start)}${replacement}${source.slice(end)}`);
  await writeScriptEditIndex(projectRoot);

  return {
    id: entry.id,
    changedFile: sourceFile,
    backupFile,
    reindexed: true,
  };
}

export async function applyScriptInsert(projectRoot, edit) {
  const entry = getEditableItem(projectRoot, edit.id);
  const config = loadScriptEditConfig(projectRoot);
  const sourceFile = normalizeProjectPath(projectRoot, entry.sourceFile);
  assertScriptEditPathAllowed(config, sourceFile);
  if (!["object-array-item", "string-array-item"].includes(entry.insert?.type)) {
    throw new Error(`Editable item does not support insertion: ${entry.id}`);
  }

  const source = readUtf8Lf(projectRoot, sourceFile);
  assertSourceIsFresh(source, entry);
  const direction = edit.direction === "before" ? "before" : "after";
  const position = entry.insert[direction];
  if (!Number.isInteger(position) || position < 0 || position > source.length) {
    throw new Error(`Invalid insert position for ${entry.id}`);
  }

  const insertedObject = entry.insert.type === "string-array-item"
    ? formatInsertedString(entry.insert, edit.fields)
    : formatInsertedObject(entry.insert, edit.fields);
  const insertion = direction === "before"
    ? `${insertedObject},\n`
    : `,\n${insertedObject}`;
  const backupFile = writeBackupRecord(projectRoot, entry, source, insertion);
  writeUtf8Lf(projectRoot, sourceFile, `${source.slice(0, position)}${insertion}${source.slice(position)}`);
  await writeScriptEditIndex(projectRoot);

  return {
    id: entry.id,
    changedFile: sourceFile,
    backupFile,
    direction,
    reindexed: true,
  };
}
