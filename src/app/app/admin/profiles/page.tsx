import Link from "next/link";
import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { verificationLabel } from "@/lib/policy";
import { Empty, Flash, PageHead } from "@/components/ui";

export default async function AdminProfiles({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  await requireAccount("ADMIN");
  const profiles = await db.translatorProfile.findMany({
    include: {
      user: { select: { email: true, status: true } },
      _count: { select: { qualifications: { where: { status: "PENDING" } }, languages: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  profiles.sort((a, b) => b._count.qualifications - a._count.qualifications);

  return (
    <>
      <PageHead title="Проверка профилей" subtitle="Подтверждение личности, документов и квалификации переводчиков" />
      <Flash params={sp} />
      <div className="card">
        {profiles.length === 0 ? <Empty>Профилей нет.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Переводчик</th><th>Регион</th><th>Статус</th><th>На проверке</th><th>Публикация</th></tr></thead>
              <tbody>
                {profiles.map((p) => {
                  const v = verificationLabel(p);
                  return (
                    <tr key={p.id}>
                      <td><Link href={`/app/admin/profiles/${p.id}`}>{p.displayName}</Link><div className="muted small">{p.user.email}</div></td>
                      <td>{p.region}</td>
                      <td><span className={`badge ${v.tone}`}>{v.label}</span></td>
                      <td>{p._count.qualifications > 0 ? <span className="badge warn">{p._count.qualifications}</span> : "—"}</td>
                      <td>{p.published ? "Опубликован" : "Нет"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
