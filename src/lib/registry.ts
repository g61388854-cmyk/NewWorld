import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { fieldVisibility, maskProfile, type Visibility } from "./policy";
import { parseMoscowDate } from "./forms";

export interface SearchFilters {
  source?: string;
  target?: string;
  region?: string;
  specialization?: string;
  format?: string;
  date?: string;
  availableNow?: boolean;
  urgent?: boolean;
  travel?: boolean;
  remote?: boolean;
  verifiedOnly?: boolean;
  clientType?: string;
  qualificationKind?: string;
}

export function filtersFromParams(p: Record<string, string | string[] | undefined>): SearchFilters {
  const s = (k: string) => (typeof p[k] === "string" && p[k] ? (p[k] as string) : undefined);
  const b = (k: string) => p[k] === "1" || p[k] === "on";
  return {
    source: s("source"),
    target: s("target"),
    region: s("region"),
    specialization: s("specialization"),
    format: s("format"),
    date: s("date"),
    availableNow: b("now"),
    urgent: b("urgent"),
    travel: b("travel"),
    remote: b("remote"),
    verifiedOnly: b("verified"),
    clientType: s("client"),
    qualificationKind: s("qualification"),
  };
}

function languageCondition(source?: string, target?: string): Prisma.LanguagePairWhereInput | undefined {
  if (source && target)
    return { OR: [{ source, target }, { source: target, target: source, bidirectional: true }] };
  if (source) return { OR: [{ source }, { target: source, bidirectional: true }] };
  if (target) return { OR: [{ target }, { source: target, bidirectional: true }] };
  return undefined;
}

const resultInclude = {
  languages: true,
  qualifications: { where: { status: "VERIFIED" } },
  slots: { where: { endsAt: { gt: new Date(0) } }, orderBy: { startsAt: "asc" } },
} satisfies Prisma.TranslatorProfileInclude;

export type RegistryProfile = Prisma.TranslatorProfileGetPayload<{ include: typeof resultInclude }>;

/**
 * Поиск по реестру. Условия по полям, которые переводчик мог скрыть от пользователя
 * (квалификация), проверяются после выборки с учётом уровня раскрытия — иначе фильтр
 * косвенно раскрывал бы скрытые сведения.
 */
export async function searchTranslators(filters: SearchFilters, levels: Set<Visibility>) {
  const now = new Date();
  const lang = languageCondition(filters.source, filters.target);
  const where: Prisma.TranslatorProfileWhereInput = {
    published: true,
    restricted: false,
    user: { status: "ACTIVE" },
    ...(lang ? { languages: { some: lang } } : {}),
    ...(filters.region ? { region: filters.region } : {}),
    ...(filters.specialization ? { specializations: { has: filters.specialization } } : {}),
    ...(filters.format ? { formats: { has: filters.format } } : {}),
    ...(filters.clientType ? { clientTypes: { has: filters.clientType } } : {}),
    ...(filters.urgent ? { urgentReady: true } : {}),
    ...(filters.travel ? { travelReady: true } : {}),
    ...(filters.remote ? { remote: true } : {}),
    ...(filters.verifiedOnly
      ? {
          OR: [
            { identityStatus: "VERIFIED" },
            { documentsStatus: "VERIFIED" },
            { qualificationStatus: "VERIFIED" },
          ],
        }
      : {}),
  };

  const and: Prisma.TranslatorProfileWhereInput[] = [];
  const day = filters.date ? parseMoscowDate(filters.date) : null;
  if (day) {
    const end = new Date(day.getTime() + 24 * 3600_000);
    and.push({ slots: { some: { kind: "AVAILABLE", startsAt: { lt: end }, endsAt: { gt: day } } } });
  }
  if (filters.availableNow) {
    and.push({ slots: { some: { kind: "AVAILABLE", startsAt: { lte: now }, endsAt: { gt: now } } } });
    and.push({ slots: { none: { kind: "BUSY", startsAt: { lte: now }, endsAt: { gt: now } } } });
  }
  if (and.length) where.AND = and;

  const rows = await db.translatorProfile.findMany({
    where,
    include: { ...resultInclude, slots: { where: { endsAt: { gt: now } }, orderBy: { startsAt: "asc" }, take: 20 } },
    take: 200,
  });

  const filtered = rows.filter((p) => {
    if (!filters.qualificationKind) return true;
    if (!levels.has(fieldVisibility(p.visibility, "qualifications"))) return false;
    return p.qualifications.some((q) => q.kind === filters.qualificationKind);
  });

  const scored = filtered.map((p) => {
    let score = 0;
    if (filters.source && filters.target && p.languages.some((l) => l.source === filters.source && l.target === filters.target))
      score += 4;
    if (p.qualificationStatus === "VERIFIED") score += 3;
    else if (p.documentsStatus === "VERIFIED") score += 2;
    else if (p.identityStatus === "VERIFIED") score += 1;
    const availableSoon = p.slots.some((s) => s.kind === "AVAILABLE" && s.startsAt.getTime() < now.getTime() + 7 * 24 * 3600_000);
    if (availableSoon) score += 1;
    return { profile: maskProfile(p, levels), score };
  });

  scored.sort((a, b) => b.score - a.score || a.profile.displayName.localeCompare(b.profile.displayName, "ru"));
  return scored.map((s) => s.profile);
}

/** Есть ли у заказчика подтверждённое привлечение этого переводчика. */
export async function hasEngagement(customerId: string, profileId: string): Promise<boolean> {
  const count = await db.engagementRequest.count({
    where: { customerId, profileId, status: { in: ["CONFIRMED", "COMPLETED"] } },
  });
  return count > 0;
}

export function availabilityText(slots: { kind: string; startsAt: Date; endsAt: Date }[]): string {
  const now = Date.now();
  const available = slots.filter((s) => s.kind === "AVAILABLE");
  if (available.some((s) => s.startsAt.getTime() <= now && s.endsAt.getTime() > now)) return "Доступен сейчас";
  const next = available.find((s) => s.startsAt.getTime() > now);
  if (next)
    return (
      "Ближайшая доступность: " +
      next.startsAt.toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "Europe/Moscow" })
    );
  return "Доступность уточняется";
}
