"use server";

import { requireCtx } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { decrypt, encrypt } from "@/lib/crypto";
import { generateSecret, verifyTotp } from "@/lib/totp";
import { mfaRequired } from "@/lib/policy";
import { back, str } from "@/lib/forms";

const PATH = "/app/security";

export async function startMfa() {
  const ctx = await requireCtx({ allowMfaSetup: true });
  if (ctx.user.mfaEnabled) back(PATH, "Двухфакторная аутентификация уже включена");
  await db.user.update({ where: { id: ctx.user.id }, data: { mfaSecret: encrypt(generateSecret()) } });
  back(PATH + "?step=confirm", "Отсканируйте QR-код в приложении-аутентификаторе", "ok");
}

export async function confirmMfa(form: FormData) {
  const ctx = await requireCtx({ allowMfaSetup: true });
  if (ctx.user.mfaEnabled || !ctx.user.mfaSecret) back(PATH, "Настройка не начата");
  if (!verifyTotp(decrypt(ctx.user.mfaSecret), str(form, "code"))) back(PATH + "?step=confirm", "Неверный код");
  await db.user.update({ where: { id: ctx.user.id }, data: { mfaEnabled: true } });
  await db.session.update({ where: { id: ctx.session.id }, data: { mfaPassed: true } });
  // Сессии, открытые без второго фактора, завершаются.
  await db.session.deleteMany({ where: { userId: ctx.user.id, id: { not: ctx.session.id } } });
  await audit(ctx.user.id, "auth.mfa_enabled");
  back(PATH, "Двухфакторная аутентификация включена", "ok");
}

export async function disableMfa(form: FormData) {
  const ctx = await requireCtx();
  if (mfaRequired(ctx.facts)) back(PATH, "Для текущей роли двухфакторная аутентификация обязательна");
  if (!ctx.user.mfaEnabled || !ctx.user.mfaSecret) back(PATH, "Двухфакторная аутентификация не включена");
  if (!verifyTotp(decrypt(ctx.user.mfaSecret), str(form, "code"))) back(PATH, "Неверный код");
  await db.user.update({ where: { id: ctx.user.id }, data: { mfaEnabled: false, mfaSecret: null } });
  await audit(ctx.user.id, "auth.mfa_disabled");
  back(PATH, "Двухфакторная аутентификация отключена", "ok");
}

export async function revokeOtherSessions() {
  const ctx = await requireCtx({ allowMfaSetup: true });
  const res = await db.session.deleteMany({ where: { userId: ctx.user.id, id: { not: ctx.session.id } } });
  await audit(ctx.user.id, "auth.sessions_revoked", undefined, { count: res.count });
  back(PATH, "Другие сессии завершены", "ok");
}
