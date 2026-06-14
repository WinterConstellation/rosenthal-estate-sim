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

## 배포

- `main` 브랜치에 푸시하면 GitHub Pages 웹 버전을 자동으로 갱신합니다.
- GitHub Actions의 `Build Windows game`을 수동 실행하면 Windows 실행 파일을 받을 수 있습니다.
- `v0.1.0`처럼 `v`로 시작하는 태그를 푸시하면 Windows 실행 파일을 포함한 GitHub Release를 만듭니다.
- 로컬에서 `npm run dist:win`을 실행하면 `release/`에 Windows 실행 파일을 만듭니다.

GitHub 저장소와 소스 ZIP에는 `.git`, `node_modules`, `dist`, `release`를 포함하지 않습니다.
