"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { BarChart3, ArrowRight, X } from "lucide-react";
import { useFaults, type Fault } from "@/context/FaultsContext";
import { FaultDetailModal } from "@/components/faults";
import {
  DateRangePicker,
  createDateRange,
  type DateRange,
} from "@/components/ui/DateRangePicker";

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

function getFaultsInRange(faults: Fault[], from: Date, to: Date): Fault[] {
  const fromTime = from.getTime();
  const toTime = to.getTime() + 24 * 60 * 60 * 1000 - 1;
  return faults.filter((f) => {
    const t = new Date(f.createdAt).getTime();
    return t >= fromTime && t <= toTime;
  });
}

function getFaultsForMonth(faults: Fault[], month: string): Fault[] {
  return faults.filter((f) => {
    const d = new Date(f.createdAt);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return m === month;
  });
}

function formatMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

interface DrillDown {
  title: string;
  faults: Fault[];
}

export default function FaultsAnalyticsPage() {
  const { getVisibleFaults, faultTypes, faultStatuses } = useFaults();
  const faults = getVisibleFaults();

  const [dateRange, setDateRange] = useState<DateRange>(() =>
    createDateRange("this_month"),
  );
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);
  const [selectedFaultId, setSelectedFaultId] = useState<string | null>(null);

  const rangeFaults = useMemo(() => {
    let list = getFaultsInRange(faults, dateRange.from, dateRange.to);
    if (filterType) list = list.filter((f) => f.typeId === filterType);
    if (filterStatus) list = list.filter((f) => f.statusId === filterStatus);
    if (filterAssignee)
      list = list.filter((f) => f.assignedTo === filterAssignee);
    return list;
  }, [faults, dateRange, filterType, filterStatus, filterAssignee]);

  const stats = useMemo(() => {
    const total = rangeFaults.length;
    const closed = rangeFaults.filter((f) => {
      const s = faultStatuses.find((st) => st.id === f.statusId);
      return s?.is_final;
    }).length;
    return { total, closed };
  }, [rangeFaults, faultStatuses]);

  const byType = useMemo(() => {
    return faultTypes
      .filter((t) => t.is_active)
      .map((t) => ({
        typeId: t.id,
        name: t.name,
        icon: t.icon,
        count: rangeFaults.filter((f) => f.typeId === t.id).length,
      }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [faultTypes, rangeFaults]);

  const byStatus = useMemo(() => {
    return faultStatuses
      .filter((s) => s.is_active)
      .map((s) => ({
        statusId: s.id,
        name: s.name,
        color: s.color,
        count: rangeFaults.filter((f) => f.statusId === s.id).length,
      }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [faultStatuses, rangeFaults]);

  const baseRangeFaults = useMemo(
    () => getFaultsInRange(faults, dateRange.from, dateRange.to),
    [faults, dateRange],
  );
  const assignees = useMemo(() => {
    const map = new Map<string, string>();
    baseRangeFaults.forEach((f) => map.set(f.assignedTo, f.assignedToName));
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [baseRangeFaults]);

  const trendData = useMemo(() => {
    const months: {
      month: string;
      label: string;
      total: number;
      closed: number;
    }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = formatMonth(date);
      const monthFaults = getFaultsForMonth(faults, month);
      const closed = monthFaults.filter((f) => {
        const s = faultStatuses.find((st) => st.id === f.statusId);
        return s?.is_final;
      }).length;
      months.push({
        month,
        label: date.toLocaleDateString("he-IL", { month: "short" }),
        total: monthFaults.length,
        closed,
      });
    }
    return months;
  }, [faults, faultStatuses]);

  const handleTypeClick = (typeId: string, typeName: string, icon: string) => {
    const list = rangeFaults.filter((f) => f.typeId === typeId);
    setDrillDown({ title: `${icon} ${typeName}`, faults: list });
  };

  const handleStatusClick = (statusId: string, statusName: string) => {
    const list = rangeFaults.filter((f) => f.statusId === statusId);
    setDrillDown({ title: `סטטוס: ${statusName}`, faults: list });
  };

  const handleMonthClick = (month: string, label: string) => {
    const list = getFaultsForMonth(faults, month);
    setDrillDown({ title: `חודש: ${label}`, faults: list });
  };

  const handleTotalClick = () => {
    setDrillDown({ title: "כל התקלות בתקופה", faults: rangeFaults });
  };

  const handleOpenClick = () => {
    const list = rangeFaults.filter((f) => {
      const s = faultStatuses.find((st) => st.id === f.statusId);
      return !s?.is_final;
    });
    setDrillDown({ title: "תקלות פתוחות", faults: list });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-xl">
            <BarChart3 className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ניתוח תקלות</h1>
            <p className="text-gray-500 text-sm">מעקב וניתוח דיווחי תקלות</p>
          </div>
        </div>
        <Link
          href="/dashboard/faults"
          className="flex items-center gap-2 text-primary-600 hover:text-primary-700"
        >
          <ArrowRight className="w-4 h-4" />
          חזרה לתקלות
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">כל הסוגים</option>
          {faultTypes
            .filter((t) => t.is_active)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.icon} {t.name}
              </option>
            ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">כל הסטטוסים</option>
          {faultStatuses
            .filter((s) => s.is_active)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">כל המוקצים</option>
          {assignees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={handleTotalClick}
          className="bg-white rounded-2xl shadow-sm p-4 text-right hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">סה״כ תקלות</p>
          <p className="text-xs text-primary-600 mt-1">לחץ לפירוט ←</p>
        </button>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-2xl font-bold text-green-600">{stats.closed}</p>
          <p className="text-sm text-gray-500">נסגרו</p>
        </div>
        <button
          type="button"
          onClick={handleOpenClick}
          className="bg-white rounded-2xl shadow-sm p-4 text-right hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <p className="text-2xl font-bold text-orange-600">
            {stats.total - stats.closed}
          </p>
          <p className="text-sm text-gray-500">פתוחות</p>
          <p className="text-xs text-primary-600 mt-1">לחץ לפירוט ←</p>
        </button>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-2xl font-bold text-gray-900">
            {stats.total > 0
              ? Math.round((stats.closed / stats.total) * 100)
              : 0}
            %
          </p>
          <p className="text-sm text-gray-500">אחוז סגירה</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-4">פילוח לפי סוג</h3>
          {byType.length === 0 ? (
            <p className="text-gray-500 text-sm">אין נתונים</p>
          ) : (
            <div className="space-y-1">
              {byType.map((t) => (
                <button
                  key={t.typeId}
                  type="button"
                  onClick={() => handleTypeClick(t.typeId, t.name, t.icon)}
                  className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-orange-50 transition-colors text-right border-b border-gray-100 last:border-0"
                >
                  <span className="text-sm">
                    {t.icon} {t.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.count}</span>
                    <span className="text-xs text-primary-500">פירוט</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-4">פילוח לפי סטטוס</h3>
          {byStatus.length === 0 ? (
            <p className="text-gray-500 text-sm">אין נתונים</p>
          ) : (
            <div className="space-y-1">
              {byStatus.map((s) => (
                <button
                  key={s.statusId}
                  type="button"
                  onClick={() => handleStatusClick(s.statusId, s.name)}
                  className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-orange-50 transition-colors text-right border-b border-gray-100 last:border-0"
                >
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${COLOR_MAP[s.color] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {s.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.count}</span>
                    <span className="text-xs text-primary-500">פירוט</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h3 className="font-semibold text-gray-900 mb-4">
          מגמה חודשית (6 חודשים אחרונים)
        </h3>
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {trendData.map((m) => (
              <button
                key={m.month}
                type="button"
                onClick={() => handleMonthClick(m.month, m.label)}
                className="flex flex-col items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-orange-50 transition-colors rounded-xl min-w-[80px] cursor-pointer"
              >
                <span className="text-sm text-gray-600">{m.label}</span>
                <span className="text-xl font-bold text-gray-900">
                  {m.total}
                </span>
                <span className="text-xs text-green-600">{m.closed} נסגרו</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drill-down panel */}
      {drillDown && (
        <div className="bg-white rounded-2xl shadow-sm border border-orange-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">
              {drillDown.title}
              <span className="mr-2 text-sm font-normal text-gray-500">
                ({drillDown.faults.length} תקלות)
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setDrillDown(null)}
              className="p-1.5 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          {drillDown.faults.length === 0 ? (
            <p className="p-4 text-gray-500 text-sm">אין תקלות</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {drillDown.faults.map((fault) => (
                <button
                  key={fault.id}
                  type="button"
                  onClick={() => setSelectedFaultId(fault.id)}
                  className="w-full flex items-center gap-3 p-3 text-right hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xl">{fault.typeIcon || "⚠️"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {fault.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {fault.reportedByName} ·{" "}
                      {new Date(fault.createdAt).toLocaleDateString("he-IL")}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${COLOR_MAP[fault.statusColor ?? "gray"] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {fault.statusName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <FaultDetailModal
        faultId={selectedFaultId}
        onClose={() => setSelectedFaultId(null)}
      />
    </div>
  );
}
