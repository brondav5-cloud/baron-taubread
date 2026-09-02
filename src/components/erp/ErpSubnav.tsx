"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const LINKS = [
  { href: "/dashboard/erp", label: "סקירה", exact: true },
  { href: "/dashboard/erp/revenue", label: "מחזור" },
  { href: "/dashboard/erp/payments", label: "תקבולים" },
  { href: "/dashboard/erp/debts", label: "חובות" },
  { href: "/dashboard/erp/aging", label: "גיול" },
  { href: "/dashboard/erp/activity", label: "פעילות לקוחות" },
  { href: "/dashboard/erp/carteset", label: "כרטסת" },
  { href: "/dashboard/erp/documents", label: "מסמכים" },
];

export function ErpSubnav() {
  const pathname = usePathname();
  return (
    <div className="bg-white rounded-2xl shadow-sm p-2 mb-6">
      <div className="flex gap-2 overflow-x-auto">
        {LINKS.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-primary-500 text-white"
                  : "text-gray-600 hover:bg-gray-100",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
