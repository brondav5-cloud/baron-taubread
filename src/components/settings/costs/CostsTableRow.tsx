"use client";

import { memo, useCallback } from "react";
import { clsx } from "clsx";
import type { CostKey } from "@/types/costs";
import { COST_KEYS } from "@/types/costs";

// ============================================
// TYPES
// ============================================

interface ProductCostRow {
  productId: number;
  productName: string;
  category: string;
  rawMaterial: number;
  labor: number;
  operational: number;
  packaging: number;
  storage: number;
  misc: number;
  totalCost: number;
}

interface CostsTableRowProps {
  row: ProductCostRow;
  rowIndex: number;
  isSelected: boolean;
  onCostChange: (productId: number, key: CostKey, value: number) => void;
  onDragStart: (rowIndex: number, col: CostKey, value: number) => void;
  onDragEnter: (rowIndex: number) => void;
}

// ============================================
// EDITABLE CELL
// ============================================

interface EditableCellProps {
  value: number;
  costKey: CostKey;
  productId: number;
  rowIndex: number;
  isSelected: boolean;
  onChange: (productId: number, key: CostKey, value: number) => void;
  onDragStart: (rowIndex: number, col: CostKey, value: number) => void;
}

const EditableCell = memo(function EditableCell({
  value,
  costKey,
  productId,
  rowIndex,
  isSelected,
  onChange,
  onDragStart,
}: EditableCellProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value) || 0;
      onChange(productId, costKey, newValue);
    },
    [onChange, productId, costKey],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0 && value > 0) {
        onDragStart(rowIndex, costKey, value);
      }
    },
    [onDragStart, rowIndex, costKey, value],
  );

  return (
    <td
      className={clsx(
        "px-2 py-1.5 text-center border-l border-gray-100",
        isSelected && "bg-blue-100",
      )}
    >
      <input
        type="number"
        value={value || ""}
        onChange={handleChange}
        onMouseDown={handleMouseDown}
        placeholder="0"
        step="0.01"
        min="0"
        className={clsx(
          "w-16 px-1.5 py-1 text-center text-sm rounded border",
          "focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400",
          value > 0 ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50",
        )}
      />
    </td>
  );
});

// ============================================
// TABLE ROW
// ============================================

export const CostsTableRow = memo(function CostsTableRow({
  row,
  rowIndex,
  isSelected,
  onCostChange,
  onDragStart,
  onDragEnter,
}: CostsTableRowProps) {
  const handleMouseEnter = useCallback(() => {
    onDragEnter(rowIndex);
  }, [onDragEnter, rowIndex]);

  return (
    <tr
      className={clsx(
        "hover:bg-gray-50 transition-colors",
        isSelected && "bg-blue-50",
        rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/50",
      )}
      onMouseEnter={handleMouseEnter}
    >
      {/* Product ID */}
      <td className="px-3 py-2 text-center text-sm text-gray-500 font-mono">
        {row.productId}
      </td>

      {/* Category */}
      <td className="px-3 py-2 text-sm text-gray-600">{row.category}</td>

      {/* Product Name */}
      <td className="px-3 py-2 text-sm font-medium text-gray-900">
        {row.productName}
      </td>

      {/* Cost Cells */}
      {COST_KEYS.map((key) => (
        <EditableCell
          key={key}
          value={row[key]}
          costKey={key}
          productId={row.productId}
          rowIndex={rowIndex}
          isSelected={isSelected}
          onChange={onCostChange}
          onDragStart={onDragStart}
        />
      ))}

      {/* Total */}
      <td
        className={clsx(
          "px-3 py-2 text-center text-sm font-bold",
          row.totalCost > 0 ? "text-green-700" : "text-gray-400",
        )}
      >
        {row.totalCost > 0 ? `₪${row.totalCost.toFixed(2)}` : "-"}
      </td>
    </tr>
  );
});
