import Link from "next/link";
import { getCtx } from "@/lib/auth";

export default async function Home() {
  const ctx = await getCtx();
  return (
    <>
      <header className="public-top">
        <Link href="/" className="brand">NewWorld</Link>
        <div className="row">
          {ctx ? (
            <Link href="/app" className="btn">Открыть кабинет</Link>
          ) : (
            <>
              <Link href="/login" className="btn secondary">Вход</Link>
              <Link href="/register" className="btn">Регистрация</Link>
            </>
          )}
        </div>
      </header>

      <section className="hero">
        <h1>Реестр переводчиков для юридической сферы</h1>
        <p>
          Поиск специалистов по языку, квалификации, региону и доступности. Согласование участия переводчика
          в следственных действиях, судебных заседаниях и встречах с доверителем.
        </p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link href="/register?type=customer" className="btn large">Найти переводчика</Link>
          <Link href="/register?type=translator" className="btn secondary large">Стать участником реестра</Link>
        </div>
      </section>

      <section className="features">
        <div className="grid-3">
          <div className="card">
            <h3>Профессиональный реестр</h3>
            <p className="muted">
              Языковые пары, специализация, подтверждённая квалификация и календарь доступности каждого специалиста.
            </p>
          </div>
          <div className="card">
            <h3>Запрос на привлечение</h3>
            <p className="muted">
              Для первичного подбора достаточно языковой пары, даты, формата и типа мероприятия. Материалы дела
              не передаются.
            </p>
          </div>
          <div className="card">
            <h3>Разграничение доступа</h3>
            <p className="muted">
              Полномочия заказчиков проверяются, сведения профиля раскрываются в объёме, выбранном переводчиком,
              значимые действия фиксируются в журнале.
            </p>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h3>Правовой статус взаимодействия</h3>
          <p className="muted">
            Подтверждение переводчиком возможности участия не заменяет процессуального решения о назначении
            переводчика (ст. 59 УПК РФ, ст. 162 ГПК РФ, ст. 57 АПК РФ, ст. 52 КАС РФ, ст. 25.10 КоАП РФ). Статус
            проверки профиля на платформе не означает допуска к участию в конкретном процессуальном действии:
            решение принимает уполномоченное лицо.
          </p>
        </div>
      </section>
      <footer className="footer">NewWorld · версия MVP</footer>
    </>
  );
}
