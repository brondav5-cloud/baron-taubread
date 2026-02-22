"use client";

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { clsx } from "clsx";

export type PeriodType = "year" | "half" | "quarter" | "month" | "custom";

export interface PeriodSelection {
  type: PeriodType;
  year: number;
  months: number[]; // 1-12
  compareEnabled: boolean;
  compareYear?: number;
  compareMonths?: number[];
}

interface Props {
  period: PeriodSelection;
  onChange: (period: PeriodSelection) => void;
}

const MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

const PERIOD_PRESETS: { type: PeriodType; label: string; months: number[] }[] =
  [
    {
      type: "year",
      label: "שנה מלאה",
      months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    },
    { type: "half", label: "חצי שנה ראשון", months: [1, 2, 3, 4, 5, 6] },
    { type: "half", label: "חצי שנה שני", months: [7, 8, 9, 10, 11, 12] },
    { type: "quarter", label: "Q1", months: [1, 2, 3] },
    { type: "quarter", label: "Q2", months: [4, 5, 6] },
    { type: "quarter", label: "Q3", months: [7, 8, 9] },
    { type: "quarter", label: "Q4", months: [10, 11, 12] },
  ];

export function ProfitabilityPeriodSelector({ period, onChange }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  const handlePresetClick = (preset: (typeof PERIOD_PRESETS)[0]) => {
    onChange({
      ...period,
      type: preset.type,
      months: preset.months,
    });
    setShowDropdown(false);
  };

  const handleMonthToggle = (month: number) => {
    const newMonths = period.months.includes(month)
      ? period.months.filter((m) => m !== month)
      : [...period.months, month].sort((a, b) => a - b);

    onChange({
      ...period,
      type: "custom",
      months: newMonths.length > 0 ? newMonths : [month],
    });
  };

  const handleCompareToggle = () => {
    onChange({
      ...period,
      compareEnabled: !period.compareEnabled,
      compareYear: !period.compareEnabled ? period.year - 1 : undefined,
      compareMonths: !period.compareEnabled ? period.months : undefined,
    });
  };

  const getPeriodLabel = (): string => {
    if (period.months.length === 12) return `שנת ${period.year}`;
    if (period.months.length === 6) {
      const firstMonth = period.months[0];
      return firstMonth === 1 ? `H1 ${period.year}` : `H2 ${period.year}`;
    }
    if (period.months.length === 3) {
      const firstMonth = period.months[0];
      const q = Math.ceil((firstMonth ?? 1) / 3);
      return `Q${q} ${period.year}`;
    }
    if (period.months.length === 1) {
      const monthIndex = period.months[0];
      const monthName = monthIndex !== undefined ? MONTHS[monthIndex - 1] : "";
      return `${monthName} ${period.year}`;
    }
    return `${period.months.length} חודשים`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Period Selector */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-900">
              {getPeriodLabel()}
            </span>
            <ChevronDown
              className={clsx(
                "w-4 h-4 text-gray-500 transition-transform",
                showDropdown && "rotate-180",
              )}
            />
          </button>

          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border z-20 p-2">
                <div className="space-y-1">
                  {PERIOD_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePresetClick(preset)}
                      className="w-full text-right px-3 py-2 rounded-lg hover:bg-gray-100 text-sm transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                  <hr className="my-2" />
                  <button
                    onClick={() => {
                      setShowMonthPicker(true);
                      setShowDropdown(false);
                    }}
                    className="w-full text-right px-3 py-2 rounded-lg hover:bg-gray-100 text-sm text-blue-600 font-medium"
                  >
                    בחירה מותאמת אישית...
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Year Selector */}
        <select
          value={period.year}
          onChange={(e) =>
            onChange({ ...period, year: parseInt(e.target.value) })
          }
          className="px-4 py-2.5 bg-gray-100 rounded-xl border-0 text-sm font-medium"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        {/* Compare Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={period.compareEnabled}
            onChange={handleCompareToggle}
            className="w-4 h-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">השווה לשנה קודמת</span>
        </label>

        {period.compareEnabled && (
          <select
            value={period.compareYear}
            onChange={(e) =>
              onChange({ ...period, compareYear: parseInt(e.target.value) })
            }
            className="px-3 py-2 bg-blue-50 rounded-lg border-0 text-sm text-blue-700"
          >
            {years
              .filter((y) => y !== period.year)
              .map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
          </select>
        )}
      </div>

      {/* Month Picker Modal */}
      {showMonthPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96">
            <h3 className="text-lg font-bold mb-4">בחר חודשים</h3>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {MONTHS.map((month, idx) => (
                <button
                  key={idx}
                  onClick={() => handleMonthToggle(idx + 1)}
                  className={clsx(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    period.months.includes(idx + 1)
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  )}
                >
                  {month.slice(0, 3)}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowMonthPicker(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
              >
                אישור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
