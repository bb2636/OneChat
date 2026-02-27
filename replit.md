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
  components/      - UI components (NaverMap, ChatRoom, MainPage, etc.)
  lib/             - DB client (postgres), Supabase client, utilities
  android/         - Capacitor Android project (APK build)
backend/           - Express server (port 4000, not actively used)
  src/             - Server entry + routes
  prisma/          - DB init SQL, seed script
```

## Environment Variables
- `DATABASE_URL` - Replit PostgreSQL (runtime managed)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (Realtime/Auth)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` - Naver Maps API key
- `PORT` - App port (5000)
- `FRONTEND_ORIGIN` / `NEXT_PUBLIC_FRONTEND_ORIGIN` - https://weoncaes.replit.app
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth credentials

## Deployment
- **Target**: Autoscale
- **Build**: `cd frontend && npm install && npm run build`
- **Run**: `cd frontend && npm start` (port 5000)
- **Production URL**: https://weoncaes.replit.app

## Key Notes
- Frontend runs on port 5000 (Replit webview)
- Frontend has its own API routes (`app/api/`) - backend Express server is supplementary
- Database uses Replit's built-in PostgreSQL, not Supabase PostgreSQL
- Supabase is used only for Realtime (location sharing) and Auth (Google login)
- Accounts: `admin@admin.com` / `admin1234` (관리자), `test@test.com` / `test1234` (테스트), `test1@test.com` / `test1234` (test1)
- Prisma 제거됨 - `postgres` 라이브러리로 직접 DB 연결 (`frontend/lib/db.ts`, `backend/src/db/client.ts`)
- DB 스키마 초기화: `psql $DATABASE_URL -f backend/prisma/init.sql`
- Profile images: Base64 data URLs stored in DB (not filesystem)
- Profile image fallback: onError handlers show gray circle when image fails to load
- Profile update signal: localStorage "profileUpdated" flag triggers refetch on MainPage
- Android APK: Google OAuth uses Chrome intent + UA stripping for WebView compatibility
