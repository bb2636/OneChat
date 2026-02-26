import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ES modules에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env 파일 로드
config({ path: resolve(__dirname, "../../.env") });

const prisma = new PrismaClient();

async function main() {
  console.log("관리자 계정 생성 중...");

  const adminUsername = "test";
  const adminPassword = "test1234"; // 기본 비밀번호 (실제 운영 시 변경 필요)
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // 기존 관리자 계정 확인
  const existingAdmin = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (existingAdmin) {
    // 이미 존재하면 role만 업데이트
    await prisma.user.update({
      where: { username: adminUsername },
      data: { role: "admin" },
    });
    console.log("✅ 기존 관리자 계정의 role이 업데이트되었습니다.");
    console.log(`   아이디: ${adminUsername}`);
    console.log(`   비밀번호: ${adminPassword}`);
  } else {
    // 새 관리자 계정 생성
    const admin = await prisma.user.create({
      data: {
        username: adminUsername,
        password: hashedPassword,
        nickname: "테스트",
        name: "테스트",
        role: "admin",
        email: "test@test.com",
      },
    });

    console.log("✅ 관리자 계정이 생성되었습니다!");
    console.log(`   아이디: ${adminUsername}`);
    console.log(`   비밀번호: ${adminPassword}`);
    console.log(`   사용자 ID: ${admin.id}`);
  }
}

main()
  .catch((e) => {
    console.error("❌ 관리자 계정 생성 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
