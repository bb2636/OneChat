# 원챗 (OneChat)

위치 기반으로 주변 사용자들과 소통할 수 있는 소셜 플랫폼입니다.

## 📋 목차

- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [시작하기](#시작하기)
- [환경 변수 설정](#환경-변수-설정)
- [주요 기능](#주요-기능)
- [데이터베이스 설정](#데이터베이스-설정)
- [개발 가이드](#개발-가이드)

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Icons**: Lucide React
- **Maps**: Naver Maps API
- **Realtime**: Supabase Realtime

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: Supabase (PostgreSQL)
- **Authentication**: bcryptjs

## 📁 프로젝트 구조

```
oneChat/
├── frontend/                 # Next.js 프론트엔드
│   ├── app/                  # App Router 페이지 및 API
│   │   ├── api/              # API 라우트
│   │   │   └── auth/         # 인증 관련 API
│   │   ├── login/            # 로그인 페이지
│   │   ├── signup/           # 회원가입 (5단계)
│   │   ├── forgot-password/  # 비밀번호 찾기 (4단계)
│   │   ├── map/              # 지도 페이지
│   │   ├── home/             # 메인 페이지
│   │   └── admin/            # 관리자 페이지
│   ├── components/           # 재사용 가능한 컴포넌트
│   │   ├── ui/               # UI 컴포넌트
│   │   ├── NaverMap.tsx      # 지도 컴포넌트
│   │   ├── SplashScreen.tsx  # 스플래시 화면
│   │   └── Toast.tsx         # 토스트 알림
│   ├── lib/                  # 유틸리티 및 설정
│   │   ├── db.ts             # 데이터베이스 클라이언트
│   │   ├── supabase.ts       # Supabase 클라이언트
│   │   └── constants.ts     # 상수 정의
│   └── types/                # TypeScript 타입 정의
│
├── backend/                  # Express 백엔드
│   ├── src/                  # 소스 코드
│   │   ├── index.ts          # Express 서버 진입점
│   │   └── routes/           # API 라우트
│   ├── prisma/               # Prisma 설정
│   │   ├── schema.prisma     # 데이터베이스 스키마
│   │   └── seed.ts           # 시드 데이터
│   └── scripts/              # 유틸리티 스크립트
│
└── package.json              # 루트 패키지 설정
```

## 🚀 시작하기

### 1. 저장소 클론 및 의존성 설치

```bash
# 저장소 클론
git clone <repository-url>
cd oneChat

# 모든 의존성 설치 (루트, 백엔드, 프론트엔드)
npm run install:all
```

### 2. 환경 변수 설정

#### 루트 디렉토리 `.env` 파일 생성

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
DATABASE_URL=postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres

# 기타 설정
PORT=4000
FRONTEND_ORIGIN=http://localhost:3001
NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID=your-naver-maps-client-id
```

#### 프론트엔드 `.env.local` 파일 생성 (`frontend/.env.local`)

```env
# Supabase 설정 (클라이언트에서 사용)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# 데이터베이스 연결 (서버 컴포넌트용)
DATABASE_URL=postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres

# Naver Maps
NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID=your-naver-maps-client-id
```

### 3. 데이터베이스 마이그레이션

```bash
cd backend

# Prisma 마이그레이션 실행
npx prisma migrate dev --name init

# Prisma Client 생성
npx prisma generate

# 관리자 계정 생성 (선택사항)
npm run seed
```

### 4. 개발 서버 실행

```bash
# 루트 디렉토리에서 (프론트엔드 + 백엔드 동시 실행)
npm run dev

# 또는 개별 실행
npm run dev:frontend  # 프론트엔드만 (포트 3000)
npm run dev:backend   # 백엔드만 (포트 4000)
```

## ⚙️ 환경 변수 설정

### .env와 .env.local의 차이

#### `.env`
- 프로젝트 전체에서 공유되는 기본 환경 변수
- 우선순위: 낮음 (`.env.local`이 있으면 덮어씀)
- 예시: 공통 설정, 기본값

#### `.env.local`
- 로컬 개발 환경 전용 환경 변수 (비밀 키 등)
- 우선순위: 높음 (`.env`보다 우선)
- Git에 커밋하지 않음
- Next.js가 자동으로 로드

### Next.js 환경 변수 우선순위
1. `.env.local` (항상 로드, 모든 환경) - **최우선**
2. `.env.development` 또는 `.env.production` (환경별)
3. `.env` (기본값)

### 중요 사항
- **절대 `.env.local`을 Git에 커밋하지 마세요!** (비밀 키 포함)
- `NEXT_PUBLIC_` 접두사가 붙은 변수만 클라이언트에서 접근 가능합니다
- Service Role Key는 서버에서만 사용하고 클라이언트에 노출하지 마세요

## 🎯 주요 기능

### 인증 시스템
- ✅ 스플래시 화면 (3초 후 자동 리다이렉트)
- ✅ 로그인 (아이디/비밀번호)
- ✅ 회원가입 (5단계)
  1. 아이디 및 비밀번호 입력
  2. 닉네임, 이름, 프로필 이미지
  3. 휴대폰 번호 입력
  4. 인증번호 확인 (6자리, 5분 타이머)
  5. 약관 동의
- ✅ 비밀번호 찾기 (4단계)
  1. 아이디 입력
  2. 전화번호 입력
  3. 인증번호 확인
  4. 새 비밀번호 설정
- ✅ 관리자 로그인

### 지도 기능
- ✅ Naver Maps API 통합
- ✅ GPS 위치 자동 감지
- ✅ 실시간 위치 공유 (Supabase Realtime)
- ✅ 다른 유저 위치 표시 (프로필 이미지 마커)
- ✅ 위치 업데이트 스로틀링 (최소 10초 간격)
- ✅ 커스텀 마커 + 10m 반경 원 + 펄스 애니메이션
- ✅ Haversine 거리 계산 기반 근접 판정(10m)
- ✅ 근접 유저 InfoWindow (`채팅하기`, `친구추가`)

### 사용자 관리
- ✅ 아이디/닉네임 중복 확인
- ✅ 프로필 이미지 업로드
- ✅ 위치 기반 사용자 검색

### 관리자 기능
- ✅ 관리자 대시보드
- ✅ 사용자 관리
- ✅ 신고 관리
- ✅ 문의 관리
- ✅ 약관 관리

## 🗄 데이터베이스 설정

### Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 가입 및 로그인
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - **Name**: 프로젝트 이름
   - **Database Password**: 강력한 비밀번호 설정 (반드시 저장!)
   - **Region**: 가장 가까운 리전 선택

### 연결 정보 가져오기

#### API 키
1. Supabase 대시보드 > **Settings** > **API**
2. 다음 정보 복사:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (서버 전용)

#### 데이터베이스 연결 문자열
1. Supabase 대시보드 > **Settings** > **Database**
2. **Connection string**에서 아래 2가지를 각각 복사해 설정
   - **Pooling URL** -> `DATABASE_URL`
   - **Direct URL** -> `DIRECT_URL` (Prisma `db push`/migrate 용)
3. 비밀번호를 실제 비밀번호로 교체하고, 특수문자는 URL 인코딩

예시:
```env
DATABASE_URL="postgresql://postgres.<project-ref>:<PASSWORD>@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:<PASSWORD>@db.<project-ref>.supabase.co:5432/postgres"
```

### Supabase Realtime 활성화

1. Supabase 대시보드 > **Database** > **Replication**
2. `users` 테이블 찾기
3. **Enable Realtime** 토글 활성화

또는 SQL Editor에서:
```sql
-- Realtime 활성화 (Supabase 대시보드에서도 가능)
ALTER PUBLICATION supabase_realtime ADD TABLE users;
```

## 📝 개발 가이드

### 스크립트 명령어

#### 루트 디렉토리
```bash
npm run dev              # 프론트엔드 + 백엔드 동시 실행
npm run build            # 프로덕션 빌드
npm run install:all      # 모든 의존성 설치
```

#### 백엔드
```bash
cd backend
npm run dev              # 개발 서버 (포트 4000)
npm run build            # TypeScript 컴파일
npm run seed             # 관리자 계정 생성
npm run studio           # Prisma Studio 실행
```

#### 프론트엔드
```bash
cd frontend
npm run dev              # 개발 서버 (포트 3000)
npm run build            # 프로덕션 빌드
npm run start            # 프로덕션 서버 실행
```

### 데이터베이스 관리

#### Prisma Studio 실행
```bash
cd backend
npm run studio
```

#### 마이그레이션 생성
```bash
cd backend
npx prisma migrate dev --name migration_name
```

#### 스키마를 Supabase에 반영 (`db push`)
```bash
cd backend
npx prisma db push
```

#### Prisma Client 재생성
```bash
cd backend
npx prisma generate
```

### 기본 관리자 계정

시드 데이터 실행 후 생성되는 기본 관리자 계정:
- **아이디**: `admin`
- **비밀번호**: `admin1234`

⚠️ **프로덕션 환경에서는 반드시 비밀번호를 변경하세요!**

## 🗂 데이터베이스 스키마

주요 테이블:
- `users` - 사용자 정보 (위치 정보 포함)
- `workspaces` - 워크스페이스
- `chats` - 채팅 세션
- `messages` - 메시지
- `friendships` - 친구 관계
- `push_notifications` - 푸시 알림
- `reports` - 신고 내역
- `inquiries` - 문의 내역
- `terms` - 약관 관리

자세한 스키마는 `backend/prisma/schema.prisma` 파일을 참고하세요.

## 🔒 보안 주의사항

1. **환경 변수 보호**
   - `.env.local` 파일을 절대 Git에 커밋하지 마세요
   - Service Role Key는 서버에서만 사용

2. **비밀번호 해싱**
   - 모든 비밀번호는 bcrypt로 해싱되어 저장됩니다

3. **인증번호**
   - 개발 환경에서는 콘솔에 출력됩니다
   - 프로덕션에서는 실제 SMS 발송 서비스 연동 필요

## 🐛 문제 해결

### 빌드 오류
- TypeScript 타입 오류: `npm run build` 실행 전 타입 체크
- 모듈을 찾을 수 없음: `npm run install:all` 실행

### 데이터베이스 연결 오류
- `DATABASE_URL`(pooling) / `DIRECT_URL`(direct) 구분 설정 확인
- Supabase 프로젝트가 활성화되어 있는지 확인
- 비밀번호에 특수문자가 있으면 URL 인코딩 필요

### Realtime이 작동하지 않음
- Supabase 대시보드에서 Realtime이 활성화되어 있는지 확인
- `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 확인
- 브라우저 콘솔에서 에러 확인

## 📁 정적 파일 관리

### Public 폴더 구조
```
public/
├── images/
│   ├── logo.png          # 메인 로고
│   └── onechat.png       # 텍스트 로고
└── uploads/
    └── profiles/         # 업로드된 프로필 이미지
```

### 접근 경로
- `public/images/logo.png` → `/images/logo.png`
- `public/uploads/profiles/xxx.jpg` → `/uploads/profiles/xxx.jpg`

## 🚀 GitHub 업로드 준비

1. 민감정보 점검
```bash
git status
git diff
```
- `.env`, `.env.local` 파일은 커밋 금지 (현재 `.gitignore`에 포함)
- 노출된 Supabase 키가 있다면 대시보드에서 즉시 Rotate 권장

2. 로컬 검증
```bash
npm run build
```

3. 커밋
```bash
git add .
git commit -m "chore: supabase migration and map realtime improvements"
```

4. 원격 저장소 연결/푸시
```bash
git remote add origin <YOUR_GITHUB_REPO_URL>
git branch -M main
git push -u origin main
```

## 📚 참고 자료

- [Next.js 공식 문서](https://nextjs.org/docs)
- [Supabase 공식 문서](https://supabase.com/docs)
- [Prisma 공식 문서](https://www.prisma.io/docs)
- [Naver Maps API 문서](https://navermaps.github.io/maps.js.ncp/)

## 📄 라이선스

이 프로젝트는 비공개 프로젝트입니다.
