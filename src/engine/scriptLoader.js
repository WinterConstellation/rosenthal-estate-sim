import {
  SPECIAL_EVENT_GROUPS_PACK_ID,
  getScriptPackManifest,
} from "../data/scriptManifest.js";

const SCRIPT_PACK_LOADERS = {
  [SPECIAL_EVENT_GROUPS_PACK_ID]: () => import("../data/scriptPacks/specialEventGroups.js"),
};

const scriptPackCache = new Map();

export async function loadScriptPack(packId) {
  const manifest = getScriptPackManifest(packId);
  const loader = SCRIPT_PACK_LOADERS[packId];
  if (!manifest || !loader) {
    throw new Error(`Unknown script pack: ${packId}`);
  }
  if (!scriptPackCache.has(packId)) {
    scriptPackCache.set(packId, loader().catch((error) => {
      scriptPackCache.delete(packId);
      throw error;
    }));
  }
  const module = await scriptPackCache.get(packId);
  if (!(manifest.exportName in module)) {
    throw new Error(`Script pack ${packId} does not export ${manifest.exportName}`);
  }
  return module;
}

export async function loadSpecialEventGroups() {
  const module = await loadScriptPack(SPECIAL_EVENT_GROUPS_PACK_ID);
  return module.SPECIAL_EVENT_GROUPS;
}
