import {
  EFFECT_ORDER,
  HIDDEN_RUN_RULES,
  JOBS,
  MARK_LOADOUT_LIMIT,
  MARKS,
  PASSIVES,
  STAT_META,
  TITLES,
  TRAIT_META,
  TRAIT_STAT_KEYS,
  getMark,
  isMarkCollectionUnlockedForCandidate,
  isMarkObtainable,
} from "../rules/systemRules.js";
import { DAY_ACTIONS, NIGHT_CHOICES } from "../rules/tutorialRules.js";
import { createRunSeed, seededPick, seededRank, seededValue } from "./seed.js";

const EMPTY_TRAITS = Object.fromEntries(Object.keys(TRAIT_META).map((key) => [key, 0]));

const CHANCE_PENALTY_PHASES = new Set(["night", "event"]);
const MIN_SEED_GROWTH_MULTIPLIER = 0.1;
const MAX_SEED_GROWTH_MULTIPLIER = 2;
const MARK_LOADOUT_STAT_CAP = 3;
const MARK_LOADOUT_CHANCE_CAP = 12;
const MARK_EQUIPPED_CHANCE_CAP = 8;

function asNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function roundToTenth(value) {
  return Math.round(asNumber(value) * 10) / 10;
}

export function truncateToTenth(value) {
  return Math.trunc(asNumber(value) * 10) / 10;
}

function clampNumber(value, lower, upper) {
  return Math.min(Math.max(value, lower), upper);
}

function positiveNumber(value) {
  return Math.max(asNumber(value), 0);
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function getMarkRouteSign(game, mark) {
  if (!mark || mark.polarity === "neutral") return 1;
  const favoredKind = game?.route === "altered" ? "brand" : "stigma";
  return mark.kind === favoredKind ? 1 : -1;
}

function markMatchesChoice(mark, choice = {}) {
  if (!mark) return false;
  if (mark.affinity == null) return true;
  const traitValue = choice.traits?.[mark.affinity]
    ?? choice.success?.traits?.[mark.affinity]
    ?? choice.effects?.traits?.[mark.affinity]
    ?? 0;
  if (traitValue > 0) return true;
  if (choice.category === mark.affinity) return true;
  if (isDangerChoice(choice) && ["execution", "knight", "exorcism", "suspicion"].includes(mark.affinity)) return true;
  return false;
}

function getActiveMarkEntries(game = {}, choice = {}) {
  const equippedMarkId = Object.prototype.hasOwnProperty.call(game, "equippedMarkId")
    ? game.equippedMarkId
    : game.meta?.equippedMarkId ?? null;
  const loadoutMarkIds = uniqueValues(game.loadoutMarkIds ?? game.meta?.loadoutMarkIds ?? [])
    .filter((id) => id !== equippedMarkId)
    .slice(0, MARK_LOADOUT_LIMIT);
  const loadout = loadoutMarkIds
    .map((id) => getMark(id))
    .filter((mark) => markMatchesChoice(mark, choice))
    .map((mark) => ({
      mark,
      effect: mark.carryEffect ?? {},
      slot: "loadout",
      sign: getMarkRouteSign(game, mark),
    }));
  const equippedMark = getMark(equippedMarkId);
  const equipped = equippedMark && markMatchesChoice(equippedMark, choice)
    ? [{
        mark: equippedMark,
        effect: equippedMark.equipEffect ?? {},
        slot: "equipped",
        sign: getMarkRouteSign(game, equippedMark),
      }]
    : [];
  return [...loadout, ...equipped];
}

function getMarkChanceAdjustment(game, choice) {
  let loadout = 0;
  let equipped = 0;
  getActiveMarkEntries(game, choice).forEach((entry) => {
    const value = asNumber(entry.effect.chance) * entry.sign;
    if (entry.slot === "equipped") equipped += value;
    else loadout += value;
  });
  return roundToTenth(
    clampNumber(loadout, -MARK_LOADOUT_CHANCE_CAP, MARK_LOADOUT_CHANCE_CAP)
    + clampNumber(equipped, -MARK_EQUIPPED_CHANCE_CAP, MARK_EQUIPPED_CHANCE_CAP),
  );
}

function addDelta(target, key, value) {
  if (!key || value === 0) return;
  target[key] = (target[key] ?? 0) + value;
}

function applyMarkOutcomeEffects(game, choice, deltas, trace) {
  const loadoutStatDelta = {};
  const equippedStatDelta = {};
  let loadoutApplied = 0;
  let equippedLabel = null;

  getActiveMarkEntries(game, choice).forEach((entry) => {
    const { effect, mark, sign, slot } = entry;
    const statEffect = effect.stat;
    if (statEffect?.key) {
      const target = slot === "equipped" ? equippedStatDelta : loadoutStatDelta;
      addDelta(target, statEffect.key, asNumber(statEffect.value) * sign);
    }
    Object.entries(effect.resources ?? {}).forEach(([key, value]) => addDelta(deltas.resourceDelta, key, asNumber(value) * sign));
    Object.entries(effect.estate ?? {}).forEach(([key, value]) => addDelta(deltas.estateDelta, key, asNumber(value) * sign));
    if (slot === "equipped") equippedLabel = mark.name;
    else loadoutApplied += 1;
  });

  Object.entries(loadoutStatDelta).forEach(([key, value]) => {
    addDelta(deltas.statDelta, key, clampNumber(value, -MARK_LOADOUT_STAT_CAP, MARK_LOADOUT_STAT_CAP));
  });
  Object.entries(equippedStatDelta).forEach(([key, value]) => addDelta(deltas.statDelta, key, value));

  if (loadoutApplied > 0) trace.push(`휴대 표식 · ${loadoutApplied}개`);
  if (equippedLabel) trace.push(`장착 표식 · ${equippedLabel}`);
}

function getEffectiveFearValue(game) {
  const horrorTraitTotal = Object.values(game?.horrorTraits ?? {}).reduce((sum, value) => sum + positiveNumber(value), 0);
  return positiveNumber(game?.resources?.fear) + horrorTraitTotal;
}

function getChoiceChancePressure(game) {
  return roundToTenth(getEffectiveFearValue(game) + positiveNumber(game?.estate?.corruption) * 3);
}

function shouldApplyChancePressure(game) {
  return CHANCE_PENALTY_PHASES.has(game?.phase);
}

function isDangerChoice(choice = {}) {
  return ["danger", "extreme", "lethal"].includes(choice.tone)
    || choice.lossRisk === true
    || Boolean(choice.intentionalLoss);
}

function getSeedRules(game) {
  return [game?.specialSeedTrait?.benefit, game?.specialSeedTrait?.burden].filter(Boolean);
}

function getSeedChanceAdjustment(game, choice, kind) {
  const rule = getSeedRules(game).find((item) => item.modifier?.kind === kind);
  if (!rule) return null;
  if (kind === "chance-pressure" && shouldApplyChancePressure(game) && getChoiceChancePressure(game) > 0) return rule;
  if (kind === "final-chance" && isDangerChoice(choice)) return rule;
  return null;
}

export function getEffectiveChoiceChance(game, baseChance, choice = {}) {
  if (baseChance == null) return null;
  let chancePercent = clampNumber(asNumber(baseChance) * 100, 0, 100);
  if ((game?.stats?.resolve ?? 0) < 0) chancePercent *= 0.5;
  if (shouldApplyChancePressure(game)) {
    const pressureRule = getSeedChanceAdjustment(game, choice, "chance-pressure");
    const pressureMultiplier = pressureRule?.modifier?.multiplier ?? 1;
    chancePercent -= getChoiceChancePressure(game) * pressureMultiplier;
  }
  chancePercent += getMarkChanceAdjustment(game, choice);
  const finalChanceRule = getSeedChanceAdjustment(game, choice, "final-chance");
  if (finalChanceRule) chancePercent *= finalChanceRule.modifier.multiplier;
  return Number((clampNumber(roundToTenth(chancePercent), 0, 100) / 100).toFixed(3));
}

function getSeedGrowthMultiplier(game, statKey) {
  const multiplier = asNumber(game?.specialSeedGrowthMultipliers?.[statKey], 1);
  return clampNumber(roundToTenth(multiplier), MIN_SEED_GROWTH_MULTIPLIER, MAX_SEED_GROWTH_MULTIPLIER);
}

function applySeedGrowthMultipliers(game, statDelta, trace) {
  Object.entries(statDelta).forEach(([key, value]) => {
    const amount = asNumber(value);
    if (amount > 0) {
      const multiplier = getSeedGrowthMultiplier(game, key);
      statDelta[key] = amount * multiplier;
      if (multiplier !== 1) {
        trace.push(`\uc2dc\ub4dc \u00b7 ${STAT_META[key]?.label ?? key} \uc131\uc7a5 x${multiplier.toFixed(1)}`);
      }
      return;
    }
    statDelta[key] = amount;
  });
}


function getTraitProgressLevel(meta, traitKey) {
  const level = Math.floor(asNumber(meta?.traitProgress?.[traitKey]?.level));
  return clampNumber(level, 0, 10);
}

function getStatTraitLevel(meta, statKey) {
  const statLabel = STAT_META[statKey]?.label;
  if (!statLabel) return 0;
  return Object.entries(TRAIT_META).reduce((sum, [traitKey, trait]) => (
    trait.stat === statLabel ? sum + getTraitProgressLevel(meta, traitKey) : sum
  ), 0);
}

function applyTraitLevelStatModifiers(game, statDelta, trace) {
  Object.entries(statDelta).forEach(([key, value]) => {
    const amount = asNumber(value);
    const level = getStatTraitLevel(game?.meta, key);
    if (amount === 0 || level <= 0) {
      statDelta[key] = amount;
      return;
    }
    const multiplier = roundToTenth(1 + level * 0.1);
    statDelta[key] = amount * multiplier;
    trace.push("성향 레벨 · " + (STAT_META[key]?.label ?? key) + " x" + multiplier.toFixed(1));
  });
}

const INVERTED_DELTA_KEYS = {
  resources: new Set(["fear"]),
  estate: new Set(["corruption", "missing"]),
};

function isBeneficialDelta(group, key, value) {
  if (value === 0) return false;
  return INVERTED_DELTA_KEYS[group]?.has(key) ? value < 0 : value > 0;
}

function isHarmfulDelta(group, key, value) {
  if (value === 0) return false;
  return !isBeneficialDelta(group, key, value);
}

function seedRuleMatches(rule, game, choice, success, deltas) {
  const trigger = rule?.trigger;
  if (!trigger) return false;
  if (trigger.kind === "category") return choice.category === trigger.value;
  if (trigger.kind === "phase-result") return game.phase === trigger.phase && success === trigger.success;
  if (trigger.kind === "night-result") return CHANCE_PENALTY_PHASES.has(game.phase) && success === trigger.success;
  if (trigger.kind === "danger-result") return isDangerChoice(choice) && success === trigger.success;
  if (trigger.kind === "negative-delta") return (deltas[trigger.group]?.[trigger.key] ?? 0) < 0;
  if (trigger.kind === "forfeit") return choice.isForfeit === true || choice.isRetreat === true;
  return false;
}

function applySeedDeltaRule(rule, deltas) {
  const modifier = rule?.modifier;
  if (!modifier || ["chance-pressure", "final-chance"].includes(modifier.kind)) return false;
  let applied = false;
  Object.entries(deltas).forEach(([group, delta]) => {
    Object.entries(delta).forEach(([key, value]) => {
      const matches = modifier.kind === "beneficial"
        ? isBeneficialDelta(group, key, value)
        : modifier.kind === "harmful"
          ? isHarmfulDelta(group, key, value)
          : modifier.kind === "specific-harmful"
            && group === modifier.group
            && key === modifier.key
            && isHarmfulDelta(group, key, value);
      if (!matches) return;
      delta[key] = value * modifier.multiplier;
      applied = true;
    });
  });
  return applied;
}

function applyConditionalSeedTraits(game, choice, success, deltas, trace) {
  getSeedRules(game).forEach((rule) => {
    if (!seedRuleMatches(rule, game, choice, success, deltas)) return;
    if (applySeedDeltaRule(rule, deltas)) trace.push(`성인의 달 · ${rule.text}`);
  });
}

function copyDeltaMaps(deltas) {
  return Object.fromEntries(Object.entries(deltas).map(([group, delta]) => [group, { ...delta }]));
}

function roundDeltaMaps(deltas) {
  Object.values(deltas).forEach((delta) => {
    Object.entries(delta).forEach(([key, value]) => {
      delta[key] = roundToTenth(value);
    });
  });
}

export function createInitialGame(seed = createRunSeed()) {
  const abundance = seededPick(HIDDEN_RUN_RULES.abundance, `${seed}:abundance`);
  const scarcityPool = HIDDEN_RUN_RULES.scarcity.filter((key) => key !== abundance);
  const scarcity = seededPick(scarcityPool, `${seed}:scarcity`);
  const resources = {
    food: 72,
    timber: 48,
    silver: 36,
    salt: 10,
    population: 51,
    faith: 24,
    fear: 0,
  };
  resources[abundance] += 18;
  resources[scarcity] = Math.max(resources[scarcity] - 8, 2);

  return {
    version: 9,
    runSeed: seed,
    hiddenRules: {
      flaw: seededPick(HIDDEN_RUN_RULES.flaw, `${seed}:flaw`),
      taboo: seededPick(HIDDEN_RUN_RULES.taboo, `${seed}:taboo`),
      abundance,
      scarcity,
    },
    phase: "prologue",
    step: 0,
    day: 1,
    resources,
    estate: {
      stability: 50,
      trust: 50,
      recordIntegrity: 50,
      corruption: 0,
      missing: 0,
    },
    traits: { ...EMPTY_TRAITS },
    stats: deriveStats(EMPTY_TRAITS),
    jobId: null,
    titles: [],
    ownedMarkIds: [],
    loadoutMarkIds: [],
    equippedMarkId: null,
    passiveIds: seededRank(PASSIVES, `${seed}:passives`).slice(0, 3).map((item) => item.id),
    chosenDayActionIds: [],
    unlockedNightChoiceIds: [],
    nightChoiceId: null,
    lostTarget: null,
    lostKind: null,
    playerMarked: false,
    rememberedWorker: false,
    affinities: {},
    stayedNonnegative: true,
    nightForfeitCount: 0,
    dayForfeitCount: 0,
    endingId: null,
    counters: { choices: 0, forfeits: 0, physicalDamage: 0 },
    assessments: { meaningful: 0, negative: 0 },
    nextTurn: {},
    ruleTrace: [],
    history: [],
    pendingResult: null,
    pendingGameOver: null,
    forcedReturn: null,
  };
}

export function clampMap(target, delta = {}, lower = 0, upper = 999) {
  const next = { ...target };
  Object.entries(delta).forEach(([key, value]) => {
    const current = asNumber(next[key]);
    const amount = asNumber(value);
    next[key] = roundToTenth(clampNumber(current + amount, lower, upper));
  });
  return next;
}

export function getCriticalState(stats, phase) {
  return {
    gameOver: stats.health < 0,
    forcedReturn: stats.stamina < 0
      ? phase === "day" ? "nightfall" : "daybreak"
      : null,
  };
}

export function deriveStats(traits, jobId) {
  const job = JOBS.find((item) => item.id === jobId);
  const stats = {
    health: 8 + Math.floor((traits.life + traits.knight) / 4),
    insight: 7 + Math.floor((traits.record + traits.mansion + traits.suspicion) / 6),
    resolve: 7 + Math.floor((traits.knight + traits.execution) / 4),
    charm: 8 + Math.floor((traits.trade + traits.life) / 4),
    faith: 4 + Math.floor((traits.divine + traits.exorcism) / 4),
    stamina: 10,
  };
  Object.entries(getJobStatDelta(job?.id)).forEach(([key, value]) => {
    stats[key] += value;
  });
  return stats;
}

export function getJobStatDelta(jobId) {
  if (jobId === "steward") return { charm: 2 };
  if (jobId === "house-reader") return { insight: 2 };
  if (jobId === "lay-exorcist") return { faith: 3 };
  if (jobId === "sword-bearer") return { resolve: 3 };
  if (jobId === "irregular-alchemist") return { insight: 1 };
  return {};
}

function isDivineBonusChoice(item) {
  if (item.heresy || (item.stats?.faith ?? 0) < 0) return false;
  return Boolean(
    item.divineBonus
    || (item.stats?.faith ?? 0) > 0
    || (item.traits?.divine ?? 0) > 0
    || (item.traits?.exorcism ?? 0) > 0,
  );
}

export function isChoiceAvailable(item, game) {
  if (game.stats.faith < 0 && isDivineBonusChoice(item)) return false;
  return Object.entries(item.requires ?? {}).every(([key, value]) => {
    if (key in STAT_META) return (game.stats[key] ?? 0) >= value;
    return (game.traits[key] ?? 0) >= value;
  });
}

function traitAffinity(item, game) {
  return Object.entries(item.traits ?? {}).reduce(
    (sum, [key, value]) => sum + Math.max(game.traits[key] ?? 0, 0) * Math.max(value, 0),
    0,
  );
}

export function getDayOffers(game) {
  const remaining = DAY_ACTIONS.filter((item) => !game.chosenDayActionIds.includes(item.id));
  const ranked = seededRank(
    remaining,
    `${game.runSeed}:day:${game.day}:${game.step}`,
    (item) => traitAffinity(item, game) + item.weight,
  );
  const count = Math.min(3 + Math.floor(seededValue(`${game.runSeed}:day-count:${game.day}:${game.step}`) * 3), ranked.length);
  return ranked.slice(0, count).map((item) => ({ ...item, available: isChoiceAvailable(item, game) }));
}

export function getNightOffers(game) {
  const ranked = seededRank(
    NIGHT_CHOICES,
    `${game.runSeed}:night:${game.day}`,
    (item) =>
      traitAffinity(item, game)
      + item.weight
      + (game.unlockedNightChoiceIds.includes(item.id) ? 100 : 0),
  );
  const count = 4 + Math.floor(seededValue(`${game.runSeed}:night-count:${game.day}`) * 2);
  return ranked.slice(0, count).map((item) => ({
    ...item,
    available: game.unlockedNightChoiceIds.includes(item.id) && isChoiceAvailable(item, game),
  }));
}

export function getJob(game) {
  if (game.jobId) return JOBS.find((job) => job.id === game.jobId);
  const ranked = [...JOBS]
    .filter((job) => job.focus.length > 0)
    .map((job) => ({
      ...job,
      score: job.focus.reduce((sum, key) => sum + (game.traits[key] ?? 0), 0),
    }))
    .sort((left, right) => right.score - left.score);
  return ranked[0]?.score > 0 ? ranked[0] : JOBS.find((job) => job.id === "unmarked-lord");
}

export function getTitles(game) {
  const ids = new Set(game.titles);
  if (game.phase === "ending") ids.add("accepted-lord");
  if (game.counters.forfeits >= 3) ids.add("hesitant");
  if (game.rememberedWorker) ids.add("remembered-worker");
  if (game.lostTarget === null && game.playerMarked) ids.add("barehand-survivor");
  return [...ids];
}

export function hasPeacefulLordEnding(game) {
  return game.day >= 7 && game.stayedNonnegative && game.nightForfeitCount === game.day;
}

function hasDelta(delta = {}) {
  return Object.values(delta).some((value) => value !== 0);
}

export function assessChoice(choice, resolved) {
  if (choice.isForfeit || choice.assessment === "negative") {
    return {
      id: "negative",
      label: "결정을 미룬 결과",
      script: "다른 사람들이 대신 결정했다.",
    };
  }
  if (choice.assessment === "stagnant") {
    return {
      id: "negative",
      label: "변화 없음",
      script: "이번 선택으로 달라진 것은 없다.",
    };
  }
  if (
    hasDelta(resolved.resourceDelta)
    || hasDelta(resolved.estateDelta)
    || hasDelta(resolved.traitDelta)
    || hasDelta(resolved.statDelta)
    || hasDelta(resolved.affinityDelta)
  ) {
    return {
      id: "meaningful",
      label: "선택 결과",
      script: "영지와 당신의 성향이 변했다.",
    };
  }
  return {
    id: "negative",
    label: "변화 없음",
    script: "이번 선택으로 달라진 것은 없다.",
  };
}

function getTopAffinity(game) {
  const ranked = Object.entries(TRAIT_META)
    .map(([key]) => ({ key, score: asNumber(game.traits?.[key]) }))
    .sort((left, right) => right.score - left.score);
  if ((ranked[0]?.score ?? 0) > 0) return ranked[0].key;
  if ((game.estate?.corruption ?? 0) >= 30) return "suspicion";
  if ((game.resources?.faith ?? 0) <= 10) return "divine";
  return "mansion";
}

function getPreferredMarkKind(game) {
  if (game.route === "altered") return "brand";
  if ((game.sacrificeCount ?? 0) >= 2) return "brand";
  if ((game.estate?.corruption ?? 0) >= 35) return "brand";
  if ((game.resources?.fear ?? 0) >= 45) return "brand";
  return "stigma";
}

export function deriveMark(game) {
  const ownedMarkIds = uniqueValues([...(game.meta?.ownedMarkIds ?? []), ...(game.ownedMarkIds ?? [])]);
  const preferredKind = getPreferredMarkKind(game);
  const preferredAffinity = getTopAffinity(game);
  const seed = `${game.runRngSeed ?? game.runSeed}:mark:${game.day}:${game.history?.length ?? 0}`;
  const pick = (kind, affinity) => {
    const candidates = MARKS.filter((mark) => (
      mark.kind === kind
      && (!affinity || mark.affinity === affinity)
      && !ownedMarkIds.includes(mark.id)
      && isMarkCollectionUnlockedForCandidate(mark, ownedMarkIds)
      && isMarkObtainable(mark, game, game.meta)
    ));
    return seededRank(candidates, `${seed}:${kind}:${affinity ?? "any"}`)[0] ?? null;
  };
  return pick(preferredKind, preferredAffinity)
    ?? pick(preferredKind)
    ?? pick(preferredKind === "stigma" ? "brand" : "stigma", preferredAffinity)
    ?? pick(preferredKind === "stigma" ? "brand" : "stigma")
    ?? null;
}

function applyPassive(passiveId, context, trace, slot) {
  const passive = PASSIVES.find((item) => item.id === passiveId);
  if (!passive) return;
  const { resourceDelta, estateDelta, choice } = context;
  let applied = false;
  if (passive.rule === "reduce-economic-loss") {
    ["food", "silver"].forEach((key) => {
      if ((resourceDelta[key] ?? 0) < 0) {
        resourceDelta[key] += 1;
        applied = true;
      }
    });
  }
  if (passive.rule === "reduce-mansion-corruption" && choice.traits?.mansion && (estateDelta.corruption ?? 0) > 0) {
    estateDelta.corruption -= 1;
    applied = true;
  }
  if (passive.rule === "reduce-salt-loss" && (resourceDelta.salt ?? 0) < 0) {
    resourceDelta.salt += 1;
    applied = true;
  }
  if (passive.rule === "reduce-danger-fear" && choice.tone === "lethal" && (resourceDelta.fear ?? 0) > 0) {
    resourceDelta.fear -= 1;
    applied = true;
  }
  if (passive.rule === "silver-to-corruption" && (resourceDelta.silver ?? 0) < 0) {
    resourceDelta.silver += 1;
    estateDelta.corruption = (estateDelta.corruption ?? 0) + 1;
    applied = true;
  }
  if (passive.rule === "boost-life-trust" && choice.traits?.life) {
    estateDelta.trust = (estateDelta.trust ?? 0) + 1;
    applied = true;
  }
  if (passive.rule === "boost-record-integrity" && choice.traits?.record) {
    estateDelta.recordIntegrity = (estateDelta.recordIntegrity ?? 0) + 1;
    applied = true;
  }
  if (passive.rule === "reduce-forfeit-stability" && choice.isForfeit && (estateDelta.stability ?? 0) < 0) {
    estateDelta.stability += 1;
    applied = true;
  }
  if (applied) trace.push(`${slot} · ${passive.name}`);
}

export function resolveChoice(game, choice) {
  const baseChance = choice.successChance;
  const effectiveChance = getEffectiveChoiceChance(game, baseChance, choice);
  const outcomeSeed = game.runSeed ?? game.runRngSeed ?? "run";
  const historyLength = game.history?.length ?? 0;
  const success = effectiveChance == null
    || seededValue(`${outcomeSeed}:outcome:${historyLength}:${choice.id}`) < effectiveChance;
  const outcome = success ? choice : { ...choice, ...(choice.failure ?? {}) };
  const resourceDelta = { ...(outcome.resources ?? {}) };
  const estateDelta = { ...(outcome.estate ?? {}) };
  const traitDelta = { ...(outcome.traits ?? {}) };
  const horrorTraitDelta = { ...(outcome.horrorTraits ?? {}) };
  const statDelta = { ...(outcome.stats ?? {}) };
  const affinityDelta = { ...(outcome.affinities ?? {}) };
  const trace = [];

  applyTraitLevelStatModifiers(game, statDelta, trace);

  if (baseChance != null) {
    trace.push(success ? "판정 · 성공" : "판정 · 실패");
    if ((game.stats?.resolve ?? 0) < 0) trace.push("결단 저하 · 성공 가능성 절반");
    const pressure = shouldApplyChancePressure(game) ? getChoiceChancePressure(game) : 0;
    const pressureRule = getSeedChanceAdjustment(game, choice, "chance-pressure");
    const displayedPressure = Math.trunc(pressure * (pressureRule?.modifier?.multiplier ?? 1));
    if (displayedPressure > 0) trace.push(`\uacf5\ud3ec/\uc774\uc0c1\ud604\uc0c1 \u00b7 \uc131\uacf5\ub960 -${displayedPressure}%`);
    if (pressureRule) trace.push(`성인의 달 · ${pressureRule.text}`);
    const markChance = getMarkChanceAdjustment(game, choice);
    if (markChance !== 0) trace.push(`표식 · 성공률 ${markChance > 0 ? "+" : ""}${markChance.toFixed(1)}%`);
    const finalChanceRule = getSeedChanceAdjustment(game, choice, "final-chance");
    if (finalChanceRule) trace.push(`성인의 달 · ${finalChanceRule.text}`);
  }

  Object.entries(game.nextTurn).forEach(([key, value]) => {
    traitDelta[key] = (traitDelta[key] ?? 0) + value;
  });
  if (Object.keys(game.nextTurn).length > 0) trace.push("이전 표식");
  if (Object.keys(traitDelta).length > 0) trace.push("성향");

  const npcId = outcome.npcId ?? (outcome.kind === "person" ? outcome.target : null);
  if (game.stats.charm < 0 && npcId && (game.affinities[npcId] ?? 0) > 0) {
    affinityDelta[npcId] = (affinityDelta[npcId] ?? 0) - 1;
    trace.push(`매력 저하 · ${npcId} 호감도 감소`);
  }

  const job = JOBS.find((item) => item.id === game.jobId);
  if (job?.id === "steward" && (resourceDelta.silver ?? 0) < 0) {
    resourceDelta.silver += 1;
    trace.push(`직업 · ${job.name}`);
  }

  if (game.titles.includes("hesitant") && choice.isForfeit) {
    estateDelta.recordIntegrity = (estateDelta.recordIntegrity ?? 0) + 1;
    trace.push("칭호 · 결정을 미룬 자");
  }

  const nextTurn = {};
  applyMarkOutcomeEffects(game, outcome, { resourceDelta, estateDelta, statDelta }, trace);

  game.passiveIds.forEach((passiveId, index) => {
    applyPassive(passiveId, { resourceDelta, estateDelta, choice: outcome }, trace, `패시브 ${index + 1}`);
  });

  const deltas = { resources: resourceDelta, estate: estateDelta, stats: statDelta };
  if (game.specialSeedTrait) applyConditionalSeedTraits(game, outcome, success, deltas, trace);
  else applySeedGrowthMultipliers(game, statDelta, trace);

  if ((game.stats?.insight ?? 0) < 0) {
    [resourceDelta, estateDelta, traitDelta, statDelta, affinityDelta].forEach((delta) => {
      Object.entries(delta).forEach(([key, value]) => {
        if (value > 0) delta[key] = -value;
      });
    });
    trace.push("통찰 저하 · 획득값 반전");
  }

  const displayDeltas = copyDeltaMaps({
    resources: resourceDelta,
    estate: estateDelta,
    traits: traitDelta,
    horrorTraits: horrorTraitDelta,
    stats: statDelta,
    affinities: affinityDelta,
  });
  roundDeltaMaps({
    resources: resourceDelta,
    estate: estateDelta,
    traits: traitDelta,
    horrorTraits: horrorTraitDelta,
    stats: statDelta,
    affinities: affinityDelta,
  });

  return {
    resourceDelta,
    estateDelta,
    traitDelta,
    horrorTraitDelta,
    statDelta,
    affinityDelta,
    displayDeltas,
    nextTurn,
    success,
    effectiveChance,
    result: outcome.result,
    trace: EFFECT_ORDER.filter((layer) => trace.some((entry) => (
      entry.startsWith(
        layer === "trait"
          ? "성향"
          : layer === "job"
            ? "직업"
            : layer === "title"
              ? "칭호"
              : layer === "mark-loadout"
                ? "휴대 표식"
                : layer === "mark-equipped"
                  ? "장착 표식"
                  : layer.startsWith("passive")
                    ? `패시브 ${layer.at(-1)}`
                    : "표식",
      )
    ))),
    traceLabels: trace,
  };
}

export function getEstateState(game) {
  const { stability, trust, recordIntegrity, corruption, missing } = game.estate;
  if (corruption >= 12 || recordIntegrity <= 30) {
    return {
      name: "위험",
      tone: "danger",
      script: "저택 곳곳에서 이상한 일이 이어지고 있다. 사람들은 혼자 다니지 않는다.",
    };
  }
  if (missing >= 1) {
    return {
      name: "누군가 없는 밤",
      tone: "danger",
      script: "한 사람이 돌아오지 않았다. 아무도 먼저 그 사람을 찾지 않는다.",
    };
  }
  if (stability >= 56 && trust >= 54) {
    return {
      name: "평화로움",
      tone: "neutral",
      script: "거리와 저택은 조용하다. 사람들은 평소처럼 하루를 보낸다.",
    };
  }
  return {
    name: "평상시",
    tone: "neutral",
    script: "특별한 일은 없다. 사람들은 각자의 일을 하고 있다.",
  };
}

export function getMarkName(markId) {
  return getMark(markId)?.name ?? "없음";
}

export function getPassive(passiveId) {
  return PASSIVES.find((item) => item.id === passiveId);
}

export function getTitle(titleId) {
  return TITLES.find((item) => item.id === titleId);
}
