function normalizeTriggerKeys(storylet = {}) {
  if (Array.isArray(storylet.triggerKeys)) return storylet.triggerKeys.filter(Boolean);
  if (Array.isArray(storylet.triggerKey)) return storylet.triggerKey.filter(Boolean);
  return storylet.triggerKey ? [storylet.triggerKey] : [];
}

export function createStoryletIndex(storylets = []) {
  const byTrigger = new Map();
  const seenIds = new Set();
  const indexedStorylets = storylets.map((storylet, order) => {
    if (!storylet?.id) throw new Error("Storylet requires an id.");
    if (seenIds.has(storylet.id)) throw new Error(`Duplicate storylet id: ${storylet.id}`);
    seenIds.add(storylet.id);

    const triggerKeys = normalizeTriggerKeys(storylet);
    if (!triggerKeys.length) throw new Error(`Storylet requires a triggerKey: ${storylet.id}`);

    const entry = {
      priority: 0,
      repeatable: false,
      exclusive: false,
      ...storylet,
      triggerKeys,
      order,
    };

    triggerKeys.forEach((triggerKey) => {
      const bucket = byTrigger.get(triggerKey) ?? [];
      bucket.push(entry);
      byTrigger.set(triggerKey, bucket);
    });

    return entry;
  });

  byTrigger.forEach((bucket) => {
    bucket.sort((left, right) => right.priority - left.priority || left.order - right.order);
  });

  return {
    storylets: indexedStorylets,
    byTrigger,
  };
}

export function getStoryletsForTrigger(index, triggerKey, state = {}) {
  const completed = new Set(state.completedStoryletIds ?? []);
  return [...(index?.byTrigger?.get(triggerKey) ?? [])].filter((storylet) => {
    if (!storylet.repeatable && completed.has(storylet.id)) return false;
    return storylet.condition ? storylet.condition(state, storylet) : true;
  });
}

export function getStoryletPayloadsForTrigger(index, triggerKey, state = {}) {
  return getStoryletsForTrigger(index, triggerKey, state).map((storylet) => storylet.payload ?? storylet);
}
