"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Store,
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
  const [modalTab, setModalTab] = useState<"all" | "treatment">("all");

  // Filter treatment stores that aren't already planned
  const plannedStoreIds = useMemo(() => {
    const ids = new Set<number>();
    Object.values(itemsByDay).forEach((items) => {
      items.forEach((item) => {
        if (item.type === "visit") {
          ids.add(item.storeId);
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
      return (duplicatingItem as PlannedVisit).store.name;
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
                onClick={closeAddModal}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex border-b">
              <button
                onClick={() => setModalTab("all")}
                className={clsx(
                  "flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                  modalTab === "all"
                    ? "text-primary-600 border-b-2 border-primary-600 bg-primary-50"
                    : "text-gray-500 hover:bg-gray-50",
                )}
              >
                <Store className="w-4 h-4" />
                כל החנויות ({availableStores.length})
              </button>
              <button
                onClick={() => setModalTab("treatment")}
                className={clsx(
                  "flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
                  modalTab === "treatment"
                    ? "text-red-600 border-b-2 border-red-600 bg-red-50"
                    : "text-gray-500 hover:bg-gray-50",
                )}
              >
                <AlertTriangle className="w-4 h-4" />
                בטיפול ({availableTreatmentStores.length})
              </button>
            </div>

            {modalTab === "all" && (
              <div className="p-4 border-b bg-gray-50">
                <div className="flex gap-3">
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
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
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">כל הסוכנים</option>
                    {agents.map((agent) => (
                      <option key={agent} value={agent}>
                        {agent}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="overflow-y-auto max-h-96 p-4 space-y-2">
              {modalTab === "all" ? (
                availableStores.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    אין חנויות זמינות
                  </p>
                ) : (
                  availableStores.map((store) => (
                    <button
                      key={store.id}
                      onClick={() => addVisit(store, selectedDay)}
                      className="w-full p-3 bg-gray-50 rounded-xl flex items-center justify-between hover:bg-gray-100 transition-colors text-right"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {store.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {store.city} | {store.agent}
                        </p>
                      </div>
                      <div className="text-left">
                        <p
                          className={clsx(
                            "font-bold",
                            getMetricColor(store.metric_12v12),
                          )}
                        >
                          {formatPercent(store.metric_12v12)}
                        </p>
                        <p className="text-xs text-gray-500">12v12</p>
                      </div>
                    </button>
                  ))
                )
              ) : availableTreatmentStores.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">אין חנויות בטיפול זמינות</p>
                </div>
              ) : (
                availableTreatmentStores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => {
                      addVisitFromTreatment(store.id, selectedDay);
                    }}
                    className="w-full p-3 bg-red-50 rounded-xl flex items-center justify-between hover:bg-red-100 transition-colors text-right border border-red-200"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <div>
                        <p className="font-medium text-gray-900">
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
                          "font-bold",
                          getMetricColor(store.metric_12v12),
                        )}
                      >
                        {formatPercent(store.metric_12v12)}
                      </p>
                      <p className="text-xs text-red-600">בטיפול</p>
                    </div>
                  </button>
                ))
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
