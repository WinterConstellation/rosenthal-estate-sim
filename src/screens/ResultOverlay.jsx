import { useState } from "react";
import { DialogueCard, normalizeDialogue } from "../components/DialogueCard.jsx";

export function ResultOverlay({
  game,
  result,
  onContinue,
  labels,
  formatSignedTenth,
  getChangeDetail,
}) {
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
    { id: "horrorTraits", label: "공포 특성", changes: result?.changes?.filter((change) => change.group === "공포 특성") ?? [] },
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
                      {labels[change.key] ?? change.label} {formatSignedTenth(change.delta)}
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
