import Link from "next/link";
import { redirect } from "next/navigation";
import type { RequestStatus } from "@prisma/client";
import { requireCtx } from "@/lib/auth";
import { db } from "@/lib/db";
import { EVENT_TYPES, LANGUAGES, label } from "@/lib/dictionaries";
import { formatDateTime } from "@/lib/forms";
import { STATUS_LABELS } from "@/lib/request-flow";
import { Empty, Flash, PageHead, StatusBadge } from "@/components/ui";

export default async function RequestsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const ctx = await requireCtx();
  if (ctx.user.accountType === "ADMIN") redirect("/app");
  const isTranslator = ctx.user.accountType === "TRANSLATOR";
  const status = sp.status && sp.status in STATUS_LABELS ? (sp.status as RequestStatus) : undefined;

  const requests = await db.engagementRequest.findMany({
    where: isTranslator
      ? { profile: { userId: ctx.user.id }, status: status ?? { not: "DRAFT" } }
      : { customerId: ctx.user.id, ...(status ? { status } : {}) },
    include: {
      profile: { select: { displayName: true } },
      organization: { select: { name: true } },
    },
    orderBy: { startsAt: "desc" },
    take: 100,
  });

  const statuses = (Object.keys(STATUS_LABELS) as RequestStatus[]).filter((s) => !(isTranslator && s === "DRAFT"));

  return (
    <>
      <PageHead title={isTranslator ? "Запросы на привлечение" : "Мои запросы"} />
      <Flash params={sp} />
      <nav className="tabs">
        <Link href="/app/requests" className={!status ? "active" : ""}>Все</Link>
        {statuses.map((s) => (
          <Link key={s} href={`/app/requests?status=${s}`} className={status === s ? "active" : ""}>{STATUS_LABELS[s]}</Link>
        ))}
      </nav>
      <div className="card">
        {requests.length === 0 ? (
          <Empty>Запросов нет.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Мероприятие</th>
                  <th>{isTranslator ? "Заказчик" : "Специалист"}</th>
                  <th>Языки</th>
                  <th>Дата</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td><Link href={`/app/requests/${r.id}`}>{label(EVENT_TYPES, r.eventType)}</Link>{r.urgent && <> <span className="badge warn">Срочно</span></>}</td>
                    <td>{isTranslator ? r.organization?.name ?? "—" : r.profile.displayName}</td>
                    <td>{label(LANGUAGES, r.sourceLang)} → {label(LANGUAGES, r.targetLang)}</td>
                    <td>{formatDateTime(r.startsAt)}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
