"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  ClipboardList,
  Target,
  Menu,
} from "lucide-react";
import { clsx } from "clsx";

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

const navItems = [
  { label: "דשבורד", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "חנויות", href: "/dashboard/stores", icon: Store },
  { label: "ביקור חדש", href: "/dashboard/visits/new", icon: Target },
  { label: "משימות", href: "/dashboard/tasks", icon: ClipboardList },
];

export default function MobileBottomNav({ onMenuClick }: MobileBottomNavProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 lg:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors",
                active
                  ? "text-primary-600"
                  : "text-gray-400 active:text-gray-600",
              )}
            >
              <item.icon
                className={clsx("w-5 h-5", active && "stroke-[2.5]")}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-gray-400 active:text-gray-600 transition-colors"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">תפריט</span>
        </button>
      </div>
    </nav>
  );
}
