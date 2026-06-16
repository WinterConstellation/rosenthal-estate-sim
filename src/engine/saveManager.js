import {
  createStartState,
  GAME_VERSION,
  normalizeProgressMeta,
  refreshSeedState,
  syncMetaFromRun,
} from "./rosenthalEngine.js";

export const STORAGE_KEY = "rosenthal-estate-save-v1";
const SLOT_COUNT = 10;

function blankContainer(meta) {
  return {
    version: GAME_VERSION,
    meta: normalizeProgressMeta(meta),
    auto: null,
    manual: Array.from({ length: SLOT_COUNT }, () => null),
  };
}

function stripMeta(state) {
  if (!state) return state;
  const { meta: _meta, ...rest } = state;
  return rest;
}

function attachMeta(state, meta) {
  if (!state) return null;
  return refreshSeedState({ ...state, meta: normalizeProgressMeta(meta) });
}

function serializeContainer(container) {
  const meta = normalizeProgressMeta(container.meta);
  return {
    version: GAME_VERSION,
    meta,
    auto: stripMeta(container.auto),
    manual: Array.from({ length: SLOT_COUNT }, (_, index) => {
      const slot = container.manual?.[index];
      return slot ? { ...slot, state: stripMeta(slot.state) } : null;
    }),
  };
}

function readContainer() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed && Array.isArray(parsed.manual)) {
      const meta = normalizeProgressMeta(parsed.meta);
      return {
        version: GAME_VERSION,
        meta,
        auto: attachMeta(parsed.auto, meta),
        manual: Array.from({ length: SLOT_COUNT }, (_, index) => {
          const slot = parsed.manual[index];
          return slot ? { ...slot, state: attachMeta(slot.state, meta) } : null;
        }),
      };
    }
  } catch {
    // Corrupt saves are ignored while the previous version's key remains untouched.
  }
  return blankContainer();
}

function writeContainer(container) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeContainer(container)));
}

export function loadAutoSave() {
  const container = readContainer();
  return container.auto ?? createStartState(container.meta);
}

export function saveAuto(state) {
  const container = readContainer();
  const meta = syncMetaFromRun({ ...state, meta: state.meta ?? container.meta });
  writeContainer({ ...container, meta, auto: { ...state, meta } });
}

export function getSaveSlots() {
  return readContainer().manual;
}

export function saveManual(slotIndex, state) {
  const container = readContainer();
  const meta = syncMetaFromRun({ ...state, meta: state.meta ?? container.meta });
  const manual = [...container.manual];
  manual[slotIndex] = {
    savedAt: new Date().toISOString(),
    state: { ...state, meta },
  };
  writeContainer({ ...container, meta, manual });
}

export function loadManual(slotIndex) {
  return readContainer().manual[slotIndex]?.state ?? null;
}

export function clearAutoSave() {
  const container = readContainer();
  writeContainer({ ...container, auto: null });
}
