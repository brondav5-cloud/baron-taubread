"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, GitCompare, X, Check } from "lucide-react";
import { clsx } from "clsx";
import type { UsePeriodSelectorReturn } from "@/hooks/usePeriodSelector";
import { MONTH_NAMES_SHORT } from "@/lib/periodUtils";

// ============================================
// TYPES
// ============================================

interface SmartPeriodSelectorProps {
  selector: UsePeriodSelectorReturn;
  showCompare?: boolean;
  showDisplayMode?: boolean;
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export function SmartPeriodSelector({
  selector,
  showCompare = true,
  showDisplayMode = true,
  className = "",
}: SmartPeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"primary" | "compare">("primary");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
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

  const { primary, compare, available } = selector;

  // Get unique years for display
  const years = available.years.map((y) => y.year);

  return (
    <div className={clsx("relative", className)} ref={dropdownRef}>
      {/* ========== TRIGGER BUTTON ========== */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
          "bg-white border-2 hover:border-blue-300 shadow-sm",
          isOpen ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200",
        )}
      >
        <Calendar className="w-4 h-4 text-blue-500" />
        <span className="text-gray-900">{primary.label}</span>

        {compare.enabled && (
          <>
            <span className="text-gray-400 mx-1">vs</span>
            <span className="text-orange-600">{compare.label}</span>
          </>
        )}

        <ChevronDown
          className={clsx(
            "w-4 h-4 text-gray-400 transition-transform mr-1",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* ========== DROPDOWN ========== */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[440px] bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* ===== HEADER ===== */}
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("primary")}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  activeTab === "primary"
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:bg-gray-100",
                )}
              >
                תקופה ראשית
              </button>

              {showCompare &&
                (compare.enabled ? (
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
                    onClick={() => {
                      selector.enableCompare();
                      setActiveTab("compare");
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50"
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    הוסף השוואה
                  </button>
                ))}
            </div>

            {compare.enabled && (
              <button
                onClick={selector.disableCompare}
                className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                בטל השוואה
              </button>
            )}

            {/* Clear selection button */}
            {activeTab === "primary" && primary.type !== "custom" && (
              <button
                onClick={() => selector.clearPrimary()}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                נקה בחירה
              </button>
            )}
          </div>

          {/* ===== CONTENT ===== */}
          <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2">
              {/* Years */}
              {available.years.slice(0, 3).map((yearData) => (
                <button
                  key={yearData.year}
                  onClick={() => {
                    if (activeTab === "primary") {
                      selector.selectYear(yearData.year);
                    } else {
                      selector.selectCompareYear(yearData.year);
                    }
                  }}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    (activeTab === "primary" ? primary : compare).key ===
                      String(yearData.year)
                      ? activeTab === "primary"
                        ? "bg-blue-500 text-white"
                        : "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  )}
                >
                  {yearData.year}
                  {!yearData.complete && (
                    <span className="text-xs opacity-70">*</span>
                  )}
                </button>
              ))}

              {/* Halves */}
              {available.halves.slice(0, 4).map((half) => (
                <button
                  key={half.key}
                  onClick={() => {
                    if (activeTab === "primary") {
                      selector.selectHalf(half.year, half.half);
                    } else {
                      selector.selectCompareHalf(half.year, half.half);
                    }
                  }}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    (activeTab === "primary" ? primary : compare).key ===
                      half.key
                      ? activeTab === "primary"
                        ? "bg-blue-500 text-white"
                        : "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  )}
                >
                  {half.label}
                </button>
              ))}

              {/* Quarters */}
              {available.quarters.slice(0, 4).map((quarter) => (
                <button
                  key={quarter.key}
                  onClick={() => {
                    if (activeTab === "primary") {
                      selector.selectQuarter(quarter.year, quarter.quarter);
                    } else {
                      selector.selectCompareQuarter(
                        quarter.year,
                        quarter.quarter,
                      );
                    }
                  }}
                  className={clsx(
                    "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                    (activeTab === "primary" ? primary : compare).key ===
                      quarter.key
                      ? activeTab === "primary"
                        ? "bg-blue-500 text-white"
                        : "bg-orange-500 text-white"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100",
                  )}
                >
                  {quarter.label}
                </button>
              ))}
            </div>

            {/* Months by Year */}
            {years.map((year) => {
              const yearMonths = available.months.filter(
                (m) => m.year === year,
              );
              if (yearMonths.length === 0) return null;

              return (
                <div key={year}>
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    {year}
                  </p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((monthNum) => {
                      const monthData = yearMonths.find(
                        (m) => m.month === monthNum,
                      );
                      const isAvailable = !!monthData;
                      const isSelected =
                        isAvailable &&
                        (activeTab === "primary"
                          ? primary.months.includes(monthData.key)
                          : compare.months.includes(monthData.key));

                      return (
                        <button
                          key={monthNum}
                          disabled={!isAvailable}
                          onClick={() => {
                            if (!isAvailable || !monthData) return;
                            if (activeTab === "primary") {
                              selector.toggleMonth(monthData.key);
                            } else {
                              selector.toggleCompareMonth(monthData.key);
                            }
                          }}
                          className={clsx(
                            "px-2 py-2 rounded-lg text-xs font-medium transition-colors relative",
                            !isAvailable &&
                              "bg-gray-50 text-gray-300 cursor-not-allowed",
                            isAvailable &&
                              !isSelected &&
                              "bg-gray-100 text-gray-700 hover:bg-gray-200",
                            isAvailable &&
                              isSelected &&
                              (activeTab === "primary"
                                ? "bg-blue-500 text-white"
                                : "bg-orange-500 text-white"),
                          )}
                        >
                          {MONTH_NAMES_SHORT[monthNum - 1]}
                          {isSelected && (
                            <Check className="w-3 h-3 absolute top-0.5 left-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Compare Summary */}
            {compare.enabled && (
              <div className="p-3 bg-gradient-to-r from-blue-50 to-orange-50 rounded-xl">
                <div className="flex items-center justify-center gap-3 text-sm">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-medium">
                    {primary.label}
                  </span>
                  <GitCompare className="w-4 h-4 text-gray-400" />
                  <span
                    className={clsx(
                      "px-3 py-1 rounded-lg font-medium",
                      compare.months.length > 0
                        ? "bg-orange-100 text-orange-700"
                        : "bg-gray-100 text-gray-500",
                    )}
                  >
                    {compare.months.length > 0
                      ? compare.label
                      : "בחר תקופה להשוואה"}
                  </span>
                </div>

                {/* Display Mode Selector - only show when compare has months */}
                {showDisplayMode && compare.months.length > 0 && (
                  <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-200/50">
                    <span className="text-xs text-gray-500">תצוגה:</span>
                    <button
                      onClick={() => selector.setDisplayMode("columns")}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                        selector.displayMode === "columns"
                          ? "bg-blue-500 text-white"
                          : "bg-white/80 text-gray-600 hover:bg-white border",
                      )}
                    >
                      ▥ עמודות
                    </button>
                    <button
                      onClick={() => selector.setDisplayMode("rows")}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                        selector.displayMode === "rows"
                          ? "bg-blue-500 text-white"
                          : "bg-white/80 text-gray-600 hover:bg-white border",
                      )}
                    >
                      ☰ שורות
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===== FOOTER ===== */}
          <div className="p-3 border-t bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {primary.months.length} חודשים נבחרו
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              אישור
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SmartPeriodSelector;
