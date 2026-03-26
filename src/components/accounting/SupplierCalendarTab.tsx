"use client";

import { useMemo } from "react";
import { SupplierPaymentCalendar } from "@/components/ui/SupplierPaymentCalendar";
import type { DbTransaction } from "@/types/accounting";

interface Props {
  supplierTxs: DbTransaction[];  // transactions for this supplier (all years)
  selectedYear: number;
}

export function SupplierCalendarTab({ supplierTxs, selectedYear }: Props) {
  const payments = useMemo(
    () =>
      supplierTxs
        .filter((t) => (t.debit - t.credit) > 0)
        .map((t) => ({ date: t.transaction_date, amount: t.debit - t.credit })),
    [supplierTxs],
  );

  return (
    <div>
      <p className="text-xs text-gray-500 mb-4">
        לוח שנה מציג ימי תשלום בפועל. עוצמת הצבע משקפת את גובה התשלום באותו יום.
      </p>
      <SupplierPaymentCalendar
        payments={payments}
        year={selectedYear}
        accentColor="#6366f1"
      />
    </div>
  );
}
