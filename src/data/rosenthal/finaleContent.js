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
