import {
  NIGHT_OPENING as ROSENTHAL_NIGHT_OPENING,
  PROLOGUE as ROSENTHAL_PROLOGUE,
} from "../rosenthalContent.js";

// 프롤로그와 밤 진입 본문은 rosenthal/introContent.js만 수정 원본으로 둔다.
// 이 파일은 화면용 메타데이터와 화자 매핑만 가진다.
export const PROLOGUE = {
  tag: "프롤로그",
  title: "들리지 않는 목소리",
  text: ROSENTHAL_PROLOGUE,
  speakers: [
    "narration",
    "player",
    "player",
    "player",
    "player",
    "narration",
    "narration",
    "npc:maid",
    "narration",
    "narration",
    "narration",
    "player",
    "player",
    "player",
    "player",
  ],
};

export const DAY_OPENING_SCRIPT = [
  {
    speaker: "npc:scribe",
    text: "오늘 처리하실 일을 정리했습니다. 처음 보시는 항목부터 설명드리겠습니다.",
  },
  {
    speaker: "narration",
    text: "당신이 아무것도 모른다는 사실을, 그는 조금도 이상하게 여기지 않는다.",
  },
];

export const DAY_PERIODS = ["오전", "오후", "저녁"];

export const DAY_INTERLUDES = [
  {
    tag: "오전이 지나간다",
    title: "해는 아직 높다.",
    paragraphs: [
      "당신은 선택을 해야 한다. 그 뒤에 무엇이 기다리고 있을지는 아무도 알려주지 않는다.",
      "그래도 태양이 떠 있는 동안에는 괜찮을 것 같다.",
      "불어오는 바람은 산뜻하고, 사람들의 웃음 소리가 주변을 가득 채운다.",
      "분명, 잘못된 결정도 내일 고치면 될 것이다.",
      "……그렇게 믿는다.",
    ],
    button: "오후의 일을 시작한다",
  },
  {
    tag: "오후",
    title: "영지는 평화롭다.",
    paragraphs: [
      "소설 속에서 몇 번이나 본 듯한, 판에 박힌 영지다. 그것도 드물 만큼 평화로운 곳이다.",
      "시장에는 먹을 것이 넉넉하고, 골목에는 악취가 나지 않는다.",
      "병사는 주민에게 시비를 걸지 않고, 상인은 값을 속이기보다 장부를 먼저 보여준다.",
      "점심에는 갓 구운 빵과 따뜻한 수프가 나왔고, 누구도 접시를 빼앗거나 음식에 독이 들었는지 의심하지 않았다.",
      "사람들은 최소한의 상식을 지키며, 도움을 청하는 일도 무너진 담장이나 부족한 물자처럼 손을 대면 해결할 수 있는 것뿐이다. 내가 아는 상식에서 벗어나는 일은 아직 하나도 일어나지 않았다.",
      "혹시 정말로, 영지를 돌보며 살아가는 힐링물 같은 세계인 걸까?",
    ],
    button: "저녁의 일을 시작한다",
  },
  {
    tag: "저녁",
    title: "해가 기울기 시작한다.",
    paragraphs: [
      "저녁 무렵, 오늘 만난 사람들은 차례로 일을 마쳤다고 보고한다. 메이드는 커튼을 닫고, 서기관은 장부를 거두며, 복도의 촛불은 일정한 간격으로 하나씩 켜진다.",
      "누구도 서두르지 않지만 움직임에는 망설임이 없다. 마치 당신만 모르는 저녁의 순서가 오래전부터 정해져 있었던 것 같다.",
      "마지막 햇빛이 창틀 아래로 사라질 때까지, 아무 일도 일어나지 않는다.",
    ],
    button: "해가 지는 것을 지켜본다",
  },
];

export const NIGHT_ENTRY_SCRIPT = [
  { speaker: "npc:maid", text: ROSENTHAL_NIGHT_OPENING[0] },
  { speaker: "npc:maid", text: ROSENTHAL_NIGHT_OPENING[1] },
  { speaker: "npc:maid", text: ROSENTHAL_NIGHT_OPENING[2] },
];
