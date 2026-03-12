/**
 * Store Products - normalization and validation
 * Ensures monthly_qty/monthly_sales are valid and totals are computed server-side.
 */

const YYYY_MM_REGEX = /^(\d{4})-(\d{2})$/;
const YYYY_MM_DD_REGEX = /^(\d{4})-(\d{2})-\d{2}$/;
const YYYYMM_REGEX = /^(\d{4})(\d{2})$/;
/** M-YYYY or MM-YYYY with optional spaces, e.g. "4- 2025", "04-2025" */
const M_YYYY_REGEX = /^(\d{1,2})\s*-\s*(\d{4})$/;

/**
 * Normalize month key to "YYYY-MM" format.
 * Accepts: "YYYY-MM", "YYYY-MM-01", "YYYYMM" (6 digits), "M-YYYY"/"MM-YYYY" (e.g. "4- 2025").
 * Rejects anything else.
 */
export function normalizeMonthKey(key: string): string {
  const s = String(key).trim();
  let year: number;
  let month: number;

  const mmDD = s.match(YYYY_MM_DD_REGEX);
  const mm = s.match(YYYY_MM_REGEX);
  const yyyymm = s.match(YYYYMM_REGEX);
  const mYyyy = s.match(M_YYYY_REGEX);

  if (mmDD && mmDD[1] != null && mmDD[2] != null) {
    year = parseInt(mmDD[1], 10);
    month = parseInt(mmDD[2], 10);
  } else if (mm && mm[1] != null && mm[2] != null) {
    year = parseInt(mm[1], 10);
    month = parseInt(mm[2], 10);
  } else if (yyyymm && yyyymm[1] != null && yyyymm[2] != null) {
    year = parseInt(yyyymm[1], 10);
    month = parseInt(yyyymm[2], 10);
  } else if (mYyyy && mYyyy[1] != null && mYyyy[2] != null) {
    month = parseInt(mYyyy[1], 10);
    year = parseInt(mYyyy[2], 10);
  } else {
    return "";
  }

  if (month < 1 || month > 12 || year < 2020 || year > 2100) return "";
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Validate monthly map: must be object with string keys and finite numbers.
 * Allows negative values (returns/credits).
 */
export function validateMonthlyMap(
  input: unknown,
  fieldName: string,
):
  | { ok: true; value: Record<string, number> }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (input === null || input === undefined) {
    return { ok: true, value: {} };
  }

  if (typeof input !== "object" || Array.isArray(input)) {
    return {
      ok: false,
      errors: [
        `${fieldName}: expected object, got ${Array.isArray(input) ? "array" : typeof input}`,
      ],
    };
  }

  const obj = input as Record<string, unknown>;
  const result: Record<string, number> = {};

  for (const [rawKey, val] of Object.entries(obj)) {
    const normKey = normalizeMonthKey(rawKey);
    if (!normKey) {
      errors.push(`${fieldName}: invalid month key "${rawKey}"`);
      continue;
    }

    if (typeof val !== "number") {
      errors.push(
        `${fieldName}.${normKey}: expected number, got ${typeof val}`,
      );
      continue;
    }

    if (!Number.isFinite(val)) {
      errors.push(`${fieldName}.${normKey}: value must be finite (got ${val})`);
      continue;
    }

    result[normKey] = (result[normKey] ?? 0) + val;
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: result };
}

/**
 * Compute total_qty and total_sales from monthly maps.
 * Rounds total_sales to 2 decimals.
 */
export function computeTotals(
  monthlyQty: Record<string, number>,
  monthlySales: Record<string, number>,
): { total_qty: number; total_sales: number } {
  const total_qty = Object.values(monthlyQty).reduce((s, v) => s + v, 0);
  const total_sales = Object.values(monthlySales).reduce((s, v) => s + v, 0);
  return {
    total_qty,
    total_sales: Math.round(total_sales * 100) / 100,
  };
}

/**
 * Normalize and validate a store product row.
 * Returns validated row with server-computed totals (never from client).
 */
export function normalizeAndValidateStoreProductRow(
  row: {
    store_external_id?: unknown;
    product_external_id?: unknown;
    product_name?: unknown;
    product_category?: unknown;
    monthly_qty?: unknown;
    monthly_sales?: unknown;
    monthly_returns?: unknown;
    total_qty?: unknown;
    total_sales?: unknown;
  },
  _rowIndex?: number,
):
  | { ok: true; row: Record<string, unknown> }
  | { ok: false; errors: string[] } {
  const storeId = row.store_external_id;
  const productId = row.product_external_id;
  const rowPrefix = `store=${storeId ?? "?"} product=${productId ?? "?"} `;
  const errors: string[] = [];

  if (
    typeof storeId !== "number" ||
    !Number.isInteger(storeId) ||
    storeId < 0
  ) {
    errors.push(`${rowPrefix}store_external_id must be non-negative integer`);
  }
  if (
    typeof productId !== "number" ||
    !Number.isInteger(productId) ||
    productId < 0
  ) {
    errors.push(`${rowPrefix}product_external_id must be non-negative integer`);
  }

  const qtyResult     = validateMonthlyMap(row.monthly_qty     ?? {}, "monthly_qty");
  const salesResult   = validateMonthlyMap(row.monthly_sales   ?? {}, "monthly_sales");
  const returnsResult = validateMonthlyMap(row.monthly_returns ?? {}, "monthly_returns");

  if (!qtyResult.ok)     errors.push(...qtyResult.errors.map((e)     => `${rowPrefix}${e}`));
  if (!salesResult.ok)   errors.push(...salesResult.errors.map((e)   => `${rowPrefix}${e}`));
  if (!returnsResult.ok) errors.push(...returnsResult.errors.map((e) => `${rowPrefix}${e}`));

  if (errors.length > 0) return { ok: false, errors };

  const monthly_qty     = qtyResult.ok     ? qtyResult.value     : {};
  const monthly_sales   = salesResult.ok   ? salesResult.value   : {};
  const monthly_returns = returnsResult.ok ? returnsResult.value : {};
  const { total_qty, total_sales } = computeTotals(monthly_qty, monthly_sales);

  return {
    ok: true,
    row: {
      store_external_id:   typeof storeId   === "number" ? storeId   : 0,
      product_external_id: typeof productId === "number" ? productId : 0,
      product_name:        String(row.product_name ?? ""),
      product_category:    row.product_category != null ? String(row.product_category) : null,
      monthly_qty,
      monthly_sales,
      monthly_returns,
      total_qty,
      total_sales,
    },
  };
}
