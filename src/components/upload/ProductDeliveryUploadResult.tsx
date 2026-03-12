"use client";

import { CheckCircle, Package, Store, CalendarDays, TrendingUp, TrendingDown } from "lucide-react";

interface UploadResponse {
  recordsUpserted:  number;
  storesCount:      number;
  productsCount:    number;
  weeksCount:       number;
  periodStart:      string;
  periodEnd:        string;
  totalGrossQty:    number;
  totalReturnsQty:  number;
  processingTimeMs: number;
}

interface Props {
  response: UploadResponse;
}

export function ProductDeliveryUploadResult({ response }: Props) {
  const returnsRate =
    response.totalGrossQty > 0
      ? ((response.totalReturnsQty / response.totalGrossQty) * 100).toFixed(1)
      : "0.0";

  const formatQty = (n: number) =>
    n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(Math.round(n));

  const formatDate = (d: string) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day ?? ""}/${m ?? ""}/${y ?? ""}`;
  };

  return (
    <div className="bg-white border border-purple-200 rounded-xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">ההעלאה הושלמה בהצלחה</h3>
          <p className="text-sm text-gray-500">
            {formatDate(response.periodStart)} — {formatDate(response.periodEnd)}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Store className="w-4 h-4 text-purple-600" />}
          label="חנויות"
          value={response.storesCount.toLocaleString("he-IL")}
          bg="bg-purple-50"
        />
        <StatCard
          icon={<Package className="w-4 h-4 text-blue-600" />}
          label="מוצרים"
          value={response.productsCount.toLocaleString("he-IL")}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<CalendarDays className="w-4 h-4 text-indigo-600" />}
          label="שבועות"
          value={response.weeksCount.toLocaleString("he-IL")}
          bg="bg-indigo-50"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-green-600" />}
          label="רשומות נשמרו"
          value={response.recordsUpserted.toLocaleString("he-IL")}
          bg="bg-green-50"
        />
      </div>

      {/* Quantity summary */}
      <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">כמות ברוטו</p>
          <p className="text-xl font-bold text-gray-900">{formatQty(response.totalGrossQty)}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center gap-1 justify-center">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <p className="text-xs text-gray-500">החזרות</p>
          </div>
          <p className="text-xl font-bold text-red-600">
            {formatQty(response.totalReturnsQty)}
            <span className="text-sm font-normal text-gray-400 mr-1">({returnsRate}%)</span>
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">כמות נטו</p>
          <p className="text-xl font-bold text-green-700">
            {formatQty(response.totalGrossQty - response.totalReturnsQty)}
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-left">
        זמן עיבוד: {(response.processingTimeMs / 1000).toFixed(1)}ש
      </p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-lg p-3 text-center`}>
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
