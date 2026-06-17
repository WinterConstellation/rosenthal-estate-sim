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
import { getEffectiveChoiceChance, getJob, getPassive, getStigmaName, resolveChoice, truncateToTenth } from "./engine/rulesEngine.js";
import {
  HORROR_DERIVED_META,
  HORROR_TRAIT_META,
  PASSIVES,
  RESOURCE_META,
  STIGMA_PREFIXES,
  STIGMA_SUFFIXES,
  TRAIT_META,
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
const HORROR_TEXT_RAIN_SEED = "cached-eye-reference:seed-1:night:altered";
const HORROR_TEXT_RAIN_GLYPHS = [".", "-", "*", "+", "x", "X", ":", "'", "`"];

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

function resolveHorrorDirector(game, isNight) {
  const intensity = getHorrorIntensity(game, isNight);
  const fear = Number(game.derivedHorror?.effectiveFear ?? game.resources?.fear ?? 0) / 100;
  const corruption = Number(game.estate?.corruption ?? 0) / 100;
  const intrusion = Number(game.derivedHorror?.intrusionPressure ?? 0) / 100;
  const monsterization = Number(game.derivedHorror?.monsterization ?? 0) / 100;
  const transformedCount = getTransformedCompanionCount(game);
  const nightPressure = isHorrorNightPressure(game);
  const truthPressure = game.truthFlags?.truthDiscovered ? 0.16 : 0;
  const routePressure = game.route === "altered" ? 0.18 : 0;
  const transformedPressure = Math.min(0.22, transformedCount * 0.07);
  const eyeIntensity = clamp01(corruption * 0.42 + fear * 0.22 + intrusion * 0.24 + monsterization * 0.18 + transformedPressure + truthPressure + routePressure + (nightPressure ? 0.16 : 0));
  const daytimeBreach = !isNight && (corruption >= 0.22 || fear >= 0.28 || intrusion >= 0.18 || monsterization >= 0.18 || transformedCount > 0 || game.truthFlags?.truthDiscovered || game.route === "altered");
  const textEyesEnabled = eyeIntensity >= (isNight ? 0.2 : 0.3) || (daytimeBreach && eyeIntensity >= 0.2);

  return {
    intensity,
    textMist: {
      enabled: HORROR_FLOATING_TEXT_ENABLED && isNight && intensity >= 0.12,
      intensity,
      fragmentCount: Math.min(8, Math.max(3, Math.round(3 + intensity * 5))),
    },
    textRain: {
      enabled: isNight ? intensity >= 0.12 : true,
      intensity: isNight ? intensity : Math.max(0.22, intensity),
      tone: isNight ? "night" : "day",
    },
    staticRows: {
      enabled: isNight && intensity >= 0.58,
      rows: HORROR_STATIC_ROWS.slice(0, intensity >= 0.78 ? 3 : 2),
    },
    textEyes: {
      enabled: textEyesEnabled,
      intensity: eyeIntensity,
      count: Math.min(5, Math.max(1, Math.round(1 + eyeIntensity * 4))),
      burst: eyeIntensity >= 0.68 || game.phase === "escape-transformed-choice" || game.phase === "record-stop",
      variant: game.route === "altered" || transformedCount > 0 ? "eye1" : "sleepy1",
    },
  };
}

function pseudoNoise(value) {
  const n = Math.sin(value * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function hashString(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hash01(...parts) {
  const base = hashString(parts.join("|"));
  let h = base + 0x6d2b79f5;
  h = Math.imul(h ^ (h >>> 15), h | 1);
  h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
  return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
}

function pickGlyph(list, seed) {
  return list[Math.floor(pseudoNoise(seed) * list.length) % list.length];
}

function pickHashed(list, ...parts) {
  return list[Math.floor(hash01(...parts) * list.length) % list.length];
}

function getTextEyeVariantId(variant) {
  return variant === "wide" || variant === "eye1" ? "eye1" : "sleepy1";
}

function getMarenolEyeMaskLines(variantId, nx, ax, ry, lidScale) {
  if (variantId === "eye1") {
    const almond = ry * Math.pow(1 - Math.pow(ax, 1.52), 0.53) * lidScale;
    const upperBias = 1 + 0.1 * Math.sin((nx + 0.2) * Math.PI);
    const lowerBias = 0.85 + 0.11 * Math.cos((nx - 0.1) * Math.PI);
    return {
      upper: -almond * upperBias,
      lower: almond * lowerBias,
    };
  }

  const almond = ry * Math.pow(1 - Math.pow(ax, 1.34), 0.62) * lidScale;
  const sleepyDrop = ry * (0.1 + 0.025 * Math.sin((nx - 0.2) * Math.PI));
  return {
    upper: -almond * (0.4 + 0.05 * Math.sin((nx + 0.15) * Math.PI)) + sleepyDrop,
    lower: almond * (0.72 + 0.04 * Math.cos((nx - 0.1) * Math.PI)) + sleepyDrop * 0.1,
  };
}

function getMarenolEyeLidBandY(variantId, ry, shape, lidScale, side) {
  if (variantId === "eye1") {
    return side < 0
      ? -ry * shape * lidScale
      : ry * 0.88 * shape * lidScale;
  }

  return side < 0
    ? -ry * 0.42 * shape * lidScale + ry * 0.1
    : ry * 0.72 * shape * lidScale + ry * 0.02;
}

function pickRuntimeGlyph(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function getMarenolBlink(blinkState, time, reduceMotion) {
  if (reduceMotion) return 0;
  if (!blinkState.nextBlink) {
    blinkState.nextBlink = time + 5000 + Math.random() * 7000;
  }
  if (time >= blinkState.nextBlink) {
    blinkState.startedAt = time;
    blinkState.duration = 135 + Math.random() * 100;
    blinkState.until = time + blinkState.duration;
    blinkState.nextBlink = blinkState.until + 5000 + Math.random() * 7000;
  }
  if (!blinkState.until || time > blinkState.until) return 0;
  const phase = (time - blinkState.startedAt) / Math.max(1, blinkState.duration);
  return Math.sin(clampRange(phase, 0, 1) * Math.PI);
}

function getMarenolEyeMetrics(layout, width, height) {
  const rx = Math.min(width * layout.rx, 360) * layout.s;
  const ry = Math.min(height * layout.ry, 142) * layout.s;
  return {
    cx: width * layout.x,
    cy: height * layout.y,
    rx,
    ry,
    cell: clampRange((Math.min(width, height) / 98) * Math.max(0.82, layout.s), 5, 7),
  };
}

function stampMarenolEyeFromBuffer(ctx, sourceCanvas, width, height, dpr, layout) {
  const source = getMarenolEyeMetrics(HORROR_EYE_SINGLE_LAYOUT, width, height);
  const dest = getMarenolEyeMetrics(layout, width, height);
  const sourcePad = Math.max(source.rx * 0.18, 36);
  const destPad = Math.max(dest.rx * 0.18, 36);
  const sourceW = (source.rx + sourcePad) * 2;
  const sourceH = source.ry * 4.1;
  const destW = (dest.rx + destPad) * 2;
  const destH = dest.ry * 4.1;

  ctx.save();
  ctx.translate(dest.cx, dest.cy);
  ctx.rotate((layout.r * Math.PI) / 180);
  ctx.beginPath();
  ctx.ellipse(0, 0, dest.rx + destPad, dest.ry * 1.62, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(
    sourceCanvas,
    Math.max(0, (source.cx - sourceW / 2) * dpr),
    Math.max(0, (source.cy - sourceH / 2) * dpr),
    Math.min(sourceW * dpr, sourceCanvas.width),
    Math.min(sourceH * dpr, sourceCanvas.height),
    -destW / 2,
    -destH / 2,
    destW,
    destH
  );
  ctx.restore();
}

function drawMarenolLidGlyphBand(ctx, variantId, rx, ry, lidScale, blink, time, side, reduceMotion) {
  const localTime = reduceMotion ? 0 : time * 0.001;
  const sampleCount = 112;
  const band = variantId === "eye1" ? (side < 0 ? 7 : 5) : (side < 0 ? 9 : 4);
  const baseSize = clampRange(Math.min(rx, ry) / 18, 5, 8);

  for (let i = 0; i <= sampleCount; i += 1) {
    const p = i / sampleCount;
    const nx = -1 + p * 2;
    const endFade = Math.pow(1 - Math.abs(nx), 0.28);
    const shape = Math.pow(
      1 - Math.abs(nx),
      variantId === "eye1" ? (side < 0 ? 0.52 : 0.55) : (side < 0 ? 0.58 : 0.64)
    );
    const x = nx * rx;
    const curveY = getMarenolEyeLidBandY(variantId, ry, shape, lidScale, side);
    const skip = pseudoNoise(i * 8.31 + side * 19.7) < 0.18 + blink * 0.18;
    if (skip || endFade < 0.22) continue;

    for (let layer = 0; layer < band; layer += 1) {
      const seed = i * 17.13 + layer * 23.9 + side * 41.7;
      const n1 = pseudoNoise(seed + Math.floor(localTime * 9));
      const n2 = pseudoNoise(seed + 5.2);
      const n3 = pseudoNoise(seed + 9.9);
      const inward = variantId === "eye1"
        ? (side < 0 ? layer * 3.5 : -layer * 3.3)
        : (side < 0 ? layer * 2.7 : -layer * 2.2);
      const torn = Math.sin(nx * 9.2 + layer * 1.7 + localTime * 1.8) *
        (variantId === "eye1" ? 3.2 : (side < 0 ? 2.6 : 1.8));
      const y = curveY + inward + (n1 - 0.5) * 13 + torn;
      const xJitter = (n2 - 0.5) * 12 + Math.sin(localTime * 2.4 + seed) * 1.8;
      const alpha = variantId === "eye1"
        ? (0.06 + (band - layer) / band * 0.21 + n3 * 0.15) * endFade
        : (0.05 + (band - layer) / band * (side < 0 ? 0.19 : 0.12) + n3 * 0.1) * endFade;
      const red = Math.floor((variantId === "eye1" ? 126 : 98) + n1 * (variantId === "eye1" ? 114 : 86));
      const size = baseSize + n2 * 5 + (layer === 0 ? 1.5 : 0);

      ctx.font = `${layer < 2 ? 700 : 400} ${size}px Consolas, "Courier New", monospace`;
      ctx.fillStyle = `rgba(${red}, 0, ${Math.floor(n3 * 18)}, ${alpha})`;
      ctx.fillText(pickRuntimeGlyph(HORROR_EYE_LID_GLYPHS), x + xJitter, y);
    }
  }
}

function drawMarenolLids(ctx, variantId, rx, ry, lidScale, blink, time, reduceMotion) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawMarenolLidGlyphBand(ctx, variantId, rx, ry, lidScale, blink, time, -1, reduceMotion);
  drawMarenolLidGlyphBand(ctx, variantId, rx, ry, lidScale, blink, time, 1, reduceMotion);
  ctx.restore();
}

function drawTextEye(ctx, layout, width, height, time, pointer, effect, index, reduceMotion, blinkState) {
  const variantId = getTextEyeVariantId(effect.variant);
  const { cx, cy, rx, ry, cell } = getMarenolEyeMetrics(layout, width, height);
  const fontSize = cell * 1.24;
  const lookX = pointer.x * rx * 0.045 + (reduceMotion ? 0 : Math.sin(time * 0.0011 + index * 0.41) * 7 * layout.s);
  const lookY = pointer.y * ry * 0.06 + (reduceMotion ? 0 : Math.cos(time * 0.0014 + index * 0.37) * 4 * layout.s);
  const irisR = Math.min(rx, ry) * 0.56;
  const pupilR = irisR * 0.39;
  const blink = getMarenolBlink(blinkState, time, reduceMotion);
  const lidScale = 1 - blink * 0.93;
  const burstJitter = effect.burst && !reduceMotion
    ? Math.sin(time * 0.026 + index * 0.43) * (2.2 + effect.intensity * 4.2) * layout.s
    : 0;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((layout.r * Math.PI) / 180);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${fontSize}px Consolas, "Courier New", monospace`;
  ctx.globalCompositeOperation = "screen";

  const jitterAmp = reduceMotion ? 0 : 1.15;
  for (let y = -ry; y <= ry; y += cell * 1.12) {
    for (let x = -rx; x <= rx; x += cell) {
      const nx = x / rx;
      const ax = Math.abs(nx);
      if (ax > 1) continue;

      const lines = getMarenolEyeMaskLines(variantId, nx, ax, ry, lidScale);
      const upperLine = lines.upper;
      const lowerLine = lines.lower;
      if (y < upperLine || y > lowerLine) continue;

      const px = x - lookX;
      const py = y - lookY;
      const dist = Math.hypot(px, py);
      const edge = Math.min(y - upperLine, lowerLine - y);
      const scar = Math.sin(x * 0.073 + y * 0.031 + time * 0.003);
      if (scar > 0.88 && edge < cell * 8) continue;

      const noise = Math.sin(x * 0.11 + y * 0.17 + time * 0.004) * 0.5 + 0.5;
      let char = pickRuntimeGlyph(HORROR_EYE_GLYPHS);
      let color = "rgba(118, 16, 16, 0.44)";

      if (edge < cell * 3.2) {
        char = pickRuntimeGlyph(HORROR_EYE_EDGE_GLYPHS);
        color = `rgba(202, 0, 0, ${0.27 + noise * 0.34})`;
      }

      if (dist < irisR) {
        const ring = dist / irisR;
        char = pickRuntimeGlyph(HORROR_EYE_IRIS_GLYPHS);
        const red = Math.floor(160 + 70 * (1 - ring));
        const green = Math.floor(8 + 20 * (1 - ring));
        color = `rgba(${red}, ${green}, ${Math.floor(18 + noise * 26)}, ${0.52 + noise * 0.38})`;

        const spoke = Math.abs(Math.sin(Math.atan2(py, px) * 18 + time * 0.0013));
        if (spoke > 0.86 && ring > 0.34) {
          char = pickRuntimeGlyph(["/", "\\", "|"]);
          color = `rgba(255, 34, 46, ${0.58 + noise * 0.3})`;
        }
      }

      if (dist < pupilR) {
        const inner = dist / pupilR;
        char = pickRuntimeGlyph([" ", ".", "`"]);
        color = `rgba(${Math.floor(12 + noise * 15)}, 0, 0, ${0.86 - inner * 0.25})`;
      }

      const highlightOne = Math.hypot(px + irisR * 0.32, py + irisR * 0.38);
      const highlightTwo = Math.hypot(px - irisR * 0.18, py + irisR * 0.2);
      if (highlightOne < irisR * 0.13 || highlightTwo < irisR * 0.07) {
        char = pickRuntimeGlyph(["*", "+", "."]);
        color = `rgba(255, 214, 222, ${0.8 + noise * 0.18})`;
      }

      const jitterX = jitterAmp * Math.sin(time * 0.012 + x * 0.23 + y * 0.11) + burstJitter;
      const jitterY = jitterAmp * Math.cos(time * 0.011 + x * 0.08 - y * 0.19) - burstJitter * 0.35;
      ctx.fillStyle = color;
      ctx.fillText(char, x + jitterX, y + jitterY);
    }
  }

  drawMarenolLids(ctx, variantId, rx, ry, lidScale, blink, time, reduceMotion);
  ctx.restore();
}

function HorrorTextEyes({ effect }) {
  const canvasRef = useRef(null);
  const blinkStatesRef = useRef([]);

  useEffect(() => {
    if (!effect.enabled) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return undefined;
    const eyeBuffer = document.createElement("canvas");
    const eyeBufferCtx = eyeBuffer.getContext("2d", { alpha: true });
    if (!eyeBufferCtx) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: 0, y: 0 };
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frameId = 0;
    let lastDraw = 0;
    let visible = !document.hidden;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.floor(window.innerWidth);
      height = Math.floor(window.innerHeight);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      eyeBuffer.width = canvas.width;
      eyeBuffer.height = canvas.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      eyeBufferCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      eyeBufferCtx.imageSmoothingEnabled = false;
    };
    const move = (event) => {
      pointer.x = clampRange((event.clientX / Math.max(1, width) - 0.5) * 2, -1, 1);
      pointer.y = clampRange((event.clientY / Math.max(1, height) - 0.5) * 2, -1, 1);
    };
    const visibility = () => {
      visible = !document.hidden;
    };
    const frameInterval = effect.burst ? 72 : (effect.count > 1 ? 110 : 82);
    const draw = (time) => {
      if (!visible) {
        frameId = requestAnimationFrame(draw);
        return;
      }
      if (!reduceMotion && time - lastDraw < frameInterval) {
        frameId = requestAnimationFrame(draw);
        return;
      }
      lastDraw = time;
      ctx.clearRect(0, 0, width, height);
      const eyeCount = clampRange(effect.count, 1, HORROR_EYE_LAYOUTS.length);
      if (!blinkStatesRef.current[0]) blinkStatesRef.current[0] = {};
      if (eyeCount > 1) {
        eyeBufferCtx.clearRect(0, 0, width, height);
        drawTextEye(eyeBufferCtx, HORROR_EYE_SINGLE_LAYOUT, width, height, time, pointer, effect, 0, reduceMotion, blinkStatesRef.current[0]);
        HORROR_EYE_LAYOUTS.slice(0, eyeCount).forEach((layout) => {
          stampMarenolEyeFromBuffer(ctx, eyeBuffer, width, height, dpr, layout);
        });
      } else {
        drawTextEye(ctx, HORROR_EYE_SINGLE_LAYOUT, width, height, time, pointer, effect, 0, reduceMotion, blinkStatesRef.current[0]);
      }
      if (!reduceMotion) frameId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move);
    document.addEventListener("visibilitychange", visibility);
    draw(performance.now());

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [effect.burst, effect.count, effect.enabled, effect.intensity, effect.variant]);

  if (!effect.enabled) return null;
  return <canvas className="horror-text-eyes" ref={canvasRef} style={{ "--horror-eye-strength": effect.intensity.toFixed(2) }} aria-hidden="true" />;
}

function HorrorTextRainCanvas({ effect }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!effect.enabled) return undefined;
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotionQuery.matches) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return undefined;

    let rainGlyphs = [];
    let width = 0;
    let height = 0;
    let frameId = 0;
    let visible = !document.hidden;

    const generateRain = () => {
      const rainCount = Math.round(clampRange((width * height) / 4200, 120, 310));
      rainGlyphs = Array.from({ length: rainCount }, (_, index) => ({
        x: hash01(HORROR_TEXT_RAIN_SEED, "rain", index, "x") * width,
        y: hash01(HORROR_TEXT_RAIN_SEED, "rain", index, "y") * height,
        size: 7 + hash01(HORROR_TEXT_RAIN_SEED, "rain", index, "size") * 8,
        speed: 8.4 + hash01(HORROR_TEXT_RAIN_SEED, "rain", index, "speed") * 40.6,
        sway: (hash01(HORROR_TEXT_RAIN_SEED, "rain", index, "sway") - 0.5) * 24,
        phase: hash01(HORROR_TEXT_RAIN_SEED, "rain", index, "phase") * Math.PI * 2,
        glyph: pickHashed(HORROR_TEXT_RAIN_GLYPHS, HORROR_TEXT_RAIN_SEED, "rain", index, "glyph"),
        alpha: 0.08 + hash01(HORROR_TEXT_RAIN_SEED, "rain", index, "alpha") * 0.22,
        light: 0.45 + hash01(HORROR_TEXT_RAIN_SEED, "rain", index, "light") * 0.55,
      }));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, Math.floor(window.innerWidth));
      height = Math.max(1, Math.floor(window.innerHeight));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      generateRain();
    };

    const visibility = () => {
      visible = !document.hidden;
    };

    const draw = (time) => {
      if (!visible) {
        frameId = requestAnimationFrame(draw);
        return;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const t = time / 1000;
      const dayTone = effect.tone === "day";
      for (const item of rainGlyphs) {
        const y = (item.y + t * item.speed) % (height + 60) - 30;
        const x = item.x + Math.sin(t * 1.8 + item.phase) * item.sway;
        ctx.font = `700 ${item.size}px Consolas, "Courier New", monospace`;
        if (dayTone) {
          const glowAlpha = Math.min(0.32, item.alpha * 1.25);
          const coreAlpha = Math.min(0.5, item.alpha * 1.7);
          ctx.fillStyle = `rgba(255, 255, 236, ${coreAlpha})`;
          ctx.fillRect(x - 1, y - 1, 2 + item.light * 2, 2 + item.light * 2);
          ctx.fillStyle = `rgba(255, 245, 190, ${glowAlpha * 0.8})`;
          ctx.fillText(item.glyph, x + item.light * 2.2, y + item.light * 1.5);
        } else {
          ctx.fillStyle = `rgba(225, 24, 42, ${item.alpha})`;
          ctx.fillText(item.glyph, x, y);
        }
      }

      ctx.restore();
      frameId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", visibility);
    draw(performance.now());

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [effect.enabled, effect.tone]);

  if (!effect.enabled) return null;
  return <canvas className="horror-text-rain-canvas" ref={canvasRef} aria-hidden="true" />;
}

function HorrorTextOverlay({ game, isNight, director: directorOverride }) {
  const director = directorOverride ?? resolveHorrorDirector(game, isNight);
  if (!director.textMist.enabled && !director.textRain.enabled && !director.staticRows.enabled && !director.textEyes.enabled) return null;

  const intensity = director.intensity;

  return (
    <div
      className="horror-text-overlay"
      style={{ "--horror-strength": intensity.toFixed(2) }}
      aria-hidden="true"
    >
      <HorrorTextRainCanvas effect={director.textRain} />
      <HorrorTextEyes effect={director.textEyes} />
      {director.textMist.enabled && (
        <div className="horror-text-overlay__mist">
          {HORROR_FRAGMENTS.slice(0, director.textMist.fragmentCount).map((text, index) => {
            const layout = HORROR_FRAGMENT_LAYOUTS[index % HORROR_FRAGMENT_LAYOUTS.length];
            return (
              <span
                className={"horror-fragment " + (index % 3 !== 0 ? "horror-fragment--eaten" : "")}
                data-text={text}
                key={text + "-" + index}
                style={{
                  "--x": layout.x + "%",
                  "--y": layout.y + "%",
                  "--scale": layout.s,
                  "--rotate": layout.r + "deg",
                  "--delay": layout.d + "s",
                }}
              >
                {text}
              </span>
            );
          })}
        </div>
      )}
      {director.staticRows.enabled && (
        <div className="horror-text-overlay__static">
          {director.staticRows.rows.map((row, index) => (
            <span
              key={row + "-" + index}
              style={{
                "--y": 18 + index * 18 + "%",
                "--delay": index * -0.9 + "s",
                "--duration": 2.7 + index * 0.35 + "s",
              }}
            >
              {row}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const RESOURCE_DETAILS = {
  food: "영지 주민이 먹을 식량의 비축 상태.",
  timber: "수리와 난방에 사용하는 목재의 비축 상태.",
  silver: "거래와 영지 운영에 사용하는 은화.",
  salt: "악한 것을 봉쇄하고 정화하는 데 사용하는 축성 소금.",
  population: "현재 영지에 속한 사람의 수.",
  faith: "영지 공동체가 유지하는 신앙의 상태.",
  fear: "영지 전체에 쌓인 공포. 높을수록 일상이 흔들린다.",
};

const ESTATE_DETAILS = {
  stability: "영지의 질서와 일상이 유지되는 정도.",
  trust: "주민들이 영주의 선택을 신뢰하는 정도.",
  recordIntegrity: "장부와 증언이 서로 모순 없이 남아 있는 정도.",
  corruption: "저택과 영지에 퍼진 비정상적인 징후.",
  missing: "돌아오지 않은 사람의 수.",
};

function getChangeDetail(change) {
  if (change.group === "능력치") return STAT_DETAILS[change.key];
  if (change.group === "성향") return TRAIT_DETAILS[change.key];
  if (change.group === "공포 특성") return HORROR_TRAIT_META[change.key]?.detail;
  if (change.group === "자원") return RESOURCE_DETAILS[change.key];
  if (change.group === "영지") return ESTATE_DETAILS[change.key];
  return undefined;
}

function resourceStage(key, value) {
  const amount = Math.max(0, Math.min(value ?? 0, 100));
  if (key === "fear") {
    if (amount <= 20) return "평온";
    if (amount <= 40) return "불안";
    if (amount <= 60) return "공포";
    if (amount <= 80) return "패닉";
    return "붕괴 직전";
  }
  if (amount <= 20) return "고갈";
  if (amount <= 40) return "부족함";
  if (amount <= 60) return "보통";
  if (amount <= 80) return "넉넉함";
  return "풍족함";
}

function resourceTone(key, value) {
  const amount = Math.max(0, Math.min(value ?? 0, 100));
  if (key === "fear") {
    if (amount <= 20) return "good";
    if (amount <= 40) return "neutral";
    if (amount <= 60) return "warning";
    if (amount <= 80) return "danger";
    return "critical";
  }
  if (amount <= 20) return "critical";
  if (amount <= 40) return "danger";
  if (amount <= 60) return "neutral";
  if (amount <= 80) return "good";
  return "abundant";
}

function hasFinalConsonant(text) {
  const code = text.at(-1)?.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

function joinLabels(labels) {
  if (labels.length <= 1) return labels[0] ?? "";
  return labels.map((label, index) => (
    index === labels.length - 1 ? label : `${label}${hasFinalConsonant(label) ? "과" : "와"}`
  )).join(" ");
}

function objectPhrase(labels) {
  const text = joinLabels(labels);
  return `${text}${hasFinalConsonant(text) ? "을" : "를"}`;
}

function subjectPhrase(labels) {
  const text = joinLabels(labels);
  return `${text}${hasFinalConsonant(text) ? "이" : "가"}`;
}

function describeEffects(effects = {}) {
  const entries = Object.entries(effects).flatMap(([group, values]) =>
    Object.entries(values ?? {}).map(([key, value]) => ({
      group,
      key,
      value,
      label: LABELS[key] ?? TRAIT_META[key]?.label ?? key,
    })),
  );
  const positive = entries.filter((entry) => entry.value > 0);
  const negative = entries.filter((entry) => entry.value < 0);
  const sentences = [];
  if (positive.length > 0) {
    const recovery = positive.filter((entry) => ["health", "stamina"].includes(entry.key));
    const gains = positive.filter((entry) => !["health", "stamina"].includes(entry.key));
    if (recovery.length > 0) sentences.push(`${objectPhrase(recovery.map((entry) => entry.label))} 회복한다.`);
    if (gains.length > 0) sentences.push(`${objectPhrase(gains.map((entry) => entry.label))} 늘린다.`);
  }
  if (negative.length > 0) {
    const large = negative.filter((entry) => Math.abs(entry.value) >= 4);
    const ordinary = negative.filter((entry) => Math.abs(entry.value) < 4);
    if (large.length > 0) sentences.push(`${objectPhrase(large.map((entry) => entry.label))} 크게 소모한다.`);
    if (ordinary.length > 0) sentences.push(`${subjectPhrase(ordinary.map((entry) => entry.label))} 감소한다.`);
  }
  return sentences.join(" ");
}

function describeChoice(choice) {
  if (choice.tooltip) return choice.tooltip;
  const categoryLead = {
    gathering: "영지의 물자를 확보하거나 정리한다.",
    interaction: "인물과 대화하며 관계와 영지 상태에 영향을 준다.",
    investigation: "단서와 기록을 조사한다.",
    training: "훈련을 통해 능력치를 높인다.",
    rest: "휴식을 통해 몸을 회복한다.",
    other: "일반 업무 밖의 행동을 시도한다.",
  }[choice.category];
  const effectText = describeEffects(choice.effects ?? choice.success);
  const failureText = describeEffects(choice.failure);
  if (failureText) {
    return [categoryLead, effectText && `성공하면 ${effectText}`, `실패하면 ${failureText}`].filter(Boolean).join(" ");
  }
  return [categoryLead, effectText, choice.detail ?? choice.preview, "결과는 선택한 뒤 확인할 수 있다."].filter(Boolean).join(" ");
}

function getEstatePresentation(game, isNight) {
  if ((game.estate?.corruption ?? 0) >= 60) {
    return { name: "위험구역", tone: "danger", script: "사람들은 아직 일상을 지키고 있다. 저택은 더 이상 그들을 흉내 내지 않는다." };
  }
  if ((game.estate?.trust ?? 0) <= 20 || (game.estate?.stability ?? 0) <= 20) {
    return { name: "흔들리는 영지", tone: "danger", script: "보고는 늦어지고, 닫힌 문 안에서 낮은 목소리가 오래 이어진다." };
  }
  if (isNight) {
    return { name: "밤의 로젠탈", tone: "night", script: "저택의 불이 대부분 꺼졌다. 지하로 이어지는 문만 열려 있다." };
  }
  if ((game.estate?.trust ?? 0) >= 65 && (game.estate?.stability ?? 0) >= 65) {
    return { name: "평화로운 영지", tone: "good", script: "사람들은 맡은 일을 마치고 당신의 다음 결정을 기다린다." };
  }
  return { name: "일반 영지", tone: "neutral", script: "로젠탈은 평온하다. 적어도, 해가 떠 있는 동안에는." };
}

function ResourceCard({ statKey, value, isNight, revealed }) {
  const meta = RESOURCE_META[statKey];
  const tone = resourceTone(statKey, value);
  return (
    <article className={`resource-card resource-card--${statKey} resource-card--${tone}`} title={`${meta.label}의 현재 상태를 다섯 단계로 표시한다.`}>
      <span>{meta.icon}</span>
      <small>{meta.label}</small>
      <strong>{revealed ? resourceStage(statKey, value) : "?"}</strong>
      <em>{isNight ? "밤에는 보고가 올라오지 않는다" : revealed ? "현재 장부 기록" : "첫날 장부 확인 전"}</em>
    </article>
  );
}

function SceneImage({ isNight, estateState }) {
  return (
    <section className={`estate-scene ${isNight ? "estate-scene--night" : ""}`}>
      <img className="estate-scene__image" src="./assets/eldroa-estate-day.jpg" alt={isNight ? "밤의 로젠탈 영지" : "낮의 로젠탈 영지"} />
      <div className="estate-scene__shade" />
      <div className="estate-scene__caption">
        <span>영지의 취급 · {estateState.name}</span>
        <strong>{isNight ? "문이 열려 있다" : "아무 일도 일어나지 않았다"}</strong>
        <p>{isNight ? "저택의 불이 대부분 꺼져 있다." : "영지는 평온하다."}</p>
      </div>
    </section>
  );
}

function HorrorStatePanel({ game }) {
  const revealedTraitKeys = (game.revealedHorrorTraits ?? [])
    .filter((key) => HORROR_TRAIT_META[key] && (game.horrorTraits?.[key] ?? 0) > 0);
  const revealedStateKeys = (game.revealedHorrorStates ?? [])
    .filter((key) => HORROR_DERIVED_META[key] && (game.derivedHorror?.[key] ?? 0) > 0);

  if (revealedTraitKeys.length === 0 && revealedStateKeys.length === 0) return null;

  return (
    <div className="rule-block horror-state-panel">
      {revealedTraitKeys.length > 0 && (
        <>
          <span className="eyebrow">공포 특성</span>
          <div className="horror-state-list">
            {revealedTraitKeys.map((key) => (
              <span className="horror-state-chip" key={key} title={HORROR_TRAIT_META[key].detail}>
                {HORROR_TRAIT_META[key].label} {displayInteger(game.horrorTraits[key])}
              </span>
            ))}
          </div>
        </>
      )}
      {revealedStateKeys.length > 0 && (
        <>
          <span className="eyebrow">최종 상태</span>
          <div className="horror-state-list horror-state-list--derived">
            {revealedStateKeys.map((key) => (
              <span className="horror-state-chip horror-state-chip--derived" key={key} title={HORROR_DERIVED_META[key].detail}>
                {HORROR_DERIVED_META[key].label} {displayInteger(game.derivedHorror[key])}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CharacterPanel({ game }) {
  const companions = Object.values(game.companionStates ?? {});
  const transformed = companions.filter((person) => person.status === "transformed").length;
  const lost = companions.filter((person) => ["dead", "missing"].includes(person.status)).length;
  const rankedTraits = Object.entries(game.traits ?? {})
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4);
  const job = getJob(game);

  return (
    <aside className="character-panel">
      <div className="character-panel__head">
        <div className="portrait-placeholder"><span>영주</span></div>
        <div>
          <span className="eyebrow">이번 기록</span>
          <h2>{game.specialSeedName ?? "시작 전"}</h2>
          <p>{game.specialSeedRule ?? "새 게임을 시작하면 기록이 정해진다."}</p>
        </div>
      </div>

      <div className="stat-grid">
        {Object.entries(game.stats ?? {}).map(([key, value]) => (
          <div className={value < 0 ? "is-negative" : ""} key={key} title={STAT_DETAILS[key]}>
            <span>{LABELS[key] ?? key}</span>
            <strong>{displayTenth(game.displayStats?.[key] ?? value)}</strong>
          </div>
        ))}
      </div>

      <div className="rule-block">
        <span className="eyebrow">성향</span>
        <div className="rule-chip-list">
          {rankedTraits.map(([key, value]) => <span key={key} title={TRAIT_DETAILS[key]}>{TRAIT_META[key]?.label ?? key} {displayInteger(value)}</span>)}
        </div>
      </div>
      <HorrorStatePanel game={game} />
      <div className="rule-block">
        <span className="eyebrow">직업</span>
        <strong>{game.jobId ? job?.name : "아직 정해지지 않음"}</strong>
        {game.jobId && <small>{job?.title}</small>}
      </div>
      <div className="rule-block">
        <span className="eyebrow">성흔</span>
        <strong>{game.stigma?.prefixId ? getStigmaName(game) : "아직 남지 않음"}</strong>
      </div>
      <div className="rule-block">
        <span className="eyebrow">패시브 스킬</span>
        <ol className="passive-list">
          {(game.passiveIds ?? []).map((id) => <li key={id} title={getPassive(id)?.description}><strong>{getPassive(id)?.name}</strong></li>)}
        </ol>
      </div>
      <div className="rule-block">
        <span className="eyebrow">사람들</span>
        <small>영구 소실 {lost} · 변질 {transformed} · 유품 {game.keepsakes?.length ?? 0}</small>
        <div className="roster-chips">
          {companions.map((person) => (
            <span className={`status-chip status-chip--${person.status}`} key={person.id} title={`${person.relation ?? person.reveal ?? "로젠탈의 주민"} · 현재 상태: ${STATUS_LABELS[person.status]}`}>
              {displayCompanion(person)} · {STATUS_LABELS[person.status]}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}

function normalizeDialogue(value, defaultSpeaker = "narration") {
  const source = Array.isArray(value) ? value : [value];
  return source
    .flatMap((entry) => {
      const text = typeof entry === "object" && entry !== null ? entry.text : entry;
      const speaker = typeof entry === "object" && entry !== null
        ? entry.speaker ?? defaultSpeaker
        : defaultSpeaker;
      return String(text ?? "")
        .split(/\n\s*\n/)
        .map((paragraph) => ({ text: paragraph.trim(), speaker }));
    })
    .filter((entry) => entry.text);
}

function resolveSpeakerLabel(speaker, game) {
  if (speaker === "narration") return "들리지 않는 목소리";
  if (speaker === "player") return "나";
  if (!speaker || speaker === "unknown" || speaker === "*미정*") return "*미정*";
  if (speaker.startsWith("npc:")) return getNpcSpeaker(game, speaker.slice(4));
  return speaker;
}

function getSpeakerKind(speaker) {
  if (speaker === "narration") return "narration";
  if (speaker === "player") return "player";
  if (speaker?.startsWith("npc:")) return "npc";
  return "unknown";
}

function DialogueCard({ game, eyebrow, title, paragraphs, button, onContinue, danger = false }) {
  const script = normalizeDialogue(paragraphs);
  const scriptKey = script.map((line) => `${line.speaker}:${line.text}`).join("\u241e");
  const [paragraphIndex, setParagraphIndex] = useState(0);

  useEffect(() => {
    setParagraphIndex(0);
  }, [scriptKey]);

  const currentIndex = Math.min(paragraphIndex, Math.max(script.length - 1, 0));
  const hasNextParagraph = currentIndex < script.length - 1;
  const currentLine = script[currentIndex];
  const currentSpeaker = resolveSpeakerLabel(currentLine?.speaker, game);
  const speakerKind = getSpeakerKind(currentLine?.speaker);

  return (
    <section className={`dialogue-card dialogue-card--speaker-${speakerKind} ${danger ? "dialogue-card--danger" : ""}`}>
      <div className="dialogue-card__head">
        <span>{eyebrow}</span>
        <div className="dialogue-card__head-actions">
          <span>{currentIndex + 1} / {script.length}</span>
          {hasNextParagraph && (
            <button className="dialogue-card__skip" type="button" onClick={() => setParagraphIndex(script.length - 1)}>
              <span>스킵</span>
            </button>
          )}
        </div>
      </div>
      {title && <h2 className="dialogue-card__title">{title}</h2>}
      <strong className={`speaker-label speaker-label--${speakerKind} dialogue-card__speaker`}>{currentSpeaker}</strong>
      <div className="dialogue-card__text">
        {currentLine && <p key={`${scriptKey}-${currentIndex}`}>{currentLine.text}</p>}
      </div>
      <div className="dialogue-card__controls">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => setParagraphIndex((index) => Math.max(index - 1, 0))}
        >
          이전으로
        </button>
        {hasNextParagraph ? (
          <button type="button" onClick={() => setParagraphIndex((index) => index + 1)}>다음</button>
        ) : (
          button && <button type="button" onClick={onContinue}>{button}</button>
        )}
      </div>
    </section>
  );
}

function SeedRevealModal({ name, rule, onContinue }) {
  return (
    <div className="seed-reveal-overlay">
      <section className="seed-reveal-card">
        <span className="eyebrow">이번 달의 이름</span>
        <h2>{name}</h2>
        <div className="seed-reveal-card__rule">
          <small>공개된 특성</small>
          <p>{rule}</p>
        </div>
        <button type="button" onClick={onContinue}>기록을 시작한다</button>
      </section>
    </div>
  );
}

function ChoiceButton({ choice, onClick, selected, detail }) {
  const unavailable = choice.available === false;
  return (
    <button
      className={`choice choice--${choice.tone ?? "neutral"} ${selected ? "choice--selected" : ""} ${unavailable ? "choice--unavailable" : ""}`}
      type="button"
      disabled={selected || unavailable}
      onClick={() => onClick(choice)}
      title={unavailable ? choice.unavailableReason ?? "현재 선택할 수 없다" : describeChoice(choice)}
    >
      {choice.categoryLabel && <small>{choice.categoryLabel}</small>}
      <strong>{choice.label ?? choice.title}</strong>
      {(detail || unavailable) && <span>{unavailable ? choice.unavailableReason ?? "현재 선택할 수 없다" : detail}</span>}
    </button>
  );
}

function ChoicePanel({ game, eyebrow, title, text, choices, onChoose, selectedId, footer }) {
  const paragraphs = normalizeDialogue(text);
  const scriptKey = paragraphs.map((line) => `${line.speaker}:${line.text}`).join("\u241e");
  const dialogueKey = `${eyebrow}\u241f${title}\u241f${scriptKey}`;
  const [completedScriptKey, setCompletedScriptKey] = useState(null);
  const dialogueComplete = paragraphs.length === 0 || completedScriptKey === dialogueKey;

  return (
    <>
      <section className="choice-panel">
        <header className="choice-panel__intro">
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </header>
        {dialogueComplete ? (
          <>
          <div className={`choice-list ${selectedId ? "is-resolving" : ""}`}>
            {choices.map((choice) => (
              <ChoiceButton
                key={choice.id}
                choice={choice}
                onClick={onChoose}
                selected={Boolean(selectedId)}
                detail={choice.detail ?? choice.preview}
              />
            ))}
          </div>
          {footer}
          </>
        ) : (
          <div className="choice-panel__waiting">
            <span>대화를 확인한 뒤 선택할 수 있다.</span>
          </div>
        )}
      </section>
      {!dialogueComplete && (
        <DialogueCard
          game={game}
          eyebrow={eyebrow}
          title={title}
          paragraphs={paragraphs}
          button="선택지를 확인한다"
          onContinue={() => setCompletedScriptKey(dialogueKey)}
        />
      )}
    </>
  );
}

function ResultOverlay({ game, result, onContinue }) {
  const paragraphs = normalizeDialogue(result?.result, result?.speaker ?? "narration");
  const scriptKey = paragraphs.map((line) => `${line.speaker}:${line.text}`).join("\u241e");
  const dialogueKey = `${result?.title ?? ""}\u241f${scriptKey}`;
  const [completedScriptKey, setCompletedScriptKey] = useState(null);
  const dialogueComplete = completedScriptKey === dialogueKey;
  const changeGroups = [
    { id: "stats", label: "주인공 능력치", changes: result?.changes?.filter((change) => change.group === "능력치") ?? [] },
    { id: "resources", label: "영지 자원", changes: result?.changes?.filter((change) => change.group === "자원") ?? [] },
    { id: "estate", label: "영지 상태", changes: result?.changes?.filter((change) => change.group === "영지") ?? [] },
    { id: "traits", label: "성향", changes: result?.changes?.filter((change) => change.group === "성향") ?? [] },
    { id: "horrorTraits", label: "공포 특성", changes: result?.changes?.filter((change) => change.group === "공포 특성") ?? [] },
  ].filter((group) => group.changes.length > 0);

  if (!result) return null;
  if (!dialogueComplete && paragraphs.length > 0) {
    return (
      <DialogueCard
        game={game}
        eyebrow="선택의 결과"
        title={result.title}
        paragraphs={paragraphs}
        button="선택의 결과 확인"
        onContinue={() => setCompletedScriptKey(dialogueKey)}
        danger={["danger", "lethal"].includes(result.tone)}
      />
    );
  }

  return (
    <div className="overlay result-overlay">
      <section className={`result-card result-card--${result.tone ?? "neutral"}`}>
        <div className="result-card__head">
          <span>선택의 결과</span>
          <strong>{result.title}</strong>
        </div>
        <div className="result-card__summary">
          <strong>{result.changes?.length > 0 ? `${result.changes.length}개 항목 변경` : "변화 없음"}</strong>
        </div>
        {result.notices?.length > 0 && (
          <div className="notice-list">
            {result.notices.map((notice, index) => <span key={`${notice}-${index}`}>{notice}</span>)}
          </div>
        )}
        {changeGroups.length > 0 && (
          <div className="change-groups">
            {changeGroups.map((group) => (
              <section className="change-group" key={group.id}>
                <strong>{group.label}</strong>
                <div className="change-list">
                  {group.changes.map((change, index) => (
                    <span
                      className={change.delta < 0 ? "change--negative" : "change--positive"}
                      key={`${change.group}-${change.key}-${index}`}
                      title={getChangeDetail(change)}
                    >
                      {LABELS[change.key] ?? change.label} {displaySignedTenth(change.delta)}
                    </span>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        <div className="result-card__controls">
          <button type="button" onClick={onContinue}>확인</button>
        </div>
      </section>
    </div>
  );
}

function SaveModal({ game, onClose, onLoad }) {
  const [slots, setSlots] = useState(() => getSaveSlots());
  const saveAllowed = canManualSave(game);
  const saveSlot = (index) => {
    saveManual(index, game);
    setSlots(getSaveSlots());
  };
  return (
    <div className="overlay overlay--top">
      <section className="save-modal">
        <header>
          <div>
            <span className="eyebrow">로컬 저장</span>
            <h2>기록 보관함</h2>
          </div>
          <button type="button" onClick={onClose}>닫기</button>
        </header>
        <p>자동 저장은 선택 결과마다 갱신됩니다. 수동 저장은 하루가 시작될 때만 가능합니다.</p>
        <div className="slot-list">
          {slots.map((slot, index) => (
            <article className="save-slot" key={index}>
              <div>
                <strong>수동 기록 {index + 1}</strong>
                <span>{slot ? `${slot.state.day}일차 · ${slot.state.specialSeedName}` : "비어 있음"}</span>
              </div>
              <button type="button" disabled={!saveAllowed} onClick={() => saveSlot(index)}>저장</button>
              <button type="button" disabled={!slot} onClick={() => onLoad(index)}>불러오기</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function RulesModal({ game, tutorial, onClose, onTogglePassive, onEquipStigma }) {
  const ownedPassives = game.ownedPassiveIds ?? game.passiveIds ?? [];
  const ownedPrefixes = game.meta?.ownedStigmaPrefixIds ?? game.ownedStigmaPrefixIds ?? (game.stigma?.prefixId ? [game.stigma.prefixId] : []);
  const ownedSuffixes = game.meta?.ownedStigmaSuffixIds ?? game.ownedStigmaSuffixIds ?? (game.stigma?.suffixId ? [game.stigma.suffixId] : []);
  const traitProgress = game.meta?.traitProgress ?? {};
  const totalTraitLevel = Object.values(traitProgress).reduce((sum, item) => sum + (item.level ?? 0), 0);
  const endingRecords = Object.values(game.meta?.endingRecords ?? {}).sort((left, right) => right.lastCycle - left.lastCycle);
  return (
    <div className="overlay overlay--top">
      <section className="rules-modal">
        <header>
          <div>
            <span className="eyebrow">{tutorial ? "튜토리얼 종료" : "규칙"}</span>
            <h2>{tutorial ? "이제부터의 기록" : "로젠탈에서 살아남는 법"}</h2>
          </div>
          <button type="button" onClick={onClose}>닫기</button>
        </header>

        <div className="rules-modal__guide">
          <article>
            <strong>당신이 처한 상황</strong>
            <p>당신은 매주 새 제물 후보에게 주어지는 로젠탈의 임시 영주 자리에 앉아 있다. 일곱째 밤까지 살아남으면 여덟째 날의 기록이 열린다.</p>
          </article>
          <article>
            <strong>해야 할 것</strong>
            <p>낮에는 영지를 관리하고 사람들을 알아간다. 밤에는 지하를 탐사하고, 귀환하기 전에 함께 내려간 사람에게 일어난 일을 책임져야 한다.</p>
          </article>
          <article>
            <strong>성향</strong>
            <p>성향은 선택의 누적 기록이다. 높은 성향은 관련 선택을 끌어오고 직업·성흔·사건의 조건을 바꾸지만, 숫자가 높다는 사실만으로 정답이 되지는 않는다.</p>
          </article>
        </div>

        <section className="loadout-section">
          <div>
            <span className="eyebrow">성향 성장</span>
            <strong>{totalTraitLevel} Lv</strong>
          </div>
          <p>관련 성향 선택으로 경험치를 얻고, 레벨은 같은 능력치의 양수·음수 스탯 변화를 10%씩 같은 방향으로 키운다.</p>
          <div className="trait-progress-list">
            {Object.entries(TRAIT_META).map(([key, trait]) => {
              const progress = traitProgress[key] ?? { level: 0, xp: 0 };
              const multiplier = 1 + (progress.level ?? 0) * 0.1;
              return (
                <article className="trait-progress-item" key={key}>
                  <strong>{trait.label} Lv.{progress.level ?? 0}</strong>
                  <span>{trait.stat} 변화 x{multiplier.toFixed(1)}</span>
                  <small>{progress.level >= 10 ? "최대 레벨" : displayTenth(progress.xp ?? 0) + " / 10 xp"}</small>
                </article>
              );
            })}
          </div>
        </section>

        <section className="loadout-section">
          <div>
            <span className="eyebrow">엔딩 기록</span>
            <strong>{endingRecords.length}</strong>
          </div>
          {endingRecords.length === 0 ? (
            <p>아직 기록된 분기 엔딩이 없다.</p>
          ) : (
            <div className="ending-record-list">
              {endingRecords.map((record) => (
                <article className="ending-record-item" key={record.key}>
                  <strong>{ENDING_LABELS[record.endingId] ?? record.endingId}</strong>
                  <span>{ROUTE_LABELS[record.route] ?? record.route} · {record.truthDiscovered ? "진실 확인" : "진실 미확인"}</span>
                  <small>{record.count}회 · 최초 {record.firstCycle}회차 · 최근 {record.lastCycle}회차</small>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="loadout-section">
          <div>
            <span className="eyebrow">패시브 장착</span>
            <strong>{game.passiveIds?.length ?? 0} / 3</strong>
          </div>
          <p>보유한 패시브 가운데 세 개까지 직접 장착한다.</p>
          <div className="loadout-list">
            {ownedPassives.map((id) => {
              const passive = PASSIVES.find((item) => item.id === id);
              const active = game.passiveIds?.includes(id);
              return (
                <button className={active ? "is-equipped" : ""} type="button" key={id} onClick={() => onTogglePassive(id)} title={passive?.description}>
                  <strong>{passive?.name}</strong>
                  <small>{passive?.description}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section className="loadout-section">
          <span className="eyebrow">성흔 장착</span>
          <p>획득한 접두 성흔과 접미 성흔을 각각 하나씩 장착한다.</p>
          <div className="stigma-loadout">
            <div>
              <strong>접두</strong>
              {ownedPrefixes.length === 0 && <small>아직 획득하지 않음</small>}
              {ownedPrefixes.map((id) => {
                const stigma = STIGMA_PREFIXES.find((item) => item.id === id);
                return <button className={game.stigma?.prefixId === id ? "is-equipped" : ""} type="button" key={id} onClick={() => onEquipStigma("prefixId", id)} title={stigma?.description}>{stigma?.name}</button>;
              })}
            </div>
            <div>
              <strong>접미</strong>
              {ownedSuffixes.length === 0 && <small>아직 획득하지 않음</small>}
              {ownedSuffixes.map((id) => {
                const stigma = STIGMA_SUFFIXES.find((item) => item.id === id);
                return <button className={game.stigma?.suffixId === id ? "is-equipped" : ""} type="button" key={id} onClick={() => onEquipStigma("suffixId", id)} title={stigma?.description}>{stigma?.name}</button>;
              })}
            </div>
          </div>
        </section>

        <CharacterPanel game={game} />
      </section>
    </div>
  );
}

function TransitionOverlay({ onContinue }) {
  return (
    <div className="time-transition time-transition--nightfall">
      <span className="time-transition__orb time-transition__sun" aria-hidden="true" />
      <div className="time-transition__copy">
        <span>저녁이 끝났다</span>
        <h2>해가 떨어진다.</h2>
        <p>마지막 햇빛이 사라지자 지하에서 문 두드리는 소리가 들린다.</p>
        <button type="button" onClick={onContinue}>밤을 맞는다</button>
      </div>
    </div>
  );
}

function StartScreen({ hasContinue, developerMode, onContinue, onNew, onToggleDeveloper }) {
  return (
    <div className="start-screen">
      <img className="start-screen__image" src="./assets/eldroa-estate-day.jpg" alt="" />
      <div className="start-screen__veil" />
      <section>
        <h1 style={{ marginBottom: "64px" }}>로젠탈 관리일지</h1>
        <div>
          {hasContinue && <button type="button" onClick={onContinue}>지난 꿈을 이어간다</button>}
          <button type="button" onClick={onNew}>잠에서 깨어난다</button>
          <button className={developerMode ? "is-active" : ""} type="button" onClick={onToggleDeveloper}>DEV</button>
        </div>
      </section>
    </div>
  );
}

function DeveloperNumberSection({ title, keys, values, labelMap, onChange }) {
  return (
    <section className="developer-section">
      <h3>{title}</h3>
      <div className="developer-number-grid">
        {keys.map((key) => (
          <label key={key}>
            <span>{getDeveloperLabel(key, labelMap)}</span>
            <input
              type="number"
              step="1"
              value={getDeveloperNumber(values?.[key])}
              onChange={(event) => onChange(key, event.target.value)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function DeveloperTraitSection({ game, onSetTraitValue, onSetTraitProgress }) {
  const traitProgress = game.meta?.traitProgress ?? {};
  return (
    <section className="developer-section">
      <h3>traits</h3>
      <div className="developer-trait-list">
        {DEV_TRAIT_KEYS.map((key) => {
          const progress = traitProgress[key] ?? { level: 0, xp: 0 };
          return (
            <article className="developer-trait-row" key={key}>
              <strong>{getDeveloperLabel(key, TRAIT_META)}</strong>
              <label>
                <span>value</span>
                <input
                  type="number"
                  step="1"
                  value={getDeveloperNumber(game.traits?.[key])}
                  onChange={(event) => onSetTraitValue(key, event.target.value)}
                />
              </label>
              <label>
                <span>level</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="1"
                  value={getDeveloperNumber(progress.level)}
                  onChange={(event) => onSetTraitProgress(key, "level", event.target.value)}
                />
              </label>
              <label>
                <span>xp</span>
                <input
                  type="number"
                  min="0"
                  max="9"
                  step="1"
                  value={getDeveloperNumber(progress.xp)}
                  onChange={(event) => onSetTraitProgress(key, "xp", event.target.value)}
                />
              </label>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DeveloperPassiveSection({ game, onToggleOwned, onToggleActive }) {
  const ownedPassiveIds = game.ownedPassiveIds ?? [];
  const activePassiveIds = game.passiveIds ?? [];
  return (
    <section className="developer-section">
      <h3>passives</h3>
      <div className="developer-passive-list">
        {PASSIVES.map((passive) => {
          const owned = ownedPassiveIds.includes(passive.id);
          const active = activePassiveIds.includes(passive.id);
          return (
            <article className="developer-passive-row" key={passive.id}>
              <div>
                <strong>{passive.name}</strong>
                <small>{passive.description}</small>
              </div>
              <button className={owned ? "is-active" : ""} type="button" onClick={() => onToggleOwned(passive.id)}>
                {owned ? "remove" : "gain"}
              </button>
              <button className={active ? "is-active" : ""} type="button" disabled={!owned && !active} onClick={() => onToggleActive(passive.id)}>
                {active ? "unequip" : "equip"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DeveloperEyeSection({ eyeOverride, onChange }) {
  return (
    <section className="developer-section">
      <h3>eyes</h3>
      <label className="developer-toggle">
        <input
          type="checkbox"
          checked={eyeOverride.forceEyes}
          onChange={(event) => onChange({ forceEyes: event.target.checked })}
        />
        <span>force eye canvas</span>
      </label>
      <div className="developer-number-grid">
        <label>
          <span>intensity</span>
          <input
            type="number"
            min="0.2"
            max="1"
            step="0.05"
            value={eyeOverride.intensity}
            onChange={(event) => onChange({ intensity: clampRange(getDeveloperNumber(event.target.value), 0.2, 1) })}
          />
        </label>
        <label>
          <span>count</span>
          <input
            type="number"
            min="1"
            max={HORROR_EYE_LAYOUTS.length}
            step="1"
            value={eyeOverride.count}
            onChange={(event) => onChange({ count: Math.min(Math.max(Math.floor(getDeveloperNumber(event.target.value)), 1), HORROR_EYE_LAYOUTS.length) })}
          />
        </label>
      </div>
      <div className="developer-eye-row">
        <label>
          <span>variant</span>
          <select value={getTextEyeVariantId(eyeOverride.variant)} onChange={(event) => onChange({ variant: event.target.value })}>
            <option value="sleepy1">sleepy1</option>
            <option value="eye1">eye1</option>
          </select>
        </label>
        <label className="developer-toggle">
          <input
            type="checkbox"
            checked={eyeOverride.burst}
            onChange={(event) => onChange({ burst: event.target.checked })}
          />
          <span>burst blink</span>
        </label>
      </div>
    </section>
  );
}

function DeveloperPreviewSection({ nightPreview, onNightPreviewChange }) {
  return (
    <section className="developer-section">
      <h3>preview</h3>
      <label className="developer-toggle">
        <input
          type="checkbox"
          checked={nightPreview}
          onChange={(event) => onNightPreviewChange(event.target.checked)}
        />
        <span>force night preview</span>
      </label>
    </section>
  );
}

function DeveloperPanel({
  game,
  eyeOverride,
  nightPreview,
  onClose,
  onEyeOverrideChange,
  onNightPreviewChange,
  onSetMapValue,
  onSetTraitProgress,
  onTogglePassiveOwned,
  onTogglePassiveActive,
}) {
  return (
    <aside className="developer-panel" aria-label="developer mode">
      <header>
        <div>
          <strong>DEV MODE</strong>
          <small>direct state editor</small>
        </div>
        <button type="button" onClick={onClose}>close</button>
      </header>

      <DeveloperPreviewSection nightPreview={nightPreview} onNightPreviewChange={onNightPreviewChange} />
      <DeveloperEyeSection eyeOverride={eyeOverride} onChange={onEyeOverrideChange} />
      <DeveloperNumberSection
        title="stats"
        keys={DEV_STAT_KEYS}
        values={game.stats}
        onChange={(key, value) => onSetMapValue("stats", key, value)}
      />
      <DeveloperNumberSection
        title="resources"
        keys={DEV_RESOURCE_KEYS}
        values={game.resources}
        labelMap={RESOURCE_META}
        onChange={(key, value) => onSetMapValue("resources", key, value)}
      />
      <DeveloperNumberSection
        title="estate"
        keys={DEV_ESTATE_KEYS}
        values={game.estate}
        onChange={(key, value) => onSetMapValue("estate", key, value)}
      />
      <DeveloperNumberSection
        title="horror"
        keys={DEV_HORROR_TRAIT_KEYS}
        values={game.horrorTraits}
        labelMap={HORROR_TRAIT_META}
        onChange={(key, value) => onSetMapValue("horrorTraits", key, value)}
      />
      <DeveloperTraitSection
        game={game}
        onSetTraitValue={(key, value) => onSetMapValue("traits", key, value)}
        onSetTraitProgress={onSetTraitProgress}
      />
      <DeveloperPassiveSection
        game={game}
        onToggleOwned={onTogglePassiveOwned}
        onToggleActive={onTogglePassiveActive}
      />
    </aside>
  );
}

function getDayNarration(game) {
  if (game.day !== 1) return ["선택한 행동은 오늘 다시 고를 수 없다."];
  if (game.dayTurn === 0) return DAY_OPENING_SCRIPT;
  if (game.dayTurn === 1) return DAY_INTERLUDES[0].paragraphs;
  if (game.dayTurn === 3) return DAY_INTERLUDES[1].paragraphs;
  if (game.dayTurn === 4) return DAY_INTERLUDES[2].paragraphs;
  return ["선택한 행동은 오늘 다시 고를 수 없다."];
}

function App() {
  const saved = useMemo(() => loadAutoSave(), []);
  const [game, setGame] = useState(() => saved.phase === "start" ? createStartState() : saved);
  const [showStart, setShowStart] = useState(true);
  const [saveOpen, setSaveOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [tutorialPrompt, setTutorialPrompt] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [developerMode, setDeveloperMode] = useState(shouldOpenDeveloperMode);
  const [developerNightPreview, setDeveloperNightPreview] = useState(false);
  const [eyeOverride, setEyeOverride] = useState({
    forceEyes: false,
    intensity: 0.72,
    count: 1,
    variant: "sleepy1",
    burst: false,
  });

  useEffect(() => {
    if (!showStart && game.phase !== "start") saveAuto(game);
  }, [game, showStart]);

  useEffect(() => {
    if (!showStart && game.day === 2 && game.phase === "day" && !game.tutorialSummarySeen) {
      setTutorialPrompt(true);
      setRulesOpen(true);
    }
  }, [game.day, game.phase, game.tutorialSummarySeen, showStart]);

  const isNight = isNightDisplayPhase(game);
  const effectiveIsNight = isNight || (developerMode && developerNightPreview);
  const horrorDirector = resolveHorrorDirector(game, effectiveIsNight);
  const visibleHorrorDirector = developerMode && eyeOverride.forceEyes
    ? {
        ...horrorDirector,
        intensity: Math.max(horrorDirector.intensity, eyeOverride.intensity),
        textEyes: {
          enabled: true,
          intensity: eyeOverride.intensity,
          count: eyeOverride.count,
          burst: eyeOverride.burst,
          variant: eyeOverride.variant,
        },
      }
    : horrorDirector;
  const estateState = getEstatePresentation(game, effectiveIsNight);
  const animate = (id, action) => {
    if (selectedId) return;
    setSelectedId(id);
    window.setTimeout(() => {
      setGame(action);
      setSelectedId(null);
    }, 150);
  };

  const newGame = () => {
    const meta = game.meta;
    clearAutoSave();
    setGame(createNewRun({ second: new Date().getSeconds(), meta }));
    setShowStart(false);
    setRulesOpen(false);
    setTutorialPrompt(false);
  };
  const nextCycle = () => {
    setGame((current) => advanceToNextCycle(current, { second: new Date().getSeconds() }));
    setShowStart(false);
    setSaveOpen(false);
    setRulesOpen(false);
    setTutorialPrompt(false);
  };
  const loadSlot = (index) => {
    const loaded = loadManual(index);
    if (loaded) {
      setGame(loaded);
      setShowStart(false);
      setSaveOpen(false);
      setRulesOpen(false);
      setTutorialPrompt(false);
    }
  };

  const closeRules = () => {
    setRulesOpen(false);
    if (tutorialPrompt) {
      setTutorialPrompt(false);
      setGame((current) => ({ ...current, tutorialSummarySeen: true }));
    }
  };

  const togglePassive = (passiveId) => {
    setGame((current) => {
      const active = current.passiveIds ?? [];
      if (active.includes(passiveId)) {
        return { ...current, passiveIds: active.filter((id) => id !== passiveId) };
      }
      if (active.length >= 3) return current;
      return { ...current, passiveIds: [...active, passiveId] };
    });
  };

  const equipStigma = (slot, stigmaId) => {
    setGame((current) => {
      const owned = slot === "prefixId"
        ? current.meta?.ownedStigmaPrefixIds ?? current.ownedStigmaPrefixIds ?? []
        : current.meta?.ownedStigmaSuffixIds ?? current.ownedStigmaSuffixIds ?? [];
      if (!owned.includes(stigmaId)) return current;
      const stigma = { ...current.stigma, [slot]: stigmaId };
      return {
        ...current,
        stigma,
        meta: {
          ...current.meta,
          equippedStigma: { ...(current.meta?.equippedStigma ?? {}), ...stigma },
        },
      };
    });
  };

  const setDeveloperMapValue = (group, key, rawValue) => {
    setGame((current) => {
      const value = getDeveloperNumber(rawValue);
      const next = {
        ...current,
        [group]: {
          ...(current[group] ?? {}),
          [key]: value,
        },
      };
      if (group === "stats") {
        next.displayStats = {
          ...(current.displayStats ?? current.stats ?? {}),
          [key]: value,
        };
      }
      if (["stats", "resources", "estate", "horrorTraits"].includes(group)) {
        return syncDeveloperHorrorState(next);
      }
      return next;
    });
  };

  const setDeveloperTraitProgress = (traitId, field, rawValue) => {
    setGame((current) => {
      const value = Math.floor(getDeveloperNumber(rawValue));
      const currentProgress = current.meta?.traitProgress?.[traitId] ?? { level: 0, xp: 0 };
      const nextProgress = {
        ...currentProgress,
        [field]: field === "level"
          ? Math.min(Math.max(value, 0), 10)
          : Math.min(Math.max(value, 0), 9),
      };
      if (nextProgress.level >= 10) nextProgress.xp = 0;
      return {
        ...current,
        meta: {
          ...(current.meta ?? {}),
          traitProgress: {
            ...(current.meta?.traitProgress ?? {}),
            [traitId]: nextProgress,
          },
        },
      };
    });
  };

  const toggleDeveloperPassiveOwned = (passiveId) => {
    setGame((current) => {
      const ownedPassiveIds = current.ownedPassiveIds ?? [];
      const owned = ownedPassiveIds.includes(passiveId);
      return {
        ...current,
        ownedPassiveIds: owned
          ? ownedPassiveIds.filter((id) => id !== passiveId)
          : uniqueValues([...ownedPassiveIds, passiveId]),
        passiveIds: owned
          ? (current.passiveIds ?? []).filter((id) => id !== passiveId)
          : current.passiveIds ?? [],
      };
    });
  };

  const toggleDeveloperPassiveActive = (passiveId) => {
    setGame((current) => {
      const activePassiveIds = current.passiveIds ?? [];
      const active = activePassiveIds.includes(passiveId);
      return {
        ...current,
        ownedPassiveIds: uniqueValues([...(current.ownedPassiveIds ?? []), passiveId]),
        passiveIds: active
          ? activePassiveIds.filter((id) => id !== passiveId)
          : uniqueValues([...activePassiveIds, passiveId]),
      };
    });
  };

  if (showStart) {
    return (
      <>
        <StartScreen
          hasContinue={game.phase !== "start"}
          developerMode={developerMode}
          onContinue={() => setShowStart(false)}
          onNew={newGame}
          onToggleDeveloper={() => setDeveloperMode((current) => !current)}
        />
        {developerMode && (developerNightPreview || eyeOverride.forceEyes) && <HorrorTextOverlay game={game} isNight={effectiveIsNight} director={visibleHorrorDirector} />}
        {developerMode && (
          <DeveloperPanel
            game={game}
            eyeOverride={eyeOverride}
            nightPreview={developerNightPreview}
            onClose={() => setDeveloperMode(false)}
            onEyeOverrideChange={(patch) => setEyeOverride((current) => ({ ...current, ...patch }))}
            onNightPreviewChange={setDeveloperNightPreview}
            onSetMapValue={setDeveloperMapValue}
            onSetTraitProgress={setDeveloperTraitProgress}
            onTogglePassiveOwned={toggleDeveloperPassiveOwned}
            onTogglePassiveActive={toggleDeveloperPassiveActive}
          />
        )}
      </>
    );
  }

  const mainContent = (() => {
    if (game.phase === "seed-reveal") {
      return (
        <SeedRevealModal
          name={game.specialSeedName}
          rule={game.specialSeedRule}
          onContinue={() => setGame(beginPrologue(game))}
        />
      );
    }
    if (game.phase === "prologue") {
      return (
        <DialogueCard
          game={game}
          eyebrow={PROLOGUE.tag}
          paragraphs={PROLOGUE.text.map((text, index) => ({ text, speaker: PROLOGUE.speakers[index] ?? "unknown" }))}
          button="영주의 자리에 앉는다"
          onContinue={() => setGame(openFirstDay(game))}
        />
      );
    }
    if (game.phase === "special-event") {
      const group = getSpecialGroup(game);
      const stage = group.stages[game.specialProgress];
      return (
        <ChoicePanel
          game={game}
          eyebrow={`특수 사건 · ${group.name}`}
          title={stage.title}
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

  return (
    <main className={`app-shell ${effectiveIsNight ? "theme-night" : "theme-day"}`}>
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
          <button className={developerMode ? "is-active" : ""} type="button" onClick={() => setDeveloperMode((current) => !current)}>DEV</button>
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
          <SceneImage isNight={effectiveIsNight} estateState={estateState} />
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
          onEquipStigma={equipStigma}
        />
      )}
      {saveOpen && <SaveModal game={game} onClose={() => setSaveOpen(false)} onLoad={loadSlot} />}
      <button
        className={"developer-launcher " + (developerMode ? "is-active" : "")}
        type="button"
        onClick={() => setDeveloperMode((current) => !current)}
      >
        DEV
      </button>
      {developerMode && (
        <DeveloperPanel
          game={game}
          eyeOverride={eyeOverride}
          nightPreview={developerNightPreview}
          onClose={() => setDeveloperMode(false)}
          onEyeOverrideChange={(patch) => setEyeOverride((current) => ({ ...current, ...patch }))}
          onNightPreviewChange={setDeveloperNightPreview}
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
