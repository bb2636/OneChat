import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase URL or Anon Key is not set. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

// Supabase 클라이언트 생성 (Realtime 최적화 설정)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // 초당 최대 이벤트 수
    },
    // Realtime 연결 설정
    heartbeatIntervalMs: 30000, // 30초마다 heartbeat
    reconnectAfterMs: (tries: number) => {
      // 재연결 시도 간격 (지수 백오프)
      return Math.min(tries * 1000, 30000);
    },
  },
  db: {
    schema: "public",
  },
  global: {
    headers: {
      "x-client-info": "onechat-web",
    },
  },
});

// 서버 전용(서비스 롤) 클라이언트: 서버 라우트/서버 액션에서만 사용
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: { schema: "public" },
      global: {
        headers: {
          "x-client-info": "onechat-server",
        },
      },
    })
  : null;

export function getSupabaseServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: { schema: "public" },
    global: {
      headers: {
        "x-client-info": "onechat-server",
      },
    },
  });
}

// 위치 정보 타입 (users 테이블 구조와 일치)
export interface UserLocation {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  avatar_url?: string | null;
  nickname?: string | null;
  updated_at: string;
}

// Supabase users 테이블 타입 (Realtime 구독용)
export interface SupabaseUser {
  id: string;
  username?: string | null;
  email?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_updated_at?: string | null;
  created_at: string;
  updated_at: string;
}
