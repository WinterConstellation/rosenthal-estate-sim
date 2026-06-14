import {
  CORE_NPCS,
  DAY_ACTIONS,
  DAY_CATEGORIES,
  DAY_EIGHT_SCRIPTS,
  DIRECTIONS,
  EXPLORATION_EVENTS,
  FINALES,
  SPECIAL_EVENT_GROUPS,
  UNNAMED_COMPANIONS,
} from "../data/rosenthalContent.js";
import { getSaintSeed } from "../data/saintSeeds.js";
import {
  PASSIVES,
  STAT_META,
  TRAIT_META,
} from "../rules/systemRules.js";
import {
  clampMap,
  deriveStats,
  deriveStigma,
  getJob,
  getStigmaName,
  resolveChoice,
} from "./rulesEngine.js";
import { createRunSeed, seededPick, seededRank, seededValue } from "./seed.js";

export const GAME_VERSION = 10;

const CATEGORY_TRAITS = {
  gathering: { life: 2, trade: 1 },
  interaction: { life: 1, record: 1 },
  investigation: { suspicion: 2, record: 1 },
  training: { knight: 2, execution: 1 },
  rest: { life: 1 },
  other: { mansion: 1, shortcut: 1 },
};

const TRUTH_FINALE = {
  id: "summoning-room",
  directionId: "archive",
  kind: "puzzle",
  title: "일곱째 밤의 소환실",
  text: "바닥의 원은 당신이 처음 눈을 뜬 침실과 정확히 같은 크기다. 연금술사는 변명하지 않는다.",
  options: [
    {
      id: "read-summoning-record",
      label: "소환 기록을 끝까지 읽는다",
      chance: 1,
      preview: "성공률 100% · 진실 단서 획득 · 통찰 +2",
      success: { stats: { insight: 2, stamina: -2 }, estate: { recordIntegrity: 3, corruption: 2 } },
    },
    {
      id: "destroy-summoning-record",
      label: "소환 기록과 원을 함께 지운다",
      chance: 1,
      preview: "성공률 100% · 축성 소금 -4 · 기록 완전성 -3",
      success: { resources: { salt: -4 }, estate: { recordIntegrity: -3, corruption: -2 } },
    },
  ],
};

export function createStartState() {
  return {
    version: GAME_VERSION,
    phase: "start",
    day: 0,
    history: [],
  };
}

export function createNewRun({ second = new Date().getSeconds(), runRngSeed = createRunSeed() } = {}) {
  const specialSeed = getSaintSeed(second);
  const ownedPassiveIds = seededRank(PASSIVES, `${runRngSeed}:passives`).slice(0, 5).map((item) => item.id);
  const emptyTraits = Object.fromEntries(Object.keys(TRAIT_META).map((key) => [key, 0]));
  const baseStats = deriveStats(emptyTraits);
  const stats = clampMap(baseStats, {
    [specialSeed.boon.key]: specialSeed.boon.amount,
    [specialSeed.burden.key]: specialSeed.burden.amount,
  }, -99, 999);
  const companionStates = {};
  CORE_NPCS.forEach((npc) => {
    companionStates[npc.id] = {
      id: npc.id,
      label: npc.label,
      name: npc.name,
      kind: "core",
      relation: npc.relation,
      status: "alive",
      countedAsSacrifice: false,
      revealed: false,
    };
  });
  UNNAMED_COMPANIONS.forEach((npc) => {
    companionStates[npc.id] = {
      ...npc,
      kind: "unnamed",
      status: "alive",
      countedAsSacrifice: false,
      revealed: false,
    };
  });

  return {
    version: GAME_VERSION,
    phase: "seed-reveal",
    runStartedAt: new Date().toISOString(),
    runRngSeed,
    specialSeedId: specialSeed.id,
    specialSeedName: specialSeed.name,
    specialSeedRule: specialSeed.ruleText,
    specialSeedStatsApplied: true,
    eventGroupId: specialSeed.eventGroupId,
    route: null,
    day: 1,
    dayTurn: 0,
    usedDayCategories: [],
    resources: {
      food: 70,
      timber: 45,
      silver: 35,
      salt: 10,
      population: 51,
      faith: 22,
      fear: 0,
    },
    estate: {
      stability: 50,
      trust: 50,
      recordIntegrity: 50,
      corruption: 0,
      missing: 0,
    },
    traits: emptyTraits,
    stats,
    affinities: {},
    jobId: null,
    titles: [],
    stigma: { prefixId: null, suffixId: null },
    ownedPassiveIds,
    passiveIds: ownedPassiveIds.slice(0, 3),
    ownedStigmaPrefixIds: [],
    ownedStigmaSuffixIds: [],
    nextTurn: {},
    counters: { choices: 0, forfeits: 0, physicalDamage: 0 },
    lostKind: null,
    lostTarget: null,
    playerMarked: false,
    companionStates,
    keepsakes: [],
    sacrificeCount: 0,
    sacrificeIds: [],
    truthFlags: {
      metAlchemist: false,
      descendedWithAlchemist: false,
      descendedWithAlchemistBeforeSeventh: false,
      truthDiscovered: false,
    },
    forfeitCounters: {
      general: 0,
      nightEntry: 0,
    },
    majorEndingsLocked: false,
    deathAtDaybreak: false,
    specialProgress: 0,
    specialChoices: [],
    tutorialSummarySeen: false,
    transitionTargetPhase: null,
    escapeTransformationResolvedId: null,
    expedition: null,
    selectedCompanionId: null,
    pendingResult: null,
    resumePhase: null,
    endingId: null,
    history: [],
    ruleTrace: [],
  };
}

export function getSpecialGroup(state) {
  return SPECIAL_EVENT_GROUPS[state.eventGroupId];
}

export function beginPrologue(state) {
  return { ...state, phase: "prologue" };
}

export function openFirstDay(state) {
  return { ...state, phase: "day" };
}

export function openDay(state) {
  return { ...state, phase: "day" };
}

function specialEventIsDue(state) {
  const expectedStage = [1, 4, 7].indexOf(state.day);
  return expectedStage >= 0 && state.specialProgress === expectedStage;
}

function nextPhaseAfterDayTurn(state, dayTurn) {
  if (dayTurn >= 5) return "night-companion";
  if (dayTurn === 1 && specialEventIsDue(state)) return "special-event";
  return "day";
}

function canUseDayAction(action, state) {
  if (action.requiresFlag && !state.truthFlags[action.requiresFlag]) return false;
  return true;
}

export function getDayOffers(state) {
  return DAY_CATEGORIES
    .filter((category) => !state.usedDayCategories.includes(category.id))
    .map((category) => {
      if (category.id === "interaction") {
        const transformed = Object.values(state.companionStates).find((person) => person.status === "transformed");
        if (transformed) {
          return {
            id: `confront-${transformed.id}`,
            category: category.id,
            title: `변질된 ${displayCompanion(transformed)}를 찾아간다`,
            tone: "lethal",
            specialType: "transformed",
            targetId: transformed.id,
          };
        }
        const keepsake = state.keepsakes.find((item) => !item.delivered);
        if (keepsake) {
          return {
            id: `deliver-${keepsake.id}`,
            category: category.id,
            title: `${keepsake.label}을 전달한다`,
            tone: "neutral",
            specialType: "keepsake",
            targetId: keepsake.id,
          };
        }
      }
      const candidates = DAY_ACTIONS.filter((action) => action.category === category.id && canUseDayAction(action, state));
      return seededPick(candidates, `${state.runRngSeed}:day:${state.day}:turn:${state.dayTurn}:${category.id}`);
    })
    .filter(Boolean);
}

function mergeDelta(base = {}, addition = {}) {
  const next = { ...base };
  Object.entries(addition).forEach(([key, value]) => {
    next[key] = (next[key] ?? 0) + value;
  });
  return next;
}

function getRestRecoveryModifier(state) {
  const life = state.traits.life ?? 0;
  if (life >= 10) return 2;
  if (life >= 5) return 1;
  if (life <= -10) return -2;
  if (life <= -5) return -1;
  return 0;
}

function normalizeActionChoice(state, action, phaseKind = "day") {
  const effects = action.effects ?? {};
  const stats = { ...(effects.stats ?? {}) };
  if (action.category === "rest") {
    const recoveryModifier = getRestRecoveryModifier(state);
    if ((stats.health ?? 0) > 0) stats.health += recoveryModifier;
    if ((stats.stamina ?? 0) > 0) stats.stamina += recoveryModifier;
  }
  const choice = {
    id: action.id,
    title: action.title ?? action.label,
    label: action.label ?? action.title,
    tone: action.tone ?? "neutral",
    category: action.category,
    npcId: action.npcId,
    traits: mergeDelta(CATEGORY_TRAITS[action.category], effects.traits),
    stats,
    resources: mergeDelta(effects.resources, effects.resourcesExtra),
    estate: { ...(effects.estate ?? {}) },
    affinities: { ...(effects.affinities ?? {}) },
    event: action.event,
    result: action.result,
    successChance: action.successChance,
    failure: action.failure,
  };
  return { choice, phaseKind };
}

function getChanges(before, after, group, labels = {}) {
  return Object.keys(after).flatMap((key) => {
    const delta = (after[key] ?? 0) - (before[key] ?? 0);
    return delta === 0 ? [] : [{ group, key, label: labels[key]?.label ?? key, delta }];
  });
}

export function applyActionEffects(state, action, {
  phaseKind = "day",
  resultText,
  resumePhase = state.phase,
} = {}) {
  const { choice } = normalizeActionChoice(state, action, phaseKind);
  const resolvingState = { ...state, phase: phaseKind === "night" ? "night" : "day" };
  const resolved = resolveChoice(resolvingState, choice);
  const resources = clampMap(state.resources, resolved.resourceDelta, -99, 999);
  const estate = clampMap(state.estate, resolved.estateDelta, -99, 100);
  const traits = clampMap(state.traits, resolved.traitDelta, -99, 99);
  const stats = clampMap(state.stats, resolved.statDelta, -99, 999);
  const affinities = clampMap(state.affinities, resolved.affinityDelta, -99, 99);
  const changes = [
    ...getChanges(state.stats, stats, "능력치", STAT_META),
    ...getChanges(state.resources, resources, "자원"),
    ...getChanges(state.estate, estate, "영지"),
    ...getChanges(state.traits, traits, "성향", TRAIT_META),
  ];
  const historyEntry = {
    day: state.day,
    phase: phaseKind,
    choiceId: action.id,
    label: action.label ?? action.title,
    success: resolved.success,
  };
  const staminaForcedReturn = stats.stamina < 0;
  const forcedResumePhase = staminaForcedReturn
    ? (phaseKind === "night" ? "daybreak" : "night-companion")
    : resumePhase;
  return {
    ...state,
    phase: "result",
    resumePhase: forcedResumePhase,
    resources,
    estate,
    traits,
    stats,
    affinities,
    nextTurn: resolved.nextTurn,
    ruleTrace: resolved.traceLabels,
    history: [...state.history, historyEntry],
    pendingResult: {
      title: action.label ?? action.title,
      tone: action.tone ?? "neutral",
      success: resolved.success,
      result: resultText ?? resolved.result ?? (resolved.success ? "선택한 방식으로 길이 열렸다." : "판정은 실패했다. 대가는 남았다."),
      changes,
      notices: [
        ...resolved.traceLabels,
        ...(staminaForcedReturn ? ["스태미나 고갈 · 강제 귀환"] : []),
      ],
    },
    endingId: stats.health < 0 ? "health-death" : state.endingId,
  };
}

export function chooseDayAction(state, action) {
  if (action.specialType === "keepsake") {
    return { ...state, phase: "keepsake-delivery", selectedKeepsakeId: action.targetId };
  }
  if (action.specialType === "transformed") {
    return { ...state, phase: "transformed-choice", selectedTransformedId: action.targetId };
  }
  const usedDayCategories = [...state.usedDayCategories, action.category];
  const dayTurn = state.dayTurn + 1;
  const truthFlags = action.flag
    ? { ...state.truthFlags, [action.flag]: true }
    : state.truthFlags;
  const companionStates = action.category === "interaction" && action.npcId && state.companionStates[action.npcId]
    ? {
        ...state.companionStates,
        [action.npcId]: { ...state.companionStates[action.npcId], revealed: true },
      }
    : state.companionStates;
  return applyActionEffects({ ...state, usedDayCategories, dayTurn, truthFlags, companionStates }, action, {
    resumePhase: nextPhaseAfterDayTurn(state, dayTurn),
    resultText: action.result,
  });
}

export function chooseSpecialEvent(state, option) {
  const group = getSpecialGroup(state);
  const stageIndex = state.specialProgress;
  let next = applyActionEffects(state, {
    ...option,
    id: `${group.id}-${stageIndex}-${option.id}`,
    title: option.label,
    category: "investigation",
    effects: option.effects,
    tone: "extreme",
  }, {
    resumePhase: "day",
    resultText: "로젠탈은 선택을 기록했다. 무엇이 달라졌는지는 아직 알 수 없다.",
  });
  next = {
    ...next,
    specialProgress: state.specialProgress + 1,
    specialChoices: [...state.specialChoices, option.id],
  };
  if (stageIndex === 2 && [4, 5, 6, 7].includes(state.eventGroupId) && option.id === "left") {
    const targetId = ["maid", "scribe", "knight", "priest"][state.eventGroupId - 4];
    next = applyPermanentLoss(next, targetId, "transformed", `${group.name}의 마지막 장면`);
    next.pendingResult = {
      ...next.pendingResult,
      result: `${next.pendingResult.result} ${displayCompanion(next.companionStates[targetId])}은 이전과 같은 모습으로 돌아오지 않았다.`,
    };
  }
  return next;
}

export function getCompanionOffers(state) {
  return [
    { id: "alone", label: "혼자 내려간다", kind: "self", status: "alive" },
    ...Object.values(state.companionStates)
      .filter((person) => person.status === "alive")
      .map((person) => ({ ...person, label: displayCompanion(person) })),
  ];
}

export function selectCompanion(state, companionId) {
  return { ...state, selectedCompanionId: companionId, phase: "night-direction" };
}

export function getDirectionOffers() {
  return DIRECTIONS;
}

export function startExpedition(state, directionId) {
  const totalSteps = 3 + Math.floor(seededValue(`${state.runRngSeed}:depth:${state.day}:${directionId}`) * 8);
  const eventIds = seededRank(
    EXPLORATION_EVENTS.filter((event) => event.directionId === directionId),
    `${state.runRngSeed}:events:${state.day}:${directionId}`,
  ).slice(0, totalSteps).map((event) => event.id);
  const descendedWithAlchemist = state.selectedCompanionId === "alchemist" || state.truthFlags.descendedWithAlchemist;
  const descendedWithAlchemistBeforeSeventh = (
    state.selectedCompanionId === "alchemist" && state.day < 7
  ) || state.truthFlags.descendedWithAlchemistBeforeSeventh;
  return {
    ...state,
    phase: "expedition",
    truthFlags: { ...state.truthFlags, descendedWithAlchemist, descendedWithAlchemistBeforeSeventh },
    expedition: {
      directionId,
      totalSteps,
      stepIndex: 0,
      eventIds,
    },
  };
}

export function getCurrentExplorationEvent(state) {
  const id = state.expedition?.eventIds[state.expedition.stepIndex];
  return EXPLORATION_EVENTS.find((event) => event.id === id);
}

export function isCompanionOperational(state) {
  if (!state.selectedCompanionId || state.selectedCompanionId === "alone") return false;
  return state.companionStates[state.selectedCompanionId]?.status === "alive";
}

export function isExplorationOptionAvailable(state, option) {
  return !option.requiresHealthyCompanion || isCompanionOperational(state);
}

function actionFromOutcome(option, prefix) {
  return {
    id: `${prefix}-${option.id}`,
    label: option.label,
    title: option.label,
    tone: option.lossRisk ? "danger" : "neutral",
    successChance: option.chance,
    stats: option.success?.stats,
    resources: option.success?.resources,
    estate: option.success?.estate,
    traits: option.success?.traits,
    failure: {
      stats: option.failure?.stats,
      resources: option.failure?.resources,
      estate: option.failure?.estate,
      traits: option.failure?.traits,
    },
  };
}

export function chooseExplorationOption(state, event, option) {
  if (!isExplorationOptionAvailable(state, option)) return state;
  const nextIndex = state.expedition.stepIndex + 1;
  let next = applyActionEffects(state, {
    ...actionFromOutcome(option, event.id),
    effects: {
      stats: option.success?.stats,
      resources: option.success?.resources,
      estate: option.success?.estate,
      traits: option.success?.traits,
    },
    successChance: option.chance,
    failure: option.failure,
  }, {
    phaseKind: "night",
    resumePhase: nextIndex >= state.expedition.eventIds.length ? "finale" : "expedition",
  });
  next.expedition = { ...state.expedition, stepIndex: nextIndex };
  if (!next.pendingResult.success && event.specialLoss && isCompanionOperational(state)) {
    next = applyRandomPermanentLoss(next, state.selectedCompanionId, `${event.title}에서 돌아오지 못함`);
  }
  return next;
}

export function getCurrentFinale(state) {
  const canOpenTruth = state.day === 7
    && state.selectedCompanionId === "alchemist"
    && state.truthFlags.metAlchemist
    && state.truthFlags.descendedWithAlchemistBeforeSeventh
    && state.companionStates.alchemist?.status === "alive";
  if (canOpenTruth) return TRUTH_FINALE;
  const pool = FINALES.filter((item) => item.directionId === state.expedition.directionId);
  return seededPick(pool, `${state.runRngSeed}:finale:${state.day}:${state.expedition.directionId}`);
}

export function getFinaleOptions(state, currentFinale) {
  const options = [...currentFinale.options];
  if (currentFinale.sacrifice && isCompanionOperational(state)) {
    options.push({
      id: "leave-companion",
      label: "동행자를 남기고 문을 통과한다",
      chance: 1,
      preview: "성공률 100% · 동행자 영구 실종 · 제물 조건 가능",
      success: { estate: { corruption: 2, stability: 1 }, resources: { fear: 4 } },
      intentionalLoss: "missing",
    });
  }
  return options;
}

export function chooseFinaleOption(state, currentFinale, option) {
  let next = applyActionEffects(state, {
    ...actionFromOutcome(option, currentFinale.id),
    effects: {
      stats: option.success?.stats,
      resources: option.success?.resources,
      estate: option.success?.estate,
      traits: option.success?.traits,
    },
    successChance: option.chance,
    failure: option.failure,
  }, {
    phaseKind: "night",
    resumePhase: "daybreak",
    resultText: option.intentionalLoss
      ? "문은 열렸다. 뒤에서 동행자의 발소리가 끊겼다."
      : undefined,
  });
  if (option.intentionalLoss && isCompanionOperational(state)) {
    next = applyPermanentLoss(next, state.selectedCompanionId, option.intentionalLoss, currentFinale.title);
  } else if (!next.pendingResult.success && option.lossRisk && isCompanionOperational(state)) {
    next = applyRandomPermanentLoss(next, state.selectedCompanionId, `${currentFinale.title} 실패`);
  }
  if (currentFinale.id === "summoning-room") {
    next.truthFlags = { ...next.truthFlags, truthDiscovered: true };
  }
  return assignFirstNightBuild(next);
}

function assignFirstNightBuild(state) {
  const job = getJob(state);
  const stigma = deriveStigma(state);
  const isFirstJob = !state.jobId;
  const ownedStigmaPrefixIds = stigma.prefixId
    ? [...new Set([...(state.ownedStigmaPrefixIds ?? []), stigma.prefixId])]
    : state.ownedStigmaPrefixIds ?? [];
  const ownedStigmaSuffixIds = stigma.suffixId
    ? [...new Set([...(state.ownedStigmaSuffixIds ?? []), stigma.suffixId])]
    : state.ownedStigmaSuffixIds ?? [];
  const newPrefix = stigma.prefixId && !(state.ownedStigmaPrefixIds ?? []).includes(stigma.prefixId);
  const newSuffix = stigma.suffixId && !(state.ownedStigmaSuffixIds ?? []).includes(stigma.suffixId);
  return {
    ...state,
    jobId: state.jobId ?? job.id,
    stigma: state.stigma?.prefixId ? state.stigma : stigma,
    ownedStigmaPrefixIds,
    ownedStigmaSuffixIds,
    pendingResult: {
      ...state.pendingResult,
      notices: [
        ...(state.pendingResult?.notices ?? []),
        ...(isFirstJob ? [`직업 · ${job.name}`] : []),
        ...(newPrefix || newSuffix ? [`성흔 · ${getStigmaName({ ...state, stigma })}`] : []),
      ],
    },
  };
}

export function retreatExpedition(state) {
  const general = state.forfeitCounters.general + 1;
  return {
    ...state,
    phase: "result",
    resumePhase: "daybreak",
    majorEndingsLocked: true,
    deathAtDaybreak: general >= 3 || state.deathAtDaybreak,
    forfeitCounters: { ...state.forfeitCounters, general },
    pendingResult: {
      title: "포기하고 귀환한다",
      tone: "danger",
      success: true,
      result: "길을 되짚어 지상으로 돌아왔다. 계단 수는 내려올 때와 달랐다.",
      changes: [],
      notices: ["큰 축의 엔딩 봉쇄", general >= 3 ? "다음 아침까지 남은 시간이 줄어든다." : "귀환을 미룬 흔적이 남는다."],
    },
  };
}

export function forfeitDay(state) {
  const general = state.forfeitCounters.general + 1;
  const dayTurn = state.dayTurn + 1;
  return applyActionEffects({
    ...state,
    dayTurn,
    majorEndingsLocked: true,
    deathAtDaybreak: general >= 3 || state.deathAtDaybreak,
    forfeitCounters: { ...state.forfeitCounters, general },
  }, {
    id: `day-forfeit-${state.day}-${state.dayTurn}`,
    title: "포기한다",
    category: "other",
    tone: "danger",
    effects: { estate: { stability: -3, trust: -2 }, resources: { fear: 2 }, stats: { stamina: -1 } },
    result: "결정을 미루는 동안 다른 사람들이 대신 정했다.",
  }, {
    resumePhase: nextPhaseAfterDayTurn(state, dayTurn),
    resultText: "결정을 미루는 동안 다른 사람들이 대신 정했다.",
  });
}

export function skipNightEntry(state) {
  const nightEntry = state.forfeitCounters.nightEntry + 1;
  return {
    ...state,
    phase: "result",
    resumePhase: "daybreak",
    majorEndingsLocked: true,
    forfeitCounters: { ...state.forfeitCounters, nightEntry },
    pendingResult: {
      title: "지하에 들어가지 않는다",
      tone: "danger",
      success: true,
      result: "문 두드리는 소리는 새벽이 오기 전에 스스로 멎었다.",
      changes: [],
      notices: [`지하 진입 포기 · ${nightEntry}회`],
    },
  };
}

export function chooseTransformedFate(state, action) {
  const person = state.companionStates[state.selectedTransformedId];
  const usedDayCategories = [...state.usedDayCategories, "interaction"];
  const dayTurn = state.dayTurn + 1;
  if (action === "spare") {
    return {
      ...state,
      phase: "result",
      resumePhase: dayTurn >= 5 ? "night-companion" : "day",
      usedDayCategories,
      dayTurn,
      pendingResult: {
        title: `${displayCompanion(person)}를 살려둔다`,
        tone: "extreme",
        success: true,
        result: "그것은 당신을 알아본 듯했지만 사람의 목소리로 대답하지 않았다. 밤이 되기 전에 사라졌다.",
        changes: [],
        notices: ["제물 수치 변화 없음", "이후 사건에서 다시 등장할 수 있음"],
      },
    };
  }
  let next = applyPermanentLoss({ ...state, usedDayCategories, dayTurn }, person.id, "dead", "변질 후 처치", true);
  next = {
    ...next,
    phase: "result",
    resumePhase: dayTurn >= 5 ? "night-companion" : "day",
    pendingResult: {
      title: `${displayCompanion(person)}를 처치한다`,
      tone: "lethal",
      success: true,
      result: "변질된 사람은 쓰러졌다. 사람으로 남은 것은 유품뿐이었다.",
      changes: [],
      notices: ["변질자 처치", state.day <= 7 ? "제물 +1" : "제물 기간 종료"],
    },
  };
  return next;
}

export function chooseEscapeTransformedFate(state, action) {
  const person = state.companionStates[state.selectedCompanionId];
  if (!person || person.status !== "transformed") {
    return { ...state, phase: "daybreak" };
  }
  if (action === "spare") {
    return {
      ...state,
      phase: "result",
      resumePhase: "daybreak",
      escapeTransformationResolvedId: person.id,
      pendingResult: {
        title: `${displayCompanion(person)}를 데리고 탈출한다`,
        tone: "extreme",
        success: true,
        result: "변질된 동행자는 사람의 말에 대답하지 않았다. 그래도 당신은 손을 놓지 않고 지상으로 향했다.",
        changes: [],
        notices: ["제물 수치 변화 없음", "변질자는 이후 사건에서 다시 등장할 수 있음"],
      },
    };
  }
  let next = applyPermanentLoss(state, person.id, "dead", "탈출 직전 변질자 처치", true);
  return {
    ...next,
    phase: "result",
    resumePhase: "daybreak",
    escapeTransformationResolvedId: person.id,
    pendingResult: {
      title: `${displayCompanion(next.companionStates[person.id])}를 처치한다`,
      tone: "lethal",
      success: true,
      result: "귀환로를 열기 전에 변질된 동행자를 처치했다. 유품만을 들고 지상으로 향했다.",
      changes: [],
      notices: [state.day <= 7 ? "제물 +1" : "제물 기간 종료", "유품 획득"],
    },
  };
}

export function deliverKeepsake(state, recipient) {
  const keepsake = state.keepsakes.find((item) => item.id === state.selectedKeepsakeId);
  const usedDayCategories = [...state.usedDayCategories, "interaction"];
  const dayTurn = state.dayTurn + 1;
  return {
    ...state,
    phase: "result",
    resumePhase: dayTurn >= 5 ? "night-companion" : "day",
    usedDayCategories,
    dayTurn,
    keepsakes: state.keepsakes.map((item) => item.id === keepsake.id ? { ...item, delivered: true, recipient } : item),
    estate: clampMap(state.estate, recipient === "family" ? { trust: 2, recordIntegrity: 1 } : { stability: 1, trust: 1 }, -99, 100),
    pendingResult: {
      title: `${keepsake.label}을 ${recipient === "family" ? "가족" : "동료"}에게 전달한다`,
      tone: "neutral",
      success: true,
      result: recipient === "family"
        ? "가족은 유품을 두 손으로 받았다. 누구도 당신에게 감사하지 않았다."
        : "동료들은 유품을 작업대 한가운데 두고 한동안 일을 시작하지 않았다.",
      changes: [],
      notices: ["유품 전달 완료", "제물 수치 변화 없음"],
    },
  };
}

export function applyPermanentLoss(state, companionId, status, reason, fromTransformation = false) {
  const person = state.companionStates[companionId];
  if (!person) return state;
  if (["dead", "missing"].includes(person.status)) return state;
  if (person.status === status) return state;
  if (person.status === "transformed" && !(status === "dead" && fromTransformation)) return state;
  const qualifies = status === "dead" || status === "missing";
  const canCount = state.day <= 7 && qualifies && !person.countedAsSacrifice;
  const countedAsSacrifice = person.countedAsSacrifice || canCount;
  const nextPerson = {
    ...person,
    status,
    revealed: person.kind === "unnamed" ? true : person.revealed,
    countedAsSacrifice,
    lossReason: reason,
  };
  const keepsakes = [...state.keepsakes];
  if (status === "dead" && (fromTransformation || person.kind === "unnamed")) {
    keepsakes.push({
      id: `${person.id}-${state.history.length}`,
      ownerId: person.id,
      label: person.keepsake ?? `${person.label}의 유품`,
      delivered: false,
    });
  }
  return {
    ...state,
    companionStates: { ...state.companionStates, [companionId]: nextPerson },
    keepsakes,
    sacrificeCount: state.sacrificeCount + (canCount ? 1 : 0),
    sacrificeIds: canCount ? [...state.sacrificeIds, companionId] : state.sacrificeIds,
    estate: {
      ...state.estate,
      missing: state.estate.missing + (status === "missing" ? 1 : 0),
    },
  };
}

function applyRandomPermanentLoss(state, companionId, reason) {
  if (state.companionStates[companionId]?.status !== "alive") return state;
  const roll = seededValue(`${state.runRngSeed}:loss:${state.day}:${state.history.length}:${companionId}`);
  const status = roll < 0.34 ? "dead" : roll < 0.68 ? "missing" : "transformed";
  const next = applyPermanentLoss(state, companionId, status, reason);
  const person = next.companionStates[companionId];
  return {
    ...next,
    pendingResult: {
      ...next.pendingResult,
      result: `${next.pendingResult.result} ${lossResultText(person)}`,
      notices: [
        ...(next.pendingResult?.notices ?? []),
        status === "transformed" ? "변질 · 제물 수치 변화 없음" : `${status === "dead" ? "사망" : "영구 실종"}${state.day <= 7 ? " · 제물 조건 적용" : ""}`,
      ],
    },
  };
}

function lossResultText(person) {
  const identity = displayCompanion(person);
  if (person.status === "dead") return `${identity}은 돌아오지 못했다.${person.reveal ? ` ${person.reveal}` : ""}`;
  if (person.status === "missing") return `${identity}의 흔적은 귀환로 중간에서 끊겼다.${person.reveal ? ` ${person.reveal}` : ""}`;
  return `${identity}은 사람의 모습으로 돌아오지 않았다. 지금은 처치하지 않았다.`;
}

export function displayCompanion(person) {
  if (!person) return "*미정*";
  if (person.revealed) return `${person.label ?? "*미정*"} · ${person.name ?? "*미정*"}`;
  return person.label ?? "*미정*";
}

export function getNpcSpeaker(state, npcId) {
  const person = state?.companionStates?.[npcId];
  if (!person) return "*미정*";
  if (person.revealed) return person.name ?? "*미정*";
  return person.label ?? "*미정*";
}

export function refreshSeedState(state) {
  if (state?.specialSeedId === undefined || state?.specialSeedId === null) return state;
  const seed = getSaintSeed(state.specialSeedId);
  const stats = state.specialSeedStatsApplied || !state.stats
    ? state.stats
    : clampMap(state.stats, {
        [seed.boon.key]: seed.boon.amount,
        [seed.burden.key]: seed.burden.amount,
      }, -99, 999);
  return {
    ...state,
    specialSeedName: seed.name,
    specialSeedRule: seed.ruleText,
    specialSeedStatsApplied: true,
    stats,
  };
}

export function continueAfterResult(state) {
  if (state.endingId === "health-death") {
    return { ...state, phase: "ending", pendingResult: null };
  }
  const phase = state.resumePhase;
  if (phase === "night-companion") {
    return {
      ...state,
      phase: "nightfall-transition",
      transitionTargetPhase: "night-companion",
      pendingResult: null,
      resumePhase: null,
    };
  }
  if (
    phase === "daybreak"
    && state.selectedCompanionId
    && state.selectedCompanionId !== "alone"
    && state.companionStates[state.selectedCompanionId]?.status === "transformed"
    && state.escapeTransformationResolvedId !== state.selectedCompanionId
  ) {
    return { ...state, phase: "escape-transformed-choice", pendingResult: null, resumePhase: null };
  }
  if (phase === "daybreak") return finishNight(state);
  return { ...state, phase, pendingResult: null, resumePhase: null };
}

export function completeTransition(state) {
  if (!["nightfall-transition", "daybreak-transition"].includes(state.phase)) return state;
  return {
    ...state,
    phase: state.transitionTargetPhase ?? (state.phase === "nightfall-transition" ? "night-companion" : "day"),
    transitionTargetPhase: null,
  };
}

export function finishNight(state) {
  if (state.day === 7 && state.forfeitCounters.nightEntry === 7) {
    return { ...state, phase: "daybreak-transition", transitionTargetPhase: "ending", endingId: "accepted-lord", pendingResult: null };
  }
  if (state.deathAtDaybreak) {
    return { ...state, phase: "daybreak-transition", transitionTargetPhase: "ending", endingId: "forfeit-death", pendingResult: null };
  }
  if (state.day >= 7) {
    const route = state.sacrificeCount >= 3 ? "altered" : "normal";
    return {
      ...state,
      day: 8,
      route,
      phase: "daybreak-transition",
      transitionTargetPhase: "day-eight",
      pendingResult: null,
      expedition: null,
      selectedCompanionId: null,
      escapeTransformationResolvedId: null,
    };
  }
  const next = {
    ...state,
    day: state.day + 1,
    dayTurn: 0,
    usedDayCategories: [],
    phase: "daybreak-transition",
    transitionTargetPhase: "day",
    pendingResult: null,
    resumePhase: null,
    expedition: null,
    selectedCompanionId: null,
    escapeTransformationResolvedId: null,
    stats: { ...state.stats, stamina: 10 },
  };
  return next;
}

export function getDayEightScript(state) {
  return DAY_EIGHT_SCRIPTS[state.route ?? "normal"];
}

export function finishVerticalSlice(state) {
  return { ...state, phase: "record-stop" };
}

export function canManualSave(state) {
  return state.day >= 1
    && state.day <= 8
    && state.dayTurn === 0
    && ["day", "special-event", "day-eight", "daybreak-transition"].includes(state.phase);
}

export function getEnding(state) {
  if (state.endingId === "accepted-lord") {
    return {
      title: "정식 영주",
      text: [
        "일곱 번째 밤에도 당신은 지하에 들어가지 않았다.",
        "주민들은 당신을 로젠탈의 정식 영주로 인정하고 검은 정복을 입혔다.",
        "……당신은 다음 날 아침을 맞이하지 못했다.",
      ],
    };
  }
  if (state.endingId === "forfeit-death") {
    return {
      title: "다음 날의 아침",
      text: ["결정을 세 번 미룬 뒤에도 로젠탈은 조용했다.", "……당신은 다음 날 아침을 맞이하지 못했다."],
    };
  }
  return {
    title: "돌아오지 못한 영주",
    text: ["로젠탈은 다음 영주를 맞을 준비를 시작했다.", "……당신은 다음 날 아침을 맞이하지 못했다."],
  };
}
