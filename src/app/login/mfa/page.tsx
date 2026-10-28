import Link from "next/link";
import { redirect } from "next/navigation";
import { getCtx } from "@/lib/auth";
import { verifyMfa, logout } from "../../auth-actions";
import { Flash } from "@/components/ui";

export default async function MfaPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const ctx = await getCtx();
  if (!ctx) redirect("/login");
  if (ctx.session.mfaPassed) redirect("/app");
  return (
    <div className="auth-wrap">
      <Link href="/" className="brand" style={{ padding: "0 0 20px" }}>NewWorld</Link>
      <div className="card">
        <h1>Подтверждение входа</h1>
        <p className="muted">Введите шестизначный код из приложения-аутентификатора.</p>
        <Flash params={params} />
        <form action={verifyMfa}>
          <div className="field">
            <label htmlFor="code">Код</label>
            <input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus />
          </div>
          <button className="btn" type="submit" style={{ width: "100%" }}>Подтвердить</button>
        </form>
        <form action={logout} style={{ marginTop: 12, textAlign: "center" }}>
          <button className="linkbtn small" type="submit">Отменить вход</button>
        </form>
      </div>
    </div>
  );
}
