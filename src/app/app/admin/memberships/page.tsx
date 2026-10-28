import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { CUSTOMER_ROLES, ORGANIZATION_TYPES, REGIONS, label } from "@/lib/dictionaries";
import { formatDateTime } from "@/lib/forms";
import { Empty, Flash, Options, PageHead } from "@/components/ui";
import { approveMembership, rejectMembership, revokeMembership } from "../actions";

const STATUS: Record<string, [string, string]> = {
  PENDING: ["На рассмотрении", "warn"],
  ACTIVE: ["Подтверждены", "good"],
  REJECTED: ["Отклонены", "bad"],
  REVOKED: ["Отозваны", "bad"],
};

export default async function MembershipsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  await requireAccount("ADMIN");
  const [pending, reviewed, orgs] = await Promise.all([
    db.membership.findMany({ where: { status: "PENDING" }, include: { user: true }, orderBy: { createdAt: "asc" } }),
    db.membership.findMany({
      where: { status: { not: "PENDING" } },
      include: { user: true, organization: true },
      orderBy: { reviewedAt: "desc" },
      take: 50,
    }),
    db.organization.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHead title="Заявки на роль" subtitle="Подтверждение принадлежности пользователей к организациям" />
      <Flash params={sp} />
      <div className="notice">
        Принадлежность к органу или учреждению подтверждается по сведениям, указанным в заявке: обратный звонок по
        служебному телефону, сверка с реестром адвокатов субъекта РФ, письмо организации. Выбор роли пользователем
        основанием для подтверждения не является.
      </div>

      <div className="stack">
        {pending.length === 0 && <div className="card"><Empty>Заявок на рассмотрении нет.</Empty></div>}
        {pending.map((m) => (
          <div className="card" key={m.id}>
            <div className="row between">
              <h3 style={{ margin: 0 }}>{m.user.fullName}</h3>
              <span className="muted small">{formatDateTime(m.createdAt)}</span>
            </div>
            <dl className="props" style={{ margin: "12px 0" }}>
              <dt>Роль</dt><dd>{label(CUSTOMER_ROLES, m.role)}</dd>
              <dt>Электронная почта</dt><dd>{m.user.email}</dd>
              <dt>Заявленная организация</dt><dd>{m.claimedOrganization}</dd>
              <dt>Должность</dt><dd>{m.position ?? "—"}</dd>
              <dt>Сведения для проверки</dt><dd style={{ whiteSpace: "pre-wrap" }}>{m.evidence}</dd>
            </dl>
            <form action={approveMembership}>
              <input type="hidden" name="id" value={m.id} />
              <div className="grid-2">
                <div className="field">
                  <label>Организация</label>
                  <select name="organizationId" defaultValue="new">
                    <option value="new">Создать новую</option>
                    {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Наименование новой организации</label>
                  <input name="orgName" type="text" defaultValue={m.claimedOrganization} />
                </div>
                <div className="field">
                  <label>Тип новой организации</label>
                  <select name="orgType" defaultValue={m.role === "ADVOCATE" ? "BAR" : m.role === "COURT" ? "COURT" : m.role === "AGENCY_STAFF" ? "AGENCY" : "LAW_ENFORCEMENT"}>
                    <Options dict={ORGANIZATION_TYPES} />
                  </select>
                </div>
                <div className="field">
                  <label>Регион организации</label>
                  <select name="orgRegion" defaultValue="">
                    <option value="">Не указан</option>
                    {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Комментарий (способ проверки или основание отказа)</label>
                <input name="note" type="text" />
              </div>
              <div className="row">
                <button className="btn" type="submit">Подтвердить на 1 год</button>
                <button className="btn danger" formAction={rejectMembership} type="submit">Отклонить</button>
              </div>
            </form>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h2>Рассмотренные заявки</h2>
        {reviewed.length === 0 ? <Empty>Нет.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Пользователь</th><th>Роль</th><th>Организация</th><th>Статус</th><th>Действует до</th><th></th></tr></thead>
              <tbody>
                {reviewed.map((m) => (
                  <tr key={m.id}>
                    <td>{m.user.fullName}<div className="muted small">{m.user.email}</div></td>
                    <td>{label(CUSTOMER_ROLES, m.role)}</td>
                    <td>{m.organization?.name ?? m.claimedOrganization}</td>
                    <td><span className={`badge ${STATUS[m.status][1]}`}>{STATUS[m.status][0]}</span></td>
                    <td>{m.expiresAt ? formatDateTime(m.expiresAt) : "—"}</td>
                    <td>
                      {m.status === "ACTIVE" && (
                        <form action={revokeMembership}>
                          <input type="hidden" name="id" value={m.id} />
                          <input type="hidden" name="note" value="Полномочия отозваны администратором" />
                          <button className="btn danger small" type="submit">Отозвать</button>
                        </form>
                      )}
                    </td>
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
