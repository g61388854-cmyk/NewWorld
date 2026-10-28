import Link from "next/link";
import { register } from "../auth-actions";
import { Flash, Options } from "@/components/ui";
import { CUSTOMER_ROLES, REGIONS } from "@/lib/dictionaries";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const isCustomer = params.type === "customer";
  return (
    <div className="auth-wrap" style={{ maxWidth: 560 }}>
      <Link href="/" className="brand" style={{ padding: "0 0 20px" }}>NewWorld</Link>
      <div className="card">
        <h1>Регистрация</h1>
        <div className="tabs" style={{ marginTop: 8 }}>
          <Link href="/register?type=translator" className={!isCustomer ? "active" : ""}>Переводчик</Link>
          <Link href="/register?type=customer" className={isCustomer ? "active" : ""}>Заказчик</Link>
        </div>
        <Flash params={params} />
        <form action={register}>
          <input type="hidden" name="accountType" value={isCustomer ? "CUSTOMER" : "TRANSLATOR"} />
          <div className="field">
            <label htmlFor="fullName">Имя и фамилия</label>
            <input id="fullName" name="fullName" type="text" autoComplete="name" required />
          </div>
          <div className="field">
            <label htmlFor="email">Электронная почта</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
            {isCustomer && <div className="hint">Для сотрудников органов и судов рекомендуется служебный адрес.</div>}
          </div>
          <div className="field">
            <label htmlFor="password">Пароль</label>
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
            <div className="hint">Не менее 10 символов.</div>
          </div>

          {isCustomer ? (
            <>
              <div className="field">
                <label htmlFor="role">Роль</label>
                <select id="role" name="role" required defaultValue="">
                  <Options dict={CUSTOMER_ROLES} placeholder="Выберите роль" />
                </select>
              </div>
              <div className="field">
                <label htmlFor="claimedOrganization">Организация</label>
                <input id="claimedOrganization" name="claimedOrganization" type="text" required
                  placeholder="Ведомство, суд, адвокатское образование или бюро" />
              </div>
              <div className="field">
                <label htmlFor="position">Должность</label>
                <input id="position" name="position" type="text" />
              </div>
              <div className="field">
                <label htmlFor="evidence">Сведения для подтверждения полномочий</label>
                <textarea id="evidence" name="evidence" required
                  placeholder="Служебный телефон для обратной связи, регистрационный номер в реестре адвокатов субъекта РФ и т. п." />
                <div className="hint">
                  Выбор роли создаёт заявку. До проверки администратором доступен только просмотр публичной части
                  реестра; направление запросов открывается после подтверждения полномочий. Для государственных
                  органов и судов обязательна двухфакторная аутентификация.
                </div>
              </div>
            </>
          ) : (
            <div className="field">
              <label htmlFor="region">Регион работы</label>
              <select id="region" name="region" required defaultValue="">
                <option value="">Выберите регион</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}

          <label className="check">
            <input type="checkbox" name="consent" required />
            Даю согласие на обработку персональных данных в соответствии с Федеральным законом № 152-ФЗ
          </label>
          <button className="btn" type="submit" style={{ width: "100%", marginTop: 8 }}>Зарегистрироваться</button>
        </form>
      </div>
      <p className="muted small" style={{ textAlign: "center", marginTop: 16 }}>
        Уже есть аккаунт? <Link href="/login">Вход</Link>
      </p>
    </div>
  );
}
