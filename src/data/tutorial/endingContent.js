// 튜토리얼 엔딩과 포기 결과의 텍스트 수정 원본.

export const ENDINGS = {
  peacefulLord: {
    tag: "엔딩 · 닫힌 지하실",
    title: "정식 영주",
    subtitle: "당신은 이 영지에서 살아가는 방법을 배웠다.",
    paragraphs: [
      "일곱 번째 밤에도 당신은 지하로 내려가지 않았다. 문 두드리는 소리는 새벽이 오기 전에 스스로 멎었다.",
      "그동안 장부는 한 번도 바닥나지 않았고, 영지의 어느 항목도 영 아래로 떨어지지 않았다. 사람들은 당신의 결정을 신중함이라 불렀고, 마침내 정식 영주로 인정했다.",
      "당신이라면 이 영지의 비밀을 풀어헤치지 않고도 살아갈 방법을 알고 있다. 닫힌 문은 열지 않고, 들리지 말아야 할 소리는 듣지 않은 채, 사람들에게 필요한 결정을 내리면 된다.",
      "그렇게 오래도록 평화롭게 살 수 있을지도 모른다.",
      "……그렇지만, 그게 정답인지는 모른다.",
    ],
  },
};

export const WORKER_NAME_CHOICES = [
  {
    id: "remember-worker",
    title: "기억한다",
    tone: "neutral",
    traits: { life: 3, record: 2 },
    stats: { insight: 1 },
    estate: { trust: 2, recordIntegrity: 2 },
    result: "당신은 그 이름을 말한다. 아무도 대답하지 않지만, 이름은 사라지지 않는다.",
  },
  {
    id: "forget-worker",
    title: "기억하지 못한다",
    tone: "neutral",
    traits: { execution: 2, suspicion: 1 },
    stats: { resolve: 1 },
    estate: { trust: -3, recordIntegrity: -2 },
    result: "당신은 대답하지 못한다. 메이드는 더 묻지 않는다.",
  },
];

export const FORFEIT_RESULTS = {
  day: "결정을 미루는 동안 다른 사람들이 대신 정했다. 당신의 의자만 비어 있었다.",
  night: "아무도 고르지 못한 채 계단 앞에 오래 서 있었다. 아침이 되자 손목에 검은 자국이 생겨 있었다.",
};
