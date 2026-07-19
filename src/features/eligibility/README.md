# Eligibility feature

코드 기반 자격 규칙 엔진과 실행 구성 hash 경계입니다.

- `engine`: 제한된 8개 규칙 유형의 PASS/FAIL/UNKNOWN 판정과 전체 상태 집계
- `hash`: 구성 snapshot canonicalization과 SHA-256 계산
- `schemas`: 저장하지 않는 가상 테스트 입력 검증
- `types`: 엔진 입력과 최소 판정 결과 타입

이 기능은 AI 설명, API, UI 및 실제 게시 상태 변경을 포함하지 않습니다.
