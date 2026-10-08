import {
  EFFECT_ORDER,
  RESOURCE_META,
  STAT_META,
  TRAIT_META,
  TRAIT_STAT_KEYS,
  HORROR_TRAIT_META,
  HORROR_DERIVED_META,
  JOBS,
  TITLES,
  MARK_LOADOUT_LIMIT,
  MARK_BRANCH_UNLOCKS,
  AFFINITY_MARK_GROUPS,
  STANDALONE_MARKS,
  LEGACY_STIGMA_MARK_MAP,
  PASSIVES,
  HIDDEN_RUN_RULES,
} from "../data/systemContent.js";

export {
  EFFECT_ORDER,
  RESOURCE_META,
  STAT_META,
  TRAIT_META,
  TRAIT_STAT_KEYS,
  HORROR_TRAIT_META,
  HORROR_DERIVED_META,
  JOBS,
  TITLES,
  MARK_LOADOUT_LIMIT,
  MARK_BRANCH_UNLOCKS,
  AFFINITY_MARK_GROUPS,
  STANDALONE_MARKS,
  LEGACY_STIGMA_MARK_MAP,
  PASSIVES,
  HIDDEN_RUN_RULES,
} from "../data/systemContent.js";

function createMarkEffect(affinity, tier = "base") {
  const statKey = TRAIT_STAT_KEYS[affinity];
  const isCapstone = tier === "capstone";
  if (tier === "neutral") {
    return {
      carryEffect: { chance: isCapstone ? 1.2 : 0.7 },
      equipEffect: { chance: isCapstone ? 4 : 2 },
    };
  }
  return {
    carryEffect: {
      stat: { key: statKey, value: isCapstone ? 0.5 : 0.25 },
      chance: isCapstone ? 1.1 : 0.5,
    },
    equipEffect: {
      stat: { key: statKey, value: isCapstone ? 1.4 : 0.8 },
      chance: isCapstone ? 6 : 3,
    },
  };
}

function createMark(group, kind, index, entry) {
  const markEntry = entry ?? {};
  const tier = markEntry.tier || (index === 2 ? "capstone" : index === 1 ? "neutral" : "base");
  const isCapstone = tier === "capstone";
  const neutral = tier === "neutral";
  const effects = createMarkEffect(group.affinity, tier);
  const affinityLabel = TRAIT_META[group.affinity].label;
  const kindLabel = kind === "stigma" ? "성흔" : "낙인";
  const name = markEntry.name ?? group[kind]?.[index] ?? `${group.affinity}-${kind}-${index + 1}`;
  const codexText = markEntry.codexText ?? (
    neutral
      ? `${name}. 어느 쪽으로도 기울지 않은 ${affinityLabel}의 흔적이다.`
      : isCapstone
        ? `${name}. 오래 쌓인 ${affinityLabel}의 선택이 굳어 남았다.`
        : `${name}. ${affinityLabel}에 기운 선택이 남긴 흔적이다.`
  );
  const sourceHint = markEntry.sourceHint ?? (
    isCapstone
      ? `${kindLabel} ${group.capstoneCount}개를 모은 뒤 ${affinityLabel} 성향이 강한 선택에서 발견할 수 있다.`
      : `${affinityLabel} 성향이 강한 선택에서 발견할 수 있다.`
  );
  const tags = [
    `affinity:${group.affinity}`,
    `kind:${kind}`,
    `tier:${tier}`,
    neutral ? "polarity:neutral" : "polarity:route",
  ];
  const obtainConditions = isCapstone ? [{ kind: "markCountMin", key: kind, value: group.capstoneCount }] : [];
  return {
    id: `${kind}-${group.affinity}-${index + 1}`,
    kind,
    category: "affinity",
    affinity: group.affinity,
    name,
    tier,
    polarity: neutral ? "neutral" : "route",
    tags,
    description: `${TRAIT_META[group.affinity].label} 선택에 반응한다. ${neutral ? "중립 효과는 루트 반전에 흔들리지 않는다." : "루트가 뒤집히면 이득과 손해가 반전된다."}`,
    codexText,
    sourceHint,
    obtainConditions,
    unlockCondition: isCapstone ? { kind, count: group.capstoneCount } : null,
    branchUnlocks: isCapstone ? [group.branch[kind]] : [],
    ...effects,
  };
}

export const MARKS = [
  ...AFFINITY_MARK_GROUPS.flatMap((group) => [
    ...group.stigma.map((entry, index) => createMark(group, "stigma", index, entry)),
    ...group.brand.map((entry, index) => createMark(group, "brand", index, entry)),
  ]),
  ...STANDALONE_MARKS,
];

export function getMark(markId) {
  return MARKS.find((mark) => mark.id === markId);
}

export function getMarkCounts(markIds = []) {
  return markIds.reduce((counts, markId) => {
    const mark = getMark(markId);
    if (!mark) return counts;
    counts.total += 1;
    counts[mark.kind] += 1;
    if (mark.affinity != null) {
      counts.affinity[mark.affinity] = (counts.affinity[mark.affinity] ?? 0) + 1;
    }
    return counts;
  }, { total: 0, stigma: 0, brand: 0, affinity: {} });
}

function asNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function hasKeyedConditionValue(condition, keys = ["key", "id", "route", "routeId", "eventId", "markKind", "branchId"]) {
  for (const key of keys) {
    if (condition[key] != null) return condition[key];
  }
  return null;
}

function hasValueCondition(condition, fallback = "value") {
  if (condition[fallback] != null) return condition[fallback];
  if (condition.min != null) return condition.min;
  if (condition.count != null) return condition.count;
  if (condition.threshold != null) return condition.threshold;
  return null;
}

function getUnlockedBranchConditionMet(condition, unlocks) {
  const branch = hasKeyedConditionValue(condition, ["branch", "branchId", "id"]);
  if (!branch) return false;
  return (unlocks ?? []).includes(branch);
}

function getMarkCountConditionMet(condition, markCounts) {
  const key = hasKeyedConditionValue(condition, ["key", "markKind", "kind"]);
  if (!key) return false;
  const value = asNumber(hasValueCondition(condition, "value"));
  return (markCounts[key] ?? 0) >= value;
}

export function isMarkConditionMet(condition, game = {}, meta = {}, options = {}) {
  if (!condition || typeof condition !== "object") return true;
  const kind = condition.kind;
  const gameStats = game.stats ?? {};
  const gameTraits = game.traits ?? {};
  const gameResources = game.resources ?? {};
  const gameEstate = game.estate ?? {};
  const eventSeen = new Set([...(game.eventSeen ?? []), ...(game.meta?.eventSeen ?? [])].filter(Boolean));
  const gameEndings = { ...(meta?.endingRecords ?? {}), ...(game.meta?.endingRecords ?? {}) };
  const unlockedBranches = new Set([...(meta?.unlockedBranchKeys ?? []), ...(game.meta?.unlockedBranchKeys ?? []), ...getUnlockedBranchKeys(game.meta?.ownedMarkIds ?? [], game)]);

  switch (kind) {
    case "statMin": {
      const key = hasKeyedConditionValue(condition);
      const value = asNumber(hasValueCondition(condition));
      return asNumber(gameStats[key]) >= value;
    }
    case "statMax": {
      const key = hasKeyedConditionValue(condition);
      const value = asNumber(hasValueCondition(condition));
      return asNumber(gameStats[key]) <= value;
    }
    case "traitMin": {
      const key = hasKeyedConditionValue(condition);
      const value = asNumber(hasValueCondition(condition));
      return asNumber(gameTraits[key]) >= value;
    }
    case "traitMax": {
      const key = hasKeyedConditionValue(condition);
      const value = asNumber(hasValueCondition(condition));
      return asNumber(gameTraits[key]) <= value;
    }
    case "resourceMin": {
      const key = hasKeyedConditionValue(condition);
      const value = asNumber(hasValueCondition(condition));
      return asNumber(gameResources[key]) >= value;
    }
    case "resourceMax": {
      const key = hasKeyedConditionValue(condition);
      const value = asNumber(hasValueCondition(condition));
      return asNumber(gameResources[key]) <= value;
    }
    case "estateMin": {
      const key = hasKeyedConditionValue(condition);
      const value = asNumber(hasValueCondition(condition));
      return asNumber(gameEstate[key]) >= value;
    }
    case "estateMax": {
      const key = hasKeyedConditionValue(condition);
      const value = asNumber(hasValueCondition(condition));
      return asNumber(gameEstate[key]) <= value;
    }
    case "eventSeen": {
      const eventId = hasKeyedConditionValue(condition);
      return eventSeen.has(eventId);
    }
    case "judgmentMet": {
      const judgmentId = hasKeyedConditionValue(condition);
      return Boolean(game.meta?.judgments?.[judgmentId] ?? game.truthFlags?.[judgmentId]);
    }
    case "endingSeen": {
      const endingId = hasKeyedConditionValue(condition);
      if (!endingId) return false;
      if (gameEndings[endingId]) return true;
      return Object.values(gameEndings).some((record) => record?.endingId === endingId || record?.id === endingId);
    }
    case "cycleMin": {
      const value = asNumber(hasValueCondition(condition));
      return asNumber(meta?.cycle ?? game.meta?.cycle ?? game.cycle) >= value;
    }
    case "routeIs": {
      const route = (hasKeyedConditionValue(condition, ["route", "key"]) ?? "").toString();
      return (game.route ?? meta?.route ?? null) === route;
    }
    case "routeNot": {
      const route = (hasKeyedConditionValue(condition, ["route", "key"]) ?? "").toString();
      return (game.route ?? meta?.route ?? null) !== route;
    }
    case "markCountMin": {
      const markCounts = getMarkCounts(meta?.ownedMarkIds ?? options?.markIds ?? []);
      return getMarkCountConditionMet(condition, markCounts);
    }
    case "branchUnlocked": {
      return getUnlockedBranchConditionMet(condition, [...unlockedBranches]);
    }
    case "antiCheatStatMax": {
      const key = hasKeyedConditionValue(condition);
      const value = asNumber(hasValueCondition(condition));
      return asNumber(gameStats[key]) <= value;
    }
    case "markCount":
      return getMarkCountConditionMet(condition, getMarkCounts(meta?.ownedMarkIds ?? options?.markIds ?? []));
    default:
      return false;
  }
}

export function isMarkObtainable(mark, game = {}, meta = {}) {
  if (!mark) return false;
  const rawConditions = mark.obtainConditions;
  const conditions = Array.isArray(rawConditions) ? rawConditions : (Array.isArray(rawConditions?.conditions) ? rawConditions.conditions : []);
  if (!conditions.length) return true;
  const mode = (rawConditions?.mode ?? "all").toString();
  const resolvedMeta = { ...meta, ...(game.meta ?? {}) };
  const evaluate = (condition) => isMarkConditionMet(condition, game, resolvedMeta, { markIds: resolvedMeta?.ownedMarkIds ?? [] });
  if (mode === "any") return conditions.some(evaluate);
  return conditions.every(evaluate);
}

export function getMarkBranchLabel(branchKey) {
  const countUnlock = MARK_BRANCH_UNLOCKS.find((unlock) => unlock.id === branchKey);
  if (countUnlock) return countUnlock.label;
  const affinityGroup = AFFINITY_MARK_GROUPS.find((group) => (
    group.branch.stigma === branchKey || group.branch.brand === branchKey
  ));
  if (!affinityGroup) return branchKey;
  const kindLabel = affinityGroup.branch.stigma === branchKey ? "성흔" : "낙인";
  return `${TRAIT_META[affinityGroup.affinity].label} ${kindLabel} 분기`;
}

export function getMarkBranchProgress(markIds = []) {
  const counts = getMarkCounts(markIds);
  return MARK_BRANCH_UNLOCKS.map((unlock) => {
    const requirements = Object.entries(unlock.condition).map(([key, required]) => {
      const current = Math.min(counts[key] ?? 0, required);
      return { key, current, required, remaining: Math.max(0, required - current) };
    });
    const remaining = requirements.reduce((sum, requirement) => sum + requirement.remaining, 0);
    return {
      ...unlock,
      requirements,
      remaining,
      unlocked: remaining === 0,
    };
  });
}

export function getUnlockedBranchKeys(markIds = []) {
  const countUnlocks = getMarkBranchProgress(markIds)
    .filter((unlock) => unlock.unlocked)
    .map((unlock) => unlock.id);
  const markUnlocks = markIds
    .map((markId) => getMark(markId))
    .flatMap((mark) => mark?.branchUnlocks ?? []);
  return [...new Set([...countUnlocks, ...markUnlocks])];
}

export function isMarkCollectionUnlocked(mark, markIds = []) {
  if (!mark?.unlockCondition) return true;
  const counts = getMarkCounts(markIds);
  const targetKind = mark.unlockCondition.kind === "total" ? "total" : mark.unlockCondition.kind;
  const currentValue = (counts[targetKind] ?? 0) - (markIds.includes(mark.id) && (mark.kind === targetKind || targetKind === "total") ? 1 : 0);
  const required = asNumber(mark.unlockCondition.count ?? mark.unlockCondition.value);
  return currentValue >= required;
}

export function isMarkCollectionUnlockedForCandidate(mark, markIds = []) {
  if (!mark?.unlockCondition) return true;
  const counts = getMarkCounts(markIds);
  const targetKind = mark.unlockCondition.kind === "total" ? "total" : mark.unlockCondition.kind;
  const currentValue = (counts[targetKind] ?? 0) + (markIds.includes(mark.id) ? -1 : 1);
  const required = asNumber(mark.unlockCondition.count ?? mark.unlockCondition.value);
  return currentValue >= required;
}
