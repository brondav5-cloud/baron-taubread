"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { WorkflowTask } from "@/types/task";
import { useAuth } from "@/hooks/useAuth";
import {
  getWorkflows as fetchWorkflows,
} from "@/lib/supabase/tasks.queries";
import { dbWorkflowToWorkflow } from "@/lib/supabase/tasks.mappers";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { useWorkflowQueries } from "@/hooks/useWorkflowQueries";
import { useWorkflowMutations } from "@/hooks/useWorkflowMutations";
import type { WorkflowContextType } from "./workflow/workflow.types";

export type {
  CreateWorkflowInput,
  WorkflowContextType,
} from "./workflow/workflow.types";

const WorkflowContext = createContext<WorkflowContextType | null>(null);

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
      .catch((err) => {
        console.error("[WorkflowContext] fetch error:", err);
        if (!cancelled) setWorkflows([]);
      })
      .finally(() => {
        if (!cancelled) setIsInitialized(true);
      });
    return () => { cancelled = true; };
  }, [auth.status, companyId]);

  const refetchWorkflows = useCallback(() => {
    if (!companyId) return;
    fetchWorkflows(companyId)
      .then((db) => setWorkflows(db.map(dbWorkflowToWorkflow)))
      .catch((err) => console.error("[WorkflowContext] realtime refetch error:", err));
  }, [companyId]);

  useRealtimeTable("workflows", companyId, refetchWorkflows);

  const queries = useWorkflowQueries(workflows);
  const mutations = useWorkflowMutations(companyId, setWorkflows);

  if (!isInitialized) return null;

  return (
    <WorkflowContext.Provider value={{ workflows, ...queries, ...mutations }}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow(): WorkflowContextType {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useWorkflow must be used within WorkflowProvider");
  }
  return context;
}
