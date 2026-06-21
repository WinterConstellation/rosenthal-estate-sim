import { mkdirSync } from "node:fs";
import { dirname, relative } from "node:path";
import {
  ensureScriptEditConfig,
  getScriptEditIndexPath,
  normalizeProjectPath,
  toProjectSlashPath,
} from "./pathPolicy.mjs";
import { readUtf8Lf, sha256Text, writeJsonLf } from "./sourceText.mjs";
import { findPropertyLiteralSpan, parseStageCalls, readStringLiteral } from "./sourceScanner.mjs";

const INDEX_VERSION = "1.0.0";
const MANIFEST_FILE = "src/data/scriptManifest.js";
const SPECIAL_EVENT_GROUPS_FILE = "src/data/scriptPacks/specialEventGroups.js";
const ROSENTHAL_DAY_CONTENT_FILE = "src/data/rosenthal/dayContent.js";
const ROSENTHAL_CHARACTER_CONTENT_FILE = "src/data/rosenthal/characterContent.js";
const ROSENTHAL_EXPLORATION_CONTENT_FILE = "src/data/rosenthal/explorationContent.js";
const ROSENTHAL_FINALE_CONTENT_FILE = "src/data/rosenthal/finaleContent.js";
const ROSENTHAL_INTRO_CONTENT_FILE = "src/data/rosenthal/introContent.js";
const TUTORIAL_INTRO_CONTENT_FILE = "src/data/tutorial/introContent.js";
const TUTORIAL_DAY_ACTION_CONTENT_FILE = "src/data/tutorial/dayActionContent.js";
const TUTORIAL_NIGHT_CHOICE_CONTENT_FILE = "src/data/tutorial/nightChoiceContent.js";
const TUTORIAL_ENDING_CONTENT_FILE = "src/data/tutorial/endingContent.js";
const SYSTEM_META_CONTENT_FILE = "src/data/system/metaContent.js";
const SYSTEM_ROLE_CONTENT_FILE = "src/data/system/roleContent.js";
const SYSTEM_MARK_UNLOCK_CONTENT_FILE = "src/data/system/markUnlockContent.js";
const SYSTEM_AFFINITY_MARK_CONTENT_FILE = "src/data/system/affinityMarkContent.js";
const SYSTEM_STANDALONE_MARK_CONTENT_FILE = "src/data/system/standaloneMarkContent.js";
const SYSTEM_HIDDEN_RULE_CONTENT_FILE = "src/data/system/hiddenRuleContent.js";
const SPECIAL_EVENT_PACK_ID = "special-event-groups";

const TEXT_FIELD_KIND = {
  button: "choiceLabel",
  codexText: "dialogue",
  description: "description",
  detail: "description",
  icon: "label",
  label: "label",
  name: "label",
  paragraph: "dialogue",
  preview: "description",
  relation: "description",
  result: "dialogue",
  reveal: "dialogue",
  sourceHint: "description",
  speaker: "speaker",
  subtitle: "scriptTitle",
  tag: "label",
  text: "dialogue",
  title: "scriptTitle",
};

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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isWhitespace(char) {
  return /\s/.test(char ?? "");
}

function skipWhitespaceAndComments(source, index, end = source.length) {
  let cursor = index;
  while (cursor < end) {
    if (isWhitespace(source[cursor])) {
      cursor += 1;
      continue;
    }
    if (source.slice(cursor, cursor + 2) === "//") {
      const nextLine = source.indexOf("\n", cursor + 2);
      cursor = nextLine < 0 ? end : nextLine + 1;
      continue;
    }
    if (source.slice(cursor, cursor + 2) === "/*") {
      const close = source.indexOf("*/", cursor + 2);
      cursor = close < 0 ? end : close + 2;
      continue;
    }
    break;
  }
  return cursor;
}

function skipTemplateLiteral(source, index, end = source.length) {
  for (let cursor = index + 1; cursor < end; cursor += 1) {
    if (source[cursor] === "\\") {
      cursor += 1;
      continue;
    }
    if (source[cursor] === "`") return cursor + 1;
  }
  throw new Error("Unterminated template literal");
}

function skipIgnoredToken(source, index, end = source.length) {
  if (source[index] === "\"" || source[index] === "'") return readStringLiteral(source, index).literalEnd;
  if (source[index] === "`") return skipTemplateLiteral(source, index, end);
  if (source.slice(index, index + 2) === "//") {
    const nextLine = source.indexOf("\n", index + 2);
    return nextLine < 0 ? end : nextLine + 1;
  }
  if (source.slice(index, index + 2) === "/*") {
    const close = source.indexOf("*/", index + 2);
    return close < 0 ? end : close + 2;
  }
  return index;
}

function trimRange(source, start, end) {
  let cleanStart = start;
  let cleanEnd = end;
  while (cleanStart < cleanEnd && isWhitespace(source[cleanStart])) cleanStart += 1;
  while (cleanEnd > cleanStart && isWhitespace(source[cleanEnd - 1])) cleanEnd -= 1;
  return { start: cleanStart, end: cleanEnd };
}

function findBalancedRange(source, start) {
  const open = source[start];
  const closeFor = { "{": "}", "[": "]", "(": ")" };
  const close = closeFor[open];
  if (!close) throw new Error(`Expected balanced opener at ${start}`);
  const stack = [close];
  for (let cursor = start + 1; cursor < source.length; cursor += 1) {
    const skipped = skipIgnoredToken(source, cursor);
    if (skipped !== cursor) {
      cursor = skipped - 1;
      continue;
    }
    const char = source[cursor];
    if (closeFor[char]) {
      stack.push(closeFor[char]);
      continue;
    }
    if (char === stack.at(-1)) {
      stack.pop();
      if (stack.length === 0) {
        return { start, end: cursor + 1, text: source.slice(start, cursor + 1) };
      }
    }
  }
  throw new Error(`Unclosed ${open} at ${start}`);
}

function findExportConstInitializer(source, exportName) {
  const pattern = new RegExp(`export\\s+const\\s+${escapeRegExp(exportName)}\\s*=\\s*`);
  const match = pattern.exec(source);
  if (!match) throw new Error(`Missing export const ${exportName}`);
  const start = skipWhitespaceAndComments(source, match.index + match[0].length);
  const first = source[start];
  if (first === "{" || first === "[" || first === "(") return findBalancedRange(source, start);
  if (first === "\"" || first === "'") {
    const literal = readStringLiteral(source, start);
    return { start: literal.literalStart, end: literal.literalEnd, text: source.slice(literal.literalStart, literal.literalEnd) };
  }
  const end = source.indexOf(";", start);
  if (end < 0) throw new Error(`Missing semicolon for export const ${exportName}`);
  const range = trimRange(source, start, end);
  return { ...range, text: source.slice(range.start, range.end) };
}

function readLiteralAt(source, index, end = source.length) {
  const start = skipWhitespaceAndComments(source, index, end);
  const char = source[start];
  if (char === "\"" || char === "'") {
    const literal = readStringLiteral(source, start);
    if (literal.literalEnd > end) return null;
    return {
      start: literal.literalStart,
      end: literal.literalEnd,
      raw: source.slice(literal.literalStart, literal.literalEnd),
      value: literal.value,
      valueType: "singleLineText",
    };
  }
  const remainder = source.slice(start, end);
  const numberMatch = /^-?\d+(?:\.\d+)?/.exec(remainder);
  if (numberMatch) {
    return {
      start,
      end: start + numberMatch[0].length,
      raw: numberMatch[0],
      value: Number(numberMatch[0]),
      valueType: "number",
    };
  }
  if (remainder.startsWith("true") && !/[A-Za-z0-9_$]/.test(remainder[4] ?? "")) {
    return { start, end: start + 4, raw: "true", value: true, valueType: "boolean" };
  }
  if (remainder.startsWith("false") && !/[A-Za-z0-9_$]/.test(remainder[5] ?? "")) {
    return { start, end: start + 5, raw: "false", value: false, valueType: "boolean" };
  }
  return null;
}

function readPropertyKey(source, index, end) {
  const start = skipWhitespaceAndComments(source, index, end);
  if (source[start] === "\"" || source[start] === "'") {
    const literal = readStringLiteral(source, start);
    return { key: literal.value, start: literal.literalStart, end: literal.literalEnd };
  }
  if (source[start] === "..." || source[start] === "[" || source[start] == null) return null;
  let cursor = start;
  while (
    cursor < end
    && !isWhitespace(source[cursor])
    && ![":", ",", "{", "}", "[", "]", "(", ")"].includes(source[cursor])
  ) {
    cursor += 1;
  }
  if (cursor === start) return null;
  return { key: source.slice(start, cursor), start, end: cursor };
}

function findPropertyValueRange(source, objectRange, propertyName) {
  const rangeEnd = objectRange.end - 1;
  let cursor = objectRange.start + 1;
  while (cursor < rangeEnd) {
    cursor = skipWhitespaceAndComments(source, cursor, rangeEnd);
    if (cursor >= rangeEnd) break;
    const skipped = skipIgnoredToken(source, cursor, rangeEnd);
    if (skipped !== cursor) {
      cursor = skipped;
      continue;
    }
    const key = readPropertyKey(source, cursor, rangeEnd);
    if (!key) {
      cursor += 1;
      continue;
    }
    cursor = skipWhitespaceAndComments(source, key.end, rangeEnd);
    if (source[cursor] !== ":") {
      cursor = key.end + 1;
      continue;
    }
    const valueStart = skipWhitespaceAndComments(source, cursor + 1, rangeEnd);
    let valueEnd = valueStart;
    if (["{", "[", "("].includes(source[valueStart])) {
      valueEnd = findBalancedRange(source, valueStart).end;
    } else {
      const literal = readLiteralAt(source, valueStart, rangeEnd);
      valueEnd = literal?.end ?? valueStart;
    }
    if (key.key === propertyName) {
      return { start: valueStart, end: valueEnd, text: source.slice(valueStart, valueEnd) };
    }
    cursor = valueEnd;
  }
  return null;
}

function collectObjectLiteralProperties(source, objectRange, path = []) {
  const results = [];
  const rangeEnd = objectRange.end - 1;
  let cursor = objectRange.start + 1;
  while (cursor < rangeEnd) {
    cursor = skipWhitespaceAndComments(source, cursor, rangeEnd);
    if (source[cursor] === ",") {
      cursor += 1;
      continue;
    }
    if (cursor >= rangeEnd || source[cursor] === "}") break;
    const key = readPropertyKey(source, cursor, rangeEnd);
    if (!key) {
      cursor += 1;
      continue;
    }
    cursor = skipWhitespaceAndComments(source, key.end, rangeEnd);
    if (source[cursor] !== ":") {
      while (cursor < rangeEnd && source[cursor] !== ",") cursor += 1;
      continue;
    }
    const valueStart = skipWhitespaceAndComments(source, cursor + 1, rangeEnd);
    const nextPath = [...path, key.key];
    if (source[valueStart] === "{") {
      const nested = findBalancedRange(source, valueStart);
      results.push(...collectObjectLiteralProperties(source, nested, nextPath));
      cursor = nested.end;
      continue;
    }
    if (source[valueStart] === "[") {
      cursor = findBalancedRange(source, valueStart).end;
      continue;
    }
    const literal = readLiteralAt(source, valueStart, rangeEnd);
    if (literal) {
      results.push({ path: nextPath, field: nextPath.join("."), ...literal });
      cursor = literal.end;
      continue;
    }
    while (cursor < rangeEnd && source[cursor] !== ",") cursor += 1;
  }
  return results;
}

function collectTopLevelObjectRangesInArray(source, arrayRange) {
  const ranges = [];
  let cursor = arrayRange.start + 1;
  const end = arrayRange.end - 1;
  while (cursor < end) {
    cursor = skipWhitespaceAndComments(source, cursor, end);
    if (source[cursor] === ",") {
      cursor += 1;
      continue;
    }
    if (source[cursor] === "{") {
      const objectRange = findBalancedRange(source, cursor);
      ranges.push(objectRange);
      cursor = objectRange.end;
      continue;
    }
    const skipped = skipIgnoredToken(source, cursor, end);
    if (skipped !== cursor) {
      cursor = skipped;
      continue;
    }
    cursor += 1;
  }
  return ranges;
}

function collectTopLevelObjectValues(source, objectRange) {
  const values = [];
  const end = objectRange.end - 1;
  let cursor = objectRange.start + 1;
  while (cursor < end) {
    cursor = skipWhitespaceAndComments(source, cursor, end);
    if (source[cursor] === ",") {
      cursor += 1;
      continue;
    }
    const key = readPropertyKey(source, cursor, end);
    if (!key) {
      cursor += 1;
      continue;
    }
    cursor = skipWhitespaceAndComments(source, key.end, end);
    if (source[cursor] !== ":") {
      cursor = key.end + 1;
      continue;
    }
    const valueStart = skipWhitespaceAndComments(source, cursor + 1, end);
    if (source[valueStart] === "{") {
      const valueRange = findBalancedRange(source, valueStart);
      values.push({ key: key.key, range: valueRange });
      cursor = valueRange.end;
      continue;
    }
    cursor += 1;
  }
  return values;
}

function collectStringLiteralsInRange(source, range) {
  const literals = [];
  let cursor = range.start;
  while (cursor < range.end) {
    const skipped = skipIgnoredToken(source, cursor, range.end);
    if (skipped !== cursor) {
      if (source[cursor] === "\"" || source[cursor] === "'") {
        const literal = readStringLiteral(source, cursor);
        literals.push({
          start: literal.literalStart,
          end: literal.literalEnd,
          raw: source.slice(literal.literalStart, literal.literalEnd),
          value: literal.value,
          valueType: "singleLineText",
        });
      }
      cursor = skipped;
      continue;
    }
    cursor += 1;
  }
  return literals;
}

function collectStringLiteralsInArray(source, arrayRange) {
  return collectStringLiteralsInRange(source, { start: arrayRange.start + 1, end: arrayRange.end - 1 });
}

function collectFunctionCallRanges(source, range, functionName) {
  const calls = [];
  let cursor = range.start;
  while (cursor < range.end) {
    const skipped = skipIgnoredToken(source, cursor, range.end);
    if (skipped !== cursor) {
      cursor = skipped;
      continue;
    }
    const before = source[cursor - 1] ?? "";
    if (
      source.slice(cursor, cursor + functionName.length) === functionName
      && !/[A-Za-z0-9_$]/.test(before)
      && !/[A-Za-z0-9_$]/.test(source[cursor + functionName.length] ?? "")
    ) {
      const parenStart = skipWhitespaceAndComments(source, cursor + functionName.length, range.end);
      if (source[parenStart] === "(") {
        const parenRange = findBalancedRange(source, parenStart);
        calls.push({ start: cursor, end: parenRange.end, parenRange });
        cursor = parenRange.end;
        continue;
      }
    }
    cursor += 1;
  }
  return calls;
}

function parseCallArguments(source, parenRange) {
  const args = [];
  let depth = 0;
  let argStart = parenRange.start + 1;
  const end = parenRange.end - 1;
  for (let cursor = argStart; cursor < end; cursor += 1) {
    const skipped = skipIgnoredToken(source, cursor, end);
    if (skipped !== cursor) {
      cursor = skipped - 1;
      continue;
    }
    const char = source[cursor];
    if (["{", "[", "("].includes(char)) {
      depth += 1;
      continue;
    }
    if (["}", "]", ")"].includes(char)) {
      depth -= 1;
      continue;
    }
    if (char === "," && depth === 0) {
      args.push(trimRange(source, argStart, cursor));
      argStart = cursor + 1;
    }
  }
  args.push(trimRange(source, argStart, end));
  return args;
}

function readArgumentLiteral(source, argument) {
  const literal = readLiteralAt(source, argument.start, argument.end);
  if (!literal) return null;
  const after = skipWhitespaceAndComments(source, literal.end, argument.end);
  return after === argument.end ? literal : null;
}

function getFirstLiteralProperty(source, objectRange, propertyName) {
  const propertyRange = findPropertyValueRange(source, objectRange, propertyName);
  if (!propertyRange) return null;
  return readLiteralAt(source, propertyRange.start, propertyRange.end);
}

function sanitizeIdPart(value, fallback = "item") {
  const safe = String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return safe || fallback;
}

function fieldKind(field, fallback = "data") {
  return TEXT_FIELD_KIND[field.split(".").at(-1)] ?? TEXT_FIELD_KIND[field] ?? fallback;
}

function folderPathFromLabel(label) {
  const parts = String(label ?? "")
    .split(" / ")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1) : [];
}

function makeEntry({ id, kind, label, sourceFile, source, start, end, value, valueType, field, verify, insert, item }) {
  return {
    id,
    kind,
    label,
    sourceFile,
    folderPath: folderPathFromLabel(label),
    sourceHash: sha256Text(source),
    locator: { type: "source-span", start, end },
    editableFields: [{ name: "value", type: valueType }],
    field,
    valueType,
    value,
    verify,
    ...(insert ? { insert } : {}),
    ...(item ? { item } : {}),
  };
}

function pushLiteralEntry(entries, { id, kind, label, sourceFile, source, literal, field, valueType, verify, insert, item }) {
  entries.push(makeEntry({
    id,
    kind,
    label,
    sourceFile,
    source,
    start: literal.start,
    end: literal.end,
    value: literal.value,
    valueType: valueType ?? literal.valueType ?? getValueType(literal.value),
    field,
    verify,
    insert,
    item,
  }));
}

function getLineStart(source, index) {
  const previousNewline = source.lastIndexOf("\n", Math.max(0, index - 1));
  return previousNewline < 0 ? 0 : previousNewline + 1;
}

function getLineIndent(source, index) {
  const lineStart = getLineStart(source, index);
  return /^\s*/.exec(source.slice(lineStart, index))?.[0] ?? "";
}

function makeObjectArrayInsert(source, objectRange, defaults = {}) {
  const itemIndent = getLineIndent(source, objectRange.start);
  return {
    type: "object-array-item",
    before: getLineStart(source, objectRange.start),
    after: objectRange.end,
    itemIndent,
    propertyIndent: `${itemIndent}  `,
    fields: [
      { name: "speaker", type: "singleLineText" },
      { name: "text", type: "multilineText" },
    ],
    defaults,
  };
}

function makeStringArrayInsert(source, literal) {
  const itemIndent = getLineIndent(source, literal.start);
  return {
    type: "string-array-item",
    before: getLineStart(source, literal.start),
    after: literal.end,
    itemIndent,
    fields: [
      { name: "text", type: "multilineText" },
    ],
    defaults: {},
  };
}

function compactRange(range) {
  return range ? { start: range.start, end: range.end } : null;
}

// Item actions operate on the full array row, including its trailing comma/newline.
function findArrayItemRangeEnd(source, valueEnd) {
  let cursor = valueEnd;
  while (source[cursor] === " " || source[cursor] === "\t") cursor += 1;
  if (source[cursor] === ",") cursor += 1;
  while (source[cursor] === " " || source[cursor] === "\t") cursor += 1;
  if (source[cursor] === "\r") cursor += 1;
  if (source[cursor] === "\n") cursor += 1;
  return cursor;
}

function makeArrayItemRanges(source, valueRanges) {
  return valueRanges.map((valueRange, index) => ({
    start: getLineStart(source, valueRange.start),
    end: index + 1 < valueRanges.length
      ? getLineStart(source, valueRanges[index + 1].start)
      : findArrayItemRangeEnd(source, valueRange.end),
  }));
}

function makeArrayItemOperation(type, itemRanges, index) {
  const range = itemRanges[index];
  return {
    type,
    range: compactRange(range),
    previous: compactRange(itemRanges[index - 1]),
    next: compactRange(itemRanges[index + 1]),
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

function addStringArrayEntries(entries, { sourceFile, source, range, idPrefix, labelPrefix, kind = "dialogue", field = "text", verify }) {
  const literals = collectStringLiteralsInArray(source, range);
  const itemRanges = kind === "dialogue" ? makeArrayItemRanges(source, literals) : [];
  literals.forEach((literal, index) => {
    const insert = kind === "dialogue" ? makeStringArrayInsert(source, literal) : null;
    const item = kind === "dialogue" ? makeArrayItemOperation("string-array-item", itemRanges, index) : null;
    pushLiteralEntry(entries, {
      id: `${idPrefix}:line-${index + 1}`,
      kind,
      label: `${labelPrefix} / Line ${index + 1}`,
      sourceFile,
      source,
      literal,
      field,
      valueType: kind === "dialogue" ? "multilineText" : "singleLineText",
      verify,
      insert,
      item,
    });
  });
}

function addObjectTextFields(entries, { sourceFile, source, objectRange, idPrefix, labelPrefix, fields, verify, insert, item }) {
  const properties = collectObjectLiteralProperties(source, objectRange);
  for (const field of fields) {
    const property = properties.find((candidate) => candidate.field === field && typeof candidate.value === "string");
    if (!property) continue;
    pushLiteralEntry(entries, {
      id: `${idPrefix}:${sanitizeIdPart(field.replace(/\./g, "-"), "field")}`,
      kind: fieldKind(field),
      label: `${labelPrefix} / ${field}`,
      sourceFile,
      source,
      literal: property,
      field,
      valueType: fieldKind(field) === "dialogue" ? "multilineText" : "singleLineText",
      verify,
      insert: field === "text" ? insert : null,
      item,
    });
  }
}

function addObjectNumericFields(entries, { sourceFile, source, objectRange, idPrefix, labelPrefix, include, verify }) {
  const properties = collectObjectLiteralProperties(source, objectRange);
  const seen = new Map();
  for (const property of properties) {
    if (typeof property.value !== "number") continue;
    if (include && !include(property)) continue;
    const baseSuffix = property.field === "weight"
      ? "weight"
      : `effect:${sanitizeIdPart(property.field.replace(/\./g, "-"), "number")}`;
    const count = (seen.get(baseSuffix) ?? 0) + 1;
    seen.set(baseSuffix, count);
    const suffix = count === 1 ? baseSuffix : `${baseSuffix}-${count}`;
    pushLiteralEntry(entries, {
      id: `${idPrefix}:${suffix}`,
      kind: "number",
      label: `${labelPrefix} / ${property.field}`,
      sourceFile,
      source,
      literal: property,
      field: property.field,
      valueType: "number",
      verify,
    });
  }
}

function addObjectArrayEntries(entries, { sourceFile, source, exportName, idPrefix, labelPrefix, textFields = [], includeNumbers, verify }) {
  const range = findExportConstInitializer(source, exportName);
  const objectRanges = collectTopLevelObjectRangesInArray(source, range);
  const itemRanges = makeArrayItemRanges(source, objectRanges);
  objectRanges.forEach((objectRange, index) => {
    const itemId = sanitizeIdPart(getFirstLiteralProperty(source, objectRange, "id")?.value, `${index + 1}`);
    const speaker = getFirstLiteralProperty(source, objectRange, "speaker")?.value;
    const insert = textFields.includes("text") && typeof speaker === "string"
      ? makeObjectArrayInsert(source, objectRange, { speaker })
      : null;
    const item = insert ? makeArrayItemOperation("object-array-item", itemRanges, index) : null;
    const itemPrefix = `${idPrefix}:${itemId}`;
    const itemLabel = `${labelPrefix} / ${itemId}`;
    addObjectTextFields(entries, {
      sourceFile,
      source,
      objectRange,
      idPrefix: itemPrefix,
      labelPrefix: itemLabel,
      fields: textFields,
      verify,
      insert,
      item,
    });
    if (includeNumbers) {
      addObjectNumericFields(entries, {
        sourceFile,
        source,
        objectRange,
        idPrefix: itemPrefix,
        labelPrefix: itemLabel,
        include: includeNumbers,
        verify,
      });
    }
  });
}

function buildRosenthalContentEntries(projectRoot, config) {
  let sourceFile = normalizeProjectPath(projectRoot, ROSENTHAL_DAY_CONTENT_FILE);
  let source = readUtf8Lf(projectRoot, sourceFile);
  const entries = [];

  addObjectArrayEntries(entries, {
    sourceFile,
    source,
    exportName: "DAY_CATEGORIES",
    idPrefix: "rosenthal:day-category",
    labelPrefix: "Rosenthal Day Category",
    textFields: ["label"],
    verify: config.verify,
  });

  const dayActionsRange = findExportConstInitializer(source, "DAY_ACTIONS");
  collectFunctionCallRanges(source, dayActionsRange, "day").forEach((call) => {
    const args = parseCallArguments(source, call.parenRange);
    const actionId = sanitizeIdPart(readArgumentLiteral(source, args[1])?.value, "day-action");
    const title = readArgumentLiteral(source, args[2]);
    const result = readArgumentLiteral(source, args[3]);
    const balance = readArgumentLiteral(source, args[5]);
    if (title) {
      pushLiteralEntry(entries, {
        id: `rosenthal:day-action:${actionId}:title`,
        kind: "scriptTitle",
        label: `Rosenthal Day Action / ${actionId} / Title`,
        sourceFile,
        source,
        literal: title,
        field: "title",
        verify: config.verify,
      });
    }
    if (result) {
      pushLiteralEntry(entries, {
        id: `rosenthal:day-action:${actionId}:result`,
        kind: "dialogue",
        label: `Rosenthal Day Action / ${actionId} / Result`,
        sourceFile,
        source,
        literal: result,
        field: "result",
        valueType: "multilineText",
        verify: config.verify,
      });
    }
    if (balance) {
      pushLiteralEntry(entries, {
        id: `rosenthal:day-action:${actionId}:balance`,
        kind: "balance",
        label: `Rosenthal Day Action / ${actionId} / Balance`,
        sourceFile,
        source,
        literal: balance,
        field: "balance",
        verify: config.verify,
      });
    }
  });

  sourceFile = normalizeProjectPath(projectRoot, ROSENTHAL_CHARACTER_CONTENT_FILE);
  source = readUtf8Lf(projectRoot, sourceFile);

  addObjectArrayEntries(entries, {
    sourceFile,
    source,
    exportName: "CORE_NPCS",
    idPrefix: "rosenthal:core-npc",
    labelPrefix: "Rosenthal Core NPC",
    textFields: ["label", "name", "relation"],
    verify: config.verify,
  });
  addObjectArrayEntries(entries, {
    sourceFile,
    source,
    exportName: "UNNAMED_COMPANIONS",
    idPrefix: "rosenthal:companion",
    labelPrefix: "Rosenthal Companion",
    textFields: ["label", "name", "reveal", "keepsake"],
    verify: config.verify,
  });

  sourceFile = normalizeProjectPath(projectRoot, ROSENTHAL_EXPLORATION_CONTENT_FILE);
  source = readUtf8Lf(projectRoot, sourceFile);

  addObjectArrayEntries(entries, {
    sourceFile,
    source,
    exportName: "DIRECTIONS",
    idPrefix: "rosenthal:direction",
    labelPrefix: "Rosenthal Direction",
    textFields: ["label", "text"],
    verify: config.verify,
  });

  const eventTitlesRange = findFirstObjectAfter(source, "EVENT_TITLES");
  for (const directionId of ["stairs", "archive", "waterway", "chapel"]) {
    const titlesRange = findPropertyValueRange(source, eventTitlesRange, directionId);
    if (!titlesRange) continue;
    collectStringLiteralsInArray(source, titlesRange).forEach((literal, index) => {
      pushLiteralEntry(entries, {
        id: `rosenthal:event-title:${directionId}:${index + 1}`,
        kind: "scriptTitle",
        label: `Rosenthal Exploration Event / ${directionId} / Title ${index + 1}`,
        sourceFile,
        source,
        literal,
        field: "title",
        verify: config.verify,
      });
    });
  }

  sourceFile = normalizeProjectPath(projectRoot, ROSENTHAL_FINALE_CONTENT_FILE);
  source = readUtf8Lf(projectRoot, sourceFile);

  const finalesRange = findExportConstInitializer(source, "FINALES");
  collectFunctionCallRanges(source, finalesRange, "finale").forEach((call) => {
    const args = parseCallArguments(source, call.parenRange);
    const finaleId = sanitizeIdPart(readArgumentLiteral(source, args[0])?.value, "finale");
    const title = readArgumentLiteral(source, args[3]);
    const text = readArgumentLiteral(source, args[4]);
    if (title) {
      pushLiteralEntry(entries, {
        id: `rosenthal:finale:${finaleId}:title`,
        kind: "scriptTitle",
        label: `Rosenthal Finale / ${finaleId} / Title`,
        sourceFile,
        source,
        literal: title,
        field: "title",
        verify: config.verify,
      });
    }
    if (text) {
      pushLiteralEntry(entries, {
        id: `rosenthal:finale:${finaleId}:text`,
        kind: "dialogue",
        label: `Rosenthal Finale / ${finaleId} / Text`,
        sourceFile,
        source,
        literal: text,
        field: "text",
        valueType: "multilineText",
        verify: config.verify,
      });
    }
  });

  sourceFile = normalizeProjectPath(projectRoot, ROSENTHAL_INTRO_CONTENT_FILE);
  source = readUtf8Lf(projectRoot, sourceFile);

  addStringArrayEntries(entries, {
    sourceFile,
    source,
    range: findExportConstInitializer(source, "PROLOGUE"),
    idPrefix: "rosenthal:prologue",
    labelPrefix: "Rosenthal Prologue",
    verify: config.verify,
  });
  addStringArrayEntries(entries, {
    sourceFile,
    source,
    range: findExportConstInitializer(source, "NIGHT_OPENING"),
    idPrefix: "rosenthal:night-opening",
    labelPrefix: "Rosenthal Night Opening",
    verify: config.verify,
  });

  const dayEightRange = findExportConstInitializer(source, "DAY_EIGHT_SCRIPTS");
  for (const route of ["normal", "altered"]) {
    const routeRange = findPropertyValueRange(source, dayEightRange, route);
    if (!routeRange) continue;
    addStringArrayEntries(entries, {
      sourceFile,
      source,
      range: routeRange,
      idPrefix: `rosenthal:day-eight:${route}`,
      labelPrefix: `Rosenthal Day Eight / ${route}`,
      verify: config.verify,
    });
  }

  return entries;
}

function buildTutorialContentEntries(projectRoot, config) {
  let sourceFile = normalizeProjectPath(projectRoot, TUTORIAL_INTRO_CONTENT_FILE);
  let source = readUtf8Lf(projectRoot, sourceFile);
  const entries = [];

  const prologueRange = findExportConstInitializer(source, "PROLOGUE");
  addObjectTextFields(entries, {
    sourceFile,
    source,
    objectRange: prologueRange,
    idPrefix: "tutorial:prologue",
    labelPrefix: "Tutorial Prologue",
    fields: ["tag", "title"],
    verify: config.verify,
  });

  // PROLOGUE.text and NIGHT_ENTRY_SCRIPT are runtime wrappers around
  // rosenthal/introContent.js text. Emit editable text entries from that file
  // only so one script line never appears as two separate edit targets.

  addObjectArrayEntries(entries, {
    sourceFile,
    source,
    exportName: "DAY_OPENING_SCRIPT",
    idPrefix: "tutorial:day-opening",
    labelPrefix: "Tutorial Day Opening",
    textFields: ["speaker", "text"],
    verify: config.verify,
  });
  addStringArrayEntries(entries, {
    sourceFile,
    source,
    range: findExportConstInitializer(source, "DAY_PERIODS"),
    idPrefix: "tutorial:day-period",
    labelPrefix: "Tutorial Day Period",
    kind: "label",
    field: "label",
    verify: config.verify,
  });

  const interludesRange = findExportConstInitializer(source, "DAY_INTERLUDES");
  collectTopLevelObjectRangesInArray(source, interludesRange).forEach((objectRange, index) => {
    const prefix = `tutorial:day-interlude:${index + 1}`;
    addObjectTextFields(entries, {
      sourceFile,
      source,
      objectRange,
      idPrefix: prefix,
      labelPrefix: `Tutorial Day Interlude / ${index + 1}`,
      fields: ["tag", "title", "button"],
      verify: config.verify,
    });
    const paragraphs = findPropertyValueRange(source, objectRange, "paragraphs");
    if (paragraphs) {
      addStringArrayEntries(entries, {
        sourceFile,
        source,
        range: paragraphs,
        idPrefix: `${prefix}:paragraph`,
        labelPrefix: `Tutorial Day Interlude / ${index + 1} / Paragraph`,
        field: "paragraph",
        verify: config.verify,
      });
    }
  });

  sourceFile = normalizeProjectPath(projectRoot, TUTORIAL_ENDING_CONTENT_FILE);
  source = readUtf8Lf(projectRoot, sourceFile);

  const endingsRange = findExportConstInitializer(source, "ENDINGS");
  for (const ending of collectTopLevelObjectValues(source, endingsRange)) {
    const prefix = `tutorial:ending:${sanitizeIdPart(ending.key, "ending")}`;
    addObjectTextFields(entries, {
      sourceFile,
      source,
      objectRange: ending.range,
      idPrefix: prefix,
      labelPrefix: `Tutorial Ending / ${ending.key}`,
      fields: ["tag", "title", "subtitle"],
      verify: config.verify,
    });
    const paragraphs = findPropertyValueRange(source, ending.range, "paragraphs");
    if (paragraphs) {
      addStringArrayEntries(entries, {
        sourceFile,
        source,
        range: paragraphs,
        idPrefix: `${prefix}:paragraph`,
        labelPrefix: `Tutorial Ending / ${ending.key} / Paragraph`,
        field: "paragraph",
        verify: config.verify,
      });
    }
  }

  const includeTutorialNumber = (property) => (
    property.field === "weight"
    || ["affinities", "traits", "stats", "resources", "estate", "requires"].includes(property.path[0])
  );

  sourceFile = normalizeProjectPath(projectRoot, TUTORIAL_DAY_ACTION_CONTENT_FILE);
  source = readUtf8Lf(projectRoot, sourceFile);

  addObjectArrayEntries(entries, {
    sourceFile,
    source,
    exportName: "DAY_ACTIONS",
    idPrefix: "tutorial:day-action",
    labelPrefix: "Tutorial Day Action",
    textFields: ["title", "result"],
    includeNumbers: includeTutorialNumber,
    verify: config.verify,
  });

  sourceFile = normalizeProjectPath(projectRoot, TUTORIAL_NIGHT_CHOICE_CONTENT_FILE);
  source = readUtf8Lf(projectRoot, sourceFile);

  addObjectArrayEntries(entries, {
    sourceFile,
    source,
    exportName: "NIGHT_CHOICES",
    idPrefix: "tutorial:night-choice",
    labelPrefix: "Tutorial Night Choice",
    textFields: ["title", "target", "result"],
    includeNumbers: includeTutorialNumber,
    verify: config.verify,
  });

  sourceFile = normalizeProjectPath(projectRoot, TUTORIAL_ENDING_CONTENT_FILE);
  source = readUtf8Lf(projectRoot, sourceFile);

  addObjectArrayEntries(entries, {
    sourceFile,
    source,
    exportName: "WORKER_NAME_CHOICES",
    idPrefix: "tutorial:worker-name-choice",
    labelPrefix: "Tutorial Worker Name Choice",
    textFields: ["title", "result"],
    includeNumbers: includeTutorialNumber,
    verify: config.verify,
  });

  const forfeitRange = findExportConstInitializer(source, "FORFEIT_RESULTS");
  for (const property of collectObjectLiteralProperties(source, forfeitRange)) {
    if (property.path.length !== 1 || typeof property.value !== "string") continue;
    pushLiteralEntry(entries, {
      id: `tutorial:forfeit:${sanitizeIdPart(property.field, "result")}`,
      kind: "dialogue",
      label: `Tutorial Forfeit / ${property.field}`,
      sourceFile,
      source,
      literal: property,
      field: property.field,
      valueType: "multilineText",
      verify: config.verify,
    });
  }

  return entries;
}

function addMetaObjectEntries(entries, { sourceFile, source, exportName, idPrefix, labelPrefix, fields, verify }) {
  const range = findExportConstInitializer(source, exportName);
  for (const item of collectTopLevelObjectValues(source, range)) {
    addObjectTextFields(entries, {
      sourceFile,
      source,
      objectRange: item.range,
      idPrefix: `${idPrefix}:${sanitizeIdPart(item.key, "item")}`,
      labelPrefix: `${labelPrefix} / ${item.key}`,
      fields,
      verify,
    });
  }
}

function buildSystemContentEntries(projectRoot, config) {
  let sourceFile = normalizeProjectPath(projectRoot, SYSTEM_META_CONTENT_FILE);
  let source = readUtf8Lf(projectRoot, sourceFile);
  const entries = [];

  for (const exportName of ["RESOURCE_META", "STAT_META", "TRAIT_META", "HORROR_TRAIT_META", "HORROR_DERIVED_META"]) {
    addMetaObjectEntries(entries, {
      sourceFile,
      source,
      exportName,
      idPrefix: `rules:${exportName.toLowerCase().replaceAll("_", "-")}`,
      labelPrefix: exportName,
      fields: ["label", "detail", "stat", "icon"],
      verify: config.verify,
    });
  }

  sourceFile = normalizeProjectPath(projectRoot, SYSTEM_ROLE_CONTENT_FILE);
  source = readUtf8Lf(projectRoot, sourceFile);

  addObjectArrayEntries(entries, {
    sourceFile,
    source,
    exportName: "JOBS",
    idPrefix: "rules:job",
    labelPrefix: "Rules Job",
    textFields: ["name", "title"],
    verify: config.verify,
  });
  addObjectArrayEntries(entries, {
    sourceFile,
    source,
    exportName: "TITLES",
    idPrefix: "rules:title",
    labelPrefix: "Rules Title",
    textFields: ["name", "description"],
    verify: config.verify,
  });

  sourceFile = normalizeProjectPath(projectRoot, SYSTEM_MARK_UNLOCK_CONTENT_FILE);
  source = readUtf8Lf(projectRoot, sourceFile);

  const loadoutRange = findExportConstInitializer(source, "MARK_LOADOUT_LIMIT");
  const loadoutLiteral = readLiteralAt(source, loadoutRange.start, loadoutRange.end);
  if (loadoutLiteral) {
    pushLiteralEntry(entries, {
      id: "rules:mark-loadout-limit",
      kind: "number",
      label: "Rules / Mark Loadout Limit",
      sourceFile,
      source,
      literal: loadoutLiteral,
      field: "MARK_LOADOUT_LIMIT",
      valueType: "number",
      verify: config.verify,
    });
  }

  const unlocksRange = findExportConstInitializer(source, "MARK_BRANCH_UNLOCKS");
  collectTopLevelObjectRangesInArray(source, unlocksRange).forEach((objectRange, index) => {
    const unlockId = sanitizeIdPart(getFirstLiteralProperty(source, objectRange, "id")?.value, `${index + 1}`);
    addObjectTextFields(entries, {
      sourceFile,
      source,
      objectRange,
      idPrefix: `rules:mark-branch-unlock:${unlockId}`,
      labelPrefix: `Rules Mark Branch Unlock / ${unlockId}`,
      fields: ["label"],
      verify: config.verify,
    });
    for (const property of collectObjectLiteralProperties(source, objectRange)) {
      if (property.path[0] !== "condition" || typeof property.value !== "number") continue;
      const conditionKey = sanitizeIdPart(property.path.at(-1), "value");
      pushLiteralEntry(entries, {
        id: `rules:mark-branch-unlock:${unlockId}:condition:${conditionKey}`,
        kind: "number",
        label: `Rules Mark Branch Unlock / ${unlockId} / condition.${property.path.at(-1)}`,
        sourceFile,
        source,
        literal: property,
        field: property.field,
        valueType: "number",
        verify: config.verify,
      });
    }
  });

  sourceFile = normalizeProjectPath(projectRoot, SYSTEM_AFFINITY_MARK_CONTENT_FILE);
  source = readUtf8Lf(projectRoot, sourceFile);

  const affinityGroupsRange = findExportConstInitializer(source, "AFFINITY_MARK_GROUPS");
  collectTopLevelObjectRangesInArray(source, affinityGroupsRange).forEach((groupRange, groupIndex) => {
    const affinity = sanitizeIdPart(getFirstLiteralProperty(source, groupRange, "affinity")?.value, `${groupIndex + 1}`);
    const capstone = collectObjectLiteralProperties(source, groupRange).find((property) => property.field === "capstoneCount");
    if (capstone) {
      pushLiteralEntry(entries, {
        id: `rules:affinity-mark-group:${affinity}:capstone-count`,
        kind: "number",
        label: `Rules Affinity Mark Group / ${affinity} / capstoneCount`,
        sourceFile,
        source,
        literal: capstone,
        field: "capstoneCount",
        valueType: "number",
        verify: config.verify,
      });
    }
    for (const kind of ["stigma", "brand"]) {
      const arrayRange = findPropertyValueRange(source, groupRange, kind);
      if (!arrayRange) continue;
      collectTopLevelObjectRangesInArray(source, arrayRange).forEach((markRange, markIndex) => {
        addObjectTextFields(entries, {
          sourceFile,
          source,
          objectRange: markRange,
          idPrefix: `rules:affinity-mark:${affinity}:${kind}:${markIndex + 1}`,
          labelPrefix: `Rules Affinity Mark / ${affinity} / ${kind} / ${markIndex + 1}`,
          fields: ["name", "tier"],
          verify: config.verify,
        });
      });
    }
  });

  sourceFile = normalizeProjectPath(projectRoot, SYSTEM_STANDALONE_MARK_CONTENT_FILE);
  source = readUtf8Lf(projectRoot, sourceFile);

  addObjectArrayEntries(entries, {
    sourceFile,
    source,
    exportName: "STANDALONE_MARKS",
    idPrefix: "rules:standalone-mark",
    labelPrefix: "Rules Standalone Mark",
    textFields: ["name", "description", "codexText", "sourceHint"],
    includeNumbers: (property) => ["carryEffect", "equipEffect", "unlockCondition"].includes(property.path[0]),
    verify: config.verify,
  });

  sourceFile = normalizeProjectPath(projectRoot, SYSTEM_ROLE_CONTENT_FILE);
  source = readUtf8Lf(projectRoot, sourceFile);

  addObjectArrayEntries(entries, {
    sourceFile,
    source,
    exportName: "PASSIVES",
    idPrefix: "rules:passive",
    labelPrefix: "Rules Passive",
    textFields: ["name", "description"],
    verify: config.verify,
  });

  sourceFile = normalizeProjectPath(projectRoot, SYSTEM_HIDDEN_RULE_CONTENT_FILE);
  source = readUtf8Lf(projectRoot, sourceFile);

  const hiddenRulesRange = findExportConstInitializer(source, "HIDDEN_RUN_RULES");
  for (const field of ["flaw", "taboo"]) {
    const arrayRange = findPropertyValueRange(source, hiddenRulesRange, field);
    if (!arrayRange) continue;
    collectStringLiteralsInArray(source, arrayRange).forEach((literal, index) => {
      pushLiteralEntry(entries, {
        id: `rules:hidden-run-rule:${field}:${index + 1}`,
        kind: "dialogue",
        label: `Rules Hidden Run Rule / ${field} / ${index + 1}`,
        sourceFile,
        source,
        literal,
        field,
        valueType: "multilineText",
        verify: config.verify,
      });
    });
  }

  return entries;
}

function assertUniqueEntryIds(entries) {
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.id)) throw new Error(`Duplicate script edit entry id: ${entry.id}`);
    seen.add(entry.id);
  }
}

export async function buildScriptEditIndex(projectRoot) {
  const config = ensureScriptEditConfig(projectRoot);
  const entries = [
    ...buildManifestEntries(projectRoot, config),
    ...buildSpecialEventEntries(projectRoot, config),
    ...buildRosenthalContentEntries(projectRoot, config),
    ...buildTutorialContentEntries(projectRoot, config),
    ...buildSystemContentEntries(projectRoot, config),
  ];
  assertUniqueEntryIds(entries);
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
