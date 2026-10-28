import "server-only";
import { db } from "./db";

export async function notify(userId: string, title: string, body: string, link?: string): Promise<void> {
  await db.notification.create({ data: { userId, title, body, link } });
}
