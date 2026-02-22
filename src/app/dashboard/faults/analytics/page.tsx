"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { BarChart3, ArrowRight } from "lucide-react";
import { useFaults, type Fault } from "@/context/FaultsContext";
import {
  DateRangePicker,
  createDateRange,
  type DateRange,
} from "@/components/ui/DateRangePicker";

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

export default function FaultsAnalyticsPage() {
  const { getVisibleFaults, faultTypes, faultStatuses } = useFaults();
  const faults = getVisibleFaults();

  const [dateRange, setDateRange] = useState<DateRange>(() =>
    createDateRange("this_month"),
  );
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");

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
          חזרה לתיקלות
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
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">סה״כ תקלות</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-2xl font-bold text-green-600">{stats.closed}</p>
          <p className="text-sm text-gray-500">נסגרו</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-2xl font-bold text-orange-600">
            {stats.total - stats.closed}
          </p>
          <p className="text-sm text-gray-500">פתוחות</p>
        </div>
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
            <div className="space-y-2">
              {byType.map((t) => (
                <div
                  key={t.typeId}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <span>
                    {t.icon} {t.name}
                  </span>
                  <span className="font-medium">{t.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-4">פילוח לפי סטטוס</h3>
          {byStatus.length === 0 ? (
            <p className="text-gray-500 text-sm">אין נתונים</p>
          ) : (
            <div className="space-y-2">
              {byStatus.map((s) => (
                <div
                  key={s.statusId}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <span>{s.name}</span>
                  <span className="font-medium">{s.count}</span>
                </div>
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
              <div
                key={m.month}
                className="flex flex-col items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl min-w-[80px]"
              >
                <span className="text-sm text-gray-600">{m.label}</span>
                <span className="text-xl font-bold text-gray-900">
                  {m.total}
                </span>
                <span className="text-xs text-green-600">{m.closed} נסגרו</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
