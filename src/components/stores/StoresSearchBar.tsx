"use client";

import { Search } from "lucide-react";

interface StoresSearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function StoresSearchBar({
  search,
  onSearchChange,
}: StoresSearchBarProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="חיפוש..."
            className="w-full pr-10 pl-4 py-2 bg-gray-50 rounded-xl text-sm"
          />
        </div>
      </div>
    </div>
  );
}
