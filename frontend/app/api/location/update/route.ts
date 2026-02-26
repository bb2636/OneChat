import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { userId, latitude, longitude } = await request.json();

    if (!userId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: "userId, latitude, longitude가 필요합니다." },
        { status: 400 }
      );
    }

    // 사용자 위치 업데이트
    const now = new Date();
    await sql`
      UPDATE users
      SET 
        latitude = ${latitude},
        longitude = ${longitude},
        location_updated_at = ${now}
      WHERE id = ${userId}
    `;

    return NextResponse.json({
      success: true,
      message: "위치가 업데이트되었습니다.",
    });
  } catch (error: any) {
    console.error("Location update error:", error);
    return NextResponse.json(
      { error: "위치 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
