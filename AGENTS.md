# 작업 규칙

- 작업 흐름과 인계 메모는 `docs/pingpong.txt`에 최신 상태로 정리한다.
- `docs/work_log.txt`는 자연어 작업 이력으로 유지한다.
- 실제 코드, 문서 구조, 작업 방향이 의미 있게 바뀐 경우에만 `docs/work_log.txt`에 짧게 기록한다.
- 단순 확인, 검색, 보고, 오탈자 수준의 미세 수정에는 `docs/work_log.txt`를 갱신하지 않는다.
- 가능하면 작업 기록은 같은 커밋에 포함하되, `docs/work_log.txt`만을 위한 별도 커밋은 만들지 않는다.
- 파일 제거 전에는 정확한 경로와 용도를 확인한다.
- `reference/`는 보존/비교용, `test-builds/`는 테스트빌드 전용이다.
- `demo`는 테스트용 명칭으로 쓰지 않는다.
- 텍스트 파일은 UTF-8(BOM 없음)·LF로 유지하며, Windows PowerShell의 `>`, `>>`, `Out-File`로 소스/문서를 작성하지 않는다.
