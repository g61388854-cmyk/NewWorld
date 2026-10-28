import QRCode from "qrcode";
import { requireCtx } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { otpauthUri } from "@/lib/totp";
import { idleTimeoutMinutes, mfaRequired } from "@/lib/policy";
import { formatDateTime } from "@/lib/forms";
import { Flash, PageHead } from "@/components/ui";
import { logout } from "../../auth-actions";
import { confirmMfa, disableMfa, revokeOtherSessions, startMfa } from "./actions";

export default async function SecurityPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const ctx = await requireCtx({ allowMfaSetup: true });
  const { user } = ctx;
  const required = mfaRequired(ctx.facts);
  const sessions = await db.session.findMany({ where: { userId: user.id }, orderBy: { lastSeenAt: "desc" } });

  let qr: string | null = null;
  let secret: string | null = null;
  if (!user.mfaEnabled && user.mfaSecret && sp.step === "confirm") {
    secret = decrypt(user.mfaSecret);
    qr = await QRCode.toDataURL(otpauthUri(secret, user.email, process.env.MFA_ISSUER || "NewWorld"), { margin: 0, width: 184 });
  }

  return (
    <>
      <PageHead title="Безопасность" subtitle="Вход, двухфакторная аутентификация и активные сессии" />
      <Flash params={sp} />
      {required && !user.mfaEnabled && (
        <div className="notice">
          Для текущей роли двухфакторная аутентификация обязательна. Доступ к остальным разделам открывается после
          её настройки.
        </div>
      )}

      <div className="card">
        <h2>Двухфакторная аутентификация</h2>
        {user.mfaEnabled ? (
          <>
            <p><span className="badge good">Включена</span></p>
            {!required && (
              <form action={disableMfa} className="row">
                <input name="code" type="text" inputMode="numeric" maxLength={6} placeholder="Код" required style={{ maxWidth: 140 }} />
                <button className="btn danger" type="submit">Отключить</button>
              </form>
            )}
          </>
        ) : qr && secret ? (
          <div className="row" style={{ alignItems: "flex-start", gap: 24 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR-код для приложения-аутентификатора" className="qr" />
            <div style={{ flex: 1, minWidth: 240 }}>
              <p>Отсканируйте код в приложении-аутентификаторе или введите ключ вручную:</p>
              <p><code>{secret}</code></p>
              <form action={confirmMfa} className="row">
                <input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Код из приложения" required style={{ maxWidth: 200 }} />
                <button className="btn" type="submit">Подтвердить</button>
              </form>
            </div>
          </div>
        ) : (
          <>
            <p className="muted">Вход подтверждается кодом из приложения-аутентификатора (TOTP).</p>
            <form action={startMfa}><button className="btn" type="submit">Настроить</button></form>
          </>
        )}
      </div>

      <div className="card">
        <div className="row between">
          <h2>Активные сессии</h2>
          {sessions.length > 1 && (
            <form action={revokeOtherSessions}><button className="btn secondary small" type="submit">Завершить остальные</button></form>
          )}
        </div>
        <p className="muted small">Сессия завершается автоматически после {idleTimeoutMinutes(ctx.facts)} минут неактивности.</p>
        <ul className="list">
          {sessions.map((s) => (
            <li key={s.id}>
              <div>{s.userAgent ?? "Неизвестное устройство"} {s.id === ctx.session.id && <span className="badge accent">Текущая</span>}</div>
              <div className="muted small">Начата {formatDateTime(s.createdAt)} · последняя активность {formatDateTime(s.lastSeenAt)}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <form action={logout}><button className="btn secondary" type="submit">Выйти из аккаунта</button></form>
      </div>
    </>
  );
}
