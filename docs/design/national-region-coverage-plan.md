# NATIONAL 지역 범위 구현 기록

- 기준일: 2026-07-19
- 의미: `NATIONAL`은 운영 기관이 중앙정부라는 뜻이 아니라, 신청자의 부산 거주 여부를 자격 제한으로 사용하지 않는다는 뜻이다.
- 범위: Prisma, Zod, DRAFT 저장·복제, 규칙 엔진, 구성 해시, 게시 준비도, 관리자 편집 UI, 공개 추천·상세 표시
- 제외: 실제 지원제도 입력·게시, AI, 새 자격 규칙, 관리자 인증 변경

## 저장 규칙

| coverageType | cityCode | districtCode | 거주지 판정 |
|---|---:|---:|---|
| `NATIONAL` | `null` | `null` | 입력 여부·지역과 무관하게 PASS |
| `CITY_WIDE` | `26000` | `ALL` | 부산 거주자 PASS |
| `DISTRICT` | `26000` | 부산 16개 구·군 코드 중 하나 | 해당 구·군 거주자 PASS |

서로 다른 coverage type은 한 버전에 혼합하지 않는다. `reviewRequired=true`는 별도 확인 조건이 있는 경우 허용하되, `requirementNote`를 반드시 저장한다. 실제 판정이 불가능한 별도 요건은 `MANUAL_REVIEW` 규칙으로 표현한다.

## 마이그레이션

마이그레이션 `20260719190000_add_national_region_coverage`는 다음을 수행한다.

1. PostgreSQL enum에 `NATIONAL`을 추가한다.
2. `ProgramRegion.cityCode`, `districtCode`를 nullable로 변경한다.
3. nullable 복합 unique를 제거하고 coverage별 partial unique index로 대체한다.
4. check constraint로 세 coverage의 코드 형태를 강제한다.

enum 추가와 컬럼 nullable 변경은 데이터 손실이 없지만, 롤백에는 주의가 필요하다. PostgreSQL enum 값 제거는 단순 역연산이 아니며, `NATIONAL` 행이 존재하면 기존 NOT NULL 컬럼으로 되돌릴 수 없다. 운영 롤백 전에는 `NATIONAL` 행을 다른 의미로 임의 변환하지 말고 데이터 백업과 명시적 정리 계획을 마련해야 한다.

## 호환성과 검증 기준

- 기존 `CITY_WIDE`와 `DISTRICT` 행은 값 변경 없이 유효해야 한다.
- DRAFT 저장과 게시 버전 복제는 `null` 코드를 그대로 보존해야 한다.
- 구성 해시는 coverage와 두 코드의 명시적 `null`을 포함한다.
- 게시 준비도는 지역 존재뿐 아니라 coverage별 코드 형태까지 검사한다.
- 공개 화면은 `NATIONAL`을 `부산 거주 필수 아님`으로 표시하고, 운영 기관 분류와 섞지 않는다.
- 자격 상태와 신청 기간 상태는 계속 별도로 계산한다.

표준 PostgreSQL에서 전체 마이그레이션, 단위·통합·E2E 테스트를 통과하기 전에는 DB 호환 검증 완료로 기록하지 않는다.
