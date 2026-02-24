import postgres from "postgres";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ES modules에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 루트 디렉토리의 .env 파일 로드 (backend/src/db -> ../../../.env)
const envPath = resolve(__dirname, "../../../.env");
const result = config({ path: envPath });

if (result.error) {
  console.warn(`Warning: Could not load .env from ${envPath}:`, result.error.message);
}

if (!process.env.DATABASE_URL) {
  throw new Error(`DATABASE_URL is not set. Tried to load from: ${envPath}`);
}

export const sql = postgres(process.env.DATABASE_URL, {
  // Supabase pooler(pgBouncer) 환경에서 prepared statement 충돌 방지
  prepare: false,
  max: 1,
});

