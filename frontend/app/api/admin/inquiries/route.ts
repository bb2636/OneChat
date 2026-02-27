import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPage = Number(searchParams.get("page") || "1");
    const status = (searchParams.get("status") || "all").trim();
    const since = (searchParams.get("since") || "").trim();
    const sinceDate = since ? new Date(since) : null;
    const isDelta = !!sinceDate && !Number.isNaN(sinceDate.getTime());
    const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const offset = (page - 1) * PAGE_SIZE;

    let total = 0;
    let items: Array<{
      id: string;
      category: string;
      subject: string;
      content: string;
      status: string;
      created_at: string;
      user_name: string | null;
      user_username: string | null;
      latest_reply: string | null;
    }> = [];

    if (status !== "all") {
      const totalRows = (await sql`
        SELECT COUNT(*)::int AS count
        FROM inquiries
        WHERE status = ${status}
      `) as unknown as Array<{ count: number }>;

      total = totalRows[0]?.count || 0;

      items = (await sql`
        SELECT
          i.id,
          i.category,
          i.subject,
          i.content,
          i.status,
          i.created_at::text,
          u.name AS user_name,
          u.username AS user_username,
          (
            SELECT ir.content
            FROM inquiry_replies ir
            WHERE ir.inquiry_id = i.id
            ORDER BY ir.created_at DESC
            LIMIT 1
          ) AS latest_reply
        FROM inquiries i
        LEFT JOIN users u ON u.id = i.user_id
        WHERE i.status = ${status}
        ${isDelta ? sql`AND COALESCE(i.updated_at, i.created_at) > ${sinceDate as Date}` : sql``}
        ORDER BY i.created_at DESC
        LIMIT ${PAGE_SIZE}
        ${isDelta ? sql`` : sql`OFFSET ${offset}`}
      `) as unknown as typeof items;
    } else {
      const totalRows = (await sql`
        SELECT COUNT(*)::int AS count
        FROM inquiries
      `) as unknown as Array<{ count: number }>;

      total = totalRows[0]?.count || 0;

      items = (await sql`
        SELECT
          i.id,
          i.category,
          i.subject,
          i.content,
          i.status,
          i.created_at::text,
          u.name AS user_name,
          u.username AS user_username,
          (
            SELECT ir.content
            FROM inquiry_replies ir
            WHERE ir.inquiry_id = i.id
            ORDER BY ir.created_at DESC
            LIMIT 1
          ) AS latest_reply
        FROM inquiries i
        LEFT JOIN users u ON u.id = i.user_id
        ${isDelta ? sql`WHERE COALESCE(i.updated_at, i.created_at) > ${sinceDate as Date}` : sql``}
        ORDER BY i.created_at DESC
        LIMIT ${PAGE_SIZE}
        ${isDelta ? sql`` : sql`OFFSET ${offset}`}
      `) as unknown as typeof items;
    }

    return NextResponse.json({
      items,
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      delta: isDelta,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin inquiries fetch error:", error);
    return NextResponse.json({ error: "문의 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = (await request.json()) as { id?: string; status?: string };
    if (!id || !status) {
      return NextResponse.json({ error: "id와 status가 필요합니다." }, { status: 400 });
    }

    const rows = (await sql`
      UPDATE inquiries
      SET status = ${status}, updated_at = ${new Date()}
      WHERE id = ${id}
      RETURNING id, status
    `) as unknown as Array<{ id: string; status: string }>;

    if (!rows.length) {
      return NextResponse.json({ error: "문의 항목을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true, inquiry: rows[0] });
  } catch (error) {
    console.error("Admin inquiry update error:", error);
    return NextResponse.json({ error: "문의 상태 변경에 실패했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { inquiryId, adminUserId, content } = (await request.json()) as {
      inquiryId?: string;
      adminUserId?: string;
      content?: string;
    };

    if (!inquiryId || !adminUserId || !content?.trim()) {
      return NextResponse.json(
        { error: "inquiryId, adminUserId, content가 필요합니다." },
        { status: 400 }
      );
    }

    if (content.trim().length > 500) {
      return NextResponse.json(
        { error: "답변은 500자 이내로 작성해주세요." },
        { status: 400 }
      );
    }

    const now = new Date();
    const inserted = (await sql`
      INSERT INTO inquiry_replies (id, inquiry_id, user_id, content, is_admin, created_at)
      VALUES (gen_random_uuid(), ${inquiryId}, ${adminUserId}, ${content.trim()}, true, ${now})
      RETURNING id
    `) as unknown as Array<{ id: string }>;

    await sql`
      UPDATE inquiries
      SET status = 'answered', updated_at = ${now}
      WHERE id = ${inquiryId}
    `;

    return NextResponse.json({ success: true, replyId: inserted[0]?.id || null });
  } catch (error) {
    console.error("Admin inquiry reply error:", error);
    return NextResponse.json({ error: "문의 답변 저장에 실패했습니다." }, { status: 500 });
  }
}
