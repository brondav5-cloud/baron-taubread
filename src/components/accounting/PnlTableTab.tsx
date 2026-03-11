"use client";

import React, { useState } from "react";
import type { YearlyPnl, DbAccount } from "@/types/accounting";
import type { VirtualGroup } from "@/lib/accountingCalc";
import type { PnlCustomSection } from "@/hooks/useAccountingData";
import type { ViewMode } from "./pnlHelpers";
import PnlYearlyView from "./PnlYearlyView";
import PnlCompareView from "./PnlCompareView";

interface Props {
  yearlyPnl: YearlyPnl | null;
  prevYearlyPnl: YearlyPnl | null;
  customGroups: VirtualGroup[];
  accounts: DbAccount[];
  year: number;
  groupLabels?: Record<string, string>;
  pnlCustomSections?: PnlCustomSection[];
  onGroupClick?: (groupId: string, month?: number) => void;
  onAmountClick?: (accountId: string, month?: number) => void;
  onAccountClick?: (accountId: string) => void;
}

export default function PnlTableTab({
  yearlyPnl, prevYearlyPnl, customGroups, accounts,
  year, groupLabels, pnlCustomSections,
  onGroupClick, onAmountClick, onAccountClick,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("yearly");

  if (!yearlyPnl) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
        <div className="text-5xl">📊</div>
        <p className="text-base font-medium text-gray-500">אין נתונים לשנת {year}</p>
        <p className="text-sm">העלה קובץ כרטסת בטאב &quot;קבצים&quot;</p>
      </div>
    );
  }

  if (viewMode === "compare") {
    return (
      <PnlCompareView
        yearlyPnl={yearlyPnl}
        customGroups={customGroups}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
    );
  }

  return (
    <PnlYearlyView
      yearlyPnl={yearlyPnl}
      prevYearlyPnl={prevYearlyPnl}
      customGroups={customGroups}
      accounts={accounts}
      year={year}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onGroupClick={onGroupClick}
      onAmountClick={onAmountClick}
      onAccountClick={onAccountClick}
      groupLabels={groupLabels}
      pnlCustomSections={pnlCustomSections}
    />
  );
}
