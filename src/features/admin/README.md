# Admin feature

관리자 인증과 지원제도 관리 API 경계입니다.

- `auth`: scrypt 비밀번호 검증, 서버 세션 생성·검증·폐기
- `programs`: 지원제도 목록·생성, DRAFT 구성, 규칙 테스트, readiness, 게시와 새 DRAFT 복제 서비스
- `ui`: native fetch API 클라이언트와 로그인·목록·생성·편집·검증·게시 화면
- Route Handler는 세션 관리자 ID와 URL ID를 서비스 입력에 주입하며 도메인 로직을 포함하지 않습니다.

게시 버전은 직접 수정하지 않으며 새 DRAFT는 출처를 새 ID로 복제한 뒤 규칙 참조를 다시 연결합니다. 보호 레이아웃은 HttpOnly 쿠키를 읽어 서버에서 세션을 검증합니다.
