import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json(
        { error: "이미지 파일이 없습니다." },
        { status: 400 }
      );
    }

    // 파일을 바이트로 변환
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 파일명 생성
    const timestamp = Date.now();
    const filename = `profile-${timestamp}.${file.name.split(".").pop()}`;

    // 업로드 디렉토리 생성 (없는 경우)
    const uploadDir = join(process.cwd(), "public", "uploads", "profiles");
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // 디렉토리가 이미 존재하는 경우 무시
    }

    // 파일 저장
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // URL 반환
    const url = `/uploads/profiles/${filename}`;

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "이미지 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
