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

export const CORE_NPCS = [
  { id: "maid", label: "메이드", name: "샤를로트", relation: "저택의 열쇠를 관리한다." },
  { id: "scribe", label: "서기관", name: "*미정*", relation: "일곱째 날까지의 장부를 쓴다." },
  { id: "knight", label: "기사", name: "리오넬", relation: "매주 새 영주를 지하로 호위한다." },
  { id: "priest", label: "사제", name: "*미정*", relation: "다른 이름이 섞인 축복을 올린다." },
  { id: "worker", label: "잡부", name: "*미정*", relation: "저택과 마을의 고장 난 곳을 고친다." },
  { id: "alchemist", label: "연금술사", name: "*미정*", relation: "당신을 로젠탈로 불렀다." },
];

export const UNNAMED_COMPANIONS = [
  { id: "guard-father", label: "경비병", name: "마르틴", reveal: "두 아이의 아버지였다.", keepsake: "닳은 나무 피리" },
  { id: "porter-mother", label: "운반인", name: "엘리제", reveal: "노모와 어린 딸을 돌보던 사람이었다.", keepsake: "붉은 실로 묶은 열쇠" },
  { id: "young-groom", label: "징집병", name: "요한", reveal: "사흘 뒤 결혼을 앞둔 새신랑이었다.", keepsake: "완성되지 않은 혼인 서약서" },
  { id: "mill-worker", label: "제분소 일꾼", name: "마르타", reveal: "동료들의 빚을 대신 갚고 있었다.", keepsake: "밀가루가 밴 동전 주머니" },
];

export const DIRECTIONS = [
  { id: "stairs", label: "계단", text: "사람의 발걸음과 생활 흔적이 아래로 이어진다.", focus: "resolve" },
  { id: "archive", label: "문서고", text: "기록되지 않은 장부와 먼저 쓰인 결과가 쌓여 있다.", focus: "insight" },
  { id: "waterway", label: "수로", text: "차가운 물과 유품이 지상보다 먼저 흘러온다.", focus: "health" },
  { id: "chapel", label: "폐예배실", text: "기도를 올리면 동행자의 목소리가 먼저 답한다.", focus: "faith" },
];

const EVENT_TITLES = {
  stairs: ["아래에서 올라오는 발자국", "한 칸이 모자란 계단", "벽을 향한 문", "돌아온 작업 장갑", "같은 층의 두 번째 입구", "불이 켜진 하인방", "난간에 묶인 머리끈", "기다리는 식탁", "이름을 묻는 문지기", "계단 아래의 낮"],
  archive: ["아직 쓰이지 않은 보고서", "검게 지워진 여덟째 날짜", "젖은 장부", "당신의 서명", "두 사람 몫의 출입 기록", "빈 인명부", "거꾸로 읽히는 편지", "소실된 페이지의 그림자", "먼저 도착한 유언", "다음 회차의 장부"],
  waterway: ["상류에서 흐르는 반지", "물속의 종소리", "마른 시체의 발자국", "물을 거슬러 오는 등불", "잠긴 수문", "이름을 삼키는 물", "젖지 않은 유품", "수면 아래의 창문", "거꾸로 흐르는 피", "얕아진 귀환로"],
  chapel: ["동행자의 목소리", "빈 고해소", "꺼지지 않는 제단초", "다른 이름의 축복", "기도를 따라 하는 벽", "무릎 꿇은 그림자", "성가가 끝나지 않는 방", "소금 원 안의 발자국", "대답을 요구하는 종", "누구도 모시지 않는 제단"],
};

export const EXPLORATION_EVENTS = Object.entries(EVENT_TITLES).flatMap(([directionId, titles]) =>
  titles.map((title, index) => ({
    id: `${directionId}-${index + 1}`,
    directionId,
    title,
    text: `${title} 앞에서 길이 둘로 갈라진다. 동행자는 먼저 움직이지 않고 당신의 결정을 기다린다.`,
    specialLoss: index === 8,
    options: [
      {
        id: "inspect",
        label: "가까이 다가가 확인한다",
        chance: 0.58 + (index % 3) * 0.08,
        success: { stats: { insight: 1, stamina: -1 }, estate: { recordIntegrity: 1 } },
        failure: { stats: { health: -1, stamina: -2 }, resources: { fear: 2 }, estate: { corruption: 1 } },
      },
      {
        id: "secure",
        label: "동행자와 길을 확보하며 지나간다",
        chance: 1,
        requiresHealthyCompanion: true,
        success: { stats: { resolve: 1, stamina: -1 }, estate: { stability: 1 } },
        failure: { stats: { health: -1, stamina: -2 }, resources: { fear: 1 } },
      },
    ],
  })),
);

const finale = (id, directionId, kind, title, text, sacrifice = false) => ({
  id, directionId, kind, title, text, sacrifice,
  options: kind === "combat"
    ? [
      { id: "vital", label: "약점을 찾는다", chance: 0.4, preview: "성공률 40% · 성공 시 피해 없음", success: { stats: { resolve: 2 } }, failure: { stats: { health: -5, stamina: -3 }, resources: { fear: 4 } }, lossRisk: true },
      { id: "steady", label: "상처를 감수하고 밀어붙인다", chance: 1, preview: "성공률 100% · 체력 -3 · 스태미나 -2", success: { stats: { health: -3, stamina: -2, resolve: 1 } } },
    ]
    : [
      { id: "solve", label: "규칙을 풀어 문을 연다", chance: 0.52, preview: "성공률 52% · 스태미나 -2", success: { stats: { insight: 2, stamina: -2 }, estate: { recordIntegrity: 2 } }, failure: { stats: { stamina: -5 }, estate: { corruption: 3 }, resources: { fear: 3 } }, lossRisk: true },
      { id: "force", label: "대가를 지불하고 답을 고정한다", chance: 1, preview: "성공률 100% · 은화 -4 · 축성 소금 -2", success: { resources: { silver: -4, salt: -2 }, estate: { stability: 1 } } },
    ],
});

export const FINALES = [
  finale("stair-hound", "stairs", "combat", "문 없는 층의 사냥개", "계단을 지키는 것은 짐승처럼 보이지만, 발소리는 사람의 것이다.", true),
  finale("stair-armor", "stairs", "combat", "돌아오지 않은 호위", "낡은 갑옷이 귀환로를 막고 있다.", false),
  finale("stair-table", "stairs", "puzzle", "일곱 자리가 놓인 식탁", "한 자리를 비우지 않으면 문이 열리지 않는다.", true),
  finale("archive-verdict", "archive", "puzzle", "먼저 쓰인 판결문", "결과가 원인보다 먼저 적혀 있다.", false),
  finale("archive-clerk", "archive", "combat", "얼굴 없는 서기", "서기는 동행자의 이름을 장부에서 떼어내려 한다.", true),
  finale("archive-eighth", "archive", "puzzle", "여덟째 장", "존재하지 않는 날짜에 무엇을 기록할지 묻는다.", false),
  finale("waterway-mouth", "waterway", "combat", "물을 마시는 입", "수로 전체가 하나의 입처럼 닫히기 시작한다.", true),
  finale("waterway-gate", "waterway", "puzzle", "세 개의 수문", "하나는 사람을, 하나는 유품을, 하나는 물만 돌려보낸다.", false),
  finale("waterway-drowned", "waterway", "combat", "젖지 않은 익사자", "익사자는 살아 있는 동행자에게 손을 내민다.", true),
  finale("chapel-choir", "chapel", "combat", "목소리만 남은 성가대", "노래가 끝나기 전에 목소리의 주인을 찾아야 한다.", false),
  finale("chapel-confession", "chapel", "puzzle", "두 사람을 위한 고해소", "한 사람만 죄를 고백하면 둘 다 나갈 수 있다고 적혀 있다.", true),
  finale("chapel-bell", "chapel", "puzzle", "대답하는 종", "종은 질문마다 동행자의 목소리로 답한다.", false),
];

export const PROLOGUE = [
  "천장은 높고, 커튼 사이로 들어온 햇빛이 따스하다.",
  "…….",
  "이곳이 내가 살던 세계와는 전혀 다른 곳이라는 사실을 깨닫기까지는, 그리 오랜 시간이 걸리지 않았다.",
  "…….",
  "나는 분명…….",
  "무언가 떠오르려 할 때, 단정한 복장의 메이드가 들어와 고개를 숙인다.",
  "가지런히 모은 손 등에 흉터가 많았고, 허리에는 사용감이 많은 검을 차고 있었다.",
  "“좋은 아침입니다, 영주님.”",
  "당신은 이 세계의 언어도, 저택의 구조도, 영지의 법도 모른다.",
  "그런데도 말은 들린다. 길은 익숙하며, 쌓인 서류들은 당신의 결재를 기다린다.",
  "모든 사람이 친절하다. 당신이 아무것도 모른다는 사실을, 아무도 의심하지 않는다.",
  "…….",
  "…….",
  "…….",
  "어째서?",
];

export const NIGHT_OPENING = [
  "저택 지하에서 문 두드리는 소리가 들렸습니다.",
  "자, 시간이 되었습니다.",
  "가실까요, 영주님.",
];

export const DAY_EIGHT_SCRIPTS = {
  normal: [
    "여덟째 날의 해가 떠올랐다.",
    "종은 평소와 같은 시각에 울리지 않았다. 서기관은 날짜를 적고도 한동안 펜을 놓지 못했다.",
    "로젠탈 사람들은 처음으로 맞는 아침처럼 서로의 얼굴을 바라보았다.",
  ],
  altered: [
    "여덟째 날의 해가 떠오르기 전에 지하의 문이 열렸다.",
    "밤마다 아래에 남아 있던 것들이 마을 광장으로 올라와 무릎을 꿇었다.",
    "사람들은 문을 잠갔다. 지하의 존재들은 당신을 영주라 불렀다.",
  ],
};
