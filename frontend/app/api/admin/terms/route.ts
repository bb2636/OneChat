import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const since = (searchParams.get("since") || "").trim();
    const sinceDate = since ? new Date(since) : null;
    const isDelta = !!sinceDate && !Number.isNaN(sinceDate.getTime());
    const rows = (await sql`
      SELECT t.id, t.type, t.title, t.content, t.version, t.is_active, t.updated_at::text
      FROM terms t
      INNER JOIN (
        SELECT type, MAX(version) AS latest_version
        FROM terms
        GROUP BY type
      ) latest
        ON latest.type = t.type
       AND latest.latest_version = t.version
      ${isDelta ? sql`WHERE COALESCE(t.updated_at, t.created_at) > ${sinceDate as Date}` : sql``}
      ORDER BY
        CASE
          WHEN t.type = 'privacy_policy' THEN 1
          WHEN t.type = 'terms_of_service' THEN 2
          WHEN t.type LIKE '%location%' THEN 3
          ELSE 4
        END
    `) as unknown as Array<{
      id: string;
      type: string;
      title: string;
      content: string;
      version: number;
      is_active: boolean;
      updated_at: string;
    }>;

    return NextResponse.json({
      items: rows,
      delta: isDelta,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin terms fetch error:", error);
    return NextResponse.json({ error: "약관 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      type?: string;
      title?: string;
      content?: string;
      isActive?: boolean;
    };

    const type = (body.type || "").trim();
    const title = (body.title || "").trim();
    const content = (body.content || "").trim();
    const isActive = body.isActive !== false;

    if (!type || !title || !content) {
      return NextResponse.json({ error: "type, title, content가 필요합니다." }, { status: 400 });
    }

    const existing = (await sql`
      SELECT id, version
      FROM terms
      WHERE type = ${type}
      ORDER BY version DESC
      LIMIT 1
    `) as unknown as Array<{ id: string; version: number }>;

    if (existing.length === 0) {
      const inserted = (await sql`
        INSERT INTO terms (id, type, title, content, version, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), ${type}, ${title}, ${content}, 1, ${isActive}, ${new Date()}, ${new Date()})
        RETURNING id, type, title, content, version, is_active, updated_at::text
      `) as unknown as Array<{
        id: string;
        type: string;
        title: string;
        content: string;
        version: number;
        is_active: boolean;
        updated_at: string;
      }>;

      return NextResponse.json({ success: true, term: inserted[0] });
    }

    const updated = (await sql`
      UPDATE terms
      SET title = ${title}, content = ${content}, is_active = ${isActive}, updated_at = ${new Date()}
      WHERE id = ${existing[0].id}
      RETURNING id, type, title, content, version, is_active, updated_at::text
    `) as unknown as Array<{
      id: string;
      type: string;
      title: string;
      content: string;
      version: number;
      is_active: boolean;
      updated_at: string;
    }>;

    return NextResponse.json({ success: true, term: updated[0] });
  } catch (error) {
    console.error("Admin terms update error:", error);
    return NextResponse.json({ error: "약관 저장에 실패했습니다." }, { status: 500 });
  }
}
