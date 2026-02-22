"use client";

import { useState, useMemo } from "react";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  Eye,
  Users,
} from "lucide-react";
import { clsx } from "clsx";
import { useWorkflow } from "@/context/WorkflowContext";
import { useUsers } from "@/context/UsersContext";

interface WorkflowsListProps {
  onWorkflowClick: (workflowId: string) => void;
}

export function WorkflowsList({ onWorkflowClick }: WorkflowsListProps) {
  const { workflows } = useWorkflow();
  const { currentUser, allUsers } = useUsers();
  const [showAll, setShowAll] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const isAdmin = currentUser.role === "admin";

  // Filter workflows
  const displayedWorkflows = useMemo(() => {
    let filtered = workflows;

    if (!showAll || !isAdmin) {
      // רק workflows רלוונטיים למשתמש
      filtered = workflows.filter(
        (w) =>
          w.createdBy === currentUser.id ||
          w.steps.some((s) =>
            s.assignees.some((a) => a.userId === currentUser.id),
          ),
      );
    } else if (selectedUserId) {
      // סינון לפי עובד
      filtered = workflows.filter(
        (w) =>
          w.createdBy === selectedUserId ||
          w.steps.some((s) =>
            s.assignees.some((a) => a.userId === selectedUserId),
          ),
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [workflows, showAll, isAdmin, currentUser.id, selectedUserId]);

  return (
    <div>
      {/* Admin Controls */}
      {isAdmin && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-purple-50 rounded-xl">
          <button
            onClick={() => setShowAll(!showAll)}
            className={clsx(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              showAll
                ? "bg-purple-600 text-white"
                : "bg-white border border-purple-200 text-purple-700",
            )}
          >
            <Eye className="w-4 h-4" />
            {showAll ? "מציג הכל" : "הצג הכל"}
          </button>

          {showAll && (
            <>
              <Users className="w-4 h-4 text-purple-600" />
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1 max-w-xs px-3 py-1.5 border border-purple-200 rounded-lg text-sm bg-white"
              >
                <option value="">כל העובדים</option>
                {allUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.avatar} {user.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}

      {/* List */}
      {displayedWorkflows.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>אין משימות מורכבות</p>
          <p className="text-sm mt-1">
            לחץ על כפתור מורכבת ליצירת משימה עם שלבים
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedWorkflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              currentUserId={currentUser.id}
              onClick={() => onWorkflowClick(workflow.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// WORKFLOW CARD
// ============================================

interface WorkflowCardProps {
  workflow: ReturnType<typeof useWorkflow>["workflows"][0];
  currentUserId: string;
  onClick: () => void;
}

function WorkflowCard({ workflow, currentUserId, onClick }: WorkflowCardProps) {
  const completedSteps = workflow.steps.filter(
    (s) => s.status === "completed",
  ).length;
  const totalSteps = workflow.steps.length;
  const progress = Math.round((completedSteps / totalSteps) * 100);
  const isOverdue =
    new Date(workflow.dueDate) < new Date() && workflow.status !== "completed";
  const isAwaitingApproval = workflow.status === "awaiting_approval";
  const isCreator = workflow.createdBy === currentUserId;

  // Find user's active step
  const userActiveStep = workflow.steps.find(
    (s) =>
      (s.status === "active" || s.status === "in_progress") &&
      s.assignees.some((a) => a.userId === currentUserId),
  );

  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-white border rounded-xl p-4 cursor-pointer hover:shadow-md transition-all",
        workflow.status === "completed" && "border-green-200 bg-green-50/30",
        isAwaitingApproval && "border-amber-200 bg-amber-50/30",
        isOverdue && "border-red-200 bg-red-50/30",
        !["completed", "awaiting_approval"].includes(workflow.status) &&
          !isOverdue &&
          "border-gray-200",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Title & Status */}
          <div className="flex items-center gap-2 mb-1">
            {workflow.status === "completed" ? (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : isAwaitingApproval ? (
              <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
            ) : isOverdue ? (
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            ) : (
              <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />
            )}
            <h3 className="font-medium text-gray-900 truncate">
              {workflow.title}
            </h3>
          </div>

          {/* Awaiting Approval Badge */}
          {isAwaitingApproval && isCreator && (
            <div className="mt-1 px-2 py-1 bg-amber-100 rounded-lg inline-flex items-center gap-2">
              <span className="text-sm text-amber-700 font-medium">
                ⏳ ממתין לאישורך
              </span>
            </div>
          )}

          {/* Progress Bar */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className={clsx(
                  "h-full transition-all",
                  workflow.status === "completed"
                    ? "bg-green-500"
                    : isAwaitingApproval
                      ? "bg-amber-500"
                      : "bg-blue-500",
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm text-gray-500 flex-shrink-0">
              {completedSteps}/{totalSteps}
            </span>
          </div>

          {/* User's Active Step */}
          {userActiveStep && (
            <div className="mt-2 px-2 py-1 bg-blue-50 rounded-lg inline-flex items-center gap-2">
              <span className="text-sm">{userActiveStep.categoryIcon}</span>
              <span className="text-sm text-blue-700">
                התור שלך: {userActiveStep.title}
              </span>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>נוצר ע״י {workflow.createdByName}</span>
            {workflow.storeName && <span>📍 {workflow.storeName}</span>}
          </div>
        </div>

        <ChevronLeft className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </div>
    </div>
  );
}
