import assert from "node:assert/strict";
import { SAINT_SEEDS, SEED_BENEFIT_RULES, SEED_BURDEN_RULES } from "../src/data/saintSeeds.js";
import {
  CORE_NPCS,
  DAY_ACTIONS,
  EXPLORATION_EVENTS,
  FINALES,
  NIGHT_OPENING,
  PROLOGUE as ROSENTHAL_PROLOGUE,
  SPECIAL_EVENT_GROUPS,
} from "../src/data/rosenthalContent.js";
import {
  DAY_ACTIONS as LEGACY_DAY_ACTIONS,
  DAY_INTERLUDES,
  DAY_OPENING_SCRIPT,
  DAY_PERIODS,
  ENDINGS,
  FORFEIT_RESULTS,
  NIGHT_CHOICES,
  NIGHT_ENTRY_SCRIPT,
  PROLOGUE as USER_PROLOGUE,
  WORKER_NAME_CHOICES,
} from "../src/rules/tutorialRules.js";
import {
  advanceToNextCycle,
  applyPermanentLoss,
  applyTraitExperience,
  chooseDayAction,
  chooseEscapeTransformedFate,
  chooseExplorationOption,
  completeTransition,
  continueAfterResult,
  createNewRun,
  normalizeProgressMeta,
  finishNight,
  getDayOffers,
  getExplorationOptions,
  getFinaleOptions,
  getNpcSpeaker,
  isExplorationOptionAvailable,
  isNightDisplayPhase,
  openFirstDay,
  refreshSeedState,
  retreatExpedition,
  startExpedition,
} from "../src/engine/rosenthalEngine.js";
import { getEffectiveChoiceChance, resolveChoice, roundToTenth, truncateToTenth } from "../src/engine/rulesEngine.js";

assert.equal(SAINT_SEEDS.length, 60);
assert.equal(new Set(SAINT_SEEDS.map((seed) => seed.name)).size, 60);
assert.equal(new Set(SAINT_SEEDS.map((seed) => seed.ruleText)).size, 60);
assert.deepEqual(SAINT_SEEDS.map((seed) => seed.eventGroupId), Array.from({ length: 60 }, (_, index) => Math.floor(index / 5)));
assert.ok(SAINT_SEEDS.every((seed) => /^(성|성녀|성자|성인) /.test(seed.name) && seed.name.endsWith("의 달")));
assert.ok(SAINT_SEEDS.every((seed) => !seed.name.includes("聖")));
assert.ok(SAINT_SEEDS.every((seed) => !["김대건", "정하상", "고순이", "권진이", "김효임", "김효주"].some((name) => seed.name.includes(name))));
assert.equal(SEED_BENEFIT_RULES.length, 10);
assert.equal(SEED_BURDEN_RULES.length, 6);
assert.equal(new Set(SAINT_SEEDS.map((seed) => `${seed.trait.benefit.id}:${seed.trait.burden.id}`)).size, 60);
assert.ok(SAINT_SEEDS.every((seed) => [seed.trait.benefit, seed.trait.burden]
  .every((rule) => rule.modifier.multiplier >= 0.9 && rule.modifier.multiplier <= 1.1)));
assert.ok(SAINT_SEEDS.every((seed) => seed.boon && seed.burden && seed.growthMultipliers));
assert.ok(SAINT_SEEDS.every((seed) => !seed.ruleText.includes("일차")));

assert.equal(DAY_ACTIONS.length, 30);
for (const category of ["gathering", "interaction", "investigation", "training", "rest", "other"]) {
  assert.equal(DAY_ACTIONS.filter((action) => action.category === category).length, 5);
}
assert.deepEqual(
  Object.fromEntries(["gain", "loss", "gain-heavy", "loss-heavy"].map((kind) => [
    kind,
    DAY_ACTIONS.filter((action) => action.balance === kind).length,
  ])),
  { gain: 5, loss: 5, "gain-heavy": 10, "loss-heavy": 10 },
);
assert.equal(EXPLORATION_EVENTS.length, 40);
assert.equal(FINALES.length, 12);
assert.ok(FINALES.flatMap((finale) => finale.options).some((option) => option.label === "약점을 찾는다"));
assert.ok(FINALES.flatMap((finale) => finale.options).every((option) => option.label !== "급소를 노린다"));
assert.equal(SPECIAL_EVENT_GROUPS.length, 12);
assert.ok(SPECIAL_EVENT_GROUPS.every((group) => group.stages.length === 3));
assert.deepEqual(ROSENTHAL_PROLOGUE, USER_PROLOGUE.text);
assert.deepEqual(NIGHT_OPENING, NIGHT_ENTRY_SCRIPT.map((line) => line.text.replace(/^“|”$/g, "")));
assert.equal(USER_PROLOGUE.tag, "프롤로그");
assert.equal(USER_PROLOGUE.title, "들리지 않는 목소리");
assert.equal(USER_PROLOGUE.speakers.length, USER_PROLOGUE.text.length);
assert.ok(USER_PROLOGUE.speakers.every((speaker) => ["narration", "player", "unknown"].includes(speaker) || speaker.startsWith("npc:")));
assert.deepEqual(USER_PROLOGUE.speakers, [
  "narration",
  "player",
  "player",
  "player",
  "player",
  "narration",
  "narration",
  "npc:maid",
  "narration",
  "narration",
  "narration",
  "player",
  "player",
  "player",
  "player",
]);
assert.equal(USER_PROLOGUE.speakers[USER_PROLOGUE.text.indexOf("“좋은 아침입니다, 영주님.”")], "npc:maid");
assert.equal(USER_PROLOGUE.speakers[USER_PROLOGUE.text.findIndex((line) => line.startsWith("당신은 이 세계의 언어도"))], "narration");
assert.equal(USER_PROLOGUE.speakers[USER_PROLOGUE.text.indexOf("어째서?")], "player");
assert.ok([DAY_OPENING_SCRIPT, DAY_PERIODS, DAY_INTERLUDES, NIGHT_ENTRY_SCRIPT, LEGACY_DAY_ACTIONS, NIGHT_CHOICES, WORKER_NAME_CHOICES]
  .every((value) => Array.isArray(value)));
assert.ok(ENDINGS && typeof ENDINGS === "object");
assert.ok(FORFEIT_RESULTS && typeof FORFEIT_RESULTS === "object");
assert.equal(CORE_NPCS.find((npc) => npc.id === "maid")?.name, "샤를로트");
assert.equal(CORE_NPCS.find((npc) => npc.id === "knight")?.name, "리오넬");
assert.ok(CORE_NPCS.filter((npc) => !["maid", "knight"].includes(npc.id)).every((npc) => npc.name === "*미정*"));
assert.ok(USER_PROLOGUE.text.some((line) => line.includes("허리에는 사용감이 많은 검")));
assert.ok(USER_PROLOGUE.text.every((line) => !line.includes("팔랑거리는 치맛단")));
assert.ok(DAY_INTERLUDES[0].paragraphs[0].startsWith("당신은 선택을 해야 한다."));
assert.ok(DAY_INTERLUDES[1].paragraphs.some((paragraph) => paragraph.includes("힐링물 같은 세계")));
assert.ok(DAY_INTERLUDES[2].paragraphs.some((paragraph) => paragraph.includes("아무 일도 일어나지 않는다")));

const deterministicA = createNewRun({ second: 0, runRngSeed: "fixed-run" });
const deterministicB = createNewRun({ second: 0, runRngSeed: "fixed-run" });
const seed0 = SAINT_SEEDS[0];
const baseStats = { health: 8, insight: 7, resolve: 7, charm: 8, faith: 4, stamina: 10 };
assert.equal(deterministicA.specialSeedId, 0);
assert.equal(deterministicA.eventGroupId, 0);
assert.equal(deterministicA.specialSeedName, seed0.name);
assert.equal(deterministicA.specialSeedRule, seed0.ruleText);
assert.deepEqual(deterministicA.stats, baseStats);
assert.deepEqual(deterministicA.displayStats, baseStats);
assert.deepEqual(deterministicA.specialSeedGrowthMultipliers, seed0.growthMultipliers);
assert.deepEqual(deterministicA.specialSeedTrait, seed0.trait);
assert.equal(deterministicA.meta.cycle, 1);
assert.equal(Object.keys(deterministicA.meta.traitProgress).length, 10);
assert.deepEqual(deterministicA.meta.equippedStigma, { prefixId: null, suffixId: null });
const traitProgressResult = applyTraitExperience(normalizeProgressMeta({
  traitProgress: {
    record: { level: 2, xp: 9 },
    suspicion: { level: 3, xp: 0 },
  },
}), { record: 2, suspicion: 1, life: -3 });
assert.equal(traitProgressResult.meta.traitProgress.record.level, 3);
assert.equal(traitProgressResult.meta.traitProgress.record.xp, 1);
assert.equal(traitProgressResult.meta.traitProgress.suspicion.level, 3);
assert.equal(traitProgressResult.meta.traitProgress.suspicion.xp, 1);
assert.ok(traitProgressResult.notices.some((notice) => notice.includes("기록 +2xp")));
const leveledStatResult = resolveChoice({
  ...deterministicA,
  meta: traitProgressResult.meta,
  specialSeedTrait: null,
}, {
  id: "trait-level-stat-check",
  stats: { insight: 2, health: -2 },
});
assert.equal(leveledStatResult.statDelta.insight, 3.2);
assert.equal(leveledStatResult.statDelta.health, -2);
assert.ok(leveledStatResult.traceLabels.includes("성향 레벨 · 통찰 x1.6"));
const nextCycleRun = advanceToNextCycle({
  ...deterministicA,
  phase: "record-stop",
  route: "altered",
  truthFlags: { ...deterministicA.truthFlags, truthDiscovered: true },
  meta: traitProgressResult.meta,
  ownedStigmaPrefixIds: ["rose-thorn"],
  ownedStigmaSuffixIds: ["rosary"],
  stigma: { prefixId: "rose-thorn", suffixId: "rosary" },
}, { second: 1, runRngSeed: "next-cycle-check" });
assert.equal(nextCycleRun.meta.cycle, 2);
assert.deepEqual(nextCycleRun.stigma, { prefixId: "rose-thorn", suffixId: "rosary" });
assert.ok(nextCycleRun.meta.ownedStigmaPrefixIds.includes("rose-thorn"));
assert.ok(nextCycleRun.meta.ownedStigmaSuffixIds.includes("rosary"));
assert.equal(nextCycleRun.meta.endingRecords["record-stop:altered:truth"].count, 1);
assert.equal(nextCycleRun.meta.endingRecords["record-stop:altered:truth"].lastCycle, 1);
assert.equal(deterministicA.ownedPassiveIds.length, 5);
assert.equal(deterministicA.passiveIds.length, 3);
assert.deepEqual(getDayOffers({ ...deterministicA, phase: "day" }), getDayOffers({ ...deterministicB, phase: "day" }));
assert.deepEqual(
  startExpedition({ ...deterministicA, selectedCompanionId: "alone" }, "stairs").expedition,
  startExpedition({ ...deterministicB, selectedCompanionId: "alone" }, "stairs").expedition,
);
assert.equal(openFirstDay(deterministicA).phase, "day");
const firstDayChoice = chooseDayAction({ ...deterministicA, phase: "day" }, getDayOffers(deterministicA)[0]);
assert.equal(firstDayChoice.resumePhase, "special-event");
assert.ok(!firstDayChoice.pendingResult.notices.some((notice) => notice.includes(deterministicA.specialSeedName)));
const refreshedLegacy = refreshSeedState({
  ...deterministicA,
  specialSeedName: "聖 이전 표기",
  specialSeedRule: "1일차 조사 행동: 통찰 소폭 증가.",
  specialSeedStatsApplied: false,
  stats: baseStats,
});
assert.equal(refreshedLegacy.specialSeedName, seed0.name);
assert.equal(refreshedLegacy.specialSeedRule, seed0.ruleText);
assert.deepEqual(refreshedLegacy.stats, baseStats);
assert.deepEqual(refreshedLegacy.specialSeedGrowthMultipliers, seed0.growthMultipliers);
assert.deepEqual(refreshedLegacy.specialSeedTrait, seed0.trait);
assert.deepEqual(refreshedLegacy.displayStats, baseStats);
assert.deepEqual(refreshSeedState(refreshedLegacy).stats, refreshedLegacy.stats);
const refreshedDaybreakSave = refreshSeedState({
  ...deterministicA,
  phase: "daybreak-transition",
  transitionTargetPhase: "day",
});
assert.equal(refreshedDaybreakSave.phase, "day");
assert.equal(refreshedDaybreakSave.transitionTargetPhase, null);
assert.equal(getNpcSpeaker(deterministicA, "maid"), "메이드");
const maidInteraction = DAY_ACTIONS.find((action) => action.id === "maid-tea");
const afterMaidInteraction = chooseDayAction({ ...deterministicA, phase: "day" }, maidInteraction);
assert.equal(afterMaidInteraction.companionStates.maid.revealed, true);
assert.equal(getNpcSpeaker(afterMaidInteraction, "maid"), "샤를로트");
const knightTraining = DAY_ACTIONS.find((action) => action.id === "sword-drill");
const afterKnightTraining = chooseDayAction({ ...deterministicA, phase: "day" }, knightTraining);
assert.equal(afterKnightTraining.companionStates.knight.revealed, false);
assert.equal(getNpcSpeaker(afterKnightTraining, "knight"), "기사");
const knightInteraction = DAY_ACTIONS.find((action) => action.id === "knight-rounds");
const afterKnightInteraction = chooseDayAction({ ...deterministicA, phase: "day" }, knightInteraction);
assert.equal(afterKnightInteraction.companionStates.knight.revealed, true);
assert.equal(getNpcSpeaker(afterKnightInteraction, "knight"), "리오넬");

const nightfall = continueAfterResult({ ...deterministicA, phase: "result", resumePhase: "night-companion" });
assert.equal(nightfall.phase, "nightfall-transition");
assert.equal(completeTransition(nightfall).phase, "night-companion");
assert.equal(isNightDisplayPhase({ ...deterministicA, phase: "result", resumePhase: "night-companion" }), false);
assert.equal(isNightDisplayPhase({ ...deterministicA, phase: "nightfall-transition" }), false);
assert.equal(isNightDisplayPhase({ ...deterministicA, phase: "night-companion" }), true);
assert.equal(isNightDisplayPhase({ ...deterministicA, phase: "result", resumePhase: "daybreak" }), true);
assert.equal(isNightDisplayPhase({ ...deterministicA, phase: "daybreak-transition" }), false);

const restActions = DAY_ACTIONS.filter((action) => action.category === "rest");
assert.ok(restActions.every((action) => action.effects.stats.health >= 1 && action.effects.stats.health <= 5));
assert.ok(restActions.every((action) => action.effects.stats.stamina >= 1 && action.effects.stats.stamina <= 5));
const longSleep = restActions.find((action) => action.id === "long-sleep");
const normalRest = chooseDayAction({ ...deterministicA, phase: "day" }, longSleep);
const lifeRest = chooseDayAction({
  ...deterministicA,
  phase: "day",
  traits: { ...deterministicA.traits, life: 10 },
}, longSleep);
assert.equal(
  lifeRest.stats.health - deterministicA.stats.health,
  normalRest.stats.health - deterministicA.stats.health + 2,
);
assert.equal(
  lifeRest.stats.stamina - deterministicA.stats.stamina,
  normalRest.stats.stamina - deterministicA.stats.stamina + 2,
);

const staminaCollapse = chooseDayAction(
  { ...deterministicA, phase: "day", stats: { ...deterministicA.stats, stamina: 1 } },
  DAY_ACTIONS.find((action) => action.id === "overwork"),
);
assert.equal(staminaCollapse.resumePhase, "night-companion");
assert.ok(staminaCollapse.pendingResult.notices.includes("스태미나 고갈 · 강제 귀환"));

const secureOption = EXPLORATION_EVENTS[0].options.find((option) => option.id === "secure");
const explorationOptions = getExplorationOptions(EXPLORATION_EVENTS[0]);
const undergroundRest = explorationOptions.find((option) => option.id === "underground-rest");
assert.equal(explorationOptions.length, EXPLORATION_EVENTS[0].options.length + 1);
assert.ok(EXPLORATION_EVENTS.every((event) => getExplorationOptions(event).some((option) => option.id === "underground-rest")));
assert.deepEqual(undergroundRest.success.stats, { health: 1, stamina: 3, resolve: -1, insight: -1 });
assert.deepEqual(undergroundRest.success.resources, { fear: 3 });
assert.deepEqual(undergroundRest.success.estate, { corruption: 5 });
assert.equal(secureOption.chance, 1);
assert.equal(secureOption.success.stats.stamina, -1);
assert.equal(secureOption.failure.stats.stamina, -2);
const operationalExpedition = {
  ...deterministicA,
  phase: "expedition",
  selectedCompanionId: "maid",
  expedition: { directionId: "stairs", totalSteps: 3, stepIndex: 0, eventIds: [EXPLORATION_EVENTS[0].id, EXPLORATION_EVENTS[1].id, EXPLORATION_EVENTS[2].id] },
};
assert.equal(isExplorationOptionAvailable(operationalExpedition, secureOption), true);
const afterUndergroundRest = chooseExplorationOption(operationalExpedition, EXPLORATION_EVENTS[0], undergroundRest);
assert.equal(afterUndergroundRest.stats.health, operationalExpedition.stats.health + 1);
assert.equal(afterUndergroundRest.stats.stamina, operationalExpedition.stats.stamina + 3);
assert.equal(afterUndergroundRest.stats.resolve, operationalExpedition.stats.resolve - 1);
assert.equal(afterUndergroundRest.stats.insight, operationalExpedition.stats.insight - 1);
assert.equal(afterUndergroundRest.resources.fear, operationalExpedition.resources.fear + 3);
assert.equal(afterUndergroundRest.estate.corruption, operationalExpedition.estate.corruption + 5);
const transformedExpedition = {
  ...operationalExpedition,
  companionStates: {
    ...operationalExpedition.companionStates,
    maid: { ...operationalExpedition.companionStates.maid, status: "transformed" },
  },
};
assert.equal(isExplorationOptionAvailable(transformedExpedition, secureOption), false);
assert.equal(chooseExplorationOption(transformedExpedition, EXPLORATION_EVENTS[0], secureOption), transformedExpedition);
assert.ok(getFinaleOptions(transformedExpedition, FINALES.find((finale) => finale.sacrifice))
  .every((option) => option.id !== "leave-companion"));
const nightStaminaCollapse = chooseExplorationOption({
  ...operationalExpedition,
  stats: { ...operationalExpedition.stats, stamina: 0 },
}, EXPLORATION_EVENTS[0], secureOption);
assert.equal(nightStaminaCollapse.resumePhase, "daybreak");
assert.ok(nightStaminaCollapse.pendingResult.notices.includes("스태미나 고갈 · 강제 귀환"));
const resolvePenalty = chooseExplorationOption({
  ...operationalExpedition,
  stats: { ...operationalExpedition.stats, resolve: -1, stamina: 10 },
}, EXPLORATION_EVENTS[0], secureOption);
assert.ok(resolvePenalty.pendingResult.notices.includes("결단 저하 · 성공 가능성 절반"));
assert.equal(resolveChoice({
  ...operationalExpedition,
  phase: "night",
  runSeed: operationalExpedition.runRngSeed,
  stats: { ...operationalExpedition.stats, resolve: -1 },
}, {
  id: "secure-preview",
  successChance: secureOption.chance,
  stats: secureOption.success.stats,
  failure: secureOption.failure,
}).effectiveChance, 0.5);
assert.equal(getEffectiveChoiceChance({
  ...operationalExpedition,
  phase: "night",
  resources: { ...operationalExpedition.resources, fear: 5 },
  estate: { ...operationalExpedition.estate, corruption: 2 },
}, 1), 0.89);
assert.equal(getEffectiveChoiceChance({
  ...operationalExpedition,
  phase: "day",
  resources: { ...operationalExpedition.resources, fear: 5 },
  estate: { ...operationalExpedition.estate, corruption: 2 },
}, 1), 1);
assert.equal(getEffectiveChoiceChance({
  ...operationalExpedition,
  phase: "event",
  resources: { ...operationalExpedition.resources, fear: 120 },
  estate: { ...operationalExpedition.estate, corruption: 20 },
}, 0.4), 0);
const seedTrait = (benefitId, burdenId) => ({
  benefit: SEED_BENEFIT_RULES.find((rule) => rule.id === benefitId),
  burden: SEED_BURDEN_RULES.find((rule) => rule.id === burdenId),
});
const seedRuleGame = (trait, phase = "day") => ({
  ...deterministicA,
  phase,
  specialSeedTrait: trait,
  specialSeedGrowthMultipliers: {},
  passiveIds: [],
  titles: [],
  stigma: { prefixId: null, suffixId: null },
  nextTurn: {},
  history: [],
  runSeed: "seed-rule-check",
});

for (const category of ["gathering", "interaction", "investigation", "training", "rest", "other"]) {
  const categoryBenefit = resolveChoice(seedRuleGame(seedTrait(`${category}-boon`, "night-failure-burden")), {
    id: `category-${category}`,
    category,
    stats: { health: 1 },
    resources: { fear: 1 },
  });
  assert.equal(categoryBenefit.statDelta.health, 1.1);
  assert.equal(categoryBenefit.resourceDelta.fear, 1);
}
const daySuccessBenefit = resolveChoice(seedRuleGame(seedTrait("day-success-boon", "night-failure-burden")), {
  id: "day-success-benefit",
  stats: { health: 1 },
});
assert.equal(daySuccessBenefit.statDelta.health, 1.1);
const nightSuccessBenefit = resolveChoice(seedRuleGame(seedTrait("night-success-boon", "day-failure-burden"), "night"), {
  id: "night-success-benefit",
  stats: { insight: 1 },
});
assert.equal(nightSuccessBenefit.statDelta.insight, 1.1);
const dangerSuccessBenefit = resolveChoice(seedRuleGame(seedTrait("danger-success-boon", "day-failure-burden")), {
  id: "danger-success-benefit",
  tone: "danger",
  stats: { health: -1 },
  resources: { fear: 1 },
  estate: { corruption: 1 },
});
assert.equal(dangerSuccessBenefit.statDelta.health, -0.9);
assert.equal(dangerSuccessBenefit.resourceDelta.fear, 0.9);
assert.equal(dangerSuccessBenefit.estateDelta.corruption, 0.9);

const pressuredSeedGame = {
  ...seedRuleGame(seedTrait("pressure-boon", "day-failure-burden"), "night"),
  resources: { ...deterministicA.resources, fear: 5 },
  estate: { ...deterministicA.estate, corruption: 2 },
};
assert.equal(getEffectiveChoiceChance(pressuredSeedGame, 1, { id: "pressure-benefit" }), 0.901);
const dayFailureBurden = resolveChoice(seedRuleGame(seedTrait("night-success-boon", "day-failure-burden")), {
  id: "day-failure-burden",
  successChance: 0,
  failure: { stats: { stamina: -1 }, resources: { fear: 1 } },
});
assert.equal(dayFailureBurden.statDelta.stamina, -1.1);
assert.equal(dayFailureBurden.resourceDelta.fear, 1.1);
const nightFailureBurden = resolveChoice(seedRuleGame(seedTrait("day-success-boon", "night-failure-burden"), "night"), {
  id: "night-failure-burden",
  successChance: 0,
  failure: { stats: { health: -1 } },
});
assert.equal(nightFailureBurden.statDelta.health, -1.1);
assert.equal(
  getEffectiveChoiceChance(seedRuleGame(seedTrait("day-success-boon", "danger-chance-burden"), "night"), 1, { id: "danger-chance", tone: "danger" }),
  0.9,
);
const staminaLossBurden = resolveChoice(seedRuleGame(seedTrait("night-success-boon", "stamina-loss-burden")), {
  id: "stamina-loss-burden",
  stats: { stamina: -2, health: -2 },
});
assert.equal(staminaLossBurden.statDelta.stamina, -2.2);
assert.equal(staminaLossBurden.statDelta.health, -2);
const healthLossBurden = resolveChoice(seedRuleGame(seedTrait("night-success-boon", "health-loss-burden")), {
  id: "health-loss-burden",
  stats: { stamina: -2, health: -2 },
});
assert.equal(healthLossBurden.statDelta.health, -2.2);
assert.equal(healthLossBurden.statDelta.stamina, -2);
const forfeitBurden = resolveChoice(seedRuleGame(seedTrait("night-success-boon", "forfeit-burden")), {
  id: "forfeit-burden",
  isForfeit: true,
  estate: { stability: -1 },
  resources: { fear: 1 },
});
assert.equal(forfeitBurden.estateDelta.stability, -1.1);
assert.equal(forfeitBurden.resourceDelta.fear, 1.1);
const retreatBurden = retreatExpedition({
  ...seedRuleGame(seedTrait("day-success-boon", "forfeit-burden"), "expedition"),
  expedition: { directionId: "stairs", totalSteps: 3, stepIndex: 1, eventIds: [] },
});
assert.equal(retreatBurden.estate.stability, deterministicA.estate.stability - 1.1);
assert.equal(retreatBurden.resources.fear, deterministicA.resources.fear + 1.1);
assert.ok(retreatBurden.pendingResult.notices.some((notice) => notice.startsWith("성인의 달 ·")));

assert.equal(roundToTenth(1.1999999), 1.2);
assert.equal(truncateToTenth(1.1999999), 1.1);
assert.equal(truncateToTenth(1.2), 1.2);
const rawDisplayDelta = resolveChoice({
  ...seedRuleGame(null),
  specialSeedTrait: null,
}, {
  id: "raw-display-delta",
  stats: { health: 1.1999999 },
});
assert.equal(rawDisplayDelta.statDelta.health, 1.2);
assert.equal(rawDisplayDelta.displayDeltas.stats.health, 1.1999999);
const restSeedRun = createNewRun({ second: 4, runRngSeed: "rest-display-run" });
const restSeedResult = chooseDayAction({ ...restSeedRun, phase: "day" }, longSleep);
assert.equal(restSeedResult.stats.health, restSeedRun.stats.health + 3.3);
assert.equal(truncateToTenth(restSeedResult.displayStats.health), restSeedRun.stats.health + 3.3);

const insightInversion = resolveChoice({
  ...deterministicA,
  phase: "day",
  runSeed: deterministicA.runRngSeed,
  stats: { ...deterministicA.stats, insight: -1 },
}, {
  id: "insight-inversion-check",
  stats: { insight: 2, charm: -3 },
  resources: { food: 4, fear: -2 },
  estate: { stability: 3, corruption: -1 },
  traits: { life: 2, suspicion: -2 },
  affinities: { maid: 2, knight: -2 },
});
assert.equal(insightInversion.statDelta.insight, -2);
assert.equal(insightInversion.statDelta.charm, -3);
assert.equal(insightInversion.resourceDelta.food, -4);
assert.equal(insightInversion.resourceDelta.fear, -2);
assert.equal(insightInversion.estateDelta.stability, -3);
assert.equal(insightInversion.estateDelta.corruption, -1);
assert.equal(insightInversion.traitDelta.life, -2);
assert.equal(insightInversion.traitDelta.suspicion, -2);
assert.equal(insightInversion.affinityDelta.maid, -2);
assert.equal(insightInversion.affinityDelta.knight, -2);

let sacrificeRun = createNewRun({ second: 0, runRngSeed: "sacrifice-run" });
sacrificeRun = applyPermanentLoss(sacrificeRun, "guard-father", "dead", "test");
assert.equal(sacrificeRun.sacrificeCount, 1);
sacrificeRun = applyPermanentLoss(sacrificeRun, "guard-father", "dead", "duplicate");
assert.equal(sacrificeRun.sacrificeCount, 1);
sacrificeRun = applyPermanentLoss(sacrificeRun, "porter-mother", "transformed", "test");
assert.equal(sacrificeRun.sacrificeCount, 1);
sacrificeRun = applyPermanentLoss(sacrificeRun, "porter-mother", "transformed", "duplicate transformation");
assert.equal(sacrificeRun.companionStates["porter-mother"].lossReason, "test");
sacrificeRun = applyPermanentLoss(sacrificeRun, "porter-mother", "missing", "invalid transition");
assert.equal(sacrificeRun.companionStates["porter-mother"].status, "transformed");
sacrificeRun = applyPermanentLoss(sacrificeRun, "porter-mother", "dead", "invalid kill");
assert.equal(sacrificeRun.companionStates["porter-mother"].status, "transformed");
sacrificeRun = applyPermanentLoss(sacrificeRun, "porter-mother", "dead", "transformed kill", true);
assert.equal(sacrificeRun.sacrificeCount, 2);
assert.equal(sacrificeRun.keepsakes.length, 2);
sacrificeRun = applyPermanentLoss(sacrificeRun, "porter-mother", "dead", "duplicate kill", true);
assert.equal(sacrificeRun.keepsakes.length, 2);
sacrificeRun = applyPermanentLoss({ ...sacrificeRun, day: 8 }, "young-groom", "missing", "late loss");
assert.equal(sacrificeRun.sacrificeCount, 2);

const altered = finishNight({ ...sacrificeRun, day: 7, sacrificeCount: 3, deathAtDaybreak: false });
assert.equal(altered.route, "altered");
assert.equal(altered.day, 8);
assert.equal(altered.phase, "day-eight");
const normal = finishNight({ ...sacrificeRun, day: 7, sacrificeCount: 2, deathAtDaybreak: false });
assert.equal(normal.route, "normal");
const nextDayInsightReset = finishNight({
  ...deterministicA,
  day: 3,
  stats: { ...deterministicA.stats, insight: -4, stamina: -2 },
  deathAtDaybreak: false,
});
assert.equal(nextDayInsightReset.day, 4);
assert.equal(nextDayInsightReset.stats.insight, 0);
assert.equal(nextDayInsightReset.stats.stamina, 10);
assert.equal(nextDayInsightReset.displayStats.insight, 0);
assert.equal(nextDayInsightReset.displayStats.stamina, 10);
const positiveInsightKept = finishNight({
  ...deterministicA,
  day: 3,
  stats: { ...deterministicA.stats, insight: 5 },
  displayStats: { ...deterministicA.displayStats, insight: 4.9999999 },
  deathAtDaybreak: false,
});
assert.equal(positiveInsightKept.stats.insight, 5);
assert.equal(positiveInsightKept.displayStats.insight, 4.9999999);
const dayEightInsightReset = finishNight({
  ...sacrificeRun,
  day: 7,
  sacrificeCount: 2,
  stats: { ...sacrificeRun.stats, insight: -3 },
  deathAtDaybreak: false,
});
assert.equal(dayEightInsightReset.day, 8);
assert.equal(dayEightInsightReset.stats.insight, 0);

const transformedReturn = continueAfterResult({
  ...deterministicA,
  phase: "result",
  resumePhase: "daybreak",
  selectedCompanionId: "guard-father",
  companionStates: {
    ...deterministicA.companionStates,
    "guard-father": { ...deterministicA.companionStates["guard-father"], status: "transformed" },
  },
});
assert.equal(transformedReturn.phase, "escape-transformed-choice");
const sparedReturn = chooseEscapeTransformedFate(transformedReturn, "spare");
assert.equal(sparedReturn.resumePhase, "daybreak");
assert.equal(continueAfterResult(sparedReturn).phase, "day");

console.log("Rosenthal vertical slice verification passed.");
