"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Translations" },
  { href: "/admin/suppliers", label: "Suppliers" },
  { href: "/admin/agencies", label: "Customers" },
  { href: "/admin/packages", label: "Packages" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/reservations", label: "Reservations" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/custom-requests", label: "Custom requests" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-5 border-b border-line px-6 py-3 text-sm md:px-12">
      {LINKS.map((link) => {
        const active =
          link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
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
