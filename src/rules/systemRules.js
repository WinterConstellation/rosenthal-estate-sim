export const EFFECT_ORDER = [
  "trait",
  "job",
  "title",
  "stigma-prefix",
  "stigma-suffix",
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

export const STIGMA_PREFIXES = [
  {
    id: "rose-thorn",
    name: "장미가시의",
    description: "다치면 발동한다.",
    trigger: "physical-damage",
  },
  {
    id: "nameless",
    name: "망자의",
    description: "사람이 사라지면 발동한다.",
    trigger: "target-lost",
  },
  {
    id: "burnt",
    name: "그을린",
    description: "물건이 망가지거나 사라지면 발동한다.",
    trigger: "item-lost",
  },
  {
    id: "underground",
    name: "지하의",
    description: "밤의 선택이 끝나면 발동한다.",
    trigger: "night-cost",
  },
];

export const STIGMA_SUFFIXES = [
  {
    id: "rosary",
    name: "로자리오",
    description: "다음 턴 신성 +2.",
    effect: { nextTurn: { divine: 2 } },
  },
  {
    id: "sheath",
    name: "검집",
    description: "다음 육체 피해를 2 줄인다.",
    effect: { guard: 2 },
  },
  {
    id: "funeral-bell",
    name: "장례식의 종",
    description: "공포를 2 낮추고 사라진 대상을 기록한다.",
    effect: { resources: { fear: -2 }, estate: { recordIntegrity: 2 } },
  },
  {
    id: "black-key",
    name: "검은 열쇠",
    description: "저택의 이상 징후가 늘지만 잠긴 선택지가 나오기 쉬워진다.",
    effect: { estate: { corruption: 2 }, unlockPressure: 2 },
  },
];

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
