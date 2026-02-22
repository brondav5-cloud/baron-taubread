"use client";

import { useState } from "react";
import { Store, FileText } from "lucide-react";
import { clsx } from "clsx";
import { DraggablePlanItem } from "./DraggablePlanItem";
import type { PlanItem } from "@/hooks/useWorkPlan";

interface WorkPlanDayCardProps {
  dayName: string;
  dayIndex: number;
  date: Date | undefined;
  items: PlanItem[];
  isToday: boolean;
  isWeekend: boolean;
  draggedItem: PlanItem | null;
  onToggleComplete: (id: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDragStart: (item: PlanItem) => void;
  onDragEnd: () => void;
  onDrop: (day: number, order: number) => void;
  onAddVisit: (dayIndex: number) => void;
  onAddTask: (dayIndex: number) => void;
  formatDate: (date: Date | undefined) => string;
}

export function WorkPlanDayCard({
  dayName,
  dayIndex,
  date,
  items,
  isToday,
  isWeekend,
  draggedItem,
  onToggleComplete,
  onRemove,
  onDuplicate,
  onDragStart,
  onDragEnd,
  onDrop,
  onAddVisit,
  onAddTask,
  formatDate,
}: WorkPlanDayCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(dayIndex, items.length);
  };

  const handleDropAtPosition = (order: number) => {
    onDrop(dayIndex, order);
  };

  return (
    <div
      className={clsx(
        "min-h-[200px] transition-all bg-white rounded-2xl shadow-card",
        isToday && "ring-2 ring-primary-500",
        isWeekend && "bg-gray-50",
        isDragOver && "ring-2 ring-blue-400 bg-blue-50",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="py-2 px-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <p
              className={clsx(
                "font-bold",
                isToday ? "text-primary-600" : "text-gray-900",
              )}
            >
              {dayName}
            </p>
            <p className="text-xs text-gray-500">{formatDate(date)}</p>
          </div>
          {items.length > 0 && (
            <span className="text-xs font-bold text-gray-500">
              {items.length}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-2 space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDropAtPosition(index);
            }}
          >
            <DraggablePlanItem
              item={item}
              onToggleComplete={onToggleComplete}
              onRemove={onRemove}
              onDuplicate={onDuplicate}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              isDragging={draggedItem?.id === item.id}
            />
          </div>
        ))}

        {/* Drop zone at the end */}
        {draggedItem && draggedItem.day !== dayIndex && (
          <div
            className="h-12 border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 text-sm"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleDropAtPosition(items.length);
            }}
          >
            שחרר כאן
          </div>
        )}

        {/* Add buttons - זמין בכל הימים כולל שישי */}
        <div className="flex gap-2">
          <button
            onClick={() => onAddVisit(dayIndex)}
            className="flex-1 p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-primary-400 hover:text-primary-600 transition-colors text-xs flex items-center justify-center gap-1"
          >
            <Store className="w-3 h-3" />
            ביקור
          </button>
          <button
            onClick={() => onAddTask(dayIndex)}
            className="flex-1 p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-colors text-xs flex items-center justify-center gap-1"
          >
            <FileText className="w-3 h-3" />
            משימה
          </button>
        </div>
      </div>
    </div>
  );
}
