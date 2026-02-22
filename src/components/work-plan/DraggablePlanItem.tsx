"use client";

import Link from "next/link";
import {
  MapPin,
  Trash2,
  Check,
  ClipboardList,
  GripVertical,
  FileText,
  Copy,
} from "lucide-react";
import { clsx } from "clsx";
import {
  type PlanItem,
  type PlannedVisit,
  type PlannedTask,
  PRIORITY_COLORS,
} from "@/hooks/useWorkPlan";

interface DraggablePlanItemProps {
  item: PlanItem;
  onToggleComplete: (id: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDragStart: (item: PlanItem) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export function DraggablePlanItem({
  item,
  onToggleComplete,
  onRemove,
  onDuplicate,
  onDragStart,
  onDragEnd,
  isDragging,
}: DraggablePlanItemProps) {
  const isVisit = item.type === "visit";
  const visit = isVisit ? (item as PlannedVisit) : null;
  const task = !isVisit ? (item as PlannedTask) : null;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(item)}
      onDragEnd={onDragEnd}
      className={clsx(
        "p-2 rounded-lg border text-sm cursor-move transition-all",
        PRIORITY_COLORS[item.priority],
        item.completed && "opacity-50",
        isDragging && "opacity-30 scale-95",
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        <div className="mt-0.5 text-current opacity-50 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Checkbox */}
        <button
          onClick={() => onToggleComplete(item.id)}
          className={clsx(
            "w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0",
            item.completed
              ? "bg-green-500 border-green-500 text-white"
              : "border-current opacity-50 hover:opacity-100 bg-white",
          )}
        >
          {item.completed && <Check className="w-3 h-3" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isVisit && visit ? (
            <>
              <Link
                href={`/dashboard/stores/${visit.storeId}`}
                className={clsx(
                  "font-medium hover:underline line-clamp-1",
                  item.completed && "line-through",
                )}
              >
                {visit.store.name}
              </Link>
              <p className="text-xs opacity-75 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {visit.store.city}
              </p>
              <Link
                href={`/dashboard/visits/new?store=${visit.storeId}`}
                className="mt-1 inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ClipboardList className="w-3 h-3" />
                צור ביקור
              </Link>
            </>
          ) : task ? (
            <>
              <p
                className={clsx(
                  "font-medium line-clamp-1",
                  item.completed && "line-through",
                )}
              >
                <FileText className="w-3 h-3 inline ml-1" />
                {task.title}
              </p>
              {task.description && (
                <p className="text-xs opacity-75 line-clamp-1">
                  {task.description}
                </p>
              )}
            </>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onDuplicate(item.id)}
            className="p-1 hover:bg-white/50 rounded opacity-50 hover:opacity-100 transition-opacity"
            title="שכפל ליום אחר"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="p-1 hover:bg-white/50 rounded opacity-50 hover:opacity-100 transition-opacity"
            title="הסר"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
