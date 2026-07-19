# LifeFlow 공식 지원제도 20개 데이터 시트 초안

- 작성일·공식 정보 확인일: 2026-07-19
- 상태: 검토용 초안
- 입력 상태: DB 미입력, 미게시
- 원칙: 공식 출처에 명시된 사실만 확정하고 불명확한 값은 `확인 필요`로 남긴다.

## 1차 검수 배치 결정 (2026-07-19)

공식 2026 페이지에서 사업명·대상·지원내용·기간을 직접 확인할 수 있는 아래 5개를 첫 DRAFT 후보로 확정한다.

| 제도 | 분야 | 범위 | 대표 공식 출처 | DRAFT 결정 |
|---|---|---|---|---|
| 부산 청년 디딤돌카드+ | 취업 | CITY_WIDE | 부산청년플랫폼 `menuCd=31` | 입력 가능 |
| 부산 청년 일하는 기쁨카드 | 취업 | CITY_WIDE | 부산청년플랫폼 `menuCd=33` | 입력 가능 |
| 국민내일배움카드 | 취업 | NATIONAL | 고용24 제도 안내 `SI00000351` | 입력 가능 |
| 청년월세 지원사업 | 주거 | NATIONAL | 복지로 `WLF00004661` | 입력 가능 |
| 부산지역 대학생 기숙사비 지원 | 주거 | NATIONAL + MANUAL_REVIEW | 부산청년플랫폼 `menuCd=47` | 일반 재학생 모집 회차만 입력 가능 |

검수 근거와 해석:

- 디딤돌카드+: 18~39세, 공고일 기준 부산 거주, 최종학력 졸업·중퇴·제적, 소득기준, 2026-03-09~2026-03-27, 최대 180만 원이 공식 페이지에 명시되어 있다. 주 30시간 미만 근로 예외, 건강보험료와 과거 참여·중복 조건은 자동 확정하지 않는다.
- 일하는 기쁨카드: 18~39세, 부산 소재 중소기업 3개월 이상 재직, 부산 거주, 입사일 범위, 월 소득·건강보험료 기준, 2026-04-06~2026-04-24, 100만 원이 명시되어 있다. 사업장·재직기간·보험료 증빙은 수동 확인한다.
- 국민내일배움카드: 전국 신청 가능, 5년간 기본 300만 원과 조건별 200만 원 추가, 75세 이상 및 여러 제외대상이 명시되어 있다. 제외대상 대부분은 현재 설문만으로 확정할 수 없어 수동 확인한다.
- 청년월세 지원사업: 국토교통부 사업이며 2026-03-30~2026-05-29, 월 최대 20만 원·최장 24개월이 명시되어 있다. 소득·재산·가구·임대차·중복수혜 심사는 수동 확인한다.
- 대학생 기숙사비 지원: 부산 소재 대학 재학생 중 원거리 통학자, 부산행복연합기숙사, 월 5만 원·연 60만 원이 명시되어 있다. 일반 재학생(2026-01-07~01-14)과 정시 신입생(2026-02-05~02-11)은 불연속 기간이므로 하나의 연속 신청기간으로 합치지 않는다. 1차 버전은 일반 재학생 회차만 대상으로 한다.

첫 배치의 모든 자동 규칙에는 대표 공식 출처와 정확한 페이지 항목을 연결한다. 건강보험료, 자산, 가구 정의, 과거 참여, 중복수혜, 부산 소재 대학·기숙사 입사·원거리 통학처럼 현재 입력으로 확정할 수 없는 조건은 `MANUAL_REVIEW`로 둔다.

## 공통 입력 정책

1. `SupportProgram`은 여러 연도·차수에 걸쳐 유지되는 장기 제도 단위로 만든다.
2. `ProgramVersion` 제목에는 연도·차수·과정명을 포함할 수 있다.
3. 전국 제도는 `NATIONAL/null/null`을 지원하는 모델 변경이 완료된 후에만 입력한다.
   여기서 NATIONAL은 주관기관이 중앙정부라는 뜻이 아니라 신청자의 주민등록지가 부산으로 제한되지 않는다는 뜻이다.
4. 신청기간은 `ProgramVersion`의 신청 유형과 시작·종료일에 저장하고 공개 응답의 신청 상태로 표시한다.
5. 신청기간 종료를 자격 실패로 만들지 않기 위해 단순 모집기간을 `APPLICATION_PERIOD` 자격 규칙으로 중복 등록하지 않는다.
6. 자격 상태와 신청 상태는 독립적으로 검증한다. 예: 기본 자격 충족·증빙 검토 필요이면 `NEEDS_REVIEW + CLOSED`가 가능하다.
7. 소득·자산·가구원·중복수혜·증빙·금융기관 심사는 코드가 확정할 수 없는 범위를 `MANUAL_REVIEW`로 둔다.
8. 아래 테스트는 시나리오 초안이다. DB 입력 전 실제 규칙 순번과 입력 스냅샷으로 변환하고 제도마다 5건 이상을 `requiredForPublish = true`로 만든다.

## 장기 제도와 회차성 버전 분류

| # | SupportProgram 장기 제도명 | ProgramVersion 초안 | 범위 | 회차성 |
|---:|---|---|---|---|
| 1 | 부산 청년 디딤돌카드+ | 2026년 부산 청년 디딤돌카드+ 모집 | CITY_WIDE | 연도 공고 |
| 2 | 부산 드림옷장 | 2026년 부산 드림옷장 운영 | CITY_WIDE | 연도 운영 |
| 3 | 부산 청년 일하는 기쁨카드 | 2026년 부산 청년 일하는 기쁨카드 모집 | CITY_WIDE | 연도 공고 |
| 4 | 부산 청년 취업성공 풀 패키지 | 2026년 부산 청년 취업성공 풀 패키지 | CITY_WIDE | 연도 운영 |
| 5 | 부산시 취업연수생 | 2026년 상반기 부산시 취업연수생 모집 | CITY_WIDE | 반기 공고 |
| 6 | 부산 청년도전 지원사업 | 2026년 위닛캠퍼스 참여자 모집 | CITY_WIDE | 연도·기수 |
| 7 | 스파로스 아카데미 | 2026년 스파로스 아카데미 모집 차수 | NATIONAL + 부산 연계 수동검토 | 과정·기수 |
| 8 | 국민취업지원제도 | 2026년 국민취업지원제도 | NATIONAL | 제도 연도 |
| 9 | 국민내일배움카드 | 2026년 국민내일배움카드 | NATIONAL | 제도 연도 |
| 10 | 미래내일 일경험 사업 | 2026년 미래내일 일경험 사업 | NATIONAL | 연도·프로그램 |
| 11 | 청년월세 지원사업 | 2026년 신규 수혜자 모집 | NATIONAL | 연도 공고 |
| 12 | 부산 청년 임차보증금 대출 및 대출이자 지원(머물자리론) | 2026년 머물자리론 | CITY_WIDE | 연도 운영 |
| 13 | 전세보증금반환보증 보증료 지원 | 2026년 부산 청년 보증료 지원 | CITY_WIDE | 연도 운영 |
| 14 | BMC 청년 매입임대주택 | 2026년 1차 청년 매입임대주택 모집 | 공고 첨부 확인 필요 | 차수 공고 |
| 15 | LH 청년전세임대 | 2026년 적용 청년전세임대 안내 또는 부산 공고 | NATIONAL | 제도·공고 |
| 16 | 행복주택 | 2026년 적용 청년계층 안내 또는 부산 공급 공고 | NATIONAL | 제도·공고 |
| 17 | 청년 주거급여 분리지급 | 2026년 청년 주거급여 분리지급 | NATIONAL | 제도 연도 |
| 18 | 청년전용 버팀목전세자금 | 2026년 청년전용 버팀목전세자금 | NATIONAL | 제도 연도 |
| 19 | 청년전용 보증부월세대출 | 2026년 청년전용 보증부월세대출 | NATIONAL | 제도 연도 |
| 20 | 부산지역 대학생 기숙사비 지원 | 2026년 부산지역 대학생 기숙사비 지원 모집 | NATIONAL + 부산 소재 대학 수동검토 | 연도 공고 |

## 1. 부산 청년 디딤돌카드+

- slug 초안: `busan-youth-didimdol-card`
- 분야·범위: `YOUTH_EMPLOYMENT`, `CITY_WIDE/26000/ALL`
- 주관·운영기관: 부산광역시 / 운영기관은 2026 공고문에서 최종 확정
- 공식 출처: [부산청년플랫폼 사업 페이지](https://young.busan.go.kr/index.nm?menuCd=31)
- 신청·혜택 초안: 2026-03-09~2026-03-27, 현재 `CLOSED`; 구직활동비 최대 180만 원
- 자동 규칙 후보: AGE, REGION, EMPLOYMENT, STUDENT, INCOME_BAND
- MANUAL_REVIEW: 건강보험료 산정, 졸업·미취업 증빙, 유사사업 중복 참여
- 테스트 5건: 기본 조건 충족→NEEDS_REVIEW / 연령 초과→NOT_ELIGIBLE / 부산 외 거주→NOT_ELIGIBLE / 재학생 제외조건 해당→NOT_ELIGIBLE / 소득 입력 누락→UNDETERMINED

## 2. 부산 드림옷장

- slug 초안: `busan-dream-closet`
- 분야·범위: `YOUTH_EMPLOYMENT`, `CITY_WIDE/26000/ALL`
- 주관·운영기관: 부산광역시 / 대여 운영기관은 공식 페이지에서 최종 확정
- 공식 출처: [부산청년플랫폼 사업 페이지](https://young.busan.go.kr/index.nm?menuCd=32)
- 신청·혜택 초안: 운영기간 내 신청, 면접 정장 무료 대여; 정확한 신청유형은 최신 운영안내 확인 필요
- 자동 규칙 후보: AGE, REGION, EMPLOYMENT
- MANUAL_REVIEW: 실제 면접 예정 증빙, 대여 횟수·예약 가능 여부
- 테스트 5건: 부산 청년 구직자→NEEDS_REVIEW / 연령 초과→NOT_ELIGIBLE / 부산 외 거주→NOT_ELIGIBLE / 취업 상태만 있고 구직 여부 불명→UNDETERMINED / 면접 증빙 미확인→NEEDS_REVIEW

## 3. 부산 청년 일하는 기쁨카드

- slug 초안: `busan-working-youth-happiness-card`
- 분야·범위: `YOUTH_EMPLOYMENT`, `CITY_WIDE/26000/ALL`
- 주관·운영기관: 부산광역시 / 운영기관은 2026 공고문에서 최종 확정
- 공식 출처: [부산청년플랫폼 사업 페이지](https://young.busan.go.kr/index.nm?menuCd=33)
- 신청·혜택 초안: 2026-04-06~2026-04-24, 현재 `CLOSED`; 복지포인트 100만 원 상당
- 자동 규칙 후보: AGE, REGION, EMPLOYMENT, INCOME_BAND
- MANUAL_REVIEW: 부산 중소기업 재직기간, 사업장 요건, 건강보험료, 중복수혜
- 테스트 5건: 기본 재직 조건 충족→NEEDS_REVIEW / 미취업→NOT_ELIGIBLE / 연령 초과→NOT_ELIGIBLE / 부산 외 거주→NOT_ELIGIBLE / 사업장·보험료 미확인→NEEDS_REVIEW

## 4. 부산 청년 취업성공 풀 패키지

- slug 초안: `busan-youth-employment-success-package`
- 분야·범위: `YOUTH_EMPLOYMENT`, `CITY_WIDE/26000/ALL`
- 주관·운영기관: 부산광역시 / 지정 상담기관
- 공식 출처: [부산청년플랫폼 사업 페이지](https://young.busan.go.kr/index.nm?menuCd=266)
- 신청·혜택 초안: 2026년 운영, 지정 상담·취업·근속 단계 지원; 최대 100만 원으로 안내
- 자동 규칙 후보: AGE, REGION, EMPLOYMENT
- MANUAL_REVIEW: 지정 상담 참여, 취업일·근속기간, 대상 기업, 단계별 지급요건
- 테스트 5건: 부산 미취업 청년→NEEDS_REVIEW / 연령 초과→NOT_ELIGIBLE / 부산 외 거주→NOT_ELIGIBLE / 취업상태 누락→UNDETERMINED / 상담·근속 증빙 미확인→NEEDS_REVIEW

## 5. 부산시 취업연수생

- slug 초안: `busan-employment-trainee`
- 분야·범위: `YOUTH_EMPLOYMENT`, `CITY_WIDE/26000/ALL`
- 주관·운영기관: 부산광역시 / 배치 기관
- 공식 출처: [사업 안내](https://young.busan.go.kr/index.nm?menuCd=161), [2026년 상반기 공고](https://young.busan.go.kr/article/view.nm?article_id=3790&menuCd=153)
- 신청·혜택 초안: ProgramVersion은 `2026년 상반기` 공고로 입력; 기간과 보수는 첨부 공고문 재확인 필요
- 자동 규칙 후보: AGE, REGION, EMPLOYMENT, STUDENT
- MANUAL_REVIEW: 졸업 후 경과기간, 우선선발, 근무 가능 여부, 증빙서류
- 테스트 5건: 기본 조건 충족→NEEDS_REVIEW / 만 30세 이상→NOT_ELIGIBLE / 부산 외 거주→NOT_ELIGIBLE / 재학생 제외조건 해당→NOT_ELIGIBLE / 졸업일 누락→UNDETERMINED

## 6. 부산 청년도전 지원사업 위닛캠퍼스

- slug 초안: `busan-youth-challenge-wenit`
- 분야·범위: `YOUTH_EMPLOYMENT`, `CITY_WIDE/26000/ALL`
- 주관·운영기관: 고용노동부·부산광역시 / 2026 부산 운영기관은 공고에서 확정
- 공식 출처: [부산청년플랫폼](https://young.busan.go.kr/index.nm?menuCd=73), [고용노동부 공고](https://www.moel.go.kr/news/notice/noticeView.do?bbs_seq=20260400674)
- 신청·혜택 초안: 2026년 기수별 모집; 프로그램 길이에 따른 참여수당·인센티브는 해당 기수 공고로 확정
- 자동 규칙 후보: AGE, REGION, EMPLOYMENT
- MANUAL_REVIEW: 구직단념 문답, 최근 고용·교육 참여 이력, 특례 대상, 기수 선발
- 테스트 5건: 부산 장기 미취업 청년→NEEDS_REVIEW / 연령 범위 밖→NOT_ELIGIBLE / 부산 외 거주→NOT_ELIGIBLE / 현재 취업 중→NOT_ELIGIBLE / 구직단념 요건 증빙 미확인→NEEDS_REVIEW

## 7. 스파로스 아카데미

- slug 초안: `spharos-academy`
- 분야·범위: `YOUTH_EMPLOYMENT`, `NATIONAL/null/null` + 부산 연계요건 `MANUAL_REVIEW`
- 주관·운영기관: 부산광역시 / 신세계아이앤씨
- 공식 출처: [부산청년플랫폼 사업 페이지](https://young.busan.go.kr/index.nm?menuCd=203)
- 신청·혜택 초안: SupportProgram은 아카데미, ProgramVersion은 2026년 해당 기수·과정으로 분리
- 자동 규칙 후보: AGE, REGION(NATIONAL), EMPLOYMENT, STUDENT
- MANUAL_REVIEW: `부산 소재 대학 졸업(예정) 또는 부산 주민등록` OR 조건, 교육 참여 가능 여부, 선발 인터뷰
- 테스트 5건: 기본 조건 충족→NEEDS_REVIEW / 연령 초과→NOT_ELIGIBLE / 부산 연계요건 불충족→NOT_ELIGIBLE 또는 NEEDS_REVIEW / 학생상태 누락→UNDETERMINED / 선발평가 전→NEEDS_REVIEW

## 8. 국민취업지원제도

- slug 초안: `national-employment-support-system`
- 분야·범위: `YOUTH_EMPLOYMENT`, `NATIONAL/null/null`
- 주관·운영기관: 고용노동부 / 고용센터 및 위탁기관
- 공식 출처: [고용24 국민취업지원제도 신청 안내](https://m.work24.go.kr/ua/z/z/1300/selectEmssRqutIntro.do)
- 신청·혜택 초안: 상시 안내·신청형으로 보이나 신청유형은 공식 상세에서 최종 확인; 취업지원서비스와 유형별 수당
- 자동 규칙 후보: AGE, EMPLOYMENT, INCOME_BAND, REGION(NATIONAL)
- MANUAL_REVIEW: 가구소득·재산·취업경험, 유형 구분, 참여 제한·중복
- 테스트 5건: 전국 기본 대상→NEEDS_REVIEW / 지역 UNKNOWN이어도 REGION PASS / 명시적 제외 취업상태→NOT_ELIGIBLE / 소득구간 누락→UNDETERMINED / 가구·재산 심사 전→NEEDS_REVIEW

## 9. 국민내일배움카드

- slug 초안: `national-learning-card`
- 분야·범위: `YOUTH_EMPLOYMENT`, `NATIONAL/null/null`
- 주관·운영기관: 고용노동부 / 고용센터·직업훈련기관
- 공식 출처: [고용24 제도 안내](https://www.work24.go.kr/cm/c/f/1100/selecSystInfo.do?currentPageNo=1&recordCountPerPage=12&systClId=SC00000004&systId=SI00000351%2F)
- 신청·혜택 초안: 카드 발급과 과정 수강을 구분해 설명; 훈련비 한도와 자부담은 최신 공식 상세 확인 필요
- 자동 규칙 후보: AGE, EMPLOYMENT, STUDENT, REGION(NATIONAL)
- MANUAL_REVIEW: 발급 제외대상, 기존 카드·잔여한도, 과정별 자부담과 선발
- 테스트 5건: 일반 청년 신청자→NEEDS_REVIEW / 지역 UNKNOWN이어도 REGION PASS / 명시적 발급 제외대상→NOT_ELIGIBLE / 학생상태 누락→UNDETERMINED / 기존 카드 상태 미확인→NEEDS_REVIEW

## 10. 미래내일 일경험 사업

- slug 초안: `future-tomorrow-work-experience`
- 분야·범위: `YOUTH_EMPLOYMENT`, `NATIONAL/null/null`
- 주관·운영기관: 고용노동부 / 프로그램별 운영기관
- 공식 출처: [고용24 제도 안내](https://www.work24.go.kr/cm/c/f/1100/selecSystInfo.do?currentPageNo=1&recordCountPerPage=10&systClId=SC00000203&systId=SI00000324), [미래내일 일경험 포털](https://yw.work24.go.kr/c/a/selectYgmnWkexUntyPltfOtln.do)
- 신청·혜택 초안: 장기 제도와 2026년 프로그램·모집 회차 분리; 신청기간과 지원내용은 선택 프로그램에 종속
- 자동 규칙 후보: AGE, EMPLOYMENT, REGION(NATIONAL)
- MANUAL_REVIEW: 프로그램별 선발, 중복 참여, 근무·교육 일정, 세부 우대조건
- 테스트 5건: 전국 미취업 청년→NEEDS_REVIEW / 연령 범위 밖→NOT_ELIGIBLE / 지역 UNKNOWN이어도 REGION PASS / 취업상태 누락→UNDETERMINED / 특정 프로그램 선발 전→NEEDS_REVIEW

## 11. 청년월세 지원사업

- slug 초안: `national-youth-monthly-rent-support`
- 분야·범위: `YOUTH_HOUSING`, `NATIONAL/null/null`
- 공식 사업 성격: 부산 자체 사업이 아니라 국토교통부 중앙부처 복지사업의 부산 안내
- 주관·시행기관: 국토교통부 청년주거정책과 / 주소지 관할 시·군·구 및 주민센터
- 대표 출처: [복지로 중앙부처 상세](https://www.bokjiro.go.kr/ssis-tbu/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004661)
- 보조 출처: [부산청년플랫폼 청년 월세 지원](https://young.busan.go.kr/index.nm?menuCd=37)
- ProgramVersion: `2026년 청년월세 지원사업 신규 수혜자 모집`
- 신청·혜택: 2026-03-30 09:00~2026-05-29 16:00, 현재 `CLOSED`; 월 최대 20만 원, 최대 24개월, 최대 480만 원
- 자동 규칙 후보: AGE, HOUSING, INCOME_BAND, REGION(NATIONAL)
- MANUAL_REVIEW: 청년·원가구 소득과 재산, 독립거주, 임대차, 친족임대, 공공임대, 중복수혜, 과거 24개월 수혜
- 테스트 5건: 기본 조건 충족→NEEDS_REVIEW / 연령 초과→NOT_ELIGIBLE / 주택 소유→NOT_ELIGIBLE / 지역 UNKNOWN이어도 REGION PASS / 가구소득·재산 미확인→NEEDS_REVIEW

## 12. 부산 머물자리론

- slug 초안: `busan-meomuljari-loan`
- 분야·범위: `YOUTH_HOUSING`, `CITY_WIDE/26000/ALL`
- 장기 제도명: `부산 청년 임차보증금 대출 및 대출이자 지원(머물자리론)`
- 주관·운영기관: 부산광역시 / 협약 금융기관과 운영기관은 2026 공고문에서 확정
- 공식 출처: [부산청년플랫폼 머물자리론](https://young.busan.go.kr/index.nm?menuCd=0)
- 신청·혜택 초안: 2026년 월별 접수 안내, 임차보증금 대출 및 이자 지원; 한도·소득·주택요건은 첨부 공고 재확인
- 자동 규칙 후보: AGE, REGION, INCOME_BAND, HOUSING
- MANUAL_REVIEW: 무주택 세대주, 임대차계약, 소득, 대상주택, 은행 대출심사
- 테스트 5건: 부산 무주택 임차 청년→NEEDS_REVIEW / 연령 초과→NOT_ELIGIBLE / 부산 외 거주→NOT_ELIGIBLE / 주택 소유→NOT_ELIGIBLE / 금융심사 전→NEEDS_REVIEW

## 13. 전세보증금반환보증 보증료 지원

- slug 초안: `busan-jeonse-guarantee-fee-support`
- 분야·범위: `YOUTH_HOUSING`, `CITY_WIDE/26000/ALL`
- 주관·시행기관: 중앙·부산 역할과 구·군 시행기관을 2026 안내문에서 최종 분리 기재
- 공식 출처: [부산광역시 사업 안내](https://www.busan.go.kr/depart/reguarantee), [신청 안내](https://www.busan.go.kr/depart/reguarantee01)
- 신청·혜택 초안: 2026-01-01 이후 신청, 예산 소진 시까지; 청년 최대 40만 원으로 안내
- 자동 규칙 후보: AGE, REGION, INCOME_BAND, HOUSING
- MANUAL_REVIEW: 유효한 반환보증 가입·납부, 임차보증금, 소득, 주택 소유·중복수혜
- 테스트 5건: 부산 청년 보증가입자→NEEDS_REVIEW / 연령 초과→NOT_ELIGIBLE / 부산 외 거주→NOT_ELIGIBLE / 보증 미가입→NOT_ELIGIBLE / 소득·납부증빙 미확인→NEEDS_REVIEW

## 14. BMC 청년 매입임대주택

- slug 초안: `bmc-youth-purchase-rental-housing`
- 분야·범위: `YOUTH_HOUSING`; 공고의 `부산광역시` 표시는 공급주택 소재지이므로 신청자 거주요건을 첨부문서에서 확인하기 전 coverage 미확정
- SupportProgram: `BMC 청년 매입임대주택`
- ProgramVersion: `2026년 1차 청년 매입임대주택 모집`
- 주관·운영기관: 부산도시공사
- 공식 출처: [부산도시공사 임대 공고](https://apply.bmc.busan.kr/smw/smw113020/selectPbancRentHouseList.do), [부산도시공사 보도자료](https://www.bmc.busan.kr/board/view.do?boardId=BBS_0000083&dataSid=800259&menuCd=DOM_000000107004001000&orderBy=DATA_SID+DESC&paging=ok&startPage=1)
- 신청·혜택 초안: 2026년 1차 공고는 2026-06-12 게시, 2026-06-26 접수 종료로 확인; 공급호·임대조건은 공고 첨부 확인 필요
- 자동 규칙 후보: AGE, REGION, STUDENT, EMPLOYMENT, INCOME_BAND, HOUSING
- MANUAL_REVIEW: 입주자격 유형, 무주택 가구, 소득·자산, 혼인·부모 상태, 순위·배점
- 테스트 5건: 무주택 청년→NEEDS_REVIEW / 연령 초과→NOT_ELIGIBLE / 공고상 신청자 지역요건 경계값→확정 필요 / 주택 소유→NOT_ELIGIBLE / 소득·자산 심사 전→NEEDS_REVIEW

## 15. LH 청년전세임대

- slug 초안: `lh-youth-jeonse-rental`
- 분야·범위: `YOUTH_HOUSING`, `NATIONAL/null/null`
- 주관·운영기관: 국토교통부·한국토지주택공사 / 한국토지주택공사
- 공식 출처: [LH 청약플러스 청년전세임대 안내](https://apply.lh.or.kr/lhapply/cm/cntnts/cntntsView.do?cntntsId=1040&mi=1171)
- 신청·혜택 초안: 장기 제도 안내와 실제 모집 공고를 분리; 부산 사용자가 신청 가능한 최신 공고를 대표 버전으로 확정한 뒤 기간 입력
- 자동 규칙 후보: AGE, STUDENT, EMPLOYMENT, INCOME_BAND, HOUSING, REGION(NATIONAL)
- MANUAL_REVIEW: 대학·취업준비생 유형, 무주택, 소득·자산, 순위, 대상주택과 LH 권리분석
- 테스트 5건: 전국 무주택 청년→NEEDS_REVIEW / 연령·유형 불충족→NOT_ELIGIBLE / 주택 소유→NOT_ELIGIBLE / 지역 UNKNOWN이어도 REGION PASS / 소득·자산·순위 미확인→NEEDS_REVIEW

## 16. 행복주택 청년계층

- slug 초안: `happy-housing-youth`
- 분야·범위: `YOUTH_HOUSING`, `NATIONAL/null/null`
- SupportProgram: `행복주택`
- ProgramVersion: 최신 부산 공급 공고를 확보하면 해당 단지·차수로 생성; 현재는 2026 제도 안내 초안
- 주관·운영기관: 국토교통부 / 공고별 LH·BMC 등 공급기관
- 공식 출처: [마이홈포털 행복주택 안내](https://m.myhome.go.kr/hws/portal/cont/selectHappyHouseView.do)
- 신청·혜택 초안: 공급 공고별 기간·주택·임대조건이 달라 현재 신청상태는 `NEEDS_CONFIRMATION`
- 자동 규칙 후보: AGE, STUDENT, EMPLOYMENT, INCOME_BAND, HOUSING, REGION(NATIONAL)
- MANUAL_REVIEW: 계층 유형, 무주택 가구, 소득·자산, 청약·순위, 공급 공고별 거주·직장 요건
- 테스트 5건: 전국 청년계층 후보→NEEDS_REVIEW / 계층 연령 불충족→NOT_ELIGIBLE / 주택 소유→NOT_ELIGIBLE / 지역 UNKNOWN이어도 REGION PASS / 공고별 소득·자산 미확인→NEEDS_REVIEW

## 17. 청년 주거급여 분리지급

- slug 초안: `youth-housing-benefit-separate-payment`
- 분야·범위: `YOUTH_HOUSING`, `NATIONAL/null/null`
- 주관·시행기관: 국토교통부 / 보장기관과 주소지 행정복지센터
- 공식 출처: [마이홈포털 자가진단](https://www.myhome.go.kr/hws/portal/dgn/selectSelfDiagnosisYouthHousView.do), [마이홈 주거급여 안내](https://m.myhome.go.kr/hws/mbl/dgn/selectSelfDiagnosisHousAlowView.do)
- 신청·혜택 초안: 주거급여 수급가구의 미혼 청년이 부모와 별도 거주할 때 지역별 기준임대료 범위에서 분리 지급
- 자동 규칙 후보: AGE, STUDENT, INCOME_BAND, HOUSING, REGION(NATIONAL)
- MANUAL_REVIEW: 부모 가구 주거급여 수급, 별도 거주 사유·거리, 임대차·전입, 가구 구성
- 테스트 5건: 부모와 별도 거주 청년→NEEDS_REVIEW / 연령 범위 불충족→NOT_ELIGIBLE / 부모와 동일 거주→NOT_ELIGIBLE / 지역 UNKNOWN이어도 REGION PASS / 부모 가구 수급 여부 미확인→NEEDS_REVIEW

## 18. 청년전용 버팀목전세자금

- slug 초안: `youth-buttimok-jeonse-loan`
- 분야·범위: `YOUTH_HOUSING`, `NATIONAL/null/null`
- 주관·운영기관: 국토교통부 주택도시기금 / 기금 수탁은행
- 공식 출처: [주택도시기금 개인상품 안내](https://nhuf.molit.go.kr/FP/FP03/FP0301.jsp?searchWord=)
- 신청·혜택 초안: 전세자금 대출상품; 대출한도·금리·소득·자산·대상주택은 상품 상세 URL을 대표 출처로 확정한 뒤 입력
- 자동 규칙 후보: AGE, INCOME_BAND, HOUSING, REGION(NATIONAL)
- MANUAL_REVIEW: 세대주·무주택, 소득·자산, 임대차계약, 중복대출, 신용·은행심사
- 테스트 5건: 전국 무주택 청년 세대주→NEEDS_REVIEW / 연령 초과→NOT_ELIGIBLE / 주택 소유→NOT_ELIGIBLE / 지역 UNKNOWN이어도 REGION PASS / 금융·자산심사 전→NEEDS_REVIEW

## 19. 청년전용 보증부월세대출

- slug 초안: `youth-guaranteed-monthly-rent-loan`
- 분야·범위: `YOUTH_HOUSING`, `NATIONAL/null/null`
- 주관·운영기관: 국토교통부 주택도시기금 / 기금 수탁은행
- 공식 출처: [주택도시기금 개인상품 안내](https://nhuf.molit.go.kr/FP/FP03/FP0301.jsp?searchWord=)
- 신청·혜택 초안: 보증금과 월세 대출상품; 한도·금리·대상주택은 개별 상품 상세 URL 확인 전 확정하지 않음
- 자동 규칙 후보: AGE, INCOME_BAND, HOUSING, REGION(NATIONAL)
- MANUAL_REVIEW: 세대주·무주택, 소득·자산, 임대차계약, 중복대출, 신용·은행심사
- 테스트 5건: 전국 무주택 월세 청년→NEEDS_REVIEW / 연령 초과→NOT_ELIGIBLE / 주택 소유→NOT_ELIGIBLE / 주거유형 불충족→NOT_ELIGIBLE / 금융·자산심사 전→NEEDS_REVIEW

## 20. 부산지역 대학생 기숙사비 지원

- slug 초안: `busan-university-dormitory-fee-support`
- 분야·범위: `YOUTH_HOUSING`, `NATIONAL/null/null` + 부산 소재 대학·기숙사 요건 `MANUAL_REVIEW`
- 주관·운영기관: 부산광역시 지산학협력과 / 부산행복연합기숙사(사업시행자 한국사학진흥재단)
- 공식 출처: [부산청년플랫폼 사업 페이지](https://young.busan.go.kr/index.nm?menuCd=47)
- 신청·혜택 초안: 2026-01-07~2026-01-14(정시 신입생 2026-02-05~2026-02-11), 현재 `CLOSED`; 300명, 월 5만 원·연 60만 원, 사업기간 2026-03~2027-02
- 자동 규칙 후보: REGION(NATIONAL), STUDENT, HOUSING
- MANUAL_REVIEW: 부산 소재 대학 재학, 부산행복연합기숙사 입사, 원거리 통학 기준, 학교 추천·선발
- 테스트 5건: 부산 소재 대학 기숙사생→NEEDS_REVIEW / 학생 아님→NOT_ELIGIBLE / 지역 UNKNOWN이어도 REGION PASS / 대상 대학·기숙사 불충족→NOT_ELIGIBLE / 원거리·추천 여부 미확인→NEEDS_REVIEW

## 게시 전 공통 미해결 항목

다음 항목은 데이터 시트 승인과 별개로 실제 DB 입력 전에 공식 공고·첨부문서에서 확정해야 한다.

- 각 부산 사업의 정확한 운영기관
- 상시·예산소진형 제도의 신청유형과 확인 기준일
- 스파로스 아카데미의 입력 대상 기수
- 미래내일 일경험의 대표 ProgramVersion을 전국 제도 안내로 할지 특정 프로그램 공고로 할지
- LH 청년전세임대와 행복주택의 최신 부산 신청 가능 공고
- 주택도시기금 두 상품의 직접 상세 URL과 2026 적용 조건
- 각 공식 공고의 문서 식별자·발표일·원문 첨부 URL
- 규칙별 정확한 출처 위치와 승인 문구
- 테스트 사례의 실제 JSON 입력, 규칙 displayOrder 및 예상 rule outcome

위 항목이 남은 제도는 `DRAFT` 상태를 유지하며 게시 대상으로 간주하지 않는다.
