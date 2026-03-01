"use client";

import { useState, useEffect, useCallback } from "react";

export interface SupplierName {
  id: string;
  supplier_id: string;
  name: string;
  occurrence_count: number;
  counter_account_override: string | null;
}

export interface SupplierClassification {
  manual_account_code: string;
  manual_account_name: string | null;
}

export interface SupplierWithDetails {
  id: string;
  counter_account: string;
  display_name: string;
  auto_account_code: string | null;
  auto_account_name: string | null;
  names: SupplierName[];
  classification: SupplierClassification | null;
}

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<SupplierWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/accounting/suppliers");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "שגיאה בטעינת ספקים");
      }
      const data = await res.json();
      setSuppliers(data.suppliers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא ידועה");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { suppliers, isLoading, error, refetch };
}
