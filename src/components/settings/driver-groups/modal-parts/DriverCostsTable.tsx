"use client";

import { Info } from "lucide-react";
import { clsx } from "clsx";
import type { DriverProductCost } from "@/types/costs";

interface DragFillState {
  isActive: boolean;
  startRow: number;
  value: number;
  selectedRows: number[];
}

interface DriverCostsTableProps {
  products: Array<{ id: number; name: string }>;
  productCosts: DriverProductCost[];
  dragFill: DragFillState;
  onCostChange: (productId: number, cost: number) => void;
  onStartDragFill: (rowIndex: number, value: number) => void;
  onUpdateDragFill: (rowIndex: number) => void;
}

export function DriverCostsTable({
  products,
  productCosts,
  dragFill,
  onCostChange,
  onStartDragFill,
  onUpdateDragFill,
}: DriverCostsTableProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        עלויות משלוח למוצרים
      </label>

      {/* Drag Fill Hint */}
      {!dragFill.isActive ? (
        <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-blue-50 text-blue-700 text-sm rounded-lg">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>טיפ: לחץ על תא עם ערך וגרור למטה כדי להעתיק לשורות נוספות</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-green-50 text-green-700 text-sm rounded-lg">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>
            גורר ₪{dragFill.value} ל-{dragFill.selectedRows.length} שורות | שחרר
            לאישור | ESC לביטול
          </span>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-right font-medium text-gray-700">
                  מוצר
                </th>
                <th className="px-4 py-2 text-center font-medium text-gray-700 w-32">
                  עלות משלוח ₪
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product, rowIndex) => {
                const cost =
                  productCosts.find((pc) => pc.productId === product.id)
                    ?.deliveryCost ?? 0;
                const isSelected = dragFill.selectedRows.includes(rowIndex);

                return (
                  <tr
                    key={product.id}
                    className={clsx(
                      "transition-colors",
                      isSelected ? "bg-blue-100" : "hover:bg-gray-50",
                    )}
                    onMouseEnter={() => onUpdateDragFill(rowIndex)}
                  >
                    <td className="px-4 py-2 text-gray-700">{product.name}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={cost || ""}
                        onChange={(e) =>
                          onCostChange(
                            product.id,
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        onMouseDown={() => onStartDragFill(rowIndex, cost)}
                        placeholder="0"
                        step="0.1"
                        min="0"
                        className={clsx(
                          "w-full px-2 py-1 text-center border rounded focus:outline-none cursor-grab",
                          isSelected
                            ? "border-blue-400 bg-blue-50 ring-1 ring-blue-400"
                            : "border-gray-200 focus:ring-1 focus:ring-blue-400",
                        )}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
