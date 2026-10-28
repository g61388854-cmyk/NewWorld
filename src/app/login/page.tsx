import Link from "next/link";
import { login } from "../auth-actions";
import { Flash } from "@/components/ui";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  return (
    <div className="auth-wrap">
      <Link href="/" className="brand" style={{ padding: "0 0 20px" }}>NewWorld</Link>
      <div className="card">
        <h1>Вход</h1>
        <Flash params={params} />
        <form action={login}>
          <div className="field">
            <label htmlFor="email">Электронная почта</label>
            <input id="email" name="email" type="email" autoComplete="username" required />
          </div>
          <div className="field">
            <label htmlFor="password">Пароль</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="btn" type="submit" style={{ width: "100%" }}>Войти</button>
        </form>
      </div>
      <p className="muted small" style={{ textAlign: "center", marginTop: 16 }}>
        Нет аккаунта? <Link href="/register">Регистрация</Link>
      </p>
    </div>
  );
}
