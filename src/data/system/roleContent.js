// 직업, 칭호, 패시브 텍스트의 수정 원본.
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
