const FIRST_DAY_HINT_ITEMS = [
  {
    label: "낮의 장부",
    text: "오늘의 장부는 다섯 칸으로 나뉩니다. 한 번 올린 갈래의 일은 오늘 다시 올라오지 않습니다.",
  },
  {
    label: "움직이는 숫자",
    text: "식량, 체력, 신뢰 같은 값은 선택 뒤에 조금씩 움직입니다. 작은 비용은 대개 일의 무게일 뿐입니다.",
  },
  {
    label: "해가 기울면",
    text: "저녁이 오면 저택 아래로 이어지는 일정이 열립니다. 지금은 사람들의 이름과 낮의 얼굴을 익히면 충분합니다.",
  },
];

export function FirstDayHintModal({ onClose }) {
  return (
    <div className="overlay overlay--top first-day-hint-overlay">
      <section className="first-day-hint-modal">
        <span className="eyebrow">로젠탈 저택 안내</span>
        <h2>첫 장의 업무</h2>
        <p className="first-day-hint-modal__intro">
          새 영주님께 드리는 낮의 안내입니다. 이 장은 시험지가 아니라, 저택이 당신의 손글씨를 익히는 첫 장입니다.
        </p>
        <div className="first-day-hint-modal__notes">
          {FIRST_DAY_HINT_ITEMS.map((item) => (
            <article key={item.label}>
              <strong>{item.label}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
        <p className="first-day-hint-modal__postscript">
          안내문 끝에는 아직 마르지 않은 잉크로 당신의 이름이 적혀 있다.
        </p>
        <button type="button" onClick={onClose}>첫 업무를 시작한다</button>
      </section>
    </div>
  );
}
