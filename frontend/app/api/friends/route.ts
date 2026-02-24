import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const result = await sql`
      SELECT 
        u.id,
        u.nickname,
        u.name,
        u.avatar_url,
        f.status,
        f.created_at as friendship_created_at
      FROM friendships f
      INNER JOIN users u ON (
        (f.requester_id = ${userId} AND u.id = f.addressee_id)
        OR
        (f.addressee_id = ${userId} AND u.id = f.requester_id)
      )
      WHERE f.status = 'accepted'
      ORDER BY f.updated_at DESC
    `;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch friends:", error);
    return NextResponse.json(
      { error: "Failed to fetch friends" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { requesterId, addresseeId } = await request.json();

    if (!requesterId || !addresseeId) {
      return NextResponse.json(
        { error: "requesterId와 addresseeId가 필요합니다." },
        { status: 400 }
      );
    }

    if (requesterId === addresseeId) {
      return NextResponse.json(
        { error: "자기 자신에게 친구 요청을 보낼 수 없습니다." },
        { status: 400 }
      );
    }

    const existing = (await sql`
      SELECT id, requester_id, addressee_id, status
      FROM friendships
      WHERE (requester_id = ${requesterId} AND addressee_id = ${addresseeId})
         OR (requester_id = ${addresseeId} AND addressee_id = ${requesterId})
      LIMIT 1
    `) as unknown as Array<{
      id: string;
      requester_id: string;
      addressee_id: string;
      status: string;
    }>;

    if (existing.length > 0) {
      const relation = existing[0];

      if (relation.status === "accepted") {
        return NextResponse.json(
          { success: true, status: "accepted", message: "이미 친구입니다." },
          { status: 200 }
        );
      }

      // 상대방이 이미 나에게 보낸 요청이라면 바로 수락 처리
      if (
        relation.status === "pending" &&
        relation.requester_id === addresseeId &&
        relation.addressee_id === requesterId
      ) {
        await sql`
          UPDATE friendships
          SET status = 'accepted', updated_at = ${new Date()}
          WHERE id = ${relation.id}
        `;

        return NextResponse.json({
          success: true,
          status: "accepted",
          message: "친구 요청을 수락했습니다.",
        });
      }

      return NextResponse.json(
        { success: true, status: relation.status, message: "이미 요청된 상태입니다." },
        { status: 200 }
      );
    }

    const inserted = (await sql`
      INSERT INTO friendships (id, requester_id, addressee_id, status, created_at, updated_at)
      VALUES (gen_random_uuid(), ${requesterId}, ${addresseeId}, 'pending', ${new Date()}, ${new Date()})
      RETURNING id, status
    `) as unknown as Array<{ id: string; status: string }>;

    return NextResponse.json(
      {
        success: true,
        friendship: inserted[0],
        message: "친구 요청을 보냈습니다.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create friendship:", error);
    return NextResponse.json(
      { error: "친구 요청 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
