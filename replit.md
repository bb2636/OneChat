# OneChat (원챗)

위치 기반 소셜 채팅 플랫폼

## Tech Stack
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, TanStack Query, Supabase Realtime
- **Database**: Replit PostgreSQL (`postgres` 라이브러리 직접 연결)
- **Auth**: Custom (bcryptjs + JWT httpOnly cookie) + Supabase Auth (Google OAuth)
- **Maps**: Naver Maps API
- **Mobile**: Capacitor (Android APK)

## Project Structure
```
frontend/                  - Next.js app (port 5000)
  app/
    api/
      auth/                - 로그인, 회원가입, Google OAuth, 비밀번호 찾기
        login/             - 일반 로그인 (JWT 쿠키 발급)
        signup/            - 회원가입
        signup-complete/   - 회원가입 완료 처리 (JWT 쿠키 발급)
        google/            - Google OAuth (route → callback → process, JWT 쿠키 발급)
        admin/login/       - 관리자 로그인 (JWT 쿠키 발급)
        check-username/    - 아이디 중복 확인
        check-nickname/    - 닉네임 중복 확인
        send-verification/ - 인증번호 발송
        verify-phone/      - 전화번호 인증
        forgot-password/   - 비밀번호 찾기 (4단계)
        me/                - 현재 로그인 사용자 조회 (JWT 쿠키 기반)
        logout/            - 로그아웃 (쿠키 삭제)
      chats/               - 채팅방 목록 조회/생성
        [chatId]/messages/ - 메시지 조회/전송
        [chatId]/members/  - 채팅방 멤버 조회/초대/강퇴
        [chatId]/read/     - 읽음 처리
        [chatId]/leave/    - 채팅방 나가기
        location-room/     - 위치 기반 채팅방
      friends/             - 친구 목록/추가/삭제
      users/
        profile/           - 프로필 조회/수정
      admin/               - 관리자 전용 (requireAdmin 보호)
        users/             - 사용자 관리 (조회/삭제)
        reports/           - 신고 관리 (조회/상태변경/답변)
        inquiries/         - 문의 관리 (조회/답변)
        terms/             - 이용약관 관리
      upload/
        profile/           - 프로필 이미지 업로드 (Base64)
        profile-from-url/  - URL에서 프로필 이미지 가져오기
      reports/             - 사용자 신고 등록
      inquiries/           - 사용자 문의 등록
      terms/               - 이용약관 조회
      location/update/     - 위치 업데이트
      seed/                - DB 시드 (테스트 데이터 생성)
    admin/
      login/               - 관리자 로그인 페이지
      dashboard/           - 관리자 대시보드 (사용자/신고/문의 관리)
    chat/[chatId]/         - 채팅방 화면
    home/                  - 메인 홈 (친구/채팅/마이페이지 탭)
    login/                 - 로그인 페이지
    signup/                - 회원가입 (5단계)
    forgot-password/       - 비밀번호 찾기 (4단계)
    friends/search/        - 친구 검색
    map/                   - 지도 화면 (Naver Maps)
    mypage/edit/           - 프로필 수정
  components/
    MainPage.tsx           - 메인 페이지 (친구/채팅/마이페이지 탭)
    ChatRoom.tsx           - 채팅방 컴포넌트
    ChatListItem.tsx       - 채팅 목록 아이템 (스와이프 삭제)
    NaverMap.tsx           - 네이버 지도 컴포넌트
    ui/avatar.tsx          - 아바타 컴포넌트 (컬러 이니셜 폴백)
  lib/
    db.ts                  - PostgreSQL 클라이언트 (postgres 라이브러리)
    auth.ts                - JWT 인증 유틸리티 (signToken, verifyToken, requireAuth, requireAdmin, getUserFromRequest)
    supabase.ts            - Supabase 클라이언트 (Realtime/Auth)
  android/                 - Capacitor Android 프로젝트
```

## Environment Variables
- `DATABASE_URL` - Replit PostgreSQL (런타임 자동 관리, 개발/배포 DB 분리)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 프로젝트 URL (Realtime/Auth)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` - Naver Maps API key
- `PORT` - 앱 포트 (5000)
- `FRONTEND_ORIGIN` / `NEXT_PUBLIC_FRONTEND_ORIGIN` - https://weoncaes.replit.app
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth 인증 정보
- `JWT_SECRET` - JWT 토큰 서명 키 (64자 hex, 자동 생성됨, 미설정 시 서버 시작 불가)
- `SEED_API_KEY` - DB 시드 API 인증 키 (미설정 시 비활성화)

## Deployment
- **Target**: Autoscale
- **Build**: `cd frontend && npm install && npm run build`
- **Run**: `cd frontend && npm start` (port 5000)
- **Production URL**: https://weoncaes.replit.app
- 개발 DB와 배포 DB는 별도 인스턴스 — 배포 DB에 데이터 삽입은 seed API 사용

## Database Tables
- `users` - 사용자 (id, username, password_hash, name, nickname, email, phone_number, avatar_url, role, latitude, longitude, location_updated_at 등)
- `friendships` - 친구 관계 (id, requester_id, addressee_id, status, created_at, updated_at)
- `chats` - 채팅방 (id, title, workspace_id, user_id1, user_id2, chat_type, thumbnail_url, member_limit, pinned)
- `chat_members` - 채팅방 멤버 (chat_id, user_id, role, last_read_message_id, joined_at)
- `messages` - 메시지 (id, chat_id, role, content, image_url, is_deleted, created_at)
- `reports` - 신고 (id, reporter_id, reported_id, type, reason, description, status, admin_note, handled_by, handled_at)
- `inquiries` - 문의 (id, user_id, category, subject, content, status)
- `inquiry_replies` - 문의 답변 (id, inquiry_id, user_id, content, is_admin)
- `terms` - 이용약관 (id, title, content, required, order)
- `push_subscriptions` - 푸시 구독 (id, user_id, endpoint, p256dh, auth, created_at)

## 주요 기능
- 일반 로그인/회원가입 (이메일+비밀번호, bcryptjs) — 아이디는 이메일 형식만 허용
- Google OAuth 로그인 (Supabase Auth 연동)
- 실시간 채팅 (Supabase Realtime)
- 1:1 및 그룹 채팅
- 위치 기반 채팅방
- 네이버 지도 기반 위치 공유
- 친구 관리 (검색/추가/삭제)
- 프로필 관리 (이미지 업로드, 닉네임 수정)
- 관리자 대시보드 (사용자/신고/문의 관리)
- 스와이프 삭제 (채팅 목록, 친구 목록)
- 비밀번호 찾기 (전화번호 인증)
- Android APK (Capacitor)

## Authentication
- **JWT 토큰**: 로그인/회원가입/Google OAuth 완료 시 JWT 발급 → httpOnly 쿠키(`onechat_token`)로 설정
- **토큰 만료**: 7일
- **JWT 페이로드**: `{ userId, role }` (role: "user" 또는 "admin")
- **토큰 추출**: 쿠키 → Authorization Bearer 헤더 순으로 확인 (`getTokenFromRequest`)
- **인증 유틸리티** (`frontend/lib/auth.ts`):
  - `signToken(payload)` — JWT 생성
  - `verifyToken(token)` — JWT 검증 (유효하지 않으면 null)
  - `getUserFromRequest(request)` — 요청에서 JWT 추출 및 검증
  - `requireAuth(request)` — 인증 필수 (미인증 시 401)
  - `requireAdmin(request)` — 관리자 필수 (JWT role + DB role 이중 검증, 미인증 401 / 권한없음 403)
  - `createTokenCookieHeader(token)` — Set-Cookie 헤더 생성 (HttpOnly, SameSite=Lax, production에서 Secure)
  - `createLogoutCookieHeader()` — 쿠키 삭제 헤더
- **JWT 발급 경로**:
  - `/api/auth/login` — 일반 로그인
  - `/api/auth/admin/login` — 관리자 로그인
  - `/api/auth/google/process` — Google OAuth 완료
  - `/api/auth/signup-complete` — 회원가입 완료
- **인증 엔드포인트**:
  - `/api/auth/me` — JWT 쿠키에서 사용자 정보 조회
  - `/api/auth/logout` — 쿠키 삭제
- **관리자 API 보호**: `/api/admin/*` 전체에 `requireAdmin()` 적용
- **관리자 대시보드**: `adminFetch()` 헬퍼로 모든 관리자 API 호출, 401/403 시 자동 로그인 리다이렉트
- **프론트엔드**: localStorage에 userId 캐시 유지 (기존 호환), 쿠키는 자동 전송
- **보안 주의**: JWT_SECRET 미설정 시 서버 시작 불가 (throw Error)

## Key Notes
- Frontend runs on port 5000 (Replit webview)
- Frontend has its own API routes (`app/api/`) — backend Express server 미사용
- Database: Replit PostgreSQL 사용 (Supabase PostgreSQL 아님)
- Supabase: Realtime (위치 공유) + Auth (Google 로그인)만 사용
- 개발 DB 테스트 계정: `test@test.com` / `test1234`, 관리자: `admin@admin.com` / `admin1234`
- Prisma 제거됨 — `postgres` 라이브러리로 직접 SQL 실행
- Profile images: Base64 data URLs로 DB에 저장
- Android APK: Google OAuth는 Chrome intent + UA stripping으로 WebView 호환
- 아바타: 프로필 이미지 없을 시 이니셜 + 시드 기반 컬러 폴백 표시
- 관리자 답변: 신고/문의 답변 500자 제한, 답변 완료 후에도 기존 답변 내용 유지
- APK 재빌드: 네이티브 코드 변경 시에만 필요

## 보안 완료 사항
- 모든 User API routes (chats, friends, profile, messages, location 등) JWT 인증 적용 — 서버에서 userId 추출
- Google OAuth: Supabase accessToken 서버 사이드 검증 (supabaseAdmin.auth.getUser)
- Google signup: signed httpOnly 쿠키 (google_signup_token, 30분 만료) 사용
- 채팅 목록 쿼리 LATERAL JOIN 최적화 완료
- 프론트엔드: userId/requesterId/creatorId를 API 호출 body/query에서 제거 완료

## Push Notifications (Web Push API)
- **방식**: Web Push API + VAPID keys (Firebase 불필요)
- **환경변수**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- **패키지**: `web-push` (npm)
- **DB 테이블**: `push_subscriptions` (id, user_id, endpoint, p256dh, auth, created_at)
- **서비스 워커**: `frontend/public/sw.js`
- **클라이언트 훅**: `frontend/hooks/usePushNotification.ts` — MainPage에서 자동 구독
- **서버 유틸**: `frontend/lib/push.ts` — `sendPushToUser()`, `sendPushToMultipleUsers()`
- **API**: `/api/push/subscribe` (POST), `/api/push/unsubscribe` (POST)
- **알림 트리거**: 메시지 전송 시 → 다른 멤버에게 알림, 친구 추가 시 → 상대에게 알림
- **만료 처리**: 404/410 응답 시 자동으로 구독 삭제

## 지도 (NaverMap) UI
- **오버레이 포지셔닝**: 지도 위 버튼/패널은 `absolute` 포지션 (NaverMap 루트 `relative` div 기준)
- **겹친 유저 패널**: 드래그 가능한 바텀시트 (위로 슬라이드: 전체화면 확장, 아래로 슬라이드: 축소)
- **유저 카운트**: `overlapUsers.length` (본인 제외, 겹친 다른 유저 수만 표시)
- **닫기**: "닫기" 버튼 또는 배경 탭으로 패널 닫기
- **버튼**: 내 위치 이동 (좌하단), 겹친 유저 보기 (우하단, 겹친 유저 있을 때만 표시)
- **Seed API (GET)**: `/api/seed?key=...&action=cleanup-chats|fix-username` — 프로덕션 DB 관리용, 사용 후 제거 권장

## 알려진 개선 필요 사항
- 다수의 `any` 타입 사용 및 `unknown as` 캐스팅
- 미사용 코드 존재 (backend/, 일부 UI 컴포넌트, unused API routes)
- Seed API GET 엔드포인트: 프로덕션 DB 정리 완료 후 제거 권장
