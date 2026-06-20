import { mkdirSync } from "node:fs";
import { dirname, relative } from "node:path";
import {
  ensureScriptEditConfig,
  getScriptEditIndexPath,
  normalizeProjectPath,
  toProjectSlashPath,
} from "./pathPolicy.mjs";
import { readUtf8Lf, sha256Text, writeJsonLf } from "./sourceText.mjs";
import { findPropertyLiteralSpan, parseStageCalls } from "./sourceScanner.mjs";

const INDEX_VERSION = "1.0.0";
const MANIFEST_FILE = "src/data/scriptManifest.js";
const SPECIAL_EVENT_GROUPS_FILE = "src/data/scriptPacks/specialEventGroups.js";
const SPECIAL_EVENT_PACK_ID = "special-event-groups";

function parseLiteral(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("\"") || trimmed.startsWith("'")) return JSON.parse(trimmed.replace(/^'/, "\"").replace(/'$/, "\""));
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) return numeric;
  return trimmed;
}

function getValueType(value) {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "singleLineText";
}

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

function findFirstObjectAfter(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Missing marker: ${marker}`);
  const start = source.indexOf("{", markerIndex);
  if (start < 0) throw new Error(`Missing object after marker: ${marker}`);
  let depth = 0;
  for (let end = start; end < source.length; end += 1) {
    if (source[end] === "{") depth += 1;
    if (source[end] === "}") depth -= 1;
    if (depth === 0) return { start, end: end + 1, text: source.slice(start, end + 1) };
  }
  throw new Error(`Unclosed object after marker: ${marker}`);
}

function buildManifestEntries(projectRoot, config) {
  const sourceFile = normalizeProjectPath(projectRoot, MANIFEST_FILE);
  const source = readUtf8Lf(projectRoot, sourceFile);
  const manifestObject = findFirstObjectAfter(source, "SCRIPT_PACKS");
  return ["triggerKey", "kind", "moduleKey", "exportName", "itemCount", "stageCount"].map((field) => {
    const span = findPropertyLiteralSpan(manifestObject.text, manifestObject.start, field);
    const value = parseLiteral(span.raw);
    return makeEntry({
      id: `manifest:${SPECIAL_EVENT_PACK_ID}:${field}`,
      kind: "manifest",
      label: `Special Event Manifest / ${field}`,
      sourceFile,
      source,
      start: span.start,
      end: span.end,
      value,
      valueType: getValueType(value),
      field,
      verify: config.verify,
    });
  });
}

function parseGroupIds(source) {
  return [...source.matchAll(/\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)"/g)].map((match) => ({
    id: match[1],
    name: match[2],
  }));
}

function getStageFieldMeta(field) {
  const meta = {
    title: { suffix: "title", kind: "scriptTitle", label: "Title", valueType: "singleLineText" },
    text: { suffix: "text", kind: "dialogue", label: "Text", valueType: "multilineText" },
    left: { suffix: "left-label", kind: "choiceLabel", label: "Left Choice", valueType: "singleLineText" },
    right: { suffix: "right-label", kind: "choiceLabel", label: "Right Choice", valueType: "singleLineText" },
  };
  return meta[field];
}

function buildSpecialEventEntries(projectRoot, config) {
  const sourceFile = normalizeProjectPath(projectRoot, SPECIAL_EVENT_GROUPS_FILE);
  const source = readUtf8Lf(projectRoot, sourceFile);
  const groups = parseGroupIds(source);
  const stages = parseStageCalls(source);
  const entries = [];

  groups.forEach((group, groupIndex) => {
    for (let stageOffset = 0; stageOffset < 3; stageOffset += 1) {
      const stageNumber = stageOffset + 1;
      const stage = stages[(groupIndex * 3) + stageOffset];
      if (!stage) throw new Error(`Missing stage ${stageNumber} for ${group.id}`);
      for (const literal of stage.fields) {
        const meta = getStageFieldMeta(literal.field);
        entries.push(makeEntry({
          id: `script-pack:${SPECIAL_EVENT_PACK_ID}:${group.id}:stage-${stageNumber}:${meta.suffix}`,
          kind: meta.kind,
          label: `${group.name} / Stage ${stageNumber} / ${meta.label}`,
          sourceFile,
          source,
          start: literal.literalStart,
          end: literal.literalEnd,
          value: literal.value,
          valueType: meta.valueType,
          field: literal.field,
          verify: config.verify,
        }));
      }
    }
  });

  return entries;
}

export async function buildScriptEditIndex(projectRoot) {
  const config = ensureScriptEditConfig(projectRoot);
  const entries = [
    ...buildManifestEntries(projectRoot, config),
    ...buildSpecialEventEntries(projectRoot, config),
  ];
  return {
    version: INDEX_VERSION,
    generatedAt: new Date().toISOString(),
    projectRoot: toProjectSlashPath(relative(projectRoot, projectRoot)) || ".",
    entries,
  };
}

export async function writeScriptEditIndex(projectRoot) {
  const index = await buildScriptEditIndex(projectRoot);
  const indexPath = getScriptEditIndexPath(projectRoot);
  mkdirSync(dirname(indexPath), { recursive: true });
  writeJsonLf(projectRoot, ".script-edit/index.json", index);
  return index;
}

if (process.argv.includes("--write")) {
  await writeScriptEditIndex(process.cwd());
  console.log(`Wrote ${getScriptEditIndexPath(process.cwd())}`);
}
