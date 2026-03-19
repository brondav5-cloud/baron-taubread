"use client";

import Link from "next/link";
import {
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Image as ImageIcon,
  ChevronLeft,
  Users,
} from "lucide-react";
import { clsx } from "clsx";
import type { Visit } from "@/context/VisitsContext";

interface VisitCardProps {
  visit: Visit;
  onViewDetails: (visit: Visit) => void;
}

export function VisitCard({ visit, onViewDetails }: VisitCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("he-IL");
  };

  const isGeneral = visit.visitType === "general";
  const titleLine = isGeneral ? (
    <div className="flex items-center gap-2 mb-2">
      <span className="font-semibold text-primary-600">ביקור כללי</span>
      <span className="text-gray-400">•</span>
      <span className="font-medium text-gray-900">
        {visit.generalActivityLabel ?? "פעילות כללית"}
      </span>
    </div>
  ) : (
    <div className="flex items-center gap-2 mb-2">
      <Link
        href={`/dashboard/stores/${visit.storeId}`}
        className="font-semibold text-gray-900 hover:text-primary-600 transition-colors"
      >
        {visit.storeName}
      </Link>
      <span className="text-gray-400">•</span>
      <span className="text-sm text-gray-500">{visit.storeCity}</span>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-card p-4 hover:shadow-elevated transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {titleLine}

          {visit.notes && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {visit.notes}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-gray-500">
              <Calendar className="w-4 h-4" />
              {formatDate(visit.date)}
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <span>סוכן:</span>
              <span className="font-medium">{visit.agentName}</span>
            </div>
            {visit.photos.length > 0 && (
              <div className="flex items-center gap-1 text-blue-600">
                <ImageIcon className="w-4 h-4" />
                {visit.photos.length} תמונות
              </div>
            )}
            {visit.competitors.length > 0 && (
              <div className="flex items-center gap-1 text-orange-600">
                <Users className="w-4 h-4" />
                {visit.competitors.length} מתחרים
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {visit.syncStatus === "pending" && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              ממתין לסנכרון
            </span>
          )}
          {visit.syncStatus === "failed" && (
            <span className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-red-100 text-red-700">
              <AlertTriangle className="w-3 h-3" /> שגיאת סנכרון
            </span>
          )}
          <span
            className={clsx(
              "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1",
              visit.status === "completed"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700",
            )}
          >
            {visit.status === "completed" ? (
              <>
                <CheckCircle className="w-3 h-3" /> הושלם
              </>
            ) : (
              <>
                <Clock className="w-3 h-3" /> טיוטה
              </>
            )}
          </span>
          <button
            onClick={() => onViewDetails(visit)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="צפה בתעודה"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
