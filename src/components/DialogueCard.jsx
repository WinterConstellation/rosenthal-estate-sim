import { useEffect, useState } from "react";
import { getNpcSpeaker } from "../engine/rosenthalEngine.js";

export function normalizeDialogue(value, defaultSpeaker = "narration") {
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

export function DialogueCard({ game, eyebrow, title, paragraphs, button, onContinue, danger = false }) {
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
      <div className="dialogue-card__body">
        {title && (
          <div className="dialogue-card__title-block">
            <h2 className="dialogue-card__title">{title}</h2>
          </div>
        )}
        <strong className={`speaker-label speaker-label--${speakerKind} dialogue-card__speaker`}>{currentSpeaker}</strong>
        <div className="dialogue-card__text">
          {currentLine && <p key={`${scriptKey}-${currentIndex}`}>{currentLine.text}</p>}
        </div>
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
