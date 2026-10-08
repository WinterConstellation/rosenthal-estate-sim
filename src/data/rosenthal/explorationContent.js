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
