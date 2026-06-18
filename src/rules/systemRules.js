export const EFFECT_ORDER = [
  "trait",
  "job",
  "title",
  "mark-loadout",
  "mark-equipped",
  "passive-1",
  "passive-2",
  "passive-3",
];

export const RESOURCE_META = {
  food: { label: "식량", icon: "✦" },
  timber: { label: "목재", icon: "⌁" },
  silver: { label: "은화", icon: "◉" },
  salt: { label: "축성된 소금", icon: "◇" },
  population: { label: "인구", icon: "♟" },
  faith: { label: "신앙", icon: "✧" },
  fear: { label: "공포", icon: "◐" },
};

export const STAT_META = {
  health: { label: "체력" },
  insight: { label: "통찰" },
  resolve: { label: "결단" },
  charm: { label: "매력" },
  faith: { label: "신앙" },
  stamina: { label: "스태미나" },
};

export const TRAIT_META = {
  record: { label: "기록", stat: "통찰" },
  knight: { label: "기사도", stat: "결단" },
  mansion: { label: "저택", stat: "통찰" },
  trade: { label: "거래", stat: "매력" },
  life: { label: "생활", stat: "체력" },
  shortcut: { label: "편법", stat: "통찰" },
  exorcism: { label: "구마", stat: "신앙" },
  execution: { label: "처형", stat: "결단" },
  divine: { label: "신성", stat: "신앙" },
  suspicion: { label: "의심", stat: "통찰" },
};

export const TRAIT_STAT_KEYS = {
  record: "insight",
  knight: "resolve",
  mansion: "insight",
  trade: "charm",
  life: "health",
  shortcut: "insight",
  exorcism: "faith",
  execution: "resolve",
  divine: "faith",
  suspicion: "insight",
};

export const HORROR_TRAIT_META = {
  madness: { label: "광기", detail: "판단이 비틀리는 정도. 공포 총량에 더해진다." },
  erosion: { label: "침식", detail: "몸과 영지가 같은 방향으로 무너지는 정도. 공포 총량에 더해진다." },
  mentalTaint: { label: "정신오염", detail: "생각 안쪽에 남은 오염. 공포 총량에 더해진다." },
  intrusion: { label: "침입", detail: "외부의 것이 안쪽으로 들어온 흔적. 공포 총량에 더해진다." },
  blasphemy: { label: "신성 모독", detail: "기도와 축성이 뒤틀린 흔적. 공포 총량에 더해진다." },
  nameDamage: { label: "이름 훼손", detail: "호명과 기록이 흔들린 흔적. 공포 총량에 더해진다." },
  haunting: { label: "잔향", detail: "사라진 일의 울림이 남은 정도. 공포 총량에 더해진다." },
  omen: { label: "징조", detail: "아직 사건이 되지 않은 불길함. 공포 총량에 더해진다." },
};

export const HORROR_DERIVED_META = {
  effectiveFear: { label: "실질 공포", detail: "현재 공포에 획득한 공포 특성을 더한 내부 공포값." },
  horrorPressure: { label: "공포 압력", detail: "실질 공포와 영지의 이상 징후가 합쳐진 전체 압박." },
  monsterization: { label: "마물화", detail: "침식, 정신오염, 이상 징후가 쌓여 인간성이 흔들리는 정도." },
  nameInstability: { label: "이름 불안정", detail: "이름 훼손과 기록 손상이 합쳐진 호명 불안정." },
  intrusionPressure: { label: "침입 압력", detail: "외부의 것이 영지 안쪽으로 들어오려는 압력." },
  blasphemyPressure: { label: "모독 압력", detail: "신앙 저하와 신성 모독이 합쳐진 압력." },
};

export const JOBS = [
  {
    id: "steward",
    name: "행정가",
    title: "장부와 물자를 다루는 데 익숙하다.",
    focus: ["life", "trade", "record"],
    passiveId: "careful-stockpile",
  },
  {
    id: "house-reader",
    name: "탐색가",
    title: "저택의 구조와 작은 변화를 잘 알아챈다.",
    focus: ["mansion", "suspicion", "record"],
    passiveId: "quiet-footsteps",
  },
  {
    id: "lay-exorcist",
    name: "성물 관리인",
    title: "성서와 구마 도구를 다룰 수 있다.",
    focus: ["exorcism", "divine", "suspicion"],
    passiveId: "measured-salt",
  },
  {
    id: "sword-bearer",
    name: "검사",
    title: "위험 앞에서 직접 검을 든다.",
    focus: ["execution", "knight", "life"],
    passiveId: "first-strike",
  },
  {
    id: "irregular-alchemist",
    name: "연금술사",
    title: "정해진 방법보다 빠른 길을 찾는다.",
    focus: ["shortcut", "trade", "suspicion"],
    passiveId: "deferred-cost",
  },
  {
    id: "unmarked-lord",
    name: "초임 영주",
    title: "아직 뚜렷한 특기가 없다.",
    focus: [],
    passiveId: "empty-seat",
  },
];

export const TITLES = [
  {
    id: "accepted-lord",
    name: "첫날을 넘긴 자",
    description: "첫날 밤을 마치고 저택으로 돌아왔다.",
  },
  {
    id: "hesitant",
    name: "망설인 자",
    description: "결정을 세 번 미뤘다.",
  },
  {
    id: "remembered-worker",
    name: "이름을 기억한 자",
    description: "사라진 잡부의 이름을 기억했다.",
  },
  {
    id: "barehand-survivor",
    name: "맨손으로 돌아온 자",
    description: "아무것도 들지 않고 지하에서 돌아왔다.",
  },
];

export const MARK_LOADOUT_LIMIT = 10;

export const MARK_BRANCH_UNLOCKS = [
  { id: "purification-hint", label: "정화 의식 단서", condition: { stigma: 3 } },
  { id: "guardian-vow", label: "방어/보존 분기", condition: { stigma: 10 } },
  { id: "white-rite", label: "낙인 정화 의식", condition: { stigma: 25 } },
  { id: "guardian-branch", label: "보루 분기", condition: { stigma: 50 } },
  { id: "pale-vow", label: "백색 경고", condition: { stigma: 75 } },
  { id: "true-normal-gate", label: "정상 축 심화 분기", condition: { stigma: 100 } },
  { id: "defilement-hint", label: "훼손 의식 단서", condition: { brand: 3 } },
  { id: "black-bargain", label: "악성 거래 분기", condition: { brand: 10 } },
  { id: "slaughter-threshold", label: "몰살 진입 분기", condition: { brand: 25 } },
  { id: "massacre-branch", label: "학살 분기", condition: { brand: 50 } },
  { id: "black-crown", label: "심연 분기", condition: { brand: 75 } },
  { id: "altered-crown-gate", label: "변질 축 심화 분기", condition: { brand: 100 } },
  { id: "observer-ledger", label: "관측부 기록", condition: { stigma: 50, brand: 50 } },
  { id: "closed-codex", label: "도감 폐쇄 조건", condition: { stigma: 100, brand: 100 } },
  { id: "complete-codex", label: "도감 완결", condition: { total: 200 } },
];

export const AFFINITY_MARK_GROUPS = [
  {
    affinity: "life",
    capstoneCount: 3,
    branch: { stigma: "warmth-rite", brand: "cold-hand-rite" },
    stigma: [
      { name: "따뜻한화로의 성흔", tier: "base" },
      { name: "빵부스러기의 성흔", tier: "neutral" },
      { name: "손바닥온기의 성흔", tier: "capstone" },
    ],
    brand: [
      { name: "식은화로의 낙인", tier: "base" },
      { name: "굶주린식탁의 낙인", tier: "neutral" },
      { name: "차가운손의 낙인", tier: "capstone" },
    ],
  },
  {
    affinity: "record",
    capstoneCount: 6,
    branch: { stigma: "ledger-preserved", brand: "ledger-blackened" },
    stigma: [
      { name: "봉인장부의 성흔", tier: "base" },
      { name: "증언초의 성흔", tier: "neutral" },
      { name: "잉크눈물의 성흔", tier: "capstone" },
    ],
    brand: [
      { name: "찢긴장부의 낙인", tier: "base" },
      { name: "허위증언의 낙인", tier: "neutral" },
      { name: "검은잉크의 낙인", tier: "capstone" },
    ],
  },
  {
    affinity: "knight",
    capstoneCount: 10,
    branch: { stigma: "watchman-bell", brand: "blood-watchman" },
    stigma: [
      { name: "백철검의 성흔", tier: "base" },
      { name: "방패기도의 성흔", tier: "neutral" },
      { name: "파수종의 성흔", tier: "capstone" },
    ],
    brand: [
      { name: "녹슨맹세의 낙인", tier: "base" },
      { name: "도망친방패의 낙인", tier: "neutral" },
      { name: "피묻은파수의 낙인", tier: "capstone" },
    ],
  },
  {
    affinity: "trade",
    capstoneCount: 10,
    branch: { stigma: "fair-bargain", brand: "sold-name" },
    stigma: [
      { name: "은계약의 성흔", tier: "base" },
      { name: "저울기도의 성흔", tier: "neutral" },
      { name: "선의상인의 성흔", tier: "capstone" },
    ],
    brand: [
      { name: "부정계약의 낙인", tier: "base" },
      { name: "깨진저울의 낙인", tier: "neutral" },
      { name: "매매된이름의 낙인", tier: "capstone" },
    ],
  },
  {
    affinity: "mansion",
    capstoneCount: 15,
    branch: { stigma: "empty-room-key", brand: "open-empty-room" },
    stigma: [
      { name: "문지방빛의 성흔", tier: "base" },
      { name: "회랑나침의 성흔", tier: "neutral" },
      { name: "빈방열쇠의 성흔", tier: "capstone" },
    ],
    brand: [
      { name: "뒤집힌문패의 낙인", tier: "base" },
      { name: "굶주린회랑의 낙인", tier: "neutral" },
      { name: "열린빈방의 낙인", tier: "capstone" },
    ],
  },
  {
    affinity: "shortcut",
    capstoneCount: 15,
    branch: { stigma: "ash-letter", brand: "false-letter" },
    stigma: [
      { name: "가는실의 성흔", tier: "base" },
      { name: "숨은문고리의 성흔", tier: "neutral" },
      { name: "잿빛편지의 성흔", tier: "capstone" },
    ],
    brand: [
      { name: "끊어진실의 낙인", tier: "base" },
      { name: "없는문고리의 낙인", tier: "neutral" },
      { name: "거짓편지의 낙인", tier: "capstone" },
    ],
  },
  {
    affinity: "exorcism",
    capstoneCount: 20,
    branch: { stigma: "incense-ward", brand: "black-incense" },
    stigma: [
      { name: "소금원의 성흔", tier: "base" },
      { name: "종말기도의 성흔", tier: "neutral" },
      { name: "향연기의 성흔", tier: "capstone" },
    ],
    brand: [
      { name: "더러운소금의 낙인", tier: "base" },
      { name: "역기도의 낙인", tier: "neutral" },
      { name: "검은향연기의 낙인", tier: "capstone" },
    ],
  },
  {
    affinity: "execution",
    capstoneCount: 20,
    branch: { stigma: "silent-axe", brand: "laughing-axe" },
    stigma: [
      { name: "참수선의 성흔", tier: "base" },
      { name: "마지막명령의 성흔", tier: "neutral" },
      { name: "무음도끼의 성흔", tier: "capstone" },
    ],
    brand: [
      { name: "빗나간칼날의 낙인", tier: "base" },
      { name: "무고한명령의 낙인", tier: "neutral" },
      { name: "웃는도끼의 낙인", tier: "capstone" },
    ],
  },
  {
    affinity: "divine",
    capstoneCount: 25,
    branch: { stigma: "absolution-lance", brand: "banished-lance" },
    stigma: [
      { name: "새벽성배의 성흔", tier: "base" },
      { name: "흰촛농의 성흔", tier: "neutral" },
      { name: "면죄창의 성흔", tier: "capstone" },
    ],
    brand: [
      { name: "깨진성배의 낙인", tier: "base" },
      { name: "검은촛농의 낙인", tier: "neutral" },
      { name: "추방된창의 낙인", tier: "capstone" },
    ],
  },
  {
    affinity: "suspicion",
    capstoneCount: 30,
    branch: { stigma: "doubting-eye", brand: "unclosing-eye" },
    stigma: [
      { name: "갈라진거울의 성흔", tier: "base" },
      { name: "발자국의 성흔", tier: "neutral" },
      { name: "의심하는눈의 성흔", tier: "capstone" },
    ],
    brand: [
      { name: "눈먼거울의 낙인", tier: "base" },
      { name: "지워진발자국의 낙인", tier: "neutral" },
      { name: "감지않는눈의 낙인", tier: "capstone" },
    ],
  },
];

function createMarkEffect(affinity, tier = "base") {
  const statKey = TRAIT_STAT_KEYS[affinity];
  const isCapstone = tier === "capstone";
  if (tier === "neutral") {
    return {
      carryEffect: { chance: isCapstone ? 1.2 : 0.7 },
      equipEffect: { chance: isCapstone ? 4 : 2 },
    };
  }
  return {
    carryEffect: {
      stat: { key: statKey, value: isCapstone ? 0.5 : 0.25 },
      chance: isCapstone ? 1.1 : 0.5,
    },
    equipEffect: {
      stat: { key: statKey, value: isCapstone ? 1.4 : 0.8 },
      chance: isCapstone ? 6 : 3,
    },
  };
}

function createMark(group, kind, index, entry) {
  const markEntry = entry ?? {};
  const tier = markEntry.tier || (index === 2 ? "capstone" : index === 1 ? "neutral" : "base");
  const isCapstone = tier === "capstone";
  const neutral = tier === "neutral";
  const effects = createMarkEffect(group.affinity, tier);
  const tags = [
    `affinity:${group.affinity}`,
    `kind:${kind}`,
    `tier:${tier}`,
    neutral ? "polarity:neutral" : "polarity:route",
  ];
  const obtainConditions = isCapstone ? [{ kind: "markCountMin", key: kind, value: group.capstoneCount }] : [];
  return {
    id: `${kind}-${group.affinity}-${index + 1}`,
    kind,
    category: "affinity",
    affinity: group.affinity,
    name: markEntry.name ?? group[kind]?.[index] ?? `${group.affinity}-${kind}-${index + 1}`,
    tier,
    polarity: neutral ? "neutral" : "route",
    tags,
    description: `${TRAIT_META[group.affinity].label} 선택에 반응한다. ${neutral ? "중립 효과는 루트 반전에 흔들리지 않는다." : "루트가 뒤집히면 이득과 손해가 반전된다."}`,
    obtainConditions,
    unlockCondition: isCapstone ? { kind, count: group.capstoneCount } : null,
    branchUnlocks: isCapstone ? [group.branch[kind]] : [],
    ...effects,
  };
}

export const STANDALONE_MARKS = [
  {
    id: "stigma-standalone-first-bell",
    kind: "stigma",
    category: "standalone",
    affinity: null,
    name: "첫 종소리의 성흔",
    tier: "base",
    polarity: "neutral",
    tags: ["standalone", "origin:sample", "kind:stigma"],
    description: "첫 번째 종소리가 남긴 성흔입니다.",
    carryEffect: { chance: 0.7 },
    equipEffect: { chance: 2 },
    unlockCondition: null,
    branchUnlocks: [],
  },
  {
    id: "stigma-standalone-closed-door",
    kind: "stigma",
    category: "standalone",
    affinity: null,
    name: "닫힌 문 앞의 성흔",
    tier: "base",
    polarity: "neutral",
    tags: ["standalone", "origin:sample", "kind:stigma"],
    description: "닫힌 문 앞에 남은 성흔입니다.",
    carryEffect: { chance: 0.7 },
    equipEffect: { chance: 2 },
    unlockCondition: null,
    branchUnlocks: [],
  },
  {
    id: "stigma-standalone-granted-funeral",
    kind: "stigma",
    category: "standalone",
    affinity: null,
    name: "장례를 허락받은 자의 성흔",
    tier: "base",
    polarity: "neutral",
    tags: ["standalone", "origin:sample", "kind:stigma"],
    description: "허락된 장례의 표식입니다.",
    carryEffect: { chance: 0.7 },
    equipEffect: { chance: 2 },
    unlockCondition: null,
    branchUnlocks: [],
  },
  {
    id: "brand-standalone-broken-bell",
    kind: "brand",
    category: "standalone",
    affinity: null,
    name: "끊긴 종소리의 낙인",
    tier: "base",
    polarity: "neutral",
    tags: ["standalone", "origin:sample", "kind:brand"],
    description: "끊어버린 종소리의 낙인입니다.",
    carryEffect: { chance: 0.7 },
    equipEffect: { chance: 2 },
    unlockCondition: null,
    branchUnlocks: [],
  },
  {
    id: "brand-standalone-open-door",
    kind: "brand",
    category: "standalone",
    affinity: null,
    name: "열린 문 뒤의 낙인",
    tier: "base",
    polarity: "neutral",
    tags: ["standalone", "origin:sample", "kind:brand"],
    description: "열린 문 뒤편의 낙인입니다.",
    carryEffect: { chance: 0.7 },
    equipEffect: { chance: 2 },
    unlockCondition: null,
    branchUnlocks: [],
  },
  {
    id: "brand-standalone-stolen-funeral",
    kind: "brand",
    category: "standalone",
    affinity: null,
    name: "장례를 빼앗은 자의 낙인",
    tier: "base",
    polarity: "neutral",
    tags: ["standalone", "origin:sample", "kind:brand"],
    description: "장례를 빼앗아 얻은 낙인입니다.",
    carryEffect: { chance: 0.7 },
    equipEffect: { chance: 2 },
    unlockCondition: null,
    branchUnlocks: [],
  },
];

export const MARKS = [
  ...AFFINITY_MARK_GROUPS.flatMap((group) => [
    ...group.stigma.map((entry, index) => createMark(group, "stigma", index, entry)),
    ...group.brand.map((entry, index) => createMark(group, "brand", index, entry)),
  ]),
  ...STANDALONE_MARKS,
];

export const LEGACY_STIGMA_MARK_MAP = {
  "rose-thorn": "stigma-life-1",
  nameless: "brand-record-1",
  burnt: "brand-mansion-1",
  underground: "stigma-mansion-1",
  rosary: "stigma-divine-1",
  sheath: "stigma-knight-1",
  "funeral-bell": "stigma-record-1",
  "black-key": "brand-shortcut-1",
};

export function getMark(markId) {
  return MARKS.find((mark) => mark.id === markId);
}

export function getMarkCounts(markIds = []) {
  return markIds.reduce((counts, markId) => {
    const mark = getMark(markId);
    if (!mark) return counts;
    counts.total += 1;
    counts[mark.kind] += 1;
    if (mark.affinity != null) {
      counts.affinity[mark.affinity] = (counts.affinity[mark.affinity] ?? 0) + 1;
    }
    return counts;
  }, { total: 0, stigma: 0, brand: 0, affinity: {} });
}

function asNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function hasKeyedConditionValue(condition, keys = ["key", "id", "route", "routeId", "eventId", "markKind", "branchId"]) {
  for (const key of keys) {
    if (condition[key] != null) return condition[key];
  }
  return null;
}

function hasValueCondition(condition, fallback = "value") {
  if (condition[fallback] != null) return condition[fallback];
  if (condition.min != null) return condition.min;
  if (condition.count != null) return condition.count;
  if (condition.threshold != null) return condition.threshold;
  return null;
}

function getUnlockedBranchConditionMet(condition, unlocks) {
  const branch = hasKeyedConditionValue(condition, ["branch", "branchId", "id"]);
  if (!branch) return false;
  return (unlocks ?? []).includes(branch);
}

function getMarkCountConditionMet(condition, markCounts) {
  const key = hasKeyedConditionValue(condition, ["key", "markKind", "kind"]);
  if (!key) return false;
  const value = asNumber(hasValueCondition(condition, "value"));
  return (markCounts[key] ?? 0) >= value;
}

export function isMarkConditionMet(condition, game = {}, meta = {}, options = {}) {
  if (!condition || typeof condition !== "object") return true;
  const kind = condition.kind;
  const gameStats = game.stats ?? {};
  const gameTraits = game.traits ?? {};
  const gameResources = game.resources ?? {};
  const gameEstate = game.estate ?? {};
  const eventSeen = new Set([...(game.eventSeen ?? []), ...(game.meta?.eventSeen ?? [])].filter(Boolean));
  const gameEndings = { ...(meta?.endingRecords ?? {}), ...(game.meta?.endingRecords ?? {}) };
  const unlockedBranches = new Set([...(meta?.unlockedBranchKeys ?? []), ...(game.meta?.unlockedBranchKeys ?? []), ...getUnlockedBranchKeys(game.meta?.ownedMarkIds ?? [], game)]);

  switch (kind) {
    case "statMin": {
      const key = hasKeyedConditionValue(condition);
      const value = asNumber(hasValueCondition(condition));
      return asNumber(gameStats[key]) >= value;
    }
    case "statMax": {
      const key = hasKeyedConditionValue(condition);
      const value = asNumber(hasValueCondition(condition));
      return asNumber(gameStats[key]) <= value;
    }
    case "traitMin": {
      const key = hasKeyedConditionValue(condition);
      const value = asNumber(hasValueCondition(condition));
      return asNumber(gameTraits[key]) >= value;
    }
    case "traitMax": {
      const key = hasKeyedConditionValue(condition);
      const value = asNumber(hasValueCondition(condition));
      return asNumber(gameTraits[key]) <= value;
    }
    case "resourceMin": {
      const key = hasKeyedConditionValue(condition);
      const value = asNumber(hasValueCondition(condition));
      return asNumber(gameResources[key]) >= value;
    }
    case "resourceMax": {
      const key = hasKeyedConditionValue(condition);
      const value = asNumber(hasValueCondition(condition));
      return asNumber(gameResources[key]) <= value;
    }
    case "estateMin": {
      const key = hasKeyedConditionValue(condition);
      const value = asNumber(hasValueCondition(condition));
      return asNumber(gameEstate[key]) >= value;
    }
    case "estateMax": {
      const key = hasKeyedConditionValue(condition);
      const value = asNumber(hasValueCondition(condition));
      return asNumber(gameEstate[key]) <= value;
    }
    case "eventSeen": {
      const eventId = hasKeyedConditionValue(condition);
      return eventSeen.has(eventId);
    }
    case "judgmentMet": {
      const judgmentId = hasKeyedConditionValue(condition);
      return Boolean(game.meta?.judgments?.[judgmentId] ?? game.truthFlags?.[judgmentId]);
    }
    case "endingSeen": {
      const endingId = hasKeyedConditionValue(condition);
      if (!endingId) return false;
      if (gameEndings[endingId]) return true;
      return Object.values(gameEndings).some((record) => record?.endingId === endingId || record?.id === endingId);
    }
    case "cycleMin": {
      const value = asNumber(hasValueCondition(condition));
      return asNumber(meta?.cycle ?? game.meta?.cycle ?? game.cycle) >= value;
    }
    case "routeIs": {
      const route = (hasKeyedConditionValue(condition, ["route", "key"]) ?? "").toString();
      return (game.route ?? meta?.route ?? null) === route;
    }
    case "routeNot": {
      const route = (hasKeyedConditionValue(condition, ["route", "key"]) ?? "").toString();
      return (game.route ?? meta?.route ?? null) !== route;
    }
    case "markCountMin": {
      const markCounts = getMarkCounts(meta?.ownedMarkIds ?? options?.markIds ?? []);
      return getMarkCountConditionMet(condition, markCounts);
    }
    case "branchUnlocked": {
      return getUnlockedBranchConditionMet(condition, [...unlockedBranches]);
    }
    case "antiCheatStatMax": {
      const key = hasKeyedConditionValue(condition);
      const value = asNumber(hasValueCondition(condition));
      return asNumber(gameStats[key]) <= value;
    }
    case "markCount":
      return getMarkCountConditionMet(condition, getMarkCounts(meta?.ownedMarkIds ?? options?.markIds ?? []));
    default:
      return false;
  }
}

export function isMarkObtainable(mark, game = {}, meta = {}) {
  if (!mark) return false;
  const rawConditions = mark.obtainConditions;
  const conditions = Array.isArray(rawConditions) ? rawConditions : (Array.isArray(rawConditions?.conditions) ? rawConditions.conditions : []);
  if (!conditions.length) return true;
  const mode = (rawConditions?.mode ?? "all").toString();
  const resolvedMeta = { ...meta, ...(game.meta ?? {}) };
  const evaluate = (condition) => isMarkConditionMet(condition, game, resolvedMeta, { markIds: resolvedMeta?.ownedMarkIds ?? [] });
  if (mode === "any") return conditions.some(evaluate);
  return conditions.every(evaluate);
}

export function getUnlockedBranchKeys(markIds = []) {
  const counts = getMarkCounts(markIds);
  const countUnlocks = MARK_BRANCH_UNLOCKS
    .filter((unlock) => Object.entries(unlock.condition).every(([key, value]) => {
      if (key === "total") return counts.total >= value;
      return (counts[key] ?? 0) >= value;
    }))
    .map((unlock) => unlock.id);
  const markUnlocks = markIds
    .map((markId) => getMark(markId))
    .flatMap((mark) => mark?.branchUnlocks ?? []);
  return [...new Set([...countUnlocks, ...markUnlocks])];
}

export function isMarkCollectionUnlocked(mark, markIds = []) {
  if (!mark?.unlockCondition) return true;
  const counts = getMarkCounts(markIds);
  const targetKind = mark.unlockCondition.kind === "total" ? "total" : mark.unlockCondition.kind;
  const currentValue = (counts[targetKind] ?? 0) - (markIds.includes(mark.id) && (mark.kind === targetKind || targetKind === "total") ? 1 : 0);
  const required = asNumber(mark.unlockCondition.count ?? mark.unlockCondition.value);
  return currentValue >= required;
}

export function isMarkCollectionUnlockedForCandidate(mark, markIds = []) {
  if (!mark?.unlockCondition) return true;
  const counts = getMarkCounts(markIds);
  const targetKind = mark.unlockCondition.kind === "total" ? "total" : mark.unlockCondition.kind;
  const currentValue = (counts[targetKind] ?? 0) + (markIds.includes(mark.id) ? -1 : 1);
  const required = asNumber(mark.unlockCondition.count ?? mark.unlockCondition.value);
  return currentValue >= required;
}

export const PASSIVES = [
  {
    id: "careful-stockpile",
    name: "비축 관리",
    description: "식량 또는 은화 손실을 1 줄인다.",
    rule: "reduce-economic-loss",
  },
  {
    id: "quiet-footsteps",
    name: "익숙한 동선",
    description: "저택 관련 선택 뒤 이상 징후 증가를 1 줄인다.",
    rule: "reduce-mansion-corruption",
  },
  {
    id: "measured-salt",
    name: "소금 절약",
    description: "축성된 소금 소모를 1 줄인다.",
    rule: "reduce-salt-loss",
  },
  {
    id: "first-strike",
    name: "선제 대응",
    description: "위험 선택의 공포 증가를 1 줄인다.",
    rule: "reduce-danger-fear",
  },
  {
    id: "deferred-cost",
    name: "외상 거래",
    description: "은화 손실을 줄이는 대신 저택의 이상 징후가 늘어난다.",
    rule: "silver-to-corruption",
  },
  {
    id: "common-memory",
    name: "주민과의 교류",
    description: "생활 선택이 주민 신뢰를 1 더 높인다.",
    rule: "boost-life-trust",
  },
  {
    id: "ledger-margin",
    name: "꼼꼼한 장부",
    description: "기록 관련 선택 뒤 장부 상태가 1 더 좋아진다.",
    rule: "boost-record-integrity",
  },
  {
    id: "empty-seat",
    name: "결정 유예",
    description: "포기 패널티의 영지 안정도 손실을 1 줄인다.",
    rule: "reduce-forfeit-stability",
  },
];

export const HIDDEN_RUN_RULES = {
  flaw: [
    "지워진 이름은 우물 근처에서 다시 들린다.",
    "비어 있는 방은 밤마다 하나씩 늘어난다.",
    "저택은 사람보다 그 사람이 맡은 일을 먼저 기억한다.",
    "기록되지 않은 손실은 영주의 몫으로 돌아온다.",
  ],
  taboo: [
    "밤에는 영주의 이름으로 문을 열면 안 된다.",
    "지하에서 먼저 질문한 자는 마지막 답을 잃는다.",
    "소금 선 안에서 이름을 세 번 부르면 안 된다.",
    "사라진 사람의 자리를 즉시 채우면 안 된다.",
  ],
  abundance: ["food", "timber", "silver", "salt"],
  scarcity: ["food", "timber", "silver", "salt"],
};
