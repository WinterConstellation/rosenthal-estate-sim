import assert from "node:assert/strict";
import { SAINT_SEEDS } from "../src/data/saintSeeds.js";
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
  DAY_INTERLUDES,
  NIGHT_ENTRY_SCRIPT,
  PROLOGUE as USER_PROLOGUE,
} from "../src/rules/tutorialRules.js";
import {
  applyPermanentLoss,
  chooseDayAction,
  chooseEscapeTransformedFate,
  chooseExplorationOption,
  completeTransition,
  continueAfterResult,
  createNewRun,
  finishNight,
  getDayOffers,
  getFinaleOptions,
  getNpcSpeaker,
  isExplorationOptionAvailable,
  openFirstDay,
  refreshSeedState,
  startExpedition,
} from "../src/engine/rosenthalEngine.js";
import { resolveChoice } from "../src/engine/rulesEngine.js";

assert.equal(SAINT_SEEDS.length, 60);
assert.equal(new Set(SAINT_SEEDS.map((seed) => seed.name)).size, 60);
assert.equal(new Set(SAINT_SEEDS.map((seed) => seed.ruleText)).size, 60);
assert.deepEqual(SAINT_SEEDS.map((seed) => seed.eventGroupId), Array.from({ length: 60 }, (_, index) => Math.floor(index / 5)));
assert.ok(SAINT_SEEDS.every((seed) => /^(성|성녀|성자|성인) /.test(seed.name) && seed.name.endsWith("의 달")));
assert.ok(SAINT_SEEDS.every((seed) => !seed.name.includes("聖")));
assert.ok(SAINT_SEEDS.every((seed) => !["김대건", "정하상", "고순이", "권진이", "김효임", "김효주"].some((name) => seed.name.includes(name))));
assert.ok(SAINT_SEEDS.every((seed) => seed.boon.group === "stats" && seed.burden.group === "stats"));
assert.ok(SAINT_SEEDS.every((seed) => seed.boon.amount > 0 && seed.burden.amount < 0));
assert.ok(SAINT_SEEDS.every((seed) => !seed.ruleText.includes("일차") && !seed.ruleText.includes("행동")));

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
assert.equal(CORE_NPCS.find((npc) => npc.id === "maid")?.name, "샤를로트");
assert.equal(CORE_NPCS.find((npc) => npc.id === "knight")?.name, "리오넬");
assert.ok(CORE_NPCS.filter((npc) => !["maid", "knight"].includes(npc.id)).every((npc) => npc.name === "*미정*"));
assert.ok(USER_PROLOGUE.text.some((line) => line.includes("허리에는 사용감이 많은 검")));
assert.ok(USER_PROLOGUE.text.every((line) => !line.includes("팔랑거리는 치맛단")));
assert.ok(DAY_INTERLUDES[0].paragraphs[0].startsWith("당신은 선택을 해야 한다."));
assert.ok(DAY_INTERLUDES[1].paragraphs.some((paragraph) => paragraph.includes("힐링물 같은 세계")));
assert.ok(DAY_INTERLUDES[2].paragraphs.some((paragraph) => paragraph.includes("아무 일도 일어나지 않는다")));

const deterministicA = createNewRun({ second: 37, runRngSeed: "fixed-run" });
const deterministicB = createNewRun({ second: 37, runRngSeed: "fixed-run" });
const seed37 = SAINT_SEEDS[37];
const baseStats = { health: 8, insight: 7, resolve: 7, charm: 8, faith: 4, stamina: 10 };
assert.equal(deterministicA.specialSeedId, 37);
assert.equal(deterministicA.eventGroupId, Math.floor(37 / 5));
assert.equal(deterministicA.specialSeedName, seed37.name);
assert.equal(deterministicA.specialSeedRule, seed37.ruleText);
assert.equal(deterministicA.stats[seed37.boon.key], baseStats[seed37.boon.key] + seed37.boon.amount);
assert.equal(deterministicA.stats[seed37.burden.key], baseStats[seed37.burden.key] + seed37.burden.amount);
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
assert.equal(refreshedLegacy.specialSeedName, seed37.name);
assert.equal(refreshedLegacy.specialSeedRule, seed37.ruleText);
assert.equal(refreshedLegacy.stats[seed37.boon.key], baseStats[seed37.boon.key] + seed37.boon.amount);
assert.equal(refreshSeedState(refreshedLegacy).stats[seed37.boon.key], refreshedLegacy.stats[seed37.boon.key]);
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
assert.equal(altered.phase, "daybreak-transition");
assert.equal(completeTransition(altered).phase, "day-eight");
const normal = finishNight({ ...sacrificeRun, day: 7, sacrificeCount: 2, deathAtDaybreak: false });
assert.equal(normal.route, "normal");

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
assert.equal(continueAfterResult(sparedReturn).phase, "daybreak-transition");

console.log("Rosenthal vertical slice verification passed.");
