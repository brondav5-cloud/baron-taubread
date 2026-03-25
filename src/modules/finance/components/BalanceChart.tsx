"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";
import type { BankAccount } from "../types";

interface DataPoint {
  date: string;   // "DD/MM"
  balance: number;
  fullDate: string; // ISO for tooltip
}

interface Props {
  accounts: BankAccount[];
}

function fmt(n: number) {
  return "₪" + Math.round(n).toLocaleString("he-IL");
}

function shortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { value: number; payload: DataPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-sm" dir="rtl">
      <p className="text-gray-500 text-xs">{p?.payload?.fullDate}</p>
      <p className={`font-bold ${(p?.value ?? 0) >= 0 ? "text-blue-700" : "text-red-600"}`}>
        {fmt(p?.value ?? 0)}
      </p>
    </div>
  );
}

export function BalanceChart({ accounts }: Props) {
  const { state } = useSupabaseAuth();
  const selectedCompanyId = state.status === "authed" ? state.user.selectedCompanyId : null;

  const [accountId, setAccountId] = useState<string>("");
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(false);

  // Pick first active account by default
  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0]?.id ?? "");
    }
  }, [accounts, accountId]);

  const load = useCallback(async () => {
    if (!selectedCompanyId || !accountId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: rows } = await supabase
        .from("bank_transactions")
        .select("date, balance")
        .eq("company_id", selectedCompanyId)
        .eq("bank_account_id", accountId)
        .not("balance", "is", null)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(500);

      if (!rows) return;

      // Keep last balance per date (most recent transaction of the day)
      const byDate = new Map<string, number>();
      for (const row of rows) {
        if (row.balance != null) byDate.set(row.date, row.balance);
      }

      const points: DataPoint[] = Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, balance]) => ({
          date: shortDate(date),
          balance,
          fullDate: date,
        }));

      setData(points);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, accountId]);

  useEffect(() => { load(); }, [load]);

  const minBalance = data.length ? Math.min(...data.map((d) => d.balance)) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-gray-800 text-sm">גרף יתרה</h2>
        {accounts.length > 1 && (
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.display_name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">טוען...</span>
        </div>
      ) : data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8 italic">
          אין נתוני יתרה לחשבון זה
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => "₪" + Math.round(v / 1000) + "K"}
              width={54}
            />
            <Tooltip content={<CustomTooltip />} />
            {minBalance < 0 && <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" />}
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#3b82f6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
