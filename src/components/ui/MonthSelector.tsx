"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, GitCompare } from "lucide-react";
import { clsx } from "clsx";

// All available months
const ALL_MONTHS = [
  { id: "202401", label: "ינו 24", short: "ינו", year: 2024, month: 1 },
  { id: "202402", label: "פבר 24", short: "פבר", year: 2024, month: 2 },
  { id: "202403", label: "מרץ 24", short: "מרץ", year: 2024, month: 3 },
  { id: "202404", label: "אפר 24", short: "אפר", year: 2024, month: 4 },
  { id: "202405", label: "מאי 24", short: "מאי", year: 2024, month: 5 },
  { id: "202406", label: "יונ 24", short: "יונ", year: 2024, month: 6 },
  { id: "202407", label: "יול 24", short: "יול", year: 2024, month: 7 },
  { id: "202408", label: "אוג 24", short: "אוג", year: 2024, month: 8 },
  { id: "202409", label: "ספט 24", short: "ספט", year: 2024, month: 9 },
  { id: "202410", label: "אוק 24", short: "אוק", year: 2024, month: 10 },
  { id: "202411", label: "נוב 24", short: "נוב", year: 2024, month: 11 },
  { id: "202412", label: "דצמ 24", short: "דצמ", year: 2024, month: 12 },
  { id: "202501", label: "ינו 25", short: "ינו", year: 2025, month: 1 },
  { id: "202502", label: "פבר 25", short: "פבר", year: 2025, month: 2 },
  { id: "202503", label: "מרץ 25", short: "מרץ", year: 2025, month: 3 },
  { id: "202504", label: "אפר 25", short: "אפר", year: 2025, month: 4 },
  { id: "202505", label: "מאי 25", short: "מאי", year: 2025, month: 5 },
  { id: "202506", label: "יונ 25", short: "יונ", year: 2025, month: 6 },
  { id: "202507", label: "יול 25", short: "יול", year: 2025, month: 7 },
  { id: "202508", label: "אוג 25", short: "אוג", year: 2025, month: 8 },
  { id: "202509", label: "ספט 25", short: "ספט", year: 2025, month: 9 },
  { id: "202510", label: "אוק 25", short: "אוק", year: 2025, month: 10 },
  { id: "202511", label: "נוב 25", short: "נוב", year: 2025, month: 11 },
  { id: "202512", label: "דצמ 25", short: "דצמ", year: 2025, month: 12 },
  { id: "202601", label: "ינו 26", short: "ינו", year: 2026, month: 1 },
  { id: "202602", label: "פבר 26", short: "פבר", year: 2026, month: 2 },
  { id: "202603", label: "מרץ 26", short: "מרץ", year: 2026, month: 3 },
  { id: "202604", label: "אפר 26", short: "אפר", year: 2026, month: 4 },
  { id: "202605", label: "מאי 26", short: "מאי", year: 2026, month: 5 },
  { id: "202606", label: "יונ 26", short: "יונ", year: 2026, month: 6 },
  { id: "202607", label: "יול 26", short: "יול", year: 2026, month: 7 },
  { id: "202608", label: "אוג 26", short: "אוג", year: 2026, month: 8 },
  { id: "202609", label: "ספט 26", short: "ספט", year: 2026, month: 9 },
  { id: "202610", label: "אוק 26", short: "אוק", year: 2026, month: 10 },
  { id: "202611", label: "נוב 26", short: "נוב", year: 2026, month: 11 },
  { id: "202612", label: "דצמ 26", short: "דצמ", year: 2026, month: 12 },
];

// Quick select presets
const PRESETS = [
  {
    id: "h1_2026",
    label: "H1 2026",
    months: ["202601", "202602", "202603", "202604", "202605", "202606"],
  },
  { id: "q1_2026", label: "Q1 2026", months: ["202601", "202602", "202603"] },
  {
    id: "h2_2025",
    label: "H2 2025",
    months: ["202507", "202508", "202509", "202510", "202511", "202512"],
  },
  {
    id: "h1_2025",
    label: "H1 2025",
    months: ["202501", "202502", "202503", "202504", "202505", "202506"],
  },
  { id: "q4_2025", label: "Q4 2025", months: ["202510", "202511", "202512"] },
  { id: "q3_2025", label: "Q3 2025", months: ["202507", "202508", "202509"] },
  {
    id: "year_2026",
    label: "2026",
    months: [
      "202601",
      "202602",
      "202603",
      "202604",
      "202605",
      "202606",
      "202607",
      "202608",
      "202609",
      "202610",
      "202611",
      "202612",
    ],
  },
  {
    id: "year_2025",
    label: "2025",
    months: [
      "202501",
      "202502",
      "202503",
      "202504",
      "202505",
      "202506",
      "202507",
      "202508",
      "202509",
      "202510",
      "202511",
      "202512",
    ],
  },
  {
    id: "year_2024",
    label: "2024",
    months: [
      "202401",
      "202402",
      "202403",
      "202404",
      "202405",
      "202406",
      "202407",
      "202408",
      "202409",
      "202410",
      "202411",
      "202412",
    ],
  },
];

export interface MonthSelection {
  months: string[];
  compareMonths: string[];
  isCompareMode: boolean;
  compareDisplayMode: "rows" | "tables" | "columns"; // New: display mode for comparison
}

interface MonthSelectorProps {
  value: MonthSelection;
  onChange: (value: MonthSelection) => void;
}

export function MonthSelector({ value, onChange }: MonthSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"main" | "compare">("main");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMonth = (monthId: string, isCompare: boolean = false) => {
    if (isCompare) {
      const newMonths = value.compareMonths.includes(monthId)
        ? value.compareMonths.filter((m) => m !== monthId)
        : [...value.compareMonths, monthId];
      onChange({ ...value, compareMonths: newMonths });
    } else {
      const newMonths = value.months.includes(monthId)
        ? value.months.filter((m) => m !== monthId)
        : [...value.months, monthId];
      onChange({ ...value, months: newMonths });
    }
  };

  const applyPreset = (
    preset: (typeof PRESETS)[0],
    isCompare: boolean = false,
  ) => {
    if (isCompare) {
      onChange({ ...value, compareMonths: preset.months });
    } else {
      onChange({ ...value, months: preset.months });
    }
  };

  const clearCompare = () => {
    onChange({ ...value, compareMonths: [], isCompareMode: false });
    setActiveTab("main");
  };

  const enableCompare = () => {
    onChange({ ...value, isCompareMode: true });
    setActiveTab("compare");
  };

  // Get display label
  const getDisplayLabel = (months: string[]) => {
    if (months.length === 0) return "בחר";
    if (months.length === 1) {
      return ALL_MONTHS.find((x) => x.id === months[0])?.label || "";
    }
    if (months.length <= 2) {
      return months
        .map((id) => ALL_MONTHS.find((x) => x.id === id)?.label)
        .join(", ");
    }
    const preset = PRESETS.find(
      (p) =>
        p.months.length === months.length &&
        p.months.every((m) => months.includes(m)),
    );
    if (preset) return preset.label;
    return `${months.length} חודשים`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all",
          "bg-white border-2 hover:border-primary-300",
          isOpen ? "border-primary-500" : "border-gray-200",
        )}
      >
        <Calendar className="w-4 h-4 text-primary-500" />
        <span className="text-primary-700">
          {getDisplayLabel(value.months)}
        </span>
        {value.isCompareMode && value.compareMonths.length > 0 && (
          <>
            <span className="text-gray-400">vs</span>
            <span className="text-orange-600">
              {getDisplayLabel(value.compareMonths)}
            </span>
          </>
        )}
        <ChevronDown
          className={clsx(
            "w-4 h-4 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[420px] bg-white rounded-2xl shadow-xl border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("main")}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  activeTab === "main"
                    ? "bg-primary-500 text-white"
                    : "text-gray-600 hover:bg-gray-100",
                )}
              >
                תקופה ראשית
              </button>
              {value.isCompareMode ? (
                <button
                  onClick={() => setActiveTab("compare")}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    activeTab === "compare"
                      ? "bg-orange-500 text-white"
                      : "text-gray-600 hover:bg-gray-100",
                  )}
                >
                  להשוואה
                </button>
              ) : (
                <button
                  onClick={enableCompare}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50"
                >
                  <GitCompare className="w-3 h-3" />
                  הוסף השוואה
                </button>
              )}
            </div>
            {value.isCompareMode && (
              <button
                onClick={clearCompare}
                className="text-xs text-red-500 hover:text-red-600"
              >
                בטל השוואה
              </button>
            )}
          </div>

          <div className="p-4 space-y-4">
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => {
                const isSelected =
                  activeTab === "compare"
                    ? preset.months.every((m) =>
                        value.compareMonths.includes(m),
                      ) && preset.months.length === value.compareMonths.length
                    : preset.months.every((m) => value.months.includes(m)) &&
                      preset.months.length === value.months.length;
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset, activeTab === "compare")}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      isSelected
                        ? activeTab === "compare"
                          ? "bg-orange-500 text-white"
                          : "bg-primary-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Year 2026 */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">2026</p>
              <div className="grid grid-cols-6 gap-1.5">
                {ALL_MONTHS.filter((m) => m.year === 2026).map((month) => {
                  const isSelected =
                    activeTab === "compare"
                      ? value.compareMonths.includes(month.id)
                      : value.months.includes(month.id);
                  return (
                    <button
                      key={month.id}
                      onClick={() =>
                        toggleMonth(month.id, activeTab === "compare")
                      }
                      className={clsx(
                        "px-2 py-2 rounded-lg text-xs font-medium transition-colors",
                        isSelected
                          ? activeTab === "compare"
                            ? "bg-orange-500 text-white"
                            : "bg-primary-500 text-white"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100",
                      )}
                    >
                      {month.short}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Year 2025 */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">2025</p>
              <div className="grid grid-cols-6 gap-1.5">
                {ALL_MONTHS.filter((m) => m.year === 2025).map((month) => {
                  const isSelected =
                    activeTab === "compare"
                      ? value.compareMonths.includes(month.id)
                      : value.months.includes(month.id);
                  return (
                    <button
                      key={month.id}
                      onClick={() =>
                        toggleMonth(month.id, activeTab === "compare")
                      }
                      className={clsx(
                        "px-2 py-2 rounded-lg text-xs font-medium transition-colors",
                        isSelected
                          ? activeTab === "compare"
                            ? "bg-orange-500 text-white"
                            : "bg-primary-500 text-white"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100",
                      )}
                    >
                      {month.short}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Year 2024 */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">2024</p>
              <div className="grid grid-cols-6 gap-1.5">
                {ALL_MONTHS.filter((m) => m.year === 2024).map((month) => {
                  const isSelected =
                    activeTab === "compare"
                      ? value.compareMonths.includes(month.id)
                      : value.months.includes(month.id);
                  return (
                    <button
                      key={month.id}
                      onClick={() =>
                        toggleMonth(month.id, activeTab === "compare")
                      }
                      className={clsx(
                        "px-2 py-2 rounded-lg text-xs font-medium transition-colors",
                        isSelected
                          ? activeTab === "compare"
                            ? "bg-orange-500 text-white"
                            : "bg-primary-500 text-white"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100",
                      )}
                    >
                      {month.short}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compare Summary */}
            {value.isCompareMode && (
              <div className="p-3 bg-gradient-to-r from-primary-50 to-orange-50 rounded-xl text-sm space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded font-medium">
                    {getDisplayLabel(value.months)}
                  </span>
                  <GitCompare className="w-4 h-4 text-gray-400" />
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-medium">
                    {getDisplayLabel(value.compareMonths)}
                  </span>
                </div>

                {/* Display Mode Selector */}
                <div className="flex items-center justify-center gap-2 pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500">תצוגה:</span>
                  <button
                    onClick={() =>
                      onChange({ ...value, compareDisplayMode: "rows" })
                    }
                    className={clsx(
                      "px-3 py-1 rounded text-xs font-medium transition-colors",
                      value.compareDisplayMode === "rows"
                        ? "bg-primary-500 text-white"
                        : "bg-gray-100 hover:bg-gray-200",
                    )}
                  >
                    שורות
                  </button>
                  <button
                    onClick={() =>
                      onChange({ ...value, compareDisplayMode: "tables" })
                    }
                    className={clsx(
                      "px-3 py-1 rounded text-xs font-medium transition-colors",
                      value.compareDisplayMode === "tables"
                        ? "bg-primary-500 text-white"
                        : "bg-gray-100 hover:bg-gray-200",
                    )}
                  >
                    טבלאות
                  </button>
                  <button
                    onClick={() =>
                      onChange({ ...value, compareDisplayMode: "columns" })
                    }
                    className={clsx(
                      "px-3 py-1 rounded text-xs font-medium transition-colors",
                      value.compareDisplayMode === "columns"
                        ? "bg-primary-500 text-white"
                        : "bg-gray-100 hover:bg-gray-200",
                    )}
                  >
                    עמודות
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t bg-gray-50 flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600"
            >
              אישור
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Default selection
export const DEFAULT_MONTH_SELECTION: MonthSelection = {
  months: ["202507", "202508", "202509", "202510", "202511", "202512"],
  compareMonths: [],
  isCompareMode: false,
  compareDisplayMode: "rows",
};

// Helper to calculate totals for selected months
export function calcMonthlyTotals(
  item: {
    monthly_qty?: Record<string, number>;
    monthly_sales?: Record<string, number>;
    monthly_gross?: Record<string, number>;
    monthly_returns?: Record<string, number>;
  },
  months: string[],
) {
  let qty = 0,
    sales = 0,
    gross = 0,
    returns = 0;
  months.forEach((m) => {
    qty += item.monthly_qty?.[m] ?? 0;
    sales += item.monthly_sales?.[m] ?? 0;
    gross += item.monthly_gross?.[m] ?? 0;
    returns += item.monthly_returns?.[m] ?? 0;
  });
  return {
    qty,
    sales,
    gross,
    returns,
    returnsPct: gross > 0 ? (returns / gross) * 100 : 0,
  };
}

export { ALL_MONTHS, PRESETS };
