"use server";

import { z } from "zod";
import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { CONFIGURABLE_FIELDS, type ConfigurableField, type Visibility } from "@/lib/policy";
import {
  CLIENT_TYPES, FORMATS, LANGUAGE_LEVELS, LANGUAGES, QUALIFICATION_KINDS, REGIONS, SPECIALIZATIONS,
} from "@/lib/dictionaries";
import { back, bool, firstIssue, list, str } from "@/lib/forms";

const PATH = "/app/profile";

async function myProfile() {
  const ctx = await requireAccount("TRANSLATOR");
  const profile = await db.translatorProfile.findUniqueOrThrow({ where: { userId: ctx.user.id } });
  return { ctx, profile };
}

const opt = (max: number) => z.string().max(max).optional().transform((v) => v || null);

const basicsSchema = z.object({
  displayName: z.string().min(3, "Укажите имя и фамилию").max(120),
  region: z.string().refine((v) => REGIONS.includes(v), "Выберите регион"),
  city: opt(100),
  summary: z.string().max(2000),
  experienceYears: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 70), "Опыт указывается целым числом лет"),
  rateInfo: opt(300),
  paymentTerms: opt(300),
  contactPhone: opt(40),
  contactEmail: z.string().max(200).optional().refine((v) => !v || z.string().email().safeParse(v).success, "Некорректный адрес электронной почты").transform((v) => v || null),
});

export async function saveBasics(form: FormData) {
  const { ctx, profile } = await myProfile();
  const parsed = basicsSchema.safeParse({
    displayName: str(form, "displayName"),
    region: str(form, "region"),
    city: str(form, "city"),
    summary: str(form, "summary"),
    experienceYears: str(form, "experienceYears"),
    rateInfo: str(form, "rateInfo"),
    paymentTerms: str(form, "paymentTerms"),
    contactPhone: str(form, "contactPhone"),
    contactEmail: str(form, "contactEmail"),
  });
  if (!parsed.success) back(PATH, firstIssue(parsed.error));
  await db.translatorProfile.update({
    where: { id: profile.id },
    data: {
      ...parsed.data,
      specializations: list(form, "specializations").filter((v) => v in SPECIALIZATIONS),
      formats: list(form, "formats").filter((v) => v in FORMATS),
      clientTypes: list(form, "clientTypes").filter((v) => v in CLIENT_TYPES),
      remote: bool(form, "remote"),
      travelReady: bool(form, "travelReady"),
      urgentReady: bool(form, "urgentReady"),
    },
  });
  await audit(ctx.user.id, "profile.updated", { type: "profile", id: profile.id }, { section: "basics" });
  back(PATH, "Профиль сохранён", "ok");
}

export async function saveVisibility(form: FormData) {
  const { ctx, profile } = await myProfile();
  const allowed: Visibility[] = ["PUBLIC", "VERIFIED_CUSTOMERS", "STATE_ONLY", "ENGAGEMENT", "PRIVATE"];
  const visibility: Partial<Record<ConfigurableField, Visibility>> = {};
  for (const field of Object.keys(CONFIGURABLE_FIELDS) as ConfigurableField[]) {
    const v = str(form, `vis_${field}`) as Visibility;
    if (allowed.includes(v)) visibility[field] = v;
  }
  await db.translatorProfile.update({ where: { id: profile.id }, data: { visibility } });
  await audit(ctx.user.id, "profile.updated", { type: "profile", id: profile.id }, { section: "visibility" });
  back(PATH + "?tab=visibility", "Настройки раскрытия сохранены", "ok");
}

export async function addLanguage(form: FormData) {
  const { ctx, profile } = await myProfile();
  const source = str(form, "source");
  const target = str(form, "target");
  const level = str(form, "level");
  const path = PATH + "?tab=languages";
  if (!(source in LANGUAGES) || !(target in LANGUAGES)) back(path, "Выберите языки");
  if (source === target) back(path, "Исходный и целевой языки должны различаться");
  const exists = await db.languagePair.findFirst({
    where: { profileId: profile.id, OR: [{ source, target }, { source: target, target: source }] },
  });
  if (exists) back(path, "Такая языковая пара уже указана");
  await db.languagePair.create({
    data: {
      profileId: profile.id,
      source,
      target,
      bidirectional: bool(form, "bidirectional"),
      level: LANGUAGE_LEVELS.includes(level) ? level : null,
    },
  });
  await audit(ctx.user.id, "profile.updated", { type: "profile", id: profile.id }, { section: "languages" });
  back(path, "Языковая пара добавлена", "ok");
}

export async function removeLanguage(form: FormData) {
  const { ctx, profile } = await myProfile();
  await db.languagePair.deleteMany({ where: { id: str(form, "id"), profileId: profile.id } });
  await audit(ctx.user.id, "profile.updated", { type: "profile", id: profile.id }, { section: "languages" });
  back(PATH + "?tab=languages", "Языковая пара удалена", "ok");
}

export async function addQualification(form: FormData) {
  const { ctx, profile } = await myProfile();
  const path = PATH + "?tab=qualification";
  const kind = str(form, "kind");
  const title = str(form, "title");
  const year = str(form, "year") ? Number(str(form, "year")) : null;
  if (!(kind in QUALIFICATION_KINDS)) back(path, "Выберите вид сведений");
  if (title.length < 3 || title.length > 300) back(path, "Укажите наименование документа или программы");
  if (year !== null && (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear())) back(path, "Некорректный год");
  await db.qualification.create({
    data: { profileId: profile.id, kind, title, issuer: str(form, "issuer").slice(0, 300) || null, year },
  });
  if (profile.documentsStatus === "NONE") {
    await db.translatorProfile.update({ where: { id: profile.id }, data: { documentsStatus: "PENDING" } });
  }
  await audit(ctx.user.id, "profile.updated", { type: "profile", id: profile.id }, { section: "qualifications" });
  back(path, "Сведения направлены на проверку", "ok");
}

export async function removeQualification(form: FormData) {
  const { ctx, profile } = await myProfile();
  await db.qualification.deleteMany({ where: { id: str(form, "id"), profileId: profile.id } });
  await audit(ctx.user.id, "profile.updated", { type: "profile", id: profile.id }, { section: "qualifications" });
  back(PATH + "?tab=qualification", "Сведения удалены", "ok");
}

export async function togglePublish() {
  const { ctx, profile } = await myProfile();
  if (!profile.published) {
    const pairs = await db.languagePair.count({ where: { profileId: profile.id } });
    if (pairs === 0) back(PATH, "Для публикации укажите хотя бы одну языковую пару");
    if (profile.formats.length === 0) back(PATH, "Для публикации укажите формат работы");
  }
  await db.translatorProfile.update({ where: { id: profile.id }, data: { published: !profile.published } });
  await audit(ctx.user.id, "profile.updated", { type: "profile", id: profile.id }, { published: !profile.published });
  back(PATH, profile.published ? "Профиль снят с публикации" : "Профиль опубликован в реестре", "ok");
}
