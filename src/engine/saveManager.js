import { createStartState, GAME_VERSION, refreshSeedState } from "./rosenthalEngine.js";

export const STORAGE_KEY = "rosenthal-estate-save-v1";
const SLOT_COUNT = 10;

function blankContainer() {
  return { version: GAME_VERSION, auto: null, manual: Array.from({ length: SLOT_COUNT }, () => null) };
}

function readContainer() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed?.version === GAME_VERSION && Array.isArray(parsed.manual)) {
      return {
        ...parsed,
        auto: parsed.auto ? refreshSeedState(parsed.auto) : null,
        manual: parsed.manual.map((slot) => slot
          ? { ...slot, state: refreshSeedState(slot.state) }
          : null),
      };
    }
  } catch {
    // Corrupt saves are ignored while the previous version's key remains untouched.
  }
  return blankContainer();
}

function writeContainer(container) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(container));
}

export function loadAutoSave() {
  return readContainer().auto ?? createStartState();
}

export function saveAuto(state) {
  const container = readContainer();
  writeContainer({ ...container, auto: state });
}

export function getSaveSlots() {
  return readContainer().manual;
}

export function saveManual(slotIndex, state) {
  const container = readContainer();
  const manual = [...container.manual];
  manual[slotIndex] = {
    savedAt: new Date().toISOString(),
    state,
  };
  writeContainer({ ...container, manual });
}

export function loadManual(slotIndex) {
  return readContainer().manual[slotIndex]?.state ?? null;
}

export function clearAutoSave() {
  const container = readContainer();
  writeContainer({ ...container, auto: null });
}
