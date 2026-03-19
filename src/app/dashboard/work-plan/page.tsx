"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Store,
  LayoutList,
  Search,
  X,
} from "lucide-react";
import { clsx } from "clsx";

import { useWorkPlan, DAYS } from "@/hooks/useWorkPlan";
import { useTreatmentContext } from "@/context/TreatmentContext";
import { formatPercent, getMetricColor } from "@/lib/calculations";
import { Card, CardContent, PageHeader } from "@/components/ui";
import {
  WorkPlanDayCard,
  AddTaskModal,
  VisitFrequencyCard,
  DuplicateItemModal,
} from "@/components/work-plan";
import type { PlanItem, PlannedVisit, PlannedTask } from "@/hooks/useWorkPlan";

export default function WorkPlanPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialWeek = searchParams.get("week") ? parseInt(searchParams.get("week")!, 10) : 0;

  const {
    cities,
    agents,
    weekDates,
    itemsByDay,
    availableStores,
    stats,
    weekOffset,
    setWeekOffset,
    selectedCity,
    setSelectedCity,
    selectedAgent,
    setSelectedAgent,
    showAddModal,
    showTaskModal,
    selectedDay,
    draggedItem,
    addVisit,
    addGeneralVisit,
    addVisitFromTreatment,
    addTask,
    removeItem,
    toggleComplete,
    duplicateItem,
    openAddModal,
    closeAddModal,
    openTaskModal,
    closeTaskModal,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    formatDate,
    isToday,
  } = useWorkPlan(initialWeek);

  // Get treatment stores from context
  const { stores: treatmentStores } = useTreatmentContext();

  // State for duplicate modal
  const [duplicatingItem, setDuplicatingItem] = useState<PlanItem | null>(null);

  // State for modal tab
  const [modalTab, setModalTab] = useState<"all" | "treatment" | "general">("all");

  // General visit activity options
  const GENERAL_ACTIVITY_OPTIONS = [
    { value: "team_meeting", label: "ישיבת צוות" },
    { value: "errands", label: "שליחות" },
    { value: "general_task", label: "משימה כללית" },
    { value: "other", label: "אחר" },
  ];
  // Store search inside modal
  const [modalStoreSearch, setModalStoreSearch] = useState<string>("");

  // Filter treatment stores that aren't already planned (only store visits have storeId)
  const plannedStoreIds = useMemo(() => {
    const ids = new Set<number>();
    Object.values(itemsByDay).forEach((items) => {
      items.forEach((item) => {
        if (item.type === "visit" && (item as PlannedVisit).storeId != null) {
          ids.add((item as PlannedVisit).storeId!);
        }
      });
    });
    return ids;
  }, [itemsByDay]);

  const availableTreatmentStores = useMemo(() => {
    return treatmentStores.filter((s) => !plannedStoreIds.has(s.id));
  }, [treatmentStores, plannedStoreIds]);

  const handleDuplicate = (itemId: string) => {
    const allItems = Object.values(itemsByDay).flat();
    const item = allItems.find((i) => i.id === itemId);
    if (item) setDuplicatingItem(item);
  };

  const handleConfirmDuplicate = (targetDay: number) => {
    if (duplicatingItem) {
      duplicateItem(duplicatingItem.id, targetDay);
      setDuplicatingItem(null);
    }
  };

  const getDuplicatingItemName = (): string => {
    if (!duplicatingItem) return "";
    if (duplicatingItem.type === "visit") {
      const v = duplicatingItem as PlannedVisit;
      return v.store
        ? v.store.name
        : `ביקור כללי: ${v.generalActivityLabel ?? "פעילות כללית"}`;
    }
    return (duplicatingItem as PlannedTask).title;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="תכנון עבודה שבועי"
        subtitle={`${stats.visits} ביקורים, ${stats.tasks} משימות`}
        icon={<Calendar className="w-6 h-6 text-blue-500" />}
      />

      {/* Week Navigation */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="font-bold text-gray-900">
                {formatDate(weekDates[0])} - {formatDate(weekDates[5])}
              </p>
              <p className="text-sm text-gray-500">
                {weekOffset === 0
                  ? "השבוע"
                  : weekOffset > 0
                    ? `בעוד ${weekOffset} שבועות`
                    : `לפני ${Math.abs(weekOffset)} שבועות`}
              </p>
            </div>
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Visit Frequency - stores with most visits */}
      <VisitFrequencyCard />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-50 rounded-xl text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-600">סה״כ פריטים</p>
        </div>
        <div className="p-4 bg-red-50 rounded-xl text-center">
          <p className="text-2xl font-bold text-red-700">{stats.high}</p>
          <p className="text-sm text-red-600">דחוף</p>
        </div>
        <div className="p-4 bg-amber-50 rounded-xl text-center">
          <p className="text-2xl font-bold text-amber-700">{stats.medium}</p>
          <p className="text-sm text-amber-600">רגיל</p>
        </div>
        <div className="p-4 bg-green-50 rounded-xl text-center">
          <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
          <p className="text-sm text-green-600">הושלם</p>
        </div>
      </div>

      {/* Drag Instructions */}
      <div className="text-center text-sm text-gray-500">
        💡 גרור פריטים כדי לשנות סדר או להעביר ליום אחר
      </div>

      {/* Weekly Calendar - 6 ימי עבודה ללא שבת */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {DAYS.map((day, dayIndex) => {
          const date = weekDates[dayIndex];
          const dayItems = itemsByDay[dayIndex] || [];
          const isWeekend = dayIndex === 5; // שישי - סוף שבוע

          return (
            <WorkPlanDayCard
              key={dayIndex}
              dayName={day}
              dayIndex={dayIndex}
              date={date}
              items={dayItems}
              isToday={isToday(date)}
              isWeekend={isWeekend}
              draggedItem={draggedItem}
              onToggleComplete={toggleComplete}
              onRemove={removeItem}
              onDuplicate={handleDuplicate}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
              onAddVisit={openAddModal}
              onAddTask={openTaskModal}
              formatDate={formatDate}
            />
          );
        })}
      </div>

      {/* Add Visit Modal */}
      {showAddModal && selectedDay !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-lg">
                הוסף ביקור ליום {DAYS[selectedDay]}
              </h3>
              <button
                onClick={() => {
                  closeAddModal();
                  setModalStoreSearch("");
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Tabs: all stores / treatment / general */}
            <div className="flex border-b">
              <button
                onClick={() => setModalTab("all")}
                className={clsx(
                  "flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1",
                  modalTab === "all"
                    ? "text-primary-600 border-b-2 border-primary-600 bg-primary-50"
                    : "text-gray-500 hover:bg-gray-50",
                )}
              >
                <Store className="w-3.5 h-3.5" />
                כל החנויות ({availableStores.length})
              </button>
              <button
                onClick={() => setModalTab("treatment")}
                className={clsx(
                  "flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1",
                  modalTab === "treatment"
                    ? "text-red-600 border-b-2 border-red-600 bg-red-50"
                    : "text-gray-500 hover:bg-gray-50",
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                בטיפול ({availableTreatmentStores.length})
              </button>
              <button
                onClick={() => setModalTab("general")}
                className={clsx(
                  "flex-1 py-2.5 text-xs font-medium transition-colors flex items-center justify-center gap-1",
                  modalTab === "general"
                    ? "text-primary-600 border-b-2 border-primary-600 bg-primary-50"
                    : "text-gray-500 hover:bg-gray-50",
                )}
              >
                <LayoutList className="w-3.5 h-3.5" />
                כללי
              </button>
            </div>

            {/* Filters for store tabs */}
            {(modalTab === "all" || modalTab === "treatment") && (
              <div className="p-3 border-b bg-gray-50 space-y-2">
                {/* Search by name */}
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={modalStoreSearch}
                    onChange={(e) => setModalStoreSearch(e.target.value)}
                    placeholder="חיפוש חנות לפי שם / עיר / סוכן..."
                    className="w-full pr-8 pl-3 py-1.5 border rounded-lg text-sm"
                  />
                  {modalStoreSearch && (
                    <button
                      type="button"
                      onClick={() => setModalStoreSearch("")}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {/* City / agent dropdowns — only for "all" tab */}
                {modalTab === "all" && (
                  <div className="flex gap-2">
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="flex-1 px-2 py-1.5 border rounded-lg text-sm"
                    >
                      <option value="">כל הערים</option>
                      {cities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="flex-1 px-2 py-1.5 border rounded-lg text-sm"
                    >
                      <option value="">כל הסוכנים</option>
                      {agents.map((agent) => (
                        <option key={agent} value={agent}>
                          {agent}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="overflow-y-auto max-h-96 p-3 space-y-2">
              {modalTab === "general" ? (
                /* ── General visit tab ── */
                <div className="space-y-3 pt-1">
                  <p className="text-sm text-gray-600">בחר את סוג הפעילות הכללית:</p>
                  <p className="text-xs text-gray-400">
                    תועבר לטופס ביקור כדי להוסיף הערות ותמונות
                  </p>
                  {GENERAL_ACTIVITY_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => {
                        if (selectedDay !== null) {
                          // Add to work plan
                          void addGeneralVisit(o.label, selectedDay);
                        }
                        // Navigate to new visit form pre-filled
                        router.push(
                          `/dashboard/visits/new?visitType=general&activity=${encodeURIComponent(o.label)}`,
                        );
                      }}
                      className="w-full p-3 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-xl text-right text-sm font-medium text-primary-800 transition-colors flex items-center justify-between"
                    >
                      <span>{o.label}</span>
                      <span className="text-xs text-primary-500 font-normal">
                        הוסף + צור תעודה ←
                      </span>
                    </button>
                  ))}
                </div>
              ) : modalTab === "all" ? (
                /* ── All stores tab ── */
                (() => {
                  const term = modalStoreSearch.trim().toLowerCase();
                  const filtered = term
                    ? availableStores.filter(
                        (s) =>
                          s.name.toLowerCase().includes(term) ||
                          s.city.toLowerCase().includes(term) ||
                          s.agent.toLowerCase().includes(term),
                      )
                    : availableStores;
                  return filtered.length === 0 ? (
                    <p className="text-center text-gray-500 py-8 text-sm">
                      לא נמצאו חנויות
                    </p>
                  ) : (
                    <>
                      {filtered.map((store) => (
                        <button
                          key={store.id}
                          onClick={() => addVisit(store, selectedDay)}
                          className="w-full p-3 bg-gray-50 rounded-xl flex items-center justify-between hover:bg-gray-100 transition-colors text-right"
                        >
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {store.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {store.city} | {store.agent}
                            </p>
                          </div>
                          <div className="text-left">
                            <p
                              className={clsx(
                                "font-bold text-sm",
                                getMetricColor(store.metric_12v12),
                              )}
                            >
                              {formatPercent(store.metric_12v12)}
                            </p>
                            <p className="text-xs text-gray-400">12v12</p>
                          </div>
                        </button>
                      ))}
                    </>
                  );
                })()
              ) : (
                /* ── Treatment tab ── */
                (() => {
                  const term = modalStoreSearch.trim().toLowerCase();
                  const filtered = term
                    ? availableTreatmentStores.filter(
                        (s) =>
                          s.name.toLowerCase().includes(term) ||
                          s.city.toLowerCase().includes(term) ||
                          s.agent.toLowerCase().includes(term),
                      )
                    : availableTreatmentStores;
                  return filtered.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">
                        {term ? "לא נמצאו חנויות" : "אין חנויות בטיפול זמינות"}
                      </p>
                    </div>
                  ) : (
                    <>
                      {filtered.map((store) => (
                        <button
                          key={store.id}
                          onClick={() => addVisitFromTreatment(store.id, selectedDay)}
                          className="w-full p-3 bg-red-50 rounded-xl flex items-center justify-between hover:bg-red-100 transition-colors text-right border border-red-200"
                        >
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {store.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {store.city} | {store.agent}
                              </p>
                            </div>
                          </div>
                          <div className="text-left">
                            <p
                              className={clsx(
                                "font-bold text-sm",
                                getMetricColor(store.metric_12v12),
                              )}
                            >
                              {formatPercent(store.metric_12v12)}
                            </p>
                            <p className="text-xs text-red-500">בטיפול</p>
                          </div>
                        </button>
                      ))}
                    </>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={showTaskModal}
        selectedDay={selectedDay}
        onClose={closeTaskModal}
        onAdd={addTask}
      />

      {/* Duplicate Item Modal */}
      {duplicatingItem && (
        <DuplicateItemModal
          itemName={getDuplicatingItemName()}
          currentDay={duplicatingItem.day}
          onConfirm={handleConfirmDuplicate}
          onCancel={() => setDuplicatingItem(null)}
        />
      )}
    </div>
  );
}
