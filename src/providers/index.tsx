"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { usePathname } from "next/navigation";
import { QueryProvider } from "./QueryProvider";
import { ToastProvider } from "./ToastProvider";
import { SupabaseAuthProvider } from "@/context/SupabaseAuthContext";
import { StoresAndProductsProvider } from "@/context/StoresAndProductsContext";
import { VisitsProvider } from "@/context/VisitsContext";
import { TreatmentProvider } from "@/context/TreatmentContext";
import { UsersProvider } from "@/context/UsersContext";
import { TasksProvider } from "@/context/TasksContext";
import { WorkflowProvider } from "@/context/WorkflowContext";
import { FaultsProvider } from "@/context/FaultsContext";
import { PushNotificationProvider } from "@/context/PushNotificationContext";

class ProviderErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
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
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface ProvidersProps {
  children: ReactNode;
}

const AUTH_PAGES = ["/login"];

function InnerProviders({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <ToastProvider>
        <SupabaseAuthProvider>
          <PushNotificationProvider>
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
          </PushNotificationProvider>
        </SupabaseAuthProvider>
      </ToastProvider>
    </QueryProvider>
  );
}

export function Providers({ children }: ProvidersProps) {
  const pathname = usePathname();

  if (AUTH_PAGES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <ProviderErrorBoundary fallback={children}>
      <InnerProviders>{children}</InnerProviders>
    </ProviderErrorBoundary>
  );
}
