"use client";

import { useState } from "react";
import { ChevronDown, Building2 } from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/hooks/useAuth";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import type { WhoamiCompany } from "@/context/SupabaseAuthContext";

export default function CompanyPicker() {
  const auth = useAuth();
  const { selectCompany } = useSupabaseAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (auth.status !== "authed" || !auth.user) return null;
  const { companies, selectedCompanyId } = auth.user as {
    companies: WhoamiCompany[];
    selectedCompanyId: string | null;
  };
  if (!companies || companies.length === 0) return null;

  const currentCompany = companies.find(
    (c: WhoamiCompany) => c.id === selectedCompanyId,
  );
  const displayName =
    currentCompany?.name || currentCompany?.slug || "חברה";
  const hasMultiple = companies.length > 1;

  const handleSelect = async (companyId: string) => {
    const ok = await selectCompany(companyId);
    if (ok) {
      setIsOpen(false);
      // Full page reload ensures all client-side state (data hooks, caches) is cleared
      // before loading fresh data for the newly selected company.
      window.location.reload();
    }
  };

  const badgeContent = (
    <>
      <Building2 className="w-4 h-4 text-primary-600 shrink-0" />
      <span className="max-w-[160px] truncate">{displayName}</span>
      {hasMultiple && (
        <ChevronDown
          className={clsx("w-4 h-4 text-primary-600 shrink-0 transition-transform", isOpen && "rotate-180")}
        />
      )}
    </>
  );

  const badgeClass =
    "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-primary-50 text-primary-800 border border-primary-200";

  if (!hasMultiple) {
    return (
      <div className={clsx(badgeClass, "cursor-default")}>
        {badgeContent}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          badgeClass,
          "hover:bg-primary-100 transition-colors",
          !selectedCompanyId && "border-amber-400 bg-amber-50",
        )}
      >
        {badgeContent}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-elevated border border-gray-100 z-20 animate-scale-in">
            <div className="p-2 max-h-60 overflow-y-auto">
              {companies.map((company: WhoamiCompany) => (
                <button
                  key={company.id}
                  onClick={() => void handleSelect(company.id)}
                  className={clsx(
                    "w-full text-right px-3 py-2 rounded-lg text-sm transition-colors",
                    company.id === selectedCompanyId
                      ? "bg-primary-100 text-primary-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100",
                  )}
                >
                  {company.name || company.slug || "חברה"}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
