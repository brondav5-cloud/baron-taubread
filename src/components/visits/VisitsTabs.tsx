"use client";

import { clsx } from "clsx";
import { ClipboardList, Store, Clock } from "lucide-react";

export type VisitsTabType = "visits" | "stores" | "history";

interface VisitsTabsProps {
  activeTab: VisitsTabType;
  onTabChange: (tab: VisitsTabType) => void;
  visitsCount: number;
  storesCount: number;
}

export function VisitsTabs({
  activeTab,
  onTabChange,
  visitsCount,
  storesCount,
}: VisitsTabsProps) {
  return (
    <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
      <button
        onClick={() => onTabChange("visits")}
        className={clsx(
          "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
          activeTab === "visits"
            ? "bg-white text-primary-700 shadow-sm"
            : "text-gray-600 hover:text-gray-900",
        )}
      >
        <ClipboardList className="w-4 h-4" />
        <span>תעודות ביקור</span>
        <span
          className={clsx(
            "px-2 py-0.5 rounded-full text-xs",
            activeTab === "visits" ? "bg-primary-100" : "bg-gray-200",
          )}
        >
          {visitsCount}
        </span>
      </button>
      <button
        onClick={() => onTabChange("stores")}
        className={clsx(
          "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
          activeTab === "stores"
            ? "bg-white text-primary-700 shadow-sm"
            : "text-gray-600 hover:text-gray-900",
        )}
      >
        <Store className="w-4 h-4" />
        <span>חנויות</span>
        <span
          className={clsx(
            "px-2 py-0.5 rounded-full text-xs",
            activeTab === "stores" ? "bg-primary-100" : "bg-gray-200",
          )}
        >
          {storesCount}
        </span>
      </button>
      <button
        onClick={() => onTabChange("history")}
        className={clsx(
          "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
          activeTab === "history"
            ? "bg-white text-primary-700 shadow-sm"
            : "text-gray-600 hover:text-gray-900",
        )}
      >
        <Clock className="w-4 h-4" />
        <span>היסטוריה</span>
      </button>
    </div>
  );
}
