import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCtx } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { decrypt } from "@/lib/crypto";
import { EVENT_TYPES, FORMATS, LANGUAGES, ORGANIZATION_TYPES, SPECIALIZATIONS, label } from "@/lib/dictionaries";
import { formatDateTime } from "@/lib/forms";
import { availableActions, nextStatus, translatorSeesEngagementDetails, type RequestAction } from "@/lib/request-flow";
import { Flash, PageHead, StatusBadge } from "@/components/ui";
import { noteAppointment, postMessage, requestAction } from "../actions";

const ACTION_LABELS: Record<RequestAction, string> = {
  send: "Отправить специалисту",
  open: "",
  confirm: "Подтвердить возможность участия",
  decline: "Отказать",
  clarify: "Запросить уточнения",
  answer: "Ответить на уточнение",
  cancel: "Отменить запрос",
  complete: "Отметить мероприятие проведённым",
};

export default async function RequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await requireCtx();

  let req = await db.engagementRequest.findUnique({
    where: { id },
    include: {
      profile: { select: { id: true, userId: true, displayName: true } },
      customer: { select: { id: true, fullName: true } },
      organization: true,
      messages: { include: { author: { select: { fullName: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!req) notFound();
  const side = req.customerId === ctx.user.id ? "customer" : req.profile.userId === ctx.user.id && req.status !== "DRAFT" ? "translator" : null;
  if (!side) notFound();

  // Первое открытие запроса переводчиком переводит его в статус «Ожидает ответа».
  if (side === "translator" && req.status === "SENT") {
    const to = nextStatus(req.status, "open", "translator")!;
    const res = await db.engagementRequest.updateMany({ where: { id, status: "SENT" }, data: { status: to } });
    if (res.count === 1) {
      await audit(ctx.user.id, "request.status_changed", { type: "request", id }, { from: "SENT", to });
      req = { ...req, status: to };
    }
  }

  const showDetails = side === "customer" || translatorSeesEngagementDetails(req.status);
  const location = req.locationEnc && showDetails ? decrypt(req.locationEnc) : null;
  const actions = availableActions(req.status, side);
  const needsMessage = (a: RequestAction) => a === "clarify" || a === "answer";

  return (
    <>
      <PageHead title={label(EVENT_TYPES, req.eventType)} subtitle={formatDateTime(req.startsAt)}>
        <StatusBadge status={req.status} />
      </PageHead>
      <Flash params={sp} />

      {req.status === "DRAFT" && (
        <div className="notice">Черновик. Проверьте сведения и отправьте запрос специалисту.</div>
      )}

      <div className="grid-2">
        <div className="card">
          <h2>Задача</h2>
          <dl className="props">
            <dt>Языковая пара</dt><dd>{label(LANGUAGES, req.sourceLang)} → {label(LANGUAGES, req.targetLang)}</dd>
            <dt>Формат участия</dt><dd>{label(FORMATS, req.format)}</dd>
            <dt>Специализация</dt><dd>{label(SPECIALIZATIONS, req.specialization) || "—"}</dd>
            <dt>Продолжительность</dt><dd>{(req.durationMinutes / 60).toLocaleString("ru-RU")} ч</dd>
            <dt>Регион</dt><dd>{req.region}{req.remote ? " · дистанционно" : ""}</dd>
            <dt>Адрес</dt>
            <dd>{location ?? (req.locationEnc ? <span className="muted">Раскрывается после подтверждения участия</span> : "—")}</dd>
            <dt>Срочность</dt><dd>{req.urgent ? "Срочное привлечение" : "Обычная"}</dd>
            <dt>Подготовка</dt><dd>{req.preparation ? "Требуется" : "Не требуется"}</dd>
            {req.requirements && (<><dt>Требования к квалификации</dt><dd>{req.requirements}</dd></>)}
            {req.technical && (<><dt>Технические условия</dt><dd>{req.technical}</dd></>)}
          </dl>
        </div>
        <div className="card">
          <h2>Стороны</h2>
          <dl className="props">
            <dt>Специалист</dt>
            <dd><Link href={`/app/translators/${req.profile.id}`}>{req.profile.displayName}</Link></dd>
            <dt>Организация</dt>
            <dd>{req.organization ? `${req.organization.name} (${label(ORGANIZATION_TYPES, req.organization.type)})` : "—"}</dd>
            <dt>Заказчик</dt><dd>{req.customer.fullName}</dd>
            {side === "customer" && req.department && (<><dt>Подразделение</dt><dd>{req.department}</dd></>)}
            <dt>Служебный контакт</dt>
            <dd>{showDetails ? req.officialContact : <span className="muted">Раскрывается после подтверждения участия</span>}</dd>
            {side === "customer" && req.internalRef && (<><dt>Внутренний идентификатор</dt><dd>{req.internalRef}</dd></>)}
            {req.closeReason && (<><dt>Причина</dt><dd>{req.closeReason}</dd></>)}
          </dl>
        </div>
      </div>

      {(req.status === "CONFIRMED" || req.status === "COMPLETED") && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Процессуальное оформление</h2>
          <p className="muted">
            Подтверждение специалистом возможности участия не заменяет процессуального решения о назначении переводчика
            (ч. 2 ст. 59 УПК РФ). Переводчик предупреждается об ответственности за заведомо неправильный перевод
            (ст. 307 УК РФ) в установленном процессуальном порядке.
          </p>
          {req.appointmentNotedAt ? (
            <span className="badge good">Решение о назначении оформлено · {formatDateTime(req.appointmentNotedAt)}</span>
          ) : side === "customer" && req.status === "CONFIRMED" ? (
            <form action={noteAppointment}>
              <input type="hidden" name="id" value={req.id} />
              <button className="btn secondary" type="submit">Отметить оформление решения о назначении</button>
            </form>
          ) : (
            <span className="badge">Решение о назначении не отмечено</span>
          )}
        </div>
      )}

      {actions.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Действия</h2>
          <div className="stack">
            {actions.map((a) => (
              <form action={requestAction} key={a} className={needsMessage(a) || a === "decline" || a === "cancel" ? "stack" : "row"}>
                <input type="hidden" name="id" value={req.id} />
                <input type="hidden" name="action" value={a} />
                {(needsMessage(a) || a === "decline" || a === "cancel") && (
                  <textarea name="message" required={needsMessage(a)}
                    placeholder={needsMessage(a) ? "Текст сообщения" : "Причина (необязательно)"} style={{ minHeight: 60 }} />
                )}
                <div>
                  <button className={`btn ${a === "decline" || a === "cancel" ? "danger" : a === "clarify" ? "secondary" : ""}`} type="submit">
                    {ACTION_LABELS[a]}
                  </button>
                </div>
              </form>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Переписка</h2>
        {req.messages.length === 0 ? (
          <p className="muted">Сообщений нет.</p>
        ) : (
          <ul className="list">
            {req.messages.map((m) => (
              <li key={m.id}>
                <div className="small muted">{m.author.fullName} · {formatDateTime(m.createdAt)}</div>
                <div style={{ whiteSpace: "pre-wrap" }}>{m.body}</div>
              </li>
            ))}
          </ul>
        )}
        {["SENT", "AWAITING_RESPONSE", "CLARIFICATION_REQUESTED", "CONFIRMED"].includes(req.status) && (
          <form action={postMessage} className="stack" style={{ marginTop: 12 }}>
            <input type="hidden" name="id" value={req.id} />
            <textarea name="message" required placeholder="Сообщение" style={{ minHeight: 60 }} />
            <div><button className="btn secondary" type="submit">Отправить сообщение</button></div>
          </form>
        )}
        <p className="hint" style={{ marginTop: 12 }}>
          Переписка предназначена для организационных вопросов. Сведения из материалов дела в сообщениях не указываются.
        </p>
      </div>
    </>
  );
}
