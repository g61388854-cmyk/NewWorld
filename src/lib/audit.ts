import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { clientIp } from "./auth";

export const AUDIT_LABELS: Record<string, string> = {
  "auth.register": "Регистрация",
  "auth.login": "Вход",
  "auth.login_failed": "Неудачная попытка входа",
  "auth.mfa_failed": "Неверный код второго фактора",
  "auth.logout": "Выход",
  "auth.mfa_enabled": "Включена двухфакторная аутентификация",
  "auth.mfa_disabled": "Отключена двухфакторная аутентификация",
  "auth.sessions_revoked": "Завершены сессии",
  "profile.updated": "Изменён профиль",
  "profile.viewed": "Просмотр профиля переводчика",
  "profile.verification_changed": "Изменён статус проверки профиля",
  "membership.reviewed": "Рассмотрена заявка на роль",
  "membership.revoked": "Отозваны полномочия",
  "user.blocked": "Аккаунт заблокирован",
  "user.unblocked": "Аккаунт разблокирован",
  "request.created": "Создан запрос",
  "request.status_changed": "Изменён статус запроса",
  "request.appointment_noted": "Отмечено процессуальное решение о назначении",
  "request.message": "Сообщение по запросу",
};

export async function audit(
  actorId: string | null,
  action: string,
  object?: { type: string; id: string },
  meta?: Prisma.InputJsonValue,
): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId,
      action,
      objectType: object?.type,
      objectId: object?.id,
      meta,
      ip: await clientIp(),
    },
  });
}

/** Число неудачных попыток входа по адресу за последние 15 минут. */
export async function recentFailedLogins(email: string): Promise<number> {
  return db.auditLog.count({
    where: {
      action: "auth.login_failed",
      objectType: "email",
      objectId: email,
      createdAt: { gt: new Date(Date.now() - 15 * 60_000) },
    },
  });
}
