import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCtx } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { canSendRequests, maskProfile, verificationLabel, visibleLevels, CONFIGURABLE_FIELDS } from "@/lib/policy";
import { availabilityText, hasEngagement } from "@/lib/registry";
import { CLIENT_TYPES, FORMATS, LANGUAGES, QUALIFICATION_KINDS, SPECIALIZATIONS, label } from "@/lib/dictionaries";
import { formatDateTime } from "@/lib/forms";
import { Avatar, Empty, Flash } from "@/components/ui";

const TABS = [
  ["overview", "Обзор"],
  ["languages", "Языки"],
  ["qualification", "Квалификация"],
  ["services", "Услуги"],
  ["availability", "Доступность"],
  ["documents", "Документы"],
] as const;

const CHECK_LABELS: Record<string, string> = {
  NONE: "Не представлены",
  PENDING: "На проверке",
  VERIFIED: "Проверено",
  REJECTED: "Отклонено",
};

export default async function TranslatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await requireCtx();
  const raw = await db.translatorProfile.findUnique({
    where: { id },
    include: {
      languages: true,
      qualifications: { orderBy: { createdAt: "asc" } },
      slots: { where: { endsAt: { gt: new Date() } }, orderBy: { startsAt: "asc" }, take: 30 },
    },
  });
  if (!raw) notFound();

  const isOwner = raw.userId === ctx.user.id;
  const isAdmin = ctx.user.accountType === "ADMIN";
  const isCustomer = ctx.user.accountType === "CUSTOMER";
  if (!isOwner && !isAdmin && !isCustomer) notFound();
  if (!isOwner && !isAdmin && (!raw.published || raw.restricted)) notFound();

  const engaged = isCustomer ? await hasEngagement(ctx.user.id, raw.id) : false;
  const p = maskProfile(raw, visibleLevels(ctx.facts, engaged), isOwner);
  if (!isOwner) await audit(ctx.user.id, "profile.viewed", { type: "profile", id: raw.id });

  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab : "overview";
  const v = verificationLabel(raw);
  const hiddenNote = (field: keyof typeof CONFIGURABLE_FIELDS) =>
    p.hidden.includes(field) ? <span className="muted">Сведения не раскрываются для текущей категории пользователей</span> : null;

  return (
    <>
      <Flash params={sp} />
      <div className="card">
        <div className="row" style={{ alignItems: "flex-start", gap: 20 }}>
          <Avatar name={p.displayName} large />
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ marginBottom: 4 }}>{p.displayName}</h1>
            <div className="row" style={{ marginBottom: 8 }}>
              <span className={`badge ${v.tone}`}>{v.label}</span>
              {!raw.published && <span className="badge warn">Не опубликован</span>}
            </div>
            <div>{p.languages.map((l) => `${label(LANGUAGES, l.source)} ${l.bidirectional ? "↔" : "→"} ${label(LANGUAGES, l.target)}`).join(", ")}</div>
            <div className="muted">{p.specializations.map((s) => label(SPECIALIZATIONS, s)).join(", ")}</div>
            <div className="muted">Регион: {p.region}{p.city ? `, ${p.city}` : ""}</div>
            <div className="muted">{availabilityText(raw.slots)}</div>
          </div>
          <div className="actions">
            {canSendRequests(ctx.facts) && (
              <Link href={`/app/translators/${p.id}/request`} className="btn">Запросить переводчика</Link>
            )}
            {isOwner && <Link href="/app/profile" className="btn secondary">Редактировать</Link>}
          </div>
        </div>
        <p className="muted small" style={{ marginTop: 16, marginBottom: 0 }}>
          Статус проверки на платформе не заменяет решения уполномоченного лица о назначении переводчика.
        </p>
      </div>

      <nav className="tabs">
        {TABS.map(([k, name]) => (
          <Link key={k} href={`?tab=${k}`} className={tab === k ? "active" : ""}>{name}</Link>
        ))}
      </nav>

      <div className="card">
        {tab === "overview" && (
          <dl className="props">
            <dt>О специалисте</dt>
            <dd>{p.summary || hiddenNote("summary") || "—"}</dd>
            <dt>Опыт работы</dt>
            <dd>{p.experienceYears != null ? `${p.experienceYears} лет` : hiddenNote("experienceYears") || "—"}</dd>
            <dt>Формат оказания услуг</dt>
            <dd>{p.formats.map((f) => label(FORMATS, f)).join(", ") || "—"}</dd>
            <dt>Работа с заказчиками</dt>
            <dd>{p.clientTypes.map((c) => label(CLIENT_TYPES, c)).join(", ") || "—"}</dd>
            <dt>Контакты</dt>
            <dd>
              {p.contactPhone || p.contactEmail
                ? [p.contactPhone, p.contactEmail].filter(Boolean).join(" · ")
                : hiddenNote("contactPhone") || "—"}
            </dd>
          </dl>
        )}

        {tab === "languages" && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Исходный язык</th><th>Целевой язык</th><th>Направление</th><th>Уровень</th><th>Компетенция</th></tr></thead>
              <tbody>
                {p.languages.map((l) => (
                  <tr key={l.id}>
                    <td>{label(LANGUAGES, l.source)}</td>
                    <td>{label(LANGUAGES, l.target)}</td>
                    <td>{l.bidirectional ? "Двустороннее" : "Одностороннее"}</td>
                    <td>{l.level ?? "—"}</td>
                    <td>{l.verified ? <span className="badge good">Подтверждена</span> : <span className="badge">Заявлена</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "qualification" &&
          (p.hidden.includes("qualifications") ? (
            hiddenNote("qualifications")
          ) : p.qualifications.length === 0 ? (
            <Empty>Сведения о квалификации не указаны.</Empty>
          ) : (
            <ul className="list">
              {p.qualifications.map((q) => (
                <li key={q.id}>
                  <div className="row between">
                    <strong>{q.title}</strong>
                    <span className={`badge ${q.status === "VERIFIED" ? "good" : ""}`}>{CHECK_LABELS[q.status]}</span>
                  </div>
                  <div className="muted small">
                    {label(QUALIFICATION_KINDS, q.kind)}{q.issuer ? ` · ${q.issuer}` : ""}{q.year ? ` · ${q.year}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          ))}

        {tab === "services" && (
          <dl className="props">
            <dt>Услуги</dt>
            <dd>{p.formats.map((f) => label(FORMATS, f)).join(", ") || "—"}</dd>
            <dt>Специализация</dt>
            <dd>{p.specializations.map((s) => label(SPECIALIZATIONS, s)).join(", ") || "—"}</dd>
            <dt>Стоимость услуг</dt>
            <dd>{p.rateInfo || hiddenNote("rateInfo") || "—"}</dd>
            <dt>Условия оплаты</dt>
            <dd>{p.paymentTerms || hiddenNote("paymentTerms") || "—"}</dd>
          </dl>
        )}

        {tab === "availability" && (
          <>
            <dl className="props" style={{ marginBottom: 16 }}>
              <dt>Срочное привлечение</dt><dd>{raw.urgentReady ? "Возможно" : "Нет"}</dd>
              <dt>Выезд</dt><dd>{raw.travelReady ? "Возможен" : "Нет"}</dd>
              <dt>Дистанционная работа</dt><dd>{raw.remote ? "Возможна" : "Нет"}</dd>
            </dl>
            {raw.slots.length === 0 ? (
              <Empty>Периоды доступности не указаны.</Empty>
            ) : (
              <ul className="list">
                {raw.slots.map((s) => (
                  <li key={s.id} className="row between">
                    <span>{formatDateTime(s.startsAt)} — {formatDateTime(s.endsAt)}</span>
                    <span className={`badge ${s.kind === "AVAILABLE" ? "good" : ""}`}>{s.kind === "AVAILABLE" ? "Доступен" : "Занят"}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === "documents" && (
          <dl className="props">
            <dt>Подтверждение личности</dt><dd>{CHECK_LABELS[raw.identityStatus]}</dd>
            <dt>Проверка документов</dt><dd>{CHECK_LABELS[raw.documentsStatus]}</dd>
            <dt>Подтверждение квалификации</dt><dd>{CHECK_LABELS[raw.qualificationStatus]}</dd>
            <dt>Примечание</dt>
            <dd className="muted">Документы с паспортными данными, адресами и иными чувствительными сведениями в профиле не публикуются.</dd>
          </dl>
        )}
      </div>
    </>
  );
}
