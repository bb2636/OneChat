import webpush from 'web-push';
import { sql } from './db';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@onechat.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return;
  }

  try {
    const subscriptions = await sql`
      SELECT id, endpoint, p256dh, auth
      FROM push_subscriptions
      WHERE user_id = ${userId}
    `;

    const expiredIds: number[] = [];

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        const error = err as { statusCode?: number };
        if (error.statusCode === 404 || error.statusCode === 410) {
          expiredIds.push(sub.id);
        }
      }
    }

    if (expiredIds.length > 0) {
      await sql`
        DELETE FROM push_subscriptions
        WHERE id = ANY(${expiredIds}::int[])
      `;
    }
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}

export async function sendPushToMultipleUsers(userIds: string[], payload: PushPayload) {
  const promises = userIds.map(userId => sendPushToUser(userId, payload));
  await Promise.allSettled(promises);
}
