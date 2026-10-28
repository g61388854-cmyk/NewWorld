"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children, count }: { href: string; children: React.ReactNode; count?: number }) {
  const pathname = usePathname();
  const active = href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link href={href} className={active ? "active" : ""}>
      <span>{children}</span>
      {count ? <span className="count">{count}</span> : null}
    </Link>
  );
}
