"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import type { DistributionV2SummaryMetricKey } from "../types";
import {
  DISTRIBUTION_V2_SUMMARY_METRIC_ORDER,
  DISTRIBUTION_V2_SUMMARY_DEFAULT_KEYS,
} from "../types";
import type { DistributionV2SummaryStats } from "../types";

const STORAGE_KEY = "distribution-v2-summary-metrics";

function formatNum(n: number): string {
  return n.toLocaleString("he-IL");
}

function formatMoney(n: number): string {
  return `₪${n.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(n: number): string {
  return `${formatNum(n)}%`;
}

function loadSelectedKeys(): DistributionV2SummaryMetricKey[] {
  if (typeof window === "undefined") return [...DISTRIBUTION_V2_SUMMARY_DEFAULT_KEYS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DISTRIBUTION_V2_SUMMARY_DEFAULT_KEYS];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DISTRIBUTION_V2_SUMMARY_DEFAULT_KEYS];
    const valid = new Set(DISTRIBUTION_V2_SUMMARY_METRIC_ORDER.map((m) => m.key));
    const filtered = parsed.filter((k): k is DistributionV2SummaryMetricKey =>
      valid.has(k as DistributionV2SummaryMetricKey),
    );
    return filtered.length > 0 ? filtered : [...DISTRIBUTION_V2_SUMMARY_DEFAULT_KEYS];
  } catch {
    return [...DISTRIBUTION_V2_SUMMARY_DEFAULT_KEYS];
  }
}

interface DistributionV2KpiBarProps {
  summaryStats: DistributionV2SummaryStats | null;
}

export function DistributionV2KpiBar({ summaryStats }: DistributionV2KpiBarProps) {
  const [selectedKeys, setSelectedKeys] = useState<DistributionV2SummaryMetricKey[]>(
    DISTRIBUTION_V2_SUMMARY_DEFAULT_KEYS,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setSelectedKeys(loadSelectedKeys());
  }, []);

  const persist = useCallback((keys: DistributionV2SummaryMetricKey[]) => {
    setSelectedKeys(keys);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t) ?? false) return;
      if (btnRef.current?.contains(t)) return;
      setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  const orderedDisplay = useMemo(() => {
    if (!summaryStats) return [];
    const orderMap = new Map(DISTRIBUTION_V2_SUMMARY_METRIC_ORDER.map((m, i) => [m.key, i]));
    const keys = [...selectedKeys].sort((a, b) => (orderMap.get(a) ?? 99) - (orderMap.get(b) ?? 99));
    return keys
      .map((key) => {
        const def = DISTRIBUTION_V2_SUMMARY_METRIC_ORDER.find((m) => m.key === key);
        if (!def) return null;
        const raw = summaryStats[key];
        const value =
          def.format === "money"
            ? formatMoney(raw as number)
            : def.format === "percent"
              ? formatPercent(raw as number)
              : formatNum(raw as number);
        return { key, label: def.label, value };
      })
      .filter(Boolean) as { key: DistributionV2SummaryMetricKey; label: string; value: string }[];
  }, [summaryStats, selectedKeys]);

  const toggleMetric = (key: DistributionV2SummaryMetricKey) => {
    const next = selectedKeys.includes(key)
      ? selectedKeys.filter((k) => k !== key)
      : [...selectedKeys, key];
    persist(next);
  };

  const selectAll = () => {
    persist(DISTRIBUTION_V2_SUMMARY_METRIC_ORDER.map((m) => m.key));
  };

  const selectDefaults = () => {
    persist([...DISTRIBUTION_V2_SUMMARY_DEFAULT_KEYS]);
  };

  if (!summaryStats) return null;

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200/90 shadow-soft overflow-visible">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">סיכום לפי הסינון</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xl">
            כל השורות שעוברות את הפילטרים (לא רק העמוד הנוכחי)
          </p>
        </div>
        <button
          ref={btnRef}
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors"
        >
          <LayoutGrid className="w-4 h-4 text-slate-500" />
          בחר מדדים
        </button>
      </div>

      {pickerOpen && (
        <div
          ref={popoverRef}
          className="absolute left-4 top-full mt-2 z-50 w-[min(100%,22rem)] rounded-2xl border border-slate-200 bg-white shadow-elevated p-4 max-h-[min(70vh,420px)] overflow-y-auto"
          dir="rtl"
        >
          <p className="text-xs text-slate-500 mb-3 font-medium">מדדים להצגה</p>
          <ul className="space-y-1 mb-4">
            {DISTRIBUTION_V2_SUMMARY_METRIC_ORDER.map((m) => (
              <li key={m.key}>
                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 hover:bg-slate-50 rounded-lg px-2 py-2">
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(m.key)}
                    onChange={() => toggleMetric(m.key)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500/30"
                  />
                  <span>{m.label}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={selectAll} className="text-xs font-semibold text-primary-600 hover:text-primary-700">
              הכל
            </button>
            <button type="button" onClick={selectDefaults} className="text-xs font-medium text-slate-500 hover:text-slate-700">
              ברירת מחדל
            </button>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-5">
        {orderedDisplay.length === 0 ? (
          <p className="text-sm text-amber-800 bg-amber-50/80 border border-amber-100 rounded-xl px-4 py-3">
            לא נבחרו מדדים — לחץ על &quot;בחר מדדים&quot;.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {orderedDisplay.map((item) => (
              <KpiItem key={item.key} label={item.label} value={item.value} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3 text-center hover:bg-slate-50 transition-colors">
      <p className="text-[11px] sm:text-xs font-semibold text-slate-500 leading-snug mb-1.5 line-clamp-2 min-h-[2rem] flex items-end justify-center">
        {label}
      </p>
      <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums tracking-tight break-words">
        {value}
      </p>
    </div>
  );
}
