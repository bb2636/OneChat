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
      type: string;
      reason: string;
      description: string | null;
      status: string;
      created_at: string;
      reporter_name: string | null;
      reporter_username: string | null;
    }> = [];

    if (status !== "all") {
      const totalRows = (await sql`
        SELECT COUNT(*)::int AS count
        FROM reports
        WHERE status = ${status}
      `) as unknown as Array<{ count: number }>;

      total = totalRows[0]?.count || 0;

      items = (await sql`
        SELECT
          r.id,
          r.type,
          r.reason,
          r.description,
          r.status,
          r.created_at::text,
          u.name AS reporter_name,
          u.username AS reporter_username
        FROM reports r
        LEFT JOIN users u ON u.id = r.reporter_id
        WHERE r.status = ${status}
        ${isDelta ? sql`AND COALESCE(r.updated_at, r.created_at) > ${sinceDate as Date}` : sql``}
        ORDER BY r.created_at DESC
        LIMIT ${PAGE_SIZE}
        ${isDelta ? sql`` : sql`OFFSET ${offset}`}
      `) as unknown as typeof items;
    } else {
      const totalRows = (await sql`
        SELECT COUNT(*)::int AS count
        FROM reports
      `) as unknown as Array<{ count: number }>;

      total = totalRows[0]?.count || 0;

      items = (await sql`
        SELECT
          r.id,
          r.type,
          r.reason,
          r.description,
          r.status,
          r.created_at::text,
          u.name AS reporter_name,
          u.username AS reporter_username
        FROM reports r
        LEFT JOIN users u ON u.id = r.reporter_id
        ${isDelta ? sql`WHERE COALESCE(r.updated_at, r.created_at) > ${sinceDate as Date}` : sql``}
        ORDER BY r.created_at DESC
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
    console.error("Admin reports fetch error:", error);
    return NextResponse.json({ error: "신고 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status, adminNote } = (await request.json()) as {
      id?: string;
      status?: string;
      adminNote?: string;
    };

    if (!id || !status) {
      return NextResponse.json({ error: "id와 status가 필요합니다." }, { status: 400 });
    }

    if (adminNote && adminNote.trim().length > 500) {
      return NextResponse.json(
        { error: "답변은 500자 이내로 작성해주세요." },
        { status: 400 }
      );
    }

    const rows = (await sql`
      UPDATE reports
      SET
        status = ${status},
        admin_note = ${adminNote || null},
        handled_at = ${new Date()},
        updated_at = ${new Date()}
      WHERE id = ${id}
      RETURNING id, status
    `) as unknown as Array<{ id: string; status: string }>;

    if (!rows.length) {
      return NextResponse.json({ error: "신고 항목을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true, report: rows[0] });
  } catch (error) {
    console.error("Admin report update error:", error);
    return NextResponse.json({ error: "신고 상태 변경에 실패했습니다." }, { status: 500 });
  }
}
