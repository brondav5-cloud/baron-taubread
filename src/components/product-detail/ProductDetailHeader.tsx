"use client";

import Link from "next/link";
import { ChevronLeft, FileSpreadsheet, FileText } from "lucide-react";
import { MonthSelector, type MonthSelection } from "@/components/ui";
import type { ProductWithStatus } from "@/types/data";

interface ProductDetailHeaderProps {
  product: ProductWithStatus;
  monthSelection: MonthSelection;
  onMonthSelectionChange: (selection: MonthSelection) => void;
  onPdfClick?: () => void;
}

export function ProductDetailHeader({
  product,
  monthSelection,
  onMonthSelectionChange,
  onPdfClick,
}: ProductDetailHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/products"
          className="p-2 hover:bg-gray-100 rounded-xl"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-gray-500">
            {product.category} • מק״ט: {product.id}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <MonthSelector
          value={monthSelection}
          onChange={onMonthSelectionChange}
        />
        <button
          onClick={onPdfClick}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
        >
          <FileText className="w-4 h-4" />
          PDF
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600">
          <FileSpreadsheet className="w-4 h-4" />
          Excel
        </button>
      </div>
    </div>
  );
}
