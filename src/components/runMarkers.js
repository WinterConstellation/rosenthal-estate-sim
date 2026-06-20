const BAD_INCREASE_KEYS = {
  "자원": new Set(["fear"]),
  "영지": new Set(["corruption", "missing"]),
};

const BAD_INCREASE_GROUPS = new Set(["공포 특성", "공포 상태"]);

function positiveInteger(value, fallback = 1) {
  const numeric = Math.floor(Number(value));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function nonnegativeInteger(value) {
  const numeric = Math.floor(Number(value));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

export function getRecordPage(game = {}) {
  return positiveInteger(game.meta?.cycle ?? game.cycle);
}

export function getRecordPeriod(game = {}, isNight = false) {
  if (isNight) return "밤";
  if (["day", "seed-reveal", "prologue", "daybreak-transition"].includes(game.phase)) {
    const turn = Math.floor(Number(game.dayTurn) || 0);
    if (turn < 2) return "오전";
    if (turn < 4) return "오후";
    return "저녁";
  }
  return "기록";
}

export function formatPageMarker(game = {}, isNight = false) {
  return `${getRecordPage(game)}페이지 · ${positiveInteger(game.day)}일차 · ${getRecordPeriod(game, isNight)}`;
}

export function getSacrificeProgress(count = 0) {
  const current = nonnegativeInteger(count);
  return {
    label: current > 0 ? "제물" : "■■",
    value: `${current} / 3`,
    revealed: current > 0,
  };
}

export function isBadIncrease(change = {}) {
  if (Number(change.delta) <= 0) return false;
  return BAD_INCREASE_GROUPS.has(change.group) || BAD_INCREASE_KEYS[change.group]?.has(change.key) === true;
}

export function isGoodDecrease(change = {}) {
  if (Number(change.delta) >= 0) return false;
  return BAD_INCREASE_GROUPS.has(change.group) || BAD_INCREASE_KEYS[change.group]?.has(change.key) === true;
}

export function getChangeToneClass(change = {}) {
  if (Number(change.delta) === 0) return "change--neutral";
  if (isBadIncrease(change)) return "change--negative";
  if (isGoodDecrease(change)) return "change--positive";
  return Number(change.delta) > 0 ? "change--positive" : "change--negative";
}
