"use client";

import {
  useRef,
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Search, Store, Package, X } from "lucide-react";
import { clsx } from "clsx";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";

export default function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

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
        setActiveIndex(-1);
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
        const isMobile = window.matchMedia("(max-width: 639px)").matches;
        if (isMobile) {
          setIsMobileExpanded(true);
          window.setTimeout(() => inputRef.current?.focus(), 0);
        } else {
          inputRef.current?.focus();
        }
      }
      if (event.key === "Escape") {
        closeResults();
        setIsMobileExpanded(false);
        inputRef.current?.blur();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeResults]);

  const handleResultClick = (href: string) => {
    router.push(href);
    clearSearch();
    setIsMobileExpanded(false);
    setActiveIndex(-1);
  };

  const openMobileSearch = () => {
    setIsMobileExpanded(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const closeMobileSearch = () => {
    setIsMobileExpanded(false);
    closeResults();
    setActiveIndex(-1);
  };

  useEffect(() => {
    if (!isOpen || results.length === 0) {
      setActiveIndex(-1);
      return;
    }
    if (activeIndex >= results.length) {
      setActiveIndex(results.length - 1);
    }
  }, [isOpen, results, activeIndex]);

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      const selectedResult = results[activeIndex];
      if (selectedResult) {
        handleResultClick(selectedResult.href);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Mobile search trigger */}
      <button
        onClick={openMobileSearch}
        className="sm:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
        aria-label="פתח חיפוש"
      >
        <Search className="w-5 h-5 text-gray-600" />
      </button>

      {/* Mobile backdrop */}
      {isMobileExpanded && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={closeMobileSearch}
            aria-label="סגור חיפוש"
          />

          <div className="absolute top-[calc(env(safe-area-inset-top)+0.5rem)] right-2 left-2">
            <div className="relative bg-white rounded-xl shadow-elevated border border-gray-200">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="חיפוש חנות או מוצר..."
                className="w-full pr-10 pl-10 py-2.5 bg-transparent border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="חיפוש חנות או מוצר"
                aria-controls="global-search-results"
                aria-activedescendant={
                  activeIndex >= 0 ? `global-search-result-${activeIndex}` : undefined
                }
                autoFocus
              />
              <button
                type="button"
                onClick={query ? clearSearch : closeMobileSearch}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                aria-label={query ? "נקה חיפוש" : "סגור חיפוש"}
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {isOpen && (
              <div className="mt-2 bg-white rounded-xl shadow-elevated border border-gray-100 overflow-hidden max-h-[50dvh] overflow-y-auto">
                {results.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    לא נמצאו תוצאות עבור &quot;{query}&quot;
                  </div>
                ) : (
                  <div className="py-2" id="global-search-results" role="listbox">
                    <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase">
                      תוצאות ({results.length})
                    </div>
                    {results.map((result, index) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        id={`global-search-result-${index}`}
                        onClick={() => handleResultClick(result.href)}
                        onMouseEnter={() => setActiveIndex(index)}
                        role="option"
                        aria-selected={activeIndex === index}
                        className={clsx(
                          "w-full px-3 py-2 flex items-center gap-3 transition-colors text-right",
                          activeIndex === index ? "bg-gray-100" : "hover:bg-gray-50",
                        )}
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
        </div>
      )}

      <div
        className="relative hidden sm:block"
      >
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="חיפוש חנות או מוצר... (Ctrl+K)"
          className="w-full min-w-0 pr-10 pl-8 py-2 bg-gray-100 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          aria-label="חיפוש חנות או מוצר"
          aria-controls="global-search-results"
          aria-activedescendant={
            activeIndex >= 0 ? `global-search-result-${activeIndex}` : undefined
          }
        />
        {(query || isMobileExpanded) && (
          <button
            onClick={query ? clearSearch : closeMobileSearch}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && !isMobileExpanded && (
        <div
          className={clsx(
            "mt-2 bg-white rounded-xl shadow-elevated border border-gray-100 z-50 overflow-hidden animate-scale-in",
            "absolute top-full right-0 w-[min(20rem,calc(100vw-2rem))] max-w-80",
          )}
        >
          {results.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              לא נמצאו תוצאות עבור &quot;{query}&quot;
            </div>
          ) : (
            <div className="py-2" id="global-search-results" role="listbox">
              <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase">
                תוצאות ({results.length})
              </div>
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  id={`global-search-result-${index}`}
                  onClick={() => handleResultClick(result.href)}
                  onMouseEnter={() => setActiveIndex(index)}
                  role="option"
                  aria-selected={activeIndex === index}
                  className={clsx(
                    "w-full px-3 py-2 flex items-center gap-3 transition-colors text-right",
                    activeIndex === index ? "bg-gray-100" : "hover:bg-gray-50",
                  )}
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
