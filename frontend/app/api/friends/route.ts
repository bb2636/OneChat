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

    // 바로 accepted 상태로 친구 추가
    const inserted = (await sql`
      INSERT INTO friendships (id, requester_id, addressee_id, status, created_at, updated_at)
      VALUES (gen_random_uuid(), ${requesterId}, ${addresseeId}, 'accepted', ${new Date()}, ${new Date()})
      RETURNING id, status
    `) as unknown as Array<{ id: string; status: string }>;

    return NextResponse.json(
      {
        success: true,
        friendship: inserted[0],
        status: "accepted",
        message: "친구가 추가되었습니다.",
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

export async function DELETE(request: Request) {
  try {
    const { userId, friendId } = (await request.json()) as {
      userId?: string;
      friendId?: string;
    };

    if (!userId || !friendId) {
      return NextResponse.json(
        { error: "userId와 friendId가 필요합니다." },
        { status: 400 }
      );
    }

    const deleted = (await sql`
      DELETE FROM friendships
      WHERE status = 'accepted'
        AND (
          (requester_id = ${userId} AND addressee_id = ${friendId})
          OR
          (requester_id = ${friendId} AND addressee_id = ${userId})
        )
      RETURNING id
    `) as unknown as Array<{ id: string }>;

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "삭제할 친구 관계를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deletedCount: deleted.length });
  } catch (error) {
    console.error("Failed to delete friendship:", error);
    return NextResponse.json(
      { error: "친구 삭제 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
