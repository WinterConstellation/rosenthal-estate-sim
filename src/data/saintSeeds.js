const RAW_SEEDS = [
  ["성 미카엘의 달", "보호와 전투", "training"],
  ["성 가브리엘의 달", "전갈과 기록", "investigation"],
  ["성 라파엘의 달", "여행과 치유", "rest"],
  ["성 요셉의 달", "노동과 가정", "gathering"],
  ["성 베드로의 달", "열쇠와 책임", "other"],
  ["성 바오로의 달", "회심과 여정", "training"],
  ["성 요한의 달", "증언과 사랑", "interaction"],
  ["성 마태오의 달", "장부와 부름", "investigation"],
  ["성 마르코의 달", "용기와 기록", "training"],
  ["성 루카의 달", "치유와 기록", "rest"],
  ["성 안드레아의 달", "그물과 부름", "gathering"],
  ["성 야고보의 달", "순례와 인내", "training"],
  ["성 토마스의 달", "의심과 확인", "investigation"],
  ["성 필립보의 달", "질문과 인도", "interaction"],
  ["성 바르톨로메오의 달", "인내와 상처", "training"],
  ["성 시몬의 달", "열정과 결속", "interaction"],
  ["성 유다 타대오의 달", "절망 속 희망", "other"],
  ["성 스테파노의 달", "증언과 순교", "other"],
  ["성 로렌시오의 달", "가난한 이의 보물", "gathering"],
  ["성 프란치스코의 달", "가난과 평화", "rest"],
  ["성 도미니코의 달", "설교와 진실", "investigation"],
  ["성 베네딕토의 달", "규율과 노동", "gathering"],
  ["성 아우구스티노의 달", "고백과 탐구", "investigation"],
  ["성 토마스 아퀴나스의 달", "이성과 신앙", "investigation"],
  ["성 이냐시오의 달", "식별과 훈련", "training"],
  ["성 프란치스코 하비에르의 달", "선교와 항해", "other"],
  ["성 빈첸시오 드 폴의 달", "구호와 봉사", "interaction"],
  ["성 요한 보스코의 달", "교육과 보호", "interaction"],
  ["성 막시밀리아노 콜베의 달", "대속과 결단", "other"],
  ["성 비오의 달", "상흔과 고해", "rest"],
  ["성녀 아가타의 달", "불과 견딤", "training"],
  ["성녀 아녜스의 달", "순결과 용기", "other"],
  ["성녀 루치아의 달", "빛과 시야", "investigation"],
  ["성녀 체칠리아의 달", "노래와 조화", "interaction"],
  ["성녀 가타리나의 달", "논박과 지혜", "investigation"],
  ["성녀 클라라의 달", "가난과 맑음", "rest"],
  ["성녀 아빌라의 데레사의 달", "기도와 개혁", "training"],
  ["성녀 소화 데레사의 달", "작은 일과 신뢰", "interaction"],
  ["성녀 파우스티나의 달", "자비와 기록", "interaction"],
  ["성녀 리타의 달", "불가능한 화해", "other"],
  ["성녀 모니카의 달", "기다림과 기도", "rest"],
  ["성녀 헬레나의 달", "발견과 유물", "investigation"],
  ["성녀 엘리사벳의 달", "환대와 돌봄", "interaction"],
  ["성녀 마리아 막달레나의 달", "증언과 귀환", "investigation"],
  ["성녀 잔다르크의 달", "깃발과 결단", "training"],
  ["성녀 비르지타의 달", "환시와 기록", "investigation"],
  ["성녀 힐데가르트의 달", "치유와 자연", "gathering"],
  ["성녀 젬마 갈가니의 달", "상흔과 인내", "rest"],
  ["성녀 페르페투아의 달", "감옥과 기록", "other"],
  ["성녀 펠리치타의 달", "출산과 용기", "other"],
  ["성녀 바르바라의 달", "탑과 번개", "training"],
  ["성녀 로사 데 리마의 달", "장미와 절제", "rest"],
  ["성녀 안나의 달", "가정과 돌봄", "interaction"],
  ["성녀 마르타의 달", "환대와 노동", "gathering"],
  ["성 알폰소 마리아 데 리구오리의 달", "윤리와 자비", "investigation"],
  ["성 카를로 보로메오의 달", "개혁과 책임", "other"],
  ["성녀 베르나데트 수비루의 달", "샘과 증언", "interaction"],
  ["성녀 에디트 슈타인의 달", "철학과 순교", "investigation"],
  ["성녀 마르그리트 마리 알라코크의 달", "심장과 헌신", "rest"],
  ["성녀 카타리나 드렉셀의 달", "교육과 봉사", "interaction"],
];

export const SAINT_SEEDS = RAW_SEEDS.map(([name, symbol, category], index) => {
  const statBenefits = [
    ["stats", "health", "체력"],
    ["stats", "insight", "통찰"],
    ["stats", "resolve", "결단"],
    ["stats", "charm", "매력"],
    ["stats", "faith", "신앙"],
    ["stats", "stamina", "스태미나"],
  ];
  const benefitIndex = index % statBenefits.length;
  const burdenOffset = (Math.floor(index / statBenefits.length) % (statBenefits.length - 1)) + 1;
  const benefit = statBenefits[benefitIndex];
  const burden = statBenefits[(benefitIndex + burdenOffset) % statBenefits.length];
  const boonAmount = 1 + Math.floor(index / 30);
  const burdenAmount = 1;
  return {
    id: index,
    name,
    symbol,
    category,
    eventGroupId: Math.floor(index / 5),
    boon: { group: benefit[0], key: benefit[1], amount: boonAmount },
    burden: { group: burden[0], key: burden[1], amount: -burdenAmount },
    ruleText: `${benefit[2]} +${boonAmount} · ${burden[2]} -${burdenAmount}`,
  };
});

export function categoryLabel(category) {
  return {
    gathering: "자원 채집",
    interaction: "NPC 상호작용",
    investigation: "조사",
    training: "수련",
    rest: "휴식",
    other: "기타",
  }[category] ?? category;
}

export function getSaintSeed(second) {
  return SAINT_SEEDS[Math.max(0, Math.min(Number(second) || 0, 59))];
}
