"use client";

import { useState } from "react";
import { Receipt, Percent, Tag, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { useStorePricing } from "@/hooks/usePricing";
import { useStoreDiscount } from "@/hooks/useStoreDiscount";

interface StorePricingTabProps {
  storeId: number;
  storeName: string;
}

export function StorePricingTab({ storeId, storeName }: StorePricingTabProps) {
  const { pricing, productsWithFinalPrice, isLoading, hasPricing, refresh } =
    useStorePricing(storeId);
  const { setDiscount, toggleExclusion, isSaving } = useStoreDiscount(
    storeId,
    refresh,
  );
  const [editingDiscount, setEditingDiscount] = useState(false);
  const [discountValue, setDiscountValue] = useState("");

  if (isLoading) {
    return <LoadingState />;
  }

  if (!hasPricing || !pricing) {
    return <NoPricingState storeName={storeName} />;
  }

  const handleSaveDiscount = () => {
    const value = parseFloat(discountValue);
    if (!isNaN(value)) {
      setDiscount(value);
    }
    setEditingDiscount(false);
  };

  return (
    <div className="space-y-4">
      {/* Store Discount Card */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Percent className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-500">הנחה כללית לחנות</div>
              {editingDiscount ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-20 px-2 py-1 border rounded text-lg font-bold"
                    min="0"
                    max="100"
                    autoFocus
                  />
                  <span className="text-lg">%</span>
                  <button
                    onClick={handleSaveDiscount}
                    className="text-green-600 font-medium"
                  >
                    שמור
                  </button>
                  <button
                    onClick={() => setEditingDiscount(false)}
                    className="text-gray-400"
                  >
                    ביטול
                  </button>
                </div>
              ) : (
                <div
                  className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-primary-600"
                  onClick={() => {
                    setDiscountValue(String(pricing.storeDiscount));
                    setEditingDiscount(true);
                  }}
                >
                  {pricing.storeDiscount}%
                </div>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-400">
            עודכן: {new Date(pricing.lastUpdated).toLocaleDateString("he-IL")}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary-500" />
            מחירון מוצרים ({pricing.products.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right">מק&quot;ט</th>
                <th className="px-4 py-3 text-right">מחיר בסיס</th>
                <th className="px-4 py-3 text-center">הנחת מוצר</th>
                <th className="px-4 py-3 text-center">אחרי הנחת מוצר</th>
                <th className="px-4 py-3 text-center">מוחרג</th>
                <th className="px-4 py-3 text-center font-bold text-green-600">
                  מחיר סופי
                </th>
              </tr>
            </thead>
            <tbody>
              {productsWithFinalPrice.map((product) => (
                <tr
                  key={product.productId}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium">{product.productId}</td>
                  <td className="px-4 py-3">₪{product.basePrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    {product.productDiscount}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    ₪{product.priceAfterProductDiscount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={product.isExcludedFromStoreDiscount}
                      onChange={() => toggleExclusion(product.productId)}
                      disabled={isSaving}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={clsx(
                        "font-bold",
                        product.isExcludedFromStoreDiscount
                          ? "text-gray-600"
                          : "text-green-600",
                      )}
                    >
                      ₪{product.finalPrice.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
        <strong>חישוב מחיר סופי:</strong> מחיר בסיס × (1 - הנחת מוצר) × (1 -
        הנחה כללית)
        <br />
        <strong>מוחרג:</strong> מוצרים מסומנים לא מקבלים את ההנחה הכללית של
        החנות
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-gray-500">טוען מחירון...</p>
    </div>
  );
}

function NoPricingState({ storeName }: { storeName: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
      <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        אין מחירון לחנות זו
      </h3>
      <p className="text-gray-500 mb-4">
        לא נמצא מחירון עבור &quot;{storeName}&quot;
      </p>
      <a
        href="/dashboard/settings/pricing"
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600"
      >
        <Receipt className="w-4 h-4" />
        העלאת מחירון
      </a>
    </div>
  );
}
