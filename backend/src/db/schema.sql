-- 사용자 테이블 (개선된 버전)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at 자동 업데이트 트리거 함수
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- users 테이블에 트리거 적용
drop trigger if exists update_users_updated_at on users;
create trigger update_users_updated_at
  before update on users
  for each row
  execute function update_updated_at_column();

-- AI 제공자 / 모델 (예: GPT-4, Claude, Gemini 등)
create table if not exists providers (
  id serial primary key,
  name text not null,
  icon text,
  model text,
  created_at timestamptz not null default now()
);

-- 워크스페이스(프로젝트/공간) - 사이드바의 공간/폴더 개념
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  name text not null,
  created_at timestamptz not null default now()
);

-- 채팅 세션 (좌측 채팅 리스트)
create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

-- 메시지 (우측 채팅 영역의 버블들)
create table if not exists messages (
  id bigserial primary key,
  chat_id uuid not null references chats(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  provider_id int references providers(id),
  created_at timestamptz not null default now()
);

-- 포스트 (게시물) 테이블
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  content text not null,
  image_url text,
  published boolean not null default false,
  view_count integer not null default 0,
  like_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- posts 테이블 인덱스 (Neon DB 최적화)
create index if not exists idx_posts_user_id on posts(user_id);
create index if not exists idx_posts_published_created_at on posts(published, created_at desc);

-- posts 테이블에 updated_at 자동 업데이트 트리거 적용
drop trigger if exists update_posts_updated_at on posts;
create trigger update_posts_updated_at
  before update on posts
  for each row
  execute function update_updated_at_column();

