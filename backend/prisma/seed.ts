import postgres from "postgres";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, "../../.env") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

async function main() {
  console.log("관리자 계정 생성 중...");

  const adminUsername = "test";
  const adminPassword = "test1234";
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const existing = await sql`
    SELECT id FROM users WHERE username = ${adminUsername} LIMIT 1
  `;

  if (existing.length > 0) {
    await sql`
      UPDATE users SET role = 'admin' WHERE username = ${adminUsername}
    `;
    console.log("✅ 기존 관리자 계정의 role이 업데이트되었습니다.");
    console.log(`   아이디: ${adminUsername}`);
    console.log(`   비밀번호: ${adminPassword}`);
  } else {
    const created = await sql`
      INSERT INTO users (id, username, password, nickname, name, role, email, created_at, updated_at)
      VALUES (gen_random_uuid(), ${adminUsername}, ${hashedPassword}, '테스트', '테스트', 'admin', 'test@test.com', NOW(), NOW())
      RETURNING id
    `;
    console.log("✅ 관리자 계정이 생성되었습니다!");
    console.log(`   아이디: ${adminUsername}`);
    console.log(`   비밀번호: ${adminPassword}`);
    console.log(`   사용자 ID: ${created[0].id}`);
  }

  await sql.end();
}

main().catch((e) => {
  console.error("❌ 관리자 계정 생성 실패:", e);
  process.exit(1);
});
