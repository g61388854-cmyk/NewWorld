import Link from "next/link";
import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/forms";
import { Empty, Flash, PageHead } from "@/components/ui";
import { cancelOrder, completeOrder, createOrder } from "./actions";

const ORDER_STATUS: Record<string, [string, string]> = {
  ACTIVE: ["В работе", "accent"],
  COMPLETED: ["Выполнен", "good"],
  CANCELLED: ["Отменён", ""],
};

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const ctx = await requireAccount("TRANSLATOR");
  const orders = await db.order.findMany({
    where: { translatorId: ctx.user.id },
    orderBy: [{ status: "asc" }, { startsAt: "desc" }],
    take: 200,
  });
  const income = orders.filter((o) => o.status === "COMPLETED" && o.amount).reduce((s, o) => s + (o.amount ?? 0), 0);

  return (
    <>
      <PageHead title="Заказы" subtitle="Заказы из реестра и собственные заказы" />
      <Flash params={sp} />
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="card"><div className="muted small">В работе</div><div className="stat">{orders.filter((o) => o.status === "ACTIVE").length}</div></div>
        <div className="card"><div className="muted small">Выполнено</div><div className="stat">{orders.filter((o) => o.status === "COMPLETED").length}</div></div>
        <div className="card"><div className="muted small">Сумма по выполненным, ₽</div><div className="stat">{income.toLocaleString("ru-RU")}</div></div>
      </div>
      <div className="card">
        {orders.length === 0 ? (
          <Empty>Заказов пока нет.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Заказ</th><th>Заказчик</th><th>Дата</th><th>Сумма, ₽</th><th>Статус</th><th></th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.requestId ? <Link href={`/app/requests/${o.requestId}`}>{o.title}</Link> : o.title}</td>
                    <td>{o.client ?? "—"}</td>
                    <td>{o.startsAt ? formatDateTime(o.startsAt) : "—"}</td>
                    <td>{o.amount?.toLocaleString("ru-RU") ?? "—"}</td>
                    <td><span className={`badge ${ORDER_STATUS[o.status][1]}`}>{ORDER_STATUS[o.status][0]}</span></td>
                    <td>
                      {!o.requestId && o.status === "ACTIVE" && (
                        <form action={completeOrder} className="row">
                          <input type="hidden" name="id" value={o.id} />
                          <button className="btn secondary small" type="submit">Выполнен</button>
                          <button className="btn danger small" formAction={cancelOrder} type="submit">Отменить</button>
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
      <form action={createOrder} className="card">
        <h2>Добавить собственный заказ</h2>
        <div className="grid-2">
          <div className="field"><label htmlFor="title">Наименование</label><input id="title" name="title" type="text" required /></div>
          <div className="field"><label htmlFor="client">Заказчик</label><input id="client" name="client" type="text" /></div>
          <div className="field"><label htmlFor="startsAt">Дата и время</label><input id="startsAt" name="startsAt" type="datetime-local" /></div>
          <div className="field"><label htmlFor="amount">Сумма, ₽</label><input id="amount" name="amount" type="number" min={0} /></div>
        </div>
        <div className="field"><label htmlFor="notes">Примечание</label><textarea id="notes" name="notes" /></div>
        <button className="btn" type="submit">Добавить</button>
      </form>
    </>
  );
}
