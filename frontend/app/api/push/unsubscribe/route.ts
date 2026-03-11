import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: "endpoint가 필요합니다." }, { status: 400 });
    }

    await sql`
      DELETE FROM push_subscriptions
      WHERE user_id = ${auth.userId} AND endpoint = ${endpoint}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json({ error: "푸시 구독 해제에 실패했습니다." }, { status: 500 });
  }
}
