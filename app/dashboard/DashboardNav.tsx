"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Packages" },
  { href: "/dashboard/suppliers", label: "Suppliers" },
  { href: "/dashboard/requests", label: "My requests" },
  { href: "/dashboard/profile", label: "My profile" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-5 border-b border-line px-6 py-3 text-sm md:px-12">
      {LINKS.map((link) => {
        const active =
          link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "font-semibold text-wine"
                : "text-ink/60 transition hover:text-wine"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
