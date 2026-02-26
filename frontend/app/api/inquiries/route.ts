import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId가 필요합니다." }, { status: 400 });
    }

    const result = (await sql`
      SELECT
        i.id,
        i.category,
        i.subject,
        i.content,
        i.status,
        i.created_at,
        i.updated_at,
        latest_reply.content AS admin_reply_content,
        latest_reply.created_at::text AS admin_reply_created_at,
        au.name AS admin_reply_name,
        au.nickname AS admin_reply_nickname,
        EXISTS (
          SELECT 1
          FROM inquiry_replies ir
          WHERE ir.inquiry_id = i.id
            AND ir.is_admin = true
        ) AS has_admin_reply
      FROM inquiries i
      LEFT JOIN LATERAL (
        SELECT ir.content, ir.created_at, ir.user_id
        FROM inquiry_replies ir
        WHERE ir.inquiry_id = i.id
          AND ir.is_admin = true
        ORDER BY ir.created_at DESC
        LIMIT 1
      ) latest_reply ON true
      LEFT JOIN users au ON au.id = latest_reply.user_id
      WHERE i.user_id = ${userId}
      ORDER BY i.updated_at DESC
    `) as unknown as Array<{
      id: string;
      category: string;
      subject: string;
      content: string;
      status: string;
      created_at: string;
      updated_at: string;
      admin_reply_content: string | null;
      admin_reply_created_at: string | null;
      admin_reply_name: string | null;
      admin_reply_nickname: string | null;
      has_admin_reply: boolean;
    }>;

    return NextResponse.json(
      result.map((item) => ({
        ...item,
        display_status:
          item.has_admin_reply || (item.status && item.status !== "pending")
            ? "답변완료"
            : "답변대기",
      }))
    );
  } catch (error) {
    console.error("Failed to fetch inquiries:", error);
    return NextResponse.json({ error: "문의 내역 조회에 실패했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, subject, content, category } = (await request.json()) as {
      userId?: string;
      subject?: string;
      content?: string;
      category?: string;
    };

    if (!userId || !subject?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
    }

    const inserted = (await sql`
      INSERT INTO inquiries (
        id,
        user_id,
        category,
        subject,
        content,
        status,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${userId},
        ${category?.trim() || "일반문의"},
        ${subject.trim()},
        ${content.trim()},
        'pending',
        ${new Date()},
        ${new Date()}
      )
      RETURNING id
    `) as unknown as Array<{ id: string }>;

    return NextResponse.json({ success: true, id: inserted[0]?.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to create inquiry:", error);
    return NextResponse.json({ error: "문의 등록에 실패했습니다." }, { status: 500 });
  }
}

