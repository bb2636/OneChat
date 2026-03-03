# OneChat (원챗)

위치 기반 소셜 채팅 플랫폼

## Tech Stack
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, TanStack Query, Supabase Realtime
- **Database**: Replit PostgreSQL (`postgres` 라이브러리 직접 연결)
- **Auth**: Custom (bcryptjs) + Supabase Auth (Google OAuth)
- **Maps**: Naver Maps API
- **Mobile**: Capacitor (Android APK)

## Project Structure
```
frontend/                  - Next.js app (port 5000)
  app/
    api/
      auth/                - 로그인, 회원가입, Google OAuth, 비밀번호 찾기
        login/             - 일반 로그인
        signup/            - 회원가입
        signup-complete/   - 회원가입 완료 처리
        google/            - Google OAuth (route, callback, process)
        admin/login/       - 관리자 로그인
        check-username/    - 아이디 중복 확인
        check-nickname/    - 닉네임 중복 확인
        send-verification/ - 인증번호 발송
        verify-phone/      - 전화번호 인증
        forgot-password/   - 비밀번호 찾기 (4단계)
        me/                - 현재 로그인 사용자 조회
      chats/               - 채팅방 목록 조회
        [chatId]/messages/ - 메시지 CRUD
        [chatId]/members/  - 채팅방 멤버 관리
        [chatId]/read/     - 읽음 처리
        [chatId]/leave/    - 채팅방 나가기
        location-room/     - 위치 기반 채팅방
      friends/             - 친구 목록/추가/삭제
      users/
        profile/           - 프로필 조회/수정
        locations/         - 사용자 위치 조회
      admin/
        users/             - 관리자 사용자 관리 (조회/삭제)
        reports/           - 신고 내역 관리 (조회/상태변경/답변)
        inquiries/         - 문의 내역 관리 (조회/답변)
        terms/             - 이용약관 관리
      upload/
        profile/           - 프로필 이미지 업로드 (Base64)
        profile-from-url/  - URL에서 프로필 이미지 가져오기
      reports/             - 사용자 신고 등록
      inquiries/           - 사용자 문의 등록
      terms/               - 이용약관 조회
      location/update/     - 위치 업데이트
      workspaces/          - 워크스페이스 관리
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
- `SEED_API_KEY` - DB 시드 API 인증 키 (미설정 시 비활성화)

## Deployment
- **Target**: Autoscale
- **Build**: `cd frontend && npm install && npm run build`
- **Run**: `cd frontend && npm start` (port 5000)
- **Production URL**: https://weoncaes.replit.app
- 개발 DB와 배포 DB는 별도 인스턴스 — 배포 DB에 데이터 삽입은 seed API 사용

## Database Tables
- `users` - 사용자 (id, username, password_hash, name, nickname, email, phone_number, avatar_url, role, location 등)
- `friends` - 친구 관계 (user_id, friend_id, status)
- `chats` - 채팅방 (id, name, type, created_by)
- `chat_members` - 채팅방 멤버 (chat_id, user_id, last_read_message_id)
- `messages` - 메시지 (id, chat_id, sender_id, content, type)
- `reports` - 신고 (id, reporter_id, type, reason, description, status, admin_note)
- `inquiries` - 문의 (id, user_id, title, content, status)
- `inquiry_replies` - 문의 답변 (id, inquiry_id, content, author_type)
- `terms` - 이용약관 (id, title, content, required, order)
- `workspaces` - 워크스페이스 (id, name, owner_id)

## 주요 기능
- 일반 로그인/회원가입 (아이디+비밀번호, bcryptjs)
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

## Key Notes
- Frontend runs on port 5000 (Replit webview)
- Frontend has its own API routes (`app/api/`) — backend Express server 미사용
- Database: Replit PostgreSQL 사용 (Supabase PostgreSQL 아님)
- Supabase: Realtime (위치 공유) + Auth (Google 로그인)만 사용
- 개발 DB 테스트 계정: `test` / `test1234`
- Prisma 제거됨 — `postgres` 라이브러리로 직접 SQL 실행
- Profile images: Base64 data URLs로 DB에 저장
- Android APK: Google OAuth는 Chrome intent + UA stripping으로 WebView 호환
- 아바타: 프로필 이미지 없을 시 이니셜 + 시드 기반 컬러 폴백 표시
- 관리자 답변: 신고/문의 답변 500자 제한, 답변 완료 후에도 기존 답변 내용 유지
- APK 재빌드: 네이티브 코드 변경 시에만 필요
