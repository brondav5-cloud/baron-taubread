"use client";

import { useState, useRef, useEffect } from "react";
import { Store, FileText, ChevronDown } from "lucide-react";
import { clsx } from "clsx";

export interface StoreOption {
  id: number;
  name: string;
  city?: string;
  agent?: string;
}

interface TaskTypeSelectorProps {
  taskType: "store" | "general";
  onTaskTypeChange: (type: "store" | "general") => void;
  storeId?: number;
  storeName?: string;
  initialStoreName?: string;
  onStoreSelect: (storeId: number, storeName: string) => void;
  onStoreNameChange: (name: string) => void;
  stores?: StoreOption[];
}

export function TaskTypeSelector({
  taskType,
  onTaskTypeChange,
  storeId,
  storeName,
  initialStoreName,
  onStoreSelect,
  onStoreNameChange,
  stores = [],
}: TaskTypeSelectorProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? stores.filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          (s.city && s.city.toLowerCase().includes(query.toLowerCase())),
      )
    : stores;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayValue =
    initialStoreName ||
    (storeId ? stores.find((s) => s.id === storeId)?.name : storeName) ||
    query;

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          סוג משימה
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onTaskTypeChange("store")}
            className={clsx(
              "flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
              taskType === "store"
                ? "border-primary-500 bg-primary-50"
                : "border-gray-200 hover:border-gray-300",
            )}
          >
            <Store className="w-5 h-5" />
            <span className="font-medium">משימה לחנות</span>
          </button>
          <button
            type="button"
            onClick={() => onTaskTypeChange("general")}
            className={clsx(
              "flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
              taskType === "general"
                ? "border-primary-500 bg-primary-50"
                : "border-gray-200 hover:border-gray-300",
            )}
          >
            <FileText className="w-5 h-5" />
            <span className="font-medium">משימה כללית</span>
          </button>
        </div>
      </div>

      {taskType === "store" && (
        <div ref={containerRef} className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            חנות
          </label>
          {initialStoreName ? (
            <div className="p-3 bg-gray-50 rounded-lg text-gray-900">
              {initialStoreName}
            </div>
          ) : stores.length > 0 ? (
            <>
              <div
                className="flex items-center gap-2 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer"
                onClick={() => setIsOpen((v) => !v)}
              >
                <input
                  type="text"
                  value={query || displayValue}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    onStoreNameChange(e.target.value);
                    setIsOpen(true);
                  }}
                  onFocus={() => setIsOpen(true)}
                  placeholder="הקלד לחיפוש או בחר חנות..."
                  className="flex-1 min-w-0 border-0 p-0 focus:ring-0 focus:outline-none bg-transparent"
                />
                <ChevronDown
                  className={clsx(
                    "w-5 h-5 text-gray-500 shrink-0",
                    isOpen && "rotate-180",
                  )}
                />
              </div>
              {isOpen && (
                <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                  {filtered.length === 0 ? (
                    <li className="px-3 py-2 text-gray-500 text-sm">
                      לא נמצאו חנויות
                    </li>
                  ) : (
                    filtered.slice(0, 15).map((s) => (
                      <li
                        key={s.id}
                        className="px-3 py-2 hover:bg-primary-50 cursor-pointer text-sm border-b border-gray-100 last:border-0"
                        onClick={() => {
                          onStoreSelect(s.id, s.name);
                          setQuery("");
                          onStoreNameChange(s.name);
                          setIsOpen(false);
                        }}
                      >
                        <span className="font-medium">{s.name}</span>
                        {s.city && (
                          <span className="text-gray-500 mr-2">
                            {" "}
                            • {s.city}
                          </span>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </>
          ) : (
            <input
              type="text"
              value={storeName || ""}
              onChange={(e) => onStoreNameChange(e.target.value)}
              placeholder="הקלד שם חנות..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          )}
        </div>
      )}
    </>
  );
}
