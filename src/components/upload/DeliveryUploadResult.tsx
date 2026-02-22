// ============================================
// DELIVERY UPLOAD RESULT COMPONENT
// ============================================

"use client";

import { CheckCircle, Store, Truck, DollarSign, Clock } from "lucide-react";
import type { DeliveryProcessingResult } from "@/types/deliveries";

interface DeliveryUploadResultProps {
  result: DeliveryProcessingResult;
  serverStats?: {
    deliveriesCount: number;
    storesCount: number;
    totalValue: number;
    processingTimeMs: number;
  };
}

export function DeliveryUploadResult({
  result,
  serverStats,
}: DeliveryUploadResultProps) {
  const { stats } = result;

  const formatNumber = (num: number) => num.toLocaleString("he-IL");
  const formatCurrency = (num: number) =>
    `₪${num.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`;

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle className="w-8 h-8 text-green-500" />
        <div>
          <h3 className="font-bold text-green-900 text-lg">
            העלאה הושלמה בהצלחה!
          </h3>
          <p className="text-green-700 text-sm">נתוני האספקות עודכנו במערכת</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <StatCard
          icon={<Store className="w-5 h-5 text-green-600" />}
          label="חנויות"
          value={formatNumber(stats.storesCount)}
        />
        <StatCard
          icon={<Truck className="w-5 h-5 text-green-600" />}
          label="אספקות"
          value={formatNumber(stats.totalDeliveries)}
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          label="סה״כ ערך"
          value={formatCurrency(stats.totalValue)}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-green-600" />}
          label="זמן עיבוד"
          value={`${(stats.processingTimeMs / 1000).toFixed(1)}s`}
        />
      </div>

      {/* Period Info */}
      {stats.periodStart && stats.periodEnd && (
        <div className="mt-4 p-3 bg-white rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-medium">תקופה:</span>{" "}
            {formatPeriod(stats.periodStart)} - {formatPeriod(stats.periodEnd)}
          </p>
        </div>
      )}

      {/* Processing Details */}
      <div className="mt-4 text-sm text-green-700">
        <p>
          עובדו {formatNumber(stats.rowsProcessed)} שורות
          {stats.rowsFiltered > 0 && (
            <span className="text-green-600">
              {" "}
              (סוננו {formatNumber(stats.rowsFiltered)} שורות עם ערך שלילי)
            </span>
          )}
        </p>
        {serverStats && (
          <p className="mt-1">
            נשמרו {formatNumber(serverStats.deliveriesCount)} רשומות מצומצמות
            בשרת
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-lg p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function formatPeriod(periodKey: string): string {
  if (periodKey.length !== 6) return periodKey;
  const year = periodKey.slice(0, 4);
  const month = parseInt(periodKey.slice(4, 6), 10);
  const monthNames = [
    "",
    "ינו",
    "פבר",
    "מרץ",
    "אפר",
    "מאי",
    "יונ",
    "יול",
    "אוג",
    "ספט",
    "אוק",
    "נוב",
    "דצמ",
  ];
  return `${monthNames[month]} ${year}`;
}
