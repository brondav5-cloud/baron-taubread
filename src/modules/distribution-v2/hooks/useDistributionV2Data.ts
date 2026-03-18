"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  DistributionV2Filters,
  DistributionV2Kpi,
  DistributionV2Row,
  DistributionV2FilterOptions,
  UseDistributionV2Return,
  GroupByMode,
} from "../types";

const DEFAULT_FILTERS: DistributionV2Filters = {
  dateFrom: "",
  dateTo: "",
  cities: [],
  networks: [],
  drivers: [],
  agents: [],
  search: "",
};

/** Month key in DB can be YYYYMM or YYYY-MM. Convert to display "1 - 2026". */
function monthKeyToLabel(key: string): string {
  const k = key.trim();
  let year: string;
  let month: number;
  if (k.includes("-")) {
    const [y, m] = k.split("-");
    year = (y ?? "").trim();
    month = parseInt((m ?? "0").trim(), 10);
  } else if (k.length >= 6) {
    year = k.slice(0, 4);
    month = parseInt(k.slice(4, 6), 10);
  } else {
    return key;
  }
  return `${month} - ${year}`;
}

/** Normalize month key to YYYYMM for comparison. */
function toCompareKey(keyOrLabel: string): string {
  const s = keyOrLabel.trim();
  if (/^\d{4}-\d{1,2}$/.test(s)) return s.replace("-", "");
  if (/^\d{6}$/.test(s)) return s;
  const parts = s.split(" - ");
  if (parts.length === 2) {
    const month = String(parts[0]).trim().padStart(2, "0");
    const year = String(parts[1]).trim();
    return `${year}${month}`;
  }
  return s;
}

/** date string YYYY-MM-DD -> month key YYYYMM */
function dateToMonthKey(dateStr: string): string {
  if (!dateStr || dateStr.length < 7) return "";
  const [y, m] = dateStr.split("-");
  return `${y}${m}`;
}

interface StoreLite {
  external_id: number;
  name: string;
  city: string | null;
  network: string | null;
  driver: string | null;
  agent: string | null;
}

interface StoreProductRow {
  store_external_id: number;
  product_external_id: number;
  product_name: string;
  product_category: string | null;
  monthly_qty: Record<string, number>;
  monthly_sales: Record<string, number>;
  monthly_returns: Record<string, number>;
}

function buildRows(
  stores: StoreLite[],
  storeProducts: StoreProductRow[],
): DistributionV2Row[] {
  const storeMap = new Map<number, StoreLite>();
  stores.forEach((s) => storeMap.set(s.external_id, s));

  const rows: DistributionV2Row[] = [];
  let id = 0;

  storeProducts.forEach((sp) => {
    const store = storeMap.get(sp.store_external_id);
    if (!store) return;

    const monthlyQty = sp.monthly_qty ?? {};
    const monthlySales = sp.monthly_sales ?? {};
    const monthlyReturns = sp.monthly_returns ?? {};

    Object.keys(monthlyQty).forEach((monthKey) => {
      const qty = monthlyQty[monthKey] ?? 0;
      if (qty === 0) return;

      const returnsQty = monthlyReturns[monthKey] ?? 0;
      const sales = monthlySales[monthKey] ?? 0;
      const gross = qty + returnsQty;
      const returnsPct = gross > 0 ? (returnsQty / gross) * 100 : 0;

      rows.push({
        id: String(++id),
        month: monthKeyToLabel(monthKey),
        customerId: store.external_id,
        customer: store.name,
        network: store.network ?? undefined,
        city: store.city ?? undefined,
        productId: sp.product_external_id,
        product: sp.product_name,
        productCategory: sp.product_category ?? undefined,
        quantity: qty,
        returns: returnsQty,
        returnsPct: Math.round(returnsPct * 10) / 10,
        sales,
        driver: store.driver ?? undefined,
        agent: store.agent ?? undefined,
      });
    });
  });

  return rows;
}

function applyFiltersFixed(
  rows: DistributionV2Row[],
  filters: DistributionV2Filters,
): DistributionV2Row[] {
  return rows.filter((row) => {
    if (filters.dateFrom && row.month) {
      const fromKey = dateToMonthKey(filters.dateFrom);
      const rowKey = toCompareKey(row.month);
      if (rowKey && fromKey && rowKey < fromKey) return false;
    }
    if (filters.dateTo && row.month) {
      const toKey = dateToMonthKey(filters.dateTo);
      const rowKey = toCompareKey(row.month);
      if (rowKey && toKey && rowKey > toKey) return false;
    }
    if (filters.cities.length && row.city && !filters.cities.includes(row.city)) return false;
    if (filters.networks.length && row.network && !filters.networks.includes(row.network)) return false;
    if (filters.drivers.length && row.driver && !filters.drivers.includes(row.driver)) return false;
    if (filters.agents.length && row.agent && !filters.agents.includes(row.agent)) return false;
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      const match =
        (row.customer && row.customer.toLowerCase().includes(q)) ||
        (row.product && row.product.toLowerCase().includes(q)) ||
        (row.city && row.city.toLowerCase().includes(q)) ||
        (row.network && row.network.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });
}

export function useDistributionV2Data(): UseDistributionV2Return {
  const auth = useAuth();
  const companyId = auth.status === "authed" ? auth.user.company_id : null;

  const [stores, setStores] = useState<StoreLite[]>([]);
  const [storeProducts, setStoreProducts] = useState<StoreProductRow[]>([]);
  const [filterOptions, setFilterOptions] = useState<DistributionV2FilterOptions>({
    cities: [],
    networks: [],
    drivers: [],
    agents: [],
  });
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<DistributionV2Filters>(DEFAULT_FILTERS);
  const [groupBy, setGroupBy] = useState<GroupByMode>("products");

  const fetchData = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      setStores([]);
      setStoreProducts([]);
      setFilterOptions({ cities: [], networks: [], drivers: [], agents: [] });
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const [storesRes, spRes, filtersRes] = await Promise.all([
        supabase
          .from("stores")
          .select("external_id, name, city, network, driver, agent")
          .eq("company_id", companyId)
          .order("name"),
        supabase
          .from("store_products")
          .select(
            "store_external_id, product_external_id, product_name, product_category, monthly_qty, monthly_sales, monthly_returns",
          )
          .eq("company_id", companyId),
        supabase.from("filters").select("cities, networks, drivers, agents").eq("company_id", companyId).single(),
      ]);

      if (storesRes.error) throw new Error(storesRes.error.message);
      if (spRes.error) throw new Error(spRes.error.message);

      setStores((storesRes.data ?? []) as StoreLite[]);
      setStoreProducts((spRes.data ?? []) as StoreProductRow[]);

      const st = (storesRes.data ?? []) as StoreLite[];
      const filtersData = filtersRes.data as { cities?: string[]; networks?: string[]; drivers?: string[]; agents?: string[] } | null;
      const sortHe = (a: string, b: string) => String(a).localeCompare(String(b), "he");
      const uniq = (arr: (string | null)[]) => Array.from(new Set(arr.filter((x): x is string => Boolean(x)))).sort(sortHe);
      setFilterOptions({
        cities: filtersData?.cities?.length ? [...filtersData.cities].sort(sortHe) : uniq(st.map((s) => s.city)),
        networks: filtersData?.networks?.length ? [...filtersData.networks].sort(sortHe) : uniq(st.map((s) => s.network)),
        drivers: filtersData?.drivers?.length ? [...filtersData.drivers].sort(sortHe) : uniq(st.map((s) => s.driver)),
        agents: filtersData?.agents?.length ? [...filtersData.agents].sort(sortHe) : uniq(st.map((s) => s.agent)),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת נתונים");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setFilters = useCallback(
    (updater: (prev: DistributionV2Filters) => DistributionV2Filters) => {
      setFiltersState(updater);
    },
    [],
  );

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const allRows = useMemo(
    () => buildRows(stores, storeProducts),
    [stores, storeProducts],
  );

  const rows = useMemo(
    () => applyFiltersFixed(allRows, filters),
    [allRows, filters],
  );

  const totalRows = rows.length;

  const kpi: DistributionV2Kpi | null = useMemo(() => {
    if (rows.length === 0) return null;
    const totalQuantity = rows.reduce((s, r) => s + r.quantity, 0);
    const totalReturns = rows.reduce((s, r) => s + r.returns, 0);
    const totalSales = rows.reduce((s, r) => s + (r.sales ?? 0), 0);
    const storesCount = new Set(rows.map((r) => r.customerId)).size;
    const productsCount = new Set(rows.map((r) => r.productId)).size;
    return {
      totalRows,
      totalQuantity,
      totalReturns,
      totalSales,
      storesCount,
      productsCount,
    };
  }, [rows, totalRows]);

  return {
    isLoading,
    error,
    refetch,
    filters,
    setFilters,
    filterOptions,
    groupBy,
    setGroupBy,
    rows,
    kpi,
    totalRows,
  };
}
