"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  Settings,
  Receipt,
  Building2,
  Calculator,
  Truck,
  ListTodo,
  AlertTriangle,
  CheckCircle,
  Users,
  XCircle,
  Percent,
} from "lucide-react";
import { clsx } from "clsx";

const TABS = [
  { href: "/dashboard/settings", label: "כללי", icon: Settings, exact: true },
  { href: "/dashboard/settings/users", label: "משתמשים", icon: Users },
  { href: "/dashboard/settings/pricing", label: "מחירון", icon: Receipt },
  { href: "/dashboard/settings/networks", label: "רשתות", icon: Building2 },
  { href: "/dashboard/settings/costs", label: "עלויות", icon: Calculator },
  {
    href: "/dashboard/settings/driver-groups",
    label: "קבוצות נהגים",
    icon: Truck,
  },
  {
    href: "/dashboard/settings/task-categories",
    label: "קטגוריות משימות",
    icon: ListTodo,
  },
  {
    href: "/dashboard/settings/fault-types",
    label: "סוגי תקלות",
    icon: AlertTriangle,
  },
  {
    href: "/dashboard/settings/fault-statuses",
    label: "סטטוסי תקלות",
    icon: CheckCircle,
  },
  {
    href: "/dashboard/settings/exclusions",
    label: "חריגי העלאה",
    icon: XCircle,
  },
  {
    href: "/dashboard/settings/returns-policy",
    label: "נורמת חזרות",
    icon: Percent,
  },
];

const ADMIN_ONLY_TABS = new Set([
  "/dashboard/settings/users",
  "/dashboard/settings/pricing",
  "/dashboard/settings/costs",
  "/dashboard/settings/exclusions",
  "/dashboard/settings/returns-policy",
]);

export function SettingsTabs() {
  const pathname = usePathname();
  const auth = useAuth();
  const role =
    auth.status === "authed"
      ? auth.user.selectedCompanyRole ?? auth.user.role
      : null;
  const isAdmin = role === "admin" || role === "super_admin";

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-2 mb-6">
      <div className="flex gap-2 overflow-x-auto">
        {TABS.filter(
          (tab) => isAdmin || !ADMIN_ONLY_TABS.has(tab.href),
        ).map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href, tab.exact);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
                active
                  ? "bg-primary-500 text-white"
                  : "text-gray-600 hover:bg-gray-100",
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
