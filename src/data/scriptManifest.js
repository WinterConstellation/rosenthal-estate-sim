export const SPECIAL_EVENT_GROUPS_PACK_ID = "special-event-groups";

export const SCRIPT_PACKS = [
  {
    id: SPECIAL_EVENT_GROUPS_PACK_ID,
    triggerKey: "special-event",
    kind: "special-event-groups",
    moduleKey: "specialEventGroups",
    exportName: "SPECIAL_EVENT_GROUPS",
    itemCount: 12,
    stageCount: 3,
  },
];

export function getScriptPackManifest(packId) {
  return SCRIPT_PACKS.find((pack) => pack.id === packId) ?? null;
}
