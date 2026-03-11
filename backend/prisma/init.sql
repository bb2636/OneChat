-- OneChat 데이터베이스 초기화 스크립트
-- Replit PostgreSQL 직접 연결용

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE,
  password TEXT,
  email TEXT UNIQUE,
  name TEXT,
  nickname TEXT UNIQUE,
  avatar_url TEXT,
  phone_number TEXT,
  phone_verified BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'user',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_updated_at TIMESTAMPTZ,
  push_token TEXT,
  push_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_lat_lng ON users (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id1 UUID REFERENCES users(id) ON DELETE CASCADE,
  user_id2 UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  pinned BOOLEAN DEFAULT false,
  chat_type TEXT,
  thumbnail_url TEXT,
  description TEXT,
  member_limit INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_workspace ON chats (workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_users ON chats (user_id1, user_id2);

CREATE TABLE IF NOT EXISTS chat_members (
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_message_id BIGINT,
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members (user_id);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages (chat_id, created_at ASC);

CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships (requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships (addressee_id, status);

CREATE TABLE IF NOT EXISTS push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  data TEXT,
  read BOOLEAN DEFAULT false,
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_notifications (user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_sent ON push_notifications (sent, created_at);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  admin_note TEXT,
  handled_by UUID,
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports (reported_id);

CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_user ON inquiries (user_id);

CREATE TABLE IF NOT EXISTS inquiry_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiry_replies ON inquiry_replies (inquiry_id, created_at ASC);

CREATE TABLE IF NOT EXISTS terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (type, version)
);

CREATE INDEX IF NOT EXISTS idx_terms ON terms (type, is_active, version DESC);
