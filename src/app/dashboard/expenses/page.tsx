"use client";

import { useState } from "react";
import {
  FolderOpen, LayoutDashboard, FileSpreadsheet,
  Settings, Bell, BarChart3, ArrowRight,
} from "lucide-react";
import { clsx } from "clsx";
import { useAccountingData } from "@/hooks/useAccountingData";
import FilesTab from "@/components/accounting/FilesTab";
import DashboardTab from "@/components/accounting/DashboardTab";
import PnlTableTab from "@/components/accounting/PnlTableTab";
import ClassificationTab from "@/components/accounting/ClassificationTab";
import AlertsTab from "@/components/accounting/AlertsTab";
import ComparisonsTab from "@/components/accounting/ComparisonsTab";
import CategoryPanel from "@/components/accounting/CategoryPanel";
import TransactionModal from "@/components/accounting/TransactionModal";

const TABS = [
  { id: "files",       label: "קבצים",        icon: FolderOpen },
  { id: "dashboard",   label: "דשבורד",        icon: LayoutDashboard },
  { id: "pnl",         label: "רווח והפסד",    icon: FileSpreadsheet },
  { id: "classify",    label: "הגדרות סיווג",   icon: Settings },
  { id: "alerts",      label: "התראות",         icon: Bell },
  { id: "compare",     label: "השוואות",        icon: BarChart3 },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("files");
  const [year, setYear] = useState(new Date().getFullYear());

  // Drill-down state
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [openAccountId, setOpenAccountId] = useState<string | null>(null);
  const [openAccountMonth, setOpenAccountMonth] = useState<number | undefined>(undefined);

  const data = useAccountingData(year);
  const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

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
          {/* Year selector */}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Classification mode toggle */}
          <button
            onClick={() =>
              data.setClassificationMode(
                data.classificationMode === "latest" ? "original" : "latest",
              )
            }
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all",
              data.classificationMode === "latest"
                ? "bg-primary-50 border-primary-200 text-primary-700"
                : "bg-amber-50 border-amber-200 text-amber-700",
            )}
            title="החלפת מצב סיווג"
          >
            <ArrowRight className="w-4 h-4" />
            סיווג: {data.classificationMode === "latest" ? "אחרון" : "מקורי"}
          </button>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl shadow-soft border border-gray-100">
        {/* Tabs */}
        <div className="border-b border-gray-100 px-2">
          <nav className="flex gap-1 overflow-x-auto py-2" aria-label="טאבים">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              // Badge for alerts
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
                  onUploadComplete={() => void data.refetch()}
                />
              )}

              {activeTab === "dashboard" && (
                <DashboardTab
                  yearlyPnl={data.yearlyPnl}
                  prevYearlyPnl={data.prevYearlyPnl}
                  customGroups={data.customGroups}
                  year={year}
                  classificationMode={data.classificationMode}
                  onGroupClick={(groupId) => {
                    setOpenGroupId(groupId);
                    setActiveTab("pnl");
                  }}
                />
              )}

              {activeTab === "pnl" && (
                <PnlTableTab
                  yearlyPnl={data.yearlyPnl}
                  customGroups={data.customGroups}
                  year={year}
                  onGroupClick={(groupId) => setOpenGroupId(groupId)}
                  onAmountClick={(accountId, month) => {
                    setOpenAccountId(accountId === "revenue" ? null : accountId);
                    setOpenAccountMonth(month);
                  }}
                />
              )}

              {activeTab === "classify" && (
                <ClassificationTab
                  customGroups={data.customGroups}
                  accounts={data.accounts}
                  classificationOverrides={data.classificationOverrides}
                  tags={data.tags}
                  accountTags={data.accountTags}
                  counterNames={data.counterNames}
                  onSaveGroup={data.saveGroup}
                  onDeleteGroup={data.deleteGroup}
                  onSaveClassification={data.saveClassificationOverride}
                  onDeleteClassification={data.deleteClassificationOverride}
                  onSaveTag={data.saveTag}
                  onDeleteTag={data.deleteTag}
                  onAssignTag={data.assignTag}
                  onRemoveTag={data.removeTag}
                  onSaveCounterName={data.saveCounterName}
                />
              )}

              {activeTab === "alerts" && (
                <AlertsTab
                  anomalies={data.anomalies}
                  alertRules={data.alertRules}
                  accounts={data.accounts}
                  year={year}
                  onSaveRule={data.saveAlertRule}
                  onDeleteRule={data.deleteAlertRule}
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
        classificationOverrides={data.classificationOverrides}
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
        onSaveOverride={data.saveTransactionOverride}
        onDeleteOverride={data.deleteTransactionOverride}
      />
    </div>
  );
}
