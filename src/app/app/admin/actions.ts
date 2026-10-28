"use server";

import type { CheckStatus, OrganizationType } from "@prisma/client";
import { requireAccount } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { ORGANIZATION_TYPES } from "@/lib/dictionaries";
import { back, str } from "@/lib/forms";

const CHECKS: CheckStatus[] = ["NONE", "PENDING", "VERIFIED", "REJECTED"];

export async function approveMembership(form: FormData) {
  return reviewMembership(form, "approve");
}

export async function rejectMembership(form: FormData) {
  return reviewMembership(form, "reject");
}

export async function revokeMembership(form: FormData) {
  return reviewMembership(form, "revoke");
}

async function reviewMembership(form: FormData, decision: "approve" | "reject" | "revoke") {
  const ctx = await requireAccount("ADMIN");
  const id = str(form, "id");
  const note = str(form, "note").slice(0, 500) || null;
  const path = "/app/admin/memberships";
  const m = await db.membership.findUnique({ where: { id } });
  if (!m) back(path, "Заявка не найдена");

  if (decision === "approve") {
    let organizationId = str(form, "organizationId");
    if (organizationId === "new") {
      const name = str(form, "orgName");
      const type = str(form, "orgType") as OrganizationType;
      if (name.length < 3 || !(type in ORGANIZATION_TYPES)) back(path, "Укажите наименование и тип новой организации");
      const org = await db.organization.create({ data: { name, type, region: str(form, "orgRegion") || null } });
      organizationId = org.id;
    } else if (!(await db.organization.findUnique({ where: { id: organizationId } }))) {
      back(path, "Выберите организацию");
    }
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    await db.membership.update({
      where: { id },
      data: { status: "ACTIVE", organizationId, reviewedById: ctx.user.id, reviewedAt: new Date(), reviewNote: note, expiresAt },
    });
    await notify(m.userId, "Полномочия подтверждены", "Направление запросов переводчикам доступно.", "/app/search");
  } else {
    await db.membership.update({
      where: { id },
      data: { status: decision === "reject" ? "REJECTED" : "REVOKED", reviewedById: ctx.user.id, reviewedAt: new Date(), reviewNote: note },
    });
    await db.session.deleteMany({ where: { userId: m.userId } });
    await notify(m.userId, "Полномочия не подтверждены", note ?? "Заявка отклонена администратором платформы.");
  }
  await audit(ctx.user.id, decision === "revoke" ? "membership.revoked" : "membership.reviewed", { type: "membership", id }, { decision, note });
  back(path, "Решение сохранено", "ok");
}

export async function reviewProfile(form: FormData) {
  const ctx = await requireAccount("ADMIN");
  const id = str(form, "id");
  const path = `/app/admin/profiles/${id}`;
  const pick = (name: string) => {
    const v = str(form, name) as CheckStatus;
    return CHECKS.includes(v) ? v : undefined;
  };
  const restricted = str(form, "restricted") === "on";
  const restrictedReason = str(form, "restrictedReason").slice(0, 300) || null;
  if (restricted && !restrictedReason) back(path, "Укажите основание ограничения");
  const data = {
    identityStatus: pick("identityStatus"),
    documentsStatus: pick("documentsStatus"),
    qualificationStatus: pick("qualificationStatus"),
    restricted,
    restrictedReason: restricted ? restrictedReason : null,
  };
  const profile = await db.translatorProfile.update({ where: { id }, data });
  await audit(ctx.user.id, "profile.verification_changed", { type: "profile", id }, data);
  await notify(profile.userId, "Изменён статус проверки профиля", restricted ? `Профиль ограничен: ${restrictedReason}` : "Статус проверки обновлён.", "/app/profile?tab=qualification");
  back(path, "Сохранено", "ok");
}

export async function reviewQualification(form: FormData) {
  const ctx = await requireAccount("ADMIN");
  const id = str(form, "id");
  const status = str(form, "status") as CheckStatus;
  if (!CHECKS.includes(status)) back("/app/admin/profiles", "Неизвестный статус");
  const q = await db.qualification.update({ where: { id }, data: { status } });
  await audit(ctx.user.id, "profile.verification_changed", { type: "qualification", id }, { status });
  back(`/app/admin/profiles/${q.profileId}`, "Сохранено", "ok");
}

export async function verifyLanguage(form: FormData) {
  const ctx = await requireAccount("ADMIN");
  const id = str(form, "id");
  const verified = str(form, "verified") === "true";
  const l = await db.languagePair.update({ where: { id }, data: { verified } });
  await audit(ctx.user.id, "profile.verification_changed", { type: "language", id }, { verified });
  back(`/app/admin/profiles/${l.profileId}`, "Сохранено", "ok");
}

export async function setUserStatus(form: FormData) {
  const ctx = await requireAccount("ADMIN");
  const id = str(form, "id");
  const block = str(form, "block") === "true";
  if (id === ctx.user.id) back("/app/admin/users", "Нельзя заблокировать собственный аккаунт");
  await db.user.update({ where: { id }, data: { status: block ? "BLOCKED" : "ACTIVE" } });
  if (block) await db.session.deleteMany({ where: { userId: id } });
  await audit(ctx.user.id, block ? "user.blocked" : "user.unblocked", { type: "user", id });
  back("/app/admin/users", block ? "Аккаунт заблокирован, сессии завершены" : "Аккаунт разблокирован", "ok");
}
