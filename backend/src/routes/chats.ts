import type { Router } from "express";
import { sql } from "../db/client";

export function registerChatRoutes(router: Router) {
  // 채팅 목록 조회 (좌측 리스트)
  router.get("/chats", async (req, res) => {
    try {
      const workspaceId = (req.query.workspaceId as string) || null;

      const rows =
        workspaceId != null
          ? await sql/* sql */`
        select c.id, c.title, c.pinned, c.created_at
        from chats c
        where c.workspace_id = ${workspaceId}
        order by c.pinned desc, c.created_at desc
      `
          : await sql/* sql */`
        select c.id, c.title, c.pinned, c.created_at
        from chats c
        order by c.pinned desc, c.created_at desc
      `;

      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch chats" });
    }
  });

  // 특정 채팅의 메시지 목록 (우측 채팅 패널)
  router.get("/chats/:id/messages", async (req, res) => {
    try {
      const chatId = req.params.id;
      const rows = await sql/* sql */`
        select m.id, m.role, m.content, m.created_at, p.name as provider_name
        from messages m
        left join providers p on m.provider_id = p.id
        where m.chat_id = ${chatId}
        order by m.created_at asc
      `;

      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // 메시지 전송 (프롬프트 입력창)
  router.post("/chats/:id/messages", async (req, res) => {
    try {
      const chatId = req.params.id;
      const { content, providerId } = req.body as {
        content: string;
        providerId?: number;
      };

      if (!content) {
        return res.status(400).json({ error: "content is required" });
      }

      const [message] = await sql/* sql */`
        insert into messages (chat_id, role, content, provider_id)
        values (${chatId}, 'user', ${content}, ${providerId ?? null})
        returning id, role, content, created_at
      `;

      // 실제 AI 호출은 이후에 이 지점에서 추가

      res.status(201).json(message);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });
}

