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

export const SEED_BENEFIT_RULES = [
  { id: "gathering-boon", trigger: { kind: "category", value: "gathering" }, modifier: { kind: "beneficial", multiplier: 1.1 }, text: "자원 채집의 이로운 변화 x1.1" },
  { id: "interaction-boon", trigger: { kind: "category", value: "interaction" }, modifier: { kind: "beneficial", multiplier: 1.1 }, text: "NPC 상호작용의 이로운 변화 x1.1" },
  { id: "investigation-boon", trigger: { kind: "category", value: "investigation" }, modifier: { kind: "beneficial", multiplier: 1.1 }, text: "조사의 이로운 변화 x1.1" },
  { id: "training-boon", trigger: { kind: "category", value: "training" }, modifier: { kind: "beneficial", multiplier: 1.1 }, text: "수련의 이로운 변화 x1.1" },
  { id: "rest-boon", trigger: { kind: "category", value: "rest" }, modifier: { kind: "beneficial", multiplier: 1.1 }, text: "휴식의 이로운 변화 x1.1" },
  { id: "other-boon", trigger: { kind: "category", value: "other" }, modifier: { kind: "beneficial", multiplier: 1.1 }, text: "기타 행동의 이로운 변화 x1.1" },
  { id: "day-success-boon", trigger: { kind: "phase-result", phase: "day", success: true }, modifier: { kind: "beneficial", multiplier: 1.1 }, text: "낮 행동 성공의 이로운 변화 x1.1" },
  { id: "night-success-boon", trigger: { kind: "night-result", success: true }, modifier: { kind: "beneficial", multiplier: 1.1 }, text: "밤·특수 사건 성공의 이로운 변화 x1.1" },
  { id: "danger-success-boon", trigger: { kind: "danger-result", success: true }, modifier: { kind: "harmful", multiplier: 0.9 }, text: "위험 선택 성공의 해로운 변화 x0.9" },
  { id: "pressure-boon", trigger: { kind: "chance-pressure" }, modifier: { kind: "chance-pressure", multiplier: 0.9 }, text: "공포·이상 징후의 성공률 압박 x0.9" },
];

export const SEED_BURDEN_RULES = [
  { id: "day-failure-burden", trigger: { kind: "phase-result", phase: "day", success: false }, modifier: { kind: "harmful", multiplier: 0.9 }, text: "낮 행동 실패의 해로운 변화 x0.9" },
  { id: "night-failure-burden", trigger: { kind: "night-result", success: false }, modifier: { kind: "harmful", multiplier: 0.9 }, text: "밤·특수 사건 실패의 해로운 변화 x0.9" },
  { id: "danger-chance-burden", trigger: { kind: "danger-choice" }, modifier: { kind: "final-chance", multiplier: 0.9 }, text: "위험·극단·치명 선택의 성공률 x0.9" },
  { id: "stamina-loss-burden", trigger: { kind: "negative-delta", group: "stats", key: "stamina" }, modifier: { kind: "specific-harmful", group: "stats", key: "stamina", multiplier: 0.9 }, text: "스태미나 손실 x0.9" },
  { id: "health-loss-burden", trigger: { kind: "negative-delta", group: "stats", key: "health" }, modifier: { kind: "specific-harmful", group: "stats", key: "health", multiplier: 0.9 }, text: "체력 손실 x0.9" },
  { id: "forfeit-burden", trigger: { kind: "forfeit" }, modifier: { kind: "harmful", multiplier: 0.9 }, text: "포기·탐사 귀환의 해로운 변화 x0.9" },
];

export function getSeedGrowthMultipliers(seed) {
  if (seed?.growthMultipliers) return { ...seed.growthMultipliers };
  return {};
}

function cloneSeedRule(rule) {
  if (!rule) return null;
  return { ...rule, trigger: { ...rule.trigger }, modifier: { ...rule.modifier } };
}

export function getSeedTrait(seed) {
  if (seed?.trait) return {
    benefit: cloneSeedRule(seed.trait.benefit),
    burden: cloneSeedRule(seed.trait.burden),
  };
  return null;
}

export const SAINT_SEEDS = RAW_SEEDS.map(([name, symbol, category], index) => {
  const benefit = SEED_BENEFIT_RULES[index % SEED_BENEFIT_RULES.length];
  const burden = SEED_BURDEN_RULES[Math.floor(index / SEED_BENEFIT_RULES.length)];
  const trait = { benefit, burden };
  return {
    id: index,
    name,
    symbol,
    category,
    eventGroupId: Math.floor(index / 5),
    boon: { group: null, key: null, amount: 0 },
    burden: { group: null, key: null, amount: 0 },
    growthMultipliers: {},
    trait,
    ruleText: `${benefit.text} · ${burden.text}`,
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
