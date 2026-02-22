"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Check } from "lucide-react";
import { clsx } from "clsx";

export interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
  renderOption?: (option: string) => string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "הכל",
  label,
  renderOption,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const getDisplayLabel = (option: string) =>
    renderOption ? renderOption(option) : option;

  const displayText =
    selected.length === 0
      ? placeholder
      : selected.length === 1 && selected[0]
        ? getDisplayLabel(selected[0])
        : `${selected.length} נבחרו`;

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="block text-xs text-gray-500 mb-1">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-xl text-sm min-w-[140px] w-full",
          "border-2 transition-colors",
          isOpen ? "border-primary-400" : "border-transparent",
          selected.length > 0 ? "bg-primary-50" : "",
        )}
      >
        <span
          className={
            selected.length > 0
              ? "text-primary-700 font-medium"
              : "text-gray-600"
          }
        >
          {displayText}
        </span>
        <div className="flex items-center gap-1">
          {selected.length > 0 && (
            <span
              onClick={clear}
              className="p-0.5 hover:bg-primary-200 rounded"
            >
              <X className="w-3 h-3 text-primary-600" />
            </span>
          )}
          <ChevronDown
            className={clsx(
              "w-4 h-4 text-gray-400 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1 w-full min-w-[200px] bg-white rounded-xl shadow-lg border max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 text-center">
              אין אפשרויות
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className={clsx(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm text-right hover:bg-gray-50 transition-colors",
                  selected.includes(option) && "bg-primary-50",
                )}
              >
                <div
                  className={clsx(
                    "w-4 h-4 rounded border flex items-center justify-center",
                    selected.includes(option)
                      ? "bg-primary-500 border-primary-500"
                      : "border-gray-300",
                  )}
                >
                  {selected.includes(option) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <span>{getDisplayLabel(option)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
