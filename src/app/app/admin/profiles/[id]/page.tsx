import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { LANGUAGES, QUALIFICATION_KINDS, label } from "@/lib/dictionaries";
import { Flash, PageHead } from "@/components/ui";
import { reviewProfile, reviewQualification, verifyLanguage } from "../../actions";

const CHECKS: [string, string][] = [
  ["NONE", "Не проводилась"],
  ["PENDING", "На проверке"],
  ["VERIFIED", "Подтверждено"],
  ["REJECTED", "Отклонено"],
];

export default async function AdminProfile({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  await requireAccount("ADMIN");
  const p = await db.translatorProfile.findUnique({
    where: { id },
    include: { user: true, languages: true, qualifications: { orderBy: { createdAt: "asc" } } },
  });
  if (!p) notFound();

  const select = (name: string, value: string) => (
    <select name={name} defaultValue={value}>
      {CHECKS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
    </select>
  );

  return (
    <>
      <PageHead title={p.displayName} subtitle={p.user.email}>
        <Link href={`/app/translators/${p.id}`} className="btn secondary">Карточка в реестре</Link>
      </PageHead>
      <Flash params={sp} />

      <form action={reviewProfile} className="card">
        <input type="hidden" name="id" value={p.id} />
        <h2>Статусы проверки</h2>
        <p className="muted small">
          Проверки независимы. Статус «Квалификация подтверждена» присваивается по процедуре регламента проверки и не
          означает допуска к участию в процессуальных действиях.
        </p>
        <div className="grid-3">
          <div className="field"><label>Личность</label>{select("identityStatus", p.identityStatus)}</div>
          <div className="field"><label>Документы</label>{select("documentsStatus", p.documentsStatus)}</div>
          <div className="field"><label>Квалификация</label>{select("qualificationStatus", p.qualificationStatus)}</div>
        </div>
        <label className="check"><input type="checkbox" name="restricted" defaultChecked={p.restricted} /> Временно ограничить профиль (скрыть из реестра)</label>
        <div className="field"><input name="restrictedReason" type="text" placeholder="Основание ограничения" defaultValue={p.restrictedReason ?? ""} /></div>
        <button className="btn" type="submit">Сохранить</button>
      </form>

      <div className="card">
        <h2>Языковые пары</h2>
        <ul className="list">
          {p.languages.map((l) => (
            <li key={l.id} className="row between">
              <span>{label(LANGUAGES, l.source)} {l.bidirectional ? "↔" : "→"} {label(LANGUAGES, l.target)} {l.level ? `· ${l.level}` : ""}</span>
              <form action={verifyLanguage}>
                <input type="hidden" name="id" value={l.id} />
                <input type="hidden" name="verified" value={l.verified ? "false" : "true"} />
                <button className={`btn small ${l.verified ? "danger" : "secondary"}`} type="submit">
                  {l.verified ? "Снять подтверждение" : "Подтвердить компетенцию"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Сведения о квалификации</h2>
        <ul className="list">
          {p.qualifications.map((q) => (
            <li key={q.id} className="row between">
              <span>
                <strong>{q.title}</strong>
                <span className="muted small"> · {label(QUALIFICATION_KINDS, q.kind)}{q.issuer ? ` · ${q.issuer}` : ""}{q.year ? ` · ${q.year}` : ""}</span>
              </span>
              <form action={reviewQualification} className="row">
                <input type="hidden" name="id" value={q.id} />
                {select("status", q.status)}
                <button className="btn secondary small" type="submit">Сохранить</button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
