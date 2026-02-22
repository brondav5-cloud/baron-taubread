"use client";

import Link from "next/link";
import { FileText, ClipboardList } from "lucide-react";

interface DashboardHeaderProps {
  periodSubtitle?: string;
}

export function DashboardHeader({ periodSubtitle }: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">סקירה כללית</h1>
        {periodSubtitle && (
          <p className="text-gray-500 text-sm mt-1">{periodSubtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600">
          <FileText className="w-4 h-4" />
          PDF
        </button>
        <Link
          href="/dashboard/visits/new"
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600"
        >
          <ClipboardList className="w-4 h-4" />+ הוסף ביקור
        </Link>
      </div>
    </div>
  );
}
