"use client";

import Link from "next/link";
import { ChevronLeft, FileSpreadsheet } from "lucide-react";
import { MonthSelector, type MonthSelection } from "@/components/ui";
import { exportStoreDetailToExcel } from "@/lib/excelExport";
import type { StoreWithStatus } from "@/types/data";

interface StoreDetailHeaderProps {
  store: StoreWithStatus;
  monthSelection: MonthSelection;
  onMonthSelectionChange: (selection: MonthSelection) => void;
}

export function StoreDetailHeader({
  store,
  monthSelection,
  onMonthSelectionChange,
}: StoreDetailHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/stores"
          className="p-2 hover:bg-gray-100 rounded-xl"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
          <p className="text-gray-500">
            {store.city} • {store.agent}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <MonthSelector
          value={monthSelection}
          onChange={onMonthSelectionChange}
        />
        <button
          onClick={() => exportStoreDetailToExcel(store)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Excel
        </button>
      </div>
    </div>
  );
}
