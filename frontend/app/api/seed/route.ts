import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashSync } from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    if (key !== "onechat-seed-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pw = hashSync("test1234", 10);
    const now = new Date();

    const testUser = await sql`
      INSERT INTO users (id, username, password, email, name, nickname, phone_number, phone_verified, role, updated_at)
      VALUES (gen_random_uuid(), 'test', ${pw}, 'testuser@onechat.com', '테스트', '테스트유저', '01000000000', true, 'user', ${now})
      ON CONFLICT (username) DO UPDATE SET updated_at = ${now}
      RETURNING id, username, nickname
    `;
    const testId = testUser[0].id;

    const u1 = await sql`
      INSERT INTO users (id, username, password, email, name, nickname, phone_number, phone_verified, role, updated_at)
      VALUES (gen_random_uuid(), 'user1@test.com', ${pw}, 'user1@test.com', '김민수', '민수', '01012345001', true, 'user', ${now})
      ON CONFLICT (username) DO UPDATE SET updated_at = ${now}
      RETURNING id
    `;
    const u2 = await sql`
      INSERT INTO users (id, username, password, email, name, nickname, phone_number, phone_verified, role, updated_at)
      VALUES (gen_random_uuid(), 'user2@test.com', ${pw}, 'user2@test.com', '이지현', '지현이', '01012345002', true, 'user', ${now})
      ON CONFLICT (username) DO UPDATE SET updated_at = ${now}
      RETURNING id
    `;
    const u3 = await sql`
      INSERT INTO users (id, username, password, email, name, nickname, phone_number, phone_verified, role, updated_at)
      VALUES (gen_random_uuid(), 'user3@test.com', ${pw}, 'user3@test.com', '박서준', '서준', '01012345003', true, 'user', ${now})
      ON CONFLICT (username) DO UPDATE SET updated_at = ${now}
      RETURNING id
    `;
    const u4 = await sql`
      INSERT INTO users (id, username, password, email, name, nickname, phone_number, phone_verified, role, updated_at)
      VALUES (gen_random_uuid(), 'user4@test.com', ${pw}, 'user4@test.com', '최유나', '유나', '01012345004', true, 'user', ${now})
      ON CONFLICT (username) DO UPDATE SET updated_at = ${now}
      RETURNING id
    `;
    const u5 = await sql`
      INSERT INTO users (id, username, password, email, name, nickname, phone_number, phone_verified, role, updated_at)
      VALUES (gen_random_uuid(), 'user5@test.com', ${pw}, 'user5@test.com', '정하늘', '하늘이', '01012345005', true, 'user', ${now})
      ON CONFLICT (username) DO UPDATE SET updated_at = ${now}
      RETURNING id
    `;

    const u1id = u1[0].id;
    const u2id = u2[0].id;
    const u3id = u3[0].id;
    const u4id = u4[0].id;
    const u5id = u5[0].id;

    const adminRows = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
    const adminId = adminRows.length > 0 ? adminRows[0].id : null;
    const test1Rows = await sql`SELECT id FROM users WHERE username = 'test1@test.com' LIMIT 1`;
    const test1Id = test1Rows.length > 0 ? test1Rows[0].id : null;

    const friendIds = [u1id, u2id, u3id, u4id, u5id];
    if (adminId) friendIds.push(adminId);
    if (test1Id) friendIds.push(test1Id);

    for (const fid of friendIds) {
      await sql`
        INSERT INTO friendships (id, requester_id, addressee_id, status, updated_at)
        VALUES (gen_random_uuid(), ${testId}, ${fid}, 'accepted', ${now})
        ON CONFLICT (requester_id, addressee_id) DO UPDATE SET status = 'accepted', updated_at = ${now}
      `;
    }

    const chat1 = await sql`
      INSERT INTO chats (id, title, chat_type, created_at, updated_at, user_id1, user_id2)
      VALUES (gen_random_uuid(), '민수', 'direct', ${now}, ${now}, ${testId}, ${u1id})
      RETURNING id
    `;
    await sql`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (${chat1[0].id}, ${testId}, 'member', ${now})`;
    await sql`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (${chat1[0].id}, ${u1id}, 'member', ${now})`;
    await sql`INSERT INTO messages (chat_id, role, content, created_at, updated_at) VALUES
      (${chat1[0].id}, ${'user:' + testId}, '민수야 안녕!', ${now}, ${now}),
      (${chat1[0].id}, ${'user:' + u1id}, '오 테스트! 오랜만이야~', ${now}, ${now}),
      (${chat1[0].id}, ${'user:' + testId}, '요즘 뭐하고 지내?', ${now}, ${now}),
      (${chat1[0].id}, ${'user:' + u1id}, '그냥 회사 다니면서 평범하게 지내고 있어 ㅋㅋ', ${now}, ${now}),
      (${chat1[0].id}, ${'user:' + testId}, '주말에 시간 되면 만나자!', ${now}, ${now})`;

    const chat2 = await sql`
      INSERT INTO chats (id, title, chat_type, created_at, updated_at, user_id1, user_id2)
      VALUES (gen_random_uuid(), '지현이', 'direct', ${now}, ${now}, ${testId}, ${u2id})
      RETURNING id
    `;
    await sql`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (${chat2[0].id}, ${testId}, 'member', ${now})`;
    await sql`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (${chat2[0].id}, ${u2id}, 'member', ${now})`;
    await sql`INSERT INTO messages (chat_id, role, content, created_at, updated_at) VALUES
      (${chat2[0].id}, ${'user:' + u2id}, '오늘 카페 갈래?', ${now}, ${now}),
      (${chat2[0].id}, ${'user:' + testId}, '좋아! 어디로 갈까?', ${now}, ${now}),
      (${chat2[0].id}, ${'user:' + u2id}, '강남역 근처에 새로 생긴 카페가 있더라', ${now}, ${now}),
      (${chat2[0].id}, ${'user:' + testId}, '오 거기 좋겠다! 몇 시에 만날까?', ${now}, ${now})`;

    const chat3 = await sql`
      INSERT INTO chats (id, title, chat_type, description, member_limit, created_at, updated_at)
      VALUES (gen_random_uuid(), '주말 모임', 'group', '주말에 만나서 놀자!', 50, ${now}, ${now})
      RETURNING id
    `;
    await sql`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (${chat3[0].id}, ${testId}, 'admin', ${now})`;
    await sql`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (${chat3[0].id}, ${u1id}, 'member', ${now})`;
    await sql`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (${chat3[0].id}, ${u3id}, 'member', ${now})`;
    await sql`INSERT INTO messages (chat_id, role, content, created_at, updated_at) VALUES
      (${chat3[0].id}, 'system', '테스트유저님이 그룹을 만들었습니다.', ${now}, ${now}),
      (${chat3[0].id}, ${'user:' + testId}, '이번 주말에 다들 시간 돼?', ${now}, ${now}),
      (${chat3[0].id}, ${'user:' + u1id}, '토요일 오후는 괜찮아!', ${now}, ${now}),
      (${chat3[0].id}, ${'user:' + u3id}, '나도 토요일 괜찮아 ㅎㅎ', ${now}, ${now}),
      (${chat3[0].id}, ${'user:' + testId}, '그럼 토요일 2시에 홍대 앞에서 보자!', ${now}, ${now}),
      (${chat3[0].id}, ${'user:' + u1id}, '좋아 좋아!', ${now}, ${now})`;

    const chat4 = await sql`
      INSERT INTO chats (id, title, chat_type, description, member_limit, created_at, updated_at)
      VALUES (gen_random_uuid(), '맛집 탐방', 'group', '서울 맛집 탐방 모임', 100, ${now}, ${now})
      RETURNING id
    `;
    await sql`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (${chat4[0].id}, ${testId}, 'admin', ${now})`;
    await sql`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (${chat4[0].id}, ${u2id}, 'member', ${now})`;
    await sql`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (${chat4[0].id}, ${u4id}, 'member', ${now})`;
    await sql`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (${chat4[0].id}, ${u5id}, 'member', ${now})`;
    await sql`INSERT INTO messages (chat_id, role, content, created_at, updated_at) VALUES
      (${chat4[0].id}, 'system', '테스트유저님이 그룹을 만들었습니다.', ${now}, ${now}),
      (${chat4[0].id}, ${'user:' + testId}, '다들 맛집 추천 해줘~', ${now}, ${now}),
      (${chat4[0].id}, ${'user:' + u2id}, '이태원에 파스타 맛집 있어!', ${now}, ${now}),
      (${chat4[0].id}, ${'user:' + u4id}, '명동 떡볶이 골목도 좋아', ${now}, ${now}),
      (${chat4[0].id}, ${'user:' + u5id}, '저는 종로 삼겹살 추천이요!', ${now}, ${now}),
      (${chat4[0].id}, ${'user:' + testId}, '다 좋다!! 하나씩 다 가보자 ㅋㅋㅋ', ${now}, ${now})`;

    const chat5 = await sql`
      INSERT INTO chats (id, title, chat_type, description, member_limit, created_at, updated_at)
      VALUES (gen_random_uuid(), '원챗 개발팀', 'group', '원챗 개발 관련 논의', 200, ${now}, ${now})
      RETURNING id
    `;
    const devMembers = [testId, u1id, u3id, u4id];
    if (adminId) devMembers.push(adminId);
    if (test1Id) devMembers.push(test1Id);
    for (let i = 0; i < devMembers.length; i++) {
      await sql`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (${chat5[0].id}, ${devMembers[i]}, ${i === 0 ? 'admin' : 'member'}, ${now})`;
    }
    await sql`INSERT INTO messages (chat_id, role, content, created_at, updated_at) VALUES
      (${chat5[0].id}, 'system', '테스트유저님이 그룹을 만들었습니다.', ${now}, ${now}),
      (${chat5[0].id}, ${'user:' + testId}, '원챗 개발 시작합니다!', ${now}, ${now}),
      (${chat5[0].id}, ${'user:' + u1id}, '디자인 시안 올렸습니다!', ${now}, ${now}),
      (${chat5[0].id}, ${'user:' + u3id}, 'API 연동 완료!', ${now}, ${now}),
      (${chat5[0].id}, ${'user:' + u4id}, '위치 기능 테스트해봤는데 잘 됩니다', ${now}, ${now}),
      (${chat5[0].id}, ${'user:' + testId}, '다들 수고 많았어요! 이번 주 배포 목표입니다', ${now}, ${now})`;

    const chat6 = await sql`
      INSERT INTO chats (id, title, chat_type, description, member_limit, created_at, updated_at)
      VALUES (gen_random_uuid(), '운동 파트너', 'group', '같이 운동해요', 10, ${now}, ${now})
      RETURNING id
    `;
    await sql`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (${chat6[0].id}, ${testId}, 'admin', ${now})`;
    await sql`INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (${chat6[0].id}, ${u5id}, 'member', ${now})`;
    await sql`INSERT INTO messages (chat_id, role, content, created_at, updated_at) VALUES
      (${chat6[0].id}, 'system', '테스트유저님이 그룹을 만들었습니다.', ${now}, ${now}),
      (${chat6[0].id}, ${'user:' + testId}, '같이 운동하실 분~', ${now}, ${now}),
      (${chat6[0].id}, ${'user:' + u5id}, '저요! 어떤 운동 하세요?', ${now}, ${now}),
      (${chat6[0].id}, ${'user:' + testId}, '헬스 위주로 하는데 러닝도 좋아해요!', ${now}, ${now}),
      (${chat6[0].id}, ${'user:' + u5id}, '오 좋아요! 내일 아침에 같이 러닝 어때요?', ${now}, ${now})`;

    return NextResponse.json({
      success: true,
      testUser: { id: testId, username: 'test', nickname: '테스트유저' },
      friends: friendIds.length,
      chatRooms: 6
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: error.message || "Seed failed" }, { status: 500 });
  }
}
