"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  DistributionV2Filters,
  DistributionV2Kpi,
  DistributionV2SummaryStats,
  DistributionV2Row,
  DistributionV2FilterOptions,
  UseDistributionV2Return,
  GroupByMode,
  DistributionV2ColumnKey,
  ColumnFiltersState,
  ColumnPicklistsState,
  DistributionV2GroupBlock,
  DistributionViewMode,
} from "../types";
import { DISTRIBUTION_V2_COLUMNS } from "../types";

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

/** Raw month key → end-of-month as DD/MM/YYYY */
function monthKeyToPeriodEndDisplay(monthKeyRaw: string): string {
  const k = monthKeyRaw.trim();
  let y: number;
  let m: number;
  if (k.includes("-")) {
    const [ys, ms] = k.split("-");
    y = parseInt(String(ys ?? "0"), 10);
    m = parseInt(String(ms ?? "0"), 10);
  } else if (k.length >= 6) {
    y = parseInt(k.slice(0, 4), 10);
    m = parseInt(k.slice(4, 6), 10);
  } else {
    return "";
  }
  if (!y || !m || m < 1 || m > 12) return "";
  const last = new Date(y, m, 0);
  const d = last.getDate();
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
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
        periodDate: monthKeyToPeriodEndDisplay(monthKey),
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

function getCellValue(row: DistributionV2Row, column: DistributionV2ColumnKey): string {
  const v = row[column];
  if (v === undefined || v === null) return "";
  return String(v);
}

function applyColumnFilters(
  rows: DistributionV2Row[],
  columnFilters: ColumnFiltersState,
  columnPicklists: ColumnPicklistsState,
): DistributionV2Row[] {
  return rows.filter((row) =>
    DISTRIBUTION_V2_COLUMNS.every((col) => {
      const cell = getCellValue(row, col);
      const pick = columnPicklists[col];
      if (pick && pick.length > 0 && !pick.includes(cell)) return false;
      const q = columnFilters[col]?.trim();
      if (q && !cell.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    }),
  );
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

function buildGroupBlocks(rows: DistributionV2Row[], mode: GroupByMode): DistributionV2GroupBlock[] {
  const map = new Map<string, DistributionV2Row[]>();
  for (const r of rows) {
    let id: string;
    if (mode === "products") {
      id = r.productId != null ? `pid:${r.productId}` : `pn:${(r.product ?? "_").slice(0, 80)}`;
    } else if (mode === "customers") {
      id = r.customerId != null ? `cid:${r.customerId}` : `cn:${(r.customer ?? "_").slice(0, 80)}`;
    } else {
      id = `drv:${r.driver ?? "__none__"}`;
    }
    if (!map.has(id)) map.set(id, []);
    map.get(id)!.push(r);
  }
  const blocks: DistributionV2GroupBlock[] = [];
  for (const [id, groupRows] of Array.from(map.entries())) {
    const first = groupRows[0];
    if (!first) continue;
    let label: string;
    let subLabel: string | undefined;
    if (mode === "products") {
      label = first.product?.trim() || `מוצר #${first.productId ?? "?"}`;
      if (first.productId != null) subLabel = `מזהה מוצר ${first.productId}`;
    } else if (mode === "customers") {
      label = first.customer?.trim() || `חנות #${first.customerId ?? "?"}`;
      if (first.customerId != null) subLabel = `מזהה לקוח ${first.customerId}`;
    } else {
      label = first.driver?.trim() || "ללא נהג";
    }
    const stores = new Set<number>();
    const periods = new Set<string>();
    let totalQuantity = 0;
    let totalReturns = 0;
    let totalSales = 0;
    for (const x of groupRows) {
      if (x.customerId != null) stores.add(x.customerId);
      if (x.month) periods.add(x.month);
      totalQuantity += x.quantity;
      totalReturns += x.returns;
      totalSales += x.sales ?? 0;
    }
    const sortedChildren = [...groupRows];
    if (mode === "products") {
      sortedChildren.sort((a, b) => (a.customer ?? "").localeCompare(b.customer ?? "", "he"));
    } else if (mode === "customers") {
      sortedChildren.sort((a, b) => (a.product ?? "").localeCompare(b.product ?? "", "he"));
    } else {
      sortedChildren.sort((a, b) => {
        const c = (a.customer ?? "").localeCompare(b.customer ?? "", "he");
        if (c !== 0) return c;
        return (a.product ?? "").localeCompare(b.product ?? "", "he");
      });
    }
    blocks.push({
      id,
      label,
      subLabel,
      rows: sortedChildren,
      rowCount: groupRows.length,
      uniqueStoreCount: stores.size,
      periodCount: periods.size,
      totalQuantity,
      totalReturns,
      totalSales,
    });
  }
  blocks.sort((a, b) => a.label.localeCompare(b.label, "he"));
  return blocks;
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
  const [columnFilters, setColumnFiltersState] = useState<ColumnFiltersState>({});
  const [columnPicklists, setColumnPicklistsState] = useState<ColumnPicklistsState>({});
  const [groupBy, setGroupBy] = useState<GroupByMode>("products");
  const [viewMode, setViewModeState] = useState<DistributionViewMode>("flat");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const setViewMode = useCallback((mode: DistributionViewMode) => {
    setViewModeState(mode);
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [groupBy]);

  const setColumnFilter = useCallback((column: DistributionV2ColumnKey, value: string) => {
    setColumnFiltersState((prev) => (value.trim() ? { ...prev, [column]: value.trim() } : { ...prev, [column]: undefined }));
  }, []);

  const setColumnPicklist = useCallback((column: DistributionV2ColumnKey, values: string[]) => {
    setColumnPicklistsState((prev) => {
      const next = { ...prev };
      if (values.length === 0) delete next[column];
      else next[column] = values;
      return next;
    });
    setCurrentPage(1);
  }, []);

  const clearColumnFilters = useCallback(() => {
    setColumnFiltersState({});
    setColumnPicklistsState({});
  }, []);

  const setPageSizeWithReset = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

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

  const rowsBeforeColumnFilter = useMemo(
    () => applyFiltersFixed(allRows, filters),
    [allRows, filters],
  );

  const rows = useMemo(
    () => applyColumnFilters(rowsBeforeColumnFilter, columnFilters, columnPicklists),
    [rowsBeforeColumnFilter, columnFilters, columnPicklists],
  );

  const totalRows = rows.length;

  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    if (groupBy === "products") {
      sorted.sort((a, b) => {
        const p = (a.product ?? "").localeCompare(b.product ?? "", "he");
        if (p !== 0) return p;
        return (a.customer ?? "").localeCompare(b.customer ?? "", "he");
      });
    } else if (groupBy === "customers") {
      sorted.sort((a, b) => {
        const c = (a.customer ?? "").localeCompare(b.customer ?? "", "he");
        if (c !== 0) return c;
        return (a.product ?? "").localeCompare(b.product ?? "", "he");
      });
    } else {
      sorted.sort((a, b) => {
        const d = (a.driver ?? "").localeCompare(b.driver ?? "", "he");
        if (d !== 0) return d;
        return (a.customer ?? "").localeCompare(b.customer ?? "", "he");
      });
    }
    return sorted;
  }, [rows, groupBy]);

  const groupBlocks = useMemo(
    () => buildGroupBlocks(sortedRows, groupBy),
    [sortedRows, groupBy],
  );
  const groupCount = groupBlocks.length;

  const totalItems = viewMode === "flat" ? totalRows : groupCount;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const effectivePage = totalPages < 1 ? 1 : Math.min(currentPage, totalPages);

  const displayRows = useMemo(
    () =>
      viewMode === "flat"
        ? sortedRows.slice((effectivePage - 1) * pageSize, effectivePage * pageSize)
        : [],
    [viewMode, sortedRows, effectivePage, pageSize],
  );

  const displayGroupBlocks = useMemo(
    () =>
      viewMode === "grouped"
        ? groupBlocks.slice((effectivePage - 1) * pageSize, effectivePage * pageSize)
        : [],
    [viewMode, groupBlocks, effectivePage, pageSize],
  );

  const summaryStats: DistributionV2SummaryStats | null = useMemo(() => {
    if (rows.length === 0) return null;
    const stores = new Set<number>();
    const cities = new Set<string>();
    const networks = new Set<string>();
    const drivers = new Set<string>();
    const agents = new Set<string>();
    const products = new Set<number>();
    const categories = new Set<string>();
    const periods = new Set<string>();
    let totalQuantity = 0;
    let totalReturns = 0;
    let totalSales = 0;
    for (const r of rows) {
      if (r.customerId != null) stores.add(r.customerId);
      if (r.city) cities.add(r.city);
      if (r.network) networks.add(r.network);
      if (r.driver) drivers.add(r.driver);
      if (r.agent) agents.add(r.agent);
      if (r.productId != null) products.add(r.productId);
      if (r.productCategory) categories.add(r.productCategory);
      if (r.month) periods.add(r.month);
      totalQuantity += r.quantity;
      totalReturns += r.returns;
      totalSales += r.sales ?? 0;
    }
    const gross = totalQuantity + totalReturns;
    const returnsPctWeighted = gross > 0 ? Math.round((totalReturns / gross) * 1000) / 10 : 0;
    return {
      rowCount: rows.length,
      storeCount: stores.size,
      cityCount: cities.size,
      networkCount: networks.size,
      driverCount: drivers.size,
      agentCount: agents.size,
      productCount: products.size,
      categoryCount: categories.size,
      periodCount: periods.size,
      totalQuantity,
      totalReturns,
      totalSales,
      returnsPctWeighted,
    };
  }, [rows]);

  const kpi: DistributionV2Kpi | null = useMemo(() => {
    if (!summaryStats) return null;
    return {
      totalRows: summaryStats.rowCount,
      totalQuantity: summaryStats.totalQuantity,
      totalReturns: summaryStats.totalReturns,
      totalSales: summaryStats.totalSales,
      storesCount: summaryStats.storeCount,
      productsCount: summaryStats.productCount,
    };
  }, [summaryStats]);

  /** Latest period end date in current (filtered) data — DD/MM/YYYY */
  const dataLastDate = useMemo(() => {
    if (rows.length === 0) return null;
    let maxKey = "";
    for (const r of rows) {
      const p = r.periodDate;
      if (!p || typeof p !== "string") continue;
      const parts = p.trim().split("/");
      if (parts.length !== 3) continue;
      const [d, m, y] = parts;
      const key = `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}`;
      if (key > maxKey) maxKey = key;
    }
    if (!maxKey || maxKey.length < 8) return null;
    const y = maxKey.slice(0, 4);
    const m = maxKey.slice(4, 6);
    const d = maxKey.slice(6, 8);
    return `${d}/${m}/${y}`;
  }, [rows]);

  return {
    isLoading,
    error,
    refetch,
    filters,
    setFilters,
    filterOptions,
    columnFilters,
    setColumnFilter,
    columnPicklists,
    setColumnPicklist,
    clearColumnFilters,
    rowsBeforeColumnFilter,
    groupBy,
    setGroupBy,
    rows,
    viewMode,
    setViewMode,
    displayRows,
    displayGroupBlocks,
    groupCount,
    summaryStats,
    kpi,
    totalRows,
    pageSize,
    setPageSize: setPageSizeWithReset,
    currentPage: effectivePage,
    setCurrentPage,
    totalPages,
    totalItems,
    dataLastDate,
  };
}
