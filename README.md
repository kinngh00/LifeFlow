# LifeFlow

부산광역시 청년 취업·주거 지원제도를 공식 조건에 따라 추천하기 위한 Next.js 기반 MVP입니다.

현재 단계에는 관리자 게시·버전 교체, 코드 기반 자격 판정, 비회원 조건 입력, 맞춤 추천과 공식 출처 상세 화면까지 포함됩니다. 실제 지원제도는 공식 자료 검수를 마친 배치부터 순차적으로 입력합니다.

## 기술 스택

- TypeScript, Next.js App Router, React, Tailwind CSS
- PostgreSQL, Prisma, Zod
- Vitest, Playwright, Docker Compose, GitHub Actions

## 현재 포함된 서버 기능

- `/api/health`에서 `SELECT 1`을 실행하는 실제 DB 연결 확인
- 관리자 지원제도 목록 조회 서비스
  - 카테고리·게시 상태·보관 여부·검색어 필터
  - 페이지네이션과 `updatedAt` 기준 정렬
  - 현재 게시 버전과 최신 버전을 분리해 반환
- 지원제도와 버전 1 DRAFT를 하나의 트랜잭션으로 생성
  - 활성 ADMIN 확인
  - slug 중복 충돌 처리
  - 생성 실패 시 전체 롤백
- Prisma 오류를 외부용 도메인 오류로 변환
- 요청 입력을 DB 접근 전에 Zod로 검증
- 기존 DRAFT 버전의 공식 출처·부산 적용 지역·자격 규칙·규칙 테스트 사례 전체 교체
  - 요청 출처는 `sourceIndex`로 규칙과 연결한 뒤 실제 생성 ID로 변환
  - 대표 출처 1개, 부산 지역 충돌, 규칙·테스트 참조, 개인정보 키를 선검증
  - 하위 데이터 교체, 감사 로그 작성과 결과 재조회를 Serializable 트랜잭션으로 처리
- 현재 실행 가능한 구성을 canonical JSON으로 정규화한 SHA-256 `configurationHash`
- AGE, REGION, EMPLOYMENT, STUDENT, INCOME_BAND, HOUSING, APPLICATION_PERIOD, MANUAL_REVIEW 규칙 실행
- 저장된 RuleTestCase 실행과 RuleTestRun·RuleTestResult·감사 로그의 트랜잭션 저장
- 현재 구성 hash와 최근 테스트 실행을 비교하는 게시 준비 상태 조회
- scrypt 비밀번호 검증과 DB 기반 관리자 서버 세션
- HttpOnly 세션 쿠키, Origin·JSON 검증과 메모리 로그인 시도 제한
- 인증·프로그램 목록·생성·DRAFT 구성·테스트 실행·readiness 관리자 API
- readiness를 트랜잭션 안에서 재검증하는 게시 서비스와 관리자 게시 API
  - Serializable 트랜잭션과 최대 3회 충돌 재시도
  - 기존 공개 버전 `UNPUBLISHED` 전환과 `currentPublishedVersionId` 원자 교체
  - PublicationEvent와 최소화된 AdminAuditLog 기록
- 현재 또는 지정한 게시 이력 버전에서 새 DRAFT를 생성하는 서비스와 관리자 API
  - 프로그램당 편집 가능한 DRAFT 1개
  - 최대 versionNumber + 1
  - 출처를 새 ID로 복제하고 규칙의 sourceId를 새 출처에 재연결
  - RuleTestRun·RuleTestResult·PublicationEvent 미복제
- 대화형 `npm run admin:create` 관리자 계정 생성 CLI
  - 이메일·표시 이름 입력과 터미널 비밀번호 숨김 입력
  - 기존 scrypt 해시 재사용, 중복 이메일 차단, 평문·DB URL 미출력
- DB 세션을 서버 레이아웃에서 검증하는 관리자 화면
  - 로그인·로그아웃, 대시보드, 프로그램 목록·필터·생성·상세
  - DRAFT 출처·지역·8종 규칙·테스트 사례 편집
  - 테스트 실행, readiness 표시, 게시와 새 DRAFT 생성

서비스는 Prisma 모델을 그대로 외부에 반환하지 않고 전용 DTO를 반환합니다. 관리자 API는 서비스 계층을 호출하는 얇은 경계이며 관리자 UI는 공통 API 클라이언트로만 이 경계를 호출합니다.

### 관리자 인증 정책

- 비밀번호는 무작위 16바이트 salt와 Node.js scrypt로 해시하며 `scrypt$N$r$p$keyLength$salt$key` 형식으로 저장합니다.
- 세션 토큰은 32바이트 난수이며 DB에는 SHA-256 hash만 저장합니다. 세션은 8시간 후 만료되고 폐기·만료·비활성 관리자 세션은 거부합니다.
- `lastUsedAt`은 마지막 기록 후 15분이 지난 요청에서만 갱신합니다.
- 쿠키는 `lifeflow_admin_session`, HttpOnly, SameSite=Strict, Path=/이며 production에서 Secure를 사용합니다.
- 상태 변경 API는 `application/json`과 정확한 `APP_ORIGIN`을 요구합니다. 별도 CSRF 토큰은 사용하지 않으므로 신뢰 origin 설정과 SameSite 쿠키가 전제입니다.
- 로그인 제한은 정규화 이메일과 IP의 SHA-256 key를 사용하는 프로세스 메모리 방식입니다. 서버 재시작 시 초기화되고 다중 인스턴스 간 공유되지 않으므로 단일 서버 MVP에만 적합합니다.

### DRAFT 구성 교체 정책

구성 편집은 `ProgramSource`, `ProgramRegion`, `EligibilityRule`, `RuleTestCase`를 대상 버전 안에서 전체 교체합니다. 규칙의 `displayOrder`는 1을 포함하고 중복될 수 없지만, 이후 규칙 삽입을 위해 중간 번호의 공백은 허용합니다. `active=false` 규칙도 초안에는 저장할 수 있으나 향후 게시 판단에서는 사용하지 않을 예정입니다.

현재 `RuleTestResult`가 `RuleTestCase`를 `Restrict`로 참조하므로 테스트 실행 이력이 있는 DRAFT는 구성 교체를 차단합니다. 과거 실행 결과를 유지하면서 사례의 의미가 바뀌는 것을 막기 위한 정책입니다. 향후 구성 revision 또는 nullable snapshot 관계를 별도로 설계하기 전에는 기존 실행 이력을 삭제하지 않습니다.

### 규칙 실행과 hash 정책

- hash는 활성 규칙, 판정 관련 ProgramVersion 필드, 출처·지역, 테스트 입력과 기대값을 포함합니다.
- ProgramVersion과 하위 generated ID, 생성·수정 시각과 관리자 ID는 제외하므로 같은 의미의 게시 버전과 복제 DRAFT는 같은 hash를 가질 수 있습니다.
- JSON key와 배열 반환 순서를 canonicalize하고 Date는 ISO 문자열, Decimal은 문자열로 변환합니다.
- 테스트 `evaluationDate`를 날짜 전용 값으로 반드시 입력받으므로 서버 로컬 시간대에 의존하지 않습니다. 서비스 기준일은 Asia/Seoul의 행정 날짜로 해석합니다.
- 입력 구성이나 날짜가 잘못돼 실행할 수 없으면 Run 전체를 저장하지 않습니다. 정상 실행 후 기대값만 다르면 실패한 Run을 저장합니다.
- `reviewRequired=true` 규칙과 MANUAL_REVIEW는 자동 PASS가 되지 않습니다.
- `reviewedAt`은 아직 검수 서비스가 없으므로 이번 게시 준비 조건에서는 제외합니다.
- 감사 로그에는 hash 앞 12자리와 집계 결과만 저장하며 inputSnapshot과 규칙 결과 전체는 저장하지 않습니다.

### 게시와 버전 정책

- 게시 전 readiness를 먼저 확인하고 Serializable 트랜잭션 안에서 관리자 활성 상태, DRAFT 상태, 보관 여부, 최신 테스트와 configurationHash를 다시 조회합니다.
- 첫 게시 이벤트는 `PUBLISHED`, 기존 공개 버전 교체 이벤트는 `VERSION_REPLACED`로 기록합니다.
- 교체된 이전 버전은 `publishedAt`을 유지한 채 `UNPUBLISHED`로 전환하며 삭제하거나 덮어쓰지 않습니다.
- 새 DRAFT는 현재 공개 버전을 기본 원본으로 사용하며 필요하면 같은 프로그램의 PUBLISHED 또는 UNPUBLISHED 버전을 지정할 수 있습니다.
- 새 DRAFT 생성은 PublicationEvent가 아닌 `CREATE` AdminAuditLog로 기록합니다.

## 요구 환경

- Node.js 24
- npm
- Docker Desktop 또는 Docker Engine과 Compose

## 환경 변수

`.env.example`을 복사해 `.env`를 만듭니다. 실제 비밀번호가 포함된 `.env` 파일은 커밋하지 않습니다.

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `DATABASE_URL` | 예 | 개발 애플리케이션과 Prisma가 사용할 PostgreSQL 연결 문자열 |
| `DIRECT_URL` | 아니오 | 직접 DB 연결이 따로 필요한 환경의 연결 문자열 |
| `TEST_DATABASE_URL` | 통합·E2E 테스트 시 예 | 개발 DB와 완전히 분리된 통합·E2E 전용 PostgreSQL 연결 문자열 |
| `APP_ORIGIN` | 운영 환경 예 | 관리자 상태 변경 요청에 허용할 정확한 애플리케이션 origin |
| `E2E_ADMIN_EMAIL` | 아니오 | `e2e-` 접두어와 `@lifeflow.test` 도메인을 사용하는 임시 관리자 이메일. 미설정 시 실행마다 생성 |
| `E2E_ADMIN_PASSWORD` | 아니오 | E2E 임시 관리자 전용 비밀번호. 미설정 시 실행마다 암호학적으로 안전하게 생성 |

로컬 Docker Compose 기본 DB는 호스트 `5433`, 테스트 DB는 `5434` 포트를 사용합니다.

## 로컬 실행

1. `docker compose up -d`
2. `npm install`
3. `npx prisma validate`
4. `npm run dev`
5. 브라우저에서 `http://localhost:3000` 접속

확인 경로:

- `/`
- `/questionnaire`
- `/admin/login`
- `/api/health`

## 최초 관리자 계정 생성

마이그레이션이 적용된 일반 PostgreSQL과 대화형 TTY 환경에서 실행합니다.

```text
npm run admin:create
```

이메일과 표시 이름은 일반 입력으로, 비밀번호와 확인 값은 터미널에 표시하지 않는 raw-mode 입력으로 받습니다. 명령행 인자로 비밀번호를 전달하지 않으며 비대화형 파이프·CI에서는 실행을 거부합니다. 성공 메시지는 정규화 이메일과 표시 이름만 출력합니다.

Windows 터미널, PowerShell 또는 일반 Unix TTY 사용을 권장합니다. 일부 IDE의 비대화형 출력 창에서는 숨김 입력이 지원되지 않을 수 있습니다.

## 테스트 DB 실행

테스트 전용 PostgreSQL만 시작합니다.

```text
docker compose --profile test up -d postgres-test
```

`.env`의 `TEST_DATABASE_URL`이 테스트 DB를 가리키는지 확인한 다음 실행합니다.

```text
npm run test:integration
```

통합 테스트 실행기는 다음 안전 조건을 모두 확인한 뒤 기존 마이그레이션을 테스트 DB에 적용합니다.

- `TEST_DATABASE_URL`이 반드시 존재해야 함
- 호스트가 localhost 또는 loopback 주소여야 함
- 데이터베이스 이름에 `test`가 포함되어야 함
- `DATABASE_URL`, `DIRECT_URL`과 같지 않아야 함

통합 테스트는 전체 스키마를 삭제하거나 초기화하지 않습니다. 각 테스트가 UUID 접두어로 만든 관리자와 지원제도 ID만 추적하여 정리합니다. 따라서 개발 DB나 공유 DB를 테스트 대상으로 사용하면 안 됩니다.

E2E도 같은 안전 조건을 확인하고, 적용된 Prisma 마이그레이션을 확인한 뒤 임시 관리자만 생성합니다. 테스트 종료 시 해당 관리자가 생성한 프로그램·버전·출처·지역·규칙·테스트·게시 이력·세션·계정을 정리하며 전체 schema를 삭제하지 않습니다.

### 표준 PostgreSQL 검증 결과

2026-07-19 기준, loopback 전용 PostgreSQL 18 테스트 DB에서 누적 마이그레이션 3개, 단위 테스트 203건, 통합 테스트 174건과 Playwright E2E 12건을 통과했습니다. GitHub Actions에서도 PostgreSQL service, migration, lint, typecheck, 단위·통합 테스트, production build와 Chromium E2E가 모두 통과했습니다.

## 검증 명령

- `npx prisma validate`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:integration`
- `npm run test:e2e`
- `npm run build`

Playwright 브라우저가 설치되지 않은 환경에서는 최초 한 번 `npx playwright install chromium`을 실행합니다.

## 디렉터리 경계

- `src/app`: 페이지와 Route Handler
- `src/components`: 범용 UI와 레이아웃
- `src/features/admin/programs`: 관리자 지원제도 스키마, DTO, 매퍼, 애플리케이션 서비스
- `src/server/db`: Prisma 클라이언트와 테스트 DB URL 안전 검증
- `src/server/env`: 서버 환경 변수 검증
- `src/server/auth`, `cookies`, `csrf`: 관리자 세션과 요청 보안 경계
- `src/server/errors`: 도메인·Prisma·API 오류 변환
- `src/server/services`: 공통 서버 서비스
- `src/schemas`: 공유 가능한 Zod 스키마
- `prisma`: Prisma 스키마와 누적 migration 이력
- `tests/unit`: DB 없이 실행하는 단위 테스트
- `tests/integration`: 실제 PostgreSQL을 사용하는 통합 테스트
- `tests/e2e`: Playwright 브라우저 테스트

관리자 UI는 native fetch 기반 공통 API 클라이언트만 사용합니다. UI에서 Prisma, 규칙 엔진 또는 readiness 계산을 실행하지 않습니다.

## 데이터 원칙

- 비회원 사용자 조건은 PostgreSQL에 저장하지 않습니다.
- 공식 데이터가 없는 더미 지원제도를 실제 데이터처럼 노출하지 않습니다.
- 검수 데이터 입력은 기존 활성 ADMIN 이메일을 `LIFEFLOW_DATA_ADMIN_EMAIL`로 지정한 뒤 `npm run data:import:first`로 DRAFT·테스트·readiness까지만 수행합니다. 게시까지 진행할 때만 명시적으로 `-- --publish`를 붙입니다.
- 2026-07-19 첫 검수 배치 5개는 로컬 개발 PostgreSQL에서 각 5건의 규칙 테스트와 readiness를 통과해 게시됐습니다. 이는 개발 DB 검증 결과이며 운영 배포를 의미하지 않습니다.
- 같은 날 두 번째 검수 배치 5개도 동일 절차를 통과했습니다. 개발 DB의 공개 지원제도는 총 10개이며 각 제도에 5개 이상의 필수 규칙 테스트가 연결되어 있습니다.
- 같은 날 세 번째 검수 배치 5개도 `npm run data:import:third -- --publish`의 생성→DRAFT 구성→규칙 테스트→readiness→게시 흐름을 통과했습니다. 개발 DB의 공개 지원제도는 총 15개이고 DRAFT는 0개이며, 로컬 브라우저에서 추천 목록 15개와 대표 상세·공식 출처를 확인했습니다.
- 사용자 결과 상태는 `ELIGIBLE`, `NEEDS_REVIEW`, `NOT_ELIGIBLE`, `UNDETERMINED`만 사용합니다.
- 지원제도 생성 시 현재 게시 버전은 비어 있으며 최초 버전은 항상 DRAFT입니다.
- 게시된 버전은 직접 편집하지 않고 새 DRAFT를 생성해 다시 테스트하고 게시합니다.

## 이번 단계에서 구현하지 않은 항목

- 지원제도 삭제와 보관 처리
- AI 설명 기능
- 공식 검수 완료 전 나머지 지원제도 일괄 입력
- 사용자 조건의 영구 저장
- 운영 배포

## 개발 이력과 다음 단계

초기 MVP는 AI-Native 방식으로 빠르게 구축한 뒤 초기 커밋과 기반 완성 커밋으로 정리했습니다. 이후 실제 데이터 검수, CI 수정과 배포 과정은 변경 목적별 커밋으로 기록합니다.

다음 단계는 첫 검수 배치에서 확인한 구조를 유지하면서 나머지 후보를 5개 이하 배치로 공식 검수하는 것입니다. 공식 공고의 지역·기간·금액을 확정하지 못한 제도는 DRAFT 입력이나 게시에서 제외합니다.
