export function readStringLiteral(source, quoteIndex) {
  const quote = source[quoteIndex];
  if (quote !== "\"" && quote !== "'") throw new Error(`Expected string literal at ${quoteIndex}`);
  let value = "";
  for (let index = quoteIndex + 1; index < source.length; index += 1) {
    const char = source[index];
    if (char === "\\") {
      const escaped = source.slice(index, index + 2).replace(/"/g, "\\\"");
      value += JSON.parse(`"${escaped}"`);
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
