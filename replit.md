# OneChat (원챗)

위치 기반 소셜 채팅 플랫폼

## Tech Stack
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, TanStack Query, Supabase Realtime
- **Backend**: Express.js (TypeScript), Prisma ORM
- **Database**: Replit PostgreSQL (Prisma schema at `backend/prisma/schema.prisma`)
- **Auth**: Custom (bcryptjs) + Supabase Auth (Google OAuth)
- **Maps**: Naver Maps API

## Project Structure
```
frontend/          - Next.js app (port 5000)
  app/             - Pages and API routes
  components/      - UI components (NaverMap, ChatRoom, etc.)
  lib/             - DB client (postgres), Supabase client, utilities
backend/           - Express server (port 4000, not actively used)
  src/             - Server entry + routes
  prisma/          - Schema and seed
```

## Environment Variables
- `DATABASE_URL` - Replit PostgreSQL (runtime managed)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (Realtime/Auth)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` - Naver Maps API key
- `PORT` - Backend port (4000)
- `FRONTEND_ORIGIN` / `NEXT_PUBLIC_FRONTEND_ORIGIN` - Replit dev domain

## Key Notes
- Frontend runs on port 5000 (Replit webview)
- Frontend has its own API routes (`app/api/`) - backend Express server is supplementary
- Database uses Replit's built-in PostgreSQL, not Supabase PostgreSQL
- Supabase is used only for Realtime (location sharing) and Auth (Google login)
- Test admin account: `test` / `test1234`
- Prisma schema has `directUrl` removed (single DATABASE_URL from Replit)
