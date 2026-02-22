"use client";

import { Search } from "lucide-react";

interface ProductsSearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function ProductsSearchBar({
  search,
  onSearchChange,
}: ProductsSearchBarProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="חיפוש מוצר..."
            className="w-full pr-10 pl-4 py-2 bg-gray-50 rounded-xl text-sm border-0 focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>
  );
}
