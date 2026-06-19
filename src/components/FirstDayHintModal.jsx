import { useState } from "react";

const FIRST_DAY_HINT_PAGES = [
  {
    stamp: "첫 칸",
    label: "낮의 장부",
    title: "오늘의 일은 장부에 한 줄씩 올라옵니다.",
    text: "오른쪽에 놓인 항목들은 지금 고를 수 있는 업무입니다. 한 번 처리한 갈래는 오늘 다시 올라오지 않습니다.",
    ledger: "빈 칸이 줄어들수록 해는 천천히 기웁니다.",
  },
  {
    stamp: "둘째 칸",
    label: "움직이는 숫자",
    title: "좋은 결정도 작은 비용을 남깁니다.",
    text: "식량, 체력, 신뢰 같은 숫자는 업무 뒤에 조금씩 움직입니다. 호박색 표시는 큰 사건이 아니라 일의 무게에 가깝습니다.",
    ledger: "붉은 인장은 정말 위험한 일에만 찍힙니다.",
  },
  {
    stamp: "마감",
    label: "해가 기울면",
    title: "낮의 장부가 닫히면 다음 일정이 열립니다.",
    text: "저녁이 오면 저택 아래로 이어지는 일정이 마련됩니다. 지금은 사람들의 이름과 낮의 얼굴을 익히면 충분합니다.",
    ledger: "안내문 끝에는 이미 당신의 서명 자리가 비어 있습니다.",
  },
];

export function FirstDayHintModal({ onClose }) {
  const [pageIndex, setPageIndex] = useState(0);
  const current = FIRST_DAY_HINT_PAGES[pageIndex];
  const isLastPage = pageIndex === FIRST_DAY_HINT_PAGES.length - 1;

  return (
    <div className="overlay overlay--top first-day-hint-overlay">
      <section className="first-day-hint-modal">
        <header className="first-day-hint-modal__header">
          <div>
            <span className="eyebrow">로젠탈 저택 안내</span>
            <h2>신임 영주 인계서</h2>
          </div>
          <span>{pageIndex + 1} / {FIRST_DAY_HINT_PAGES.length}</span>
        </header>
        <ol className="first-day-hint-modal__steps" aria-label="첫날 안내 진행">
          {FIRST_DAY_HINT_PAGES.map((item, index) => (
            <li className={index === pageIndex ? "is-current" : ""} key={item.label}>
              <span>{item.label}</span>
            </li>
          ))}
        </ol>
        <div className="first-day-hint-modal__ledger" aria-live="polite">
          <div className="first-day-hint-modal__stamp">{current.stamp}</div>
          <div>
            <strong>{current.title}</strong>
            <p>{current.text}</p>
            <small>{current.ledger}</small>
          </div>
        </div>
        <div className="first-day-hint-modal__controls">
          <button
            type="button"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((index) => Math.max(index - 1, 0))}
          >
            이전 칸
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLastPage) {
                onClose();
                return;
              }
              setPageIndex((index) => index + 1);
            }}
          >
            {isLastPage ? "첫 업무를 시작한다" : "다음 칸"}
          </button>
        </div>
      </section>
    </div>
  );
}
