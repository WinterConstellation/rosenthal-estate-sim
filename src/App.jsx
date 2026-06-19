import { useEffect, useMemo, useRef, useState } from "react";
import {
  advanceToNextCycle,
  beginPrologue,
  canManualSave,
  chooseDayAction,
  chooseEscapeTransformedFate,
  chooseExplorationOption,
  chooseFinaleOption,
  chooseSpecialEvent,
  chooseTransformedFate,
  completeTransition,
  continueAfterResult,
  createNewRun,
  createStartState,
  deliverKeepsake,
  deriveHorrorState,
  displayCompanion,
  finishVerticalSlice,
  forfeitDay,
  getCompanionOffers,
  getCurrentExplorationEvent,
  getCurrentFinale,
  getDayEightScript,
  getDayOffers,
  getDirectionOffers,
  getEnding,
  getExplorationOptions,
  getFinaleOptions,
  getNpcSpeaker,
  getSpecialGroup,
  isExplorationOptionAvailable,
  isNightDisplayPhase,
  normalizeHorrorTraits,
  openFirstDay,
  retreatExpedition,
  selectCompanion,
  skipNightEntry,
  startExpedition,
} from "./engine/rosenthalEngine.js";
import {
  clearAutoSave,
  getSaveSlots,
  loadAutoSave,
  loadManual,
  saveAuto,
  saveManual,
} from "./engine/saveManager.js";
import { getEffectiveChoiceChance, getJob, getMarkName, getPassive, resolveChoice, truncateToTenth } from "./engine/rulesEngine.js";
import {
  HORROR_DERIVED_META,
  HORROR_TRAIT_META,
  MARK_LOADOUT_LIMIT,
  MARKS,
  PASSIVES,
  RESOURCE_META,
  TRAIT_META,
  getMark,
  getMarkBranchLabel,
  getMarkBranchProgress,
  getMarkCounts,
  getUnlockedBranchKeys,
  isMarkCollectionUnlocked,
} from "./rules/systemRules.js";
import {
  DAY_INTERLUDES,
  DAY_OPENING_SCRIPT,
  NIGHT_ENTRY_SCRIPT,
  PROLOGUE,
} from "./rules/tutorialRules.js";

const LABELS = {
  health: "체력",
  insight: "통찰",
  resolve: "결단",
  charm: "매력",
  faith: "신앙",
  stamina: "스태미나",
  food: "식량",
  timber: "목재",
  silver: "은화",
  salt: "축성 소금",
  population: "인구",
  fear: "공포",
  stability: "안정도",
  trust: "신뢰",
  recordIntegrity: "기록 완전성",
  corruption: "이상 징후",
  missing: "실종",
};

const STATUS_LABELS = {
  alive: "생존",
  dead: "사망",
  missing: "실종",
  transformed: "변질",
};

const ENDING_LABELS = {
  "accepted-lord": "정식 영주",
  "forfeit-death": "다음 날의 아침",
  "health-death": "돌아오지 못한 영주",
  "record-stop": "기록 중단",
};

const ROUTE_LABELS = {
  normal: "정상 축",
  altered: "변질 축",
  none: "분기 없음",
};

const STAT_DETAILS = {
  health: "0 미만이 되면 이번 기록은 종료된다.",
  insight: "0 미만이면 획득하려던 양수 변화가 같은 크기의 음수 변화로 뒤집힌다.",
  resolve: "0 미만이면 성공과 실패를 가르는 확률이 절반으로 줄어든다.",
  charm: "0 미만이면 호감도가 있는 인물의 선택을 고를 때마다 관계가 악화된다.",
  faith: "0 미만이면 신성 보너스를 얻는 선택을 고를 수 없다.",
  stamina: "0 미만이면 현재 시간대의 행동을 중단하고 강제로 귀환한다.",
};

const TRAIT_DETAILS = {
  record: "장부, 증언, 기록의 모순을 다루는 성향.",
  knight: "호위와 정면 대응을 택하는 성향.",
  mansion: "저택의 구조와 반복되는 동선을 읽는 성향.",
  trade: "물자와 교환 관계를 활용하는 성향.",
  life: "사람들의 일상과 생존을 우선하는 성향.",
  shortcut: "정해진 절차 밖의 빠른 방법을 택하는 성향.",
  exorcism: "악한 것을 몰아내고 봉쇄하는 성향.",
  execution: "위험을 남기지 않고 끝내는 성향.",
  divine: "신성한 방식과 축복을 받아들이는 성향.",
  suspicion: "평범해 보이는 장면의 어긋남을 의심하는 성향.",
};

const HORROR_FRAGMENTS = [
  "가로되 의인은 없나니 하나도 없으며 지상에 너희들 모두 죄인이다",
  "나, 그대, 그리고 우리. 한데 모여 더러운 자가 되고 밟는 땅도 더럽혀지리라",
  "이제 알겠다. 우리는 모두, 죄인이었구나.",
  "우리는 죄를 저지르며, 우리는 다 부정한 자 같아서, 우리의 의로움은 전부 더러운 옷을 입었으며, 우리의 죄악이 바람처럼 퍼지리라",
  "너의 손이 피에, 너의 손가락이 죄악에 더러워졌으니 우리의 죄가 우리를 고발하며 증언하오니",
  "만물보다 거짓되고 심히 부패한 것은 마음이라 그 마음에 따라 택한 것은 그 무게에 따라 기울어지리니",
  "우리의 육신이 다하여 어디로 오라 하셨으나 나는 그 말을 귀담아 듣지 아니 하였으니 이 땅에 마지막 남은 죄가 되리라",
  "너의 육신이 다하면 나에게 오라 하였으나 너는 그 말을 귀담아 듣지 아니 하였으니 그 땅에 마지막 남은 가엾음이라",
  "불타는 별이 나와 가까워지고 너와 가까워지고 가장 멀리 서 있는 자에게도 곧 다다르리라",
  "검은 별이 검은 별이 검은 별이 검은 별이 검은 별이 검은 별이 검은 별이 다가오리라",
  "아름답게, 덧 없이 흩어져라",
  "악의 꽃은 가련히 지네, 슬픈 듯한 색채로",
  "그대, 신성의 모독자여.",
];

const HORROR_FRAGMENT_LAYOUTS = [
  { x: 7, y: 14, s: 0.78, r: -8, d: -2 },
  { x: 68, y: 9, s: 0.64, r: 6, d: -5 },
  { x: 34, y: 23, s: 0.56, r: -3, d: -9 },
  { x: 78, y: 32, s: 0.72, r: 10, d: -1 },
  { x: 12, y: 49, s: 0.58, r: 4, d: -7 },
  { x: 51, y: 58, s: 0.82, r: -6, d: -4 },
  { x: 82, y: 68, s: 0.52, r: 5, d: -11 },
  { x: 23, y: 74, s: 0.68, r: -11, d: -3 },
  { x: 41, y: 83, s: 0.5, r: 2, d: -8 },
  { x: 61, y: 43, s: 0.6, r: -2, d: -13 },
  { x: 6, y: 87, s: 0.46, r: 7, d: -10 },
  { x: 70, y: 88, s: 0.7, r: -5, d: -6 },
];

const HORROR_STATIC_ROWS = [
  ". .-.*..--*.-..*...-..*.-.*..--..*.-",
  "-*..*...--..-.*..*.-..--*...*..-..",
  "..--*.-..*...*..---..*.-.*..--*..",
  "*..-..*.-..--..*...-.*..*..--..*.",
];

const HORROR_FLOATING_TEXT_ENABLED = false;

const HORROR_NIGHT_PHASES = new Set(["night-companion", "night-direction", "expedition", "finale", "escape-transformed-choice", "nightfall-transition"]);
const HORROR_NIGHT_RESULT_PHASES = new Set(["night-companion", "night-direction", "expedition", "finale", "daybreak"]);
const HORROR_EYE_GLYPHS = [".", "-", "*", "+", "x", ":", "'", "`"];
const HORROR_EYE_IRIS_GLYPHS = ["*", "+", "x", "X", "#", "%"];
const HORROR_EYE_EDGE_GLYPHS = ["/", "\\", "|", "_", "-", "."];
const HORROR_EYE_LID_GLYPHS = ["-", "_", ".", "'", "`", "x", "+", ":"];
const HORROR_EYE_SINGLE_LAYOUT = { x: 0.5, y: 0.51, rx: 0.37, ry: 0.19, s: 1, r: 0 };
const HORROR_EYE_LAYOUTS = [
  HORROR_EYE_SINGLE_LAYOUT,
  { x: 0.22, y: 0.32, rx: 0.28, ry: 0.14, s: 0.84, r: -7 },
  { x: 0.25, y: 0.76, rx: 0.25, ry: 0.125, s: 0.78, r: 6 },
  { x: 0.76, y: 0.29, rx: 0.28, ry: 0.14, s: 0.82, r: 5 },
  { x: 0.74, y: 0.72, rx: 0.24, ry: 0.12, s: 0.76, r: -8 },
];
const DEV_STAT_KEYS = ["health", "insight", "resolve", "charm", "faith", "stamina"];
const DEV_RESOURCE_KEYS = Object.keys(RESOURCE_META);
const DEV_ESTATE_KEYS = ["stability", "trust", "recordIntegrity", "corruption", "missing"];
const DEV_TRAIT_KEYS = Object.keys(TRAIT_META);
const DEV_HORROR_TRAIT_KEYS = Object.keys(HORROR_TRAIT_META);

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function clampRange(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function getDeveloperNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getDeveloperLabel(key, map = {}) {
  return LABELS[key] ?? map[key]?.label ?? key;
}

function syncDeveloperHorrorState(state) {
  const horrorTraits = normalizeHorrorTraits(state.horrorTraits);
  const derivedHorror = deriveHorrorState({ ...state, horrorTraits });
  return {
    ...state,
    horrorTraits,
    derivedHorror,
    revealedHorrorTraits: uniqueValues([
      ...(state.revealedHorrorTraits ?? []),
      ...Object.entries(horrorTraits).filter(([, value]) => Number(value) > 0).map(([key]) => key),
    ]),
    revealedHorrorStates: uniqueValues([
      ...(state.revealedHorrorStates ?? []),
      ...Object.entries(derivedHorror).filter(([, value]) => Number(value) > 0).map(([key]) => key),
    ]),
  };
}

function createDeveloperHorrorTraits(overrides = {}) {
  return normalizeHorrorTraits({
    ...Object.fromEntries(DEV_HORROR_TRAIT_KEYS.map((key) => [key, 0])),
    ...overrides,
  });
}

function applyDeveloperCompanionPreset(companionStates = {}, preset = {}) {
  if (!preset.transformFirstCompanion && !preset.resetCompanions) return companionStates;
  const entries = Object.entries(companionStates);
  if (!entries.length) return companionStates;
  if (preset.resetCompanions) {
    return Object.fromEntries(entries.map(([id, person]) => [
      id,
      person.status === "transformed"
        ? { ...person, status: "alive", countedAsSacrifice: false }
        : person,
    ]));
  }
  const [firstId] = entries.find(([, person]) => person.status === "alive") ?? entries[0];
  return {
    ...companionStates,
    [firstId]: {
      ...companionStates[firstId],
      status: "transformed",
      revealed: true,
    },
  };
}

function applyDeveloperHorrorPresetToGame(game, presetId) {
  const preset = DEV_HORROR_PRESETS.find((item) => item.id === presetId);
  if (!preset) return game;
  const next = {
    ...game,
    resources: {
      ...game.resources,
      ...(preset.resources ?? {}),
    },
    estate: {
      ...game.estate,
      ...(preset.estate ?? {}),
    },
    horrorTraits: createDeveloperHorrorTraits(preset.horrorTraits),
    companionStates: applyDeveloperCompanionPreset(game.companionStates, preset),
  };
  if (Object.prototype.hasOwnProperty.call(preset, "route")) next.route = preset.route;
  if (Object.prototype.hasOwnProperty.call(preset, "truthDiscovered")) {
    next.truthFlags = {
      ...(game.truthFlags ?? {}),
      truthDiscovered: preset.truthDiscovered,
    };
  }
  if (preset.clearRevealedHorror) {
    next.revealedHorrorTraits = [];
    next.revealedHorrorStates = [];
  }
  return syncDeveloperHorrorState(next);
}

function shouldOpenDeveloperMode() {
  return new URLSearchParams(window.location.search).get("dev") === "1";
}

function displayInteger(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
}

function displayTenth(value) {
  const truncated = truncateToTenth(value);
  const normalized = Object.is(truncated, -0) ? 0 : truncated;
  return Number.isInteger(normalized) ? `${normalized}` : normalized.toFixed(1);
}

function displaySignedTenth(value) {
  const text = displayTenth(value);
  return Number(text) > 0 ? `+${text}` : text;
}

function displayChancePercent(chance) {
  return displayInteger((Number(chance) || 0) * 100);
}

const MARK_KIND_LABELS = {
  stigma: "성흔",
  brand: "낙인",
};

function getOwnedMarkIds(game) {
  return uniqueValues([...(game.meta?.ownedMarkIds ?? []), ...(game.ownedMarkIds ?? [])]);
}

function getLoadoutMarkIds(game) {
  const equippedMarkId = getEquippedMarkId(game);
  const ownedMarkIds = getOwnedMarkIds(game);
  return uniqueValues(game.loadoutMarkIds ?? game.meta?.loadoutMarkIds ?? [])
    .filter((id) => ownedMarkIds.includes(id) && id !== equippedMarkId)
    .slice(0, MARK_LOADOUT_LIMIT);
}

function getEquippedMarkId(game) {
  return Object.prototype.hasOwnProperty.call(game, "equippedMarkId")
    ? game.equippedMarkId
    : game.meta?.equippedMarkId ?? null;
}

function getMarkEffectSign(game, mark) {
  if (!mark || mark.polarity === "neutral") return 1;
  const favoredKind = game.route === "altered" ? "brand" : "stigma";
  return mark.kind === favoredKind ? 1 : -1;
}

function describeMarkEffect(game, mark, slot = "carry") {
  const effect = slot === "equip" ? mark?.equipEffect : mark?.carryEffect;
  if (!mark || !effect) return "효과 없음";
  const sign = getMarkEffectSign(game, mark);
  const parts = [];
  if (effect.stat?.key) {
    parts.push(`${LABELS[effect.stat.key] ?? effect.stat.key} ${displaySignedTenth(effect.stat.value * sign)}`);
  }
  if (effect.chance) {
    parts.push(`성공률 ${displaySignedTenth(effect.chance * sign)}%`);
  }
  Object.entries(effect.resources ?? {}).forEach(([key, value]) => {
    parts.push(`${LABELS[key] ?? key} ${displaySignedTenth(value * sign)}`);
  });
  Object.entries(effect.estate ?? {}).forEach(([key, value]) => {
    parts.push(`${LABELS[key] ?? key} ${displaySignedTenth(value * sign)}`);
  });
  return parts.join(" · ") || "분기 조건";
}

function getMarkUnlockText(mark) {
  if (!mark?.unlockCondition) return "기본 수집 대상";
  return `${MARK_KIND_LABELS[mark.unlockCondition.kind]} ${mark.unlockCondition.count}개 수집 후 해방`;
}

function getBranchUnlockLabels(markIds) {
  const keys = getUnlockedBranchKeys(markIds);
  return keys.map((key) => ({ id: key, label: getMarkBranchLabel(key) }));
}

function getMarkBranchAxis(unlock) {
  const keys = Object.keys(unlock.condition);
  if (keys.length === 1 && keys[0] === "stigma") return "stigma";
  if (keys.length === 1 && keys[0] === "brand") return "brand";
  return "mixed";
}

function getNextMarkBranchGoals(progress) {
  return ["stigma", "brand", "mixed"]
    .map((axis) => progress.find((unlock) => !unlock.unlocked && getMarkBranchAxis(unlock) === axis))
    .filter(Boolean);
}

function formatMarkBranchProgress(unlock) {
  const labels = { stigma: "성흔", brand: "낙인", total: "전체" };
  const progress = unlock.requirements
    .map(({ key, current, required }) => `${labels[key] ?? key} ${current}/${required}`)
    .join(" · ");
  return `${unlock.label} · ${progress}`;
}

function getTransformedCompanionCount(game) {
  return Object.values(game.companionStates ?? {}).filter((person) => person.status === "transformed").length;
}

function isHorrorNightPressure(game) {
  return HORROR_NIGHT_PHASES.has(game.phase)
    || (game.phase === "result" && HORROR_NIGHT_RESULT_PHASES.has(game.resumePhase));
}

function getHorrorIntensity(game, isNight) {
  const fear = Number(game.derivedHorror?.effectiveFear ?? game.resources?.fear ?? 0) / 100;
  const horrorPressure = Number(game.derivedHorror?.horrorPressure ?? 0) / 100;
  const corruption = Number(game.estate?.corruption ?? 0) / 100;
  const transformedCount = getTransformedCompanionCount(game);
  const phasePressure = isHorrorNightPressure(game) ? 0.18 : game.phase === "special-event" ? 0.07 : 0;
  const routePressure = game.route === "altered" ? 0.14 : 0;
  const transformedPressure = Math.min(0.16, transformedCount * 0.04);
  const truthPressure = game.truthFlags?.truthDiscovered ? 0.1 : 0;
  const sacrificePressure = Math.min(0.12, Number(game.sacrificeCount ?? 0) * 0.04);
  return clamp01(fear * 0.28 + horrorPressure * 0.18 + corruption * 0.34 + (isNight ? 0.14 : 0) + phasePressure + routePressure + transformedPressure + truthPressure + sacrificePressure);
}

function resolveHorrorDirector(game, isN۞���$z{-���jםitle={stage.title}
          text={stage.text}
          choices={stage.options.map((choice) => {
            const effectiveChance = getEffectiveChoiceChance({ ...game, phase: "event" }, choice.chance, { ...choice, tone: "extreme" });
            return effectiveChance == null
              ? choice
              : { ...choice, detail: `\uc131\uacf5\ub960 ${displayChancePercent(effectiveChance)}%` };
          })}
          selectedId={selectedId}
          onChoose={(choice) => animate(choice.id, (current) => chooseSpecialEvent(current, choice))}
        />
      );
    }
    if (game.phase === "day") {
      const choices = getDayOffers(game).map((choice) => ({
        ...choice,
        categoryLabel: {
          gathering: "자원 채집",
          interaction: "NPC 상호작용",
          investigation: "조사",
          training: "수련",
          rest: "휴식",
          other: "기타",
        }[choice.category],
      }));
      return (
        <ChoicePanel
          game={game}
          eyebrow={`${game.day}일차 · 낮 ${game.dayTurn + 1} / 5`}
          title="영주의 일을 선택한다"
          text={getDayNarration(game)}
          choices={choices}
          selectedId={selectedId}
          onChoose={(choice) => animate(choice.id, (current) => chooseDayAction(current, choice))}
          footer={<button className="forfeit-button" type="button" title="오늘의 결정을 미룬다. 영지 안정도와 신뢰가 감소하고 공포가 늘어난다." onClick={() => animate("day-forfeit", forfeitDay)}>포기한다</button>}
        />
      );
    }
    if (game.phase === "night-companion") {
      const companions = getCompanionOffers(game).map((person) => ({
        ...person,
        detail: person.kind === "unnamed" ? "이름 없는 인원 · 보충되지 않음" : person.relation,
      }));
      return (
        <ChoicePanel
          game={game}
          eyebrow={`${game.day}번째 밤 · 진입 준비`}
          title="누구와 내려가겠습니까?"
          text={NIGHT_ENTRY_SCRIPT}
          choices={companions}
          selectedId={selectedId}
          onChoose={(choice) => animate(choice.id, (current) => selectCompanion(current, choice.id))}
          footer={<button className="forfeit-button" type="button" title="오늘 밤 지하에 들어가지 않는다. 지하 진입 포기 횟수가 누적된다." onClick={() => animate("skip-night", skipNightEntry)}>지하에 들어가지 않는다</button>}
        />
      );
    }
    if (game.phase === "night-direction") {
      const choices = getDirectionOffers().map((direction) => ({ ...direction, detail: direction.text }));
      return (
        <ChoicePanel
          game={game}
          eyebrow={`${game.day}번째 밤 · 진입 방향`}
          title="어느 길을 택하겠습니까?"
          text="방향과 이번 기록의 내부 난수가 탐사의 길이를 정한다."
          choices={choices}
          selectedId={selectedId}
          onChoose={(choice) => animate(choice.id, (current) => startExpedition(current, choice.id))}
        />
      );
    }
    if (game.phase === "expedition") {
      const event = getCurrentExplorationEvent(game);
      const choices = getExplorationOptions(event).map((choice) => {
        const available = isExplorationOptionAvailable(game, choice);
        const effectiveChance = getEffectiveChoiceChance({ ...game, phase: "night" }, choice.chance, choice);
        return {
          ...choice,
          available,
          unavailableReason: choice.requiresHealthyCompanion ? "정상 상태의 동행자가 필요하다" : undefined,
          detail: effectiveChance == null ? "확정 행동" : `성공률 ${displayChancePercent(effectiveChance)}%`,
          tone: choice.tone ?? ((effectiveChance ?? 1) < 0.7 ? "danger" : "neutral"),
        };
      });
      return (
        <ChoicePanel
          game={game}
          eyebrow={`밤 탐사 · ${game.expedition.stepIndex + 1} / ${game.expedition.totalSteps}`}
          title={event.title}
          text={event.text}
          choices={choices}
          selectedId={selectedId}
          onChoose={(choice) => animate(choice.id, (current) => chooseExplorationOption(current, event, choice))}
          footer={<button className="forfeit-button" type="button" title="현재 탐사를 중단하고 귀환한다. 일반 포기 횟수가 누적된다." onClick={() => animate("retreat", retreatExpedition)}>포기하고 귀환한다</button>}
        />
      );
    }
    if (game.phase === "finale") {
      const currentFinale = getCurrentFinale(game);
      const choices = getFinaleOptions(game, currentFinale).map((choice) => {
        const effectiveChance = getEffectiveChoiceChance({ ...game, phase: "night" }, choice.chance, choice);
        return {
          ...choice,
          preview: exactOptionPreview(game, choice),
          tone: choice.intentionalLoss ? "lethal" : (effectiveChance ?? 1) < 0.7 ? "danger" : "extreme",
        };
      });
      return (
        <ChoicePanel
          game={game}
          eyebrow={`최종 ${currentFinale.kind === "combat" ? "전투" : "퍼즐"}`}
          title={currentFinale.title}
          text={currentFinale.text}
          choices={choices}
          selectedId={selectedId}
          onChoose={(choice) => animate(choice.id, (current) => chooseFinaleOption(current, currentFinale, choice))}
        />
      );
    }
    if (game.phase === "keepsake-delivery") {
      return (
        <ChoicePanel
          game={game}
          eyebrow="낮 · NPC 상호작용"
          title="유품을 누구에게 전달합니까?"
          text="전달 대상은 이후 관계와 사건을 바꾸지만 제물 수치는 바꾸지 않는다."
          choices={[
            { id: "family", label: "가족에게 전달한다", tone: "neutral" },
            { id: "colleagues", label: "동료에게 전달한다", tone: "neutral" },
          ]}
          selectedId={selectedId}
          onChoose={(choice) => animate(choice.id, (current) => deliverKeepsake(current, choice.id))}
        />
      );
    }
    if (game.phase === "transformed-choice") {
      const person = game.companionStates[game.selectedTransformedId];
      return (
        <ChoicePanel
          game={game}
          eyebrow="낮 · 변질된 사람"
          title={displayCompanion(person)}
          text="처치하는 순간 제물로 계산되고 유품을 얻는다. 살려두면 이후 사건에서 다시 나타날 수 있다."
          choices={[
            { id: "spare", label: "살려둔다", tone: "extreme" },
            { id: "kill", label: "처치한다", tone: "lethal" },
          ]}
          selectedId={selectedId}
          onChoose={(choice) => animate(choice.id, (current) => chooseTransformedFate(current, choice.id))}
        />
      );
    }
    if (game.phase === "escape-transformed-choice") {
      const person = game.companionStates[game.selectedCompanionId];
      return (
        <ChoicePanel
          game={game}
          eyebrow="귀환 직전 · 변질된 동행자"
          title={displayCompanion(person)}
          text="귀환로는 열려 있다. 이 상태로 지상에 데려갈지, 여기서 끝낼지 결정해야 한다."
          choices={[
            { id: "spare", label: "손을 놓지 않고 함께 탈출한다", tone: "extreme" },
            { id: "kill", label: "탈출하기 전에 처치한다", tone: "lethal" },
          ]}
          selectedId={selectedId}
          onChoose={(choice) => animate(choice.id, (current) => chooseEscapeTransformedFate(current, choice.id))}
        />
      );
    }
    if (game.phase === "day-eight") {
      return (
        <DialogueCard
          game={game}
          eyebrow={`8일차 · ${game.route === "altered" ? "변질 축" : "정상 축"}`}
          title={game.route === "altered" ? "지하의 존재들이 영주를 맞이한다." : "로젠탈에 여덟째 날이 왔다."}
          paragraphs={getDayEightScript(game)}
          button="기록을 확인한다"
          onContinue={() => setGame(finishVerticalSlice(game))}
          danger={game.route === "altered"}
        />
      );
    }
    if (game.phase === "record-stop") {
      return (
        <DialogueCard
          game={game}
          eyebrow="수직 완성본 · 기록 중단"
          title="이 기록은 여기서 끊겨 있다."
          paragraphs={[
            `열린 축 · ${game.route === "altered" ? "변질 축" : "정상 축"}`,
            `■■ ${game.sacrificeCount} / 3`,
            `진실 단서 · ${game.truthFlags.truthDiscovered ? "확인함" : "확인하지 못함"}`,
            `선택 기록 · ${game.history.length}개`,
          ]}
          button="다음 회차로"
          onContinue={nextCycle}
        />
      );
    }
    if (game.phase === "ending") {
      const ending = getEnding(game);
      return (
        <DialogueCard
          game={game}
          eyebrow="엔딩"
          title={ending.title}
          paragraphs={ending.text}
          button="다음 회차로"
          onContinue={nextCycle}
          danger
        />
      );
    }
    return null;
  })();

  const dayPeriod = game.dayTurn < 2 ? "오전" : game.dayTurn < 4 ? "오후" : "저녁";
  const phaseLabel = effectiveIsNight ? "밤" : game.phase === "day" ? dayPeriod : "기록";
  const phaseProgress = game.phase === "day"
    ? `${Math.min(game.dayTurn + 1, 5)} / 5`
    : game.phase === "expedition"
      ? `${game.expedition.stepIndex + 1} / ${game.expedition.totalSteps}`
      : "—";
  const headerTitle = effectiveIsNight ? `${game.day}번째 밤` : `기록 ${game.day}일차`;
  const appShellClass = [
    "app-shell",
    effectiveIsNight ? "theme-night" : "theme-day",
    `theme-${uiPresentation.preset}`,
  ].join(" ");

  return (
    <main className={appShellClass}>
      <HorrorTextOverlay game={game} isNight={effectiveIsNight} director={visibleHorrorDirector} />
      <header className="topbar">
        <div className="dream-mark" aria-hidden="true">{game.day}번째 꿈 - {game.day}번째 밤</div>
        <div className="brand">
          <span className="brand__crest">{effectiveIsNight ? "夜" : "R"}</span>
          <div>
            <p>{effectiveIsNight ? "THE HOUSE IS STILL KIND" : "A KIND WORLD AWAITS"}</p>
            <h1>{headerTitle}</h1>
          </div>
        </div>
        <div className="phase-clock">
          <span>{phaseLabel}</span>
          <strong>{phaseProgress}</strong>
          <em>{game.day}일차</em>
        </div>
        <div className="topbar__actions">
          <div className="sacrifice-counter">
            <span>■■</span>
            <strong>{game.sacrificeCount ?? 0} / 3</strong>
          </div>
          <button type="button" onClick={() => setRulesOpen(true)}>규칙</button>
          <button type="button" onClick={() => setSaveOpen(true)}>저장 기록</button>
          <button type="button" onClick={() => setShowStart(true)}>첫 화면</button>
          <button className={developerMode ? "is-active" : ""} type="button" onClick={() => setDeveloperMode((current) => !current)}>dev</button>
        </div>
      </header>

      <section className="resource-strip" aria-label="영지 현황">
        {Object.keys(RESOURCE_META).map((key) => (
          <ResourceCard
            key={key}
            statKey={key}
            value={game.resources?.[key] ?? 0}
            isNight={effectiveIsNight}
            revealed
          />
        ))}
      </section>

      <div className="dashboard">
        <div className="estate-column">
          <SceneImage isNight={effectiveIsNight} estateState={estateState} preset={uiPresentation.preset} />
          <section className={`estate-report estate-report--${estateState.tone}`}>
            <div>
              <span className="eyebrow">영지 상태</span>
              <h2>{estateState.name}</h2>
            </div>
            <p>{estateState.script}</p>
          </section>
        </div>
        <section className="action-column" key={`${game.phase}-${game.day}-${game.dayTurn}-${game.expedition?.stepIndex ?? 0}`}>
          {mainContent}
        </section>
        <CharacterPanel game={game} />
      </div>

      {game.phase === "nightfall-transition" && <TransitionOverlay onContinue={() => setGame(completeTransition(game))} />}
      <ResultOverlay game={game} result={game.phase === "result" ? game.pendingResult : null} onContinue={() => setGame(continueAfterResult(game))} />
      {rulesOpen && (
        <RulesModal
          game={game}
          tutorial={tutorialPrompt}
          onClose={closeRules}
          onTogglePassive={togglePassive}
          onToggleMarkLoadout={toggleMarkLoadout}
          onEquipMark={equipMark}
        />
      )}
      {saveOpen && <SaveModal game={game} onClose={() => setSaveOpen(false)} onLoad={loadSlot} />}
      <button
        className={"developer-launcher " + (developerMode ? "is-active" : "")}
        type="button"
        onClick={() => setDeveloperMode((current) => !current)}
      >
        dev
      </button>
      {developerMode && (
        <DeveloperPanel
          game={game}
          eyeOverride={eyeOverride}
          nightPreview={developerNightPreview}
          uiPreset={developerUiPreset}
          onClose={() => setDeveloperMode(false)}
          onEyeOverrideChange={(patch) => setEyeOverride((current) => ({ ...current, ...patch }))}
          onNightPreviewChange={setDeveloperNightPreview}
          onUiPresetChange={setDeveloperUiPreset}
          onApplyHorrorPreset={applyDeveloperHorrorPreset}
          onSetMapValue={setDeveloperMapValue}
          onSetTraitProgress={setDeveloperTraitProgress}
          onTogglePassiveOwned={toggleDeveloperPassiveOwned}
          onTogglePassiveActive={toggleDeveloperPassiveActive}
        />
      )}
    </main>
  );
}

export default App;

function exactOptionPreview(game, choice) {
  const chance = getEffectiveChoiceChance({ ...game, phase: "night" }, choice.chance, choice);
  const resolved = resolveChoice({ ...game, phase: "night" }, {
    ...choice,
    id: `preview-${choice.id}`,
    successChance: null,
    stats: choice.success?.stats,
    resources: choice.success?.resources,
    estate: choice.success?.estate,
    traits: choice.success?.traits,
  });
  const effects = {
    stats: resolved.displayDeltas.stats,
    resources: resolved.displayDeltas.resources,
    estate: resolved.displayDeltas.estate,
    traits: resolved.displayDeltas.traits,
  };
  const deltas = Object.entries(effects).flatMap(([group, values]) =>
    Object.entries(values ?? {}).map(([key, value]) => `${LABELS[key] ?? key} ${displaySignedTenth(value)}`),
  );
  if (choice.intentionalLoss) deltas.push("\ub3d9\ud589\uc790 \uc601\uad6c \uc2e4\uc885");
  return [chance == null ? null : `\uc131\uacf5\ub960 ${displayChancePercent(chance)}%`, ...deltas].filter(Boolean).join(" \u00b7 " );
}
