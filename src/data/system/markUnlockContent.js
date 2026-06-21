// 표식 장착 한도와 분기 해금 조건의 수정 원본.
export const MARK_LOADOUT_LIMIT = 10;

export const MARK_BRANCH_UNLOCKS = [
  { id: "purification-hint", label: "정화 의식 단서", condition: { stigma: 3 } },
  { id: "guardian-vow", label: "방어/보존 분기", condition: { stigma: 10 } },
  { id: "white-rite", label: "낙인 정화 의식", condition: { stigma: 20 } },
  { id: "guardian-branch", label: "보루 분기", condition: { stigma: 30 } },
  { id: "pale-vow", label: "백색 경고", condition: { stigma: 40 } },
  { id: "true-normal-gate", label: "정상 축 심화 분기", condition: { stigma: 50 } },
  { id: "defilement-hint", label: "훼손 의식 단서", condition: { brand: 3 } },
  { id: "black-bargain", label: "악성 거래 분기", condition: { brand: 10 } },
  { id: "slaughter-threshold", label: "몰살 진입 분기", condition: { brand: 20 } },
  { id: "massacre-branch", label: "학살 분기", condition: { brand: 30 } },
  { id: "black-crown", label: "심연 분기", condition: { brand: 40 } },
  { id: "altered-crown-gate", label: "변질 축 심화 분기", condition: { brand: 50 } },
  { id: "observer-ledger", label: "관측부 기록", condition: { stigma: 25, brand: 25 } },
  { id: "closed-codex", label: "도감 폐쇄 조건", condition: { stigma: 50, brand: 50 } },
  { id: "complete-codex", label: "도감 완결", condition: { total: 100 } },
];
