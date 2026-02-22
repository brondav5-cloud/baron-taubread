"use client";

import { Store, Package, Calendar, Clock, FileSpreadsheet } from "lucide-react";
import type { ProcessingResult } from "@/types/supabase";

interface UploadResultProps {
  result: ProcessingResult;
  serverStats?: {
    stores: number;
    products: number;
    processingTimeMs: number;
  };
}

export function UploadResult({ result, serverStats }: UploadResultProps) {
  const { periods, stats, filters } = result;

  // Format period for display
  const formatPeriod = (period: string) => {
    const year = period.slice(0, 4);
    const month = parseInt(period.slice(4), 10);
    const months = [
      "ינואר",
      "פברואר",
      "מרץ",
      "אפריל",
      "מאי",
      "יוני",
      "יולי",
      "אוגוסט",
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
    ];
    return `${months[month - 1]} ${year}`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <FileSpreadsheet className="w-5 h-5 text-green-600" />
        סיכום העלאה
      </h3>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Store className="w-5 h-5" />}
          label="חנויות"
          value={serverStats?.stores || stats.storesCount}
          color="blue"
        />
        <StatCard
          icon={<Package className="w-5 h-5" />}
          label="מוצרים"
          value={serverStats?.products || stats.productsCount}
          color="purple"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="חודשים"
          value={periods.all.length}
          color="green"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="זמן עיבוד"
          value={`${((serverStats?.processingTimeMs || stats.processingTimeMs) / 1000).toFixed(1)}s`}
          color="orange"
        />
      </div>

      {/* Periods */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">תקופה</h4>
        <p className="text-gray-900">
          {formatPeriod(periods.start)} — {formatPeriod(periods.end)}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          שנה נוכחית: {periods.currentYear} | שנה קודמת: {periods.previousYear}
        </p>
      </div>

      {/* Filters summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          ערכים ייחודיים
        </h4>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
            {filters.cities.length} ערים
          </span>
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
            {filters.networks.length} רשתות
          </span>
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
            {filters.drivers.length} נהגים
          </span>
          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
            {filters.agents.length} סוכנים
          </span>
          <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded">
            {filters.categories.length} קטגוריות
          </span>
        </div>
      </div>

      {/* Rows count */}
      <div className="text-sm text-gray-500 text-center">
        עובדו {stats.rowsCount.toLocaleString()} שורות מקובץ המקור
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: "blue" | "purple" | "green" | "orange";
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-600",
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div
        className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-2`}
      >
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
