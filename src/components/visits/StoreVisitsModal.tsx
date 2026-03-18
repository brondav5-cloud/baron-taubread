"use client";

import { useState } from "react";
import Link from "next/link";
import {
  X,
  FileText,
  User,
  CheckCircle,
  Image as ImageIcon,
  ChevronLeft,
  ExternalLink,
  Loader2,
  ClipboardList,
  Plus,
} from "lucide-react";
import { clsx } from "clsx";
import { useStoreVisits } from "@/hooks/useStoreVisits";
import { VisitDetailModal } from "./VisitDetailModal";
import type { Visit } from "@/context/VisitsContext";

interface StoreVisitsModalProps {
  storeExternalId: number;
  storeName: string;
  onClose: () => void;
}

const LIMIT_OPTIONS = [
  { label: "3 אחרונות", value: 3 },
  { label: "10 אחרונות", value: 10 },
  { label: "כל התעודות", value: 200 },
];

function VisitRow({
  visit,
  onClick,
}: {
  visit: Visit;
  onClick: () => void;
}) {
  const formattedDate = new Date(visit.date).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const checkedCount = visit.checklist.filter((c) => c.checked).length;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-right border border-transparent hover:border-gray-200 group"
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
        <FileText className="w-5 h-5 text-amber-600" />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-gray-900 text-sm">{formattedDate}</span>
          <span
            className={clsx(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              visit.status === "completed"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700",
            )}
          >
            {visit.status === "completed" ? "הושלם" : "טיוטה"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {visit.agentName}
          </span>
          {visit.checklist.length > 0 && (
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              {checkedCount}/{visit.checklist.length}
            </span>
          )}
          {visit.photos.length > 0 && (
            <span className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              {visit.photos.length}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ChevronLeft className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-gray-600 transition-colors" />
    </button>
  );
}

export function StoreVisitsModal({
  storeExternalId,
  storeName,
  onClose,
}: StoreVisitsModalProps) {
  const [limit, setLimit] = useState(3);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const { visits, isLoading, error } = useStoreVisits(storeExternalId, limit);

  if (selectedVisit) {
    return (
      <VisitDetailModal
        visit={selectedVisit}
        onClose={() => setSelectedVisit(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-gradient-to-l from-amber-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <ClipboardList className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">תעודות ביקור</h3>
              <p className="text-sm text-gray-500 truncate max-w-[180px]">{storeName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="סגור"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Filter buttons */}
        <div className="px-4 pt-3 pb-2 flex gap-2 border-b">
          {LIMIT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLimit(opt.value)}
              className={clsx(
                "flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                limit === opt.value
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span className="mr-2 text-sm text-gray-500">טוען תעודות...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500 text-sm">{error}</div>
          ) : visits.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">אין תעודות ביקור לחנות זו</p>
            </div>
          ) : (
            <div className="space-y-1">
              {visits.map((visit) => (
                <VisitRow
                  key={visit.id}
                  visit={visit}
                  onClick={() => setSelectedVisit(visit)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center gap-2">
          <Link
            href={`/dashboard/visits/new?store=${storeExternalId}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors flex-1 justify-center"
          >
            <Plus className="w-4 h-4" />
            תעודה חדשה
          </Link>
          <Link
            href={`/dashboard/visits?store=${storeExternalId}`}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-300 transition-colors"
            onClick={onClose}
          >
            <ExternalLink className="w-4 h-4" />
            כל התעודות
          </Link>
        </div>
      </div>
    </div>
  );
}
