import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

// ES modules에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 루트 디렉토리의 .env 파일 로드
const envPath = resolve(__dirname, "../../.env");
const result = config({ path: envPath });

if (result.error) {
  console.error(`Error loading .env from ${envPath}:`, result.error.message);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in .env file");
  process.exit(1);
}

// Prisma Studio 실행 (환경 변수와 함께)
const databaseUrl = process.env.DATABASE_URL;
const cwd = resolve(__dirname, "..");

try {
  // Prisma Studio는 --url 옵션을 지원하지 않으므로 환경 변수로만 전달
  execSync(`npx prisma studio`, {
    stdio: "inherit",
    cwd: cwd,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    shell: true,
  });
} catch (error) {
  console.error("Error starting Prisma Studio:", error.message);
  process.exit(1);
}
