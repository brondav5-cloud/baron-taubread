"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  X,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { clsx } from "clsx";
import type {
  DbExpenseEntry,
  DbExpenseCategory,
  DbSupplier,
  DbRevenueEntry,
  ExpenseCategoryParentType,
} from "@/types/expenses";
import { PARENT_TYPE_LABELS } from "@/types/expenses";

interface Props {
  entries: DbExpenseEntry[];
  categories: DbExpenseCategory[];
  suppliers: DbSupplier[];
  revenue: DbRevenueEntry[];
  year: number;
  month?: number;
  onSaveRevenue: (data: {
    month: number;
    year: number;
    category?: string;
    amount: number;
    description?: string;
  }) => Promise<boolean>;
  onDeleteRevenue: (id: string) => Promise<boolean>;
}

const SECTION_ORDER: ExpenseCategoryParentType[] = [
  "cost_of_goods",
  "operating",
  "finance",
  "other",
];

export default function PnlReportTab({
  entries,
  categories,
  suppliers,
  revenue,
  year,
  month,
  onSaveRevenue,
  onDeleteRevenue,
}: Props) {
  const [showRevenueForm, setShowRevenueForm] = useState(false);
  const [revMonth, setRevMonth] = useState(month || new Date().getMonth() + 1);
  const [revYear, setRevYear] = useState(year);
  const [revAmount, setRevAmount] = useState("");
  const [revCategory] = useState("sales");
  const [revDescription, setRevDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const supplierMap = useMemo(() => {
    const m = new Map<string, DbSupplier>();
    for (const s of suppliers) m.set(s.id, s);
    return m;
  }, [suppliers]);

  const categoryMap = useMemo(() => {
    const m = new Map<string, DbExpenseCategory>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  // Build P&L sections from expense entries
  const expenseByParentType = useMemo(() => {
    const result = new Map<
      ExpenseCategoryParentType,
      Map<string, { name: string; total: number }>
    >();

    for (const type of SECTION_ORDER) {
      result.set(type, new Map());
    }

    for (const entry of entries) {
      const supplier = supplierMap.get(entry.supplier_id);
      const catId = supplier?.category_id;
      const cat = catId ? categoryMap.get(catId) : null;
      const parentType = cat?.parent_type || "other";

      const section = result.get(parentType)!;
      const catName = cat?.name || "ללא קטגוריה";
      if (!section.has(catName)) {
        section.set(catName, { name: catName, total: 0 });
      }
      section.get(catName)!.total += (Number(entry.debits) || 0) - (Number(entry.credits) || 0);
    }

    return result;
  }, [entries, supplierMap, categoryMap]);

  // Revenue total
  const totalRevenue = useMemo(
    () => revenue.reduce((sum, r) => sum + Number(r.amount), 0),
    [revenue],
  );

  // Section totals
  const sectionTotals = useMemo(() => {
    const totals: Record<ExpenseCategoryParentType, number> = {
      cost_of_goods: 0,
      operating: 0,
      finance: 0,
      other: 0,
    };
    expenseByParentType.forEach((catMap, type) => {
      catMap.forEach((item) => {
        totals[type] += item.total;
      });
    });
    return totals;
  }, [expenseByParentType]);

  const grossProfit = totalRevenue - sectionTotals.cost_of_goods;
  const operatingProfit = grossProfit - sectionTotals.operating;
  const netProfit = operatingProfit - sectionTotals.finance - sectionTotals.other;

  const handleSaveRevenue = async () => {
    if (!revAmount) return;
    setSaving(true);
    await onSaveRevenue({
      month: revMonth,
      year: revYear,
      category: revCategory,
      amount: parseFloat(revAmount),
      description: revDescription || undefined,
    });
    setSaving(false);
    setShowRevenueForm(false);
    setRevAmount("");
    setRevDescription("");
  };

  const periodLabel = month
    ? `${new Date(year, month - 1).toLocaleString("he-IL", { month: "long" })} ${year}`
    : `שנת ${year}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            דוח רווח והפסד
          </h2>
          <p className="text-sm text-gray-500">{periodLabel}</p>
        </div>
        <button
          onClick={() => setShowRevenueForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          הוסף הכנסה
        </button>
      </div>

      {/* Revenue Form */}
      {showRevenueForm && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-green-900">הוספת הכנסה</h3>
            <button onClick={() => setShowRevenueForm(false)}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">חודש</label>
              <select
                value={revMonth}
                onChange={(e) => setRevMonth(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleString("he-IL", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">שנה</label>
              <select
                value={revYear}
                onChange={(e) => setRevYear(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(
                  (y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">סכום (&#8362;)</label>
              <input
                type="number"
                value={revAmount}
                onChange={(e) => setRevAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">תיאור</label>
              <input
                type="text"
                value={revDescription}
                onChange={(e) => setRevDescription(e.target.value)}
                placeholder="מכירות, אחר..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <button
              onClick={handleSaveRevenue}
              disabled={!revAmount || saving}
              className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "שומר..." : "שמור"}
            </button>
          </div>
        </div>
      )}

      {/* P&L Statement */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {/* Revenue Section */}
        <div className="bg-green-50 border-b border-green-100">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-green-800 uppercase tracking-wider">
                הכנסות
              </h3>
              <span className="text-lg font-bold text-green-700">
                {formatCurrency(totalRevenue)}
              </span>
            </div>
            {revenue.length > 0 && (
              <div className="mt-2 space-y-1">
                {revenue.map((r) => (
                  <div key={r.id} className="flex justify-between text-xs text-green-700">
                    <span>
                      {r.description || r.category}{" "}
                      ({new Date(r.year, r.month - 1).toLocaleString("he-IL", { month: "short" })})
                    </span>
                    <div className="flex items-center gap-2">
                      <span>{formatCurrency(Number(r.amount))}</span>
                      <button
                        onClick={() => onDeleteRevenue(r.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {revenue.length === 0 && (
              <p className="text-xs text-green-600 mt-1">
                לא הוזנו הכנסות — לחץ &quot;הוסף הכנסה&quot; למעלה
              </p>
            )}
          </div>
        </div>

        {/* Expense Sections */}
        {SECTION_ORDER.map((parentType) => {
          const items = expenseByParentType.get(parentType);
          if (!items || items.size === 0) return null;
          const sectionTotal = sectionTotals[parentType];

          return (
            <div key={parentType} className="border-b border-gray-100">
              <div className="px-6 py-3 bg-gray-50">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    (-) {PARENT_TYPE_LABELS[parentType]}
                  </h3>
                  <span className="text-sm font-bold text-red-600">
                    {formatCurrency(sectionTotal)}
                  </span>
                </div>
              </div>
              <div className="px-6 py-2 space-y-1">
                {Array.from(items.values())
                  .sort((a, b) => b.total - a.total)
                  .map((item) => (
                    <div
                      key={item.name}
                      className="flex justify-between text-sm py-1"
                    >
                      <span className="text-gray-600">{item.name}</span>
                      <span className="text-gray-900 font-medium">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}

        {/* Subtotals */}
        <div className="divide-y divide-gray-100">
          <PnlSubtotalRow
            label="רווח גולמי"
            value={grossProfit}
            revenue={totalRevenue}
            highlight
          />
          <PnlSubtotalRow
            label="רווח תפעולי"
            value={operatingProfit}
            revenue={totalRevenue}
          />
          <PnlSubtotalRow
            label="רווח נקי"
            value={netProfit}
            revenue={totalRevenue}
            isFinal
          />
        </div>
      </div>
    </div>
  );
}

function PnlSubtotalRow({
  label,
  value,
  revenue,
  highlight,
  isFinal,
}: {
  label: string;
  value: number;
  revenue: number;
  highlight?: boolean;
  isFinal?: boolean;
}) {
  const pctOfRevenue = revenue > 0 ? (value / revenue) * 100 : 0;
  const isPositive = value >= 0;

  return (
    <div
      className={clsx(
        "px-6 py-4 flex justify-between items-center",
        isFinal && "bg-gradient-to-l from-primary-50 to-transparent",
        highlight && "bg-blue-50/50",
      )}
    >
      <div className="flex items-center gap-2">
        {isPositive ? (
          <TrendingUp className="w-4 h-4 text-green-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-500" />
        )}
        <span
          className={clsx(
            "font-bold",
            isFinal ? "text-lg text-gray-900" : "text-sm text-gray-700",
          )}
        >
          = {label}
        </span>
      </div>
      <div className="text-left">
        <span
          className={clsx(
            "font-bold",
            isFinal ? "text-xl" : "text-base",
            isPositive ? "text-green-700" : "text-red-700",
          )}
        >
          {formatCurrency(value)}
        </span>
        {revenue > 0 && (
          <span className="text-xs text-gray-400 mr-2">
            ({pctOfRevenue.toFixed(1)}%)
          </span>
        )}
      </div>
    </div>
  );
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(val);
}
