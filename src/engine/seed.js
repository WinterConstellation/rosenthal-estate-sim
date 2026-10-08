export function createRunSeed() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function seededValue(seed) {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0) / 4294967296;
}

export function seededPick(items, seed) {
  return items[Math.floor(seededValue(seed) * items.length) % items.length];
}

export function seededRank(items, seed, score = () => 0) {
  return [...items].sort(
    (left, right) =>
      score(right) +
      seededValue(`${seed}:${right.id}`) * 10 -
      (score(left) + seededValue(`${seed}:${left.id}`) * 10),
  );
}

