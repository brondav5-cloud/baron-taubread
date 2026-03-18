"use client";

import type { DistributionV2Kpi } from "../types";

interface DistributionV2KpiBarProps {
  kpi: DistributionV2Kpi | null;
}

function formatNum(n: number): string {
  return n.toLocaleString("he-IL");
}

function formatMoney(n: number): string {
  return `₪${n.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function DistributionV2KpiBar({ kpi }: DistributionV2KpiBarProps) {
  if (!kpi) return null;

  return (
    <div className="bg-gradient-to-r from-primary-50 to-indigo-50 rounded-xl p-4 shadow-sm border">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
        <KpiItem label="שורות" value={formatNum(kpi.totalRows)} />
        <KpiItem label="חנויות" value={formatNum(kpi.storesCount)} />
        <KpiItem label="מוצרים" value={formatNum(kpi.productsCount)} />
        <KpiItem label="כמות" value={formatNum(kpi.totalQuantity)} />
        <KpiItem label="החזרות" value={formatNum(kpi.totalReturns)} />
        <KpiItem label="מכירות" value={formatMoney(kpi.totalSales)} />
      </div>
    </div>
  );
}

function KpiItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}
