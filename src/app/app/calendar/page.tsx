import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCtx } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/forms";
import { Empty, Flash, PageHead } from "@/components/ui";
import { addSlot, removeSlot } from "./actions";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const ctx = await requireCtx();
  if (ctx.user.accountType === "ADMIN") redirect("/app");
  const isTranslator = ctx.user.accountType === "TRANSLATOR";
  const now = new Date();

  const events = await db.calendarEvent.findMany({
    where: { ownerId: ctx.user.id, endsAt: { gt: now } },
    orderBy: { startsAt: "asc" },
    take: 100,
  });
  const slots = isTranslator
    ? await db.availabilitySlot.findMany({
        where: { profile: { userId: ctx.user.id }, kind: "AVAILABLE", endsAt: { gt: now } },
        orderBy: { startsAt: "asc" },
      })
    : [];

  const byDay = new Map<string, typeof events>();
  for (const e of events) {
    const key = formatDate(e.startsAt);
    byDay.set(key, [...(byDay.get(key) ?? []), e]);
  }

  return (
    <>
      <PageHead title={isTranslator ? "Календарь" : "Мероприятия"} subtitle="Время указано по Москве" />
      <Flash params={sp} />
      <div className={isTranslator ? "grid-2" : ""}>
        <div className="card">
          <h2>Подтверждённые мероприятия</h2>
          {events.length === 0 ? (
            <Empty>Мероприятий нет.</Empty>
          ) : (
            [...byDay.entries()].map(([day, list]) => (
              <div key={day} style={{ marginBottom: 12 }}>
                <h3>{day}</h3>
                <ul className="list">
                  {list.map((e) => (
                    <li key={e.id}>
                      {e.requestId ? <Link href={`/app/requests/${e.requestId}`}>{e.title}</Link> : e.title}
                      <div className="muted small">
                        {e.startsAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" })}
                        {" — "}
                        {e.endsAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" })}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        {isTranslator && (
          <div className="stack">
            <div className="card">
              <h2>Периоды доступности</h2>
              <p className="muted small">Используются в поиске по дате и в карточке профиля.</p>
              {slots.length === 0 ? (
                <Empty>Периоды не указаны.</Empty>
              ) : (
                <ul className="list">
                  {slots.map((s) => (
                    <li key={s.id} className="row between">
                      <span>{formatDateTime(s.startsAt)} — {formatDateTime(s.endsAt)}</span>
                      <form action={removeSlot}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className="btn danger small" type="submit">Удалить</button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <form action={addSlot} className="card">
              <h2>Добавить период</h2>
              <div className="field">
                <label htmlFor="startsAt">Начало</label>
                <input id="startsAt" name="startsAt" type="datetime-local" required />
              </div>
              <div className="field">
                <label htmlFor="endsAt">Окончание</label>
                <input id="endsAt" name="endsAt" type="datetime-local" required />
              </div>
              <button className="btn" type="submit">Добавить</button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
