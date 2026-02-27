# OneChat (원챗)

위치 기반 소셜 채팅 플랫폼

## Tech Stack
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, TanStack Query, Supabase Realtime
- **Backend**: Express.js (TypeScript)
- **Database**: Replit PostgreSQL (직접 연결, `postgres` 라이브러리 사용)
- **Auth**: Custom (bcryptjs) + Supabase Auth (Google OAuth)
- **Maps**: Naver Maps API
- **Mobile**: Capacitor (Android APK - OneChat-1.0.apk)

## Project Structure
```
frontend/          - Next.js app (port 5000)
  app/             - Pages and API routes
    api/auth/      - 로그인, 회원가입, Google OAuth
    api/chats/     - 채팅방 CRUD, 메시지
    api/users/     - 프로필 조회/수정
    api/seed/      - DB 시드 (환경변수 SEED_API_KEY 필요)
  components/      - UI components (NaverMap, ChatRoom, MainPage, etc.)
  lib/             - DB client (postgres), Supabase client, utilities
  android/         - Capacitor Android project (APK build)
backend/           - Express server (port 4000, not actively used)
  src/             - Server entry + routes
  prisma/          - DB init SQL, seed script
```

## Environment Variables
- `DATABASE_URL` - Replit PostgreSQL (runtime managed, 개발/배포 DB 분리됨)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (Realtime/Auth)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` - Naver Maps API key
- `PORT` - App port (5000)
- `FRONTEND_ORIGIN` / `NEXT_PUBLIC_FRONTEND_ORIGIN` - https://weoncaes.replit.app
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth credentials
- `SEED_API_KEY` - (선택) DB 시드 API 인증 키, 미설정 시 시드 API 비활성화

## Deployment
- **Target**: Autoscale
- **Build**: `cd frontend && npm install && npm run build`
- **Run**: `cd frontend && npm start` (port 5000)
- **Production URL**: https://weoncaes.replit.app
- 개발 DB와 배포(퍼블리싱) DB는 별도 — 배포 DB에 데이터 삽입은 seed API를 통해 진행

## 주요 기능 변경사항

### Google OAuth 프로필 보존
- 구글 로그인 시 사용자가 직접 설정한 프로필(이름, 아바타)을 덮어쓰지 않음
- 최초 로그인 시에만 구글 프로필 정보가 DB에 저장되고, 이후 로그인에서는 기존 값 유지
- 파일: `frontend/app/api/auth/google/process/route.ts`

### 프로필 이미지 안정성
- 프로필 이미지 로딩 실패 시 회색 원형 폴백 표시 (onError 핸들러)
- 마이페이지, 친구 목록, 프로필 수정 페이지 모두 적용
- 파일: `frontend/components/MainPage.tsx`, `frontend/app/mypage/edit/page.tsx`

### 프로필 수정 후 즉시 반영
- 프로필 수정 완료 시 localStorage 신호로 MainPage에 알림
- 마이페이지 탭 진입 시 프로필 데이터 자동 리패치
- 파일: `frontend/components/MainPage.tsx`, `frontend/app/mypage/edit/page.tsx`

### DB 시드 API
- `POST /api/seed?key=<SEED_API_KEY>` — 테스트 사용자, 친구 관계, 채팅방+메시지 자동 생성
- 환경변수 `SEED_API_KEY` 미설정 시 403 반환 (비활성화)
- username `test` (비밀번호 `test1234`) 중심으로 친구 7명, 채팅방 6개(1:1 2개, 그룹 4개) 생성
- 파일: `frontend/app/api/seed/route.ts`

## Key Notes
- Frontend runs on port 5000 (Replit webview)
- Frontend has its own API routes (`app/api/`) - backend Express server is supplementary
- Database uses Replit's built-in PostgreSQL, not Supabase PostgreSQL
- Supabase is used only for Realtime (location sharing) and Auth (Google login)
- 개발 DB 계정: `admin@admin.com` / `admin1234`, `test@test.com` / `test1234`, `test1@test.com` / `test1234`
- Prisma 제거됨 — `postgres` 라이브러리로 직접 DB 연결
- Profile images: Base64 data URLs stored in DB (not filesystem)
- Android APK: Google OAuth uses Chrome intent + UA stripping for WebView compatibility
- APK 재빌드 필요 조건: 네이티브 코드(MainActivity.java, capacitor.config.ts, build.gradle) 변경 시에만
