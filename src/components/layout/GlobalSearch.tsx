"use client";

import { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Store, Package, X } from "lucide-react";
import { clsx } from "clsx";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";

export default function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { query, results, isOpen, handleSearch, clearSearch, closeResults } =
    useGlobalSearch();

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeResults();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeResults]);

  // Keyboard shortcut (Ctrl+K)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape") {
        closeResults();
        inputRef.current?.blur();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeResults]);

  const handleResultClick = (href: string) => {
    router.push(href);
    clearSearch();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="חיפוש חנות או מוצר... (Ctrl+K)"
          className="w-full min-w-0 max-w-64 pr-10 pl-8 py-2 bg-gray-100 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] max-w-80 bg-white rounded-xl shadow-elevated border border-gray-100 z-50 overflow-hidden animate-scale-in">
          {results.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              לא נמצאו תוצאות עבור &quot;{query}&quot;
            </div>
          ) : (
            <div className="py-2">
              <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase">
                תוצאות ({results.length})
              </div>
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result.href)}
                  className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors text-right"
                >
                  <div
                    className={clsx(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      result.type === "store"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-purple-100 text-purple-600",
                    )}
                  >
                    {result.type === "store" ? (
                      <Store className="w-4 h-4" />
                    ) : (
                      <Package className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {result.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {result.subtitle}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      "text-xs px-2 py-0.5 rounded-full",
                      result.type === "store"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-purple-100 text-purple-600",
                    )}
                  >
                    {result.type === "store" ? "חנות" : "מוצר"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
