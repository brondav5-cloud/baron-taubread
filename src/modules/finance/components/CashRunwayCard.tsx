"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";

interface RunwayData {
  months: number;
  currentBalance: number;
  avgMonthlyExpense: number;
}

export function CashRunwayCard() {
  const { state } = useSupabaseAuth();
  const selectedCompanyId = state.status === "authed" ? state.user.selectedCompanyId : null;
  const [data, setData] = useState<RunwayData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const supabase = createClient();

      // Latest known balance
      const { data: latest } = await supabase
        .from("bank_transactions")
        .select("balance")
        .eq("company_id", selectedCompanyId)
        .not("balance", "is", null)
        .order("effective_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const balance = latest?.balance ?? null;
      if (balance === null || balance <= 0) return;

      // Expense category IDs
      const { data: expCats } = await supabase
        .from("bank_categories")
        .select("id")
        .eq("company_id", selectedCompanyId)
        .eq("type", "expense");

      const expenseIds = (expCats ?? []).map((c) => c.id);
      if (expenseIds.length === 0) return;

      // Sum expenses over last 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const dateFrom = threeMonthsAgo.toISOString().slice(0, 10);

      const { data: txs } = await supabase
        .from("bank_transactions")
        .select("debit, credit")
        .eq("company_id", selectedCompanyId)
        .is("merged_into_id", null)
        .gte("effective_date", dateFrom)
        .in("category_id", expenseIds);

      const totalExpense = (txs ?? []).reduce(
        (s, tx) => s + Math.max(0, tx.debit - tx.credit), 0
      );
      const avgMonthly = totalExpense / 3;
      if (avgMonthly <= 0) return;

      setData({ months: balance / avgMonthly, currentBalance: balance, avgMonthlyExpense: avgMonthly });
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) return null;

  const { months, currentBalance, avgMonthlyExpense } = data;

  const color =
    months >= 6 ? { bg: "bg-blue-50",  text: "text-blue-700",  sub: "text-blue-500"  } :
    months >= 2 ? { bg: "bg-amber-50", text: "text-amber-700", sub: "text-amber-500" } :
                  { bg: "bg-red-50",   text: "text-red-700",   sub: "text-red-500"   };

  const display =
    months >= 24 ? "24+" :
    months < 1   ? "<1"  :
    (Math.round(months * 10) / 10).toLocaleString("he-IL");

  return (
    <div className={`rounded-2xl p-5 ${color.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <TrendingDown className={`w-4 h-4 ${color.sub}`} />
        <p className={`text-xs font-medium ${color.sub}`}>צבר מזומנים</p>
      </div>
      <p className={`text-3xl font-bold ${color.text}`}>{display} חודשים</p>
      <p className={`text-xs mt-1.5 ${color.sub}`}>
        יתרה ₪{Math.round(currentBalance).toLocaleString("he-IL")} ÷ הוצ׳ ממוצעת ₪{Math.round(avgMonthlyExpense).toLocaleString("he-IL")}/חודש
      </p>
    </div>
  );
}
