import { useEffect, useMemo, useState } from "react";
import {
  assessChoice,
  clampMap,
  createInitialGame,
  deriveStigma,
  getDayOffers,
  getCriticalState,
  getEstateState,
  getJob,
  getJobStatDelta,
  hasPeacefulLordEnding,
  getNightOffers,
  getPassive,
  getStigmaName,
  getTitle,
  getTitles,
  resolveChoice,
} from "./engine/rulesEngine";
import { RESOURCE_META, STAT_META, TRAIT_META } from "./rules/systemRules";
import {
  DAY_INTERLUDES,
  DAY_OPENING_SCRIPT,
  DAY_PERIODS,
  ENDINGS,
  FORFEIT_RESULTS,
  NIGHT_ENTRY_SCRIPT,
  PROLOGUE,
  WORKER_NAME_CHOICES,
} from "./rules/tutorialRules";

const STORAGE_KEY = "eldroa-estate-run-v9";

const ESTATE_META = {
  stability: { label: "안정도" },
  trust: { label: "주민 신뢰" },
  recordIntegrity: { label: "장부 상태" },
  corruption: { label: "이상 징후" },
  missing: { label: "실종자" },
};

function withTopicParticle(word) {
  if (!word) return word;
  const lastCode = word.charCodeAt(word.length - 1);
  const hasFinalConsonant = lastCode >= 0xac00 && lastCode <= 0xd7a3 && (lastCode - 0xac00) % 28 !== 0;
  return `${word}${hasFinalConsonant ? "은" : "는"}`;
}

function loadGame() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createInitialGame();
    const parsed = JSON.parse(saved);
    return parsed.version === 9 ? parsed : createInitialGame();
  } catch {
    return createInitialGame();
  }
}

function getResourceTrace(statKey, isNight) {
  const labels = {
    food: "식량",
    timber: "목재",
    silver: "은화",
    salt: "소금",
    population: "인구",
    faith: "신앙",
    fear: "공포",
  };
  return isNight ? `${labels[statKey]} 기록 없음` : `${labels[statKey]} 보고 전`;
}

function ResourceCard({ statKey, value, isNight, revealed }) {
  const meta = RESOURCE_META[statKey];
  return (
    <article className={`resource-card resource-card--${statKey}`}>
      <span>{meta.icon}</span>
      <small>{meta.label}</small>
      <strong>{revealed ? value : "?"}</strong>
      <em>{getResourceTrace(statKey, isNight)}</em>
    </article>
  );
}

function EstateScene({ isNight, estateState }) {
  return (
    <section className={`estate-scene ${isNight ? "estate-scene--night" : ""}`}>
      <img
        className="estate-scene__image"
        src="/assets/eldroa-estate-day.jpg"
        alt={isNight ? "밤의 엘드로아 영지 전경" : "낮의 엘드로아 영지 전경"}
        decoding="async"
        fetchPriority="high"
      />
      <div className="estate-scene__shade" />
      <div className="estate-scene__caption">
        <span>영지의 취급 · 일반 영지</span>
        <strong>{estateState.name}</strong>
        <p>{isNight ? "저택의 불이 대부분 꺼져 있다." : "영지는 평온하다."}</p>
      </div>
    </section>
  );
}

function CharacterPanel({ game }) {
  const isRevealed = game.day > 1 || game.phase === "night" || game.phase === "worker-name" || game.phase === "ending";
  const isDayGuide = game.phase === "day";
  const showRuleDescriptions = game.phase === "day" || game.phase === "ending";
  const job = getJob(game);
  const rankedTraits = Object.entries(game.traits)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4);

  return (
    <aside className={`character-panel ${isRevealed ? "is-revealed" : ""}`}>
      <div className="character-panel__head">
        <div className="portrait-placeholder">
          <span>{isRevealed ? "영주" : "?"}</span>
        </div>
        <div>
          <span className="eyebrow">시드</span>
          <h2>이세계에 떨어진 영주</h2>
          <p className="seed-text">{game.runSeed.slice(0, 18)}</p>
        </div>
      </div>

      <div className="stat-grid">
        {Object.entries(game.stats).map(([id, value]) => (
          <div key={id} className={value < 0 ? "is-negative" : ""}>
            <span>{STAT_META[id]?.label ?? id}</span>
            <strong>{isRevealed ? value : "?"}</strong>
          </div>
        ))}
      </div>

      <div className="rule-block">
        <span className="eyebrow">성향</span>
        <div className="rule-chip-list">
          {rankedTraits.map(([id, value]) => (
            <span key={id}>
              {TRAIT_META[id].label} {isRevealed ? value : "?"}
            </span>
          ))}
        </div>
      </div>

      <div className="rule-block">
        <span className="eyebrow">직업</span>
        <strong>{game.phase === "ending" ? job.name : "아직 정해지지 않음"}</strong>
        {game.phase === "ending" && <small>{job.title}</small>}
        {isDayGuide && <small>낮에 익힌 행동은 이후 선택에 영향을 줍니다.</small>}
      </div>

      <div className="rule-block">
        <span className="eyebrow">칭호</span>
        <div className="rule-chip-list">
          {game.titles.length === 0
            ? <span>아직 얻은 칭호 없음</span>
            : game.titles.map((id) => <span key={id}>{getTitle(id)?.name}</span>)}
        </div>
      </div>

      <div className="rule-block stigma-pair">
        <span className="eyebrow">성흔</span>
        <strong>{getStigmaName(game)}</strong>
        {isDayGuide && <small>밤이 지나면 두 개의 성흔이 남습니다.</small>}
      </div>

      <div className="rule-block">
        <span className="eyebrow">패시브 · 1 · 2 · 3</span>
        <ol className="passive-list">
          {game.passiveIds.map((id) => (
            <li key={id}>
              <strong>{getPassive(id)?.name}</strong>
              {showRuleDescriptions && <small>{getPassive(id)?.description}</small>}
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}

function DialogueBox({ context, lines, onComplete, completeLabel = "계속" }) {
  const [lineIndex, setLineIndex] = useState(0);
  const line = lines[Math.min(lineIndex, lines.length - 1)];
  const isLast = lineIndex >= lines.length - 1;

  function advance() {
    if (isLast) onComplete?.();
    else setLineIndex((index) => index + 1);
  }

  return (
    <section className="dialogue-box">
      <div className="dialogue-box__head">
        <span>{context}</span>
        <span>{lineIndex + 1} / {lines.length}</span>
      </div>
      <strong className="dialogue-box__speaker">{line?.speaker ?? "서술"}</strong>
      <p>{line?.text}</p>
      {(!isLast || onComplete) && (
        <button type="button" onClick={advance}>{isLast ? completeLabel : "다음"}</button>
      )}
    </section>
  );
}

function StateChangeOverlay({ result, estateState, isNight, onContinue }) {
  return (
    <div className={`state-change-overlay state-change-overlay--${result.assessment.id}`}>
      <section className="state-change-card">
        <span className="eyebrow">상태 변경</span>
        {!isNight && (
          <div className="state-change-card__item">
            <small>선택 평가</small>
            <strong>{result.assessment.label}</strong>
            <p>{result.assessment.script}</p>
          </div>
        )}
        <div className={`state-change-card__item state-change-card__item--${estateState.tone}`}>
          <small>영지 상태</small>
          <strong>{estateState.name}</strong>
          <p>{estateState.script}</p>
        </div>
        {!isNight && result.ruleTrace?.length > 0 && (
          <p className="state-change-card__trace">적용 순서 · {result.ruleTrace.join(" · ")}</p>
        )}
        {result.changes?.length > 0 && (
          <div className="parameter-changes">
            <small>조정된 파라미터</small>
            <ul>
              {result.changes.map((change, index) => (
                <li className={change.delta > 0 ? "is-increase" : "is-decrease"} key={`${change.group}-${change.id}-${index}`}>
                  <span>{change.group} · {change.label}</span>
                  <strong>{change.delta > 0 ? "증가" : "감소"} {change.arrows}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
        {result.notices?.length > 0 && (
          <div className="effect-notices">
            {result.notices.map((notice, index) => <span key={`${notice}-${index}`}>{notice}</span>)}
          </div>
        )}
        <button type="button" onClick={onContinue}>확인</button>
      </section>
    </div>
  );
}

function ResultSequence({ result, estateState, isNight, onContinue }) {
  const [stage, setStage] = useState("dialogue");
  if (!result) return null;
  if (stage === "status") {
    return <StateChangeOverlay result={result} estateState={estateState} isNight={isNight} onContinue={onContinue} />;
  }
  return (
    <div className={`result-overlay result-overlay--${result.assessment.id}`}>
      <div className="result-dialogue">
        <DialogueBox
          context={result.label}
          lines={[{ speaker: "선택 이후", text: result.result }]}
          onComplete={() => setStage("status")}
          completeLabel="상태 확인"
        />
      </div>
    </div>
  );
}

function PrologueOverlay({ onContinue }) {
  return (
    <div className="prologue-overlay">
      <section>
        <span className="eyebrow">{PROLOGUE.tag}</span>
        <h2>{PROLOGUE.title}</h2>
        {PROLOGUE.text.map((line, index) => <p key={`${index}-${line}`}>{line}</p>)}
        <button type="button" onClick={onContinue}>영주의 자리에 앉는다</button>
      </section>
    </div>
  );
}

function NightfallOverlay({ onContinue }) {
  return (
    <div className="nightfall-overlay">
      <div className="nightfall-overlay__sun" />
      <div className="nightfall-overlay__copy">
        <span>저녁이 끝났다</span>
        <h2>해가 졌다.</h2>
        <p>해가 지자 메이드가 찾아왔다. 준비를 마친 사람처럼 태연한 얼굴이었다.</p>
        <button type="button" onClick={onContinue}>지하로 내려갈 준비를 한다</button>
      </div>
    </div>
  );
}

function DayInterludeOverlay({ interlude, onContinue }) {
  if (!interlude) return null;
  return (
    <div className="day-interlude-overlay">
      <section>
        <div className="day-interlude-overlay__head">
          <span className="eyebrow">{interlude.tag}</span>
          <h2>{interlude.title}</h2>
        </div>
        <div className="day-interlude-overlay__paragraphs">
          {interlude.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
        <button type="button" onClick={onContinue}>{interlude.button}</button>
      </section>
    </div>
  );
}

function DaybreakOverlay({ game, onContinue }) {
  const nightLine = game.nightChoiceId === "night-forfeit"
    ? "당신은 지하로 내려가지 않았다."
    : game.lostTarget
      ? `${withTopicParticle(game.lostTarget)} 돌아오지 않았다.`
      : "당신은 혼자 돌아왔다.";
  return (
    <div className="state-change-overlay daybreak-overlay">
      <section className="state-change-card">
        <span className="eyebrow">{game.day}일차 종료</span>
        <h2>아침이 온다.</h2>
        <p>{nightLine}</p>
        <p>저택의 사람들은 평소처럼 다음 날의 일을 준비한다.</p>
        <button type="button" onClick={onContinue}>{game.day + 1}일차 시작</button>
      </section>
    </div>
  );
}

function EndingOverlay({ ending, game, onReset }) {
  if (!ending) return null;
  return (
    <div className="ending-overlay">
      <section>
        <span className="eyebrow">{ending.tag}</span>
        <h2>{ending.title}</h2>
        <strong>{ending.subtitle}</strong>
        <div className="ending-overlay__text">
          {ending.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
        <div className="ending-overlay__record">
          <span>경과 · {game.day}일</span>
          <span>지하 진입 포기 · {game.nightForfeitCount}회</span>
          <span>0 미만 기록 · 없음</span>
        </div>
        <button type="button" onClick={onReset}>새 시드로 시작</button>
      </section>
    </div>
  );
}

function GameOverOverlay({ onReset }) {
  return (
    <div className="game-over-overlay">
      <section>
        <span className="eyebrow">게임 종료</span>
        <h2>당신은 돌아오지 못했다.</h2>
        <p>체력이 영 아래로 떨어졌다. 영지는 다음 영주를 기다린다.</p>
        <button type="button" onClick={onReset}>새 시드로 시작</button>
      </section>
    </div>
  );
}

function remainsNonnegative(current, delta) {
  return Object.entries(delta).every(([key, value]) => (current[key] ?? 0) + value >= 0);
}

function getArrows(delta) {
  const count = Math.abs(delta) >= 6 ? 3 : Math.abs(delta) >= 3 ? 2 : 1;
  return (delta > 0 ? "▲" : "▼").repeat(count);
}

function getMapChanges(before, after, meta, group) {
  return Object.keys(after).flatMap((id) => {
    const delta = (after[id] ?? 0) - (before[id] ?? 0);
    if (delta === 0) return [];
    return [{
      id,
      group,
      label: meta[id]?.label ?? id,
      delta,
      arrows: getArrows(delta),
    }];
  });
}

function getAffinityChanges(before, after) {
  const meta = Object.fromEntries(Object.keys(after).map((id) => [id, { label: `${id} 호감도` }]));
  return getMapChanges(before, after, meta, "인물");
}

function applyResolvedChoice(current, choice, extra = {}) {
  const resolved = resolveChoice(current, choice);
  const assessment = assessChoice(choice, resolved);
  const nextTraits = clampMap(current.traits, resolved.traitDelta, -99, 99);
  const nextStats = clampMap(current.stats, resolved.statDelta, -99, 999);
  const nextAffinities = clampMap(current.affinities, resolved.affinityDelta, -99, 99);
  const nextResources = clampMap(current.resources, resolved.resourceDelta);
  const nextEstate = clampMap(current.estate, resolved.estateDelta, 0, 100);
  const stayedNonnegative =
    current.stayedNonnegative
    && remainsNonnegative(current.resources, resolved.resourceDelta)
    && remainsNonnegative(current.estate, resolved.estateDelta)
    && remainsNonnegative(current.traits, resolved.traitDelta)
    && remainsNonnegative(current.stats, resolved.statDelta);
  const changes = [
    ...getMapChanges(current.stats, nextStats, STAT_META, "능력치"),
    ...getMapChanges(current.resources, nextResources, RESOURCE_META, "자원"),
    ...getMapChanges(current.estate, nextEstate, ESTATE_META, "영지"),
    ...getMapChanges(current.traits, nextTraits, TRAIT_META, "성향"),
    ...getAffinityChanges(current.affinities, nextAffinities),
  ];
  const criticalState = getCriticalState(nextStats, current.phase);
  return {
    ...current,
    ...extra,
    stayedNonnegative,
    resources: nextResources,
    estate: nextEstate,
    traits: nextTraits,
    stats: nextStats,
    affinities: nextAffinities,
    nextTurn: resolved.nextTurn,
    ruleTrace: resolved.traceLabels,
    pendingGameOver: criticalState.gameOver ? "health" : null,
    forcedReturn: criticalState.forcedReturn,
    assessments: {
      ...current.assessments,
      [assessment.id]: (current.assessments[assessment.id] ?? 0) + 1,
    },
    counters: {
      ...current.counters,
      choices: current.counters.choices + 1,
      physicalDamage: current.counters.physicalDamage + (choice.event === "physical-damage" ? 1 : 0),
    },
    history: [
      ...current.history,
      {
        day: current.day,
        phase: current.phase,
        choiceId: choice.id,
        label: choice.label ?? choice.title,
        event: choice.event,
        assessment: assessment.id,
      },
    ],
    pendingResult: {
      label: choice.label ?? choice.title,
      tone: choice.tone,
      result: resolved.result ?? choice.result,
      ruleTrace: resolved.traceLabels,
      changes,
      notices: resolved.traceLabels
        .filter((label) => label !== "성향")
        .map((label) => label.startsWith("패시브 ") ? `${label} 적용` : label),
      assessment,
    },
  };
}

function App() {
  const [game, setGame] = useState(loadGame);
  const [isCharacterOpen, setIsCharacterOpen] = useState(false);
  const [dismissedSceneKey, setDismissedSceneKey] = useState(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState(null);

  const isNight = ["nightfall", "night", "worker-name", "daybreak"].includes(game.phase);
  const estateState = useMemo(() => getEstateState(game), [game]);
  const offers = useMemo(
    () => game.phase === "day" ? getDayOffers(game) : game.phase === "night" ? getNightOffers(game) : [],
    [game],
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game]);

  function startTutorial() {
    setGame((current) => ({ ...current, phase: "day", step: 0 }));
  }

  function animateChoice(choiceId, commit) {
    if (selectedChoiceId) return;
    setSelectedChoiceId(choiceId);
    window.setTimeout(() => {
      commit();
      setSelectedChoiceId(null);
    }, 180);
  }

  function chooseDayAction(action) {
    if (!action.available) return;
    animateChoice(action.id, () => {
      setGame((current) => applyResolvedChoice(current, action, {
        chosenDayActionIds: [...current.chosenDayActionIds, action.id],
        unlockedNightChoiceIds: [...new Set([...current.unlockedNightChoiceIds, ...action.unlocks])],
      }));
    });
  }

  function chooseNightAction(choice) {
    if (!choice.available) return;
    animateChoice(choice.id, () => {
      setGame((current) => {
        const next = applyResolvedChoice(current, choice, {
          lostTarget: choice.kind === "self" ? null : choice.target,
          lostKind: choice.kind,
          playerMarked: choice.kind === "self",
          nightChoiceId: choice.id,
        });
        const isNewJob = !next.jobId;
        const job = getJob(next);
        const rawJobDelta = getJobStatDelta(job.id);
        const jobDelta = current.stats.insight < 0
          ? Object.fromEntries(Object.entries(rawJobDelta).map(([key, value]) => [key, value > 0 ? -value : value]))
          : rawJobDelta;
        const jobStats = isNewJob
          ? clampMap(next.stats, jobDelta, -99, 999)
          : next.stats;
        const withJob = {
          ...next,
          jobId: job.id,
          stats: jobStats,
          stayedNonnegative: next.stayedNonnegative && (!isNewJob || remainsNonnegative(next.stats, jobDelta)),
        };
        const stigma = deriveStigma(withJob);
        const withStigma = { ...withJob, stigma };
        const notices = [...(next.pendingResult.notices ?? [])];
        const changes = [...(next.pendingResult.changes ?? [])].filter((change) => change.group !== "능력치");
        if (isNewJob) {
          notices.push(`직업 · ${job.name} 획득`);
        }
        changes.unshift(...getMapChanges(current.stats, jobStats, STAT_META, "능력치"));
        if (getStigmaName(current) !== getStigmaName(withStigma)) {
          notices.push(`성흔 · ${getStigmaName(withStigma)} 획득`);
        }
        return {
          ...withStigma,
          pendingResult: { ...next.pendingResult, notices, changes },
        };
      });
    });
  }

  function chooseWorkerMemory(choice) {
    animateChoice(choice.id, () => {
      setGame((current) => applyResolvedChoice(current, choice, {
        rememberedWorker: choice.id === "remember-worker",
      }));
    });
  }

  function giveUp() {
    animateChoice("forfeit", () => {
      setGame((current) => {
        const night = current.phase === "night";
        const choice = {
          id: night ? "night-forfeit" : `day-forfeit-${current.step}`,
          label: "포기한다",
          tone: "danger",
          isForfeit: true,
          event: "forfeit",
          traits: night ? { suspicion: 1 } : {},
          stats: night ? { stamina: -2 } : { stamina: -1 },
          resources: night ? { fear: 2, faith: -1 } : { silver: -4, fear: 2 },
          estate: night
            ? { stability: -1, trust: -1 }
            : { stability: -3, trust: -1, recordIntegrity: -1 },
          result: FORFEIT_RESULTS[night ? "night" : "day"],
        };
        const next = applyResolvedChoice(current, choice, night
          ? {
            lostTarget: null,
            lostKind: null,
            playerMarked: false,
            nightChoiceId: choice.id,
            nightForfeitCount: current.nightForfeitCount + 1,
          }
          : {});
        next.counters = { ...next.counters, forfeits: current.counters.forfeits + 1 };
        if (!night) next.dayForfeitCount = current.dayForfeitCount + 1;
        return next;
      });
    });
  }

  function finishNight(current) {
    if (hasPeacefulLordEnding(current)) {
      const ending = { ...current, phase: "ending", endingId: "peacefulLord", pendingResult: null };
      return { ...ending, titles: getTitles(ending) };
    }
    return { ...current, phase: "daybreak", pendingResult: null };
  }

  function continueAfterResult() {
    setGame((current) => {
      if (current.pendingGameOver === "health") {
        return { ...current, phase: "game-over", pendingResult: null, pendingGameOver: null, forcedReturn: null };
      }
      if (current.forcedReturn === "nightfall") {
        return { ...current, phase: "nightfall", pendingResult: null, forcedReturn: null };
      }
      if (current.forcedReturn === "daybreak") {
        return finishNight({ ...current, pendingResult: null, forcedReturn: null });
      }
      if (current.phase === "night" && current.nightChoiceId === "worker") {
        return { ...current, phase: "worker-name", pendingResult: null };
      }
      if (current.phase === "night" || current.phase === "worker-name") {
        return finishNight(current);
      }
      if (current.phase === "day") {
        const completedDayActions = current.chosenDayActionIds.length + current.dayForfeitCount;
        if (current.day === 1) {
          return { ...current, phase: "day-interlude", pendingResult: null };
        }
        if (completedDayActions >= 3) {
          return { ...current, phase: "nightfall", pendingResult: null };
        }
        return { ...current, step: current.step + 1, pendingResult: null };
      }
      return { ...current, step: current.step + 1, pendingResult: null };
    });
  }

  function continueAfterDayInterlude() {
    setGame((current) => {
      const completedDayActions = current.chosenDayActionIds.length + current.dayForfeitCount;
      if (completedDayActions >= 3) {
        return { ...current, phase: "nightfall" };
      }
      return { ...current, phase: "day", step: current.step + 1 };
    });
  }

  function beginNight() {
    setGame((current) => ({
      ...current,
      phase: "night",
      step: 0,
      stats: { ...current.stats, stamina: 10 },
    }));
  }

  function beginNextDay() {
    setGame((current) => ({
      ...current,
      day: current.day + 1,
      phase: "day",
      step: 0,
      chosenDayActionIds: [],
      dayForfeitCount: 0,
      unlockedNightChoiceIds: [],
      nightChoiceId: null,
      lostTarget: null,
      lostKind: null,
      playerMarked: false,
      pendingResult: null,
      pendingGameOver: null,
      forcedReturn: null,
      stats: { ...current.stats, stamina: 10 },
    }));
  }

  function resetGame() {
    localStorage.removeItem(STORAGE_KEY);
    setIsCharacterOpen(false);
    setDismissedSceneKey(null);
    setSelectedChoiceId(null);
    setGame(createInitialGame());
  }

  const dayActionCount = game.chosenDayActionIds.length + game.dayForfeitCount;
  const dayPeriodIndex = game.phase === "day-interlude"
    ? Math.max(dayActionCount - 1, 0)
    : Math.min(dayActionCount, DAY_PERIODS.length - 1);
  const dayPeriod = DAY_PERIODS[dayPeriodIndex];
  const dayInterlude = DAY_INTERLUDES[Math.max(dayActionCount - 1, 0)];
  const sceneKey = `${game.day}-${game.phase}-${game.step}`;
  const sceneDialogue = game.phase === "day" && game.day === 1 && game.step === 0
    ? DAY_OPENING_SCRIPT
    : game.phase === "night"
      ? NIGHT_ENTRY_SCRIPT
      : [];
  const panelTitle = game.phase === "night"
    ? "누구와, 혹은 무엇과 함께 내려가겠습니까?"
    : "오늘 무엇을 영주의 일로 받아들이겠습니까?";
  const panelText = game.phase === "night"
    ? "당신이 부른 이들만 계단 앞에 서 있다."
    : game.day === 1
      ? "낮 동안 세 번 행동합니다. 선택의 의미는 선택한 뒤에만 드러납니다."
      : "오늘의 일을 선택하십시오.";

  return (
    <main className={`app-shell ${isNight ? "theme-night" : "theme-day"}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand__crest">{isNight ? "夜" : "E"}</span>
          <div>
            <p>{isNight ? "THE HOUSE IS STILL KIND" : "A KIND WORLD AWAITS"}</p>
            <h1>{isNight ? `저택의 ${game.day}번째 밤` : `친절한 영지의 ${game.day}일차`}</h1>
          </div>
        </div>
        <div className="phase-clock">
          <span>{isNight ? "밤" : dayPeriod}</span>
          <strong>{isNight ? "1 / 1" : `${game.phase === "day" ? dayActionCount + 1 : dayActionCount} / 3`}</strong>
          <em>{game.day}일차</em>
        </div>
        <div className="topbar__actions">
          <button type="button" onClick={() => setIsCharacterOpen((open) => !open)}>규칙·주인공</button>
          <button type="button" onClick={resetGame}>새 시드</button>
        </div>
      </header>

      <section className="resource-strip" aria-label="영지 현황">
        {Object.keys(RESOURCE_META).map((key) => (
          <ResourceCard
            key={key}
            statKey={key}
            value={game.resources[key]}
            isNight={isNight}
            revealed={game.day > 1 || game.phase === "ending"}
          />
        ))}
      </section>

      <div className="dashboard">
        <div className="estate-column">
          <EstateScene isNight={isNight} estateState={estateState} />
          <section className={`estate-report estate-report--${estateState.tone}`}>
            <div>
              <span className="eyebrow">영지 상태</span>
              <h2>{estateState.name}</h2>
            </div>
            <p>{estateState.script}</p>
          </section>
          {sceneDialogue.length > 0 && !game.pendingResult && dismissedSceneKey !== sceneKey && (
            <DialogueBox
              key={sceneKey}
              context={game.phase === "night" ? "저택 지하" : "첫날의 업무"}
              lines={sceneDialogue}
              onComplete={() => setDismissedSceneKey(sceneKey)}
              completeLabel="선택지 보기"
            />
          )}
        </div>

        <section className="choice-panel">
          {(game.phase === "day" || game.phase === "night") && (
            <>
              <div className="choice-panel__intro">
                <span className="eyebrow">
                  {game.phase === "night" ? "밤 · 저택 지하" : `${dayPeriod} · 영지 업무`}
                </span>
                <h2>{panelTitle}</h2>
                <p>{panelText}</p>
              </div>
              <div className={`option-list option-list--single ${selectedChoiceId ? "is-resolving" : ""}`}>
                {offers.map((option) => (
                  <button
                    type="button"
                    className={`option-button option-button--${option.tone} ${!option.available ? "option-button--locked" : ""} ${selectedChoiceId === option.id ? "is-selected" : selectedChoiceId ? "is-dismissed" : ""}`}
                    key={option.id}
                    disabled={!option.available || Boolean(selectedChoiceId)}
                    onClick={() => game.phase === "day" ? chooseDayAction(option) : chooseNightAction(option)}
                  >
                    <strong>{option.title}</strong>
                  </button>
                ))}
                <button
                  type="button"
                  className={`option-button option-button--forfeit ${selectedChoiceId === "forfeit" ? "is-selected" : selectedChoiceId ? "is-dismissed" : ""}`}
                  disabled={Boolean(selectedChoiceId)}
                  onClick={giveUp}
                >
                  <strong>포기한다</strong>
                </button>
              </div>
            </>
          )}

          {game.phase === "worker-name" && (
            <>
              <div className="choice-panel__intro">
                <span className="eyebrow">밤 · 돌아오는 길</span>
                <h2>잡부의 이름을 기억하십니까?</h2>
              </div>
              <div className={`option-list option-list--single ${selectedChoiceId ? "is-resolving" : ""}`}>
                {WORKER_NAME_CHOICES.map((choice) => (
                  <button
                    type="button"
                    className={`option-button option-button--${choice.tone} ${selectedChoiceId === choice.id ? "is-selected" : selectedChoiceId ? "is-dismissed" : ""}`}
                    key={choice.id}
                    disabled={Boolean(selectedChoiceId)}
                    onClick={() => chooseWorkerMemory(choice)}
                  >
                    <strong>{choice.title}</strong>
                  </button>
                ))}
              </div>
            </>
          )}

          {game.phase === "prologue" && (
            <div className="choice-panel__intro quiet-panel">
              <span className="eyebrow">아직 아무것도 선택하지 않았습니다.</span>
              <h2>모든 것이 친절하다.</h2>
              <p>이상할 정도로.</p>
            </div>
          )}
        </section>

        <CharacterPanel game={game} />
      </div>

      {isCharacterOpen && (
        <div className="mobile-character-modal" onClick={() => setIsCharacterOpen(false)}>
          <CharacterPanel game={game} />
        </div>
      )}

      {game.phase === "prologue" && <PrologueOverlay onContinue={startTutorial} />}
      {game.phase === "day-interlude" && (
        <DayInterludeOverlay interlude={dayInterlude} onContinue={continueAfterDayInterlude} />
      )}
      {game.phase === "nightfall" && <NightfallOverlay onContinue={beginNight} />}
      {game.phase === "daybreak" && <DaybreakOverlay game={game} onContinue={beginNextDay} />}
      <ResultSequence
        key={`${game.history.length}-${game.pendingResult?.label ?? "none"}`}
        result={game.pendingResult}
        estateState={estateState}
        isNight={isNight}
        onContinue={continueAfterResult}
      />
      {game.phase === "ending" && (
        <EndingOverlay ending={ENDINGS[game.endingId]} game={game} onReset={resetGame} />
      )}
      {game.phase === "game-over" && <GameOverOverlay onReset={resetGame} />}
    </main>
  );
}

export default App;
