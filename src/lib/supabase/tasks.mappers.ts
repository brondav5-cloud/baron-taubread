import type {
  DbTask,
  DbWorkflow,
  TaskInsert,
  WorkflowInsert,
} from "@/types/supabase";
import type { Task, WorkflowTask, WorkflowStep } from "@/types/task";

// ============================================
// TASK MAPPERS
// ============================================

export function dbTaskToTask(db: DbTask): Task {
  return {
    id: db.id,
    taskType: db.task_type,
    createdBy: db.created_by,
    createdByName: db.created_by_name,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    assignees: (db.assignees || []) as Task["assignees"],
    visitId: db.visit_id ?? undefined,
    storeId: db.store_id ?? undefined,
    storeName: db.store_name ?? undefined,
    categoryId: db.category_id,
    categoryName: db.category_name,
    categoryIcon: db.category_icon,
    priority: db.priority as Task["priority"],
    title: db.title,
    description: db.description,
    photos: db.photos || [],
    status: db.status as Task["status"],
    checklist: (db.checklist || []) as Task["checklist"],
    comments: (db.comments || []) as Task["comments"],
    history: (db.history || []) as Task["history"],
    handlerResponse: db.handler_response ?? undefined,
    handlerPhotos: db.handler_photos || [],
    handledAt: db.handled_at ?? undefined,
    approvedAt: db.approved_at ?? undefined,
    rejectedAt: db.rejected_at ?? undefined,
    rejectionReason: db.rejection_reason ?? undefined,
    dueDate: db.due_date,
  };
}

export function taskToDbTask(
  task: Omit<Task, "id"> & { id?: string },
  companyId: string,
): TaskInsert {
  return {
    company_id: companyId,
    task_type: task.taskType,
    created_by: task.createdBy,
    created_by_name: task.createdByName,
    visit_id: task.visitId ?? null,
    store_id: task.storeId ?? null,
    store_name: task.storeName ?? null,
    category_id: task.categoryId,
    category_name: task.categoryName,
    category_icon: task.categoryIcon,
    priority: task.priority,
    title: task.title,
    description: task.description,
    photos: task.photos || [],
    status: task.status,
    checklist: task.checklist || [],
    comments: task.comments || [],
    history: task.history || [],
    assignees: task.assignees || [],
    handler_response: task.handlerResponse ?? null,
    handler_photos: task.handlerPhotos || [],
    handled_at: task.handledAt ?? null,
    approved_at: task.approvedAt ?? null,
    rejected_at: task.rejectedAt ?? null,
    rejection_reason: task.rejectionReason ?? null,
    due_date: task.dueDate,
  };
}

// ============================================
// WORKFLOW MAPPERS
// ============================================

export function dbWorkflowToWorkflow(db: DbWorkflow): WorkflowTask {
  return {
    id: db.id,
    title: db.title,
    description: db.description ?? undefined,
    createdBy: db.created_by,
    createdByName: db.created_by_name,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    storeId: db.store_id ?? undefined,
    storeName: db.store_name ?? undefined,
    priority: db.priority as WorkflowTask["priority"],
    steps: (db.steps || []) as WorkflowStep[],
    status: db.status as WorkflowTask["status"],
    dueDate: db.due_date,
    comments: (db.comments || []) as WorkflowTask["comments"],
    history: (db.history || []) as WorkflowTask["history"],
    approvedAt: db.approved_at ?? undefined,
    approvedBy: db.approved_by ?? undefined,
    approvedByName: db.approved_by_name ?? undefined,
    rejectedAt: db.rejected_at ?? undefined,
    rejectedBy: db.rejected_by ?? undefined,
    rejectedByName: db.rejected_by_name ?? undefined,
    rejectionReason: db.rejection_reason ?? undefined,
  };
}

export function workflowToDbWorkflow(
  wf: Omit<WorkflowTask, "id"> & { id?: string },
  companyId: string,
): WorkflowInsert {
  return {
    company_id: companyId,
    title: wf.title,
    description: wf.description ?? null,
    created_by: wf.createdBy,
    created_by_name: wf.createdByName,
    store_id: wf.storeId ?? null,
    store_name: wf.storeName ?? null,
    priority: wf.priority,
    status: wf.status,
    due_date: wf.dueDate,
    steps: wf.steps || [],
    comments: wf.comments || [],
    history: wf.history || [],
    approved_at: wf.approvedAt ?? null,
    approved_by: wf.approvedBy ?? null,
    approved_by_name: wf.approvedByName ?? null,
    rejected_at: wf.rejectedAt ?? null,
    rejected_by: wf.rejectedBy ?? null,
    rejected_by_name: wf.rejectedByName ?? null,
    rejection_reason: wf.rejectionReason ?? null,
  };
}
