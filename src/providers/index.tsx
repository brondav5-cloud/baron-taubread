"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
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

class ProviderErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Providers] Error caught by boundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.children;
    }
    return this.props.children;
  }
}

interface ProvidersProps {
  children: ReactNode;
}

function InnerProviders({ children }: ProvidersProps) {
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

export function Providers({ children }: ProvidersProps) {
  return (
    <ProviderErrorBoundary>
      <InnerProviders>{children}</InnerProviders>
    </ProviderErrorBoundary>
  );
}
