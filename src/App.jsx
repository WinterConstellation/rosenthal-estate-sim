import { useEffect, useMemo, useState } from "react";
import {
  beginPrologue,
  canManualSave,
  chooseDayAction,
  chooseEscapeTransformedFate,
  chooseExplorationOption,
  chooseFinaleOption,
  chooseSpecialEvent,
  chooseTransformedFate,
  completeTransition,
  continueAfterResult,
  createNewRun,
  createStartState,
  deliverKeepsake,
  displayCompanion,
  finishVerticalSlice,
  forfeitDay,
  getCompanionOffers,
  getCurrentExplorationEvent,
  getCurrentFinale,
  getDayEightScript,
  getDayOffers,
  getDirectionOffers,
  getEnding,
  getExplorationOptions,
  getFinaleOptions,
  getNpcSpeaker,
  getSpecialGroup,
  isExplorationOptionAvailable,
  isNightDisplayPhase,
  openFirstDay,
  retreatExpedition,
  selectCompanion,
  skipNightEntry,
  startExpedition,
} from "./engine/rosenthalEngine.js";
import {
  clearAutoSave,
  getSaveSlots,
  loadAutoSave,
  loadManual,
  saveAuto,
  saveManual,
} from "./engine/saveManager.js";
import { getEffectiveChoiceChance, getJob, getPassive, getStigmaName, resolveChoice, truncateToTenth } from "./engine/rulesEngine.js";
import {
  PASSIVES,
  RESOURCE_META,
  STIGMA_PREFIXES,
  STIGMA_SUFFIXES,
  TRAIT_META,
} from "./rules/systemRules.js";
import {
  DAY_INTERLUDES,
  DAY_OPENING_SCRIPT,
  NIGHT_ENTRY_SCRIPT,
  PROLOGUE,
} from "./rules/tutorialRules.js";

const LABELS = {
  health: "체력",
  insight: "통찰",
  resolve: "결단",
  charm: "매력",
  faith: "신앙",
  stamina: "스태미나",
  food: "식량",
  timber: "목재",
  silver: "은화",
  salt: "축성 소금",
  population: "인구",
  fear: "공포",
  stability: "안정도",
  trust: "신뢰",
  recordIntegrity: "기록 완전성",
  corruption: "이상 징후",
  missing: "실종",
};

const STATUS_LABELS = {
  alive: "생존",
  dead: "사망",
  missing: "실종",
  transformed: "변질",
};

const STAT_DETAILS = {
  health: "0 미만이 되면 이번 기록은 종료된다.",
  insight: "0 미만이면 획득하려던 양수 변화가 같은 크기의 음수 변화로 뒤집힌다.",
  resolve: "0 미만이면 성공과 실패를 가르는 확률이 절반으로 줄어든다.",
  charm: "0 미만이면 호감도가 있는 인물의 선택을 고를 때마다 관계가 악화된다.",
  faith: "0 미만이면 신성 보너스를 얻는 선택을 고를 수 없다.",
  stamina: "0 미만이면 현재 시간대의 행동을 중단하고 강제로 귀환한다.",
};

const TRAIT_DETAILS = {
  record: "장부, 증언, 기록의 모순을 다루는 성향.",
  knight: "호위와 정면 대응을 택하는 성향.",
  mansion: "저택의 구조와 반복되는 동선을 읽는 성향.",
  trade: "물자와 교환 관계를 활용하는 성향.",
  life: "사람들의 일상과 생존을 우선하는 성향.",
  shortcut: "정해진 절차 밖의 빠른 방법을 택하는 성향.",
  exorcism: "악한 것을 몰아내고 봉쇄하는 성향.",
  execution: "위험을 남기지 않고 끝내는 성향.",
  divine: "신성한 방식과 축복을 받아들이는 성향.",
  suspicion: "평범해 보이는 장면의 어긋남을 의심하는 성향.",
};

const HORROR_FRAGMENTS = [
  "기록은 숨을 쉰다",
  "문장이 피를 흘린다",
  "아직 아무 일도 일어나지 않았다",
  "이름을 잊지 마라",
  "밤은 장부를 읽는다",
  "문 아래에서 소리가 난다",
  "누군가 돌아오지 않았다",
  "붉은 잉크가 번진다",
  "친절한 세계가 기다린다",
  "다시 쓰지 마라",
  "기억이 빠져나간다",
  "지하가 대답한다",
];

const HORROR_FRAGMENT_LAYOUTS = [
  { x: 7, y: 14, s: 0.78, r: -8, d: -2 },
  { x: 68, y: 9, s: 0.64, r: 6, d: -5 },
  { x: 34, y: 23, s: 0.56, r: -3, d: -9 },
  { x: 78, y: 32, s: 0.72, r: 10, d: -1 },
  { x: 12, y: 49, s: 0.58, r: 4, d: -7 },
  { x: 51, y: 58, s: 0.82, r: -6, d: -4 },
  { x: 82, y: 68, s: 0.52, r: 5, d: -11 },
  { x: 23, y: 74, s: 0.68, r: -11, d: -3 },
  { x: 41, y: 83, s: 0.5, r: 2, d: -8 },
  { x: 61, y: 43, s: 0.6, r: -2, d: -13 },
  { x: 6, y: 87, s: 0.46, r: 7, d: -10 },
  { x: 70, y: 88, s: 0.7, r: -5, d: -6 },
];

const HORROR_STATIC_ROWS = [
  ". .-.*..--*.-..*...-..*.-.*..--..*.-",
  "-*..*...--..-.*..*.-..--*...*..-..",
  "..--*.-..*...*..---..*.-.*..--*..",
  "*..-..*.-..--..*...-.*..*..--..*.",
];

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function displayInteger(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
}

function displayTenth(value) {
  const truncated = truncateToTenth(value);
  const normalized = Object.is(truncated, -0) ? 0 : truncated;
  return Number.isInteger(normalized) ? `${normalized}` : normalized.toFixed(1);
}

function displaySignedTenth(value) {
  const text = displayTenth(value);
  return Number(text) > 0 ? `+${text}` : text;
}

function displayChancePercent(chance) {
  return displayInteger((Number(chance) || 0) * 100);
}

function getHorrorIntensity(game, isNight) {
  const fear = Number(game.resources?.fear ?? 0) / 100;
  const corruption = Number(game.estate?.corruption ?? 0) / 100;
  const transformedCount = Object.values(game.companionStates ?? {}).filter((person) => person.status === "transformed").length;
  const nightPhase = ["night-companion", "night-direction", "expedition", "finale", "escape-transformed-choice", "nightfall-transition"].includes(game.phase);
  const nightResult = game.phase === "result" && ["night-companion", "night-direction", "expedition", "finale", "daybreak"].includes(game.resumePhase);
  const phasePressure = nightPhase || nightResult ? 0.18 : 0;
  const routePressure = game.route === "altered" ? 0.14 : 0;
  const transformedPressure = Math.min(0.16, transformedCount * 0.04);
  return clamp01(fear * 0.42 + corruption * 0.42 + (isNight ? 0.18 : 0) + phasePressure + routePressure + transformedPressure);
}

function HorrorTextOverlay({ game, isNight }) {
  const intensity = getHorrorIntensity(game, isNight);
  if (intensity < 0.12) return null;

  const fragmentCount = Math.min(8, Math.max(3, Math.round(3 + intensity * 5)));
  const staticRows = intensity >= 0.58 ? HORROR_STATIC_ROWS.slice(0, 2) : [];

  return (
    <div
      className="horror-text-overlay"
      style={{ "--horror-strength": intensity.toFixed(2) }}
      aria-hidden="true"
    >
      <div className="horror-text-overlay__mist">
        {HORROR_FRAGMENTS.slice(0, fragmentCount).map((text, index) => {
          const layout = HORROR_FRAGMENT_LAYOUTS[index % HORROR_FRAGMENT_LAYOUTS.length];
          return (
            <span
              className={"horror-fragment " + (index % 3 !== 0 ? "horror-fragment--eaten" : "")}
              data-text={text}
              key={text + "-" + index}
              style={{
                "--x": layout.x + "%",
                "--y": layout.y + "%",
                "--scale": layout.s,
                "--rotate": layout.r + "deg",
                "--delay": layout.d + "s",
              }}
            >
              {text}
            </span>
          );
        })}
      </div>
      <div className="horror-text-overlay__static">
        {staticRows.map((row, index) => (
          <span
            key={row + "-" + index}
            style={{
              "--y": 18 + index * 18 + "%",
              "--delay": index * -0.9 + "s",
              "--duration": 2.7 + index * 0.35 + "s",
            }}
          >
            {row}
          </span>
        ))}
      </div>
    </div>
  );
}

const RESOURCE_DETAILS = {
  food: "영지 주민이 먹을 식량의 비축 상태.",
  timber: "수리와 난방에 사용하는 목재의 비축 상태.",
  silver: "거래와 영지 운영에 사용하는 은화.",
  salt: "악한 것을 봉쇄하고 정화하는 데 사용하는 축성 소금.",
  population: "현재 영지에 속한 사람의 수.",
  faith: "영지 공동체가 유지하는 신앙의 상태.",
  fear: "영지 전체에 쌓인 공포. 높을수록 일상이 흔들린다.",
};

const ESTATE_DETAILS = {
  stability: "영지의 질서와 일상이 유지되는 정도.",
  trust: "주민들이 영주의 선택을 신뢰하는 정도.",
  recordIntegrity: "장부와 증언이 서로 모순 없이 남아 있는 정도.",
  corruption: "저택과 영지에 퍼진 비정상적인 징후.",
  missing: "돌아오지 않은 사람의 수.",
};

function getChangeDetail(change) {
  if (change.group === "능력치") return STAT_DETAILS[change.key];
  if (change.group === "성향") return TRAIT_DETAILS[change.key];
  if (change.group === "자원") return RESOURCE_DETAILS[change.key];
  if (change.group === "영지") return ESTATE_DETAILS[change.key];
  return undefined;
}

function resourceStage(key, value) {
  const amount = Math.max(0, Math.min(value ?? 0, 100));
  if (key === "fear") {
    if (amount <= 20) return "평온";
    if (amount <= 40) return "불안";
    if (amount <= 60) return "공포";
    if (amount <= 80) return "패닉";
    return "붕괴 직전";
  }
  if (amount <= 20) return "고갈";
  if (amount <= 40) return "부족함";
  if (amount <= 60) return "보통";
  if (amount <= 80) return "넉넉함";
  return "풍족함";
}

function resourceTone(key, value) {
  const amount = Math.max(0, Math.min(value ?? 0, 100));
  if (key === "fear") {
    if (amount <= 20) return "good";
    if (amount <= 40) return "neutral";
    if (amount <= 60) return "warning";
    if (amount <= 80) return "danger";
    return "critical";
  }
  if (amount <= 20) return "critical";
  if (amount <= 40) return "danger";
  if (amount <= 60) return "neutral";
  if (amount <= 80) return "good";
  return "abundant";
}

function hasFinalConsonant(text) {
  const code = text.at(-1)?.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

function joinLabels(labels) {
  if (labels.length <= 1) return labels[0] ?? "";
  return labels.map((label, index) => (
    index === labels.length - 1 ? label : `${label}${hasFinalConsonant(label) ? "과" : "와"}`
  )).join(" ");
}

function objectPhrase(labels) {
  const text = joinLabels(labels);
  return `${text}${hasFinalConsonant(text) ? "을" : "를"}`;
}

function subjectPhrase(labels) {
  const text = joinLabels(labels);
  return `${text}${hasFinalConsonant(text) ? "이" : "가"}`;
}

function describeEffects(effects = {}) {
  const entries = Object.entries(effects).flatMap(([group, values]) =>
    Object.entries(values ?? {}).map(([key, value]) => ({
      group,
      key,
      value,
      label: LABELS[key] ?? TRAIT_META[key]?.label ?? key,
    })),
  );
  const positive = entries.filter((entry) => entry.value > 0);
  const negative = entries.filter((entry) => entry.value < 0);
  const sentences = [];
  if (positive.length > 0) {
    const recovery = positive.filter((entry) => ["health", "stamina"].includes(entry.key));
    const gains = positive.filter((entry) => !["health", "stamina"].includes(entry.key));
    if (recovery.length > 0) sentences.push(`${objectPhrase(recovery.map((entry) => entry.label))} 회복한다.`);
    if (gains.length > 0) sentences.push(`${objectPhrase(gains.map((entry) => entry.label))} 늘린다.`);
  }
  if (negative.length > 0) {
    const large = negative.filter((entry) => Math.abs(entry.value) >= 4);
    const ordinary = negative.filter((entry) => Math.abs(entry.value) < 4);
    if (large.length > 0) sentences.push(`${objectPhrase(large.map((entry) => entry.label))} 크게 소모한다.`);
    if (ordinary.length > 0) sentences.push(`${subjectPhrase(ordinary.map((entry) => entry.label))} 감소한다.`);
  }
  return sentences.join(" ");
}

function describeChoice(choice) {
  if (choice.tooltip) return choice.tooltip;
  const categoryLead = {
    gathering: "영지의 물자를 확보하거나 정리한다.",
    interaction: "인물과 대화하며 관계와 영지 상태에 영향을 준다.",
    investigation: "단서와 기록을 조사한다.",
    training: "훈련을 통해 능력치를 높인다.",
    rest: "휴식을 통해 몸을 회복한다.",
    other: "일반 업무 밖의 행동을 시도한다.",
  }[choice.category];
  const effectText = describeEffects(choice.effects ?? choice.success);
  const failureText = describeEffects(choice.failure);
  if (failureText) {
    return [categoryLead, effectText && `성공하면 ${effectText}`, `실패하면 ${failureText}`].filter(Boolean).join(" ");
  }
  return [categoryLead, effectText, choice.detail ?? choice.preview, "결과는 선택한 뒤 확인할 수 있다."].filter(Boolean).join(" ");
}

function getEstatePresentation(game, isNight) {
  if ((game.estate?.corruption ?? 0) >= 60) {
    return { name: "위험구역", tone: "danger", script: "사람들은 아직 일상을 지키고 있다. 저택은 더 이상 그들을 흉내 내지 않는다." };
  }
  if ((game.estate?.trust ?? 0) <= 20 || (game.estate?.stability ?? 0) <= 20) {
    return { name: "흔들리는 영지", tone: "danger", script: "보고는 늦어지고, 닫힌 문 안에서 낮은 목소리가 오래 이어진다." };
  }
  if (isNight) {
    return { name: "밤의 로젠탈", tone: "night", script: "저택의 불이 대부분 꺼졌다. 지하로 이어지는 문만 열려 있다." };
  }
  if ((game.estate?.trust ?? 0) >= 65 && (game.estate?.stability ?? 0) >= 65) {
    return { name: "평화로운 영지", tone: "good", script: "사람들은 맡은 일을 마치고 당신의 다음 결정을 기다린다." };
  }
  return { name: "일반 영지", tone: "neutral", script: "로젠탈은 평온하다. 적어도, 해가 떠 있는 동안에는." };
}

function ResourceCard({ statKey, value, isNight, revealed }) {
  const meta = RESOURCE_META[statKey];
  const tone = resourceTone(statKey, value);
  return (
    <article className={`resource-card resource-card--${statKey} resource-card--${tone}`} title={`${meta.label}의 현재 상태를 다섯 단계로 표시한다.`}>
      <span>{meta.icon}</span>
      <small>{meta.label}</small>
      <strong>{revealed ? resourceStage(statKey, value) : "?"}</strong>
      <em>{isNight ? "밤에는 보고가 올라오지 않는다" : revealed ? "현재 장부 기록" : "첫날 장부 확인 전"}</em>
    </article>
  );
}

function SceneImage({ isNight, estateState }) {
  return (
    <section className={`estate-scene ${isNight ? "estate-scene--night" : ""}`}>
      <img className="estate-scene__image" src="./assets/eldroa-estate-day.jpg" alt={isNight ? "밤의 로젠탈 영지" : "낮의 로젠탈 영지"} />
      <div className="estate-scene__shade" />
      <div className="estate-scene__caption">
        <span>영지의 취급 · {estateState.name}</span>
        <strong>{isNight ? "문이 열려 있다" : "아무 일도 일어나지 않았다"}</strong>
        <p>{isNight ? "저택의 불이 대부분 꺼져 있다." : "영지는 평온하다."}</p>
      </div>
    </section>
  );
}

function CharacterPanel({ game }) {
  const companions = Object.values(game.companionStates ?? {});
  const transformed = companions.filter((person) => person.status === "transformed").length;
  const lost = companions.filter((person) => ["dead", "missing"].includes(person.status)).length;
  const rankedTraits = Object.entries(game.traits ?? {})
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4);
  const job = getJob(game);

  return (
    <aside className="character-panel">
      <div className="character-panel__head">
        <div className="portrait-placeholder"><span>영주</span></div>
        <div>
          <span className="eyebrow">이번 기록</span>
          <h2>{game.specialSeedName ?? "시작 전"}</h2>
          <p>{game.specialSeedRule ?? "새 게임을 시작하면 기록이 정해진다."}</p>
        </div>
      </div>

      <div className="stat-grid">
        {Object.entries(game.stats ?? {}).map(([key, value]) => (
          <div className={value < 0 ? "is-negative" : ""} key={key} title={STAT_DETAILS[key]}>
            <span>{LABELS[key] ?? key}</span>
            <strong>{displayTenth(game.displayStats?.[key] ?? value)}</strong>
          </div>
        ))}
      </div>

      <div className="rule-block">
        <span className="eyebrow">성향</span>
        <div className="rule-chip-list">
          {rankedTraits.map(([key, value]) => <span key={key} title={TRAIT_DETAILS[key]}>{TRAIT_META[key]?.label ?? key} {displayInteger(value)}</span>)}
        </div>
      </div>
      <div className="rule-block">
        <span className="eyebrow">직업</span>
        <strong>{game.jobId ? job?.name : "아직 정해지지 않음"}</strong>
        {game.jobId && <small>{job?.title}</small>}
      </div>
      <div className="rule-block">
        <span className="eyebrow">성흔</span>
        <strong>{game.stigma?.prefixId ? getStigmaName(game) : "아직 남지 않음"}</strong>
      </div>
      <div className="rule-block">
        <span className="eyebrow">패시브 스킬</span>
        <ol className="passive-list">
          {(game.passiveIds ?? []).map((id) => <li key={id} title={getPassive(id)?.description}><strong>{getPassive(id)?.name}</strong></li>)}
        </ol>
      </div>
      <div className="rule-block">
        <span className="eyebrow">사람들</span>
        <small>영구 소실 {lost} · 변질 {transformed} · 유품 {game.keepsakes?.length ?? 0}</small>
        <div className="roster-chips">
          {companions.map((person) => (
            <span className={`status-chip status-chip--${person.status}`} key={person.id} title={`${person.relation ?? person.reveal ?? "로젠탈의 주민"} · 현재 상태: ${STATUS_LABELS[person.status]}`}>
              {displayCompanion(person)} · {STATUS_LABELS[person.status]}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}

function normalizeDialogue(value, defaultSpeaker = "narration") {
  const source = Array.isArray(value) ? value : [value];
  return source
    .flatMap((entry) => {
      const text = typeof entry === "object" && entry !== null ? entry.text : entry;
      const speaker = typeof entry === "object" && entry !== null
        ? entry.speaker ?? defaultSpeaker
        : defaultSpeaker;
      return String(text ?? "")
        .split(/\n\s*\n/)
        .map((paragraph) => ({ text: paragraph.trim(), speaker }));
    })
    .filter((entry) => entry.text);
}

function resolveSpeakerLabel(speaker, game) {
  if (speaker === "narration") return "들리지 않는 목소리";
  if (speaker === "player") return "나";
  if (!speaker || speaker === "unknown" || speaker === "*미정*") return "*미정*";
  if (speaker.startsWith("npc:")) return getNpcSpeaker(game, speaker.slice(4));
  return speaker;
}

function getSpeakerKind(speaker) {
  if (speaker === "narration") return "narration";
  if (speaker === "player") return "player";
  if (speaker?.startsWith("npc:")) return "npc";
  return "unknown";
}

function DialogueCard({ game, eyebrow, title, paragraphs, button, onContinue, danger = false }) {
  const script = normalizeDialogue(paragraphs);
  const scriptKey = script.map((line) => `${line.speaker}:${line.text}`).join("\u241e");
  const [paragraphIndex, setParagraphIndex] = useState(0);

  useEffect(() => {
    setParagraphIndex(0);
  }, [scriptKey]);

  const currentIndex = Math.min(paragraphIndex, Math.max(script.length - 1, 0));
  const hasNextParagraph = currentIndex < script.length - 1;
  const currentLine = script[currentIndex];
  const currentSpeaker = resolveSpeakerLabel(currentLine?.speaker, game);
  const speakerKind = getSpeakerKind(currentLine?.speaker);

  return (
    <section className={`dialogue-card dialogue-card--speaker-${speakerKind} ${danger ? "dialogue-card--danger" : ""}`}>
      <div className="dialogue-card__head">
        <span>{eyebrow}</span>
        <div className="dialogue-card__head-actions">
          <span>{currentIndex + 1} / {script.length}</span>
          {hasNextParagraph && (
            <button className="dialogue-card__skip" type="button" onClick={() => setParagraphIndex(script.length - 1)}>
              <span>스킵</span>
            </button>
          )}
        </div>
      </div>
      {title && <h2 className="dialogue-card__title">{title}</h2>}
      <strong className={`speaker-label speaker-label--${speakerKind} dialogue-card__speaker`}>{currentSpeaker}</strong>
      <div className="dialogue-card__text">
        {currentLine && <p key={`${scriptKey}-${currentIndex}`}>{currentLine.text}</p>}
      </div>
      <div className="dialogue-card__controls">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => setParagraphIndex((index) => Math.max(index - 1, 0))}
        >
          이전으로
        </button>
        {hasNextParagraph ? (
          <button type="button" onClick={() => setParagraphIndex((index) => index + 1)}>다음</button>
        ) : (
          button && <button type="button" onClick={onContinue}>{button}</button>
        )}
      </div>
    </section>
  );
}

function SeedRevealModal({ name, rule, onContinue }) {
  return (
    <div className="seed-reveal-overlay">
      <section className="seed-reveal-card">
        <span className="eyebrow">이번 달의 이름</span>
        <h2>{name}</h2>
        <div className="seed-reveal-card__rule">
          <small>공개된 특성</small>
          <p>{rule}</p>
        </div>
        <button type="button" onClick={onContinue}>기록을 시작한다</button>
      </section>
    </div>
  );
}

function ChoiceButton({ choice, onClick, selected, detail }) {
  const unavailable = choice.available === false;
  return (
    <button
      className={`choice choice--${choice.tone ?? "neutral"} ${selected ? "choice--selected" : ""} ${unavailable ? "choice--unavailable" : ""}`}
      type="button"
      disabled={selected || unavailable}
      onClick={() => onClick(choice)}
      title={unavailable ? choice.unavailableReason ?? "현재 선택할 수 없다" : describeChoice(choice)}
    >
      {choice.categoryLabel && <small>{choice.categoryLabel}</small>}
      <strong>{choice.label ?? choice.title}</strong>
      {(detail || unavailable) && <span>{unavailable ? choice.unavailableReason ?? "현재 선택할 수 없다" : detail}</span>}
    </button>
  );
}

function ChoicePanel({ game, eyebrow, title, text, choices, onChoose, selectedId, footer }) {
  const paragraphs = normalizeDialogue(text);
  const scriptKey = paragraphs.map((line) => `${line.speaker}:${line.text}`).join("\u241e");
  const dialogueKey = `${eyebrow}\u241f${title}\u241f${scriptKey}`;
  const [completedScriptKey, setCompletedScriptKey] = useState(null);
  const dialogueComplete = paragraphs.length === 0 || completedScriptKey === dialogueKey;

  return (
    <>
      <section className="choice-panel">
        <header className="choice-panel__intro">
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </header>
        {dialogueComplete ? (
          <>
          <div className={`choice-list ${selectedId ? "is-resolving" : ""}`}>
            {choices.map((choice) => (
              <ChoiceButton
                key={choice.id}
                choice={choice}
                onClick={onChoose}
                selected={Boolean(selectedId)}
                detail={choice.detail ?? choice.preview}
              />
            ))}
          </div>
          {footer}
          </>
        ) : (
          <div className="choice-panel__waiting">
            <span>대화를 확인한 뒤 선택할 수 있다.</span>
          </div>
        )}
      </section>
      {!dialogueComplete && (
        <DialogueCard
          game={game}
          eyebrow={eyebrow}
          title={title}
          paragraphs={paragraphs}
          button="선택지를 확인한다"
          onContinue={() => setCompletedScriptKey(dialogueKey)}
        />
      )}
    </>
  );
}

function ResultOverlay({ game, result, onContinue }) {
  const paragraphs = normalizeDialogue(result?.result, result?.speaker ?? "narration");
  const scriptKey = paragraphs.map((line) => `${line.speaker}:${line.text}`).join("\u241e");
  const dialogueKey = `${result?.title ?? ""}\u241f${scriptKey}`;
  const [completedScriptKey, setCompletedScriptKey] = useState(null);
  const dialogueComplete = completedScriptKey === dialogueKey;
  const changeGroups = [
    { id: "stats", label: "주인공 능력치", changes: result?.changes?.filter((change) => change.group === "능력치") ?? [] },
    { id: "resources", label: "영지 자원", changes: result?.changes?.filter((change) => change.group === "자원") ?? [] },
    { id: "estate", label: "영지 상태", changes: result?.changes?.filter((change) => change.group === "영지") ?? [] },
    { id: "traits", label: "성향", changes: result?.changes?.filter((change) => change.group === "성향") ?? [] },
  ].filter((group) => group.changes.length > 0);

  if (!result) return null;
  if (!dialogueComplete && paragraphs.length > 0) {
    return (
      <DialogueCard
        game={game}
        eyebrow="선택의 결과"
        title={result.title}
        paragraphs={paragraphs}
        button="선택의 결과 확인"
        onContinue={() => setCompletedScriptKey(dialogueKey)}
        danger={["danger", "lethal"].includes(result.tone)}
      />
    );
  }

  return (
    <div className="overlay result-overlay">
      <section className={`result-card result-card--${result.tone ?? "neutral"}`}>
        <div className="result-card__head">
          <span>선택의 결과</span>
          <strong>{result.title}</strong>
        </div>
        <div className="result-card__summary">
          <strong>{result.changes?.length > 0 ? `${result.changes.length}개 항목 변경` : "변화 없음"}</strong>
        </div>
        {result.notices?.length > 0 && (
          <div className="notice-list">
            {result.notices.map((notice, index) => <span key={`${notice}-${index}`}>{notice}</span>)}
          </div>
        )}
        {changeGroups.length > 0 && (
          <div className="change-groups">
            {changeGroups.map((group) => (
              <section className="change-group" key={group.id}>
                <strong>{group.label}</strong>
                <div className="change-list">
                  {group.changes.map((change, index) => (
                    <span
                      className={change.delta < 0 ? "change--negative" : "change--positive"}
                      key={`${change.group}-${change.key}-${index}`}
                      title={getChangeDetail(change)}
                    >
                      {LABELS[change.key] ?? change.label} {displaySignedTenth(change.delta)}
                    </span>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        <div className="result-card__controls">
          <button type="button" onClick={onContinue}>확인</button>
        </div>
      </section>
    </div>
  );
}

function SaveModal({ game, onClose, onLoad }) {
  const [slots, setSlots] = useState(() => getSaveSlots());
  const saveAllowed = canManualSave(game);
  const saveSlot = (index) => {
    saveManual(index, game);
    setSlots(getSaveSlots());
  };
  return (
    <div className="overlay overlay--top">
      <section className="save-modal">
        <header>
          <div>
            <span className="eyebrow">로컬 저장</span>
            <h2>기록 보관함</h2>
          </div>
          <button type="button" onClick={onClose}>닫기</button>
        </header>
        <p>자동 저장은 선택 결과마다 갱신됩니다. 수동 저장은 하루가 시작될 때만 가능합니다.</p>
        <div className="slot-list">
          {slots.map((slot, index) => (
            <article className="save-slot" key={index}>
              <div>
                <strong>수동 기록 {index + 1}</strong>
                <span>{slot ? `${slot.state.day}일차 · ${slot.state.specialSeedName}` : "비어 있음"}</span>
              </div>
              <button type="button" disabled={!saveAllowed} onClick={() => saveSlot(index)}>저장</button>
              <button type="button" disabled={!slot} onClick={() => onLoad(index)}>불러오기</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function RulesModal({ game, tutorial, onClose, onTogglePassive, onEquipStigma }) {
  const ownedPassives = game.ownedPassiveIds ?? game.passiveIds ?? [];
  const ownedPrefixes = game.ownedStigmaPrefixIds ?? (game.stigma?.prefixId ? [game.stigma.prefixId] : []);
  const ownedSuffixes = game.ownedStigmaSuffixIds ?? (game.stigma?.suffixId ? [game.stigma.suffixId] : []);
  return (
    <div className="overlay overlay--top">
      <section className="rules-modal">
        <header>
          <div>
            <span className="eyebrow">{tutorial ? "튜토리얼 종료" : "규칙"}</span>
            <h2>{tutorial ? "이제부터의 기록" : "로젠탈에서 살아남는 법"}</h2>
          </div>
          <button type="button" onClick={onClose}>닫기</button>
        </header>

        <div className="rules-modal__guide">
          <article>
            <strong>당신이 처한 상황</strong>
            <p>당신은 매주 새 제물 후보에게 주어지는 로젠탈의 임시 영주 자리에 앉아 있다. 일곱째 밤까지 살아남으면 여덟째 날의 기록이 열린다.</p>
          </article>
          <article>
            <strong>해야 할 것</strong>
            <p>낮에는 영지를 관리하고 사람들을 알아간다. 밤에는 지하를 탐사하고, 귀환하기 전에 함께 내려간 사람에게 일어난 일을 책임져야 한다.</p>
          </article>
          <article>
            <strong>성향</strong>
            <p>성향은 선택의 누적 기록이다. 높은 성향은 관련 선택을 끌어오고 직업·성흔·사건의 조건을 바꾸지만, 숫자가 높다는 사실만으로 정답이 되지는 않는다.</p>
          </article>
        </div>

        <section className="loadout-section">
          <div>
            <span className="eyebrow">패시브 장착</span>
            <strong>{game.passiveIds?.length ?? 0} / 3</strong>
          </div>
          <p>보유한 패시브 가운데 세 개까지 직접 장착한다.</p>
          <div className="loadout-list">
            {ownedPassives.map((id) => {
              const passive = PASSIVES.find((item) => item.id === id);
              const active = game.passiveIds?.includes(id);
              return (
                <button className={active ? "is-equipped" : ""} type="button" key={id} onClick={() => onTogglePassive(id)} title={passive?.description}>
                  <strong>{passive?.name}</strong>
                  <small>{passive?.description}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section className="loadout-section">
          <span className="eyebrow">성흔 장착</span>
          <p>획득한 접두 성흔과 접미 성흔을 각각 하나씩 장착한다.</p>
          <div className="stigma-loadout">
            <div>
              <strong>접두</strong>
              {ownedPrefixes.length === 0 && <small>아직 획득하지 않음</small>}
              {ownedPrefixes.map((id) => {
                const stigma = STIGMA_PREFIXES.find((item) => item.id === id);
                return <button className={game.stigma?.prefixId === id ? "is-equipped" : ""} type="button" key={id} onClick={() => onEquipStigma("prefixId", id)} title={stigma?.description}>{stigma?.name}</button>;
              })}
            </div>
            <div>
              <strong>접미</strong>
              {ownedSuffixes.length === 0 && <small>아직 획득하지 않음</small>}
              {ownedSuffixes.map((id) => {
                const stigma = STIGMA_SUFFIXES.find((item) => item.id === id);
                return <button className={game.stigma?.suffixId === id ? "is-equipped" : ""} type="button" key={id} onClick={() => onEquipStigma("suffixId", id)} title={stigma?.description}>{stigma?.name}</button>;
              })}
            </div>
          </div>
        </section>

        <CharacterPanel game={game} />
      </section>
    </div>
  );
}

function TransitionOverlay({ onContinue }) {
  return (
    <div className="time-transition time-transition--nightfall">
      <span className="time-transition__orb time-transition__sun" aria-hidden="true" />
      <div className="time-transition__copy">
        <span>저녁이 끝났다</span>
        <h2>해가 떨어진다.</h2>
        <p>마지막 햇빛이 사라지자 지하에서 문 두드리는 소리가 들린다.</p>
        <button type="button" onClick={onContinue}>밤을 맞는다</button>
      </div>
    </div>
  );
}

function StartScreen({ hasContinue, onContinue, onNew }) {
  return (
    <div className="start-screen">
      <img className="start-screen__image" src="./assets/eldroa-estate-day.jpg" alt="" />
      <div className="start-screen__veil" />
      <section>
        <h1 style={{ marginBottom: "64px" }}>로젠탈 관리일지</h1>
        <div>
          {hasContinue && <button type="button" onClick={onContinue}>지난 꿈을 이어간다</button>}
          <button type="button" onClick={onNew}>잠에서 깨어난다</button>
        </div>
      </section>
    </div>
  );
}

function getDayNarration(game) {
  if (game.day !== 1) return ["선택한 행동은 오늘 다시 고를 수 없다."];
  if (game.dayTurn === 0) return DAY_OPENING_SCRIPT;
  if (game.dayTurn === 1) return DAY_INTERLUDES[0].paragraphs;
  if (game.dayTurn === 3) return DAY_INTERLUDES[1].paragraphs;
  if (game.dayTurn === 4) return DAY_INTERLUDES[2].paragraphs;
  return ["선택한 행동은 오늘 다시 고를 수 없다."];
}

function App() {
  const saved = useMemo(() => loadAutoSave(), []);
  const [game, setGame] = useState(() => saved.phase === "start" ? createStartState() : saved);
  const [showStart, setShowStart] = useState(true);
  const [saveOpen, setSaveOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [tutorialPrompt, setTutorialPrompt] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!showStart && game.phase !== "start") saveAuto(game);
  }, [game, showStart]);

  useEffect(() => {
    if (!showStart && game.day === 2 && game.phase === "day" && !game.tutorialSummarySeen) {
      setTutorialPrompt(true);
      setRulesOpen(true);
    }
  }, [game.day, game.phase, game.tutorialSummarySeen, showStart]);

  const isNight = isNightDisplayPhase(game);
  const estateState = getEstatePresentation(game, isNight);
  const animate = (id, action) => {
    if (selectedId) return;
    setSelectedId(id);
    window.setTimeout(() => {
      setGame(action);
      setSelectedId(null);
    }, 150);
  };

  const newGame = () => {
    clearAutoSave();
    setGame(createNewRun({ second: new Date().getSeconds() }));
    setShowStart(false);
    setRulesOpen(false);
    setTutorialPrompt(false);
  };
  const loadSlot = (index) => {
    const loaded = loadManual(index);
    if (loaded) {
      setGame(loaded);
      setShowStart(false);
      setSaveOpen(false);
      setRulesOpen(false);
      setTutorialPrompt(false);
    }
  };

  const closeRules = () => {
    setRulesOpen(false);
    if (tutorialPrompt) {
      setTutorialPrompt(false);
      setGame((current) => ({ ...current, tutorialSummarySeen: true }));
    }
  };

  const togglePassive = (passiveId) => {
    setGame((current) => {
      const active = current.passiveIds ?? [];
      if (active.includes(passiveId)) {
        return { ...current, passiveIds: active.filter((id) => id !== passiveId) };
      }
      if (active.length >= 3) return current;
      return { ...current, passiveIds: [...active, passiveId] };
    });
  };

  const equipStigma = (slot, stigmaId) => {
    setGame((current) => ({ ...current, stigma: { ...current.stigma, [slot]: stigmaId } }));
  };

  if (showStart) {
    return <StartScreen hasContinue={game.phase !== "start"} onContinue={() => setShowStart(false)} onNew={newGame} />;
  }

  const mainContent = (() => {
    if (game.phase === "seed-reveal") {
      return (
        <SeedRevealModal
          name={game.specialSeedName}
          rule={game.specialSeedRule}
          onContinue={() => setGame(beginPrologue(game))}
        />
      );
    }
    if (game.phase === "prologue") {
      return (
        <DialogueCard
          game={game}
          eyebrow={PROLOGUE.tag}
          paragraphs={PROLOGUE.text.map((text, index) => ({ text, speaker: PROLOGUE.speakers[index] ?? "unknown" }))}
          button="영주의 자리에 앉는다"
          onContinue={() => setGame(openFirstDay(game))}
        />
      );
    }
    if (game.phase === "special-event") {
      const group = getSpecialGroup(game);
      const stage = group.stages[game.specialProgress];
      return (
        <ChoicePanel
          game={game}
          eyebrow={`특수 사건 · ${group.name}`}
          title={stage.title}
          text={stage.text}
          choices={stage.options.map((choice) => {
            const effectiveChance = getEffectiveChoiceChance({ ...game, phase: "event" }, choice.chance, { ...choice, tone: "extreme" });
            return effectiveChance == null
              ? choice
              : { ...choice, detail: `\uc131\uacf5\ub960 ${displayChancePercent(effectiveChance)}%` };
          })}
          selectedId={selectedId}
          onChoose={(choice) => animate(choice.id, (current) => chooseSpecialEvent(current, choice))}
        />
      );
    }
    if (game.phase === "day") {
      const choices = getDayOffers(game).map((choice) => ({
        ...choice,
        categoryLabel: {
          gathering: "자원 채집",
          interaction: "NPC 상호작용",
          investigation: "조사",
          training: "수련",
          rest: "휴식",
          other: "기타",
        }[choice.category],
      }));
      return (
        <ChoicePanel
          game={game}
          eyebrow={`${game.day}일차 · 낮 ${game.dayTurn + 1} / 5`}
          title="영주의 일을 선택한다"
          text={getDayNarration(game)}
          choices={choices}
          selectedId={selectedId}
          onChoose={(choice) => animate(choice.id, (current) => chooseDayAction(current, choice))}
          footer={<button className="forfeit-button" type="button" title="오늘의 결정을 미룬다. 영지 안정도와 신뢰가 감소하고 공포가 늘어난다." onClick={() => animate("day-forfeit", forfeitDay)}>포기한다</button>}
        />
      );
    }
    if (game.phase === "night-companion") {
      const companions = getCompanionOffers(game).map((person) => ({
        ...person,
        detail: person.kind === "unnamed" ? "이름 없는 인원 · 보충되지 않음" : person.relation,
      }));
      return (
        <ChoicePanel
          game={game}
          eyebrow={`${game.day}번째 밤 · 진입 준비`}
          title="누구와 내려가겠습니까?"
          text={NIGHT_ENTRY_SCRIPT}
          choices={companions}
          selectedId={selectedId}
          onChoose={(choice) => animate(choice.id, (current) => selectCompanion(current, choice.id))}
          footer={<button className="forfeit-button" type="button" title="오늘 밤 지하에 들어가지 않는다. 지하 진입 포기 횟수가 누적된다." onClick={() => animate("skip-night", skipNightEntry)}>지하에 들어가지 않는다</button>}
        />
      );
    }
    if (game.phase === "night-direction") {
      const choices = getDirectionOffers().map((direction) => ({ ...direction, detail: direction.text }));
      return (
        <ChoicePanel
          game={game}
          eyebrow={`${game.day}번째 밤 · 진입 방향`}
          title="어느 길을 택하겠습니까?"
          text="방향과 이번 기록의 내부 난수가 탐사의 길이를 정한다."
          choices={choices}
          selectedId={selectedId}
          onChoose={(choice) => animate(choice.id, (current) => startExpedition(current, choice.id))}
        />
      );
    }
    if (game.phase === "expedition") {
      const event = getCurrentExplorationEvent(game);
      const choices = getExplorationOptions(event).map((choice) => {
        const available = isExplorationOptionAvailable(game, choice);
        const effectiveChance = getEffectiveChoiceChance({ ...game, phase: "night" }, choice.chance, choice);
        return {
          ...choice,
          available,
          unavailableReason: choice.requiresHealthyCompanion ? "정상 상태의 동행자가 필요하다" : undefined,
          detail: effectiveChance == null ? "확정 행동" : `성공률 ${displayChancePercent(effectiveChance)}%`,
          tone: choice.tone ?? ((effectiveChance ?? 1) < 0.7 ? "danger" : "neutral"),
        };
      });
      return (
        <ChoicePanel
          game={game}
          eyebrow={`밤 탐사 · ${game.expedition.stepIndex + 1} / ${game.expedition.totalSteps}`}
          title={event.title}
          text={event.text}
          choices={choices}
          selectedId={selectedId}
          onChoose={(choice) => animate(choice.id, (current) => chooseExplorationOption(current, event, choice))}
          footer={<button className="forfeit-button" type="button" title="현재 탐사를 중단하고 귀환한다. 일반 포기 횟수가 누적된다." onClick={() => animate("retreat", retreatExpedition)}>포기하고 귀환한다</button>}
        />
      );
    }
    if (game.phase === "finale") {
      const currentFinale = getCurrentFinale(game);
      const choices = getFinaleOptions(game, currentFinale).map((choice) => {
        const effectiveChance = getEffectiveChoiceChance({ ...game, phase: "night" }, choice.chance, choice);
        return {
          ...choice,
          preview: exactOptionPreview(game, choice),
          tone: choice.intentionalLoss ? "lethal" : (effectiveChance ?? 1) < 0.7 ? "danger" : "extreme",
        };
      });
      return (
        <ChoicePanel
          game={game}
          eyebrow={`최종 ${currentFinale.kind === "combat" ? "전투" : "퍼즐"}`}
          title={currentFinale.title}
          text={currentFinale.text}
          choices={choices}
          selectedId={selectedId}
          onChoose={(choice) => animate(choice.id, (current) => chooseFinaleOption(current, currentFinale, choice))}
        />
      );
    }
    if (game.phase === "keepsake-delivery") {
      return (
        <ChoicePanel
          game={game}
          eyebrow="낮 · NPC 상호작용"
          title="유품을 누구에게 전달합니까?"
          text="전달 대상은 이후 관계와 사건을 바꾸지만 제물 수치는 바꾸지 않는다."
          choices={[
            { id: "family", label: "가족에게 전달한다", tone: "neutral" },
            { id: "colleagues", label: "동료에게 전달한다", tone: "neutral" },
          ]}
          selectedId={selectedId}
          onChoose={(choice) => animate(choice.id, (current) => deliverKeepsake(current, choice.id))}
        />
      );
    }
    if (game.phase === "transformed-choice") {
      const person = game.companionStates[game.selectedTransformedId];
      return (
        <ChoicePanel
          game={game}
          eyebrow="낮 · 변질된 사람"
          title={displayCompanion(person)}
          text="처치하는 순간 제물로 계산되고 유품을 얻는다. 살려두면 이후 사건에서 다시 나타날 수 있다."
          choices={[
            { id: "spare", label: "살려둔다", tone: "extreme" },
            { id: "kill", label: "처치한다", tone: "lethal" },
          ]}
          selectedId={selectedId}
          onChoose={(choice) => animate(choice.id, (current) => chooseTransformedFate(current, choice.id))}
        />
      );
    }
    if (game.phase === "escape-transformed-choice") {
      const person = game.companionStates[game.selectedCompanionId];
      return (
        <ChoicePanel
          game={game}
          eyebrow="귀환 직전 · 변질된 동행자"
          title={displayCompanion(person)}
          text="귀환로는 열려 있다. 이 상태로 지상에 데려갈지, 여기서 끝낼지 결정해야 한다."
          choices={[
            { id: "spare", label: "손을 놓지 않고 함께 탈출한다", tone: "extreme" },
            { id: "kill", label: "탈출하기 전에 처치한다", tone: "lethal" },
          ]}
          selectedId={selectedId}
          onChoose={(choice) => animate(choice.id, (current) => chooseEscapeTransformedFate(current, choice.id))}
        />
      );
    }
    if (game.phase === "day-eight") {
      return (
        <DialogueCard
          game={game}
          eyebrow={`8일차 · ${game.route === "altered" ? "변질 축" : "정상 축"}`}
          title={game.route === "altered" ? "지하의 존재들이 영주를 맞이한다." : "로젠탈에 여덟째 날이 왔다."}
          paragraphs={getDayEightScript(game)}
          button="기록을 확인한다"
          onContinue={() => setGame(finishVerticalSlice(game))}
          danger={game.route === "altered"}
        />
      );
    }
    if (game.phase === "record-stop") {
      return (
        <DialogueCard
          game={game}
          eyebrow="수직 완성본 · 기록 중단"
          title="이 기록은 여기서 끊겨 있다."
          paragraphs={[
            `열린 축 · ${game.route === "altered" ? "변질 축" : "정상 축"}`,
            `■■ ${game.sacrificeCount} / 3`,
            `진실 단서 · ${game.truthFlags.truthDiscovered ? "확인함" : "확인하지 못함"}`,
            `선택 기록 · ${game.history.length}개`,
          ]}
          button="새 기록을 시작한다"
          onContinue={newGame}
        />
      );
    }
    if (game.phase === "ending") {
      const ending = getEnding(game);
      return (
        <DialogueCard
          game={game}
          eyebrow="엔딩"
          title={ending.title}
          paragraphs={ending.text}
          button={game.endingId === "health-death" ? "다시 시작" : "꿈을 되돌린다"}
          onContinue={newGame}
          danger
        />
      );
    }
    return null;
  })();

  const dayPeriod = game.dayTurn < 2 ? "오전" : game.dayTurn < 4 ? "오후" : "저녁";
  const phaseLabel = isNight ? "밤" : game.phase === "day" ? dayPeriod : "기록";
  const phaseProgress = game.phase === "day"
    ? `${Math.min(game.dayTurn + 1, 5)} / 5`
    : game.phase === "expedition"
      ? `${game.expedition.stepIndex + 1} / ${game.expedition.totalSteps}`
      : "—";
  const headerTitle = isNight ? `${game.day}번째 밤` : `기록 ${game.day}일차`;

  return (
    <main className={`app-shell ${isNight ? "theme-night" : "theme-day"}`}>
      <HorrorTextOverlay game={game} isNight={isNight} />
      <header className="topbar">
        <div className="brand">
          <span className="brand__crest">{isNight ? "夜" : "R"}</span>
          <div>
            <p>{isNight ? "THE HOUSE IS STILL KIND" : "A KIND WORLD AWAITS"}</p>
            <h1>{headerTitle}</h1>
          </div>
        </div>
        <div className="phase-clock">
          <span>{phaseLabel}</span>
          <strong>{phaseProgress}</strong>
          <em>{game.day}일차</em>
        </div>
        <div className="topbar__actions">
          <div className="sacrifice-counter">
            <span>■■</span>
            <strong>{game.sacrificeCount ?? 0} / 3</strong>
          </div>
          <button type="button" onClick={() => setRulesOpen(true)}>규칙</button>
          <button type="button" onClick={() => setSaveOpen(true)}>저장 기록</button>
          <button type="button" onClick={() => setShowStart(true)}>첫 화면</button>
        </div>
      </header>

      <section className="resource-strip" aria-label="영지 현황">
        {Object.keys(RESOURCE_META).map((key) => (
          <ResourceCard
            key={key}
            statKey={key}
            value={game.resources?.[key] ?? 0}
            isNight={isNight}
            revealed
          />
        ))}
      </section>

      <div className="dashboard">
        <div className="estate-column">
          <SceneImage isNight={isNight} estateState={estateState} />
          <section className={`estate-report estate-report--${estateState.tone}`}>
            <div>
              <span className="eyebrow">영지 상태</span>
              <h2>{estateState.name}</h2>
            </div>
            <p>{estateState.script}</p>
          </section>
        </div>
        <section className="action-column" key={`${game.phase}-${game.day}-${game.dayTurn}-${game.expedition?.stepIndex ?? 0}`}>
          {mainContent}
        </section>
        <CharacterPanel game={game} />
      </div>

      {game.phase === "nightfall-transition" && <TransitionOverlay onContinue={() => setGame(completeTransition(game))} />}
      <ResultOverlay game={game} result={game.phase === "result" ? game.pendingResult : null} onContinue={() => setGame(continueAfterResult(game))} />
      {rulesOpen && (
        <RulesModal
          game={game}
          tutorial={tutorialPrompt}
          onClose={closeRules}
          onTogglePassive={togglePassive}
          onEquipStigma={equipStigma}
        />
      )}
      {saveOpen && <SaveModal game={game} onClose={() => setSaveOpen(false)} onLoad={loadSlot} />}
    </main>
  );
}

export default App;

function exactOptionPreview(game, choice) {
  const chance = getEffectiveChoiceChance({ ...game, phase: "night" }, choice.chance, choice);
  const resolved = resolveChoice({ ...game, phase: "night" }, {
    ...choice,
    id: `preview-${choice.id}`,
    successChance: null,
    stats: choice.success?.stats,
    resources: choice.success?.resources,
    estate: choice.success?.estate,
    traits: choice.success?.traits,
  });
  const effects = {
    stats: resolved.displayDeltas.stats,
    resources: resolved.displayDeltas.resources,
    estate: resolved.displayDeltas.estate,
    traits: resolved.displayDeltas.traits,
  };
  const deltas = Object.entries(effects).flatMap(([group, values]) =>
    Object.entries(values ?? {}).map(([key, value]) => `${LABELS[key] ?? key} ${displaySignedTenth(value)}`),
  );
  if (choice.intentionalLoss) deltas.push("\ub3d9\ud589\uc790 \uc601\uad6c \uc2e4\uc885");
  return [chance == null ? null : `\uc131\uacf5\ub960 ${displayChancePercent(chance)}%`, ...deltas].filter(Boolean).join(" \u00b7 " );
}
