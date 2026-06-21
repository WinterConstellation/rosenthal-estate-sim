// 시스템 표시명, 효과 순서, 성향/공포 메타데이터의 수정 원본.
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
