"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import type { WhoamiCompany } from "@/context/SupabaseAuthContext";
import { Building2 } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const auth = useAuth();
  const { selectCompany } = useSupabaseAuth();

  const needsCompanySelection =
    auth.status === "authed" &&
    auth.user &&
    (auth.user.companies?.length ?? 0) > 1 &&
    !auth.user.selectedCompanyId;

  return (
    <div className="min-h-screen bg-gradient-main">
      {needsCompanySelection ? (
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-elevated p-8">
            <div className="text-center mb-6">
              <Building2 className="w-12 h-12 text-primary-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-gray-900">בחר חברה</h2>
              <p className="text-gray-500 mt-1">
                יש לך גישה למספר חברות. בחר את החברה שתרצה לעבוד איתה
              </p>
            </div>
            <div className="space-y-2">
              {auth.user?.companies?.map((company: WhoamiCompany) => (
                <button
                  key={company.id}
                  onClick={() => void selectCompany(company.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:bg-primary-50 hover:border-primary-200 transition-colors text-right"
                >
                  <span className="text-lg">🏢</span>
                  <span className="font-medium text-gray-900">
                    {company.name || company.slug || "חברה"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 lg:mr-0">
            <Header onMenuClick={() => setSidebarOpen(true)} />
            <main className="p-4 lg:p-6 min-w-0">{children}</main>
          </div>
        </div>
      )}
    </div>
  );
}
