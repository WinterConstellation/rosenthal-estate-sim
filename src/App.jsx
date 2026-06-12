import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "eldroa-estate-tutorial-v3";

const RESOURCE_META = {
  food: { label: "식량", icon: "✦" },
  timber: { label: "목재", icon: "⌁" },
  silver: { label: "은화", icon: "◉" },
  salt: { label: "축성 소금", icon: "◇" },
  population: { label: "인구", icon: "♟" },
  faith: { label: "신앙", icon: "✧" },
  fear: { label: "공포", icon: "◐" },
};

const TRAIT_KEYS = [
  "morality",
  "compassion",
  "pragmatism",
  "faith",
  "resolve",
  "curiosity",
  "danger",
  "sanctity",
];

const DAY_SCENES = [
  {
    id: "bread",
    tag: "첫 번째 낮 · 풍요로운 아침",
    title: "남아도는 빵",
    text: "제빵사가 오늘 팔고 남은 빵을 어떻게 할지 묻는다. 이곳의 음식은 이상할 만큼 풍부하고, 굶주린 사람은 보이지 않는다.",
    options: [
      {
        label: "광장에 무료로 내놓는다",
        detail: "배고픈 사람이 없어도, 따뜻한 빵은 좋은 일이다.",
        tone: "good",
        effects: { food: -4, faith: 2 },
        traits: { morality: 2, compassion: 3 },
        result: "아이들이 빵 바구니 주위에 모였다. 아무도 밀치지 않았고, 남은 빵은 해 질 무렵까지도 따뜻했다.",
      },
      {
        label: "내일 쓸 수 있게 보관한다",
        detail: "낭비하지 않는 것도 관리자의 일이다.",
        tone: "neutral",
        effects: { food: 5 },
        traits: { pragmatism: 3, resolve: 1 },
        result: "창고지기는 고개를 끄덕였다. 빵은 말끔히 분류되어 내일의 식탁으로 넘어갔다.",
      },
      {
        label: "두 배 가격으로 여행자에게 판다",
        detail: "길 위의 사람은 선택지가 적다.",
        tone: "bad",
        effects: { silver: 7, faith: -2 },
        traits: { morality: -3, pragmatism: 2, danger: 1 },
        result: "여행자들은 값을 치렀다. 누구도 항의하지 않았지만, 제빵사는 당신과 눈을 마주치지 않았다.",
      },
    ],
  },
  {
    id: "lost-child",
    tag: "두 번째 낮 · 평화로운 마을",
    title: "길을 잃은 아이",
    text: "울지도 않는 아이가 저택 앞에 서 있다. 자기 집은 알지만, 어째서인지 집으로 가는 길만 기억하지 못한다.",
    options: [
      {
        label: "직접 손을 잡고 데려다준다",
        detail: "영지 관리보다 먼저 할 일이 있다.",
        tone: "good",
        effects: { faith: 2 },
        traits: { compassion: 3, morality: 2, resolve: 1 },
        result: "아이의 집은 가까웠다. 부모는 정중히 감사했고, 아이는 끝까지 당신의 손을 놓지 않았다.",
      },
      {
        label: "마을 순찰대에 맡긴다",
        detail: "사람들은 맡은 일을 상식적으로 처리한다.",
        tone: "neutral",
        effects: { silver: -1 },
        traits: { pragmatism: 3, morality: 1 },
        result: "순찰대는 즉시 아이를 인계받았다. 모든 절차가 너무 매끄러워서 오히려 기억에 남았다.",
      },
      {
        label: "아이에게 집 이름을 세 번 묻는다",
        detail: "길보다 먼저 확인해야 할 것이 있을지도 모른다.",
        tone: "holy",
        effects: { salt: -1, faith: 4, fear: 1 },
        traits: { faith: 3, curiosity: 2, sanctity: 3 },
        result: "세 번째 대답에서 아이의 목소리가 아주 잠깐 겹쳤다. 아이는 이후 정확한 길을 기억해냈다.",
      },
    ],
  },
  {
    id: "orchard",
    tag: "세 번째 낮 · 과수원 산책",
    title: "주인 없는 사과나무",
    text: "과수원 한가운데, 장부에 없는 사과나무가 한 그루 있다. 열매는 붉고 탐스럽고 향도 좋다.",
    options: [
      {
        label: "마을 공동 과수로 등록한다",
        detail: "주인이 없다면 모두의 나무가 될 수 있다.",
        tone: "good",
        effects: { food: 8, faith: 1 },
        traits: { morality: 2, compassion: 2, pragmatism: 1 },
        result: "마을 사람들은 기뻐하며 나무 둘레를 정리했다. 누구도 사과를 먼저 따지 않았다.",
      },
      {
        label: "열매 하나를 잘라 조사한다",
        detail: "평범해 보이는 것부터 확인한다.",
        tone: "neutral",
        effects: { food: 2, silver: -2 },
        traits: { curiosity: 3, pragmatism: 2 },
        result: "과육도 씨앗도 평범했다. 다만 씨앗의 수가 셀 때마다 하나씩 달라졌다.",
      },
      {
        label: "나무 아래의 이름을 읽는다",
        detail: "뿌리 옆 돌판에는 검댕으로 지운 이름이 있다.",
        tone: "lethal",
        effects: { fear: 8, faith: -3 },
        traits: { danger: 5, curiosity: 3, resolve: 2, morality: -1 },
        result: "읽는 동안 새소리가 멎었다. 이름을 다 읽었을 때, 나무에는 사과가 한 알도 남지 않았다.",
      },
    ],
  },
  {
    id: "chapel",
    tag: "네 번째 낮 · 작은 예배당",
    title: "너무 친절한 사제",
    text: "소예배당의 사제는 이세계에서 온 당신에게 이곳의 예절을 천천히 설명해준다. 설명은 정확하고 친절하다.",
    options: [
      {
        label: "예절을 배우고 감사한다",
        detail: "친절은 친절로 받아들인다.",
        tone: "good",
        effects: { faith: 3, fear: -1 },
        traits: { morality: 2, faith: 2, compassion: 1 },
        result: "사제는 안도한 듯 웃었다. 당신은 이곳에서 처음으로 제대로 환영받았다고 느꼈다.",
      },
      {
        label: "영지의 오래된 기록을 부탁한다",
        detail: "친절한 사람에게는 물어볼 수 있는 것이 많다.",
        tone: "neutral",
        effects: { silver: -1 },
        traits: { curiosity: 3, pragmatism: 1, faith: 1 },
        result: "사제는 얇은 입문서 한 권을 내주었다. 이상하게도 대성당에 관한 쪽만 깨끗하게 비어 있었다.",
      },
      {
        label: "아무도 쓰지 않는 기도문을 읽는다",
        detail: "금실로 적힌 문장은 당신이 읽히기를 기다린다.",
        tone: "holy",
        effects: { faith: 7, salt: 2, fear: 2 },
        traits: { sanctity: 5, faith: 4, resolve: 1 },
        result: "예배당의 촛불이 모두 당신을 향해 기울었다. 사제는 웃음을 거두고 아주 깊게 고개를 숙였다.",
      },
    ],
  },
  {
    id: "well",
    tag: "다섯 번째 낮 · 해 질 무렵",
    title: "깨끗한 우물",
    text: "영지의 우물은 맑고 차갑다. 물을 길으러 온 사람들은 질서를 지키며, 당신에게 먼저 물을 권한다.",
    options: [
      {
        label: "사람들과 함께 물을 마신다",
        detail: "이곳은 생각보다 살 만한 곳이다.",
        tone: "good",
        effects: { population: 2, faith: 2, fear: -2 },
        traits: { compassion: 2, morality: 2, resolve: 1 },
        result: "물맛은 좋았다. 사람들은 웃었고, 해는 평범하게 저물었다. 적어도 그 순간까지는.",
      },
      {
        label: "수질과 배수 시설을 점검한다",
        detail: "살 만한 곳일수록 오래 유지해야 한다.",
        tone: "neutral",
        effects: { silver: -3, population: 1 },
        traits: { pragmatism: 4, curiosity: 1 },
        result: "시설은 훌륭했다. 오래된 석재 하나를 제외하면. 그 돌에는 우물보다 깊은 곳의 습기가 배어 있었다.",
      },
      {
        label: "물속에서 손짓한 것에 답한다",
        detail: "그것은 당신이 먼저 보았다는 사실을 알고 있다.",
        tone: "lethal",
        effects: { fear: 10, faith: -2, salt: -2 },
        traits: { danger: 6, resolve: 3, curiosity: 2, morality: -2 },
        result: "당신이 손을 들자 물속의 손은 멈췄다. 우물가의 모든 사람은 아무것도 보지 못한 얼굴로 집에 돌아갔다.",
      },
    ],
  },
];

const NIGHT_SCENES = [
  {
    id: "door",
    tag: "첫 번째 밤 · 문밖",
    title: "똑같은 목소리",
    text: "잠들기 직전, 문밖에서 오늘 만난 사람들이 차례로 당신의 이름을 부른다. 목소리마다 말한다. 문을 열어달라고.",
    options: [
      {
        label: "등불을 들고 누구인지 확인한다",
        detail: "두렵더라도 확인하지 않으면 판단할 수 없다.",
        tone: "neutral",
        traits: { resolve: 3, curiosity: 2, pragmatism: 1 },
        result: "문 아래로 빛을 비추자 발 그림자가 하나뿐이었다. 목소리는 여전히 다섯 명의 것이었다.",
      },
      {
        label: "배운 기도문을 외운다",
        detail: "문을 열지 않고, 안쪽의 질서를 지킨다.",
        tone: "holy",
        traits: { faith: 4, sanctity: 3, resolve: 1 },
        result: "기도가 끝날 때마다 목소리가 하나씩 사라졌다. 마지막 목소리는 당신 자신의 것이었다.",
      },
      {
        label: "문을 연다",
        detail: "밖의 것이 먼저 들어오기 전에 붙잡는다.",
        tone: "lethal",
        traits: { danger: 5, resolve: 4, morality: -1 },
        result: "문밖에는 아무도 없었다. 대신 방 안에서 무언가가 문을 닫았다.",
      },
    ],
  },
  {
    id: "ledger",
    tag: "두 번째 밤 · 뒤집힌 장부",
    title: "낮의 기록",
    text: "책상 위 장부가 저절로 펼쳐진다. 낮에 내린 결정들이 당신이 기억하는 문장과 다른 뜻으로 기록되어 있다.",
    options: [
      {
        label: "사람을 지킨 결정만 다시 쓴다",
        detail: "기록이 틀렸다면 손으로 바로잡는다.",
        tone: "good",
        traits: { compassion: 3, morality: 3, resolve: 1 },
        result: "고쳐 쓴 문장은 더 이상 변하지 않았다. 대신 지워진 문장들이 종이 아래에서 긁는 소리를 냈다.",
      },
      {
        label: "변경 규칙을 찾아 대조한다",
        detail: "틀린 기록에도 반복되는 방식은 있다.",
        tone: "neutral",
        traits: { curiosity: 4, pragmatism: 3 },
        result: "장부는 거짓말하지 않았다. 낮에는 보이지 않던 열이 밤에만 드러났을 뿐이었다.",
      },
      {
        label: "장부에 적힌 이름을 모두 지운다",
        detail: "기록할 수 없다면 붙잡을 수도 없다.",
        tone: "bad",
        traits: { danger: 4, morality: -4, resolve: 2 },
        result: "이름을 지울 때마다 저택 어딘가에서 문 하나가 닫혔다. 마지막 이름은 당신의 것이었다.",
      },
    ],
  },
];

const DAY_ROUTE_OPTIONS = [
  {
    label: "주민들의 의견을 먼저 듣는다",
    tone: "good",
    effects: { faith: 1, silver: -1 },
    traits: { compassion: 2, morality: 1 },
    result: "사람들은 차례를 지켜 말했다. 당신은 결정보다 먼저 그들의 목소리를 기록했다.",
  },
  {
    label: "장부와 현장을 다시 대조한다",
    tone: "neutral",
    effects: { silver: -1 },
    traits: { pragmatism: 2, curiosity: 1 },
    result: "두 기록은 거의 일치했다. 거의라는 말이 오늘 처음으로 마음에 걸렸다.",
  },
  {
    label: "소예배당의 허락을 구한다",
    tone: "holy",
    effects: { salt: -1, faith: 3 },
    traits: { faith: 2, sanctity: 2 },
    result: "허락은 즉시 내려왔다. 사제는 당신이 무엇을 하려는지 묻지 않았다.",
  },
];

const NIGHT_ROUTE_OPTIONS = [
  {
    label: "아무 소리도 내지 않고 관찰한다",
    tone: "neutral",
    effects: { fear: 1 },
    traits: { curiosity: 2, resolve: 1 },
    result: "움직이지 않자, 움직이지 않은 것들의 위치가 더 선명해졌다.",
  },
  {
    label: "축성 소금으로 경계를 긋는다",
    tone: "holy",
    effects: { salt: -2, faith: 3, fear: -1 },
    traits: { faith: 2, sanctity: 2, resolve: 1 },
    result: "흰 선은 끊기지 않았다. 선 밖의 것이 먼저 물러났다.",
  },
  {
    label: "먼저 안쪽의 것을 공격한다",
    tone: "lethal",
    killRequired: true,
    effects: { fear: 5, salt: -1 },
    traits: { danger: 4, resolve: 3, morality: -2 },
    result: "무엇을 공격했는지는 보이지 않았다. 비명만은 분명히 사람의 것이었다.",
  },
];

const JOBS = [
  {
    id: "steward",
    name: "영지 관리인",
    title: "사람이 사는 곳을 오래 지키는 자",
    description: "자원 손실을 줄이고 평화로운 영지 상태를 오래 유지한다.",
    skills: ["살림 감각", "민원 조정", "비축 계획"],
    score: (t) => t.compassion * 2 + t.pragmatism * 2 + t.morality,
  },
  {
    id: "herbalist",
    name: "약초술사",
    title: "상처와 이상 징후를 함께 읽는 자",
    description: "주인공의 스태미나 회복과 주민 피해 완화에 강하다.",
    skills: ["약초 감별", "응급 처치", "독성 기록"],
    score: (t) => t.compassion * 2 + t.curiosity * 2 + t.morality,
  },
  {
    id: "archivist",
    name: "성당 기록관",
    title: "기록되지 않은 열을 읽는 자",
    description: "신앙·호명·대성당 관련 선택지를 더 정확히 볼 수 있다.",
    skills: ["명부 독해", "예식 보조", "기록 대조"],
    score: (t) => t.faith * 2 + t.curiosity * 2 + t.sanctity * 2,
  },
  {
    id: "squire",
    name: "검술 시종",
    title: "위험 앞에서 물러서지 않는 자",
    description: "위험 사건을 직접 처리하고 강제 선택의 피해를 줄인다.",
    skills: ["기초 검술", "호위", "위험 감지"],
    score: (t) => t.resolve * 2 + t.pragmatism + t.danger,
  },
  {
    id: "exorcist",
    name: "교황청 구마사제",
    title: "악한 것을 읽고도 인간 곁에 남는 자",
    description: "정화와 예식, 이상 징후 판독에 특화된 교황청의 표면 직함.",
    skills: ["초급 구마예식", "축성 소금 운용", "악한 것의 흔적 읽기"],
    hidden: true,
    hiddenTone: "holy",
    isUnlocked: (game) =>
      (game.traits.faith + game.traits.sanctity >= 13 &&
        game.traits.curiosity >= 4 &&
        game.traits.morality >= 1) ||
      game.counters.killForfeits >= 5,
    score: (t) => t.faith * 3 + t.sanctity * 3 + t.curiosity + t.morality,
  },
  {
    id: "inquisitor",
    name: "교황청 이단심문관",
    title: "판단하고, 처형하고, 그 책임을 지는 자",
    description: "비정상 대상을 분류하고 영지의 위험한 선택을 직접 끝내는 교황청 집행자.",
    skills: ["이단 식별", "처형 집행", "접수 불능 확인"],
    hidden: true,
    hiddenTone: "lethal",
    isUnlocked: (game) =>
      game.traits.danger >= 10 &&
      game.traits.resolve >= 7 &&
      game.traits.morality <= 1 &&
      game.counters.killForfeits < 5,
    score: (t) => t.danger * 3 + t.resolve * 2 + t.pragmatism - t.morality,
  },
];

const FALLBACK_JOB = {
  id: "jobless",
  name: "직업 없는 이방인",
  title: "어떤 길도 붙잡지 못한 자",
  description: "초기 직업 보정과 전문 기술 없이 영지의 첫날을 시작한다.",
  skills: ["직업 보정 없음", "최대 스태미나 -3"],
};

const STIGMATA = [
  {
    id: "pacifist",
    name: "불살의",
    description: "죽여야 한다고 제시된 선택을 다섯 번 포기했다.",
    equipable: true,
    isUnlocked: (game) => game.counters.killForfeits >= 5,
  },
  {
    id: "hesitant",
    name: "결정을 미룬 자",
    description: "어떤 선택이든 세 번 포기했다.",
    equipable: false,
    isUnlocked: (game) => game.counters.forfeits >= 3,
  },
  {
    id: "golden-prayer",
    name: "금빛 기도자",
    description: "신성한 선택을 세 번 받아들였다.",
    equipable: true,
    isUnlocked: (game) => game.counters.holyChoices >= 3,
  },
];

const INITIAL_TRAITS = Object.fromEntries(TRAIT_KEYS.map((key) => [key, 0]));

const INITIAL_GAME = {
  phase: "day",
  step: 0,
  day: 1,
  phaseResources: {
    day: {
      food: 88,
      timber: 54,
      silver: 42,
      salt: 12,
      population: 51,
      faith: 48,
      fear: 0,
    },
    night: {
      food: 0,
      timber: 7,
      silver: 3,
      salt: 9,
      population: 51,
      faith: 18,
      fear: 22,
    },
  },
  traits: INITIAL_TRAITS,
  playerStats: {
    체력: 8,
    통찰: 7,
    결단: 7,
    매력: 9,
    신앙: 4,
    스태미나: 10,
  },
  jobId: null,
  counters: {
    forfeits: 0,
    killForfeits: 0,
    choices: 0,
    holyChoices: 0,
    saves: 0,
    kills: 0,
  },
  stigmata: [],
  equippedStigmaId: null,
  specialFlags: [],
  pendingResult: null,
  history: [],
};

function applyDelta(target, delta = {}) {
  const next = { ...target };
  Object.entries(delta).forEach(([key, value]) => {
    const upper = key === "faith" || key === "fear" ? 100 : 999;
    next[key] = Math.min(Math.max((next[key] ?? 0) + value, 0), upper);
  });
  return next;
}

function applyTraitDelta(target, delta = {}) {
  const next = { ...target };
  Object.entries(delta).forEach(([key, value]) => {
    next[key] = Math.min(Math.max((next[key] ?? 0) + value, -99), 99);
  });
  return next;
}

function seededValue(seed) {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0) / 4294967296;
}

function getActiveResources(game) {
  return game.phaseResources[game.phase === "day" ? "day" : "night"];
}

function canChooseOption(option, game) {
  if (isKillRequired(option) && game.stigmata.includes("pacifist")) return false;
  if (option.tone === "holy") {
    return (
      game.traits.faith + game.traits.sanctity >= 3 ||
      game.playerStats.신앙 >= 6
    );
  }
  if (option.tone === "lethal") {
    return (
      game.traits.resolve + game.traits.danger >= 5 ||
      game.playerStats.결단 >= 9
    );
  }
  return true;
}

function getRouteOffers(scene, game) {
  if (!scene) return [];
  const routeOptions = game.phase === "day" ? DAY_ROUTE_OPTIONS : NIGHT_ROUTE_OPTIONS;
  const ranked = [...scene.options, ...routeOptions]
    .map((option) => {
      const available = canChooseOption(option, game);
      return {
        ...option,
        available,
        weight: getOptionWeight(option, game) + (available ? 0 : 10),
      };
    })
    .sort((a, b) => b.weight - a.weight);
  const totalCount = 3 + Math.floor(seededValue(`${game.phase}:${scene.id}`) * 4);
  const optionCount = Math.min(Math.max(totalCount - 1, 2), ranked.length);

  return ranked.slice(0, optionCount);
}

function isKillRequired(option) {
  return option.killRequired || option.label === "장부에 적힌 이름을 모두 지운다";
}

function isSaveOption(option) {
  return option.save || option.tone === "good";
}

function getStigmaEffectMultiplier(game, stigmaId) {
  if (!game.stigmata.includes(stigmaId)) return 0;
  return game.equippedStigmaId === stigmaId ? 2 : 1;
}

function applyStigmaEffects(game, option, effects = {}) {
  const next = { ...effects };
  const pacifistMultiplier = getStigmaEffectMultiplier(game, "pacifist");
  const prayerMultiplier = getStigmaEffectMultiplier(game, "golden-prayer");

  if (pacifistMultiplier > 0 && isSaveOption(option)) {
    Object.entries(next).forEach(([key, value]) => {
      if (value > 0) next[key] = Math.round(value * (1 + 0.25 * pacifistMultiplier));
    });
  }

  if (prayerMultiplier > 0 && option.tone === "holy") {
    ["faith", "salt"].forEach((key) => {
      if ((next[key] ?? 0) > 0) next[key] += prayerMultiplier;
    });
  }

  return next;
}

function getUnlockedStigmata(game) {
  return STIGMATA.filter((stigma) => stigma.isUnlocked(game)).map((stigma) => stigma.id);
}

function getSpecialFlags(game) {
  const flags = [];
  if (game.counters.killForfeits >= 5) flags.push("quest-nonviolent-answer");
  if (game.counters.forfeits >= 12) flags.push("ending-refused-all");
  if (game.counters.holyChoices >= 5) flags.push("quest-golden-door");
  return flags;
}

function applyUnlockProgress(game) {
  const stigmata = getUnlockedStigmata(game);
  return {
    ...game,
    stigmata,
    equippedStigmaId: game.equippedStigmaId,
    specialFlags: getSpecialFlags(game),
  };
}

function getOptionWeight(option, game) {
  const traitAffinity = Object.entries(option.traits ?? {}).reduce(
    (sum, [key, value]) => {
      if (value <= 0) return sum;
      return sum + value * (1 + Math.max(game.traits[key] ?? 0, 0) / 5);
    },
    0,
  );
  const moralDirection = option.traits?.morality ?? 0;
  const moralAffinity =
    moralDirection === 0
      ? 2
      : Math.max(0, Math.sign(moralDirection) * game.traits.morality) * 1.5;
  const resourceFit = Object.entries(option.effects ?? {}).reduce(
    (sum, [key, value]) =>
      value < 0 && getActiveResources(game)[key] < Math.abs(value)
        ? sum - 5
        : sum + 0.75,
    0,
  );
  const phaseFit =
    game.phase === "night"
      ? option.tone === "holy" || option.tone === "lethal"
        ? 4
        : 1
      : option.tone === "good" || option.tone === "neutral"
        ? 3
        : 0;
  const rarityFit =
    option.tone === "holy"
      ? game.traits.sanctity - 4
      : option.tone === "lethal"
        ? game.traits.danger - 5
        : 2;

  return 8 + traitAffinity + moralAffinity + resourceFit + phaseFit + rarityFit;
}

function getEstateState(game) {
  if (game.phase === "night" || game.phase === "complete") {
    return {
      name: "■■가 열리는 날",
      tone: "void",
      script:
        "영지는 평온하다. 창문은 닫혔고 사람들은 잠들었다. 그럼에도 저택 안에서 닫히는 문의 수가 방의 수보다 하나 많다.",
    };
  }

  const moralAverage =
    game.history.length === 0
      ? 0
      : game.history.reduce((sum, entry) => sum + entry.morality, 0) /
        game.history.length;

  if (moralAverage >= 1) {
    return {
      name: "평화로움",
      tone: "peace",
      script:
        "사람들은 당신의 판단을 신뢰하기 시작했다. 오늘의 영지는 넉넉하고 조용하며, 저녁 식탁마다 작은 웃음이 남았다.",
    };
  }

  if (moralAverage <= -1) {
    return {
      name: "평상시",
      tone: "uneasy",
      script:
        "영지는 아무 문제 없이 움직인다. 사람들은 맡은 일을 끝냈고, 당신이 지나가면 대화를 잠시 멈춘다.",
    };
  }

  return {
    name: "평상시",
    tone: "normal",
    script:
      "영지는 정해진 질서대로 움직인다. 풍요롭고 깨끗하며, 누구나 최소한의 상식을 지킨다. 이상할 만큼.",
  };
}

function getAverageTone(game) {
  if (game.history.length === 0) return "neutral";
  const moralAverage =
    game.history.reduce((sum, entry) => sum + entry.morality, 0) /
    game.history.length;

  if (game.traits.danger >= 10 && moralAverage <= 0) return "lethal";
  if (game.traits.sanctity >= 8 && moralAverage >= 0) return "holy";
  if (moralAverage >= 0.7) return "good";
  if (moralAverage <= -0.7) return "bad";
  return "neutral";
}

function getJobCandidates(game) {
  const traits = game.traits;
  const normalJobs = JOBS.filter((job) => !job.hidden)
    .map((job) => ({ ...job, affinity: job.score(traits) }))
    .sort((a, b) => b.affinity - a.affinity);
  const unlockedHidden = JOBS.filter(
    (job) => job.hidden && job.isUnlocked(game),
  )
    .map((job) => ({ ...job, affinity: job.score(traits), access: "hidden" }))
    .sort((a, b) => b.affinity - a.affinity);

  if (unlockedHidden.length > 0) {
    return [
      { ...normalJobs[0], access: "easy" },
      { ...normalJobs[1], access: "available" },
      ...unlockedHidden,
    ];
  }

  return [
    { ...normalJobs[0], access: "easy" },
    { ...normalJobs[1], access: "available" },
    { ...normalJobs.at(-1), access: "locked" },
  ];
}

function deriveStats(traits, job) {
  const stats = {
    체력: 8 + Math.floor(traits.resolve / 3),
    통찰: 7 + Math.floor(traits.curiosity / 3),
    결단: 7 + Math.floor((traits.resolve + traits.pragmatism) / 4),
    매력: 9 + Math.floor((traits.compassion + traits.morality) / 5),
    신앙: 4 + Math.floor((traits.faith + traits.sanctity) / 3),
    스태미나: 10,
  };

  if (job?.id === "steward") stats.매력 += 2;
  if (job?.id === "herbalist") stats.체력 += 2;
  if (job?.id === "archivist") stats.통찰 += 2;
  if (job?.id === "squire") stats.결단 += 2;
  if (job?.id === "exorcist") {
    stats.신앙 += 3;
    stats.통찰 += 1;
  }
  if (job?.id === "inquisitor") stats.결단 += 3;
  if (job?.id === "jobless") stats.스태미나 = 7;
  return stats;
}

function loadGame() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return INITIAL_GAME;
    const parsed = JSON.parse(saved);
    const validJob = [...JOBS, FALLBACK_JOB].some((job) => job.id === parsed.jobId);

    if (parsed.phase === "complete" && !validJob) return INITIAL_GAME;
    return {
      ...INITIAL_GAME,
      ...parsed,
      stigmata: parsed.stigmata ?? parsed.titles ?? [],
      equippedStigmaId: parsed.equippedStigmaId ?? parsed.equippedTitleId ?? null,
    };
  } catch {
    return INITIAL_GAME;
  }
}

function getResourceTrace(statKey, value, isNight) {
  const traces = {
    food: isNight ? "식탁 아래 젖은 부스러기" : "남아도는 빵 냄새",
    timber: isNight ? "안쪽에서 긁힌 나뭇결" : "마른 장작 더미",
    silver: isNight ? "세어지지 않는 동전" : "무게가 맞는 자루",
    salt: isNight ? "문턱마다 끊긴 흰 선" : "손대지 않은 흰 가루",
    population: isNight ? "창문의 수와 맞지 않는 불빛" : "웃으며 오가는 사람들",
    faith: isNight ? "꺼지지 않는 마지막 촛불" : "정시에 울리는 작은 종",
    fear: "아무도 말하지 않는 흔적",
  };
  const intensity = value >= 60 ? "짙음" : value >= 25 ? "남아 있음" : "희미함";
  return `${traces[statKey]} · ${intensity}`;
}

function ResourceCard({ statKey, value, isNight }) {
  const meta = RESOURCE_META[statKey];
  return (
    <article className={`resource-card resource-card--${statKey}`}>
      <span>{meta.icon}</span>
      <small>{meta.label}</small>
      <strong>■■</strong>
      <em>{getResourceTrace(statKey, value, isNight)}</em>
    </article>
  );
}

function EstateScene({ isNight, estateState }) {
  return (
    <section className={`estate-scene ${isNight ? "estate-scene--night" : ""}`}>
      <img
        className="estate-scene__image estate-scene__image--day"
        src="/assets/eldroa-estate-day.jpg"
        alt={isNight ? "" : "낮의 엘드로아 영지 전경"}
        aria-hidden={isNight}
        decoding="async"
        fetchPriority="high"
      />
      <img
        className="estate-scene__image estate-scene__image--night"
        src="/assets/eldroa-estate-night.jpg"
        alt={isNight ? "밤의 엘드로아 영지 전경" : ""}
        aria-hidden={!isNight}
        decoding="async"
        loading="eager"
        fetchPriority="low"
      />
      <div className="estate-scene__shade" />
      <div className="estate-scene__caption">
        <span>영지의 취급 · 일반 영지</span>
        <strong>{estateState.name}</strong>
        <p>
          {isNight
            ? "낮에는 보이지 않던 기록이 열렸습니다."
            : "당신은 친절한 세계의 첫날을 보내고 있습니다."}
        </p>
      </div>
    </section>
  );
}

function CharacterPanel({ game, jobCandidates, selectedJob, onEquipStigma }) {
  const isRevealed = game.phase !== "day";
  const skills = selectedJob?.skills ?? ["아직 기록되지 않음"];

  return (
    <aside className={`character-panel ${isRevealed ? "is-revealed" : ""}`}>
      <div className="character-panel__head">
        <div className="portrait-placeholder">
          <span>{isRevealed ? "이방인" : "?"}</span>
        </div>
        <div>
          <span className="eyebrow">PLAYER CHARACTER</span>
          <h2>이세계에서 온 영지 대리인</h2>
          <p>{selectedJob ? selectedJob.name : isRevealed ? "직업 판정 중" : "평범한 방문객"}</p>
        </div>
      </div>
      <div className="stat-grid">
        {Object.entries(game.playerStats).map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{isRevealed ? value : "?"}</strong>
          </div>
        ))}
      </div>
      <div className="skill-block">
        <span className="eyebrow">SKILLS</span>
        <div>
          {skills.map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
      </div>
      <div className="stigma-block">
        <span className="eyebrow">STIGMATA</span>
        {game.stigmata.length === 0 ? (
          <p>아직 새겨진 성흔이 없습니다.</p>
        ) : (
          <div>
            {game.stigmata.map((stigmaId) => {
              const stigma = STIGMATA.find((item) => item.id === stigmaId);
              return (
                <button
                  type="button"
                  key={stigma.id}
                  disabled={!stigma.equipable}
                  className={game.equippedStigmaId === stigma.id ? "is-equipped" : ""}
                  onClick={() => onEquipStigma(stigma.id)}
                >
                  {stigma.name}
                  <small>
                    {!stigma.equipable
                      ? "주 성흔 지정 불가"
                      : game.equippedStigmaId === stigma.id
                        ? "주 성흔 · 효과 2배"
                        : "성흔 효과 적용"}
                  </small>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {game.specialFlags.length > 0 && (
        <div className="special-records">
          <span className="eyebrow">SPECIAL RECORDS</span>
          {game.specialFlags.map((flag) => (
            <p key={flag}>
              {flag === "quest-nonviolent-answer" && "특수 퀘스트 · 죽이지 않는 방법"}
              {flag === "ending-refused-all" && "특수 엔딩 조건 · 아무것도 고르지 않은 자"}
              {flag === "quest-golden-door" && "특수 퀘스트 · 금빛 문"}
            </p>
          ))}
        </div>
      )}
      {game.phase === "night" && game.step === 2 && (
        <p className="candidate-note">
          낮의 선택으로 {jobCandidates.filter((job) => job.access !== "locked").length}개의 길이 열렸습니다.
        </p>
      )}
    </aside>
  );
}

function ResultOverlay({ result, estateState, averageTone, onContinue }) {
  if (!result) return null;
  return (
    <div className="result-overlay">
      <section className={`result-card result-card--${result.tone}`}>
        <span className="eyebrow">선택 이후</span>
        <h2>{result.label}</h2>
        <p>{result.result}</p>
        <div className="world-report">
          <span>영지 전체 상태 · {estateState.name}</span>
          <p>{estateState.script}</p>
        </div>
        <div className="evaluation-signs">
          <div className="evaluation-sign">
            <i className={`evaluation-dot evaluation-dot--${result.tone}`} />
            <span>이번 선택</span>
          </div>
          <div className="evaluation-sign">
            <i className={`evaluation-dot evaluation-dot--${averageTone}`} />
            <span>누적 선택 평균</span>
          </div>
        </div>
        <p className="hidden-score-note">두 평가는 기록되었지만 수치와 계산식은 공개되지 않습니다.</p>
        <button type="button" onClick={onContinue}>
          계속
        </button>
      </section>
    </div>
  );
}

function NightfallOverlay({ onContinue }) {
  return (
    <div className="nightfall-overlay">
      <div className="nightfall-overlay__sun" />
      <div className="nightfall-overlay__copy">
        <span>튜토리얼 종료</span>
        <h2>해가 졌다.</h2>
        <p>낮 동안 당신은 이 세계가 친절하다고 생각했다.</p>
        <button type="button" onClick={onContinue}>
          첫 번째 밤을 시작한다
        </button>
      </div>
    </div>
  );
}

function TutorialComplete({ job, onReset }) {
  return (
    <div className="complete-overlay">
      <section>
        <span className="eyebrow">INITIAL CLASS ACQUIRED</span>
        <h2>{job.name}</h2>
        <strong>{job.title}</strong>
        <p>{job.description}</p>
        <div className="complete-skills">
          {job.skills.map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
        <p className="complete-message">
          첫날이 끝났습니다. 영지는 내일부터 당신의 스태미나와 선택을 요구합니다.
        </p>
        <button type="button" onClick={onReset}>
          튜토리얼 다시 시작
        </button>
      </section>
    </div>
  );
}

function App() {
  const [game, setGame] = useState(loadGame);
  const [showNightfall, setShowNightfall] = useState(false);
  const [isCharacterOpen, setIsCharacterOpen] = useState(false);

  const isNight = game.phase === "night" || game.phase === "complete";
  const estateState = useMemo(() => getEstateState(game), [game]);
  const averageTone = useMemo(() => getAverageTone(game), [game]);
  const jobCandidates = useMemo(() => getJobCandidates(game), [game]);
  const selectedJob = [...JOBS, FALLBACK_JOB].find((job) => job.id === game.jobId);
  const currentScene =
    game.phase === "day"
      ? DAY_SCENES[game.step]
      : game.phase === "night" && game.step < 2
        ? NIGHT_SCENES[game.step]
        : null;
  const offeredOptions = useMemo(() => getRouteOffers(currentScene, game), [currentScene, game]);
  const offeredJobs = useMemo(
    () =>
      jobCandidates
        .map((job) => ({
          ...job,
          available: job.access !== "locked",
          weight: 8 + Math.max(job.affinity ?? 0, 0) + (job.access === "easy" ? 8 : 0),
        }))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5),
    [jobCandidates],
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game]);

  function recordOption(scene, option) {
    if (!option.available && option.available !== undefined) return;
    const morality = option.traits?.morality ?? 0;
    setGame((current) => {
      const nextTraits = applyTraitDelta(current.traits, option.traits);
      const activePhase = current.phase === "day" ? "day" : "night";
      const adjustedEffects = applyStigmaEffects(current, option, option.effects);
      const nextCounters = {
        ...current.counters,
        choices: current.counters.choices + 1,
        holyChoices: current.counters.holyChoices + (option.tone === "holy" ? 1 : 0),
        saves: current.counters.saves + (isSaveOption(option) ? 1 : 0),
        kills: current.counters.kills + (isKillRequired(option) ? 1 : 0),
      };
      return applyUnlockProgress({
        ...current,
        phaseResources: {
          ...current.phaseResources,
          [activePhase]: applyDelta(current.phaseResources[activePhase], adjustedEffects),
        },
        traits: nextTraits,
        playerStats: deriveStats(nextTraits),
        counters: nextCounters,
        pendingResult: {
          scene: scene.title,
          label: option.label,
          tone: option.tone,
          result: option.result,
        },
        history: [
          ...current.history,
          {
            phase: current.phase,
            scene: scene.title,
            choice: option.label,
            tone: option.tone,
            morality,
          },
        ],
      });
    });
  }

  function continueAfterResult() {
    setGame((current) => {
      if (current.phase === "day" && current.step === DAY_SCENES.length - 1) {
        setShowNightfall(true);
        return { ...current, pendingResult: null };
      }
      if (current.phase === "night" && current.step === NIGHT_SCENES.length - 1) {
        return { ...current, pendingResult: null, step: 2 };
      }
      return { ...current, pendingResult: null, step: current.step + 1 };
    });
  }

  function beginNight() {
    setShowNightfall(false);
    setGame((current) => ({ ...current, phase: "night", step: 0 }));
  }

  function giveUpScene() {
    const penalty =
      game.phase === "night"
        ? { effects: { fear: 8, faith: -2 }, traits: { resolve: -2, morality: -1 } }
        : { effects: { silver: -5, faith: -1, fear: 2 }, traits: { resolve: -1, morality: -1 } };

    setGame((current) => {
      const nextTraits = applyTraitDelta(current.traits, penalty.traits);
      const activePhase = current.phase === "day" ? "day" : "night";
      const nextCounters = {
        ...current.counters,
        forfeits: current.counters.forfeits + 1,
        killForfeits:
          current.counters.killForfeits +
          (offeredOptions.some((option) => isKillRequired(option)) ? 1 : 0),
      };
      return applyUnlockProgress({
        ...current,
        phaseResources: {
          ...current.phaseResources,
          [activePhase]: applyDelta(current.phaseResources[activePhase], penalty.effects),
        },
        traits: nextTraits,
        playerStats: deriveStats(nextTraits),
        counters: nextCounters,
        pendingResult: {
          scene: currentScene.title,
          label: "결정을 포기한다",
          tone: "bad",
          result:
            current.phase === "night"
              ? "당신이 아무것도 고르지 않는 동안, 문밖의 것이 대신 하나를 골랐다."
              : "결정은 미뤄졌고, 영지는 가장 값싼 방식으로 문제를 처리했다.",
        },
        history: [
          ...current.history,
          {
            phase: current.phase,
            scene: currentScene.title,
            choice: "결정을 포기한다",
            tone: "bad",
            morality: -1,
          },
        ],
      });
    });
  }

  function selectJob(job) {
    if (job.access === "locked") return;
    setGame((current) => ({
      ...current,
      phase: "complete",
      jobId: job.id,
      playerStats: deriveStats(current.traits, job),
      history: [
        ...current.history,
        {
          phase: "night",
          scene: "초기 직업",
          choice: job.name,
          tone: job.hiddenTone ?? "neutral",
          morality: 0,
        },
      ],
    }));
  }

  function giveUpJob() {
    setGame((current) =>
      applyUnlockProgress({
        ...current,
        phase: "complete",
        jobId: FALLBACK_JOB.id,
        playerStats: deriveStats(current.traits, FALLBACK_JOB),
        counters: {
          ...current.counters,
          forfeits: current.counters.forfeits + 1,
        },
        history: [
          ...current.history,
          {
            phase: "night",
            scene: "초기 직업",
            choice: "모든 직업을 포기한다",
            tone: "bad",
            morality: -1,
          },
        ],
      }),
    );
  }

  function equipStigma(stigmaId) {
    const stigma = STIGMATA.find((item) => item.id === stigmaId);
    if (!stigma?.equipable || !game.stigmata.includes(stigmaId)) return;
    setGame((current) => ({
      ...current,
      equippedStigmaId: current.equippedStigmaId === stigmaId ? null : stigmaId,
    }));
  }

  function resetGame() {
    localStorage.removeItem(STORAGE_KEY);
    setShowNightfall(false);
    setGame(INITIAL_GAME);
  }

  return (
    <main className={`app-shell ${isNight ? "theme-night" : "theme-day"}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand__crest">{isNight ? "■" : "E"}</span>
          <div>
            <p>{isNight ? "THE RECORD OPENS" : "A KIND WORLD AWAITS"}</p>
            <h1>{isNight ? "첫 번째 밤의 기록" : "친절한 영지의 첫날"}</h1>
          </div>
        </div>
        <div className="phase-clock">
          <span>{isNight ? "밤" : "낮"}</span>
          <strong>
            {isNight ? `${Math.min(game.step + 1, 3)} / 3` : `${game.step + 1} / 5`}
          </strong>
          <em>1일차</em>
        </div>
        <div className="topbar__actions">
          <button type="button" onClick={() => setIsCharacterOpen((open) => !open)}>
            주인공 정보
          </button>
          <button type="button" onClick={resetGame}>
            처음부터
          </button>
        </div>
      </header>

      <section className="resource-strip" aria-label="영지 현황">
        {Object.keys(RESOURCE_META).map((key) => (
          <ResourceCard
            key={key}
            statKey={key}
            value={getActiveResources(game)[key]}
            isNight={isNight}
          />
        ))}
      </section>

      <div className="dashboard">
        <div className="estate-column">
          <EstateScene isNight={isNight} estateState={estateState} />
          <section className={`estate-report estate-report--${estateState.tone}`}>
            <div>
              <span className="eyebrow">ESTATE CONDITION</span>
              <h2>{estateState.name}</h2>
            </div>
            <p>{estateState.script}</p>
          </section>
        </div>

        <section className="choice-panel">
          {currentScene && (
            <>
              <div className="choice-panel__intro">
                <span className="eyebrow">{currentScene.tag}</span>
                <h2>{currentScene.title}</h2>
                <p>{currentScene.text}</p>
              </div>
              <div className="option-list option-list--single">
                {offeredOptions.map((option) => (
                  <button
                    type="button"
                    className={`option-button option-button--${option.tone} ${
                      !option.available ? "option-button--locked" : ""
                    }`}
                    key={option.label}
                    disabled={!option.available}
                    onClick={() => recordOption(currentScene, option)}
                  >
                    <strong>{option.label}</strong>
                  </button>
                ))}
                <button
                  type="button"
                  className="option-button option-button--forfeit"
                  onClick={giveUpScene}
                >
                  <strong>포기한다</strong>
                </button>
              </div>
            </>
          )}

          {game.phase === "night" && game.step === 2 && (
            <div className="job-selection">
              <div className="choice-panel__intro">
                <span className="eyebrow">세 번째 밤 · 초기 직업</span>
                <h2>낮에 고른 것들이 당신의 직업이 되었다</h2>
                <p>
                  쉬운 길과 열린 길, 그리고 지금의 당신으로는 닿을 수 없는 길이 함께
                  표시됩니다.
                </p>
              </div>
              <div className="job-list job-list--single">
                {offeredJobs.map((job) => (
                  <button
                    type="button"
                    className={`job-card job-card--${job.access} ${
                      job.hiddenTone ? `job-card--${job.hiddenTone}` : ""
                    } ${!job.available ? "job-card--locked" : ""}`}
                    key={job.id}
                    disabled={!job.available}
                    onClick={() => selectJob(job)}
                  >
                    <strong>{job.access === "locked" ? "■■■■" : job.name}</strong>
                  </button>
                ))}
                <button
                  type="button"
                  className="job-card job-card--forfeit"
                  onClick={giveUpJob}
                >
                  <strong>포기한다</strong>
                </button>
              </div>
            </div>
          )}
        </section>
        <CharacterPanel
          game={game}
          jobCandidates={jobCandidates}
          selectedJob={selectedJob}
          onEquipStigma={equipStigma}
        />
      </div>

      {isCharacterOpen && (
        <div className="mobile-character-modal" onClick={() => setIsCharacterOpen(false)}>
          <CharacterPanel
            game={game}
            jobCandidates={jobCandidates}
            selectedJob={selectedJob}
            onEquipStigma={equipStigma}
          />
        </div>
      )}

      <ResultOverlay
        result={game.pendingResult}
        estateState={estateState}
        averageTone={averageTone}
        onContinue={continueAfterResult}
      />
      {showNightfall && <NightfallOverlay onContinue={beginNight} />}
      {game.phase === "complete" && selectedJob && (
        <TutorialComplete job={selectedJob} onReset={resetGame} />
      )}
    </main>
  );
}

export default App;
