"use client";

import { useState } from "react";
import {
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Users,
  Check,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { clsx } from "clsx";
import { useWorkflow } from "@/context/WorkflowContext";
import { useUsers } from "@/context/UsersContext";
import type { WorkflowStep, WorkflowStepStatus } from "@/types/task";
import { StepChecklist } from "./StepChecklist";
import { StepComments } from "./StepComments";

interface WorkflowDetailModalProps {
  workflowId: string | null;
  onClose: () => void;
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
    label: "מוכן",
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

export function WorkflowDetailModal({
  workflowId,
  onClose,
}: WorkflowDetailModalProps) {
  const {
    startStep,
    completeStep,
    getWorkflowById,
    approveWorkflow,
    rejectWorkflow,
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
    addStepComment,
    returnStep,
  } = useWorkflow();
  const { currentUser } = useUsers();
  const [completingStepId, setCompletingStepId] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [returningStepId, setReturningStepId] = useState<string | null>(null);
  const [returnReasonText, setReturnReasonText] = useState("");

  // Get fresh workflow from context on every render
  const workflow = workflowId ? getWorkflowById(workflowId) : null;

  if (!workflow) return null;

  const completedSteps = workflow.steps.filter(
    (s) => s.status === "completed",
  ).length;
  const progress = Math.round((completedSteps / workflow.steps.length) * 100);
  const isCreator = workflow.createdBy === currentUser.id;
  const isAwaitingApproval = workflow.status === "awaiting_approval";

  const handleStartStep = (stepId: string) => {
    startStep(workflow.id, stepId, currentUser.id, currentUser.name);
  };

  const handleCompleteStep = (stepId: string) => {
    completeStep(
      workflow.id,
      stepId,
      currentUser.id,
      currentUser.name,
      response,
    );
    setCompletingStepId(null);
    setResponse("");
  };

  const isUserAssigned = (step: WorkflowStep) =>
    step.assignees.some((a) => a.userId === currentUser.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 border-b">
          <div
            className={clsx(
              "p-2 rounded-xl",
              workflow.status === "completed"
                ? "bg-green-100"
                : "bg-purple-100",
            )}
          >
            {workflow.status === "completed" ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <Clock className="w-6 h-6 text-purple-600" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900 text-lg">
              {workflow.title}
            </h2>
            <p className="text-sm text-gray-500">
              נוצר ע״י {workflow.createdByName}
              {workflow.storeName && ` • ${workflow.storeName}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 py-3 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">התקדמות</span>
            <span className="text-sm text-gray-500">
              {completedSteps} מתוך {workflow.steps.length}
            </span>
          </div>
          <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={clsx(
                "h-full transition-all duration-500",
                workflow.status === "completed"
                  ? "bg-green-500"
                  : "bg-purple-500",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="relative">
            {/* Connector Line */}
            <div className="absolute right-5 top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-4">
              {workflow.steps.map((step) => {
                const config = STATUS_CONFIG[step.status];
                const StatusIcon = config.icon;
                const canStart =
                  step.status === "active" && isUserAssigned(step);
                const canComplete =
                  step.status === "in_progress" && isUserAssigned(step);
                const isCompleting = completingStepId === step.id;

                return (
                  <div key={step.id} className="relative pr-12">
                    {/* Step Number Circle */}
                    <div
                      className={clsx(
                        "absolute right-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold z-10",
                        config.bg,
                        config.color,
                      )}
                    >
                      {step.status === "completed" ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        step.order
                      )}
                    </div>

                    {/* Step Card */}
                    <div
                      className={clsx(
                        "border-2 rounded-xl p-4 transition-all",
                        step.status === "pending" &&
                          "border-gray-200 opacity-60",
                        step.status === "active" &&
                          "border-blue-300 bg-blue-50/50",
                        step.status === "in_progress" &&
                          "border-amber-300 bg-amber-50/50",
                        step.status === "completed" &&
                          "border-green-300 bg-green-50/50",
                      )}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{step.categoryIcon}</span>
                          <span className="font-medium text-gray-900">
                            {step.title}
                          </span>
                          {step.isBlocking && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                              🔒 חוסם
                            </span>
                          )}
                        </div>
                        <div
                          className={clsx(
                            "flex items-center gap-1 text-sm",
                            config.color,
                          )}
                        >
                          <StatusIcon className="w-4 h-4" />
                          {config.label}
                        </div>
                      </div>

                      {/* Assignees */}
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <Users className="w-4 h-4" />
                        {step.assignees.map((a) => a.userName).join(", ")}
                      </div>

                      {/* Completed Info */}
                      {step.status === "completed" && step.completedByName && (
                        <div className="text-sm text-green-700 bg-green-50 rounded-lg p-2 mb-2">
                          ✅ הושלם ע״י {step.completedByName}
                          {step.response && (
                            <p className="mt-1">{step.response}</p>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      {canStart && (
                        <button
                          onClick={() => handleStartStep(step.id)}
                          className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                        >
                          התחל טיפול
                        </button>
                      )}

                      {canComplete && !isCompleting && (
                        <button
                          onClick={() => setCompletingStepId(step.id)}
                          className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                        >
                          סיים שלב
                        </button>
                      )}

                      {isCompleting && (
                        <div className="space-y-2 mt-2">
                          <textarea
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            placeholder="הערה (אופציונלי)..."
                            className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => setCompletingStepId(null)}
                              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              ביטול
                            </button>
                            <button
                              onClick={() => handleCompleteStep(step.id)}
                              className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                            >
                              <Check className="w-4 h-4" />
                              אישור
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Return Step Button */}
                      {step.status === "completed" &&
                        step.order > 1 &&
                        isUserAssigned(step) &&
                        (returningStepId === step.id ? (
                          <div className="mt-3 space-y-2">
                            <textarea
                              value={returnReasonText}
                              onChange={(e) =>
                                setReturnReasonText(e.target.value)
                              }
                              placeholder="סיבת ההחזרה..."
                              className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => setReturningStepId(null)}
                                className="flex-1 py-1.5 border rounded-lg text-sm"
                              >
                                ביטול
                              </button>
                              <button
                                onClick={() => {
                                  if (returnReasonText.trim()) {
                                    returnStep(
                                      workflow.id,
                                      step.id,
                                      currentUser.id,
                                      currentUser.name,
                                      returnReasonText,
                                    );
                                    setReturningStepId(null);
                                    setReturnReasonText("");
                                  }
                                }}
                                disabled={!returnReasonText.trim()}
                                className="flex-1 py-1.5 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50"
                              >
                                החזר שלב
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReturningStepId(step.id)}
                            className="mt-2 text-xs text-red-600 hover:text-red-700"
                          >
                            ↩️ החזר לשלב קודם
                          </button>
                        ))}

                      {/* Step Checklist */}
                      <StepChecklist
                        items={step.checklist || []}
                        canEdit={
                          isUserAssigned(step) &&
                          (step.status === "active" ||
                            step.status === "in_progress")
                        }
                        onAdd={(text) =>
                          addChecklistItem(workflow.id, step.id, text)
                        }
                        onToggle={(itemId) =>
                          toggleChecklistItem(
                            workflow.id,
                            step.id,
                            itemId,
                            currentUser.id,
                            currentUser.name,
                          )
                        }
                        onRemove={(itemId) =>
                          removeChecklistItem(workflow.id, step.id, itemId)
                        }
                      />

                      {/* Step Comments */}
                      <StepComments
                        comments={step.comments || []}
                        canAdd={isUserAssigned(step) || isCreator}
                        onAdd={(text) =>
                          addStepComment(
                            workflow.id,
                            step.id,
                            currentUser.id,
                            currentUser.name,
                            text,
                          )
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Creator Approval Section */}
        {isAwaitingApproval && isCreator && (
          <div className="border-t p-4 bg-amber-50">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⏳</span>
              <span className="font-medium text-amber-800">
                כל השלבים הושלמו - ממתין לאישורך
              </span>
            </div>
            {showRejectForm ? (
              <div className="space-y-2">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="סיבת הדחייה..."
                  className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRejectForm(false)}
                    className="flex-1 py-2 border rounded-lg text-sm"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={() => {
                      if (rejectReason.trim()) {
                        rejectWorkflow(
                          workflow.id,
                          currentUser.id,
                          currentUser.name,
                          rejectReason,
                        );
                        setShowRejectForm(false);
                        setRejectReason("");
                      }
                    }}
                    disabled={!rejectReason.trim()}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    דחה
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-300 text-red-600 rounded-xl font-medium"
                >
                  <XCircle className="w-4 h-4" />
                  דחה
                </button>
                <button
                  onClick={() => {
                    approveWorkflow(
                      workflow.id,
                      currentUser.id,
                      currentUser.name,
                    );
                    onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl font-medium"
                >
                  <CheckCircle className="w-4 h-4" />
                  אשר וסגור
                </button>
              </div>
            )}
          </div>
        )}

        {/* Completed Status */}
        {workflow.status === "completed" && (
          <div className="border-t p-4 bg-green-50 text-center">
            <span className="text-green-700 font-medium">
              ✅ המשימה הושלמה ואושרה
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
