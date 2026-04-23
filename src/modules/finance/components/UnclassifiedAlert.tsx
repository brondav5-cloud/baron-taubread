"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AlertCircle, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/context/SupabaseAuthContext";

interface UnclassifiedAlertProps {
  onClassified?: () => void;
}

export function UnclassifiedAlert({ onClassified }: UnclassifiedAlertProps) {
  const { state } = useSupabaseAuth();
  const selectedCompanyId = state.status === "authed" ? state.user.selectedCompanyId : null;
  const [count, setCount] = useState<number | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const fetchCount = useCallback(async () => {
    if (!selectedCompanyId) return;
    const supabase = createClient();
    const { count: c } = await supabase
      .from("bank_transactions")
      .select("id", { count: "exact", head: true })
      .eq("company_id", selectedCompanyId)
      .is("category_id", null);
    setCount(c ?? 0);
  }, [selectedCompanyId]);

  useEffect(() => { fetchCount(); }, [fetchCount]);

  const handleClassify = useCallback(async () => {
    setClassifying(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/finance/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "auto" }),
      });
      const data = await res.json().catch(() => ({})) as { classified?: number; message?: string; error?: string };
      if (!res.ok) {
        setLastResult(data.error ?? "שגיאה בסיווג האוטומטי");
        return;
      }
      if (typeof data.classified === "number") {
        setLastResult(`סווגו ${data.classified.toLocaleString()} תנועות`);
      } else if (data.message) {
        setLastResult(data.message);
      }
      await fetchCount();
      onClassified?.();
    } finally {
      setClassifying(false);
    }
  }, [fetchCount, onClassified]);

  if (!count || count === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3" dir="rtl">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-sm font-medium">
            {count.toLocaleString()} תנועות ללא סיווג
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClassify}
            disabled={classifying}
            className="flex items-center gap-1.5 text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 disabled:opacity-50 font-medium transition-colors"
          >
            <Zap className="w-3 h-3" />
            {classifying ? "מסווג..." : "סווג אוטומטית"}
          </button>
          <Link
            href="/dashboard/finance/categories"
            className="text-xs text-amber-700 hover:underline font-medium"
          >
            הגדר כללים
          </Link>
        </div>
      </div>
      {lastResult && (
        <div className="text-xs text-gray-600 px-1" dir="rtl">
          {lastResult}
        </div>
      )}
    </div>
  );
}
