"use client";

import { useMemo } from "react";
import { SupplierPaymentCalendar } from "@/components/ui/SupplierPaymentCalendar";
import type { BankTransaction } from "../types";

interface Props {
  txs: BankTransaction[];  // expense transactions (debit > 0) for all years
  selectedYear: number;
}

export function BankSupplierCalendarTab({ txs, selectedYear }: Props) {
  const payments = useMemo(
    () =>
      txs
        .filter((t) => t.debit > 0)
        .map((t) => ({ date: t.effective_date ?? t.date, amount: t.debit })),
    [txs],
  );

  return (
    <div>
      <p className="text-xs text-gray-500 mb-4">
        לוח שנה מציג ימי תשלום בפועל. עוצמת הצבע משקפת את גובה התשלום באותו יום.
      </p>
      <SupplierPaymentCalendar
        payments={payments}
        year={selectedYear}
        accentColor="#3b82f6"
      />
    </div>
  );
}
