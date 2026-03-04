import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function getConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      const { url, anonKey } = getConfig();
      if (!url || !anonKey) {
        throw new Error("Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
      }
      _supabase = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
          heartbeatIntervalMs: 30000,
          reconnectAfterMs: (tries: number) => {
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
    }
    return (_supabase as any)[prop];
  },
});

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabaseAdmin) {
      const { url, serviceRoleKey } = getConfig();
      if (!url || !serviceRoleKey) {
        return undefined;
      }
      _supabaseAdmin = createClient(url, serviceRoleKey, {
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
      });
    }
    return (_supabaseAdmin as any)[prop];
  },
});

export function getSupabaseServerClient() {
  const { url, anonKey } = getConfig();
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(url, anonKey, {
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

export interface UserLocation {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  avatar_url?: string | null;
  nickname?: string | null;
  updated_at: string;
}

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
