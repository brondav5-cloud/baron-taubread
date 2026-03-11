"use client";

import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  User,
  Truck,
  Building2,
  FileSpreadsheet,
  ClipboardList,
  FileText,
} from "lucide-react";
import { clsx } from "clsx";
import type { DbStore } from "@/types/supabase";

// ============================================
// STATUS CONFIG
// ============================================

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  עליה_חדה: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    label: "🚀 עליה חדה",
  },
  צמיחה: { bg: "bg-green-100", text: "text-green-700", label: "📈 צמיחה" },
  יציב: { bg: "bg-blue-100", text: "text-blue-700", label: "➡️ יציב" },
  ירידה: { bg: "bg-orange-100", text: "text-orange-700", label: "📉 ירידה" },
  התרסקות: { bg: "bg-red-100", text: "text-red-700", label: "💥 התרסקות" },
  אזעקה: { bg: "bg-red-100", text: "text-red-700", label: "🚨 אזעקה" },
};

function StatusBadge({
  status,
  label,
}: {
  status: string | undefined;
  label: string;
}) {
  if (!status) return null;
  const config = STATUS_CONFIG[status] || {
    bg: "bg-gray-100",
    text: "text-gray-700",
    label: status,
  };
  return (
    <div className="text-center">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <span
        className={clsx(
          "px-3 py-1.5 rounded-full text-sm font-medium",
          config.bg,
          config.text,
        )}
      >
        {config.label}
      </span>
    </div>
  );
}

// ============================================
// PROPS
// ============================================

interface StoreDetailHeaderProps {
  store: DbStore;
  onExportExcel?: () => void;
  onPdfClick?: () => void;
}

// ============================================
// COMPONENT
// ============================================

export function StoreDetailHeader({
  store,
  onExportExcel,
  onPdfClick,
}: StoreDetailHeaderProps) {
  const metrics = store.metrics;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-4">
        {/* Right side - Store info */}
        <div>
          <Link
            href="/dashboard/stores"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לרשימת חנויות
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {store.name}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-gray-600 text-sm">
            {store.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" /> {store.city}
              </span>
            )}
            {store.network && (
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" /> רשת: {store.network}
              </span>
            )}
            {store.agent && (
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" /> סוכן: {store.agent}
              </span>
            )}
            {store.driver && (
              <span className="flex items-center gap-1">
                <Truck className="w-4 h-4" /> נהג: {store.driver}
              </span>
            )}
          </div>
        </div>

        {/* Left side - Status + Excel */}
        <div className="flex items-center gap-4">
          <StatusBadge status={metrics?.status_long} label="מגמה ארוכה" />
          <StatusBadge status={metrics?.status_short} label="מגמה קצרה" />
          <Link
            href={`/dashboard/visits?store=${store.external_id}`}
            className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-medium hover:bg-amber-200 transition-colors"
          >
            <ClipboardList className="w-4 h-4" />3 תעודות ביקור אחרונות
          </Link>
          <button
            onClick={onPdfClick}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
