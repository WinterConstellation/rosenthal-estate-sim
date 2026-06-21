export const DAY_CATEGORIES = [
  { id: "gathering", label: "자원 채집" },
  { id: "interaction", label: "NPC 상호작용" },
  { id: "investigation", label: "조사" },
  { id: "training", label: "수련" },
  { id: "rest", label: "휴식" },
  { id: "other", label: "기타" },
];

const DANGEROUS_DAY_ACTION_TONES = {
  "old-quarry": "danger",
  "sealed-room": "danger",
  "summoning-trace": "extreme",
  "night-spar": "danger",
  overwork: "danger",
  "burn-ledger": "extreme",
};

const getDayTone = (id, balance, extra) => (
  extra.tone ?? DANGEROUS_DAY_ACTION_TONES[id] ?? (["loss", "loss-heavy"].includes(balance) ? "warning" : "neutral")
);

const day = (category, id, title, result, effects, balance, extra = {}) => ({
  id, category, title, result, effects, balance, tone: getDayTone(id, balance, extra), ...extra,
});

export const DAY_ACTIONS = [
  day("gathering", "fields", "남쪽 밭의 수확을 돕는다", "해가 기울 무렵 곡물 자루가 창고로 들어온다.", { resources: { food: 6 }, stats: { stamina: -2 } }, "gain", { firstDaySafe: true }),
  day("gathering", "forest", "북쪽 숲에서 목재를 모은다", "곧은 나무만 골라 베었다. 숲 안쪽에서 도끼질을 따라 하는 소리가 났다.", { resources: { timber: 6 }, stats: { stamina: -3 }, resourcesExtra: { fear: 1 } }, "gain-heavy"),
  day("gathering", "salt-store", "축성 소금 창고를 정리한다", "바닥에 쏟긴 소금은 검은 줄을 따라 굳어 있었다.", { resources: { salt: 4, silver: -1 }, estate: { corruption: -1 } }, "gain-heavy"),
  day("gathering", "old-quarry", "폐채석장의 은맥을 확인한다", "은은 나왔지만 작업자 한 명이 자기 그림자를 밟지 않으려 했다.", { resources: { silver: 8 }, stats: { health: -2, stamina: -3 }, resourcesExtra: { fear: 2 } }, "loss-heavy"),
  day("gathering", "spoiled-grain", "썩은 곡물까지 선별한다", "건질 수 있는 것은 거의 없었다. 손에는 냄새만 남았다.", { resources: { food: 1 }, stats: { health: -2, stamina: -3 } }, "loss"),

  day("interaction", "maid-tea", "메이드와 차를 마신다", "메이드는 차를 세 번 따랐다. 세 번째 잔은 아무도 마시지 않았다.", { estate: { trust: 3 }, stats: { charm: 1, stamina: -1 } }, "gain", { npcId: "maid", firstDaySafe: true }),
  day("interaction", "scribe-ledger", "서기관과 장부를 맞춘다", "마지막 일곱 장은 날짜만 있고 내용이 비어 있다.", { estate: { recordIntegrity: 4 }, stats: { insight: 1, stamina: -2 } }, "gain-heavy", { npcId: "scribe" }),
  day("interaction", "knight-rounds", "기사의 순찰에 동행한다", "기사는 매주 새 영주에게 같은 길을 보여준다고 말했다가 입을 다문다.", { estate: { stability: 4, trust: 1 }, stats: { stamina: -3 } }, "gain-heavy", { npcId: "knight" }),
  day("interaction", "priest-prayer", "사제에게 축복을 부탁한다", "기도 끝에 사제는 당신이 아닌 다른 이름을 불렀다.", { stats: { faith: 2 }, resources: { faith: 3 }, estate: { corruption: 1 } }, "gain-heavy", { npcId: "priest" }),
  day("interaction", "alchemist-talk", "연금술사의 작업실을 찾는다", "연금술사는 당신이 온 시각을 적고, 왜 왔는지는 묻지 않았다.", { stats: { insight: 2, faith: -1, stamina: -2 }, estate: { corruption: 2 } }, "loss-heavy", { npcId: "alchemist", flag: "metAlchemist" }),

  day("investigation", "seven-ledgers", "이전 영주의 장부를 조사한다", "모든 장부는 일곱째 날에서 끝난다. 여덟째 장은 뜯긴 것이 아니라 처음부터 없었다.", { stats: { insight: 3, stamina: -2 }, estate: { recordIntegrity: 3, corruption: 1 } }, "gain-heavy", { firstDaySafe: true }),
  day("investigation", "basement-map", "지하 구조도를 대조한다", "지도마다 계단의 수가 달랐다.", { stats: { insight: 2, stamina: -2 }, estate: { corruption: 2 } }, "loss-heavy"),
  day("investigation", "welcome-portraits", "역대 영주의 초상화를 살핀다", "얼굴은 모두 다르지만 액자의 흠집은 같은 자리에 있다.", { stats: { insight: 2 }, resources: { fear: 2 }, estate: { recordIntegrity: 1 } }, "loss-heavy"),
  day("investigation", "summoning-trace", "작업실 바닥의 흔적을 조사한다", "지워진 원의 중심은 침실이 아니라 당신이 처음 눈을 뜬 자리였다.", { stats: { insight: 4, faith: -2, stamina: -3 }, estate: { corruption: 3 } }, "loss-heavy", { requiresFlag: "metAlchemist" }),
  day("investigation", "sealed-room", "봉인된 방의 문을 연다", "방 안에는 아무것도 없었다. 문을 닫자 안에서 잠금쇠가 걸렸다.", { resources: { fear: 4 }, stats: { health: -1, stamina: -3 }, estate: { corruption: 4 } }, "loss"),

  day("training", "sword-drill", "기사와 검술을 수련한다", "기사는 당신의 자세를 고쳐주고, 지하에서는 같은 자세를 쓰지 말라고 했다.", { stats: { health: 1, resolve: 2, stamina: -4 } }, "gain-heavy", { npcId: "knight" }),
  day("training", "breathing", "호흡과 보법을 익힌다", "숨을 고르는 동안 복도 끝의 발소리도 함께 멎었다.", { stats: { resolve: 2, stamina: -2 }, resources: { fear: -1 } }, "gain", { firstDaySafe: true }),
  day("training", "salt-practice", "축성 소금 사용법을 배운다", "사제는 원을 닫는 방법보다 열지 않는 방법을 먼저 가르쳤다.", { stats: { faith: 2, stamina: -3 }, resources: { salt: -2 }, estate: { corruption: -1 } }, "gain-heavy", { npcId: "priest" }),
  day("training", "night-spar", "해가 진 뒤까지 훈련한다", "실력은 늘었다. 다만 어둠 속에서 누군가 계속 박수를 쳤다.", { stats: { resolve: 3, health: -2, stamina: -5 }, resources: { fear: 3 } }, "loss-heavy"),
  day("training", "overwork", "쓰러질 때까지 몸을 단련한다", "몸은 기억했지만, 일어날 힘은 남지 않았다.", { stats: { resolve: 1, health: -4, stamina: -6 } }, "loss"),

  day("rest", "long-sleep", "오래 잠든다", "꿈을 꾸지 않았다. 잠든 동안 누가 침대 곁에 있었는지는 모른다.", { stats: { health: 3, stamina: 5 }, estate: { trust: -1 } }, "gain-heavy"),
  day("rest", "garden-walk", "정원을 천천히 걷는다", "정원사는 매주 같은 꽃이 한 송이씩 줄어든다고 말했다.", { stats: { health: 1, insight: 1, stamina: 2 }, resources: { fear: -1 } }, "gain", { firstDaySafe: true }),
  day("rest", "chapel-rest", "예배실에서 눈을 붙인다", "눈을 뜨자 무릎 위에 다른 사람의 묵주가 놓여 있었다.", { stats: { health: 2, faith: 2, stamina: 4 }, resources: { fear: 2 }, estate: { corruption: 1 } }, "loss-heavy"),
  day("rest", "banquet", "주민들과 늦은 식사를 한다", "모두가 당신을 환영했다. 빈 의자 네 개에도 식사가 놓였다.", { estate: { trust: 4 }, resources: { food: -6, fear: 2 }, stats: { health: 1, stamina: 2, charm: 1 } }, "loss-heavy"),
  day("rest", "locked-bedroom", "침실 문을 잠그고 나오지 않는다", "아무 일도 하지 않았고, 아무것도 나아지지 않았다.", { estate: { stability: -3, trust: -3 }, stats: { health: 1, stamina: 3 } }, "loss"),

  day("other", "write-letter", "원래 세계에 편지를 쓴다", "주소를 적을 수 없었다. 그래도 봉투는 밤이 되기 전에 사라졌다.", { stats: { insight: 1, charm: 1 }, estate: { recordIntegrity: 2 } }, "gain"),
  day("other", "ring-bell", "정오의 종을 직접 울린다", "종소리 뒤에 한 번 더, 지하에서 같은 소리가 올라왔다.", { estate: { stability: 3, corruption: 2 }, resources: { fear: 2 }, stats: { stamina: -2 } }, "loss-heavy"),
  day("other", "hold-audience", "주민들의 청원을 받는다", "사소한 부탁을 해결하자 사람들은 진심으로 안도했다.", { estate: { trust: 5, stability: 2 }, stats: { charm: 1, stamina: -4 }, resources: { silver: -3 } }, "gain-heavy", { firstDaySafe: true }),
  day("other", "count-rooms", "저택의 방 수를 직접 센다", "마지막에 센 수는 시작할 때보다 하나 많았다.", { stats: { insight: 2, stamina: -3 }, resources: { fear: 3 }, estate: { corruption: 3 } }, "loss-heavy"),
  day("other", "burn-ledger", "비어 있는 장부 한 권을 태운다", "불길 속에서 적혀 있지 않던 이름들이 잠깐 보였다.", { estate: { recordIntegrity: -6, corruption: 4, trust: -2 }, resources: { fear: 4 } }, "loss"),
];
