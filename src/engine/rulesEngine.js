import {
  EFFECT_ORDER,
  HIDDEN_RUN_RULES,
  JOBS,
  PASSIVES,
  STIGMA_PREFIXES,
  STIGMA_SUFFIXES,
  STAT_META,
  TITLES,
  TRAIT_META,
} from "../rules/systemRules.js";
import { DAY_ACTIONS, NIGHT_CHOICES } from "../rules/tutorialRules.js";
import { createRunSeed, seededPick, seededRank, seededValue } from "./seed.js";

const EMPTY_TRAITS = Object.fromEntries(Object.keys(TRAIT_META).map((key) => [key, 0]));

const CHANCE_PENALTY_PHASES = new Set(["night", "event"]);
const MIN_SEED_GROWTH_MULTIPLIER = 0.1;
const MAX_SEED_GROWTH_MULTIPLIER = 2;

function asNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function roundToTenth(value) {
  return Math.round(asNumber(value) * 10) / 10;
}

function clampNumber(value, lower, upper) {
  return Math.min(Math.max(value, lower), upper);
}

function positiveNumber(value) {
  return Math.max(asNumber(value), 0);
}

function getChoiceChancePressure(game) {
  return roundToTenth(positiveNumber(game?.resources?.fear) + positiveNumber(game?.estate?.corruption) * 3);
}

function shouldApplyChancePressure(game) {
  return CHANCE_PENALTY_PHASES.has(game?.phase);
}

export function getEffectiveChoiceChance(game, baseChance) {
  if (baseChance == null) return null;
  let chancePercent = clampNumber(asNumber(baseChance) * 100, 0, 100);
  if ((game?.stats?.resolve ?? 0) < 0) chancePercent *= 0.5;
  if (shouldApplyChancePressure(game)) chancePercent -= getChoiceChancePressure(game);
  return clampNumber(roundToTenth(chancePercent), 0, 100) / 100;
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
      statDelta[key] = roundToTenth(amount * multiplier);
      if (multiplier !== 1) {
        trace.push(`\uc2dc\ub4dc \u00b7 ${STAT_META[key]?.label ?? key} \uc131\uc7a5 x${multiplier.toFixed(1)}`);
      }
      return;
    }
    statDelta[key] = roundToTenth(amount);
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
    stigma: { prefixId: null, suffixId: null },
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

export function deriveStigma(game) {
  let prefixId = "underground";
  if (game.counters.physicalDamage > 0) prefixId = "rose-thorn";
  else if (game.lostKind === "person") prefixId = "nameless";
  else if (game.lostKind === "item") prefixId = "burnt";

  const suffixScores = [
    { id: "rosary", score: (game.traits.divine ?? 0) + (game.traits.exorcism ?? 0) },
    { id: "sheath", score: (game.traits.execution ?? 0) + (game.traits.knight ?? 0) },
    { id: "funeral-bell", score: (game.traits.record ?? 0) + (game.traits.life ?? 0) },
    { id: "black-key", score: (game.traits.shortcut ?? 0) + (game.traits.suspicion ?? 0) },
  ].sort((left, right) => right.score - left.score);

  return { prefixId, suffixId: suffixScores[0].id };
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
  const effectiveChance = getEffectiveChoiceChance(game, baseChance);
  const outcomeSeed = game.runSeed ?? game.runRngSeed ?? "run";
  const historyLength = game.history?.length ?? 0;
  const success = effectiveChance == null
    || seededValue(`${outcomeSeed}:outcome:${historyLength}:${choice.id}`) < effectiveChance;
  const outcome = success ? choice : { ...choice, ...(choice.failure ?? {}) };
  const resourceDelta = { ...(outcome.resources ?? {}) };
  const estateDelta = { ...(outcome.estate ?? {}) };
  const traitDelta = { ...(outcome.traits ?? {}) };
  const statDelta = { ...(outcome.stats ?? {}) };
  const affinityDelta = { ...(outcome.affinities ?? {}) };
  const trace = [];

  if (baseChance != null) {
    trace.push(success ? "판정 · 성공" : "판정 · 실패");
    if ((game.stats?.resolve ?? 0) < 0) trace.push("결단 저하 · 성공 가능성 절반");
    const pressure = shouldApplyChancePressure(game) ? getChoiceChancePressure(game) : 0;
    const displayedPressure = Math.trunc(pressure);
    if (displayedPressure > 0) trace.push(`\uacf5\ud3ec/\uc774\uc0c1\ud604\uc0c1 \u00b7 \uc131\uacf5\ub960 -${displayedPressure}%`);
  }

  Object.entries(game.nextTurn).forEach(([key, value]) => {
    traitDelta[key] = (traitDelta[key] ?? 0) + value;
  });
  if (Object.keys(game.nextTurn).length > 0) trace.push("이전 성흔");
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

  const prefix = STIGMA_PREFIXES.find((item) => item.id === game.stigma.prefixId);
  const suffix = STIGMA_SUFFIXES.find((item) => item.id === game.stigma.suffixId);
  const triggered = prefix?.trigger === outcome.event || (prefix?.trigger === "night-cost" && game.phase === "night");
  const nextTurn = {};
  if (triggered && suffix) {
    trace.push(`성흔 · ${prefix.name} ${suffix.name}`);
    Object.entries(suffix.effect.resources ?? {}).forEach(([key, value]) => {
      resourceDelta[key] = (resourceDelta[key] ?? 0) + value;
    });
    Object.entries(suffix.effect.estate ?? {}).forEach(([key, value]) => {
      estateDelta[key] = (estateDelta[key] ?? 0) + value;
    });
    Object.entries(suffix.effect.nextTurn ?? {}).forEach(([key, value]) => {
      nextTurn[key] = (nextTurn[key] ?? 0) + value;
    });
  }

  game.passiveIds.forEach((passiveId, index) => {
    applyPassive(passiveId, { resourceDelta, estateDelta, choice: outcome }, trace, `패시브 ${index + 1}`);
  });

  applySeedGrowthMultipliers(game, statDelta, trace);

  if ((game.stats?.insight ?? 0) < 0) {
    [resourceDelta, estateDelta, traitDelta, statDelta, affinityDelta].forEach((delta) => {
      Object.entries(delta).forEach(([key, value]) => {
        if (value > 0) delta[key] = -value;
      });
    });
    trace.push("통찰 저하 · 획득값 반전");
  }

  return {
    resourceDelta,
    estateDelta,
    traitDelta,
    statDelta,
    affinityDelta,
    nextTurn,
    success,
    effectiveChance,
    result: outcome.result,
    trace: EFFECT_ORDER.filter((layer) => trace.some((entry) => (
      entry.startsWith(layer === "trait" ? "성향" : layer === "job" ? "직업" : layer === "title" ? "칭호" : layer.startsWith("passive") ? `패시브 ${layer.at(-1)}` : "성흔")
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

export function getStigmaName(game) {
  if (!game.stigma.prefixId || !game.stigma.suffixId) return "없음";
  const prefix = STIGMA_PREFIXES.find((item) => item.id === game.stigma.prefixId);
  const suffix = STIGMA_SUFFIXES.find((item) => item.id === game.stigma.suffixId);
  return `${prefix?.name ?? "알 수 없는"} ${suffix?.name ?? "성흔"}`;
}

export function getPassive(passiveId) {
  return PASSIVES.find((item) => item.id === passiveId);
}

export function getTitle(titleId) {
  return TITLES.find((item) => item.id === titleId);
}
