import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { SAINT_SEEDS, SEED_BENEFIT_RULES, SEED_BURDEN_RULES } from "../src/data/saintSeeds.js";
import {
  CORE_NPCS,
  DAY_ACTIONS,
  DIRECTIONS,
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
  beginPrologue,
  chooseDayAction,
  chooseEscapeTransformedFate,
  chooseExplorationOption,
  chooseFinaleOption,
  chooseSpecialEvent,
  chooseTransformedFate,
  completeTransition,
  continueAfterResult,
  createNewRun,
  deriveHorrorState,
  deliverKeepsake,
  normalizeProgressMeta,
  finishNight,
  finishVerticalSlice,
  getCompanionOffers,
  getCurrentExplorationEvent,
  getCurrentFinale,
  getDayOffers,
  getDirectionOffers,
  getExplorationOptions,
  getFinaleOptions,
  getNpcSpeaker,
  getSpecialGroup,
  isExplorationOptionAvailable,
  isNightDisplayPhase,
  openFirstDay,
  refreshSeedState,
  retreatExpedition,
  selectCompanion,
  startExpedition,
} from "../src/engine/rosenthalEngine.js";
import {
  DAY_ACTION_STORYLETS,
  DAY_ACTION_TRIGGER_PREFIX,
  getDayActionCandidates,
  getDayActionStorylets,
  getDayActionTriggerKey,
} from "../src/engine/dayActionStorylets.js";
import {
  EXPLORATION_STORYLETS,
  EXPLORATION_TRIGGER_PREFIX,
  getExplorationCandidates,
  getExplorationStorylets,
  getExplorationTriggerKey,
} from "../src/engine/explorationStorylets.js";
import {
  createInitialGame as createLegacyInitialGame,
  getDayOffers as getLegacyDayOffers,
  getNightOffers as getLegacyNightOffers,
} from "../src/engine/legacyProgressionEngine.js";
import { getEffectiveChoiceChance, resolveChoice, roundToTenth, truncateToTenth } from "../src/engine/rulesEngine.js";
import { seededRank } from "../src/engine/seed.js";
import {
  HORROR_DERIVED_META,
  HORROR_TRAIT_META,
  LEGACY_STIGMA_MARK_MAP,
  AFFINITY_MARK_GROUPS,
  MARK_BRANCH_UNLOCKS,
  STANDALONE_MARKS,
  MARKS,
  getMark,
  getMarkBranchLabel,
  getMarkBranchProgress,
  getUnlockedBranchKeys,
  isMarkObtainable,
} from "../src/rules/systemRules.js";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const dialogueCardSource = readFileSync(new URL("../src/components/DialogueCard.jsx", import.meta.url), "utf8");
const firstDayHintSource = readFileSync(new URL("../src/components/FirstDayHintModal.jsx", import.meta.url), "utf8");
const resultOverlaySource = readFileSync(new URL("../src/screens/ResultOverlay.jsx", import.meta.url), "utf8");
const rulesEngineSource = readFileSync(new URL("../src/engine/rulesEngine.js", import.meta.url), "utf8");
const legacyProgressionEngineSource = readFileSync(new URL("../src/engine/legacyProgressionEngine.js", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
for (const removedToken of ["GlyphAtmosphereCanvas", "glyphAtmosphere", "glyphFormat", "glyph-atmosphere"]) {
  assert.equal(appSource.includes(removedToken), false, `App.jsx 글리프 잔재 금지: ${removedToken}`);
}
for (const removedPath of [
  "../src/effects/GlyphAtmosphereCanvas.jsx",
  "../src/effects/glyphAtmosphere.css",
  "../src/glyph-fall-fix.css",
]) {
  assert.equal(existsSync(new URL(removedPath, import.meta.url)), false, `삭제된 글리프 파일 금지: ${removedPath}`);
}
assert.equal(appSource.includes("function ResultOverlay"), false, "App.jsx 내부 ResultOverlay 함수는 분리되어야 함");
assert.equal(appSource.includes("function DialogueCard"), false, "App.jsx 내부 DialogueCard 함수는 공유 컴포넌트로 분리되어야 함");
assert.equal(appSource.includes('from "./screens/ResultOverlay.jsx"'), true, "App.jsx는 ResultOverlay를 독립 컴포넌트에서 import해야 함");
assert.equal(appSource.includes('from "./components/DialogueCard.jsx"'), true, "App.jsx는 DialogueCard를 공유 컴포넌트에서 import해야 함");
assert.equal(appSource.includes('from "./components/FirstDayHintModal.jsx"'), true, "App.jsx는 첫날 힌트 팝업을 독립 컴포넌트에서 import해야 함");
assert.equal(appSource.includes("<FirstDayHintModal"), true, "App.jsx는 첫날 힌트 팝업을 렌더링해야 함");
assert.equal(resultOverlaySource.includes("export function ResultOverlay"), true, "ResultOverlay 독립 컴포넌트 export 필요");
assert.equal(dialogueCardSource.includes("export function DialogueCard"), true, "DialogueCard 공유 컴포넌트 export 필요");
assert.equal(dialogueCardSource.includes("export function normalizeDialogue"), true, "normalizeDialogue 공유 export 필요");
assert.equal(firstDayHintSource.includes("export function FirstDayHintModal"), true, "FirstDayHintModal 독립 컴포넌트 export 필요");
assert.equal(firstDayHintSource.includes("낮의 장부"), true, "첫날 힌트는 낮 업무 안내를 포함해야 함");
assert.equal(firstDayHintSource.includes("저택 아래로 이어지는 일정"), true, "첫날 힌트는 밤 진행을 로젠탈식 안내로 암시해야 함");
assert.equal(appSource.includes("낮의 장부"), false, "App.jsx에 첫날 힌트 장문 JSX를 직접 두지 않는다");
for (const forbiddenHintWord of ["제물", "사망", "소각", "변질", "7일", "정답 루트", "최적 선택"]) {
  assert.equal(firstDayHintSource.includes(forbiddenHintWord), false, `첫날 힌트 금지어 노출 금지: ${forbiddenHintWord}`);
}
assert.equal(stylesSource.includes(".choice--warning"), true, "단순 비용/불길한 징조용 warning 선택지 스타일 필요");
assert.equal(stylesSource.includes(".choice--uneasy"), true, "불길한 징조용 uneasy 선택지 스타일 alias 필요");
assert.equal(stylesSource.includes(".first-day-hint-modal"), true, "첫날 힌트 팝업 스타일 필요");
assert.equal(rulesEngineSource.includes("../rules/tutorialRules.js"), false, "rulesEngine은 구형 튜토리얼 진행 데이터를 직접 import하지 않는다");
for (const legacyExport of [
  "createInitialGame",
  "getCriticalState",
  "isChoiceAvailable",
  "getDayOffers",
  "getNightOffers",
  "getTitles",
  "hasPeacefulLordEnding",
  "assessChoice",
  "getEstateState",
  "getTitle",
]) {
  assert.equal(rulesEngineSource.includes(`export function ${legacyExport}`), false, `rulesEngine 구형 진행 API export 금지: ${legacyExport}`);
  assert.equal(legacyProgressionEngineSource.includes(`export function ${legacyExport}`), true, `legacyProgressionEngine 보존 API 필요: ${legacyExport}`);
}
const legacyProgressionGame = createLegacyInitialGame("legacy-boundary-check");
assert.equal(legacyProgressionGame.version, 9);
assert.ok(getLegacyDayOffers(legacyProgressionGame).length > 0);
assert.ok(getLegacyNightOffers(legacyProgressionGame).length > 0);

const AUTOPLAY_SMOKE_SEEDS = [
  { second: 0, runRngSeed: "autoplay-smoke-0" },
  { second: 1, runRngSeed: "autoplay-smoke-1" },
  { second: 7, runRngSeed: "autoplay-smoke-7" },
  { second: 13, runRngSeed: "autoplay-smoke-13" },
  { second: 59, runRngSeed: "autoplay-smoke-59" },
];
const AUTOPLAY_MAX_STEPS = 500;
const AUTOPLAY_REPEAT_LIMIT = 4;
const AUTOPLAY_TERMINAL_PHASES = new Set(["record-stop", "ending"]);

function getAutoplayContext({ seedConfig, step, state }) {
  return `seed=${seedConfig.runRngSeed}/${seedConfig.second}, step=${step}, phase=${state?.phase}, day=${state?.day}, dayTurn=${state?.dayTurn}`;
}

function failAutoplay(message, context) {
  throw new Error(`autoplay smoke failed: ${message} (${getAutoplayContext(context)})`);
}

function getFirstAvailable(items) {
  return items.find((item) => item && item.available !== false);
}

function assertFiniteAutoplayMap(map, label, context) {
  if (!map || typeof map !== "object" || Array.isArray(map)) {
    failAutoplay(`${label} must be an object`, context);
  }
  Object.entries(map).forEach(([key, value]) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      failAutoplay(`${label}.${key} must be finite, got ${value}`, context);
    }
  });
}

function assertAutoplayState(state, context) {
  if (!state || typeof state !== "object") failAutoplay("state must be an object", context);
  if (typeof state.phase !== "string") failAutoplay("phase must be a string", context);
  if (!KNOWN_AUTOPLAY_PHASES.has(state.phase)) failAutoplay(`unknown phase ${state.phase}`, context);
  if (!Number.isFinite(state.day)) failAutoplay(`day must be finite, got ${state.day}`, context);
  if (!Number.isFinite(state.dayTurn)) failAutoplay(`dayTurn must be finite, got ${state.dayTurn}`, context);
  if (!Array.isArray(state.history)) failAutoplay("history must be an array", context);
  if (!Number.isFinite(state.history.length)) failAutoplay("history.length must be finite", context);
  if (state.phase === "result" && !state.pendingResult) failAutoplay("result phase requires pendingResult", context);
  assertFiniteAutoplayMap(state.resources, "resources", context);
  assertFiniteAutoplayMap(state.estate, "estate", context);
  assertFiniteAutoplayMap(state.stats, "stats", context);
  assertFiniteAutoplayMap(state.horrorTraits, "horrorTraits", context);
  assertFiniteAutoplayMap(state.derivedHorror, "derivedHorror", context);
}

function getAutoplayLoopKey(state) {
  return [
    state.phase,
    state.day,
    state.dayTurn,
    state.expedition?.stepIndex ?? "none",
    state.history.length,
  ].join("|");
}

function projectFiniteMap(map) {
  return Object.fromEntries(Object.entries(map).sort(([left], [right]) => left.localeCompare(right)));
}

function projectAutoplayState(state) {
  return {
    phase: state.phase,
    day: state.day,
    dayTurn: state.dayTurn,
    route: state.route ?? null,
    endingId: state.endingId ?? state.ending?.id ?? null,
    sacrificeCount: state.sacrificeCount ?? 0,
    history: state.history.map((entry) => ({
      day: entry.day ?? null,
      phase: entry.phase ?? null,
      choiceId: entry.choiceId ?? null,
      label: entry.label ?? null,
      success: entry.success ?? null,
    })),
    resources: projectFiniteMap(state.resources),
    estate: projectFiniteMap(state.estate),
    stats: projectFiniteMap(state.stats),
    horrorTraits: projectFiniteMap(state.horrorTraits),
    derivedHorror: projectFiniteMap(state.derivedHorror),
  };
}

function handleAutoplayDay(state, context) {
  const choice = getFirstAvailable(getDayOffers(state));
  if (!choice) failAutoplay("day phase has no valid offer", context);
  return chooseDayAction(state, choice);
}

function handleAutoplaySpecialEvent(state, context) {
  const group = getSpecialGroup(state);
  const stage = group?.stages?.[state.specialProgress];
  const option = stage?.options?.[0];
  if (!option) failAutoplay("special-event phase has no current option", context);
  return chooseSpecialEvent(state, option);
}

function handleAutoplayNightCompanion(state, context) {
  const offers = getCompanionOffers(state);
  const companion = offers.find((offer) => offer.id === "alone") ?? offers[0];
  if (!companion) failAutoplay("night-companion phase has no companion offer", context);
  return selectCompanion(state, companion.id);
}

function handleAutoplayNightDirection(state, context) {
  const direction = getDirectionOffers()[0];
  if (!direction) failAutoplay("night-direction phase has no direction offer", context);
  return startExpedition(state, direction.id);
}

function handleAutoplayExpedition(state, context) {
  const event = getCurrentExplorationEvent(state);
  if (!event) failAutoplay("expedition phase has no current event", context);
  const option = getExplorationOptions(event).find((candidate) => isExplorationOptionAvailable(state, candidate));
  if (!option) failAutoplay(`expedition event ${event.id} has no available option`, context);
  return chooseExplorationOption(state, event, option);
}

function handleAutoplayFinale(state, context) {
  const finale = getCurrentFinale(state);
  if (!finale) failAutoplay("finale phase has no current finale", context);
  const option = getFinaleOptions(state, finale)[0];
  if (!option) failAutoplay(`finale ${finale.id} has no option`, context);
  return chooseFinaleOption(state, finale, option);
}

const autoplayHandlers = {
  "seed-reveal": (state) => beginPrologue(state),
  prologue: (state) => openFirstDay(state),
  day: handleAutoplayDay,
  "special-event": handleAutoplaySpecialEvent,
  result: (state, context) => {
    if (!state.pendingResult) failAutoplay("result phase requires pendingResult", context);
    return continueAfterResult(state);
  },
  "nightfall-transition": (state) => completeTransition(state),
  "night-companion": handleAutoplayNightCompanion,
  "night-direction": handleAutoplayNightDirection,
  expedition: handleAutoplayExpedition,
  finale: handleAutoplayFinale,
  "keepsake-delivery": (state) => deliverKeepsake(state, "family"),
  "transformed-choice": (state) => chooseTransformedFate(state, "spare"),
  "escape-transformed-choice": (state) => chooseEscapeTransformedFate(state, "spare"),
  "day-eight": (state) => finishVerticalSlice(state),
};

const KNOWN_AUTOPLAY_PHASES = new Set([
  ...Object.keys(autoplayHandlers),
  ...AUTOPLAY_TERMINAL_PHASES,
]);

function runAutoplaySmoke(seedConfig) {
  let state = createNewRun(seedConfig);
  const seenKeys = new Map();
  for (let step = 0; step <= AUTOPLAY_MAX_STEPS; step += 1) {
    const context = { seedConfig, step, state };
    assertAutoplayState(state, context);
    const loopKey = getAutoplayLoopKey(state);
    const seenCount = (seenKeys.get(loopKey) ?? 0) + 1;
    seenKeys.set(loopKey, seenCount);
    if (seenCount > AUTOPLAY_REPEAT_LIMIT) {
      failAutoplay(`loop key repeated too often: ${loopKey}`, context);
    }
    if (AUTOPLAY_TERMINAL_PHASES.has(state.phase)) {
      return { state, projection: projectAutoplayState(state), steps: step };
    }
    const handler = autoplayHandlers[state.phase];
    if (!handler) failAutoplay(`no handler for phase ${state.phase}`, context);
    const nextState = handler(state, context);
    if (!nextState || typeof nextState !== "object") {
      failAutoplay(`handler for phase ${state.phase} did not return state`, context);
    }
    state = nextState;
  }
  failAutoplay(`exceeded ${AUTOPLAY_MAX_STEPS} steps`, { seedConfig, step: AUTOPLAY_MAX_STEPS, state });
}

assert.equal(SAINT_SEEDS.length, 60);
assert.equal(new Set(SAINT_SEEDS.map((seed) => seed.name)).size, 60);
assert.equal(new Set(SAINT_SEEDS.map((seed) => seed.ruleText)).size, 60);
assert.deepEqual(SAINT_SEEDS.map((seed) => seed.eventGroupId), Array.from({ length: 60 }, (_, index) => Math.floor(index / 5)));
assert.ok(SAINT_SEEDS.every((seed) => /^(성|성녀|성자|성인) /.test(seed.name) && seed.name.endsWith("의 달")));
assert.ok(SAINT_SEEDS.every((seed) => !seed.name.includes("聖")));
assert.ok(SAINT_SEEDS.every((seed) => !["김대건", "정하상", "고순이", "권진이", "김효임", "김효주"].some((name) => seed.name.includes(name))));
assert.equal(SEED_BENEFIT_RULES.length, 10);
assert.equal(SEED_BURDEN_RULES.length, 6);
assert.equal(Object.keys(HORROR_TRAIT_META).length, 8);
assert.equal(Object.keys(HORROR_DERIVED_META).length, 6);
assert.ok(SAINT_SEEDS.every((seed) => (
  seed.trait.benefit && seed.trait.burden
  && seed.trait.benefit.modifier.multiplier >= 0.9
  && seed.trait.benefit.modifier.multiplier <= 1.1
  && seed.trait.burden.modifier.multiplier === 0.9
)));
assert.equal(new Set(SAINT_SEEDS.map((seed) => `${seed.trait.benefit.id}:${seed.trait.burden.id}`)).size, 60);
assert.ok(SEED_BENEFIT_RULES.every((rule) => (
  rule.modifier.kind === "beneficial" ? rule.modifier.multiplier === 1.1 : rule.modifier.multiplier === 0.9
)));
assert.ok(SEED_BURDEN_RULES.every((rule) => rule.modifier.multiplier === 0.9));
assert.ok(SAINT_SEEDS.every((seed) => seed.boon && seed.burden && seed.growthMultipliers));
assert.ok(SAINT_SEEDS.every((seed) => !seed.ruleText.includes("일차")));

assert.equal(DAY_ACTIONS.length, 30);
for (const category of ["gathering", "interaction", "investigation", "training", "rest", "other"]) {
  assert.equal(DAY_ACTIONS.filter((action) => action.category === category).length, 5);
}
assert.equal(DAY_ACTION_STORYLETS.length, DAY_ACTIONS.length);
assert.equal(new Set(DAY_ACTION_STORYLETS.map((storylet) => storylet.id)).size, DAY_ACTIONS.length);
assert.ok(DAY_ACTION_STORYLETS.every((storylet) => storylet.id.startsWith("day-action:")));
assert.ok(DAY_ACTION_STORYLETS.every((storylet) => storylet.triggerKey.startsWith(DAY_ACTION_TRIGGER_PREFIX)));
for (const category of ["gathering", "interaction", "investigation", "training", "rest", "other"]) {
  const triggerKey = getDayActionTriggerKey(category);
  const sourceIds = DAY_ACTIONS.filter((action) => action.category === category).map((action) => action.id);
  const storyletIds = getDayActionStorylets({ truthFlags: { metAlchemist: true } }, category)
    .map((storylet) => storylet.payload.id);
  assert.deepEqual(storyletIds, sourceIds, `day action storylet order mismatch: ${category}`);
  assert.equal(triggerKey, `${DAY_ACTION_TRIGGER_PREFIX}${category}`);
}
assert.equal(
  getDayActionCandidates({ truthFlags: {} }, "investigation").some((action) => action.id === "summoning-trace"),
  false,
);
assert.equal(
  getDayActionCandidates({ truthFlags: { metAlchemist: true } }, "investigation").some((action) => action.id === "summoning-trace"),
  true,
);
assert.deepEqual(
  Object.fromEntries(["gain", "loss", "gain-heavy", "loss-heavy"].map((kind) => [
    kind,
    DAY_ACTIONS.filter((action) => action.balance === kind).length,
  ])),
  { gain: 5, loss: 5, "gain-heavy": 10, "loss-heavy": 10 },
);
const severeChoiceTones = new Set(["danger", "extreme", "lethal"]);
const firstDaySafeActions = DAY_ACTIONS.filter((action) => action.firstDaySafe);
assert.equal(firstDaySafeActions.length, 6);
for (const category of ["gathering", "interaction", "investigation", "training", "rest", "other"]) {
  assert.equal(
    firstDaySafeActions.filter((action) => action.category === category).length,
    1,
    `1일차 안전 낮 후보는 카테고리별 1개씩 필요: ${category}`,
  );
}
assert.ok(firstDaySafeActions.every((action) => !severeChoiceTones.has(action.tone ?? "neutral")));
assert.ok(DAY_ACTIONS.some((action) => action.tone === "warning"));
assert.ok(DAY_ACTIONS.filter((action) => action.tone === "danger").length > 0);
assert.ok(DAY_ACTIONS.filter((action) => action.tone === "extreme").length > 0);
assert.equal(EXPLORATION_EVENTS.length, 40);
assert.equal(EXPLORATION_STORYLETS.length, EXPLORATION_EVENTS.length);
assert.equal(new Set(EXPLORATION_STORYLETS.map((storylet) => storylet.id)).size, EXPLORATION_EVENTS.length);
assert.ok(EXPLORATION_STORYLETS.every((storylet) => storylet.id.startsWith("exploration-event:")));
assert.ok(EXPLORATION_STORYLETS.every((storylet) => storylet.triggerKey.startsWith(EXPLORATION_TRIGGER_PREFIX)));
for (const direction of DIRECTIONS) {
  const triggerKey = getExplorationTriggerKey(direction.id);
  const sourceIds = EXPLORATION_EVENTS.filter((event) => event.directionId === direction.id).map((event) => event.id);
  const storyletIds = getExplorationStorylets({}, direction.id).map((storylet) => storylet.payload.id);
  const candidateIds = getExplorationCandidates({}, direction.id).map((event) => event.id);
  assert.deepEqual(storyletIds, sourceIds, `exploration storylet order mismatch: ${direction.id}`);
  assert.deepEqual(candidateIds, sourceIds, `exploration candidate order mismatch: ${direction.id}`);
  assert.equal(triggerKey, `${EXPLORATION_TRIGGER_PREFIX}${direction.id}`);
}
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
assert.ok(USER_PROLOGUE.text.some((line) => line.includes("따뜻한 차")));
assert.ok(USER_PROLOGUE.text.some((line) => line.includes("짧은 호신검")));
assert.ok(USER_PROLOGUE.text.some((line) => line.includes("서류 첫 장")));
assert.ok(USER_PROLOGUE.text.some((line) => line.includes("맞은편 의자는 비어 있다")));
assert.ok(USER_PROLOGUE.text.every((line) => !line.includes("팔랑거리는 치맛단")));
assert.ok(DAY_INTERLUDES[0].paragraphs[0].startsWith("첫 업무가 지나가자"));
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
assert.deepEqual(deterministicA.horrorTraits, Object.fromEntries(Object.keys(HORROR_TRAIT_META).map((key) => [key, 0])));
assert.deepEqual(deterministicA.derivedHorror, deriveHorrorState(deterministicA));
assert.deepEqual(deterministicA.revealedHorrorTraits, []);
assert.deepEqual(deterministicA.revealedHorrorStates, []);
assert.equal(Object.keys(deterministicA.meta.traitProgress).length, 10);
assert.deepEqual(deterministicA.meta.ownedMarkIds, []);
assert.deepEqual(deterministicA.meta.loadoutMarkIds, []);
assert.equal(deterministicA.meta.equippedMarkId, null);
assert.equal(deterministicA.firstDayHintSeen, false);
assert.equal(deterministicA.tutorialSummarySeen, false);
const markCounts = MARKS.reduce((counts, mark) => {
  counts.total += 1;
  counts[mark.kind] = (counts[mark.kind] ?? 0) + 1;
  return counts;
}, { total: 0, stigma: 0, brand: 0 });
const standaloneMarkCount = MARKS.filter((mark) => mark.category === "standalone").length;
const affinityMarkCount = MARKS.filter((mark) => mark.category === "affinity").length;
const standaloneStigmaCount = STANDALONE_MARKS.filter((mark) => mark.kind === "stigma").length;
const standaloneBrandCount = STANDALONE_MARKS.filter((mark) => mark.kind === "brand").length;
const markIds = MARKS.map((mark) => mark.id);
const uniqueMarkIds = new Set(markIds);
const markBranchUnlockIds = MARK_BRANCH_UNLOCKS.map((unlock) => unlock.id);
assert.equal(markCounts.total, 100);
assert.equal(markCounts.stigma, 50);
assert.equal(markCounts.brand, 50);
assert.equal(markIds.length, uniqueMarkIds.size);
assert.equal(markBranchUnlockIds.length, new Set(markBranchUnlockIds).size, "표식 분기 해방 id 중복 없음");
assert.equal(standaloneMarkCount, STANDALONE_MARKS.length);
assert.equal(standaloneMarkCount, 6);
assert.equal(affinityMarkCount, 94);
assert.equal(affinityMarkCount, markCounts.total - standaloneMarkCount);
assert.equal(markCounts.stigma + markCounts.brand, markCounts.total, "성흔/낙인 합계 일치");
assert.equal(standaloneStigmaCount, 3, "단독 성흔 샘플은 3개");
assert.equal(standaloneBrandCount, 3, "단독 낙인 샘플은 3개");
assert.equal(AFFINITY_MARK_GROUPS.length, 10);
assert.deepEqual(
  AFFINITY_MARK_GROUPS.map((group) => [group.affinity, group.stigma.length, group.brand.length]),
  [
    ["life", 5, 5],
    ["record", 5, 5],
    ["knight", 5, 5],
    ["trade", 5, 5],
    ["mansion", 5, 5],
    ["shortcut", 5, 5],
    ["exorcism", 5, 5],
    ["execution", 4, 4],
    ["divine", 4, 4],
    ["suspicion", 4, 4],
  ],
);
assert.ok(AFFINITY_MARK_GROUPS.every((group) => group.stigma[2]?.tier === "capstone" && group.brand[2]?.tier === "capstone"));
assert.ok(AFFINITY_MARK_GROUPS.every((group) => (
  group.stigma.slice(3).every((mark) => mark.tier === "base")
  && group.brand.slice(3).every((mark) => mark.tier === "base")
)));
MARK_BRANCH_UNLOCKS.forEach((unlock) => {
  Object.entries(unlock.condition).forEach(([key, value]) => {
    assert.ok(
      value <= markCounts[key],
      `${unlock.id} 해방 조건 ${key}:${value}은 현재 표식 총량 ${markCounts[key]} 안에서 도달 가능해야 함`,
    );
  });
});
assert.deepEqual(
  new Set(getUnlockedBranchKeys(MARKS.map((mark) => mark.id))),
  new Set(MARK_BRANCH_UNLOCKS.map((unlock) => unlock.id).concat(
    AFFINITY_MARK_GROUPS.flatMap((group) => [group.branch.stigma, group.branch.brand]),
  )),
);
assert.ok(MARKS.every((mark) => (
  mark.id
  && mark.kind
  && mark.category
  && mark.name
  && mark.polarity
  && mark.category
  && mark.carryEffect
  && mark.equipEffect
  && typeof mark.codexText === "string"
  && mark.codexText.trim()
  && typeof mark.sourceHint === "string"
  && mark.sourceHint.trim()
)));
const emptyBranchProgress = getMarkBranchProgress([]);
assert.ok(emptyBranchProgress.every((unlock) => !unlock.unlocked && unlock.remaining > 0));
const threeStigmaIds = MARKS.filter((mark) => mark.kind === "stigma").slice(0, 3).map((mark) => mark.id);
const partialBranchProgress = getMarkBranchProgress(threeStigmaIds);
assert.equal(partialBranchProgress.find((unlock) => unlock.id === "purification-hint")?.unlocked, true);
assert.equal(partialBranchProgress.find((unlock) => unlock.id === "guardian-vow")?.unlocked, false);
assert.ok(partialBranchProgress.find((unlock) => unlock.id === "purification-hint")?.requirements.every((item) => item.current <= item.required));
const completeBranchProgress = getMarkBranchProgress(MARKS.map((mark) => mark.id));
assert.ok(completeBranchProgress.every((unlock) => unlock.unlocked && unlock.remaining === 0));
const allBranchIds = MARK_BRANCH_UNLOCKS.map((unlock) => unlock.id).concat(
  AFFINITY_MARK_GROUPS.flatMap((group) => [group.branch.stigma, group.branch.brand]),
);
assert.ok(allBranchIds.every((branchId) => getMarkBranchLabel(branchId) !== branchId));
assert.ok(MARKS.every((mark) => mark.kind === "stigma" || mark.kind === "brand"));
assert.ok(MARKS.every((mark) => mark.polarity === "route" || mark.polarity === "neutral"));
assert.ok(MARKS.every((mark) => mark.category === "affinity" ? Boolean(mark.affinity) : true));
assert.ok(MARKS.every((mark) => mark.category !== "standalone" || mark.affinity == null || typeof mark.affinity === "string"));
assert.ok(MARKS.every((mark) => ["affinity", "standalone"].includes(mark.category)));
Object.values(LEGACY_STIGMA_MARK_MAP).forEach((markId) => {
  assert.ok(markId);
  assert.ok(Boolean(getMark(markId)));
});
const noConditionMark = MARKS.find((mark) => (mark.obtainConditions?.length ?? 0) === 0);
assert.equal(
  noConditionMark ? isMarkObtainable(noConditionMark, deterministicA, deterministicA.meta) : false,
  true,
);
const horrorTraitAction = DAY_ACTIONS.find((action) => action.id === "count-rooms");
const horrorTraitResult = chooseDayAction({ ...deterministicA, phase: "day" }, horrorTraitAction);
assert.equal(horrorTraitResult.horrorTraits.intrusion, 1);
assert.equal(horrorTraitResult.horrorTraits.madness, 1);
assert.ok(horrorTraitResult.revealedHorrorTraits.includes("intrusion"));
assert.ok(horrorTraitResult.revealedHorrorTraits.includes("madness"));
assert.ok(horrorTraitResult.revealedHorrorStates.includes("effectiveFear"));
assert.equal(
  horrorTraitResult.derivedHorror.effectiveFear,
  Math.round(horrorTraitResult.resources.fear + horrorTraitResult.horrorTraits.intrusion + horrorTraitResult.horrorTraits.madness),
);
assert.ok(horrorTraitResult.pendingResult.changes.some((change) => change.group === "공포 특성" && change.key === "intrusion"));
assert.equal(getEffectiveChoiceChance({
  ...deterministicA,
  phase: "night",
  horrorTraits: { ...deterministicA.horrorTraits, madness: 2, erosion: 3 },
}, 1), 0.95);
const refreshedHorrorSave = refreshSeedState({
  ...deterministicA,
  firstDayHintSeen: undefined,
  tutorialSummarySeen: undefined,
  horrorTraits: { madness: 2 },
  revealedHorrorTraits: [],
  revealedHorrorStates: [],
});
assert.equal(refreshedHorrorSave.firstDayHintSeen, false);
assert.equal(refreshedHorrorSave.tutorialSummarySeen, false);
assert.equal(refreshedHorrorSave.derivedHorror.effectiveFear, 2);
assert.deepEqual(refreshedHorrorSave.revealedHorrorTraits, ["madness"]);
assert.ok(refreshedHorrorSave.revealedHorrorStates.includes("effectiveFear"));
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
  ownedMarkIds: ["stigma-life-1", "stigma-divine-1"],
  loadoutMarkIds: [],
  equippedMarkId: "stigma-divine-1",
  phase: "record-stop",
  route: "altered",
  truthFlags: { ...deterministicA.truthFlags, truthDiscovered: true },
  meta: {
    ...traitProgressResult.meta,
  },
}, { second: 1, runRngSeed: "next-cycle-check" });
assert.equal(nextCycleRun.meta.cycle, 2);
assert.deepEqual(nextCycleRun.meta.ownedMarkIds, ["stigma-life-1", "stigma-divine-1"]);
assert.deepEqual(nextCycleRun.meta.loadoutMarkIds, []);
assert.equal(nextCycleRun.meta.equippedMarkId, "stigma-divine-1");
assert.equal(nextCycleRun.meta.endingRecords["record-stop:altered:truth"].count, 1);
assert.equal(nextCycleRun.meta.endingRecords["record-stop:altered:truth"].lastCycle, 1);
assert.equal(deterministicA.ownedPassiveIds.length, 5);
assert.equal(deterministicA.passiveIds.length, 3);
assert.deepEqual(getDayOffers({ ...deterministicA, phase: "day" }), getDayOffers({ ...deterministicB, phase: "day" }));
assert.deepEqual(
  startExpedition({ ...deterministicA, selectedCompanionId: "alone" }, "stairs").expedition,
  startExpedition({ ...deterministicB, selectedCompanionId: "alone" }, "stairs").expedition,
);
for (const direction of DIRECTIONS) {
  const sourceEvents = EXPLORATION_EVENTS.filter((event) => event.directionId === direction.id);
  const expedition = startExpedition({ ...deterministicA, selectedCompanionId: "alone" }, direction.id).expedition;
  assert.deepEqual(
    expedition.eventIds,
    seededRank(sourceEvents, `${deterministicA.runRngSeed}:events:${deterministicA.day}:${direction.id}`)
      .slice(0, expedition.totalSteps)
      .map((event) => event.id),
    `startExpedition fixed seed eventIds changed: ${direction.id}`,
  );
}
assert.equal(openFirstDay(deterministicA).phase, "day");
for (const seedConfig of AUTOPLAY_SMOKE_SEEDS) {
  const dayOneRun = openFirstDay(beginPrologue(createNewRun(seedConfig)));
  const dayOneOffers = getDayOffers(dayOneRun);
  assert.equal(dayOneOffers.length, 6, `1일차 낮 후보는 카테고리별 1개씩 보여야 함: ${seedConfig.runRngSeed}`);
  assert.ok(
    dayOneOffers.every((choice) => !severeChoiceTones.has(choice.tone ?? "neutral")),
    `1일차 낮 후보에 강한 위험 tone 노출 금지: ${seedConfig.runRngSeed}`,
  );
  assert.deepEqual(
    new Set(dayOneOffers.map((choice) => choice.id)),
    new Set(firstDaySafeActions.map((action) => action.id)),
    `1일차 낮 후보는 firstDaySafe 후보만 사용해야 함: ${seedConfig.runRngSeed}`,
  );
}
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
assert.deepEqual(undergroundRest.success.horrorTraits, { mentalTaint: 1, erosion: 1 });
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
assert.equal(afterUndergroundRest.horrorTraits.mentalTaint, 1);
assert.equal(afterUndergroundRest.horrorTraits.erosion, 1);
assert.ok(afterUndergroundRest.revealedHorrorTraits.includes("mentalTaint"));
assert.ok(afterUndergroundRest.revealedHorrorStates.includes("monsterization"));
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
  ownedMarkIds: [],
  loadoutMarkIds: [],
  equippedMarkId: null,
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
assert.equal(dayFailureBurden.statDelta.stamina, -0.9);
assert.equal(dayFailureBurden.resourceDelta.fear, 0.9);
const nightFailureBurden = resolveChoice(seedRuleGame(seedTrait("day-success-boon", "night-failure-burden"), "night"), {
  id: "night-failure-burden",
  successChance: 0,
  failure: { stats: { health: -1 } },
});
assert.equal(nightFailureBurden.statDelta.health, -0.9);
assert.equal(
  getEffectiveChoiceChance(seedRuleGame(seedTrait("day-success-boon", "danger-chance-burden"), "night"), 1, { id: "danger-chance", tone: "danger" }),
  0.9,
);
const staminaLossBurden = resolveChoice(seedRuleGame(seedTrait("night-success-boon", "stamina-loss-burden")), {
  id: "stamina-loss-burden",
  stats: { stamina: -2, health: -2 },
});
assert.equal(staminaLossBurden.statDelta.stamina, -1.8);
assert.equal(staminaLossBurden.statDelta.health, -2);
const healthLossBurden = resolveChoice(seedRuleGame(seedTrait("night-success-boon", "health-loss-burden")), {
  id: "health-loss-burden",
  stats: { stamina: -2, health: -2 },
});
assert.equal(healthLossBurden.statDelta.health, -1.8);
assert.equal(healthLossBurden.statDelta.stamina, -2);
const forfeitBurden = resolveChoice(seedRuleGame(seedTrait("night-success-boon", "forfeit-burden")), {
  id: "forfeit-burden",
  isForfeit: true,
  estate: { stability: -1 },
  resources: { fear: 1 },
});
assert.equal(forfeitBurden.estateDelta.stability, -0.9);
assert.equal(forfeitBurden.resourceDelta.fear, 0.9);
const retreatBurden = retreatExpedition({
  ...seedRuleGame(seedTrait("day-success-boon", "forfeit-burden"), "expedition"),
  expedition: { directionId: "stairs", totalSteps: 3, stepIndex: 1, eventIds: [] },
});
assert.equal(retreatBurden.estate.stability, deterministicA.estate.stability - 0.9);
assert.equal(retreatBurden.resources.fear, deterministicA.resources.fear + 0.9);
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

assert.equal(KNOWN_AUTOPLAY_PHASES.has("prologue"), true);
assert.equal(typeof autoplayHandlers.prologue, "function");
const autoplayFlowCheck = createNewRun({ second: 0, runRngSeed: "autoplay-flow-check" });
assert.equal(autoplayFlowCheck.phase, "seed-reveal");
const afterSeedReveal = autoplayHandlers["seed-reveal"](autoplayFlowCheck);
assert.equal(afterSeedReveal.phase, "prologue");
assert.equal(autoplayHandlers.prologue(afterSeedReveal).phase, "day");
for (const seedConfig of AUTOPLAY_SMOKE_SEEDS) {
  const firstRun = runAutoplaySmoke(seedConfig);
  const secondRun = runAutoplaySmoke(seedConfig);
  assert.ok(
    AUTOPLAY_TERMINAL_PHASES.has(firstRun.state.phase),
    `autoplay smoke must end in record-stop or ending: ${seedConfig.runRngSeed}`,
  );
  assert.deepEqual(
    firstRun.projection,
    secondRun.projection,
    `autoplay smoke projection changed for same seed: ${seedConfig.runRngSeed}`,
  );
}

console.log("Rosenthal vertical slice verification passed.");
