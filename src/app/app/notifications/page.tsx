import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireCtx } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/forms";
import { Empty, PageHead } from "@/components/ui";

async function markAllRead() {
  "use server";
  const ctx = await requireCtx();
  await db.notification.updateMany({ where: { userId: ctx.user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/app", "layout");
}

export default async function NotificationsPage() {
  const ctx = await requireCtx();
  const items = await db.notification.findMany({
    where: { userId: ctx.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <>
      <PageHead title="Уведомления">
        {items.some((n) => !n.readAt) && (
          <form action={markAllRead}><button className="btn secondary" type="submit">Отметить все прочитанными</button></form>
        )}
      </PageHead>
      <div className="card">
        {items.length === 0 ? (
          <Empty>Уведомлений нет.</Empty>
        ) : (
          <ul className="list">
            {items.map((n) => (
              <li key={n.id}>
                <div className="row between">
                  <strong>{n.link ? <Link href={n.link}>{n.title}</Link> : n.title}</strong>
                  {!n.readAt && <span className="badge accent">Новое</span>}
                </div>
                <div className="muted small">{n.body} · {formatDateTime(n.createdAt)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
