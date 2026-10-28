"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ICONS, type IconName } from "@/lib/icons";

export function NavLink({ href, icon, children, count }: { href: string; icon: IconName; children: React.ReactNode; count?: number }) {
  const pathname = usePathname();
  const active = href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
      <span className="ico" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d={ICONS[icon]} />
        </svg>
      </span>
      <span className="lbl">{children}</span>
      {count ? <span className="count">{count}</span> : null}
    </Link>
  );
}
