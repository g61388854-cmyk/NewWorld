import Link from "next/link";
import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { AUDIT_LABELS } from "@/lib/audit";
import { formatDateTime } from "@/lib/forms";
import { PageHead } from "@/components/ui";

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  await requireAccount("ADMIN");
  const action = sp.action && sp.action in AUDIT_LABELS ? sp.action : undefined;
  const logs = await db.auditLog.findMany({
    where: action ? { action } : {},
    include: { actor: { select: { fullName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return (
    <>
      <PageHead title="Журнал действий" subtitle="Записи журнала не изменяются и не удаляются" />
      <form method="get" className="row" style={{ marginBottom: 16 }}>
        <select name="action" defaultValue={action ?? ""} style={{ maxWidth: 360 }}>
          <option value="">Все действия</option>
          {Object.entries(AUDIT_LABELS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select>
        <button className="btn secondary" type="submit">Показать</button>
        {action && <Link href="/app/admin/audit" className="small">Сбросить</Link>}
      </form>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Время</th><th>Действие</th><th>Пользователь</th><th>Объект</th><th>IP</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{formatDateTime(l.createdAt)}</td>
                  <td>{AUDIT_LABELS[l.action] ?? l.action}{l.meta ? <div className="muted small"><code>{JSON.stringify(l.meta)}</code></div> : null}</td>
                  <td>{l.actor ? <>{l.actor.fullName}<div className="muted small">{l.actor.email}</div></> : "—"}</td>
                  <td>{l.objectType ? `${l.objectType}: ${l.objectId}` : "—"}</td>
                  <td>{l.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
