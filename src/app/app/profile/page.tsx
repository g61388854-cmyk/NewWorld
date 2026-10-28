import Link from "next/link";
import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { CONFIGURABLE_FIELDS, VISIBILITY_LABELS, fieldVisibility, verificationLabel, type ConfigurableField } from "@/lib/policy";
import {
  CLIENT_TYPES, FORMATS, LANGUAGE_LEVELS, LANGUAGES, QUALIFICATION_KINDS, REGIONS, SPECIALIZATIONS, label,
} from "@/lib/dictionaries";
import { Flash, Options, PageHead } from "@/components/ui";
import {
  addLanguage, addQualification, removeLanguage, removeQualification, saveBasics, saveVisibility, togglePublish,
} from "./actions";

const CHECK_LABELS: Record<string, string> = { NONE: "—", PENDING: "На проверке", VERIFIED: "Проверено", REJECTED: "Отклонено" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const ctx = await requireAccount("TRANSLATOR");
  const p = await db.translatorProfile.findUniqueOrThrow({
    where: { userId: ctx.user.id },
    include: { languages: true, qualifications: { orderBy: { createdAt: "asc" } } },
  });
  const tab = ["basics", "languages", "qualification", "visibility"].includes(sp.tab) ? sp.tab : "basics";
  const v = verificationLabel(p);

  const checks = (name: string, dict: Record<string, string>, selected: string[]) => (
    <div className="grid-2">
      {Object.entries(dict).map(([code, text]) => (
        <label className="check" key={code}>
          <input type="checkbox" name={name} value={code} defaultChecked={selected.includes(code)} /> {text}
        </label>
      ))}
    </div>
  );

  return (
    <>
      <PageHead title="Мой профиль" subtitle="Профессиональная карточка в реестре переводчиков">
        <div className="row">
          <Link href={`/app/translators/${p.id}`} className="btn secondary">Просмотр</Link>
          <form action={togglePublish}>
            <button className="btn" type="submit">{p.published ? "Снять с публикации" : "Опубликовать"}</button>
          </form>
        </div>
      </PageHead>
      <Flash params={sp} />
      <div className="row" style={{ marginBottom: 8 }}>
        <span className={`badge ${v.tone}`}>{v.label}</span>
        <span className={`badge ${p.published ? "good" : "warn"}`}>{p.published ? "Опубликован" : "Не опубликован"}</span>
        {p.restricted && <span className="badge bad">Ограничен: {p.restrictedReason}</span>}
      </div>

      <nav className="tabs">
        <Link href="?tab=basics" className={tab === "basics" ? "active" : ""}>Основное</Link>
        <Link href="?tab=languages" className={tab === "languages" ? "active" : ""}>Языки</Link>
        <Link href="?tab=qualification" className={tab === "qualification" ? "active" : ""}>Квалификация</Link>
        <Link href="?tab=visibility" className={tab === "visibility" ? "active" : ""}>Раскрытие сведений</Link>
      </nav>

      {tab === "basics" && (
        <form action={saveBasics} className="card">
          <fieldset>
            <legend>Общие сведения</legend>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="displayName">Имя и фамилия в реестре</label>
                <input id="displayName" name="displayName" type="text" defaultValue={p.displayName} required />
              </div>
              <div className="field">
                <label htmlFor="experienceYears">Опыт работы, лет</label>
                <input id="experienceYears" name="experienceYears" type="number" min={0} max={70} defaultValue={p.experienceYears ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="region">Регион</label>
                <select id="region" name="region" defaultValue={p.region}>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="city">Город</label>
                <input id="city" name="city" type="text" defaultValue={p.city ?? ""} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="summary">Профессиональная информация</label>
              <textarea id="summary" name="summary" defaultValue={p.summary} maxLength={2000} />
              <div className="hint">Не указывайте паспортные данные, домашний адрес и иные чувствительные сведения.</div>
            </div>
          </fieldset>
          <fieldset>
            <legend>Специализация</legend>
            {checks("specializations", SPECIALIZATIONS, p.specializations)}
          </fieldset>
          <fieldset>
            <legend>Формат работы</legend>
            {checks("formats", FORMATS, p.formats)}
          </fieldset>
          <fieldset>
            <legend>Доступность и выезд</legend>
            <label className="check"><input type="checkbox" name="urgentReady" defaultChecked={p.urgentReady} /> Возможность срочного привлечения</label>
            <label className="check"><input type="checkbox" name="travelReady" defaultChecked={p.travelReady} /> Готовность к выезду</label>
            <label className="check"><input type="checkbox" name="remote" defaultChecked={p.remote} /> Дистанционная работа</label>
            <p className="hint">Периоды доступности задаются в разделе <Link href="/app/calendar">«Календарь»</Link>.</p>
          </fieldset>
          <fieldset>
            <legend>Заказчики и условия</legend>
            {checks("clientTypes", CLIENT_TYPES, p.clientTypes)}
            <div className="grid-2" style={{ marginTop: 8 }}>
              <div className="field">
                <label htmlFor="rateInfo">Стоимость услуг</label>
                <input id="rateInfo" name="rateInfo" type="text" defaultValue={p.rateInfo ?? ""} placeholder="Например, устный перевод — от 2 000 ₽/час" />
              </div>
              <div className="field">
                <label htmlFor="paymentTerms">Условия оплаты</label>
                <input id="paymentTerms" name="paymentTerms" type="text" defaultValue={p.paymentTerms ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="contactPhone">Телефон для связи</label>
                <input id="contactPhone" name="contactPhone" type="tel" defaultValue={p.contactPhone ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="contactEmail">Электронная почта для связи</label>
                <input id="contactEmail" name="contactEmail" type="email" defaultValue={p.contactEmail ?? ""} />
              </div>
            </div>
            <p className="hint">Кому показываются эти сведения, определяется во вкладке «Раскрытие сведений».</p>
          </fieldset>
          <button className="btn" type="submit">Сохранить</button>
        </form>
      )}

      {tab === "languages" && (
        <div className="stack">
          <div className="card">
            <h2>Языковые пары</h2>
            {p.languages.length === 0 ? (
              <p className="muted">Языковые пары не указаны.</p>
            ) : (
              <ul className="list">
                {p.languages.map((l) => (
                  <li key={l.id} className="row between">
                    <span>
                      {label(LANGUAGES, l.source)} {l.bidirectional ? "↔" : "→"} {label(LANGUAGES, l.target)}
                      {l.level ? <span className="muted"> · {l.level}</span> : null}
                      {l.verified && <> <span className="badge good">Подтверждена</span></>}
                    </span>
                    <form action={removeLanguage}>
                      <input type="hidden" name="id" value={l.id} />
                      <button className="btn danger small" type="submit">Удалить</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <form action={addLanguage} className="card">
            <h2>Добавить языковую пару</h2>
            <div className="grid-3">
              <div className="field">
                <label htmlFor="source">Исходный язык</label>
                <select id="source" name="source" required defaultValue=""><Options dict={LANGUAGES} placeholder="Выберите" /></select>
              </div>
              <div className="field">
                <label htmlFor="target">Целевой язык</label>
                <select id="target" name="target" required defaultValue="rus"><Options dict={LANGUAGES} /></select>
              </div>
              <div className="field">
                <label htmlFor="level">Уровень владения</label>
                <select id="level" name="level" defaultValue="">
                  <option value="">Не указан</option>
                  {LANGUAGE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <label className="check"><input type="checkbox" name="bidirectional" defaultChecked /> Перевод в обоих направлениях</label>
            <button className="btn" type="submit" style={{ marginTop: 8 }}>Добавить</button>
          </form>
        </div>
      )}

      {tab === "qualification" && (
        <div className="stack">
          <div className="card">
            <h2>Квалификация</h2>
            <dl className="props" style={{ marginBottom: 16 }}>
              <dt>Подтверждение личности</dt><dd>{CHECK_LABELS[p.identityStatus]}</dd>
              <dt>Проверка документов</dt><dd>{CHECK_LABELS[p.documentsStatus]}</dd>
              <dt>Подтверждение квалификации</dt><dd>{CHECK_LABELS[p.qualificationStatus]}</dd>
            </dl>
            {p.qualifications.length === 0 ? (
              <p className="muted">Сведения не добавлены.</p>
            ) : (
              <ul className="list">
                {p.qualifications.map((q) => (
                  <li key={q.id} className="row between">
                    <span>
                      <strong>{q.title}</strong>
                      <span className="muted small"> · {label(QUALIFICATION_KINDS, q.kind)}{q.issuer ? ` · ${q.issuer}` : ""}{q.year ? ` · ${q.year}` : ""}</span>
                      {" "}<span className={`badge ${q.status === "VERIFIED" ? "good" : q.status === "REJECTED" ? "bad" : ""}`}>{CHECK_LABELS[q.status]}</span>
                    </span>
                    <form action={removeQualification}>
                      <input type="hidden" name="id" value={q.id} />
                      <button className="btn danger small" type="submit">Удалить</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <form action={addQualification} className="card">
            <h2>Добавить сведения</h2>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="kind">Вид</label>
                <select id="kind" name="kind" required defaultValue=""><Options dict={QUALIFICATION_KINDS} placeholder="Выберите" /></select>
              </div>
              <div className="field">
                <label htmlFor="title">Наименование</label>
                <input id="title" name="title" type="text" required placeholder="Диплом, сертификат, программа подготовки" />
              </div>
              <div className="field">
                <label htmlFor="issuer">Выдавшая организация</label>
                <input id="issuer" name="issuer" type="text" />
              </div>
              <div className="field">
                <label htmlFor="year">Год</label>
                <input id="year" name="year" type="number" min={1950} max={new Date().getFullYear()} />
              </div>
            </div>
            <p className="hint">
              Сведения проверяются администратором платформы. Копии документов с паспортными данными в профиле не
              публикуются; порядок их представления определяется регламентом проверки.
            </p>
            <button className="btn" type="submit">Направить на проверку</button>
          </form>
        </div>
      )}

      {tab === "visibility" && (
        <form action={saveVisibility} className="card">
          <h2>Кому показываются сведения</h2>
          <p className="muted">
            Имя, языковые пары, специализация, регион, формат работы и статус проверки отображаются в реестре всегда.
            Остальные сведения раскрываются выбранной категории пользователей и учитываются в поиске только для неё.
          </p>
          {(Object.keys(CONFIGURABLE_FIELDS) as ConfigurableField[]).map((field) => (
            <div className="field row between" key={field}>
              <span>{CONFIGURABLE_FIELDS[field].label}</span>
              <select name={`vis_${field}`} defaultValue={fieldVisibility(p.visibility, field)} style={{ maxWidth: 360 }}>
                {Object.entries(VISIBILITY_LABELS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
              </select>
            </div>
          ))}
          <button className="btn" type="submit">Сохранить</button>
        </form>
      )}
    </>
  );
}
