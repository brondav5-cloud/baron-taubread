"use client";

import { useState, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileBottomNav from "./MobileBottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import { useUserActivityTracker } from "@/hooks/useUserActivityTracker";
import type { WhoamiCompany } from "@/context/SupabaseAuthContext";
import { Building2, Loader2 } from "lucide-react";
import { ForceLogoutBanner } from "./ForceLogoutBanner";
import { AppUpdateBanner } from "./AppUpdateBanner";
import { UsageNoticeBanner } from "./UsageNoticeBanner";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const auth = useAuth();
  const { selectCompany } = useSupabaseAuth();
  const router = useRouter();
  const pathname = usePathname();
  useUserActivityTracker();

  useEffect(() => {
    if (auth.status === "anon") {
      router.replace("/login");
    }
  }, [auth.status, router]);

  if (auth.status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-main flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto" />
          <p className="mt-3 text-gray-500 text-sm">טוען...</p>
        </div>
      </div>
    );
  }

  if (auth.status === "anon") {
    return null;
  }

  const needsCompanySelection =
    auth.status === "authed" &&
    auth.user &&
    (auth.user.companies?.length ?? 0) > 1 &&
    !auth.user.selectedCompanyId;
  const showUsageNotice = pathname === "/dashboard";

  return (
    <div className="min-h-screen bg-gradient-main overflow-x-hidden">
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
        <div className="flex min-h-screen">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <div className="flex-1 min-w-0 flex flex-col">
            <Header onMenuClick={() => setSidebarOpen(true)} />
            {showUsageNotice && <UsageNoticeBanner />}
            <AppUpdateBanner />
            <main className="flex-1 p-4 lg:p-6 min-w-0 pb-20 lg:pb-6">
              {children}
            </main>
          </div>
          <MobileBottomNav onMenuClick={() => setSidebarOpen(true)} />
        </div>
      )}
      {auth.status === "authed" && (
        <ForceLogoutBanner companyId={auth.user.company_id} />
      )}
    </div>
  );
}
