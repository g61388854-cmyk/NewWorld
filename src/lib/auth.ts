import "server-only";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Prisma, Session } from "@prisma/client";
import { db } from "./db";
import { randomToken, sha256 } from "./crypto";
import { idleTimeoutMinutes, mfaRequired, sessionLifetimeHours, type ViewerFacts } from "./policy";

const COOKIE = "nw_session";

const userInclude = {
  membership: { include: { organization: true } },
  profile: { select: { id: true } },
} satisfies Prisma.UserInclude;

export type CurrentUser = Prisma.UserGetPayload<{ include: typeof userInclude }>;

export interface Ctx {
  user: CurrentUser;
  session: Session;
  facts: ViewerFacts;
}

export function factsOf(user: CurrentUser): ViewerFacts {
  const m = user.membership;
  // Подтверждение полномочий с истёкшим сроком не действует до повторной проверки.
  const expired = m?.status === "ACTIVE" && m.expiresAt !== null && m.expiresAt.getTime() < Date.now();
  return {
    accountType: user.accountType,
    role: m?.role ?? null,
    membershipStatus: expired ? "REVOKED" : (m?.status ?? null),
    organizationType: user.membership?.organization?.type ?? null,
  };
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: CurrentUser, mfaPassed: boolean): Promise<void> {
  const token = randomToken();
  const h = await headers();
  const lifetime = sessionLifetimeHours(factsOf(user));
  const expiresAt = new Date(Date.now() + lifetime * 3600_000);
  await db.session.create({
    data: {
      tokenHash: sha256(token),
      userId: user.id,
      mfaPassed,
      userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
      expiresAt,
    },
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(COOKIE);
}

/** Текущая сессия с проверкой срока жизни и тайм-аута неактивности. */
export async function getCtx(): Promise<Ctx | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: userInclude } },
  });
  if (!session) return null;
  const { user, ...rest } = session;
  const facts = factsOf(user);
  const now = Date.now();
  const idleLimit = idleTimeoutMinutes(facts) * 60_000;
  if (session.expiresAt.getTime() < now || now - session.lastSeenAt.getTime() > idleLimit || user.status !== "ACTIVE") {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (now - session.lastSeenAt.getTime() > 60_000) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } });
  }
  return { user, session: rest, facts };
}

/**
 * Доступ к кабинету: требует входа, пройденной второй ступени аутентификации
 * и настроенной MFA там, где она обязательна.
 */
export async function requireCtx(opts: { allowMfaSetup?: boolean } = {}): Promise<Ctx> {
  const ctx = await getCtx();
  if (!ctx) redirect("/login");
  if (ctx.user.mfaEnabled && !ctx.session.mfaPassed) redirect("/login/mfa");
  if (!opts.allowMfaSetup && mfaRequired(ctx.facts) && !ctx.user.mfaEnabled) redirect("/app/security?setup=required");
  return ctx;
}

export async function requireAccount(type: "TRANSLATOR" | "CUSTOMER" | "ADMIN"): Promise<Ctx> {
  const ctx = await requireCtx();
  if (ctx.user.accountType !== type) redirect("/app?error=" + encodeURIComponent("Раздел недоступен для текущей роли"));
  return ctx;
}

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
}
