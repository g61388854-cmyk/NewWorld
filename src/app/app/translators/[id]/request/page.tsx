import { notFound, redirect } from "next/navigation";
import { requireCtx } from "@/lib/auth";
import { db } from "@/lib/db";
import { canSendRequests } from "@/lib/policy";
import { EVENT_TYPES, FORMATS, LANGUAGES, REGIONS, SPECIALIZATIONS, label } from "@/lib/dictionaries";
import { Flash, Options, PageHead } from "@/components/ui";
import { createRequest } from "../../../requests/actions";

export default async function RequestForm({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const ctx = await requireCtx();
  if (!canSendRequests(ctx.facts)) redirect("/app/search?error=" + encodeURIComponent("Направление запросов доступно после подтверждения полномочий"));
  const profile = await db.translatorProfile.findFirst({
    where: { id, published: true, restricted: false },
    include: { languages: true },
  });
  if (!profile) notFound();
  const org = ctx.user.membership?.organization;
  const pairs = profile.languages;

  return (
    <>
      <PageHead title="Запрос переводчика" subtitle={`Специалист: ${profile.displayName}`} />
      <Flash params={sp} />
      <form action={createRequest} className="card steps">
        <input type="hidden" name="profileId" value={profile.id} />

        <fieldset>
          <legend>Задача</legend>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="eventType">Тип мероприятия</label>
              <select id="eventType" name="eventType" required defaultValue="">
                <Options dict={EVENT_TYPES} placeholder="Выберите" />
              </select>
            </div>
            <div className="field">
              <label htmlFor="pair">Языковая пара</label>
              <select id="pair" name="pair" required>
                {pairs.flatMap((l) => {
                  const opts = [[`${l.source}:${l.target}`, `${label(LANGUAGES, l.source)} → ${label(LANGUAGES, l.target)}`]];
                  if (l.bidirectional) opts.push([`${l.target}:${l.source}`, `${label(LANGUAGES, l.target)} → ${label(LANGUAGES, l.source)}`]);
                  return opts;
                }).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="format">Формат участия</label>
              <select id="format" name="format" required defaultValue="">
                <Options dict={FORMATS} placeholder="Выберите" />
              </select>
            </div>
            <div className="field">
              <label htmlFor="specialization">Требуемая специализация</label>
              <select id="specialization" name="specialization" defaultValue="">
                <Options dict={SPECIALIZATIONS} placeholder="Не требуется" />
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Время и место</legend>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="startsAt">Дата и время начала (московское время)</label>
              <input id="startsAt" name="startsAt" type="datetime-local" required />
            </div>
            <div className="field">
              <label htmlFor="duration">Предполагаемая продолжительность, часов</label>
              <input id="duration" name="duration" type="number" min={0.5} max={24} step={0.5} defaultValue={2} required />
            </div>
            <div className="field">
              <label htmlFor="region">Регион</label>
              <select id="region" name="region" required defaultValue={profile.region}>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="location">Адрес</label>
              <input id="location" name="location" type="text" />
              <div className="hint">Хранится в зашифрованном виде и раскрывается переводчику только после подтверждения участия.</div>
            </div>
          </div>
          <label className="check"><input type="checkbox" name="remote" /> Дистанционный формат</label>
        </fieldset>

        <fieldset>
          <legend>Организация</legend>
          <div className="grid-2">
            <div className="field">
              <label>Ведомство или учреждение</label>
              <input type="text" value={org?.name ?? ""} disabled />
            </div>
            <div className="field">
              <label htmlFor="department">Подразделение</label>
              <input id="department" name="department" type="text" />
            </div>
            <div className="field">
              <label htmlFor="officialContact">Служебный контакт</label>
              <input id="officialContact" name="officialContact" type="text" required placeholder="Служебный телефон или адрес" />
              <div className="hint">Раскрывается переводчику после подтверждения участия.</div>
            </div>
            <div className="field">
              <label htmlFor="internalRef">Идентификатор запроса внутри организации</label>
              <input id="internalRef" name="internalRef" type="text" maxLength={60} />
              <div className="hint">Не указывайте номер дела и сведения об участниках производства. Переводчику не показывается.</div>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Дополнительные условия</legend>
          <label className="check"><input type="checkbox" name="urgent" /> Срочное привлечение</label>
          <label className="check"><input type="checkbox" name="preparation" /> Требуется предварительная подготовка</label>
          <div className="grid-2" style={{ marginTop: 8 }}>
            <div className="field">
              <label htmlFor="requirements">Требования к квалификации</label>
              <textarea id="requirements" name="requirements" maxLength={1000} />
            </div>
            <div className="field">
              <label htmlFor="technical">Технические условия</label>
              <textarea id="technical" name="technical" maxLength={1000} placeholder="Например, платформа видеосвязи" />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Подтверждение</legend>
          <p className="muted">
            Запрос сохраняется как черновик. На следующем шаге открывается сводка для проверки введённых данных и
            отправки специалисту. Материалы дела и процессуальные документы к запросу не прикладываются.
          </p>
          <button className="btn" type="submit">Перейти к проверке</button>
        </fieldset>
      </form>
    </>
  );
}
