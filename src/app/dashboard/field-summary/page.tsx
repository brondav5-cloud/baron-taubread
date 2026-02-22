"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Search,
  X,
  Store,
  MapPin,
  Filter,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { PageHeader, Card, CardContent } from "@/components/ui";
import { MultiSelect } from "@/components/ui";
import { LoadingState } from "@/components/common";
import {
  useFieldSummary,
  type ActivityFilter,
  type ColumnFilter,
} from "@/hooks/useFieldSummary";
import { useTreatmentContext } from "@/context/TreatmentContext";
import {
  QuickAddToTreatmentModal,
  AddVisitQuickModal,
} from "@/components/field-summary";
import { toast } from "@/providers/ToastProvider";

const ACTIVITY_FILTER_OPTIONS: { value: ActivityFilter; label: string }[] = [
  { value: "all", label: "כל החנויות" },
  { value: "with_actions", label: "עם פעולות בלבד" },
  { value: "no_visit", label: "ללא תעודת ביקור" },
  { value: "no_treatment", label: "ללא טיפול שטח" },
  { value: "inactive_3", label: "ללא פעולה 3+ חודשים" },
  { value: "inactive_4", label: "ללא פעולה 4+ חודשים" },
];

const COLUMN_FILTER_OPTIONS: { value: ColumnFilter; label: string }[] = [
  { value: "all", label: "הכול" },
  { value: "has", label: "עם" },
  { value: "none", label: "ללא" },
];

function DaysSinceCell({ days }: { days: number | null }) {
  if (days === null) {
    return (
      <span className="text-red-600 font-medium" title="מעולם לא ביקר">
        מעולם
      </span>
    );
  }
  const text = days === 0 ? "היום" : days === 1 ? "אתמול" : `לפני ${days} ימים`;
  const colorClass =
    days <= 30
      ? "text-green-600"
      : days <= 90
        ? "text-amber-600"
        : "text-red-600 font-medium";
  return (
    <span
      className={colorClass}
      title={days > 0 ? `${days} ימים מאז הביקור האחרון` : ""}
    >
      {text}
    </span>
  );
}

export default function FieldSummaryPage() {
  const {
    stores,
    isLoading,
    search,
    setSearch,
    filters,
    filterOptions,
    updateFilter,
    clearFilters,
    activeFiltersCount,
    activityFilter,
    setActivityFilter,
    columnFilters,
    setColumnFilters,
    refetch,
  } = useFieldSummary();

  const { addStore: addToTreatment } = useTreatmentContext();

  const [treatmentModalStore, setTreatmentModalStore] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [workPlanModalStore, setWorkPlanModalStore] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const handleAddToTreatment = async (
    storeId: number,
    reason: Parameters<typeof addToTreatment>[1],
    notes: string,
  ) => {
    const ok = await addToTreatment(storeId, reason, notes);
    setTreatmentModalStore(null);
    if (ok) {
      refetch();
      toast.success("החנות נוספה לטיפול");
    } else {
      toast.error("שגיאה בהוספת החנות לטיפול");
    }
  };

  const hasAnyFilter = activeFiltersCount > 0;

  if (isLoading) {
    return (
      <div className="flex justify-center min-h-[400px] items-center">
        <LoadingState message="טוען מסכם פעולות..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="מסכם פעולות"
        subtitle="סקירה מלאה של פעולות שטח לכל החנויות"
        icon={<BarChart3 className="w-6 h-6 text-emerald-500" />}
      />

      <Card>
        {/* Header with title and filters */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Filter className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">
                  טבלת חנויות עם סינונים
                </h3>
                <p className="text-sm text-gray-500">
                  {stores.length} חנויות
                  {hasAnyFilter && ` • מופעלים סינונים`}
                </p>
              </div>
            </div>
            {hasAnyFilter && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl text-sm"
              >
                <X className="w-4 h-4" /> נקה סינונים
              </button>
            )}
          </div>
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש לפי חנות או עיר..."
                className="w-full pr-10 pl-4 py-2.5 border rounded-xl text-sm"
              />
            </div>
            <select
              value={activityFilter}
              onChange={(e) =>
                setActivityFilter(e.target.value as ActivityFilter)
              }
              className="px-3 py-2 border rounded-xl text-sm min-w-[180px]"
            >
              {ACTIVITY_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <MultiSelect
              label="עיר"
              options={filterOptions.cities}
              selected={filters.cities}
              onChange={(v) => updateFilter("cities", v)}
              placeholder="כל הערים"
            />
            <MultiSelect
              label="רשת"
              options={filterOptions.networks}
              selected={filters.networks}
              onChange={(v) => updateFilter("networks", v)}
              placeholder="כל הרשתות"
            />
            <MultiSelect
              label="סוכן"
              options={filterOptions.agents}
              selected={filters.agents}
              onChange={(v) => updateFilter("agents", v)}
              placeholder="כל הסוכנים"
            />
            <MultiSelect
              label="נהג"
              options={filterOptions.drivers}
              selected={filters.drivers}
              onChange={(v) => updateFilter("drivers", v)}
              placeholder="כל הנהגים"
            />
          </div>
        </div>

        {/* Table - always visible */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    חנות
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    עיר
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    <div className="flex flex-col gap-1">
                      <span>ימים מאז ביקור</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    <div className="flex flex-col gap-1">
                      <span>תעודות ביקור</span>
                      <select
                        value={columnFilters.visits}
                        onChange={(e) =>
                          setColumnFilters((f) => ({
                            ...f,
                            visits: e.target.value as ColumnFilter,
                          }))
                        }
                        className="text-xs border rounded px-1 py-0.5 mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {COLUMN_FILTER_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    <div className="flex flex-col gap-1">
                      <span>בטיפול</span>
                      <select
                        value={columnFilters.treatment}
                        onChange={(e) =>
                          setColumnFilters((f) => ({
                            ...f,
                            treatment: e.target.value as ColumnFilter,
                          }))
                        }
                        className="text-xs border rounded px-1 py-0.5 mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {COLUMN_FILTER_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    <div className="flex flex-col gap-1">
                      <span>תכנון ביקורים</span>
                      <select
                        value={columnFilters.workPlanVisits}
                        onChange={(e) =>
                          setColumnFilters((f) => ({
                            ...f,
                            workPlanVisits: e.target.value as ColumnFilter,
                          }))
                        }
                        className="text-xs border rounded px-1 py-0.5 mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {COLUMN_FILTER_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    <div className="flex flex-col gap-1">
                      <span>תכנון משימות</span>
                      <select
                        value={columnFilters.workPlanTasks}
                        onChange={(e) =>
                          setColumnFilters((f) => ({
                            ...f,
                            workPlanTasks: e.target.value as ColumnFilter,
                          }))
                        }
                        className="text-xs border rounded px-1 py-0.5 mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {COLUMN_FILTER_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    מתחרים
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stores.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      <Store className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>לא נמצאו חנויות</p>
                    </td>
                  </tr>
                ) : (
                  stores.map((row) => (
                    <tr key={row.storeId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/stores/${row.storeId}`}
                          className="font-medium text-blue-600 hover:text-blue-800 flex items-center gap-2"
                        >
                          <Store className="w-4 h-4" />
                          {row.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {row.city || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <DaysSinceCell days={row.daysSinceLastVisit} />
                      </td>
                      <td className="px-4 py-3">
                        {row.visitsCount > 0 ? (
                          <Link
                            href={`/dashboard/visits?store=${row.externalId}`}
                            className="font-bold text-amber-600 hover:text-amber-700 hover:underline"
                          >
                            {row.visitsCount}
                          </Link>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.treatmentCount > 0 ? (
                          <Link
                            href="/dashboard/treatment"
                            className="font-bold text-orange-600 hover:text-orange-700 hover:underline"
                          >
                            ✓
                          </Link>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.workPlanVisitsCount > 0 ? (
                          <Link
                            href="/dashboard/work-plan"
                            className="font-bold text-green-600 hover:text-green-700 hover:underline"
                          >
                            {row.workPlanVisitsCount}
                          </Link>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.workPlanTasksCount > 0 ? (
                          <Link
                            href="/dashboard/work-plan"
                            className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            {row.workPlanTasksCount}
                          </Link>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.competitors.length > 0 ? (
                          <span
                            className="text-sm text-gray-700"
                            title={row.competitors.join(", ")}
                          >
                            {row.competitors.slice(0, 3).join(", ")}
                            {row.competitors.length > 3 &&
                              ` +${row.competitors.length - 3}`}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {row.treatmentCount === 0 && (
                            <button
                              onClick={() =>
                                setTreatmentModalStore({
                                  id: row.externalId,
                                  name: row.name,
                                })
                              }
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                              title="הוסף לטיפול"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setWorkPlanModalStore({
                                id: row.externalId,
                                name: row.name,
                              })
                            }
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="הוסף לתכנון עבודה"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {treatmentModalStore && (
        <QuickAddToTreatmentModal
          storeId={treatmentModalStore.id}
          storeName={treatmentModalStore.name}
          onAdd={handleAddToTreatment}
          onClose={() => setTreatmentModalStore(null)}
        />
      )}
      {workPlanModalStore && (
        <AddVisitQuickModal
          storeId={workPlanModalStore.id}
          storeName={workPlanModalStore.name}
          onSuccess={() => {
            refetch();
            setWorkPlanModalStore(null);
          }}
          onClose={() => setWorkPlanModalStore(null)}
        />
      )}
    </div>
  );
}
