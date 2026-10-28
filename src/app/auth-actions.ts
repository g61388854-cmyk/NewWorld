"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, getCtx, hashPassword, verifyPassword } from "@/lib/auth";
import { audit, recentFailedLogins } from "@/lib/audit";
import { decrypt } from "@/lib/crypto";
import { verifyTotp } from "@/lib/totp";
import { back, bool, firstIssue, str } from "@/lib/forms";
import { REGIONS } from "@/lib/dictionaries";

const MAX_FAILED = 5;

const baseSchema = z.object({
  fullName: z.string().min(3, "Укажите имя и фамилию").max(120),
  email: z.string().email("Некорректный адрес электронной почты").max(200),
  password: z.string().min(10, "Пароль должен содержать не менее 10 символов").max(200),
});

const customerSchema = z.object({
  role: z.enum(["INVESTIGATOR", "INQUIRER", "COURT", "ADVOCATE", "LAW_ENFORCEMENT", "AGENCY_STAFF"], {
    message: "Выберите роль",
  }),
  claimedOrganization: z.string().min(3, "Укажите организацию").max(300),
  position: z.string().max(200).optional(),
  evidence: z.string().min(5, "Укажите сведения для подтверждения полномочий").max(1000),
});

export async function register(form: FormData) {
  const type = str(form, "accountType");
  const path = `/register?type=${type === "CUSTOMER" ? "customer" : "translator"}`;
  if (!bool(form, "consent")) back(path, "Необходимо согласие на обработку персональных данных");

  const base = baseSchema.safeParse({
    fullName: str(form, "fullName"),
    email: str(form, "email").toLowerCase(),
    password: str(form, "password"),
  });
  if (!base.success) back(path, firstIssue(base.error));
  const { fullName, email, password } = base.data;

  if (await db.user.findUnique({ where: { email } })) back(path, "Пользователь с таким адресом уже зарегистрирован");
  const passwordHash = await hashPassword(password);

  let userId: string;
  if (type === "CUSTOMER") {
    const c = customerSchema.safeParse({
      role: str(form, "role"),
      claimedOrganization: str(form, "claimedOrganization"),
      position: str(form, "position") || undefined,
      evidence: str(form, "evidence"),
    });
    if (!c.success) back(path, firstIssue(c.error));
    const user = await db.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        accountType: "CUSTOMER",
        membership: { create: { ...c.data, status: "PENDING" } },
      },
    });
    userId = user.id;
  } else {
    const region = str(form, "region");
    if (!REGIONS.includes(region)) back(path, "Выберите регион работы");
    const user = await db.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        accountType: "TRANSLATOR",
        profile: { create: { displayName: fullName, region, specializations: [], formats: [], clientTypes: [] } },
      },
    });
    userId = user.id;
  }

  await audit(userId, "auth.register", { type: "user", id: userId }, { accountType: type });
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: { membership: { include: { organization: true } }, profile: { select: { id: true } } },
  });
  await createSession(user, true);
  redirect("/app");
}

export async function login(form: FormData) {
  const email = str(form, "email").toLowerCase();
  const password = str(form, "password");
  if (!email || !password) back("/login", "Введите адрес электронной почты и пароль");

  if ((await recentFailedLogins(email)) >= MAX_FAILED)
    back("/login", "Слишком много неудачных попыток. Повторите вход через 15 минут");

  const user = await db.user.findUnique({
    where: { email },
    include: { membership: { include: { organization: true } }, profile: { select: { id: true } } },
  });
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) {
    await audit(user?.id ?? null, "auth.login_failed", { type: "email", id: email });
    back("/login", "Неверный адрес электронной почты или пароль");
  }
  if (user.status !== "ACTIVE") back("/login", "Аккаунт заблокирован. Обратитесь к администратору платформы");

  await createSession(user, !user.mfaEnabled);
  if (user.mfaEnabled) redirect("/login/mfa");
  await audit(user.id, "auth.login");
  redirect("/app");
}

export async function verifyMfa(form: FormData) {
  const ctx = await getCtx();
  if (!ctx) redirect("/login");
  if (ctx.session.mfaPassed) redirect("/app");
  const { user } = ctx;

  const failures = await db.auditLog.count({
    where: { action: "auth.mfa_failed", actorId: user.id, createdAt: { gt: new Date(Date.now() - 15 * 60_000) } },
  });
  if (failures >= MAX_FAILED) {
    await destroySession();
    back("/login", "Слишком много неверных кодов. Повторите вход через 15 минут");
  }

  const ok = user.mfaSecret ? verifyTotp(decrypt(user.mfaSecret), str(form, "code")) : false;
  if (!ok) {
    await audit(user.id, "auth.mfa_failed");
    back("/login/mfa", "Неверный код");
  }

  // Новая сессия после прохождения второй ступени: прежний токен перестаёт действовать.
  await destroySession();
  await createSession(user, true);
  await audit(user.id, "auth.login", undefined, { mfa: true });
  redirect("/app");
}

export async function logout() {
  const ctx = await getCtx();
  if (ctx) await audit(ctx.user.id, "auth.logout");
  await destroySession();
  redirect("/");
}
