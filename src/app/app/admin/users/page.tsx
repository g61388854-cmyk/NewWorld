import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { CUSTOMER_ROLES, label } from "@/lib/dictionaries";
import { formatDateTime } from "@/lib/forms";
import { Flash, PageHead } from "@/components/ui";
import { setUserStatus } from "../actions";

const TYPES: Record<string, string> = { TRANSLATOR: "Переводчик", CUSTOMER: "Заказчик", ADMIN: "Администратор" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const ctx = await requireAccount("ADMIN");
  const q = (sp.q ?? "").trim();
  const users = await db.user.findMany({
    where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { fullName: { contains: q, mode: "insensitive" } }] } : {},
    include: { membership: { include: { organization: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <PageHead title="Пользователи" />
      <Flash params={sp} />
      <form method="get" className="row" style={{ marginBottom: 16 }}>
        <input name="q" type="text" defaultValue={q} placeholder="Имя или адрес электронной почты" style={{ maxWidth: 360 }} />
        <button className="btn secondary" type="submit">Найти</button>
      </form>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Пользователь</th><th>Тип</th><th>Организация</th><th>2FA</th><th>Регистрация</th><th>Статус</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.fullName}<div className="muted small">{u.email}</div></td>
                  <td>{TYPES[u.accountType]}{u.membership ? <div className="muted small">{label(CUSTOMER_ROLES, u.membership.role)}</div> : null}</td>
                  <td>{u.membership?.organization?.name ?? u.membership?.claimedOrganization ?? "—"}</td>
                  <td>{u.mfaEnabled ? "Да" : "Нет"}</td>
                  <td>{formatDateTime(u.createdAt)}</td>
                  <td><span className={`badge ${u.status === "ACTIVE" ? "good" : "bad"}`}>{u.status === "ACTIVE" ? "Активен" : "Заблокирован"}</span></td>
                  <td>
                    {u.id !== ctx.user.id && (
                      <form action={setUserStatus}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="block" value={u.status === "ACTIVE" ? "true" : "false"} />
                        <button className={`btn small ${u.status === "ACTIVE" ? "danger" : "secondary"}`} type="submit">
                          {u.status === "ACTIVE" ? "Заблокировать" : "Разблокировать"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
