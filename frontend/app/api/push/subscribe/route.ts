import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

let tableEnsured = false;

async function ensureTable() {
  if (tableEnsured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, endpoint)
    )
  `;
  tableEnsured = true;
}

export async function POST(request: Request) {
  try {
    const auth = getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { subscription } = await request.json();

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "유효하지 않은 구독 정보입니다." }, { status: 400 });
    }

    await ensureTable();

    await sql`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES (${auth.userId}, ${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth})
      ON CONFLICT (user_id, endpoint) DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        created_at = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ error: "푸시 구독 처리에 실패했습니다." }, { status: 500 });
  }
}
