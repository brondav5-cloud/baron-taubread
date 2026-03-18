"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Store,
  Package,
  ClipboardList,
  TrendingUp,
  Settings,
  X,
  LogOut,
  ChevronLeft,
  AlertTriangle,
  Bug,
  Calendar,
  GitCompare,
  Target,
  Users,
  Upload,
  BarChart3,
  Table2,
  Wallet,
  FileText,
} from "lucide-react";
import { clsx } from "clsx";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  module?:
    | "dashboard"
    | "stores"
    | "products"
    | "distribution"
    | "tasks"
    | "faults"
    | "treatment"
    | "work_plan"
    | "competitors"
    | "compare"
    | "visits"
    | "profitability"
    | "upload"
    | "settings"
    | "expenses"
    | "meetings";
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: "ראשי",
    items: [
      {
        label: "דשבורד",
        href: "/dashboard",
        icon: LayoutDashboard,
        module: "dashboard",
      },
      {
        label: "חנויות",
        href: "/dashboard/stores",
        icon: Store,
        module: "stores",
      },
      {
        label: "מוצרים",
        href: "/dashboard/products",
        icon: Package,
        module: "products",
      },
      {
        label: "נתוני חלוקה",
        href: "/dashboard/distribution-v2",
        icon: Table2,
        module: "distribution",
      },
    ],
  },
  {
    title: "ניהול שטח",
    items: [
      {
        label: "סיכומי ישיבות",
        href: "/dashboard/meetings",
        icon: FileText,
        module: "meetings",
        badge: "חדש",
        badgeColor: "bg-indigo-100 text-indigo-700",
      },
      {
        label: "מסכם פעולות",
        href: "/dashboard/field-summary",
        icon: BarChart3,
        module: "treatment",
      },
      {
        label: "משימות",
        href: "/dashboard/tasks",
        icon: ClipboardList,
        module: "tasks",
      },
      {
        label: "תקלות",
        href: "/dashboard/faults",
        icon: Bug,
        module: "faults",
      },
      {
        label: "חנויות בטיפול",
        href: "/dashboard/treatment",
        icon: AlertTriangle,
        module: "treatment",
      },
      {
        label: "תכנון עבודה",
        href: "/dashboard/work-plan",
        icon: Calendar,
        module: "work_plan",
      },
      {
        label: "מתחרים",
        href: "/dashboard/competitors",
        icon: Users,
        module: "competitors",
      },
    ],
  },
  {
    title: "ביקורים",
    items: [
      {
        label: "כל הביקורים",
        href: "/dashboard/visits",
        icon: ClipboardList,
        module: "visits",
      },
      {
        label: "הוסף ביקור",
        href: "/dashboard/visits/new",
        icon: Target,
        module: "visits",
      },
    ],
  },
  {
    title: "ניתוחים",
    items: [
      {
        label: "השוואה שבועית",
        href: "/dashboard/weekly",
        icon: BarChart3,
        module: "compare",
        badge: "חדש",
        badgeColor: "bg-purple-100 text-purple-700",
      },
      {
        label: "רווחיות",
        href: "/dashboard/profitability",
        icon: TrendingUp,
        module: "profitability",
      },
      {
        label: "השוואת חנויות",
        href: "/dashboard/compare",
        icon: GitCompare,
        module: "compare",
      },
    ],
  },
  {
    title: "כספים",
    items: [
      {
        label: "הוצאות ורווח/הפסד",
        href: "/dashboard/expenses",
        icon: Wallet,
        module: "expenses",
        badge: "חדש",
        badgeColor: "bg-purple-100 text-purple-700",
      },
    ],
  },
  {
    title: "מערכת",
    items: [
      {
        label: "העלאת נתונים",
        href: "/dashboard/upload",
        icon: Upload,
        module: "upload",
        badge: "חדש",
        badgeColor: "bg-blue-100 text-blue-700",
      },
      {
        label: "הגדרות",
        href: "/dashboard/settings",
        icon: Settings,
        module: "settings",
      },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { canAccess } = usePermissions();
  const auth = useAuth();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };
  const displayName = auth.status === "authed" ? auth.user?.userName : null;
  const displayEmail = auth.status === "authed" ? auth.user?.userEmail : null;

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed top-0 right-0 h-full w-[min(18rem,85vw)] bg-white border-l border-gray-200 z-50",
          "transform transition-transform duration-300 ease-in-out will-change-transform",
          "lg:w-72 lg:translate-x-0 lg:static lg:z-0",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                <span className="text-xl">🥖</span>
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Bakery&apos;s</h1>
                <p className="text-xs text-gray-500">Analytics v7</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {navigation.map((section) => {
              const visibleItems = section.items.filter(
                (item) => !item.module || canAccess(item.module),
              );
              if (visibleItems.length === 0) return null;
              return (
                <div key={section.title}>
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
                    {section.title}
                  </h2>
                  <ul className="space-y-1">
                    {visibleItems.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={clsx(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                            isActive(item.href)
                              ? "bg-primary-100 text-primary-700"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{item.label}</span>
                          {item.badge && (
                            <span
                              className={clsx(
                                "text-[10px] px-1.5 py-0.5 rounded-full font-bold mr-auto",
                                item.badgeColor || "bg-gray-100 text-gray-600",
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                          {isActive(item.href) && !item.badge && (
                            <ChevronLeft className="w-4 h-4 mr-auto" />
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-primary-700">
                  {displayName ? String(displayName).slice(0, 2) : "מנ"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {displayName ?? "משתמש"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {displayEmail ?? "—"}
                </p>
              </div>
              <button
                onClick={() => void handleSignOut()}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="התנתק"
              >
                <LogOut className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
