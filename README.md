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
│   │   │   ├── admin/        # 관리자 API (사용자, 신고, 문의, 약관)
│   │   │   ├── auth/         # 인증 관련 API
│   │   │   ├── chats/        # 채팅 API (목록, 생성, 메시지, 멤버, 나가기)
│   │   │   ├── friends/      # 친구 API (목록, 추가, 삭제)
│   │   │   ├── inquiries/    # 문의 API
│   │   │   ├── reports/      # 신고 API
│   │   │   ├── upload/       # 파일 업로드 API
│   │   │   └── users/        # 사용자 프로필 API
│   │   ├── login/            # 로그인 페이지
│   │   ├── signup/           # 회원가입 (5단계)
│   │   ├── forgot-password/  # 비밀번호 찾기 (4단계)
│   │   ├── map/              # 지도 페이지
│   │   ├── home/             # 메인 페이지 (채팅/친구/마이페이지)
│   │   ├── chat/             # 채팅방 상세 페이지
│   │   ├── friends/          # 친구 검색 페이지
│   │   ├── mypage/           # 마이페이지 (프로필 수정)
│   │   └── admin/            # 관리자 페이지
│   ├── components/           # 재사용 가능한 컴포넌트
│   │   ├── ui/               # UI 컴포넌트
│   │   ├── NaverMap.tsx      # 지도 컴포넌트
│   │   ├── MainPage.tsx      # 메인 페이지 (채팅/친구/마이페이지)
│   │   ├── ChatListItem.tsx  # 채팅 목록 아이템 (슬라이드 삭제)
│   │   ├── ChatRoomClient.tsx # 채팅방 클라이언트
│   │   ├── BottomNavigation.tsx # 하단 네비게이션
│   │   ├── SplashScreen.tsx  # 스플래시 화면
│   │   └── Toast.tsx         # 토스트 알림
│   ├── lib/                  # 유틸리티 및 설정
│   │   ├── db.ts             # 데이터베이스 클라이언트
│   │   ├── supabase.ts       # Supabase 클라이언트
│   │   ├── constants.ts      # 상수 정의
│   │   └── cn.ts             # className 유틸리티
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
FRONTEND_ORIGIN=http://localhost:3000
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

# 프론트엔드 Origin (구글 소셜 로그인 콜백용)
NEXT_PUBLIC_FRONTEND_ORIGIN=http://localhost:3000
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
- ✅ 구글 소셜 로그인 (Supabase Auth 연동)
- ✅ 회원가입 (5단계)
  1. 아이디 및 비밀번호 입력
  2. 닉네임, 이름, 프로필 이미지
  3. 휴대폰 번호 입력
  4. 인증번호 확인 (6자리, 5분 타이머, 붙여넣기 지원)
  5. 약관 동의
- ✅ 비밀번호 찾기 (4단계)
  1. 아이디 입력
  2. 전화번호 입력
  3. 인증번호 확인 (6자리, 붙여넣기 지원)
  4. 새 비밀번호 설정
- ✅ 관리자 로그인
- ✅ 로그아웃 (모든 캐시 삭제 후 스플래시 화면으로 이동)

### 지도 기능
- ✅ Naver Maps API 통합
- ✅ GPS 위치 자동 감지
- ✅ 실시간 위치 공유 (Supabase Realtime)
- ✅ 사용자 위치 표시
  - 내 위치: 파란색 원 및 마커
  - 다른 유저: 초록색, 분홍색, 하늘색, 노란색, 흰색 순환 표시
  - 프로필 이미지가 마커에 표시됨
- ✅ 위치 업데이트 스로틀링 (최소 10초 간격)
- ✅ 커스텀 마커 + 10m 반경 원 + 펄스 애니메이션
- ✅ Haversine 거리 계산 기반 근접 판정(10m)
- ✅ 근접 유저 패널
  - 겹치는 유저 목록 표시
  - 친구추가 및 채팅방 생성 옵션
  - 새로운 유저 겹침 시 알림 표시
- ✅ 위치 기반 채팅방 생성
  - 썸네일 이미지 업로드
  - 채팅방 이름 (최대 30자)
  - 채팅방 설명 (최대 300자)
  - 인원 제한 (2-100명, 순환 스크롤)
- ✅ 지도 컨트롤
  - 내 위치로 이동 버튼 (과녁 이모지)
  - 겹치는 유저 보기 버튼 (말풍선 이모지, 겹치는 유저가 있을 때만 표시)
  - 채팅방 생성 모달 진입 시 지도 컨트롤 숨김

### 채팅 기능
- ✅ 채팅방 목록
  - 읽지 않은 메시지 개수 배지 (파란색, 999+ 표시, 0개일 때 숨김)
  - 최근 메시지 미리보기
  - 시간 표시 (오늘/어제/날짜)
  - 슬라이드로 나가기 버튼 표시 (왼쪽 슬라이드 시 삭제 버튼 활성화)
  - 그룹 채팅 썸네일 표시 (썸네일이 있으면 이미지, 없으면 아바타 오버랩)
- ✅ 위치 기반 채팅방
  - 채팅방 생성 (썸네일, 이름, 설명, 인원제한)
  - 중복 채팅방 생성 방지 (이미 해당 유저와 채팅방이 있으면 알림)
  - 채팅방 초기 표시
    - 생성 날짜 표시 (예: "2026년 02월 01일 일요일")
    - 멤버 입장 메시지 ("~님이 입장하셨습니다.")
    - 운영정책 안내 문구
    - 새 멤버 입장 시 입장 메시지 표시
- ✅ 채팅방 상세
  - 메시지 전송 (텍스트, 이미지)
  - 이미지 메시지: 고정 크기 표시, 클릭 시 확대 보기 (보낸 사람, 시간 표시)
  - 보내기 버튼 활성화 (입력 내용 있을 때 파란색, 비활성화 시 회색)
  - 메시지 표시
    - 내 메시지: 오른쪽 정렬, 읽음 표시 및 시간 왼쪽 표시
    - 상대 메시지: 왼쪽 정렬, 프로필 이미지 및 이름, 읽음 표시 및 시간 오른쪽 표시
    - 메시지 그룹핑: 같은 사람이 연속으로 보낸 메시지는 아바타/이름 한 번만 표시
    - 이미지만 보낼 때: 파란 배경 없이 이미지만 표시
  - 채팅방 정보 (3개 막대 버튼)
    - 참여자 목록 (친구 여부 표시)
    - 친구 초대 (내 친구 목록에서 선택)
    - 친구 추가 (채팅방 멤버에게 즉시 친구 추가)
    - 친구 삭제 (친구 목록에서만 삭제, 채팅방에서는 내보내지 않음)
    - 대화 나가기 버튼 (오른쪽 하단)
  - 시스템 메시지
    - 멤버 입장: "~님이 입장하셨습니다."
    - 멤버 퇴장: "~님이 퇴장하셨습니다."
- ✅ 채팅방 나가기
  - 슬라이드로 나가기 버튼 표시 (왼쪽 슬라이드 시 삭제 버튼 활성화)
  - 확인 모달
  - 나간 유저의 채팅 내역 삭제 (해당 유저만)
  - 남은 멤버가 있으면 채팅방 보존 및 퇴장 메시지 표시
  - 남은 멤버가 없으면 채팅방 및 모든 메시지 삭제
  - 1:1 채팅 나가기 시 채팅방 완전 삭제
- ✅ 읽지 않은 메시지 관리
  - 클라이언트 사이드 읽음 상태 추적 (localStorage)
  - 채팅방 클릭 시 자동 읽음 처리
  - React Query를 통한 캐싱 및 증분 업데이트

### 친구 관리
- ✅ 친구 목록
  - 프로필 이미지 및 이름 표시
  - 친구가 없을 때 지도로 이동 안내
  - 편집 모드 (체크박스, 일괄 삭제)
  - 슬라이드로 개별 삭제
- ✅ 친구 검색
  - 검색어 입력
  - 최근 검색어 저장 (localStorage)
  - 검색어 재검색 (클릭)
  - 검색어 개별 삭제 및 전체 삭제
- ✅ 친구 추가
  - 지도에서 근접 유저에게 즉시 친구 추가 (pending 상태 없이 바로 accepted)
  - 채팅방에서 멤버에게 즉시 친구 추가
  - 친구 추가 성공 메시지 ("~님이 친구목록에 추가되었습니다.")
  - 양방향 친구 관계 즉시 생성

### 마이페이지
- ✅ 프로필 관리
  - 프로필 이미지, ID, 전화번호 표시
  - 프로필 수정 페이지
    - 프로필 이미지 업로드
    - 닉네임 수정
    - 비밀번호 변경
    - 수정 모드 전환 (회색 배경 → 활성화)
- ✅ 고객지원
  - 신고하기
    - 신고 대상 선택 (친구 목록 드롭다운)
    - 신고 유형 선택
    - 신고 사유 및 상세 설명
  - 문의하기
    - 문의 유형 선택
    - 제목 입력 (최대 30자)
    - 내용 입력 (최대 300자)
    - 제출 버튼 활성화 조건 (제목/내용 필수)
    - 안내 문구 표시
- ✅ 신고 내역
  - 신고 목록 (신고대기/신고완료 상태)
  - 신고 상세 보기
    - 신고대기: 대기 메시지 표시
    - 신고완료: 관리자 답변 표시
- ✅ 문의 내역
  - 문의 목록 (답변대기/답변완료 상태)
  - 문의 상세 보기
    - 답변대기: 대기 메시지 표시
    - 답변완료: 관리자 답변 표시
- ✅ 계정 관리
  - 로그아웃 (모든 캐시 삭제)

### 알림 시스템
- ✅ 새 채팅 알림
  - 채팅 탭이 아닐 때 새 채팅 도착 시 중앙 알림 표시
  - 5초 후 자동 사라짐
- ✅ 읽지 않은 메시지 배지
  - 채팅 탭 버튼에 파란색 배지 표시
  - 999개 이상 시 "999+" 표시
  - 0개일 때는 배지 숨김

### 관리자 기능
- ✅ 관리자 대시보드
  - 사용자 관리
  - 신고 관리
    - 상태 필터 (전체, 신고 완료, 신고 대기)
    - 신고 상세 보기 (오버레이 모달)
    - 답변 등록 (자동 확장 textarea, 스크롤)
    - 답변 완료 버튼 활성화
  - 문의 관리
    - 상태 필터 (전체, 답변 완료, 답변 전)
    - 문의 상세 보기 (오버레이 모달)
    - 답변 등록 및 완료
  - 약관 관리
- ✅ 통일된 UI
  - 드롭다운 컴포넌트 통일
  - 테이블 스타일 통일 (가운데 정렬, 회색 배경 제거)
  - 페이지네이션 UI

### 사용자 관리
- ✅ 아이디/닉네임 중복 확인
- ✅ 프로필 이미지 업로드
- ✅ 위치 기반 사용자 검색

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

### 구글 소셜 로그인 설정

#### 1. Google Cloud Console에서 OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택 또는 새 프로젝트 생성
3. **API 및 서비스** > **사용자 인증 정보** 이동
4. **사용자 인증 정보 만들기** > **OAuth 클라이언트 ID** 선택
5. 애플리케이션 유형: **웹 애플리케이션** 선택
6. **승인된 리디렉션 URI 추가** (중요!):
   ```
   https://<your-project-id>.supabase.co/auth/v1/callback
   ```
   - `<your-project-id>`는 Supabase 프로젝트 ID로 교체
   - 예: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`
   - **프로덕션 환경**에서는 실제 도메인도 추가:
     ```
     https://yourdomain.com/api/auth/google/callback
     ```
7. **클라이언트 ID**와 **클라이언트 보안 비밀번호** 복사

#### 2. Supabase 대시보드에서 구글 OAuth 설정

1. Supabase 대시보드 > **Authentication** > **Providers** 이동
2. **Google** 찾아서 활성화
3. 다음 정보 입력:
   - **Client ID (for OAuth)**: Google Cloud Console에서 복사한 클라이언트 ID
   - **Client Secret (for OAuth)**: Google Cloud Console에서 복사한 클라이언트 보안 비밀번호
4. **Site URL** 확인:
   - Supabase 대시보드 > **Settings** > **API** > **Site URL**
   - 개발 환경: `http://localhost:3000`
   - 프로덕션 환경: 실제 도메인 (예: `https://yourdomain.com`)
5. **Redirect URLs** 확인:
   - Supabase 대시보드 > **Authentication** > **URL Configuration**
   - 다음 URL이 추가되어 있어야 함:
     ```
     http://localhost:3000/api/auth/google/callback
     https://yourdomain.com/api/auth/google/callback (프로덕션)
     ```
   - **중요**: 이 URL은 클라이언트 사이드 페이지로, URL fragment에서 토큰을 처리합니다
6. **Save** 클릭

**참고**: Supabase는 PKCE flow를 사용할 때 URL fragment(`#access_token=...`)로 토큰을 반환합니다. 
이를 처리하기 위해 클라이언트 사이드 페이지(`/api/auth/google/callback/page.tsx`)가 필요합니다.

#### 3. 환경 변수 확인

프론트엔드 `.env.local` 파일에 다음 변수가 설정되어 있는지 확인:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_FRONTEND_ORIGIN=http://localhost:3000
```

**참고**: 
- `NEXT_PUBLIC_FRONTEND_ORIGIN`은 구글 로그인 콜백 URL 생성에 사용됩니다
- 프로덕션 환경에서는 실제 도메인으로 변경하세요 (예: `https://yourdomain.com`)

#### 4. 구글 인증 코드 오류 해결 방법

**"구글 로그인 인증 코드가 없습니다"** 오류가 발생하는 경우:

1. **Supabase Redirect URLs 확인** (가장 중요!)
   - Supabase 대시보드 > **Authentication** > **URL Configuration**
   - **Redirect URLs** 섹션에 다음 URL이 추가되어 있어야 함:
     ```
     http://localhost:3000/api/auth/google/callback
     ```
   - 프로덕션 환경에서는:
     ```
     https://yourdomain.com/api/auth/google/callback
     ```
   - **중요**: 이 URL이 없으면 구글 인증 후 코드를 받을 수 없습니다!

2. **Google Cloud Console 리다이렉트 URI 확인**
   - Google Cloud Console > **API 및 서비스** > **사용자 인증 정보**
   - OAuth 클라이언트의 **승인된 리디렉션 URI**에 다음이 있어야 함:
     ```
     https://<your-project-id>.supabase.co/auth/v1/callback
     ```

3. **환경 변수 확인**
   - `NEXT_PUBLIC_FRONTEND_ORIGIN`이 올바르게 설정되어 있는지 확인
   - 개발 환경: `http://localhost:3000`
   - 프로덕션 환경: 실제 도메인

4. **브라우저 캐시 및 쿠키 삭제**
   - 구글 로그인 관련 쿠키를 삭제하고 다시 시도

#### 5. Self-XSS 경고에 대해

브라우저 콘솔에 나타나는 **"Self-XSS 공격 경고"**는 브라우저의 보안 기능입니다:
- 개발자 도구(F12)를 열었을 때 나타나는 정상적인 경고입니다
- 앱의 보안 문제가 아니라 브라우저가 사용자를 보호하기 위한 메시지입니다
- 코드로 제거할 수 없으며, 무시해도 됩니다
- 실제 사용자에게는 표시되지 않습니다 (개발자 도구를 열지 않는 한)

---

### 지도 · 위치 기반 기능 요약

- **사용자 위치 표시**: 네이버 지도 위에 내 위치를 원형으로 표시하고, 주변 사용자들을 원형 오버레이로 표시합니다.
- **겹친 사용자 모달**:
  - 내 원과 겹치는 모든 사용자(나 포함 N명)를 하단 시트 형태로 표시합니다.
  - 많은 사용자가 겹쳐도 스크롤로 전체 목록을 볼 수 있습니다.
  - 각 사용자 카드에서:
    - **친구추가**: 아직 친구가 아니라면 버튼이 활성화되고, 이미 친구면 비활성화 + `친구` 라벨로 표시됩니다.
    - **채팅방 만들기**: 해당 사용자와의 위치 기반 채팅방 생성 플로우로 이동합니다.
- **기존 채팅방 알림**:
  - 해당 사용자와 이미 1:1 채팅방이 있으면, 상단에 **"함께하는 채팅방이 존재합니다."** 알림 모달을 띄웁니다.
  - 모달 내에서 기존 채팅방 목록을 보여주고, 항목 클릭 시 해당 채팅방으로 바로 이동합니다.

### 채팅방 접근 제어 요약

- **목록 필터링**:
  - `/api/chats?userId=...` 는 로그인한 사용자가 **실제로 멤버인 채팅방만** 반환합니다.
  - 그룹/위치 기반 채팅은 `chat_members` 테이블에 사용자가 있을 때만 보입니다.
  - 1:1 채팅은 `chat_type IS NULL` 이고 `user_id1` 또는 `user_id2`가 현재 사용자일 때만 보입니다.
- **직접 URL 접근 보호**:
  - 채팅방 상세 페이지 및 `/api/chats/[chatId]/*` API 들에서 모두 멤버 여부를 검사합니다.
  - 멤버가 아닌 사용자가 URL로 직접 접근하면 403 또는 `/home` 리다이렉트로 차단됩니다.

### 구글 소셜 로그인 플로우 요약

- `/login` 페이지에서 **Google 로그인 버튼**으로 플로우를 시작합니다.
- Supabase OAuth 인증 후:
  - 세션을 생성하고, 사용자의 이메일 · 이름 · 프로필 이미지를 가져옵니다.
  - `users` 테이블에 이메일 기준으로 사용자 정보를 동기화합니다.
  - 닉네임/전화번호가 없는 구글 유저는 **회원가입 2단계(닉네임/이름 입력)** 으로 바로 이동합니다.
  - 구글 유저는 비밀번호 없이 가입하며, `password` 필드는 `NULL` 로 저장됩니다.
- 프로필 이미지는:
  - 구글에서 받은 URL을 서버에서 다운로드한 뒤 `public/uploads/profiles` 아래에 저장하고,
  - 앱에서는 로컬 경로(`/uploads/profiles/...`)를 사용해 일관된 호스팅을 유지합니다.

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
  - `chat_type`: 채팅 유형 (location_room 등)
  - `thumbnail_url`: 채팅방 썸네일
  - `description`: 채팅방 설명
  - `member_limit`: 인원 제한 (2-100)
- `chat_members` - 채팅방 멤버 (역할 포함)
- `messages` - 메시지
  - `image_url`: 이미지 메시지
  - `is_deleted`: 삭제 여부 (소프트 삭제)
- `friendships` - 친구 관계 (상태: pending, accepted, rejected)
- `push_notifications` - 푸시 알림
- `reports` - 신고 내역
  - `admin_note`: 관리자 답변
  - `handled_at`: 처리 시간
- `inquiries` - 문의 내역
  - `inquiry_replies`: 관리자 답변
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

### API 엔드포인트

#### 채팅 관련
- `GET /api/chats` - 채팅 목록 조회 (참여자 필터링, 썸네일 포함)
- `POST /api/chats/location-room` - 위치 기반 채팅방 생성 (중복 방지)
- `GET /api/chats/[chatId]/members` - 채팅방 멤버 조회 (친구 여부 포함)
- `POST /api/chats/[chatId]/members` - 채팅방 멤버 초대
- `DELETE /api/chats/[chatId]/members` - 채팅방 멤버 삭제
- `GET /api/chats/[chatId]/messages` - 메시지 조회 (증분 업데이트 지원, 사용자 정보 포함)
- `POST /api/chats/[chatId]/messages` - 메시지 전송 (텍스트, 이미지, 1:1 채팅 지원)
- `POST /api/chats/[chatId]/leave` - 채팅방 나가기 (시스템 메시지 생성, 자동 삭제)

#### 친구 관련
- `GET /api/friends` - 친구 목록 조회
- `POST /api/friends` - 친구 즉시 추가 (pending 없이 바로 accepted)
- `DELETE /api/friends` - 친구 삭제

#### 사용자 관련
- `GET /api/users/profile` - 프로필 조회
- `PUT /api/users/profile` - 프로필 수정
- `POST /api/upload/profile` - 프로필 이미지 업로드

#### 신고/문의 관련
- `GET /api/reports` - 신고 목록 조회
- `POST /api/reports` - 신고 생성
- `GET /api/inquiries` - 문의 목록 조회
- `POST /api/inquiries` - 문의 생성

#### 관리자 관련
- `GET /api/admin/users` - 사용자 관리
- `GET /api/admin/reports` - 신고 관리
- `PUT /api/admin/reports` - 신고 답변
- `GET /api/admin/inquiries` - 문의 관리
- `PUT /api/admin/inquiries` - 문의 답변
- `GET /api/admin/terms` - 약관 관리
- `POST /api/admin/terms` - 약관 생성/수정

## 📚 참고 자료

- [Next.js 공식 문서](https://nextjs.org/docs)
- [Supabase 공식 문서](https://supabase.com/docs)
- [Prisma 공식 문서](https://www.prisma.io/docs)
- [Naver Maps API 문서](https://navermaps.github.io/maps.js.ncp/)
- [TanStack Query 문서](https://tanstack.com/query/latest)


