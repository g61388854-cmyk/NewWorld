import Link from "next/link";
import { requireCtx } from "@/lib/auth";
import { db } from "@/lib/db";
import { NavLink } from "@/components/nav-link";
import { logout } from "../auth-actions";
import { CUSTOMER_ROLES } from "@/lib/dictionaries";
import type { IconName } from "@/lib/icons";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireCtx({ allowMfaSetup: true });
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });

  let items: { href: string; label: string; icon: IconName; count?: number }[];
  let roleLabel: string;
  if (user.accountType === "TRANSLATOR") {
    const incoming = await db.engagementRequest.count({
      where: { profile: { userId: user.id }, status: { in: ["SENT", "AWAITING_RESPONSE"] } },
    });
    roleLabel = "Переводчик";
    items = [
      { href: "/app", label: "Рабочий стол", icon: "home" },
      { href: "/app/requests", label: "Запросы", icon: "inbox", count: incoming },
      { href: "/app/orders", label: "Заказы", icon: "briefcase" },
      { href: "/app/calendar", label: "Календарь", icon: "calendar" },
      { href: "/app/profile", label: "Мой профиль", icon: "user" },
      { href: "/app/notifications", label: "Уведомления", icon: "bell", count: unread },
      { href: "/app/security", label: "Безопасность", icon: "shield" },
    ];
  } else if (user.accountType === "CUSTOMER") {
    roleLabel = user.membership ? CUSTOMER_ROLES[user.membership.role] : "Заказчик";
    items = [
      { href: "/app", label: "Рабочий стол", icon: "home" },
      { href: "/app/search", label: "Найти переводчика", icon: "search" },
      { href: "/app/requests", label: "Мои запросы", icon: "inbox" },
      { href: "/app/calendar", label: "Мероприятия", icon: "calendar" },
      { href: "/app/notifications", label: "Уведомления", icon: "bell", count: unread },
      { href: "/app/security", label: "Безопасность", icon: "shield" },
    ];
  } else {
    const pending = await db.membership.count({ where: { status: "PENDING" } });
    roleLabel = "Администратор платформы";
    items = [
      { href: "/app", label: "Рабочий стол", icon: "home" },
      { href: "/app/admin/memberships", label: "Заявки на роль", icon: "check", count: pending },
      { href: "/app/admin/profiles", label: "Проверка профилей", icon: "idcard" },
      { href: "/app/admin/users", label: "Пользователи", icon: "users" },
      { href: "/app/search", label: "Реестр", icon: "search" },
      { href: "/app/admin/audit", label: "Журнал действий", icon: "list" },
      { href: "/app/notifications", label: "Уведомления", icon: "bell", count: unread },
      { href: "/app/security", label: "Безопасность", icon: "shield" },
    ];
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/app" className="brand">NewWorld</Link>
        <nav className="nav">
          {items.map((i) => (
            <NavLink key={i.href} href={i.href} icon={i.icon} count={i.count}>{i.label}</NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="who">
            <div style={{ fontWeight: 600 }}>{user.fullName}</div>
            <div className="muted">{roleLabel}</div>
          </div>
          <form action={logout}>
            <button className="linkbtn" type="submit">Выйти</button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
