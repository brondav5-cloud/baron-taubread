import type { WorkflowTask, WorkflowStep, TaskPriority } from "@/types/task";

export interface CreateWorkflowInput {
  title: string;
  description?: string;
  storeId?: number;
  storeName?: string;
  priority: TaskPriority;
  steps: {
    title: string;
    description?: string;
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    assignees: { userId: string; userName: string }[];
    isBlocking: boolean;
    dueDays: number;
  }[];
}

export interface WorkflowContextType {
  workflows: WorkflowTask[];
  getWorkflowById: (id: string) => WorkflowTask | undefined;
  getWorkflowsForUser: (userId: string) => WorkflowTask[];
  createWorkflow: (
    input: CreateWorkflowInput,
    createdBy: string,
    createdByName: string,
  ) => WorkflowTask;
  startStep: (
    workflowId: string,
    stepId: string,
    userId: string,
    userName: string,
  ) => void;
  completeStep: (
    workflowId: string,
    stepId: string,
    userId: string,
    userName: string,
    response?: string,
  ) => void;
  getActiveStepsForUser: (
    userId: string,
  ) => { workflow: WorkflowTask; step: WorkflowStep }[];
  approveWorkflow: (
    workflowId: string,
    userId: string,
    userName: string,
  ) => void;
  rejectWorkflow: (
    workflowId: string,
    userId: string,
    userName: string,
    reason: string,
  ) => void;
  getWorkflowsAwaitingApproval: (userId: string) => WorkflowTask[];
  addChecklistItem: (workflowId: string, stepId: string, text: string) => void;
  toggleChecklistItem: (
    workflowId: string,
    stepId: string,
    itemId: string,
    userId: string,
    userName: string,
  ) => void;
  removeChecklistItem: (
    workflowId: string,
    stepId: string,
    itemId: string,
  ) => void;
  addStepComment: (
    workflowId: string,
    stepId: string,
    userId: string,
    userName: string,
    text: string,
  ) => void;
  returnStep: (
    workflowId: string,
    stepId: string,
    userId: string,
    userName: string,
    reason: string,
  ) => void;
  addStepAssignee: (
    workflowId: string,
    stepId: string,
    userId: string,
    userName: string,
    byUserId: string,
    byUserName: string,
  ) => void;
  removeStepAssignee: (
    workflowId: string,
    stepId: string,
    userId: string,
    byUserId: string,
    byUserName: string,
  ) => void;
}
