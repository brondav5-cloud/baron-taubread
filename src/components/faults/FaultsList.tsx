"use client";

import { useMemo, useState } from "react";
import { useFaults, type Fault } from "@/context/FaultsContext";
import { useAuth } from "@/hooks/useAuth";

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  yellow: "bg-yellow-100 text-yellow-700",
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  gray: "bg-gray-100 text-gray-700",
  purple: "bg-purple-100 text-purple-700",
  pink: "bg-pink-100 text-pink-700",
};

interface FaultsListProps {
  faults: Fault[];
  onFaultClick: (fault: Fault) => void;
}

export function FaultsList({ faults, onFaultClick }: FaultsListProps) {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const { faultStatuses, faultTypes } = useFaults();
  const auth = useAuth();
  const ownCompanyId = auth.status === "authed" ? auth.user.company_id : null;

  const filtered = useMemo(() => {
    let list = faults;
    if (filterStatus !== "all")
      list = list.filter((f) => f.statusId === filterStatus);
    if (filterType !== "all")
      list = list.filter((f) => f.typeId === filterType);
    return list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [faults, filterStatus, filterType]);

  if (faults.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500 rounded-2xl bg-gray-50">
        <p className="font-medium">אין תקלות</p>
        <p className="text-sm mt-1">דווח על תקלה ראשונה למעלה</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
        >
          <option value="all">כל הסטטוסים</option>
          {faultStatuses
            .filter((s) => s.is_active)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
        >
          <option value="all">כל הסוגים</option>
          {faultTypes
            .filter((t) => t.is_active)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.icon} {t.name}
              </option>
            ))}
        </select>
      </div>
      <div className="divide-y divide-gray-100">
        {filtered.map((fault) => (
          <button
            key={fault.id}
            type="button"
            onClick={() => onFaultClick(fault)}
            className="w-full flex items-center gap-4 p-4 text-right hover:bg-gray-50 transition-colors rounded-xl"
          >
            <span className="text-2xl">{fault.typeIcon || "⚠️"}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 truncate">
                  {fault.title}
                </p>
                {ownCompanyId && fault.companyId !== ownCompanyId && (
                  <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                    חברה אחרת
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {fault.reportedByName} → {fault.assignedToName}
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${COLOR_MAP[fault.statusColor ?? "gray"] ?? "bg-gray-100 text-gray-700"}`}
            >
              {fault.statusName}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
