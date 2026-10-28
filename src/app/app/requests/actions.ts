"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCtx, type Ctx } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { encrypt } from "@/lib/crypto";
import { canSendRequests } from "@/lib/policy";
import { EVENT_TYPES, FORMATS, REGIONS, SPECIALIZATIONS, label } from "@/lib/dictionaries";
import { back, bool, firstIssue, formatDateTime, parseMoscowLocal, str } from "@/lib/forms";
import { nextStatus, STATUS_LABELS, type RequestAction, type Side } from "@/lib/request-flow";

const optional = (max: number) => z.string().max(max).optional().transform((v) => v || null);

const requestSchema = z.object({
  profileId: z.string().min(1),
  eventType: z.string().refine((v) => v in EVENT_TYPES, "Выберите тип мероприятия"),
  pair: z.string().regex(/^[a-z]{3}:[a-z]{3}$/, "Выберите языковую пару"),
  format: z.string().refine((v) => v in FORMATS, "Выберите формат участия"),
  specialization: z.string().optional().refine((v) => !v || v in SPECIALIZATIONS, "Неизвестная специализация"),
  startsAt: z.string(),
  duration: z.coerce.number().min(0.5, "Продолжительность — не менее получаса").max(24),
  region: z.string().refine((v) => REGIONS.includes(v), "Выберите регион"),
  location: optional(300),
  department: optional(200),
  officialContact: z.string().min(5, "Укажите служебный контакт").max(200),
  internalRef: optional(60),
  requirements: optional(1000),
  technical: optional(1000),
});

export async function createRequest(form: FormData) {
  const ctx = await requireCtx();
  const profileId = str(form, "profileId");
  const path = `/app/translators/${profileId}/request`;
  if (!canSendRequests(ctx.facts)) back("/app/search", "Направление запросов доступно после подтверждения полномочий");

  const parsed = requestSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) back(path, firstIssue(parsed.error));
  const d = parsed.data;
  const startsAt = parseMoscowLocal(d.startsAt);
  if (!startsAt || startsAt.getTime() < Date.now()) back(path, "Укажите дату и время в будущем");

  const [sourceLang, targetLang] = d.pair.split(":");
  const profile = await db.translatorProfile.findFirst({
    where: { id: profileId, published: true, restricted: false },
    include: { languages: true },
  });
  if (!profile) back("/app/search", "Профиль недоступен");
  const pairOk = profile.languages.some(
    (l) => (l.source === sourceLang && l.target === targetLang) || (l.bidirectional && l.source === targetLang && l.target === sourceLang),
  );
  if (!pairOk) back(path, "Специалист не работает с выбранной языковой парой");

  const req = await db.engagementRequest.create({
    data: {
      customerId: ctx.user.id,
      organizationId: ctx.user.membership?.organizationId ?? null,
      profileId,
      eventType: d.eventType,
      sourceLang,
      targetLang,
      format: d.format,
      specialization: d.specialization || null,
      startsAt,
      durationMinutes: Math.round(d.duration * 60),
      remote: bool(form, "remote"),
      region: d.region,
      locationEnc: d.location ? encrypt(d.location) : null,
      urgent: bool(form, "urgent"),
      preparation: bool(form, "preparation"),
      requirements: d.requirements,
      technical: d.technical,
      department: d.department,
      officialContact: d.officialContact,
      internalRef: d.internalRef,
    },
  });
  await audit(ctx.user.id, "request.created", { type: "request", id: req.id });
  redirect(`/app/requests/${req.id}`);
}

async function loadForActor(id: string, ctx: Ctx) {
  const req = await db.engagementRequest.findUnique({
    where: { id },
    include: { profile: { select: { id: true, userId: true, displayName: true } }, customer: { select: { id: true, fullName: true } } },
  });
  if (!req) return null;
  let side: Side | null = null;
  if (req.customerId === ctx.user.id) side = "customer";
  else if (req.profile.userId === ctx.user.id && req.status !== "DRAFT") side = "translator";
  return side ? { req, side } : null;
}

export async function requestAction(form: FormData) {
  const ctx = await requireCtx();
  const id = str(form, "id");
  const action = str(form, "action") as RequestAction;
  const message = str(form, "message").slice(0, 2000);
  const path = `/app/requests/${id}`;

  const loaded = await loadForActor(id, ctx);
  if (!loaded) back("/app/requests", "Запрос не найден");
  const { req, side } = loaded;

  const to = nextStatus(req.status, action, side);
  if (!to) back(path, "Действие недоступно в текущем статусе запроса");
  if (side === "customer" && action === "send" && !canSendRequests(ctx.facts))
    back(path, "Направление запросов доступно после подтверждения полномочий");
  if ((action === "clarify" || action === "answer") && !message) back(path, "Введите текст сообщения");
  if (action === "send" && req.startsAt.getTime() < Date.now()) back(path, "Дата мероприятия уже прошла. Создайте новый запрос");

  const endsAt = new Date(req.startsAt.getTime() + req.durationMinutes * 60_000);
  const title = `${label(EVENT_TYPES, req.eventType)} — перевод`;

  if (action === "confirm") {
    const overlap = await db.availabilitySlot.count({
      where: { profileId: req.profileId, kind: "BUSY", startsAt: { lt: endsAt }, endsAt: { gt: req.startsAt } },
    });
    if (overlap > 0) back(path, "На это время уже подтверждено другое мероприятие");
  }

  await db.$transaction(async (tx) => {
    // Условное обновление защищает от одновременной смены статуса двумя сторонами.
    const updated = await tx.engagementRequest.updateMany({
      where: { id, status: req.status },
      data: {
        status: to,
        ...(action === "send" ? { sentAt: new Date() } : {}),
        ...(["confirm", "decline", "clarify"].includes(action) ? { respondedAt: new Date() } : {}),
        ...(action === "complete" ? { completedAt: new Date() } : {}),
        ...((action === "decline" || action === "cancel") && message ? { closeReason: message } : {}),
      },
    });
    if (updated.count !== 1) throw new Error("conflict");

    if (message) await tx.requestMessage.create({ data: { requestId: id, authorId: ctx.user.id, body: message } });

    if (action === "confirm") {
      await tx.order.create({
        data: {
          translatorId: req.profile.userId,
          requestId: id,
          title,
          client: req.customer.fullName,
          startsAt: req.startsAt,
        },
      });
      await tx.calendarEvent.createMany({
        data: [
          { ownerId: req.profile.userId, title, startsAt: req.startsAt, endsAt, requestId: id },
          { ownerId: req.customerId, title: `${title}: ${req.profile.displayName}`, startsAt: req.startsAt, endsAt, requestId: id },
        ],
      });
      await tx.availabilitySlot.create({
        data: { profileId: req.profileId, startsAt: req.startsAt, endsAt, kind: "BUSY", requestId: id },
      });
    }
    if (action === "cancel" && req.status === "CONFIRMED") {
      await tx.calendarEvent.deleteMany({ where: { requestId: id } });
      await tx.availabilitySlot.deleteMany({ where: { requestId: id } });
      await tx.order.updateMany({ where: { requestId: id }, data: { status: "CANCELLED" } });
    }
    if (action === "complete") {
      await tx.order.updateMany({ where: { requestId: id }, data: { status: "COMPLETED" } });
      await tx.availabilitySlot.deleteMany({ where: { requestId: id } });
    }
  }).catch((e: unknown) => {
    if (e instanceof Error && e.message === "conflict") back(path, "Статус запроса изменился. Обновите страницу");
    throw e;
  });

  await audit(ctx.user.id, "request.status_changed", { type: "request", id }, { from: req.status, to });

  const recipient = side === "customer" ? req.profile.userId : req.customerId;
  await notify(recipient, `Запрос: ${STATUS_LABELS[to]}`, `${title}, ${formatDateTime(req.startsAt)}`, path);
  back(path, "Статус запроса обновлён", "ok");
}

export async function postMessage(form: FormData) {
  const ctx = await requireCtx();
  const id = str(form, "id");
  const body = str(form, "message").slice(0, 2000);
  const path = `/app/requests/${id}`;
  const loaded = await loadForActor(id, ctx);
  if (!loaded) back("/app/requests", "Запрос не найден");
  if (!body) back(path, "Введите текст сообщения");
  if (["DRAFT", "DECLINED", "CANCELLED", "COMPLETED"].includes(loaded.req.status)) back(path, "Переписка по запросу закрыта");
  await db.requestMessage.create({ data: { requestId: id, authorId: ctx.user.id, body } });
  await audit(ctx.user.id, "request.message", { type: "request", id });
  const recipient = loaded.side === "customer" ? loaded.req.profile.userId : loaded.req.customerId;
  await notify(recipient, "Новое сообщение по запросу", body.slice(0, 140), path);
  back(path, "Сообщение отправлено", "ok");
}

export async function noteAppointment(form: FormData) {
  const ctx = await requireCtx();
  const id = str(form, "id");
  const path = `/app/requests/${id}`;
  const loaded = await loadForActor(id, ctx);
  if (!loaded || loaded.side !== "customer") back("/app/requests", "Запрос не найден");
  if (loaded.req.status !== "CONFIRMED") back(path, "Отметка доступна после подтверждения участия специалистом");
  await db.engagementRequest.update({ where: { id }, data: { appointmentNotedAt: new Date() } });
  await audit(ctx.user.id, "request.appointment_noted", { type: "request", id });
  await notify(loaded.req.profile.userId, "Оформлено решение о назначении", "Заказчик отметил оформление процессуального решения о назначении переводчика.", path);
  back(path, "Отметка сохранена", "ok");
}
