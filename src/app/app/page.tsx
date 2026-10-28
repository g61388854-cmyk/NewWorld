import Link from "next/link";
import { requireCtx } from "@/lib/auth";
import { db } from "@/lib/db";
import { Empty, Flash, PageHead, StatusBadge } from "@/components/ui";
import { EVENT_TYPES, LANGUAGES, label } from "@/lib/dictionaries";
import { formatDateTime } from "@/lib/forms";
import { OPEN_STATUSES } from "@/lib/request-flow";
import { verificationLabel } from "@/lib/policy";
import { AUDIT_LABELS } from "@/lib/audit";

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const ctx = await requireCtx();
  const { user } = ctx;
  const now = new Date();

  const events = await db.calendarEvent.findMany({
    where: { ownerId: user.id, endsAt: { gt: now } },
    orderBy: { startsAt: "asc" },
    take: 5,
  });
  const eventsCard = (
    <div className="card">
      <h2>Ближайшие мероприятия</h2>
      {events.length === 0 ? (
        <Empty>Запланированных мероприятий нет.</Empty>
      ) : (
        <ul className="list">
          {events.map((e) => (
            <li key={e.id}>
              <div>{e.requestId ? <Link href={`/app/requests/${e.requestId}`}>{e.title}</Link> : e.title}</div>
              <div className="muted small">{formatDateTime(e.startsAt)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (user.accountType === "TRANSLATOR") {
    const profile = await db.translatorProfile.findUniqueOrThrow({
      where: { userId: user.id },
      include: { languages: true },
    });
    const incoming = await db.engagementRequest.findMany({
      where: { profileId: profile.id, status: { in: OPEN_STATUSES } },
      orderBy: { startsAt: "asc" },
      take: 5,
    });
    const v = verificationLabel(profile);
    return (
      <>
        <PageHead title={`Здравствуйте, ${user.fullName.split(" ")[0]}`} subtitle="Рабочий стол переводчика" />
        <Flash params={params} />
        {!profile.published && (
          <div className="notice">
            Профиль не опубликован и не отображается в реестре.{" "}
            {profile.languages.length === 0 ? "Добавьте языковые пары и " : ""}
            <Link href="/app/profile">опубликуйте профиль</Link>.
          </div>
        )}
        <div className="grid-3">
          <div className="card">
            <div className="muted small">Новые запросы</div>
            <div className="stat">{incoming.length}</div>
          </div>
          <div className="card">
            <div className="muted small">Статус профиля</div>
            <div style={{ marginTop: 8 }}><span className={`badge ${v.tone}`}>{v.label}</span></div>
          </div>
          <div className="card">
            <div className="muted small">Языковые пары</div>
            <div className="stat">{profile.languages.length}</div>
          </div>
        </div>
        <div className="grid-2" style={{ marginTop: 16 }}>
          <div className="card">
            <h2>Запросы, ожидающие ответа</h2>
            {incoming.length === 0 ? (
              <Empty>Новых запросов нет.</Empty>
            ) : (
              <ul className="list">
                {incoming.map((r) => (
                  <li key={r.id}>
                    <div className="row between">
                      <Link href={`/app/requests/${r.id}`}>{label(EVENT_TYPES, r.eventType)}</Link>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="muted small">
                      {label(LANGUAGES, r.sourceLang)} → {label(LANGUAGES, r.targetLang)} · {formatDateTime(r.startsAt)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {eventsCard}
        </div>
      </>
    );
  }

  if (user.accountType === "CUSTOMER") {
    const m = user.membership;
    const [waiting, assigned, recent] = await Promise.all([
      db.engagementRequest.count({ where: { customerId: user.id, status: { in: OPEN_STATUSES } } }),
      db.engagementRequest.findMany({
        where: { customerId: user.id, status: "CONFIRMED" },
        include: { profile: { select: { displayName: true } } },
        orderBy: { startsAt: "asc" },
        take: 5,
      }),
      db.engagementRequest.findMany({
        where: { customerId: user.id },
        include: { profile: { select: { displayName: true } } },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);
    return (
      <>
        <PageHead title="Добро пожаловать" subtitle={m?.organization?.name ?? m?.claimedOrganization}>
          <Link href="/app/search" className="btn large">Найти переводчика</Link>
        </PageHead>
        <Flash params={params} />
        {m?.status === "PENDING" && (
          <div className="notice">
            Заявка на подтверждение полномочий находится на рассмотрении. До её одобрения доступен просмотр публичной
            части реестра, направление запросов недоступно.
          </div>
        )}
        {(m?.status === "REJECTED" || m?.status === "REVOKED") && (
          <div className="notice">
            Полномочия не подтверждены{m.reviewNote ? `: ${m.reviewNote}` : ""}. Направление запросов недоступно.
          </div>
        )}
        <div className="grid-2">
          <div className="card">
            <div className="muted small">Ожидают ответа</div>
            <div className="stat">{waiting}</div>
          </div>
          <div className="card">
            <div className="muted small">Назначенные специалисты</div>
            {assigned.length === 0 ? (
              <div className="stat">0</div>
            ) : (
              <ul className="list">
                {assigned.map((r) => (
                  <li key={r.id}>
                    <Link href={`/app/requests/${r.id}`}>{r.profile.displayName}</Link>
                    <div className="muted small">
                      {label(EVENT_TYPES, r.eventType)} · {formatDateTime(r.startsAt)}
                      {r.appointmentNotedAt ? " · решение о назначении оформлено" : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="grid-2" style={{ marginTop: 16 }}>
          {eventsCard}
          <div className="card">
            <h2>Последние запросы</h2>
            {recent.length === 0 ? (
              <Empty>Запросов пока нет.</Empty>
            ) : (
              <ul className="list">
                {recent.map((r) => (
                  <li key={r.id}>
                    <div className="row between">
                      <Link href={`/app/requests/${r.id}`}>{r.profile.displayName}</Link>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="muted small">{label(EVENT_TYPES, r.eventType)} · {formatDateTime(r.startsAt)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </>
    );
  }

  const [pending, qualifications, users, logs] = await Promise.all([
    db.membership.count({ where: { status: "PENDING" } }),
    db.qualification.count({ where: { status: "PENDING" } }),
    db.user.count(),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: { select: { fullName: true } } } }),
  ]);
  return (
    <>
      <PageHead title="Панель администратора" subtitle="Проверка профилей, полномочий и журнал действий" />
      <Flash params={params} />
      <div className="grid-3">
        <Link href="/app/admin/memberships" className="card">
          <div className="muted small">Заявки на роль</div>
          <div className="stat">{pending}</div>
        </Link>
        <Link href="/app/admin/profiles" className="card">
          <div className="muted small">Документы на проверке</div>
          <div className="stat">{qualifications}</div>
        </Link>
        <Link href="/app/admin/users" className="card">
          <div className="muted small">Пользователи</div>
          <div className="stat">{users}</div>
        </Link>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2>Последние действия</h2>
        <ul className="list">
          {logs.map((l) => (
            <li key={l.id}>
              {AUDIT_LABELS[l.action] ?? l.action}
              <span className="muted small"> · {l.actor?.fullName ?? "—"} · {formatDateTime(l.createdAt)}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
