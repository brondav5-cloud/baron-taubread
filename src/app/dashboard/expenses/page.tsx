"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  FolderOpen, LayoutDashboard, FileSpreadsheet,
  Settings, Bell, BarChart3, CheckCircle, XCircle, AlertTriangle,
} from "lucide-react";
import { clsx } from "clsx";
import { useAccountingData } from "@/hooks/useAccountingData";
import CategoryPanel from "@/components/accounting/CategoryPanel";
import TransactionModal from "@/components/accounting/TransactionModal";
import AccountDetailPanel from "@/components/accounting/AccountDetailPanel";

const TabSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
  </div>
);

const FilesTab = dynamic(() => import("@/components/accounting/FilesTab"), { loading: TabSkeleton });
const DashboardTab = dynamic(() => import("@/components/accounting/DashboardTab"), { loading: TabSkeleton });
const PnlTableTab = dynamic(() => import("@/components/accounting/PnlTableTab"), { loading: TabSkeleton });
const AlertsTab = dynamic(() => import("@/components/accounting/AlertsTab"), { loading: TabSkeleton });
const ComparisonsTab = dynamic(() => import("@/components/accounting/ComparisonsTab"), { loading: TabSkeleton });
const AccountMappingTab = dynamic(() => import("@/components/accounting/AccountMappingTab"), { loading: TabSkeleton });

// ── Toast system ──────────────────────────────────────────────

type ToastType = "success" | "error" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 left-6 z-[9999] space-y-2 min-w-[280px] max-w-[380px]" dir="rtl">
      {toasts.map(t => (
        <div key={t.id}
          className={clsx(
            "flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium transition-all animate-in slide-in-from-bottom-2",
            t.type === "success" && "bg-emerald-50 border-emerald-200 text-emerald-800",
            t.type === "error" && "bg-red-50 border-red-200 text-red-800",
            t.type === "warning" && "bg-amber-50 border-amber-200 text-amber-800",
          )}>
          {t.type === "success" && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
          {t.type === "error" && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
          {t.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "success") => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

// ── Tab config ────────────────────────────────────────────────

const TABS = [
  { id: "files",     label: "קבצים",         icon: FolderOpen },
  { id: "dashboard", label: "דשבורד",         icon: LayoutDashboard },
  { id: "pnl",       label: "רווח והפסד",     icon: FileSpreadsheet },
  { id: "accounts",  label: "חשבונות",        icon: Settings },
  { id: "alerts",    label: "התראות",          icon: Bell },
  { id: "compare",   label: "השוואות",         icon: BarChart3 },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ── Page ──────────────────────────────────────────────────────

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("files");
  const [year, setYear] = useState(new Date().getFullYear());

  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [openAccountId, setOpenAccountId] = useState<string | null>(null);
  const [openAccountMonth, setOpenAccountMonth] = useState<number | undefined>(undefined);
  const [detailAccountId, setDetailAccountId] = useState<string | null>(null);

  const { toasts, addToast, removeToast } = useToast();

  const data = useAccountingData(year);
  const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  // Wrapped mutations with toast feedback
  const withToast = useCallback(
    async (fn: () => Promise<boolean>, successMsg: string, errorMsg?: string) => {
      const ok = await fn();
      if (ok) addToast(successMsg, "success");
      else addToast(errorMsg ?? "שגיאה בשמירה — נסה שוב", "error");
      return ok;
    },
    [addToast],
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניהול פיננסי — רווח והפסד</h1>
          <p className="text-sm text-gray-500 mt-1">
            העלאת כרטסת חשבשבת · ניתוח פיננסי · סיווג חשבונות
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          {data.closingEntriesCount > 0 && (
            <button
              onClick={() => data.setExcludeClosingEntries(!data.excludeClosingEntries)}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all",
                data.excludeClosingEntries
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-700",
              )}
              title={`נמצאו ${data.closingEntriesCount} פקודות סגירה`}
            >
              {data.excludeClosingEntries ? "✓ ללא פקודות סגירה" : "⚠ כולל פקודות סגירה"}
              <span className="text-[10px] opacity-70">({data.closingEntriesCount.toLocaleString()})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl shadow-soft border border-gray-100">
        {/* Tabs */}
        <div className="border-b border-gray-100 px-2">
          <nav className="flex gap-1 overflow-x-auto py-2" aria-label="טאבים">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const badge = tab.id === "alerts" && data.anomalies.length > 0
                ? data.anomalies.length : 0;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                    activeTab === tab.id
                      ? "bg-primary-100 text-primary-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {badge > 0 && (
                    <span className="absolute -top-0.5 -left-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {data.isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : data.error ? (
            <div className="text-center py-16">
              <p className="text-red-500">{data.error}</p>
              <button
                onClick={() => void data.refetch()}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-700"
              >
                נסה שוב
              </button>
            </div>
          ) : (
            <>
              {activeTab === "files" && (
                <FilesTab
                  files={data.files}
                  onUploadComplete={() => {
                    void data.refetch();
                    addToast("הקובץ הועלה בהצלחה", "success");
                  }}
                />
              )}

              {activeTab === "dashboard" && (
                <DashboardTab
                  yearlyPnl={data.yearlyPnl}
                  prevYearlyPnl={data.prevYearlyPnl}
                  customGroups={data.customGroups}
                  accounts={data.accounts}
                  transactions={data.transactions}
                  year={year}
                  onGroupClick={(groupId) => {
                    setOpenGroupId(groupId);
                  }}
                  onAccountClick={(accountId) => {
                    setOpenAccountId(accountId);
                    setOpenAccountMonth(undefined);
                  }}
                />
              )}

              {activeTab === "pnl" && (
                <PnlTableTab
                  yearlyPnl={data.yearlyPnl}
                  prevYearlyPnl={data.prevYearlyPnl}
                  customGroups={data.customGroups}
                  accounts={data.accounts}
                  year={year}
                  groupLabels={data.groupLabels}
                  pnlCustomSections={data.pnlCustomSections}
                  onGroupClick={(groupId) => setOpenGroupId(groupId)}
                  onAmountClick={(accountId, month) => {
                    setOpenAccountId(accountId === "revenue" ? null : accountId);
                    setOpenAccountMonth(month);
                  }}
                  onAccountClick={(accountId) => setDetailAccountId(accountId)}
                />
              )}

              {activeTab === "accounts" && (
                <AccountMappingTab
                  accounts={data.accounts}
                  customGroups={data.customGroups}
                  tags={data.tags}
                  accountTags={data.accountTags}
                  counterNames={data.counterNames}
                  revenueGroups={data.revenueGroups}
                  revenueAccountCodes={data.revenueAccountCodes}
                  groupLabels={data.groupLabels}
                  pnlCustomSections={data.pnlCustomSections}
                  transactions={data.transactions}
                  onRefetch={data.refetch}
                  onRefetchStructure={data.refetchStructure}
                  onSaveTag={(tag) =>
                    withToast(
                      () => data.saveTag(tag),
                      tag.id ? "התגית עודכנה" : "התגית נוצרה בהצלחה",
                    )
                  }
                  onDeleteTag={(id) =>
                    withToast(() => data.deleteTag(id), "התגית נמחקה")
                  }
                  onAssignTag={(accountId, tagId) =>
                    withToast(() => data.assignTag(accountId, tagId), "התגית שויכה")
                  }
                  onRemoveTag={(accountId, tagId) =>
                    withToast(() => data.removeTag(accountId, tagId), "התגית הוסרה")
                  }
                  onSaveCounterName={(code, name) =>
                    withToast(() => data.saveCounterName(code, name), "השם עודכן בהצלחה")
                  }
                />
              )}

              {activeTab === "alerts" && (
                <AlertsTab
                  anomalies={data.anomalies}
                  alertRules={data.alertRules}
                  accounts={data.accounts}
                  year={year}
                  onSaveRule={(rule) =>
                    withToast(() => data.saveAlertRule(rule), "הכלל נשמר בהצלחה")
                  }
                  onDeleteRule={(id) =>
                    withToast(() => data.deleteAlertRule(id), "הכלל נמחק")
                  }
                  onAccountClick={(accountId) => {
                    setOpenAccountId(accountId);
                    setOpenAccountMonth(undefined);
                  }}
                />
              )}

              {activeTab === "compare" && (
                <ComparisonsTab
                  yearlyPnl={data.yearlyPnl}
                  prevYearlyPnl={data.prevYearlyPnl}
                  customGroups={data.customGroups}
                  accounts={data.accounts}
                  year={year}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Category drill-down panel */}
      <CategoryPanel
        groupId={openGroupId}
        yearlyPnl={data.yearlyPnl}
        prevYearlyPnl={data.prevYearlyPnl}
        customGroups={data.customGroups}
        accounts={data.accounts}
        onClose={() => setOpenGroupId(null)}
        onAccountClick={(accountId) => {
          setOpenAccountId(accountId);
          setOpenAccountMonth(undefined);
          setOpenGroupId(null);
        }}
      />

      {/* Transaction drill-down modal */}
      <TransactionModal
        accountId={openAccountId}
        filterMonth={openAccountMonth}
        transactions={data.transactions}
        transactionOverrides={data.transactionOverrides}
        accounts={data.accounts}
        counterNames={data.counterNames}
        year={year}
        onClose={() => { setOpenAccountId(null); setOpenAccountMonth(undefined); }}
        onSaveOverride={(txId, type, newValue, note) =>
          withToast(
            () => data.saveTransactionOverride(txId, type, newValue, note),
            "שינוי נשמר בהצלחה",
          )
        }
        onDeleteOverride={(id) =>
          withToast(() => data.deleteTransactionOverride(id), "שינוי הוסר")
        }
      />

      {/* Account detail panel */}
      {detailAccountId && (() => {
        const account = data.accounts.find(a => a.id === detailAccountId);
        if (!account) return null;
        const availableYears = Array.from(new Set(data.transactions.map(t => new Date(t.transaction_date).getFullYear()))).sort((a, b) => b - a);
        return (
          <AccountDetailPanel
            account={account}
            transactions={data.transactions}
            counterNames={data.counterNames}
            years={availableYears.length > 0 ? availableYears : [year]}
            initialYear={year}
            onClose={() => setDetailAccountId(null)}
          />
        );
      })()}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
