"use server";

import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { back, parseMoscowLocal, str } from "@/lib/forms";

const PATH = "/app/orders";

export async function createOrder(form: FormData) {
  const ctx = await requireAccount("TRANSLATOR");
  const title = str(form, "title");
  if (title.length < 3 || title.length > 200) back(PATH, "Укажите наименование заказа");
  const amountRaw = str(form, "amount");
  const amount = amountRaw ? Math.round(Number(amountRaw)) : null;
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) back(PATH, "Некорректная сумма");
  await db.order.create({
    data: {
      translatorId: ctx.user.id,
      title,
      client: str(form, "client").slice(0, 200) || null,
      startsAt: parseMoscowLocal(str(form, "startsAt")),
      amount,
      notes: str(form, "notes").slice(0, 2000) || null,
    },
  });
  back(PATH, "Заказ добавлен", "ok");
}

export async function completeOrder(form: FormData) {
  return setOrderStatus(form, "COMPLETED");
}

export async function cancelOrder(form: FormData) {
  return setOrderStatus(form, "CANCELLED");
}

async function setOrderStatus(form: FormData, status: "COMPLETED" | "CANCELLED") {
  const ctx = await requireAccount("TRANSLATOR");
  // Статусы заказов, созданных из запросов, меняются только через запрос.
  await db.order.updateMany({ where: { id: str(form, "id"), translatorId: ctx.user.id, requestId: null }, data: { status } });
  back(PATH, "Статус заказа обновлён", "ok");
}
