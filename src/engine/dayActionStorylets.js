import { DAY_ACTIONS } from "../data/rosenthalContent.js";
import { createStoryletIndex, getStoryletPayloadsForTrigger, getStoryletsForTrigger } from "./storyletRegistry.js";

export const DAY_ACTION_TRIGGER_PREFIX = "day-category:";

export function getDayActionTriggerKey(categoryId) {
  return `${DAY_ACTION_TRIGGER_PREFIX}${categoryId}`;
}

function dayActionIsAvailable(state = {}, action = {}) {
  if (action.requiresFlag && !state.truthFlags?.[action.requiresFlag]) return false;
  return true;
}

export const DAY_ACTION_STORYLETS = DAY_ACTIONS.map((action, index) => ({
  id: `day-action:${action.id}`,
  triggerKey: getDayActionTriggerKey(action.category),
  priority: 0,
  repeatable: true,
  payload: action,
  condition: (state) => dayActionIsAvailable(state, action),
  meta: {
    order: index,
    category: action.category,
    sourceId: action.id,
  },
}));

export const DAY_ACTION_STORYLET_INDEX = createStoryletIndex(DAY_ACTION_STORYLETS);

export function getDayActionStorylets(state, categoryId) {
  return getStoryletsForTrigger(DAY_ACTION_STORYLET_INDEX, getDayActionTriggerKey(categoryId), state);
}

export function getDayActionCandidates(state, categoryId) {
  return getStoryletPayloadsForTrigger(DAY_ACTION_STORYLET_INDEX, getDayActionTriggerKey(categoryId), state);
}
