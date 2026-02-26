"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  DbExpenseCategory,
  DbSupplier,
  DbExpenseEntry,
  DbRevenueEntry,
  DbExpenseUpload,
} from "@/types/expenses";

interface ExpensesData {
  categories: DbExpenseCategory[];
  suppliers: DbSupplier[];
  entries: DbExpenseEntry[];
  revenue: DbRevenueEntry[];
  uploads: DbExpenseUpload[];
  isLoading: boolean;
  error: string | null;
  refetch: (year?: number, month?: number) => Promise<void>;
  updateSupplier: (
    supplierId: string,
    update: { categoryId?: string | null; mergedIntoId?: string | null; name?: string },
  ) => Promise<boolean>;
  addCategory: (
    name: string,
    parentType: string,
  ) => Promise<DbExpenseCategory | null>;
  deleteCategory: (id: string) => Promise<boolean>;
  saveRevenue: (data: {
    month: number;
    year: number;
    category?: string;
    amount: number;
    description?: string;
  }) => Promise<boolean>;
  deleteRevenue: (id: string) => Promise<boolean>;
}

export function useExpensesData(
  filterYear?: number,
  filterMonth?: number,
): ExpensesData {
  const [categories, setCategories] = useState<DbExpenseCategory[]>([]);
  const [suppliers, setSuppliers] = useState<DbSupplier[]>([]);
  const [entries, setEntries] = useState<DbExpenseEntry[]>([]);
  const [revenue, setRevenue] = useState<DbRevenueEntry[]>([]);
  const [uploads, setUploads] = useState<DbExpenseUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (year?: number, month?: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        const y = year ?? filterYear;
        const m = month ?? filterMonth;
        if (y) params.set("year", String(y));
        if (m) params.set("month", String(m));

        const res = await fetch(`/api/expenses/data?${params.toString()}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "שגיאה בטעינת נתונים");
        }

        const data = await res.json();
        setCategories(data.categories);
        setSuppliers(data.suppliers);
        setEntries(data.entries);
        setRevenue(data.revenue);
        setUploads(data.uploads);
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה לא ידועה");
      } finally {
        setIsLoading(false);
      }
    },
    [filterYear, filterMonth],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateSupplier = useCallback(
    async (
      supplierId: string,
      update: { categoryId?: string | null; mergedIntoId?: string | null; name?: string },
    ): Promise<boolean> => {
      try {
        const res = await fetch("/api/expenses/suppliers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supplierId, ...update }),
        });
        if (!res.ok) return false;
        await fetchData();
        return true;
      } catch {
        return false;
      }
    },
    [fetchData],
  );

  const addCategory = useCallback(
    async (
      name: string,
      parentType: string,
    ): Promise<DbExpenseCategory | null> => {
      try {
        const res = await fetch("/api/expenses/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, parentType }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        await fetchData();
        return data.category;
      } catch {
        return null;
      }
    },
    [fetchData],
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/expenses/categories?id=${id}`, {
          method: "DELETE",
        });
        if (!res.ok) return false;
        await fetchData();
        return true;
      } catch {
        return false;
      }
    },
    [fetchData],
  );

  const saveRevenue = useCallback(
    async (data: {
      month: number;
      year: number;
      category?: string;
      amount: number;
      description?: string;
    }): Promise<boolean> => {
      try {
        const res = await fetch("/api/expenses/revenue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) return false;
        await fetchData();
        return true;
      } catch {
        return false;
      }
    },
    [fetchData],
  );

  const deleteRevenue = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/expenses/revenue?id=${id}`, {
          method: "DELETE",
        });
        if (!res.ok) return false;
        await fetchData();
        return true;
      } catch {
        return false;
      }
    },
    [fetchData],
  );

  return {
    categories,
    suppliers,
    entries,
    revenue,
    uploads,
    isLoading,
    error,
    refetch: fetchData,
    updateSupplier,
    addCategory,
    deleteCategory,
    saveRevenue,
    deleteRevenue,
  };
}
