"use client";

import {
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Users,
  RotateCcw,
} from "lucide-react";
import { clsx } from "clsx";
import type { WorkflowStep, WorkflowStepStatus } from "@/types/task";

interface WorkflowStepCardProps {
  step: WorkflowStep;
  isCurrentUser: boolean;
  onStart?: () => void;
  onComplete?: (response: string) => void;
}

type StatusConfigType = Record<
  WorkflowStepStatus,
  {
    label: string;
    icon: typeof AlertCircle;
    color: string;
    bg: string;
  }
>;

const STATUS_CONFIG: StatusConfigType = {
  pending: {
    label: "ממתין",
    icon: AlertCircle,
    color: "text-gray-400",
    bg: "bg-gray-100",
  },
  active: {
    label: "מוכן להתחלה",
    icon: ArrowRight,
    color: "text-blue-600",
    bg: "bg-blue-100",
  },
  in_progress: {
    label: "בטיפול",
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-100",
  },
  completed: {
    label: "הושלם",
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-100",
  },
  returned: {
    label: "הוחזר",
    icon: RotateCcw,
    color: "text-red-600",
    bg: "bg-red-100",
  },
};

export function WorkflowStepCard({
  step,
  isCurrentUser,
  onStart,
}: WorkflowStepCardProps) {
  const config = STATUS_CONFIG[step.status];
  const StatusIcon = config.icon;

  return (
    <div
      className={clsx(
        "relative border-2 rounded-xl p-4 transition-all",
        step.status === "pending" && "border-gray-200 opacity-60",
        step.status === "active" && "border-blue-300 bg-blue-50/50",
        step.status === "in_progress" && "border-amber-300 bg-amber-50/50",
        step.status === "completed" && "border-green-300 bg-green-50/50",
        step.status === "returned" && "border-red-300 bg-red-50/50",
      )}
    >
      {/* Step Number & Blocking Badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
              config.bg,
              config.color,
            )}
          >
            {step.order}
          </span>
          {step.isBlocking && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
              🔒 חוסם
            </span>
          )}
        </div>
        <div className={clsx("flex items-center gap-1 text-sm", config.color)}>
          <StatusIcon className="w-4 h-4" />
          {config.label}
        </div>
      </div>

      {/* Category & Title */}
      <div className="mb-2">
        <span className="text-lg ml-2">{step.categoryIcon}</span>
        <span className="font-medium text-gray-900">{step.title}</span>
      </div>

      {step.description && (
        <p className="text-sm text-gray-600 mb-3">{step.description}</p>
      )}

      {/* Assignees */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
        <Users className="w-4 h-4" />
        <span>{step.assignees.map((a) => a.userName).join(", ")}</span>
      </div>

      {/* Completion Info */}
      {step.status === "completed" && step.completedByName && (
        <div className="text-sm text-green-700 bg-green-50 rounded-lg p-2 mb-3">
          ✅ הושלם ע״י {step.completedByName}
          {step.response && (
            <p className="mt-1 text-green-600">{step.response}</p>
          )}
        </div>
      )}

      {/* Actions for current user */}
      {isCurrentUser && step.status === "active" && onStart && (
        <button
          onClick={onStart}
          className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          התחל טיפול
        </button>
      )}
    </div>
  );
}
