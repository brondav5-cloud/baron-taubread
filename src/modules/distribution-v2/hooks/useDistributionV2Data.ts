"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
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

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Calendar date in Asia/Jerusalem from an ISO timestamp (upload time). */
function jerusalemYmdFromIso(iso: string): { y: number; m: number; d: number } | null {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(iso));
  const y = parseInt(parts.find((p) => p.type === "year")?.value ?? "", 10);
  const m = parseInt(parts.find((p) => p.type === "month")?.value ?? "", 10);
  const d = parseInt(parts.find((p) => p.type === "day")?.value ?? "", 10);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function toDdMmYyyyFromParts(p: { y: number; m: number; d: number }): string {
  return `${pad2(p.d)}/${pad2(p.m)}/${p.y}`;
}


/** Max YYYYMM from weekly rows (year + month) */
function maxMonthKeyFromWeekly(rows: StoreProductWeeklyRow[]): string | null {
  let max = "";
  for (const r of rows) {
    const yyyymm = `${r.year}${String(r.month).padStart(2, "0")}`;
    if (yyyymm > max) max = yyyymm;
  }
  return max || null;
}

/** Latest month range for date filter seed (from weekly data) */
function latestMonthRangeFromWeekly(rows: StoreProductWeeklyRow[]): { dateFrom: string; dateTo: string } | null {
  const max = maxMonthKeyFromWeekly(rows);
  if (!max || max.length < 6) return null;
  const y = parseInt(max.slice(0, 4), 10);
  const m = parseInt(max.slice(4, 6), 10);
  if (!y || !m) return null;
  const lastDay = new Date(y, m, 0).getDate();
  return {
    dateFrom: `${y}-${pad2(m)}-01`,
    dateTo: `${y}-${pad2(m)}-${pad2(lastDay)}`,
  };
}

/** Default filters before first load (no date filter until data seeds). */
function emptyFilters(): DistributionV2Filters {
  return {
    dateFrom: "",
    dateTo: "",
    cities: [],
    networks: [],
    drivers: [],
    agents: [],
    search: "",
  };
}

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

/** One row from store_product_weekly (source: פירוט מוצרים) */
interface StoreProductWeeklyRow {
  store_external_id: number;
  store_name: string;
  product_name: string;
  product_name_normalized: string;
  week_start_date: string;
  year: number;
  month: number;
  gross_qty: number;
  returns_qty: number;
  net_qty: number;
  delivery_count: number;
  total_value: number;
  updated_at?: string | null;
}

/** Product lookup for join (name -> id, category) */
interface ProductLookup {
  external_id: number;
  category: string | null;
}

function normalizeProductNameForMatch(name: string): string {
  return name.trim().toLowerCase();
}

function buildRowsFromWeekly(
  weeklyRows: StoreProductWeeklyRow[],
  stores: StoreLite[],
  productsByNormalizedName: Map<string, ProductLookup>,
): DistributionV2Row[] {
  const storeMap = new Map<number, StoreLite>();
  stores.forEach((s) => storeMap.set(s.external_id, s));

  // Group by store_external_id + product_name_normalized + year + month
  const groupKey = (r: StoreProductWeeklyRow) =>
    `${r.store_external_id}|${r.product_name_normalized}|${r.year}|${r.month}`;
  const aggregates = new Map<
    string,
    {
      storeExternalId: number;
      storeName: string;
      productName: string;
      productNameNormalized: string;
      year: number;
      month: number;
      grossQty: number;
      returnsQty: number;
      netQty: number;
      totalValue: number;
    }
  >();

  for (const r of weeklyRows) {
    const key = groupKey(r);
    const existing = aggregates.get(key);
    if (existing) {
      existing.grossQty += r.gross_qty ?? 0;
      existing.returnsQty += r.returns_qty ?? 0;
      existing.netQty += r.net_qty ?? 0;
      existing.totalValue += r.total_value ?? 0;
    } else {
      aggregates.set(key, {
        storeExternalId: r.store_external_id,
        storeName: r.store_name,
        productName: r.product_name,
        productNameNormalized: r.product_name_normalized,
        year: r.year,
        month: r.month,
        grossQty: r.gross_qty ?? 0,
        returnsQty: r.returns_qty ?? 0,
        netQty: r.net_qty ?? 0,
        totalValue: r.total_value ?? 0,
      });
    }
  }

  const rows: DistributionV2Row[] = [];
  let id = 0;
  const monthKey = (y: number, m: number) => `${y}${String(m).padStart(2, "0")}`;

  for (const agg of Array.from(aggregates.values())) {
    const store = storeMap.get(agg.storeExternalId);
    const productLookup = productsByNormalizedName.get(agg.productNameNormalized);
    const gross = agg.grossQty;
    const returnsQty = agg.returnsQty;
    const netQty = agg.netQty;
    const returnsPct = gross > 0 ? (returnsQty / gross) * 100 : 0;
    const keyForPeriod = monthKey(agg.year, agg.month);

    rows.push({
      id: String(++id),
      month: monthKeyToLabel(keyForPeriod),
      periodDate: monthKeyToPeriodEndDisplay(keyForPeriod),
      customerId: store?.external_id ?? agg.storeExternalId,
      customer: store?.name ?? agg.storeName,
      network: store?.network ?? undefined,
      city: store?.city ?? undefined,
      productId: productLookup?.external_id,
      product: agg.productName,
      productCategory: productLookup?.category ?? undefined,
      grossQuantity: gross,
      quantity: netQty,
      returns: returnsQty,
      returnsPct: Math.round(returnsPct * 10) / 10,
      sales: agg.totalValue,
      driver: store?.driver ?? undefined,
      agent: store?.agent ?? undefined,
    });
  }

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
    if (filters.cities.length && !filters.cities.includes(row.city ?? "")) return false;
    if (filters.networks.length && !filters.networks.includes(row.network ?? "")) return false;
    if (filters.drivers.length && !filters.drivers.includes(row.driver ?? "")) return false;
    if (filters.agents.length && !filters.agents.includes(row.agent ?? "")) return false;
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
    let totalGrossQuantity = 0;
    let totalReturns = 0;
    let totalSales = 0;
    for (const x of groupRows) {
      if (x.customerId != null) stores.add(x.customerId);
      if (x.month) periods.add(x.month);
      totalQuantity += x.quantity;
      totalGrossQuantity += x.grossQuantity ?? 0;
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
      totalGrossQuantity,
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
  const seededDateFilterRef = useRef(false);

  const [stores, setStores] = useState<StoreLite[]>([]);
  const [weeklyRows, setWeeklyRows] = useState<StoreProductWeeklyRow[]>([]);
  const [productsList, setProductsList] = useState<{ name: string; external_id: number; category: string | null }[]>([]);
  const [filterOptions, setFilterOptions] = useState<DistributionV2FilterOptions>({
    cities: [],
    networks: [],
    drivers: [],
    agents: [],
  });
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<DistributionV2Filters>(emptyFilters);
  const [columnFilters, setColumnFiltersState] = useState<ColumnFiltersState>({});
  const [columnPicklists, setColumnPicklistsState] = useState<ColumnPicklistsState>({});
  const [groupBy, setGroupBy] = useState<GroupByMode>("products");
  const [viewMode, setViewModeState] = useState<DistributionViewMode>("flat");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort_] = useState<{ column: DistributionV2ColumnKey | null; direction: "asc" | "desc" }>({
    column: null,
    direction: "asc",
  });

  const setViewMode = useCallback((mode: DistributionViewMode) => {
    setViewModeState(mode);
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [groupBy]);

  useEffect(() => {
    seededDateFilterRef.current = false;
  }, [companyId]);

  const setColumnFilter = useCallback((column: DistributionV2ColumnKey, value: string) => {
    setColumnFiltersState((prev) => (value.trim() ? { ...prev, [column]: value.trim() } : { ...prev, [column]: undefined }));
    setCurrentPage(1);
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

  const setSort = useCallback((column: DistributionV2ColumnKey) => {
    setSort_((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "asc" ? "desc" : "asc",
    }));
    setCurrentPage(1);
  }, []);

  const setPageSizeWithReset = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const fetchData = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      setStores([]);
      setWeeklyRows([]);
      setProductsList([]);
      setFiltersState(emptyFilters());
      setFilterOptions({ cities: [], networks: [], drivers: [], agents: [] });
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const [storesRes, weeklyRes, productsRes, filtersRes] = await Promise.all([
        supabase
          .from("stores")
          .select("external_id, name, city, network, driver, agent")
          .eq("company_id", companyId)
          .order("name"),
        supabase
          .from("store_product_weekly")
          .select(
            "store_external_id, store_name, product_name, product_name_normalized, week_start_date, year, month, gross_qty, returns_qty, net_qty, delivery_count, total_value, updated_at",
          )
          .eq("company_id", companyId),
        supabase
          .from("products")
          .select("name, external_id, category")
          .eq("company_id", companyId),
        supabase.from("filters").select("cities, networks, drivers, agents").eq("company_id", companyId).single(),
      ]);

      if (storesRes.error) throw new Error(storesRes.error.message);
      if (weeklyRes.error) throw new Error(weeklyRes.error.message);

      const weekly = (weeklyRes.data ?? []) as StoreProductWeeklyRow[];
      const prods = (productsRes.data ?? []) as { name: string; external_id: number; category: string | null }[];

      if (!seededDateFilterRef.current && weekly.length > 0) {
        const fb = latestMonthRangeFromWeekly(weekly);
        if (fb) setFiltersState((prev) => ({ ...prev, ...fb }));
        seededDateFilterRef.current = true;
      }

      setStores((storesRes.data ?? []) as StoreLite[]);
      setWeeklyRows(weekly);
      setProductsList(prods);

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
      setCurrentPage(1);
    },
    [],
  );

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const productsByNormalizedName = useMemo(() => {
    const map = new Map<string, ProductLookup>();
    for (const p of productsList) {
      const key = normalizeProductNameForMatch(p.name);
      if (!map.has(key)) map.set(key, { external_id: p.external_id, category: p.category });
    }
    return map;
  }, [productsList]);

  const allRows = useMemo(
    () => buildRowsFromWeekly(weeklyRows, stores, productsByNormalizedName),
    [weeklyRows, stores, productsByNormalizedName],
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

    if (sort.column) {
      const col = sort.column;
      const dir = sort.direction === "asc" ? 1 : -1;
      sorted.sort((a, b) => {
        const va = getCellValue(a, col);
        const vb = getCellValue(b, col);
        const na = Number(va);
        const nb = Number(vb);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return (na - nb) * dir;
        return va.localeCompare(vb, "he") * dir;
      });
      return sorted;
    }

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
  }, [rows, groupBy, sort]);

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
    let totalGrossQuantity = 0;
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
      totalGrossQuantity += r.grossQuantity ?? 0;
      totalReturns += r.returns;
      totalSales += r.sales ?? 0;
    }
    const returnsPctWeighted = totalGrossQuantity > 0
      ? Math.round((totalReturns / totalGrossQuantity) * 1000) / 10
      : 0;
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
      totalGrossQuantity,
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

  /**
   * Last data touch: max(updated_at) across store_product_weekly (upload time),
   * else end of latest month. Independent of current filters.
   */
  const dataLastDate = useMemo(() => {
    if (weeklyRows.length === 0) return null;
    let maxTs = 0;
    for (const r of weeklyRows) {
      if (!r.updated_at) continue;
      const t = new Date(r.updated_at).getTime();
      if (!Number.isNaN(t) && t > maxTs) maxTs = t;
    }
    if (maxTs > 0) {
      const jp = jerusalemYmdFromIso(new Date(maxTs).toISOString());
      if (jp) return toDdMmYyyyFromParts(jp);
    }
    const maxKey = maxMonthKeyFromWeekly(weeklyRows);
    if (!maxKey) return null;
    return monthKeyToPeriodEndDisplay(maxKey);
  }, [weeklyRows]);

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
    sortColumn: sort.column,
    sortDirection: sort.direction,
    setSort,
  };
}
