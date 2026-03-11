# OneChat (원챗)

위치 기반 소셜 채팅 플랫폼

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, TanStack Query
- **Database**: Replit PostgreSQL (`postgres` 라이브러리 직접 연결)
- **Realtime**: Supabase Realtime (위치 공유, 메시지 전송)
- **Auth**: Custom JWT (bcryptjs + httpOnly cookie) + Supabase Auth (Google OAuth)
- **Maps**: Naver Maps API
- **Mobile**: Capacitor (Android APK, WebView remote URL 모드)
- **Push**: Web Push API + VAPID keys (`web-push` 패키지)

## Project Structure
```
frontend/                  - Next.js app (port 5000)
  app/
    api/
      auth/                - 인증 API
        login/             - 일반 로그인 (JWT 쿠키 발급)
        signup/            - 회원가입 (아이디 중복 확인)
        signup-complete/   - 회원가입 완료 (JWT 쿠키 발급)
        google/            - Google OAuth (route → callback → process)
        admin/login/       - 관리자 로그인
        check-username/    - 아이디 중복 확인
        check-nickname/    - 닉네임 중복 확인
        send-verification/ - 인증번호 발송
        verify-phone/      - 전화번호 인증
        forgot-password/   - 비밀번호 찾기 (4단계)
        me/                - 현재 사용자 조회
        logout/            - 로그아웃
      chats/               - 채팅방 CRUD
        [chatId]/messages/ - 메시지 조회/전송
        [chatId]/members/  - 멤버 조회/초대/강퇴
        [chatId]/read/     - 읽음 처리
        [chatId]/leave/    - 채팅방 나가기
        location-room/     - 위치 기반 채팅방 생성
      friends/             - 친구 목록/요청/삭제
      users/
        profile/           - 프로필 조회/수정
        locations/         - 사용자 위치 목록
      location/update/     - 내 위치 업데이트
      upload/
        profile/           - 프로필 이미지 업로드 (Base64)
        profile-from-url/  - URL에서 이미지 다운로드
      push/                - Push 구독/해제
      reports/             - 사용자 신고
      inquiries/           - 사용자 문의
      terms/               - 이용약관 조회
      workspaces/          - 워크스페이스 목록
      admin/               - 관리자 API (requireAdmin)
        users/             - 사용자 관리
        reports/           - 신고 관리
        inquiries/         - 문의 관리
        terms/             - 이용약관 관리
    (pages)
    page.tsx               - 스플래시 → 로그인 리다이렉트
    login/                 - 로그인 페이지
    signup/                - 회원가입 (5단계: step1~step5, complete)
    forgot-password/       - 비밀번호 찾기 (4단계: step1~step4, complete)
    home/                  - 메인 (채팅 목록)
    chat/[chatId]/         - 채팅방
    map/                   - 지도 (Naver Maps, 주변 사용자 표시)
    friends/search/        - 친구 검색
    mypage/edit/           - 프로필 수정
    admin/                 - 관리자 (login, dashboard)
    test-permissions/      - 권한 테스트 (개발용)
  components/
    MainPage.tsx           - 메인 (지도/채팅/친구/마이페이지 탭)
    ChatRoomClient.tsx     - 채팅방 클라이언트 (Supabase Realtime)
    ChatListItem.tsx       - 채팅 목록 아이템
    NaverMap.tsx           - 네이버 지도 (위치 추적, 유저 마커, 겹침 감지)
    BottomNavigation.tsx   - 하단 네비게이션 바
    SplashScreen.tsx       - 스플래시 화면
    Toast.tsx              - 토스트 알림
    ui/                    - 공통 UI (Avatar, Badge, Button, Card, Input 등)
  lib/
    db.ts                  - PostgreSQL 클라이언트 (postgres 라이브러리)
    auth.ts                - JWT 유틸 (signToken, verifyToken, requireAuth, requireAdmin)
    supabase.ts            - Supabase 클라이언트 (Realtime/Auth)
    push.ts                - Web Push 유틸 (sendPushToUser, sendPushToMultipleUsers)
    api.ts                 - API 엔드포인트 상수
    cn.ts                  - Tailwind 클래스 머지 유틸
    constants.ts           - 앱 상수
  hooks/
    usePushNotification.ts - Push 알림 구독 훅
  types/                   - TypeScript 타입 정의
  public/
    sw.js                  - Service Worker (Push 알림)
  android/                 - Capacitor Android 프로젝트
    app/src/main/java/com/onechat/app/
      MainActivity.java    - WebView 설정, 권한 처리, Bridge 인젝션
backend/                   - Express.js (현재 미사용, Next.js API routes로 대체)
```

## Environment Variables

### 공개 설정 (환경변수)
- `PORT` - 앱 포트 (5000)
- `FRONTEND_ORIGIN` / `NEXT_PUBLIC_FRONTEND_ORIGIN` - https://weoncaes.replit.app
- `GOOGLE_CLIENT_ID` - Google OAuth 클라이언트 ID
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 프로젝트 URL
- `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` - Naver Maps 클라이언트 ID
- `VAPID_PUBLIC_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - VAPID 공개키

### 민감 정보 (Replit Secrets)
- `DATABASE_URL` - PostgreSQL 연결 (런타임 자동 관리, dev/prod 분리)
- `JWT_SECRET` - JWT 서명 키 (미설정 시 서버 시작 불가)
- `GOOGLE_CLIENT_SECRET` - Google OAuth 시크릿
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 서비스 역할 키
- `VAPID_PRIVATE_KEY` - VAPID 비공개키

## Deployment
- **Target**: Autoscale
- **Build**: `cd frontend && npm install && npm run build`
- **Run**: `cd frontend && npm start` (port 5000)
- **Production URL**: https://weoncaes.replit.app
- 개발 DB와 배포 DB는 별도 인스턴스
- Seed API 제거됨 (보안상 삭제)

## Database Tables
- `users` - 사용자 (id UUID, username, password_hash, name, nickname, email, phone_number, avatar_url, role, latitude, longitude, location_updated_at 등)
- `chats` - 채팅방 (id, name, type: direct/group/location, workspace_id 등)
- `chat_members` - 채팅방 멤버 (chat_id, user_id, last_read_message_id 등)
- `messages` - 메시지 (id, chat_id, sender_id, content, type: text/image/system 등)
- `friendships` - 친구 관계 (requester_id, addressee_id, status: pending/accepted)
- `reports` - 신고 (reporter_id, reported_user_id, reason, status, admin_reply 등)
- `inquiries` - 문의 (user_id, title, content, status, admin_reply 등)
- `terms` - 이용약관 (type, version, content, is_active 등)
- `push_subscriptions` - Push 구독 (user_id, endpoint, p256dh, auth)

## Authentication Flow
- **일반 로그인**: username + password → bcrypt 검증 → JWT 발급 (`onechat_token` httpOnly cookie, 7일)
- **Google OAuth**: Supabase Auth → callback 페이지에서 access_token 추출 → `/api/auth/google/process`에서 서버측 검증 → JWT 발급
- **Google 최초 로그인**: 미가입 사용자 → `google_signup_token` 쿠키 (30분) → `/signup/step2`로 리다이렉트
- **인증 체크**: `requireAuth(request)` — JWT에서 userId 추출, 모든 API에 적용
- **관리자**: `requireAdmin(request)` — role='admin' 확인

## Android APK (Capacitor)
- **모드**: WebView remote URL (`server.url: https://weoncaes.replit.app`)
- **UA**: `appendUserAgent: 'OneChat-Android'` → `isNativeApp` 감지용
- **Bridge**: `window.OneChatBridge` — `openAppSettings()`, `hasLocationPermission()`, `requestLocationPermission()`
- **Google OAuth**: Chrome Custom Tabs (intent 필터, UA stripping)
- **권한**: ActivityResultLauncher 기반 위치 권한 요청
- **이벤트**: `onechat-location-granted` — 권한 허용 시 WebView로 dispatch
- **빌드**: `cd frontend && npx cap sync android && cd android && ./gradlew clean && ./gradlew assembleDebug`
- **현재 버전**: versionCode 2, versionName 1.1

## Push Notifications
- **방식**: Web Push API + VAPID keys (Firebase 불필요)
- **Service Worker**: `frontend/public/sw.js`
- **트리거**: 메시지 전송 → 다른 멤버 알림, 친구 추가 → 상대 알림
- **만료 처리**: 404/410 응답 시 구독 자동 삭제

## NaverMap UI
- 유저 마커: 프로필 이미지 또는 이니셜 아바타
- 버튼: 내 위치 이동 (좌하단), 겹친 유저 보기 (우하단, 겹친 유저 있을 때만)
- 겹친 유저 패널: 드래그 가능 바텀시트
- 버튼 위치: `bottom-36` (하단 네비게이션 바와 겹침 방지)

## Cache Control
- 모든 경로에 `Cache-Control: no-store, no-cache, must-revalidate` 헤더 적용
- WebView 캐시 방지 목적 (APK에서 최신 페이지 로딩 보장)

## Test Accounts
- **개발 DB**: `test@test.com` / `test1234`, 관리자 `admin@admin.com` / `admin1234`
- **배포 DB**: `test@test.com` / `test1234`, 관리자 `admin@admin.com` / `admin1234`

## Security Notes
- 민감한 키는 Replit Secrets에 저장 (JWT_SECRET, GOOGLE_CLIENT_SECRET, VAPID_PRIVATE_KEY)
- JWT_SECRET 미설정 시 서버 시작 불가 (throw Error)
- 모든 사용자 API에 JWT 인증 적용 (서버에서 userId 추출)
- Google OAuth: Supabase accessToken 서버측 검증
- 프로필 이미지: Base64 data URL로 DB 저장
- Seed API 제거됨 (중복 데이터 방지)
