"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";

const MONTH_SHORT = ["ינו׳","פבר׳","מרץ","אפר׳","מאי","יוני","יולי","אוג׳","ספט׳","אוק׳","נוב׳","דצמ׳"];

interface MonthPoint {
  label: string;
  income: number;
  expense: number;
  net: number;
}

function fmtK(n: number) {
  if (Math.abs(n) >= 1_000_000) return "₪" + (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000)    return "₪" + Math.round(n / 1_000) + "K";
  return "₪" + Math.round(n);
}

interface TooltipEntry { value: number; name: string; }
const NAME_HEB: Record<string, string> = {
  income: "הכנסות",
  expense: "הוצאות",
  net: "רווח נקי",
};

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-sm" dir="rtl">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className={`text-xs ${
          p.name === "income" ? "text-green-600" :
          p.name === "expense" ? "text-red-600" :
          "text-blue-600"
        }`}>
          {NAME_HEB[p.name] ?? p.name}: {fmtK(p.value)}
        </p>
      ))}
    </div>
  );
}

export function MonthlyTrendsChart() {
  const { state } = useSupabaseAuth();
  const selectedCompanyId = state.status === "authed" ? state.user.selectedCompanyId : null;
  const [data, setData] = useState<MonthPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const dateFrom = start.toISOString().slice(0, 10);

      const [{ data: cats }, { data: txs }] = await Promise.all([
        supabase
          .from("bank_categories")
          .select("id, type")
          .eq("company_id", selectedCompanyId),
        supabase
          .from("bank_transactions")
          .select("effective_date, debit, credit, category_id")
          .eq("company_id", selectedCompanyId)
          .is("merged_into_id", null)
          .gte("effective_date", dateFrom)
          .not("category_id", "is", null),
      ]);

      const catType = new Map<string, string>(
        (cats ?? []).map((c) => [c.id, c.type])
      );

      // Build ordered month list
      const months: { key: string; label: string }[] = [];
      const cursor = new Date(start);
      for (let i = 0; i < 12; i++) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
        const label = `${MONTH_SHORT[cursor.getMonth()]} ${String(cursor.getFullYear()).slice(2)}`;
        months.push({ key, label });
        cursor.setMonth(cursor.getMonth() + 1);
      }

      const buckets = new Map(months.map((m) => [m.key, { income: 0, expense: 0 }]));

      for (const tx of (txs ?? [])) {
        const ym = tx.effective_date.slice(0, 7);
        if (!buckets.has(ym)) continue;
        const type = tx.category_id ? catType.get(tx.category_id) : null;
        const b = buckets.get(ym)!;
        if (type === "income")  b.income  += Math.max(0, tx.credit - tx.debit);
        else if (type === "expense") b.expense += Math.max(0, tx.debit - tx.credit);
      }

      setData(months.map(({ key, label }) => {
        const b = buckets.get(key) ?? { income: 0, expense: 0 };
        return { label, income: b.income, expense: b.expense, net: b.income - b.expense };
      }));
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-center gap-2 h-[260px] text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">טוען מגמות...</span>
      </div>
    );
  }

  if (!data.some((d) => d.income > 0 || d.expense > 0)) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <h2 className="font-semibold text-gray-800 text-sm">מגמות חודשיות — 12 חודשים אחרונים</h2>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={fmtK}
            width={54}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(val: string) => NAME_HEB[val] ?? val}
          />
          <Bar dataKey="income"  fill="#22c55e" radius={[3,3,0,0]} maxBarSize={20} />
          <Bar dataKey="expense" fill="#ef4444" radius={[3,3,0,0]} maxBarSize={20} />
          <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
