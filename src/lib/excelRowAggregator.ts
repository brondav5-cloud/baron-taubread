import { parsePeriod } from "./excelPeriodParser";
import type {
  AggregatedStore,
  AggregatedProduct,
  AggregatedStoreProduct,
} from "@/types/supabase";

type GetVal = (
  row: Record<string, unknown>,
  keys: string[],
) => string | number | undefined;

export interface AggregatorResult {
  storesMap: Map<number, AggregatedStore>;
  productsMap: Map<number, AggregatedProduct>;
  storeProductsMap: Map<string, AggregatedStoreProduct>;
  cities: Set<string>;
  networks: Set<string>;
  drivers: Set<string>;
  agents: Set<string>;
  categories: Set<string>;
  rowsSkipped: number;
  skipReasons: Record<string, number>; // reason → count
}

const QTY_NET_KEYS = ["כמות נטו", "כמות נטו ", 'סה"כ כמות', "סהכ כמות"];
const SALES_KEYS = ["סך מחזור מכירות", "סך מחזור מכירות ", "סהכ", 'סה"כ'];
const QTY_SUPPLIED_KEYS = ["כמות שסופק", "כמות שסופק ", "כמות"];
const PERIOD_KEYS = ["חודש ושנה", "חודש"];
const STORE_NAME_KEYS = ["שם לקוח", "לקוח"];

/**
 * Aggregate raw Excel rows into stores, products and store-product maps.
 */
export function aggregateRows(
  rows: Record<string, unknown>[],
  getVal: GetVal,
): AggregatorResult {
  const storesMap = new Map<number, AggregatedStore>();
  const productsMap = new Map<number, AggregatedProduct>();
  const storeProductsMap = new Map<string, AggregatedStoreProduct>();
  const cities = new Set<string>();
  const networks = new Set<string>();
  const drivers = new Set<string>();
  const agents = new Set<string>();
  const categories = new Set<string>();

  let rowsSkipped = 0;
  const skipReasons: Record<string, number> = {};
  const skip = (reason: string) => {
    rowsSkipped++;
    skipReasons[reason] = (skipReasons[reason] ?? 0) + 1;
  };

  const parseNum = (v: unknown): number => {
    if (typeof v === "number") return v;
    if (typeof v === "string") return Number(v.replace(/[₪,\s]/g, "")) || 0;
    return 0;
  };

  for (const row of rows) {
    const period = parsePeriod(String(getVal(row, PERIOD_KEYS) ?? ""));
    if (!period) { skip("no_period"); continue; }

    const storeIdRaw = getVal(row, ["מזהה לקוח"]);
    const productIdRaw = getVal(row, ["מזהה מוצר"]);
    const storeId =
      typeof storeIdRaw === "number"
        ? storeIdRaw
        : parseInt(String(storeIdRaw ?? 0), 10);
    const productId =
      typeof productIdRaw === "number"
        ? productIdRaw
        : parseInt(String(productIdRaw ?? 0), 10);
    if (!storeId || !productId) { skip("no_id"); continue; }

    const city = String(getVal(row, ["עיר"]) ?? "").trim();
    const network = String(getVal(row, ["רשת"]) ?? "").trim();
    const driver = String(getVal(row, ["נהג"]) ?? "").trim();
    const agent = String(getVal(row, ["סוכן"]) ?? "").trim();
    const category = String(getVal(row, ["קטגורית מוצרים"]) ?? "").trim();
    if (city) cities.add(city);
    if (network) networks.add(network);
    if (driver) drivers.add(driver);
    if (agent) agents.add(agent);
    if (category) categories.add(category);

    const qtyNet = parseNum(getVal(row, QTY_NET_KEYS));
    const sales = parseNum(getVal(row, SALES_KEYS));
    const qtySupplied = parseNum(getVal(row, QTY_SUPPLIED_KEYS));
    const returnsVal = parseNum(getVal(row, ["חזרות"]));

    // Stores
    if (!storesMap.has(storeId)) {
      storesMap.set(storeId, {
        external_id: storeId,
        name: String(getVal(row, STORE_NAME_KEYS) ?? `לקוח ${storeId}`),
        city,
        network,
        driver,
        agent,
        monthly_qty: {},
        monthly_sales: {},
        monthly_gross: {},
        monthly_returns: {},
      });
    }
    const store = storesMap.get(storeId)!;
    store.monthly_qty[period.key] =
      (store.monthly_qty[period.key] || 0) + qtyNet;
    store.monthly_sales[period.key] =
      (store.monthly_sales[period.key] || 0) + sales;
    store.monthly_gross[period.key] =
      (store.monthly_gross[period.key] || 0) + qtySupplied;
    store.monthly_returns[period.key] =
      (store.monthly_returns[period.key] || 0) + returnsVal;

    // Products
    if (!productsMap.has(productId)) {
      productsMap.set(productId, {
        external_id: productId,
        name: String(getVal(row, ["מוצר"]) ?? `מוצר ${productId}`),
        category,
        monthly_qty: {},
        monthly_sales: {},
      });
    }
    const product = productsMap.get(productId)!;
    product.monthly_qty[period.key] =
      (product.monthly_qty[period.key] || 0) + qtyNet;
    product.monthly_sales[period.key] =
      (product.monthly_sales[period.key] || 0) + sales;

    // Store-products
    const spKey = `${storeId}_${productId}`;
    const productName = String(getVal(row, ["מוצר"]) ?? `מוצר ${productId}`);
    if (!storeProductsMap.has(spKey)) {
      storeProductsMap.set(spKey, {
        store_external_id: storeId,
        product_external_id: productId,
        product_name: productName,
        product_category: category,
        monthly_qty: {},
        monthly_sales: {},
        monthly_returns: {},
      });
    }
    const sp = storeProductsMap.get(spKey)!;
    sp.monthly_qty[period.key]     = (sp.monthly_qty[period.key]     || 0) + qtyNet;
    sp.monthly_sales[period.key]   = (sp.monthly_sales[period.key]   || 0) + sales;
    sp.monthly_returns[period.key] = (sp.monthly_returns[period.key] || 0) + returnsVal;
  }

  return {
    storesMap,
    productsMap,
    storeProductsMap,
    cities,
    networks,
    drivers,
    agents,
    categories,
    rowsSkipped,
    skipReasons,
  };
}
