import { EXPLORATION_EVENTS } from "../data/rosenthalContent.js";
import { createStoryletIndex, getStoryletPayloadsForTrigger, getStoryletsForTrigger } from "./storyletRegistry.js";

export const EXPLORATION_TRIGGER_PREFIX = "exploration-direction:";

export function getExplorationTriggerKey(directionId) {
  return `${EXPLORATION_TRIGGER_PREFIX}${directionId}`;
}

export const EXPLORATION_STORYLETS = EXPLORATION_EVENTS.map((event, index) => ({
  id: `exploration-event:${event.id}`,
  triggerKey: getExplorationTriggerKey(event.directionId),
  priority: 0,
  repeatable: true,
  payload: event,
  condition: () => true,
  meta: {
    order: index,
    directionId: event.directionId,
    sourceId: event.id,
  },
}));

export const EXPLORATION_STORYLET_INDEX = createStoryletIndex(EXPLORATION_STORYLETS);

export function getExplorationStorylets(state, directionId) {
  return getStoryletsForTrigger(EXPLORATION_STORYLET_INDEX, getExplorationTriggerKey(directionId), state);
}

export function getExplorationCandidates(state, directionId) {
  return getStoryletPayloadsForTrigger(EXPLORATION_STORYLET_INDEX, getExplorationTriggerKey(directionId), state);
}
