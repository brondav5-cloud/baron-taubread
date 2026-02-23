"use client";

import Link from "next/link";
import { FileText, ClipboardList } from "lucide-react";

interface DashboardHeaderProps {
  periodSubtitle?: string;
}

export function DashboardHeader({ periodSubtitle }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          סקירה כללית
        </h1>
        {periodSubtitle && (
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            {periodSubtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-red-500 text-white rounded-xl text-xs sm:text-sm font-medium hover:bg-red-600 transition-colors">
          <FileText className="w-4 h-4" />
          <span>PDF</span>
        </button>
        <Link
          href="/dashboard/visits/new"
          className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-green-500 text-white rounded-xl text-xs sm:text-sm font-medium hover:bg-green-600 transition-colors"
        >
          <ClipboardList className="w-4 h-4" />
          <span className="hidden xs:inline">+ הוסף ביקור</span>
          <span className="xs:hidden">+ ביקור</span>
        </Link>
      </div>
    </div>
  );
}
