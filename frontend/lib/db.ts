// 서버 컴포넌트/API 라우트에서 사용할 Supabase PostgreSQL 클라이언트
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Please configure the PostgreSQL database connection."
  );
}

export const sql = postgres(DATABASE_URL, {
  // Supabase pooler(pgBouncer) 환경에서 prepared statement 충돌 방지
  prepare: false,
  max: 1,
});
