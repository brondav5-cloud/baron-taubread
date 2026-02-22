"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "./QueryProvider";
import { ToastProvider } from "./ToastProvider";
import { SupabaseAuthProvider } from "@/context/SupabaseAuthContext";
import { AuthProvider } from "@/context/AuthContext";
import { CompanyProvider } from "@/context/CompanyContext";
import { StoresAndProductsProvider } from "@/context/StoresAndProductsContext";
import { VisitsProvider } from "@/context/VisitsContext";
import { TreatmentProvider } from "@/context/TreatmentContext";
import { UsersProvider } from "@/context/UsersContext";
import { TasksProvider } from "@/context/TasksContext";
import { WorkflowProvider } from "@/context/WorkflowContext";
import { FaultsProvider } from "@/context/FaultsContext";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <ToastProvider>
        <SupabaseAuthProvider>
          <AuthProvider>
            <CompanyProvider>
              <UsersProvider>
                <TasksProvider>
                  <WorkflowProvider>
                    <FaultsProvider>
                      <StoresAndProductsProvider>
                        <VisitsProvider>
                          <TreatmentProvider>{children}</TreatmentProvider>
                        </VisitsProvider>
                      </StoresAndProductsProvider>
                    </FaultsProvider>
                  </WorkflowProvider>
                </TasksProvider>
              </UsersProvider>
            </CompanyProvider>
          </AuthProvider>
        </SupabaseAuthProvider>
      </ToastProvider>
    </QueryProvider>
  );
}
