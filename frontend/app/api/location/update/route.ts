import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const auth = getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const userId = auth.userId;
    const { latitude, longitude } = await request.json();

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: "latitude, longitude가 필요합니다." },
        { status: 400 }
      );
    }

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
  } catch (error) {
    console.error("Location update error:", error);
    return NextResponse.json(
      { error: "위치 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
