import Link from "next/link";
import { requireCtx } from "@/lib/auth";
import { db } from "@/lib/db";
import { NavLink } from "@/components/nav-link";
import { logout } from "../auth-actions";
import { CUSTOMER_ROLES } from "@/lib/dictionaries";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireCtx({ allowMfaSetup: true });
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });

  let items: { href: string; label: string; count?: number }[];
  let roleLabel: string;
  if (user.accountType === "TRANSLATOR") {
    const incoming = await db.engagementRequest.count({
      where: { profile: { userId: user.id }, status: { in: ["SENT", "AWAITING_RESPONSE"] } },
    });
    roleLabel = "Переводчик";
    items = [
      { href: "/app", label: "Рабочий стол" },
      { href: "/app/requests", label: "Запросы", count: incoming },
      { href: "/app/orders", label: "Заказы" },
      { href: "/app/calendar", label: "Календарь" },
      { href: "/app/profile", label: "Мой профиль" },
      { href: "/app/notifications", label: "Уведомления", count: unread },
      { href: "/app/security", label: "Безопасность" },
    ];
  } else if (user.accountType === "CUSTOMER") {
    roleLabel = user.membership ? CUSTOMER_ROLES[user.membership.role] : "Заказчик";
    items = [
      { href: "/app", label: "Рабочий стол" },
      { href: "/app/search", label: "Найти переводчика" },
      { href: "/app/requests", label: "Мои запросы" },
      { href: "/app/calendar", label: "Мероприятия" },
      { href: "/app/notifications", label: "Уведомления", count: unread },
      { href: "/app/security", label: "Безопасность" },
    ];
  } else {
    const pending = await db.membership.count({ where: { status: "PENDING" } });
    roleLabel = "Администратор платформы";
    items = [
      { href: "/app", label: "Рабочий стол" },
      { href: "/app/admin/memberships", label: "Заявки на роль", count: pending },
      { href: "/app/admin/profiles", label: "Проверка профилей" },
      { href: "/app/admin/users", label: "Пользователи" },
      { href: "/app/search", label: "Реестр" },
      { href: "/app/admin/audit", label: "Журнал действий" },
      { href: "/app/notifications", label: "Уведомления", count: unread },
      { href: "/app/security", label: "Безопасность" },
    ];
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/app" className="brand">NewWorld</Link>
        <nav className="nav">
          {items.map((i) => (
            <NavLink key={i.href} href={i.href} count={i.count}>{i.label}</NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div style={{ fontWeight: 600 }}>{user.fullName}</div>
          <div className="muted">{roleLabel}</div>
          <form action={logout} style={{ marginTop: 8 }}>
            <button className="linkbtn" type="submit">Выйти</button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
