"use client";

import { useCallback } from "react";
import type { WorkflowTask, WorkflowStep } from "@/types/task";

export function useWorkflowQueries(workflows: WorkflowTask[]) {
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

  const getWorkflowsAwaitingApproval = useCallback(
    (userId: string) => {
      return workflows.filter(
        (w) => w.createdBy === userId && w.status === "awaiting_approval",
      );
    },
    [workflows],
  );

  return {
    getWorkflowById,
    getWorkflowsForUser,
    getActiveStepsForUser,
    getWorkflowsAwaitingApproval,
  };
}
