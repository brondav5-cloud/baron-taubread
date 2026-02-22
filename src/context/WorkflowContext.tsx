"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { WorkflowTask, WorkflowStep } from "@/types/task";
import { useAuth } from "@/hooks/useAuth";
import {
  getWorkflows as fetchWorkflows,
  insertWorkflow,
  updateWorkflow,
} from "@/lib/supabase/tasks.queries";
import {
  dbWorkflowToWorkflow,
  workflowToDbWorkflow,
} from "@/lib/supabase/tasks.mappers";
import type {
  CreateWorkflowInput,
  WorkflowContextType,
} from "./workflow/workflow.types";

export type {
  CreateWorkflowInput,
  WorkflowContextType,
} from "./workflow/workflow.types";

// ============================================
// CONTEXT
// ============================================

const WorkflowContext = createContext<WorkflowContextType | null>(null);

// ============================================
// HELPERS
// ============================================

const generateStepId = () =>
  `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ============================================
// PROVIDER
// ============================================

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;
  const [workflows, setWorkflows] = useState<WorkflowTask[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (auth.status === "loading") return;
    if (!companyId) {
      setWorkflows([]);
      setIsInitialized(true);
      return;
    }
    let cancelled = false;
    fetchWorkflows(companyId)
      .then((db) => {
        if (!cancelled) setWorkflows(db.map(dbWorkflowToWorkflow));
      })
      .catch(() => {
        if (!cancelled) setWorkflows([]);
      })
      .finally(() => {
        if (!cancelled) setIsInitialized(true);
      });
    return () => {
      cancelled = true;
    };
  }, [auth.status, companyId]);

  // ============================================
  // GETTERS
  // ============================================

  const getWorkflowById = useCallback(
    (id: string) => workflows.find((w) => w.id === id),
    [workflows],
  );

  const getWorkflowsForUser = useCallback(
    (userId: string) =>
      workflows.filter(
        (w) =>
          w.createdBy === userId ||
          w.steps.some((s) => s.assignees.some((a) => a.userId === userId)),
      ),
    [workflows],
  );

  const getActiveStepsForUser = useCallback(
    (userId: string) => {
      const result: { workflow: WorkflowTask; step: WorkflowStep }[] = [];
      workflows.forEach((workflow) => {
        if (workflow.status !== "active") return;
        workflow.steps.forEach((step) => {
          if (
            (step.status === "active" || step.status === "in_progress") &&
            step.assignees.some((a) => a.userId === userId)
          ) {
            result.push({ workflow, step });
          }
        });
      });
      return result;
    },
    [workflows],
  );

  // ============================================
  // ACTIONS
  // ============================================

  const createWorkflow = useCallback(
    (
      input: CreateWorkflowInput,
      createdBy: string,
      createdByName: string,
    ): WorkflowTask => {
      const now = new Date();
      const dueDate = new Date(now);
      const totalDays = input.steps.reduce((sum, s) => sum + s.dueDays, 0);
      dueDate.setDate(dueDate.getDate() + totalDays);

      const steps: WorkflowStep[] = input.steps.map((s, index) => ({
        id: generateStepId(),
        order: index + 1,
        title: s.title,
        description: s.description,
        categoryId: s.categoryId,
        categoryName: s.categoryName,
        categoryIcon: s.categoryIcon,
        assignees: s.assignees,
        isBlocking: s.isBlocking,
        status: index === 0 ? "active" : "pending",
        dueDate: (() => {
          const stepDue = new Date(now);
          const daysUntilStep = input.steps
            .slice(0, index + 1)
            .reduce((sum, st) => sum + st.dueDays, 0);
          stepDue.setDate(stepDue.getDate() + daysUntilStep);
          return stepDue.toISOString();
        })(),
        checklist: [],
        comments: [],
      }));

      const newWorkflow: WorkflowTask = {
        id: "",
        title: input.title,
        description: input.description,
        createdBy,
        createdByName,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        storeId: input.storeId,
        storeName: input.storeName,
        priority: input.priority,
        steps,
        status: "active",
        dueDate: dueDate.toISOString(),
        comments: [],
        history: [
          {
            id: generateStepId(),
            action: "created",
            userId: createdBy,
            userName: createdByName,
            timestamp: now.toISOString(),
            details: `נוצרה משימה מורכבת עם ${steps.length} שלבים`,
          },
        ],
      };

      if (companyId) {
        const row = workflowToDbWorkflow(newWorkflow, companyId);
        insertWorkflow(row).then(({ data, error }) => {
          if (!error && data) {
            const created = dbWorkflowToWorkflow(data);
            setWorkflows((prev) => [created, ...prev]);
          }
        });
      }
      return { ...newWorkflow, id: `pending_${Date.now()}` };
    },
    [companyId],
  );

  const updateStepStatuses = (steps: WorkflowStep[]): WorkflowStep[] => {
    return steps.map((step, index) => {
      if (step.status === "completed") return step;

      // Check if previous blocking steps are completed
      const previousSteps = steps.slice(0, index);
      const hasUncompletedBlockingStep = previousSteps.some(
        (s) => s.isBlocking && s.status !== "completed",
      );

      if (hasUncompletedBlockingStep) {
        return { ...step, status: "pending" as const };
      }

      // If all previous blocking steps are done, step becomes active
      if (step.status === "pending") {
        return { ...step, status: "active" as const };
      }

      return step;
    });
  };

  const startStep = useCallback(
    (workflowId: string, stepId: string, userId: string, userName: string) => {
      const now = new Date().toISOString();
      setWorkflows((prev) =>
        prev.map((wf) => {
          if (wf.id !== workflowId) return wf;
          const steps = wf.steps.map((step) =>
            step.id === stepId
              ? { ...step, status: "in_progress" as const }
              : step,
          );
          const updated = {
            ...wf,
            steps,
            updatedAt: now,
            history: [
              ...wf.history,
              {
                id: generateStepId(),
                action: "started" as const,
                userId,
                userName,
                timestamp: now,
                details: `התחיל טיפול בשלב`,
              },
            ],
          };
          if (companyId) {
            const u = workflowToDbWorkflow(updated, companyId);
            updateWorkflow(workflowId, {
              steps: u.steps,
              history: u.history,
              updated_at: now,
            });
          }
          return updated;
        }),
      );
    },
    [companyId],
  );

  const completeStep = useCallback(
    (
      workflowId: string,
      stepId: string,
      userId: string,
      userName: string,
      response?: string,
    ) => {
      const now = new Date().toISOString();
      setWorkflows((prev) =>
        prev.map((wf) => {
          if (wf.id !== workflowId) return wf;

          let steps = wf.steps.map((step) =>
            step.id === stepId
              ? {
                  ...step,
                  status: "completed" as const,
                  completedAt: now,
                  completedBy: userId,
                  completedByName: userName,
                  response,
                }
              : step,
          );

          steps = updateStepStatuses(steps);
          const allCompleted = steps.every((s) => s.status === "completed");

          const updated = {
            ...wf,
            steps,
            status: (allCompleted
              ? "awaiting_approval"
              : "active") as WorkflowTask["status"],
            updatedAt: now,
            history: [
              ...wf.history,
              {
                id: generateStepId(),
                action: "done" as const,
                userId,
                userName,
                timestamp: now,
                details: allCompleted
                  ? `השלים שלב אחרון - ממתין לאישור יוצר${response ? `: ${response}` : ""}`
                  : `השלים שלב${response ? `: ${response}` : ""}`,
              },
            ],
          };
          if (companyId) {
            const u = workflowToDbWorkflow(updated, companyId);
            updateWorkflow(workflowId, {
              steps: u.steps,
              status: u.status,
              history: u.history,
              updated_at: now,
            });
          }
          return updated;
        }),
      );
    },
    [companyId],
  );

  // ============================================
  // APPROVAL ACTIONS
  // ============================================

  const approveWorkflow = useCallback(
    (workflowId: string, userId: string, userName: string) => {
      const now = new Date().toISOString();
      setWorkflows((prev) =>
        prev.map((wf) => {
          if (wf.id !== workflowId) return wf;
          if (wf.createdBy !== userId) return wf;

          const updated = {
            ...wf,
            status: "completed" as const,
            approvedAt: now,
            approvedBy: userId,
            approvedByName: userName,
            updatedAt: now,
            history: [
              ...wf.history,
              {
                id: generateStepId(),
                action: "approved" as const,
                userId,
                userName,
                timestamp: now,
                details: "אישר וסגר את המשימה המורכבת",
              },
            ],
          };
          if (companyId) {
            const u = workflowToDbWorkflow(updated, companyId);
            updateWorkflow(workflowId, {
              status: u.status,
              approved_at: u.approved_at,
              approved_by: u.approved_by,
              approved_by_name: u.approved_by_name,
              history: u.history,
              updated_at: now,
            });
          }
          return updated;
        }),
      );
    },
    [companyId],
  );

  const rejectWorkflow = useCallback(
    (workflowId: string, userId: string, userName: string, reason: string) => {
      const now = new Date().toISOString();
      setWorkflows((prev) =>
        prev.map((wf) => {
          if (wf.id !== workflowId) return wf;
          if (wf.createdBy !== userId) return wf;

          const steps = wf.steps.map((step, index) => {
            if (index === wf.steps.length - 1) {
              return { ...step, status: "active" as const };
            }
            return step;
          });

          const updated = {
            ...wf,
            steps,
            status: "active" as const,
            rejectedAt: now,
            rejectedBy: userId,
            rejectedByName: userName,
            rejectionReason: reason,
            updatedAt: now,
            history: [
              ...wf.history,
              {
                id: generateStepId(),
                action: "rejected" as const,
                userId,
                userName,
                timestamp: now,
                details: `דחה: ${reason}`,
              },
            ],
          };
          if (companyId) {
            const u = workflowToDbWorkflow(updated, companyId);
            updateWorkflow(workflowId, {
              steps: u.steps,
              status: u.status,
              rejected_at: now,
              rejected_by: userId,
              rejected_by_name: userName,
              rejection_reason: reason,
              history: u.history,
              updated_at: now,
            });
          }
          return updated;
        }),
      );
    },
    [companyId],
  );

  const getWorkflowsAwaitingApproval = useCallback(
    (userId: string) => {
      return workflows.filter(
        (w) => w.createdBy === userId && w.status === "awaiting_approval",
      );
    },
    [workflows],
  );

  // ============================================
  // STEP CHECKLIST ACTIONS
  // ============================================

  const addChecklistItem = useCallback(
    (workflowId: string, stepId: string, text: string) => {
      const now = new Date().toISOString();
      setWorkflows((prev) =>
        prev.map((wf) => {
          if (wf.id !== workflowId) return wf;
          const steps = wf.steps.map((step) => {
            if (step.id !== stepId) return step;
            const checklist = step.checklist || [];
            return {
              ...step,
              checklist: [
                ...checklist,
                { id: generateStepId(), text, completed: false },
              ],
            };
          });
          const updated = { ...wf, steps, updatedAt: now };
          if (companyId) {
            const u = workflowToDbWorkflow(updated, companyId);
            updateWorkflow(workflowId, { steps: u.steps, updated_at: now });
          }
          return updated;
        }),
      );
    },
    [companyId],
  );

  const toggleChecklistItem = useCallback(
    (
      workflowId: string,
      stepId: string,
      itemId: string,
      userId: string,
      userName: string,
    ) => {
      const now = new Date().toISOString();
      setWorkflows((prev) =>
        prev.map((wf) => {
          if (wf.id !== workflowId) return wf;
          const steps = wf.steps.map((step) => {
            if (step.id !== stepId) return step;
            const checklist = (step.checklist || []).map((item) => {
              if (item.id !== itemId) return item;
              return {
                ...item,
                completed: !item.completed,
                completedAt: !item.completed ? now : undefined,
                completedBy: !item.completed ? userId : undefined,
                completedByName: !item.completed ? userName : undefined,
              };
            });
            return { ...step, checklist };
          });
          const updated = { ...wf, steps, updatedAt: now };
          if (companyId) {
            const u = workflowToDbWorkflow(updated, companyId);
            updateWorkflow(workflowId, { steps: u.steps, updated_at: now });
          }
          return updated;
        }),
      );
    },
    [companyId],
  );

  const removeChecklistItem = useCallback(
    (workflowId: string, stepId: string, itemId: string) => {
      const now = new Date().toISOString();
      setWorkflows((prev) =>
        prev.map((wf) => {
          if (wf.id !== workflowId) return wf;
          const steps = wf.steps.map((step) => {
            if (step.id !== stepId) return step;
            const checklist = (step.checklist || []).filter(
              (item) => item.id !== itemId,
            );
            return { ...step, checklist };
          });
          const updated = { ...wf, steps, updatedAt: now };
          if (companyId) {
            const u = workflowToDbWorkflow(updated, companyId);
            updateWorkflow(workflowId, { steps: u.steps, updated_at: now });
          }
          return updated;
        }),
      );
    },
    [companyId],
  );

  // ============================================
  // STEP COMMENT ACTIONS
  // ============================================

  const addStepComment = useCallback(
    (
      workflowId: string,
      stepId: string,
      userId: string,
      userName: string,
      text: string,
    ) => {
      const now = new Date().toISOString();
      setWorkflows((prev) =>
        prev.map((wf) => {
          if (wf.id !== workflowId) return wf;
          const steps = wf.steps.map((step) => {
            if (step.id !== stepId) return step;
            const comments = step.comments || [];
            return {
              ...step,
              comments: [
                ...comments,
                {
                  id: generateStepId(),
                  userId,
                  userName,
                  text,
                  createdAt: now,
                },
              ],
            };
          });
          const updated = {
            ...wf,
            steps,
            updatedAt: now,
            history: [
              ...wf.history,
              {
                id: generateStepId(),
                action: "comment" as const,
                userId,
                userName,
                timestamp: now,
                details: `הוסיף הערה לשלב`,
              },
            ],
          };
          if (companyId) {
            const u = workflowToDbWorkflow(updated, companyId);
            updateWorkflow(workflowId, {
              steps: u.steps,
              history: u.history,
              updated_at: now,
            });
          }
          return updated;
        }),
      );
    },
    [companyId],
  );

  // ============================================
  // RETURN STEP ACTION
  // ============================================

  const returnStep = useCallback(
    (
      workflowId: string,
      stepId: string,
      userId: string,
      userName: string,
      reason: string,
    ) => {
      const now = new Date().toISOString();
      setWorkflows((prev) =>
        prev.map((wf) => {
          if (wf.id !== workflowId) return wf;
          const stepIndex = wf.steps.findIndex((s) => s.id === stepId);
          if (stepIndex <= 0) return wf;

          const steps = wf.steps.map((step, index) => {
            if (index === stepIndex - 1) {
              return {
                ...step,
                status: "active" as const,
                returnedBy: userId,
                returnedByName: userName,
                returnedAt: now,
                returnReason: reason,
                wasReturned: true,
              };
            }
            if (index === stepIndex) {
              return { ...step, status: "pending" as const };
            }
            return step;
          });

          const updated = {
            ...wf,
            steps,
            status: "active" as const,
            updatedAt: now,
            history: [
              ...wf.history,
              {
                id: generateStepId(),
                action: "rejected" as const,
                userId,
                userName,
                timestamp: now,
                details: `החזיר שלב: ${reason}`,
              },
            ],
          };
          if (companyId) {
            const u = workflowToDbWorkflow(updated, companyId);
            updateWorkflow(workflowId, {
              steps: u.steps,
              status: u.status,
              history: u.history,
              updated_at: now,
            });
          }
          return updated;
        }),
      );
    },
    [companyId],
  );

  // ============================================
  // STEP ASSIGNEE ACTIONS
  // ============================================

  const addStepAssignee = useCallback(
    (
      workflowId: string,
      stepId: string,
      userId: string,
      userName: string,
      byUserId: string,
      byUserName: string,
    ) => {
      const now = new Date().toISOString();
      setWorkflows((prev) =>
        prev.map((wf) => {
          if (wf.id !== workflowId) return wf;
          const steps = wf.steps.map((step) => {
            if (step.id !== stepId) return step;
            if (step.assignees.some((a) => a.userId === userId)) return step;
            return {
              ...step,
              assignees: [...step.assignees, { userId, userName }],
            };
          });
          const updated = {
            ...wf,
            steps,
            updatedAt: now,
            history: [
              ...wf.history,
              {
                id: generateStepId(),
                action: "comment" as const,
                userId: byUserId,
                userName: byUserName,
                timestamp: now,
                details: `הוסיף את ${userName} לשלב`,
              },
            ],
          };
          if (companyId) {
            const u = workflowToDbWorkflow(updated, companyId);
            updateWorkflow(workflowId, {
              steps: u.steps,
              history: u.history,
              updated_at: now,
            });
          }
          return updated;
        }),
      );
    },
    [companyId],
  );

  const removeStepAssignee = useCallback(
    (
      workflowId: string,
      stepId: string,
      userId: string,
      byUserId: string,
      byUserName: string,
    ) => {
      const now = new Date().toISOString();
      setWorkflows((prev) =>
        prev.map((wf) => {
          if (wf.id !== workflowId) return wf;
          const steps = wf.steps.map((step) => {
            if (step.id !== stepId) return step;
            const removedUser = step.assignees.find((a) => a.userId === userId);
            if (!removedUser) return step;
            if (step.assignees.length <= 1) return step;
            return {
              ...step,
              assignees: step.assignees.filter((a) => a.userId !== userId),
            };
          });
          const removedUserName = wf.steps
            .find((s) => s.id === stepId)
            ?.assignees.find((a) => a.userId === userId)?.userName;
          const updated = {
            ...wf,
            steps,
            updatedAt: now,
            history: [
              ...wf.history,
              {
                id: generateStepId(),
                action: "comment" as const,
                userId: byUserId,
                userName: byUserName,
                timestamp: now,
                details: `הסיר את ${removedUserName || "משתמש"} מהשלב`,
              },
            ],
          };
          if (companyId) {
            const u = workflowToDbWorkflow(updated, companyId);
            updateWorkflow(workflowId, {
              steps: u.steps,
              history: u.history,
              updated_at: now,
            });
          }
          return updated;
        }),
      );
    },
    [companyId],
  );

  // ============================================
  // RENDER
  // ============================================

  if (!isInitialized) return null;

  const value: WorkflowContextType = {
    workflows,
    getWorkflowById,
    getWorkflowsForUser,
    createWorkflow,
    startStep,
    completeStep,
    getActiveStepsForUser,
    approveWorkflow,
    rejectWorkflow,
    getWorkflowsAwaitingApproval,
    // צ'קליסט
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
    // הערות
    addStepComment,
    // החזרה
    returnStep,
    // מוקצים
    addStepAssignee,
    removeStepAssignee,
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useWorkflow(): WorkflowContextType {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useWorkflow must be used within WorkflowProvider");
  }
  return context;
}
