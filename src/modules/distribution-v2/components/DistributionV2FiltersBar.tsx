"use client";

import { useMemo, useState, useEffect } from "react";
import { X, Calendar, Star } from "lucide-react";
import type { DistributionV2Filters, DistributionV2FilterOptions } from "../types";
import {
  HOLIDAY_DEFINITIONS,
  findHolidayAnchorGregorian,
  buildHolidayDateRange,
  formatHebrewDateRange,
  type HolidayWindowMode,
} from "../lib/jewishHolidays";

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Full previous calendar month (same range as initial screen default). */
function getLastCompletedMonthRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const lastDay = new Date(y, m, 0);
  const firstDay = new Date(y, m - 1, 1);
  return { from: toDateStr(firstDay), to: toDateStr(lastDay) };
}

function getPresetRange(preset: "month" | "quarter" | "year"): { from: string; to: string } {
  const now = new Date();
  const today = toDateStr(now);
  if (preset === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toDateStr(from), to: today };
  }
  if (preset === "quarter") {
    const q = Math.floor(now.getMonth() / 3) + 1;
    const from = new Date(now.getFullYear(), (q - 1) * 3, 1);
    const to = new Date(now.getFullYear(), q * 3, 0);
    return { from: toDateStr(from), to: toDateStr(to) };
  }
  const from = new Date(now.getFullYear(), 0, 1);
  return { from: toDateStr(from), to: today };
}

const HOLIDAY_MODE_OPTIONS: { value: HolidayWindowMode; label: string; hint: string }[] = [
  { value: "week_of", label: "השבוע של החג", hint: "ראשון–שבת שבו חל יום החג" },
  { value: "week_before", label: "שבוע לפני", hint: "השבוע הקלנדרי שלפני שבוע החג" },
  { value: "week_after", label: "שבוע אחרי", hint: "השבוע הקלנדרי שלאחר שבוע החג" },
  { value: "days_before", label: "ימים לפני החג", hint: "טווח שמסתיים יום לפני החג" },
  { value: "days_after", label: "ימים אחרי החג", hint: "מתחיל יום אחרי החג" },
];

interface DistributionV2FiltersBarProps {
  open: boolean;
  filters: DistributionV2Filters;
  options: DistributionV2FilterOptions;
  onUpdate: (key: keyof DistributionV2Filters, value: string | string[]) => void;
  onClear: () => void;
  activeCount: number;
}

export function DistributionV2FiltersBar({
  open,
  filters,
  options,
  onUpdate,
  onClear,
  activeCount,
}: DistributionV2FiltersBarProps) {
  const yNow = new Date().getFullYear();
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [hYear, setHYear] = useState(yNow);

  // Draft dates: user edits without triggering fetch; "הצג" applies them
  const [draftDateFrom, setDraftDateFrom] = useState(filters.dateFrom ?? "");
  const [draftDateTo, setDraftDateTo] = useState(filters.dateTo ?? "");
  useEffect(() => {
    setDraftDateFrom(filters.dateFrom ?? "");
    setDraftDateTo(filters.dateTo ?? "");
  }, [filters.dateFrom, filters.dateTo]);
  const [hHolidayId, setHHolidayId] = useState(HOLIDAY_DEFINITIONS[0]!.id);
  const [hMode, setHMode] = useState<HolidayWindowMode>("week_of");
  const [hDayCount, setHDayCount] = useState(7);
  const [hError, setHError] = useState<string | null>(null);

  const yearOptions = useMemo(() => [yNow - 1, yNow, yNow + 1, yNow + 2], [yNow]);

  const holidayPreview = useMemo(() => {
    const def = HOLIDAY_DEFINITIONS.find((d) => d.id === hHolidayId);
    if (!def) return null;
    const anchor = findHolidayAnchorGregorian(hYear, def);
    if (!anchor) return { error: "לא נמצא תאריך לחג בשנה זו (לוח שנה ישראל)." as const };
    const { from, to } = buildHolidayDateRange(anchor, hMode, hDayCount);
    return {
      anchor,
      from,
      to,
      label: def.labelHe,
      rangeStr: formatHebrewDateRange(from, to),
    };
  }, [hYear, hHolidayId, hMode, hDayCount]);

  const applyHolidayRange = () => {
    if (!holidayPreview) {
      setHError("בחרו חג ושנה");
      return;
    }
    if ("error" in holidayPreview) {
      setHError("לא נמצא תאריך לחג בשנה זו (לוח שנה ישראל).");
      return;
    }
    setHError(null);
    onUpdate("dateFrom", toDateStr(holidayPreview.from));
    onUpdate("dateTo", toDateStr(holidayPreview.to));
    setHolidayOpen(false);
  };

  if (!open) return null;

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-soft border border-slate-200/90 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="text-sm font-bold text-slate-800 tracking-tight">סינון נתונים</h3>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm font-semibold text-slate-500 hover:text-red-600 flex items-center gap-1.5 px-1.5 py-1.5 rounded"
          >
            <X className="w-4 h-4" />
            נקה ({activeCount})
          </button>
        )}
      </div>
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          תאריך מהיר
        </span>
        <div className="flex flex-wrap gap-2">
          {(["month", "quarter", "year"] as const).map((preset) => {
            const labels = { month: "החודש", quarter: "הרבעון", year: "השנה" };
            const { from, to } = getPresetRange(preset);
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  onUpdate("dateFrom", from);
                  onUpdate("dateTo", to);
                }}
                className="px-3.5 py-2 rounded-xl text-sm font-semibold border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:border-slate-300 transition-colors"
              >
                {labels[preset]}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              const { from, to } = getLastCompletedMonthRange();
              onUpdate("dateFrom", from);
              onUpdate("dateTo", to);
            }}
            className="px-3.5 py-2 rounded-xl text-sm font-semibold border border-primary-200 bg-primary-50 text-primary-800 hover:bg-primary-100/80 hover:border-primary-300 transition-colors"
          >
            חודש שעבר
          </button>
          <button
            type="button"
            onClick={() => {
              setHolidayOpen((v) => !v);
              setHError(null);
            }}
            className={[
              "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors",
              holidayOpen
                ? "border-amber-400 bg-amber-50 text-amber-950 ring-1 ring-amber-200/60"
                : "border-amber-200/90 bg-gradient-to-b from-amber-50/90 to-white text-amber-950 hover:border-amber-300 hover:bg-amber-50",
            ].join(" ")}
            aria-expanded={holidayOpen}
          >
            <Star className="w-4 h-4 text-amber-600 shrink-0 fill-amber-200/50" />
            חגים
          </button>
        </div>

        {holidayOpen && (
          <div
            className="mt-4 rounded-2xl border border-amber-200/70 bg-gradient-to-b from-amber-50/50 to-white p-4 sm:p-5 space-y-4 shadow-sm"
            role="region"
            aria-label="סינון לפי חג"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-100/80 pb-3">
              <div>
                <p className="text-sm font-bold text-amber-950">טווח לפי חג (לוח ישראל)</p>
                <p className="text-xs text-amber-900/70 mt-1 max-w-xl leading-relaxed">
                  בוחרים חג, מגדירים את החלון סביבו (שבוע / ימים), ומחילים על &quot;מתאריך&quot; ו־&quot;עד
                  תאריך&quot;. השבוע מחושב ראשון–שבת כמו בלוח רגיל בישראל.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-900/80">שנה אזרחית</label>
                <select
                  value={hYear}
                  onChange={(e) => setHYear(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-amber-200/80 bg-white text-sm font-medium text-slate-800"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-900/80">חג (נקודת ייחוס)</label>
                <select
                  value={hHolidayId}
                  onChange={(e) => setHHolidayId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-amber-200/80 bg-white text-sm font-medium text-slate-800"
                >
                  {HOLIDAY_DEFINITIONS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.labelHe}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-amber-900/80">סוג חלון</span>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {HOLIDAY_MODE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={[
                      "flex flex-col gap-0.5 cursor-pointer rounded-xl border px-3 py-2.5 transition-colors",
                      hMode === opt.value
                        ? "border-primary-500 bg-primary-50/80 ring-1 ring-primary-200/50"
                        : "border-slate-200/90 bg-white hover:border-amber-200",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="holiday-mode"
                        value={opt.value}
                        checked={hMode === opt.value}
                        onChange={() => setHMode(opt.value)}
                        className="text-primary-600 focus:ring-primary-500/30"
                      />
                      <span className="text-sm font-semibold text-slate-800">{opt.label}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 mr-6 leading-snug">{opt.hint}</span>
                  </label>
                ))}
              </div>
            </div>

            {(hMode === "days_before" || hMode === "days_after") && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-amber-900/80">מספר ימים (1–30)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={hDayCount}
                    onChange={(e) => setHDayCount(Number(e.target.value) || 7)}
                    className="w-24 px-3 py-2 rounded-xl border border-amber-200/80 bg-white text-sm font-medium"
                  />
                </div>
                <p className="text-xs text-slate-600 pb-1">
                  {hMode === "days_before"
                    ? `${hDayCount} הימים שמסתיימים יום לפני החג.`
                    : `${hDayCount} הימים שמתחילים יום אחרי החג.`}
                </p>
              </div>
            )}

            <div
              className={[
                "rounded-xl px-4 py-3 text-sm",
                holidayPreview && "error" in holidayPreview
                  ? "bg-red-50 border border-red-100 text-red-800"
                  : "bg-white border border-amber-100/90 text-slate-800",
              ].join(" ")}
            >
              {holidayPreview && "error" in holidayPreview ? (
                <span>{holidayPreview.error}</span>
              ) : holidayPreview ? (
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">
                    <span className="text-amber-800">{holidayPreview.label}</span>
                    <span className="text-slate-400 font-normal mx-1">·</span>
                    {hYear}
                  </p>
                  <p className="tabular-nums font-semibold text-primary-800">{holidayPreview.rangeStr}</p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-2">
                    הנתונים במסך חלוקה מפורטים לפי <strong>חודש</strong> — בפועל יוצגו כל החודשים שנוגעים בטווח
                    (למשל טווח שחוצה חודשים יכלול את שני החודשים).
                  </p>
                </div>
              ) : null}
            </div>

            {hError && <p className="text-xs font-medium text-red-600">{hError}</p>}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={applyHolidayRange}
                className="px-4 py-2.5 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 shadow-sm transition-colors"
              >
                החל על סינון התאריכים
              </button>
              <button
                type="button"
                onClick={() => setHolidayOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200"
              >
                סגור
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="group" aria-label="סינון לפי תאריך וערכים">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-500">מתאריך</label>
          <input
            type="date"
            value={draftDateFrom}
            onChange={(e) => setDraftDateFrom(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 bg-slate-50/30 focus:ring-2 focus:ring-primary-500/15 focus:border-primary-400"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-500">עד תאריך</label>
          <input
            type="date"
            value={draftDateTo}
            onChange={(e) => setDraftDateTo(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 bg-slate-50/30 focus:ring-2 focus:ring-primary-500/15 focus:border-primary-400"
          />
        </div>
        <div className="space-y-2 flex flex-col justify-end">
          <button
            type="button"
            onClick={() => {
              onUpdate("dateFrom", draftDateFrom);
              onUpdate("dateTo", draftDateTo);
            }}
            disabled={!draftDateFrom || !draftDateTo}
            className="px-4 py-2.5 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            הצג
          </button>
        </div>
        <FilterSelect
          label="עיר"
          options={options.cities}
          selected={filters.cities}
          onChange={(v) => onUpdate("cities", v)}
        />
        <FilterSelect
          label="רשת"
          options={options.networks}
          selected={filters.networks}
          onChange={(v) => onUpdate("networks", v)}
        />
        <FilterSelect
          label="נהג"
          options={options.drivers}
          selected={filters.drivers}
          onChange={(v) => onUpdate("drivers", v)}
        />
        <FilterSelect
          label="סוכן"
          options={options.agents}
          selected={filters.agents}
          onChange={(v) => onUpdate("agents", v)}
        />
      </div>
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-500">חיפוש</label>
        <input
          type="text"
          placeholder="חנות, מוצר, עיר, רשת…"
          value={filters.search}
          onChange={(e) => onUpdate("search", e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-primary-500/15 focus:border-primary-400"
        />
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-500">{label}</label>
      <select
        value=""
        onChange={(e) => e.target.value && toggle(e.target.value)}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-slate-50/30 text-slate-800"
      >
        <option value="">בחר {label}...</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {selected.includes(o) ? "✓ " : ""}{o}
          </option>
        ))}
      </select>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-lg font-medium"
            >
              {s}
              <button type="button" onClick={() => toggle(s)} className="hover:text-slate-900 p-1.5 rounded hover:bg-slate-200/80">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
