// API 엔드포인트 상수
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const API_ENDPOINTS = {
  workspaces: `${API_BASE_URL}/api/workspaces`,
  chats: `${API_BASE_URL}/api/chats`,
  messages: (chatId: string) => `${API_BASE_URL}/api/chats/${chatId}/messages`,
  friends: `${API_BASE_URL}/api/friends`,
  nearbyUsers: `${API_BASE_URL}/api/users/nearby`,
} as const;
