"use client";

import Link from "next/link";
import { BarChart3, Package, Receipt, Users, Settings } from "lucide-react";
import { clsx } from "clsx";

// ============================================
// TYPES
// ============================================

export type StoreTabType = "overview" | "products" | "pricing" | "competitors";

interface StoreTabsProps {
  activeTab: StoreTabType;
  onTabChange: (tab: StoreTabType) => void;
}

// ============================================
// CONFIG
// ============================================

const TABS: { id: StoreTabType; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "סקירה", icon: BarChart3 },
  { id: "products", label: "מוצרים", icon: Package },
  { id: "pricing", label: "מחירון", icon: Receipt },
  { id: "competitors", label: "מתחרים", icon: Users },
];

// ============================================
// COMPONENT
// ============================================

export function StoreTabs({ activeTab, onTabChange }: StoreTabsProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-2">
      <div className="flex gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100",
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// PLACEHOLDER FOR UNBUILT TABS
// ============================================

export function TabPlaceholder({
  icon: Icon,
  label,
  settingsPath,
}: {
  icon: React.ElementType;
  label: string;
  settingsPath?: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
      <Icon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
      <p className="font-medium">{label} — בפיתוח</p>
      <p className="text-sm mt-1">טאב זה יהיה זמין בקרוב</p>
      {settingsPath && (
        <Link
          href={settingsPath}
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm text-gray-600 transition-colors"
        >
          <Settings className="w-4 h-4" />
          הגדרות {label}
        </Link>
      )}
    </div>
  );
}
