import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCtx } from "@/lib/auth";
import { canSearchRegistry, canSendRequests, verificationLabel, visibleLevels } from "@/lib/policy";
import { availabilityText, filtersFromParams, searchTranslators } from "@/lib/registry";
import {
  CLIENT_TYPES, FORMATS, LANGUAGES, QUALIFICATION_KINDS, REGIONS, SPECIALIZATIONS, label,
} from "@/lib/dictionaries";
import { Avatar, Flash, Options, PageHead } from "@/components/ui";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const ctx = await requireCtx();
  if (!canSearchRegistry(ctx.facts)) redirect("/app/profile");

  const filters = filtersFromParams(params);
  // Совпадение по уровню ENGAGEMENT в выдаче не учитывается: контакты раскрываются в карточке привлечения.
  const levels = visibleLevels(ctx.facts, false);
  const results = await searchTranslators(filters, levels);
  const canRequest = canSendRequests(ctx.facts);

  return (
    <>
      <PageHead title="Найти переводчика" subtitle="Поиск специалистов по языку, квалификации и региону" />
      <Flash params={params} />
      {!canRequest && ctx.user.accountType === "CUSTOMER" && (
        <div className="notice">
          Полномочия ещё не подтверждены: доступна публичная часть реестра, направление запросов недоступно.
        </div>
      )}

      <form className="card" method="get">
        <div className="filters">
          <div>
            <label htmlFor="source">Исходный язык</label>
            <select id="source" name="source" defaultValue={filters.source ?? ""}>
              <Options dict={LANGUAGES} placeholder="Любой" />
            </select>
          </div>
          <div>
            <label htmlFor="target">Целевой язык</label>
            <select id="target" name="target" defaultValue={filters.target ?? ""}>
              <Options dict={LANGUAGES} placeholder="Любой" />
            </select>
          </div>
          <div>
            <label htmlFor="region">Регион</label>
            <select id="region" name="region" defaultValue={filters.region ?? ""}>
              <option value="">Любой</option>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="specialization">Специализация</label>
            <select id="specialization" name="specialization" defaultValue={filters.specialization ?? ""}>
              <Options dict={SPECIALIZATIONS} placeholder="Любая" />
            </select>
          </div>
          <div>
            <label htmlFor="format">Формат работы</label>
            <select id="format" name="format" defaultValue={filters.format ?? ""}>
              <Options dict={FORMATS} placeholder="Любой" />
            </select>
          </div>
          <div>
            <label htmlFor="date">Дата</label>
            <input id="date" name="date" type="date" defaultValue={filters.date ?? ""} />
          </div>
        </div>

        <details className="more" open={!!(filters.qualificationKind || filters.clientType || filters.urgent || filters.travel || filters.remote || filters.verifiedOnly || filters.availableNow)}>
          <summary>Дополнительные фильтры</summary>
          <div className="grid-3" style={{ marginTop: 8 }}>
            <div>
              <label className="check"><input type="checkbox" name="now" value="1" defaultChecked={filters.availableNow} /> Доступен сейчас</label>
              <label className="check"><input type="checkbox" name="urgent" value="1" defaultChecked={filters.urgent} /> Возможность срочного привлечения</label>
              <label className="check"><input type="checkbox" name="travel" value="1" defaultChecked={filters.travel} /> Готовность к выезду</label>
              <label className="check"><input type="checkbox" name="remote" value="1" defaultChecked={filters.remote} /> Дистанционная работа</label>
            </div>
            <div>
              <label className="check"><input type="checkbox" name="verified" value="1" defaultChecked={filters.verifiedOnly} /> Только проверенные профили</label>
              <label htmlFor="qualification" style={{ marginTop: 8 }}>Подтверждённая квалификация</label>
              <select id="qualification" name="qualification" defaultValue={filters.qualificationKind ?? ""}>
                <Options dict={QUALIFICATION_KINDS} placeholder="Не важно" />
              </select>
            </div>
            <div>
              <label htmlFor="client">Работа с категорией заказчиков</label>
              <select id="client" name="client" defaultValue={filters.clientType ?? ""}>
                <Options dict={CLIENT_TYPES} placeholder="Не важно" />
              </select>
            </div>
          </div>
        </details>

        <div className="row between" style={{ marginTop: 8 }}>
          <Link href="/app/search" className="small">Сбросить</Link>
          <button className="btn" type="submit">Найти</button>
        </div>
      </form>

      <p style={{ margin: "20px 0 12px" }} className="muted">Найдено специалистов: {results.length}</p>

      <div className="stack">
        {results.map((p) => {
          const v = verificationLabel(p);
          return (
            <div className="card result" key={p.id}>
              <Avatar name={p.displayName} />
              <div className="meta">
                <div className="row">
                  <h3 style={{ margin: 0 }}>{p.displayName}</h3>
                  <span className={`badge ${v.tone}`}>{v.label}</span>
                </div>
                <div>
                  {p.languages.map((l) => `${label(LANGUAGES, l.source)} ${l.bidirectional ? "↔" : "→"} ${label(LANGUAGES, l.target)}`).join(", ")}
                </div>
                <div className="muted">{p.formats.map((f) => label(FORMATS, f)).join(", ") || "Формат не указан"}</div>
                <div className="muted">{p.specializations.map((s) => label(SPECIALIZATIONS, s)).join(", ")}</div>
                <div className="muted">Регион: {p.region}{p.city ? `, ${p.city}` : ""}</div>
                <div className="muted">{availabilityText(p.slots)}</div>
              </div>
              <div className="actions">
                <Link href={`/app/translators/${p.id}`} className="btn secondary">Профиль</Link>
                {canRequest && (
                  <Link href={`/app/translators/${p.id}/request`} className="btn">Запросить переводчика</Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
