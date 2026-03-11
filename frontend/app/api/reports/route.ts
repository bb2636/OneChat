import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const userId = auth.userId;

    const result = await sql`
      SELECT
        r.id,
        r.reported_id,
        r.type,
        r.reason,
        r.description,
        r.status,
        r.admin_note,
        r.handled_at,
        r.created_at,
        r.updated_at,
        u.name AS reported_name,
        u.nickname AS reported_nickname,
        au.name AS admin_name,
        au.nickname AS admin_nickname,
        CASE
          WHEN (r.admin_note IS NOT NULL AND btrim(r.admin_note) <> '')
            OR COALESCE(r.status, 'pending') <> 'pending'
          THEN true
          ELSE false
        END AS is_replied
      FROM reports r
      LEFT JOIN users u ON u.id = r.reported_id
      LEFT JOIN users au ON au.id = r.handled_by
      WHERE r.reporter_id = ${userId}
      ORDER BY r.updated_at DESC
    `;

    return NextResponse.json(
      result.map((item) => ({
        ...item,
        display_status: item.is_replied ? "신고완료" : "신고대기",
      }))
    );
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return NextResponse.json({ error: "신고 내역 조회에 실패했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = getUserFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const reporterId = auth.userId;
    const { reportedId, type, reason, description } = await request.json();

    if (!reportedId || !type || !reason) {
      return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
    }

    const friendship = await sql`
      SELECT id
      FROM friendships
      WHERE status = 'accepted'
        AND (
          (requester_id = ${reporterId} AND addressee_id = ${reportedId})
          OR
          (requester_id = ${reportedId} AND addressee_id = ${reporterId})
        )
      LIMIT 1
    `;

    if (friendship.length === 0) {
      return NextResponse.json({ error: "친구로 등록된 사용자만 신고할 수 있습니다." }, { status: 400 });
    }

    const inserted = await sql`
      INSERT INTO reports (
        id, reporter_id, reported_id, type, reason, description,
        status, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), ${reporterId}, ${reportedId},
        ${type.trim()}, ${reason.trim()}, ${description?.trim() || null},
        'pending', ${new Date()}, ${new Date()}
      )
      RETURNING id
    `;

    return NextResponse.json({ success: true, id: inserted[0]?.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to create report:", error);
    return NextResponse.json({ error: "신고 등록에 실패했습니다." }, { status: 500 });
  }
}
