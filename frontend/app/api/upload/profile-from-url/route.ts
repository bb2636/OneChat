import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json(
        { error: "이미지 URL이 필요합니다." },
        { status: 400 }
      );
    }

    // 외부 이미지 다운로드
    let imageBuffer: Buffer;
    let contentType: string = "image/jpeg";
    
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`이미지 다운로드 실패: ${response.statusText}`);
      }
      
      contentType = response.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } catch (error) {
      console.error("Image download error:", error);
      return NextResponse.json(
        { error: "이미지를 다운로드할 수 없습니다." },
        { status: 400 }
      );
    }

    // 파일 확장자 결정
    let extension = "jpg";
    if (contentType.includes("png")) {
      extension = "png";
    } else if (contentType.includes("gif")) {
      extension = "gif";
    } else if (contentType.includes("webp")) {
      extension = "webp";
    }

    // 파일명 생성
    const timestamp = Date.now();
    const filename = `profile-${timestamp}.${extension}`;

    // 업로드 디렉토리 생성 (없는 경우)
    const uploadDir = join(process.cwd(), "public", "uploads", "profiles");
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // 디렉토리가 이미 존재하는 경우 무시
    }

    // 파일 저장
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, imageBuffer);

    // URL 반환
    const url = `/uploads/profiles/${filename}`;

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Upload from URL error:", error);
    return NextResponse.json(
      { error: "이미지 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
