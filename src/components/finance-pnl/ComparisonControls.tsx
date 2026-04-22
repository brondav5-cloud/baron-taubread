"use client";

import { useMemo, useState } from "react";
import { monthLabel } from "./format";

interface Props {
  months: string[];
  selectedMonths: string[];
  onChange: (months: string[]) => void;
}

function uniqueSorted(months: string[]): string[] {
  return Array.from(new Set(months)).sort((a, b) => a.localeCompare(b));
}

export default function ComparisonControls({ months, selectedMonths, onChange }: Props) {
  const [fromMonth, setFromMonth] = useState(months[0] ?? "");
  const [toMonth, setToMonth] = useState(months[months.length - 1] ?? "");

  const selectedSet = useMemo(() => new Set(selectedMonths), [selectedMonths]);

  function toggleMonth(month: string) {
    if (selectedSet.has(month)) {
      onChange(selectedMonths.filter((m) => m !== month));
      return;
    }
    onChange(uniqueSorted([...selectedMonths, month]));
  }

  function setSmartLast(count: number) {
    onChange(months.slice(-Math.min(count, months.length)));
  }

  function applyRange() {
    if (!fromMonth || !toMonth) return;
    const start = months.indexOf(fromMonth);
    const end = months.indexOf(toMonth);
    if (start < 0 || end < 0) return;
    const [minIdx, maxIdx] = start <= end ? [start, end] : [end, start];
    onChange(months.slice(minIdx, maxIdx + 1));
  }

  if (months.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-medium text-gray-700">השוואת חודשים חכמה</p>
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setSmartLast(2)}
            className="text-[11px] px-2 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            חכם: 2 חודשים אחרונים
          </button>
          <button
            type="button"
            onClick={() => setSmartLast(3)}
            className="text-[11px] px-2 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            חכם: 3 חודשים אחרונים
          </button>
          <button
            type="button"
            onClick={() => onChange(months)}
            className="text-[11px] px-2 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            כל החודשים
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
          {months.map((m) => <option key={`from-${m}`} value={m}>{monthLabel(m)}</option>)}
        </select>
        <span className="text-xs text-gray-400">עד</span>
        <select value={toMonth} onChange={(e) => setToMonth(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
          {months.map((m) => <option key={`to-${m}`} value={m}>{monthLabel(m)}</option>)}
        </select>
        <button
          type="button"
          onClick={applyRange}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          החל טווח
        </button>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {months.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => toggleMonth(m)}
            className={`text-[11px] px-2 py-0.5 rounded-full border ${
              selectedSet.has(m) ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {monthLabel(m)}
          </button>
        ))}
      </div>
    </div>
  );
}
