"use client";

import { Filter } from "lucide-react";
import { useUsers } from "@/context/UsersContext";
import {
  DateRangePicker,
  type DateRange,
} from "@/components/ui/DateRangePicker";

interface AnalyticsFiltersProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export function AnalyticsFilters({
  dateRange,
  onDateRangeChange,
  selectedCategory,
  onCategoryChange,
}: AnalyticsFiltersProps) {
  const { categories } = useUsers();

  return (
    <div className="bg-white rounded-2xl shadow-card p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Date Range Picker */}
        <DateRangePicker value={dateRange} onChange={onDateRangeChange} />

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="px-3 py-2 bg-gray-50 border-0 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500"
          >
            <option value="">כל הקטגוריות</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
