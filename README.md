# 로젠탈 영지 관리일지

React와 Vite로 제작 중인 선택형 로그라이크 공포 영지 경영 게임입니다.

낮에는 로젠탈의 자원과 사람을 관리하고, 밤에는 동행자를 정해 저택 지하를 탐사합니다. 첫 7일 동안 발생한 인간의 사망·영구 실종·변질 후 처치는 제물 수치에 기록되며, 일곱째 밤의 결과에 따라 여덟째 날의 축이 달라집니다.

## 비개발자용 실행

- 웹 버전: <https://winterconstellation.github.io/rosenthal-estate-sim/>
- Windows 다운로드 버전: GitHub Releases에서 `Rosenthal-Estate-...exe`를 받아 실행합니다.

Windows 다운로드 버전은 Node.js 설치가 필요하지 않습니다. 현재 실행 파일은 코드 서명을 하지 않았으므로 Windows SmartScreen 경고가 나타날 수 있습니다.

진행 상황은 웹 버전과 Windows 버전에 각각 저장되며 서로 공유되지 않습니다.

## 개발 및 소스 실행

소스 폴더의 `게임 실행.cmd`는 개발 환경용입니다. Node.js가 설치된 Windows에서만 사용합니다.

```sh
npm ci
npm start
```

## 구조 메모

- `src/App.jsx`: 게임 화면, 상태 흐름, 주요 UI/연출 연결부입니다.
- `src/styles.css`: 전체 화면 스타일과 낮/밤/공포 연출 스타일입니다.
- `src/data/`: 선택지, 이벤트, 시드, 성흔 등 게임 내용 데이터입니다.
- `src/engine/`: 선택 결과 계산, 규칙 처리, 저장/마이그레이션, 시드 처리를 둡니다.
- `src/rules/`: 규칙/튜토리얼 표시용 문서와 시스템 규칙입니다.
- `reference/`: 보존용 레퍼런스, 데모, 비교용 시각 실험을 둡니다. 데모는 테스트용 파일이 아닙니다.
- `test-builds/`: 테스트빌드 전용 위치입니다. 테스트용 파일은 제목과 파일명에 `테스트빌드` 또는 `test-build`처럼 명확한 명사를 넣습니다.
- `scripts/`: 검증과 Windows 빌드 보조 스크립트입니다.
- `electron/`: Windows 실행 파일용 Electron 진입점입니다.

## 배포

- `main` 브랜치에 푸시하면 GitHub Pages 웹 버전을 자동으로 갱신합니다.
- GitHub Actions의 `Build Windows game`을 수동 실행하면 Windows 실행 파일을 받을 수 있습니다.
- `v0.1.0`처럼 `v`로 시작하는 태그를 푸시하면 Windows 실행 파일을 포함한 GitHub Release를 만듭니다.
- 로컬에서 `npm run dist:win`을 실행하면 `release/`에 Windows 실행 파일을 만듭니다.

GitHub 저장소와 소스 ZIP에는 `.git`, `node_modules`, `dist`, `release`를 포함하지 않습니다.
