import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPage = Number(searchParams.get("page") || "1");
    const keyword = (searchParams.get("q") || "").trim();
    const excludeId = (searchParams.get("excludeId") || "").trim();
    const since = (searchParams.get("since") || "").trim();
    const sinceDate = since ? new Date(since) : null;
    const isDelta = !!sinceDate && !Number.isNaN(sinceDate.getTime());
    const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const offset = (page - 1) * PAGE_SIZE;

    let total = 0;
    let items: Array<{
      id: string;
      username: string | null;
      nickname: string | null;
      name: string | null;
      avatar_url: string | null;
      phone_number: string | null;
      role: string;
      created_at: string;
    }> = [];

    if (keyword) {
      const like = `%${keyword}%`;
      const totalRows = (await sql`
        SELECT COUNT(*)::int AS count
        FROM users
        WHERE (${excludeId} = '' OR id::text <> ${excludeId})
          AND (
            username ILIKE ${like}
            OR nickname ILIKE ${like}
            OR name ILIKE ${like}
          )
      `) as unknown as Array<{ count: number }>;

      total = totalRows[0]?.count || 0;

      if (isDelta) {
        items = (await sql`
          SELECT id, username, nickname, name, avatar_url, phone_number, role, created_at::text
          FROM users
          WHERE (${excludeId} = '' OR id::text <> ${excludeId})
            AND (
              username ILIKE ${like}
              OR nickname ILIKE ${like}
              OR name ILIKE ${like}
            )
            AND COALESCE(updated_at, created_at) > ${sinceDate as Date}
          ORDER BY created_at DESC
          LIMIT ${PAGE_SIZE}
        `) as unknown as typeof items;
      } else {
        items = (await sql`
          SELECT id, username, nickname, name, avatar_url, phone_number, role, created_at::text
          FROM users
          WHERE (${excludeId} = '' OR id::text <> ${excludeId})
            AND (
              username ILIKE ${like}
              OR nickname ILIKE ${like}
              OR name ILIKE ${like}
            )
          ORDER BY created_at DESC
          LIMIT ${PAGE_SIZE}
          OFFSET ${offset}
        `) as unknown as typeof items;
      }
    } else {
      const totalRows = (await sql`
        SELECT COUNT(*)::int AS count
        FROM users
        WHERE (${excludeId} = '' OR id::text <> ${excludeId})
      `) as unknown as Array<{ count: number }>;

      total = totalRows[0]?.count || 0;

      if (isDelta) {
        items = (await sql`
          SELECT id, username, nickname, name, avatar_url, phone_number, role, created_at::text
          FROM users
          WHERE (${excludeId} = '' OR id::text <> ${excludeId})
            AND COALESCE(updated_at, created_at) > ${sinceDate as Date}
          ORDER BY created_at DESC
          LIMIT ${PAGE_SIZE}
        `) as unknown as typeof items;
      } else {
        items = (await sql`
          SELECT id, username, nickname, name, avatar_url, phone_number, role, created_at::text
          FROM users
          WHERE (${excludeId} = '' OR id::text <> ${excludeId})
          ORDER BY created_at DESC
          LIMIT ${PAGE_SIZE}
          OFFSET ${offset}
        `) as unknown as typeof items;
      }
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
    console.error("Admin users fetch error:", error);
    return NextResponse.json({ error: "사용자 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = (await request.json()) as { id?: string };
    if (!id) {
      return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
    }

    const rows = (await sql`
      DELETE FROM users
      WHERE id = ${id}
      RETURNING id
    `) as unknown as Array<{ id: string }>;

    if (!rows.length) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: rows[0].id });
  } catch (error) {
    console.error("Admin user delete error:", error);
    return NextResponse.json({ error: "사용자 삭제에 실패했습니다." }, { status: 500 });
  }
}
