"use client";

import { useState } from "react";
import { useExpensesData } from "@/hooks/useExpensesData";
import ExpenseUploadTab from "@/components/expenses/ExpenseUploadTab";
import SuppliersTab from "@/components/expenses/SuppliersTab";
import ExpenseReportTab from "@/components/expenses/ExpenseReportTab";
import PnlReportTab from "@/components/expenses/PnlReportTab";
import ComparisonTab from "@/components/expenses/ComparisonTab";
import {
  Upload,
  Users,
  BarChart3,
  FileSpreadsheet,
  GitCompare,
} from "lucide-react";
import { clsx } from "clsx";

const TABS = [
  { id: "upload", label: "העלאת קובץ", icon: Upload },
  { id: "suppliers", label: "ספקים וקטגוריות", icon: Users },
  { id: "report", label: "דוח הוצאות", icon: BarChart3 },
  { id: "pnl", label: "רווח והפסד", icon: FileSpreadsheet },
  { id: "compare", label: "ניתוחים", icon: GitCompare },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<TabId>("upload");
  const [filterYear, setFilterYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [filterMonth, setFilterMonth] = useState<number | undefined>(undefined);

  const data = useExpensesData(filterYear, filterMonth);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניהול הוצאות ורווח והפסד</h1>
          <p className="text-sm text-gray-500 mt-1">
            העלאת דוחות חשבשבת, ניהול ספקים, וניתוח פיננסי
          </p>
        </div>

        {/* Period Filter */}
        <div className="flex items-center gap-3">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(
              (y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ),
            )}
          </select>
          <select
            value={filterMonth ?? ""}
            onChange={(e) =>
              setFilterMonth(e.target.value ? Number(e.target.value) : undefined)
            }
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">כל החודשים</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1).toLocaleString("he-IL", { month: "long" })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-soft border border-gray-100">
        <div className="border-b border-gray-100 px-2">
          <nav className="flex gap-1 overflow-x-auto py-2" aria-label="טאבים">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                  activeTab === tab.id
                    ? "bg-primary-100 text-primary-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {data.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
            </div>
          ) : data.error ? (
            <div className="text-center py-20">
              <p className="text-red-500 text-lg">{data.error}</p>
              <button
                onClick={() => data.refetch()}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-700 transition-colors"
              >
                נסה שוב
              </button>
            </div>
          ) : (
            <>
              {activeTab === "upload" && (
                <ExpenseUploadTab onUploadComplete={() => data.refetch()} />
              )}
              {activeTab === "suppliers" && (
                <SuppliersTab
                  suppliers={data.suppliers}
                  categories={data.categories}
                  onUpdateSupplier={data.updateSupplier}
                  onAddCategory={data.addCategory}
                  onDeleteCategory={data.deleteCategory}
                />
              )}
              {activeTab === "report" && (
                <ExpenseReportTab
                  entries={data.entries}
                  categories={data.categories}
                  suppliers={data.suppliers}
                  year={filterYear}
                  month={filterMonth}
                />
              )}
              {activeTab === "pnl" && (
                <PnlReportTab
                  entries={data.entries}
                  categories={data.categories}
                  suppliers={data.suppliers}
                  revenue={data.revenue}
                  year={filterYear}
                  month={filterMonth}
                  onSaveRevenue={data.saveRevenue}
                  onDeleteRevenue={data.deleteRevenue}
                />
              )}
              {activeTab === "compare" && (
                <ComparisonTab
                  entries={data.entries}
                  categories={data.categories}
                  suppliers={data.suppliers}
                  revenue={data.revenue}
                  year={filterYear}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
