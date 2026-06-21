import {
  HIDDEN_RUN_RULES,
  PASSIVES,
  STAT_META,
  TITLES,
  TRAIT_META,
} from "../rules/systemRules.js";
import { DAY_ACTIONS, NIGHT_CHOICES } from "../data/tutorialContent.js";
import { createRunSeed, seededPick, seededRank, seededValue } from "./seed.js";
import { deriveStats } from "./rulesEngine.js";

const EMPTY_TRAITS = Object.fromEntries(Object.keys(TRAIT_META).map((key) => [key, 0]));

function asNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
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

export function getCriticalState(stats, phase) {
  return {
    gameOver: stats.health < 0,
    forcedReturn: stats.stamina < 0
      ? phase === "day" ? "nightfall" : "daybreak"
      : null,
  };
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

export function getTitle(titleId) {
  return TITLES.find((item) => item.id === titleId);
}
